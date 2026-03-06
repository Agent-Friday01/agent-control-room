'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSmartPoll } from '@/lib/use-smart-poll'
import { RefreshCw, LogIn, XCircle, LogOut, Key, UserPen, UserPlus, UserCog, UserMinus, ShieldAlert, Archive, Trash2, FileText } from 'lucide-react'

interface AuditEvent {
  id: number
  action: string
  actor: string
  actor_id?: number
  target_type?: string
  target_id?: number
  detail?: any
  ip_address?: string
  user_agent?: string
  created_at: number
}

const actionLabels: Record<string, string> = {
  login: 'Logged in',
  login_failed: 'Failed login',
  logout: 'Logged out',
  password_change: 'Changed password',
  profile_update: 'Updated profile',
  user_create: 'Created user',
  user_update: 'Updated user',
  user_delete: 'Deleted user',
  role_denied: 'Access denied',
  backup_create: 'Created backup',
  backup_delete: 'Deleted backup',
}

const actionColors: Record<string, string> = {
  login: 'text-emerald-400',
  login_failed: 'text-red-400',
  logout: 'text-muted-foreground',
  password_change: 'text-amber-400',
  profile_update: 'text-cyan-400',
  user_create: 'text-cyan-400',
  user_update: 'text-indigo-400',
  user_delete: 'text-red-400',
  role_denied: 'text-red-500',
  backup_create: 'text-emerald-400',
  backup_delete: 'text-amber-400',
}

const actionIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  login: LogIn,
  login_failed: XCircle,
  logout: LogOut,
  password_change: Key,
  profile_update: UserPen,
  user_create: UserPlus,
  user_update: UserCog,
  user_delete: UserMinus,
  role_denied: ShieldAlert,
  backup_create: Archive,
  backup_delete: Trash2,
}

export function AuditTrailPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState({ action: '', actor: '' })
  const [page, setPage] = useState(0)
  const limit = 50

  const fetchEvents = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (filter.action) params.append('action', filter.action)
      if (filter.actor) params.append('actor', filter.actor)
      params.append('limit', limit.toString())
      params.append('offset', (page * limit).toString())

      const res = await fetch(`/api/audit?${params}`)
      if (!res.ok) {
        if (res.status === 403) {
          setError('Admin access required to view audit logs')
          return
        }
        throw new Error('Failed to fetch audit log')
      }
      const data = await res.json()
      setEvents(data.events)
      setTotal(data.total)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter, page])

  useEffect(() => { fetchEvents() }, [fetchEvents])
  useSmartPoll(fetchEvents, 30000, { pauseWhenDisconnected: true })

  const totalPages = Math.ceil(total / limit)

  function formatTime(ts: number) {
    const d = new Date(ts * 1000)
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  }

  function formatDetail(event: AuditEvent): string | null {
    if (!event.detail) return null
    if (event.action === 'user_create') return `username: ${event.detail.username}, role: ${event.detail.role}`
    if (event.action === 'user_update') {
      const parts: string[] = []
      if (event.detail.role) parts.push(`role: ${event.detail.role}`)
      if (event.detail.display_name) parts.push(`name: ${event.detail.display_name}`)
      if (event.detail.password_changed) parts.push('password reset')
      return parts.join(', ')
    }
    if (event.action === 'profile_update') return `name: ${event.detail.display_name}`
    return null
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Audit Trail</h2>
          <p className="text-sm text-muted-foreground">{total} event{total !== 1 ? 's' : ''} logged</p>
        </div>
        <button
          onClick={() => { setPage(0); fetchEvents() }}
          className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-smooth flex items-center gap-1.5"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filter.action}
          onChange={e => { setFilter(f => ({ ...f, action: e.target.value })); setPage(0) }}
          className="h-8 px-2 text-xs rounded-md bg-secondary border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">All actions</option>
          <option value="login">Login</option>
          <option value="login_failed">Failed login</option>
          <option value="logout">Logout</option>
          <option value="password_change">Password change</option>
          <option value="profile_update">Profile update</option>
          <option value="user_create">User created</option>
          <option value="user_update">User updated</option>
          <option value="user_delete">User deleted</option>
          <option value="role_denied">Access denied</option>
          <option value="backup_create">Backup created</option>
          <option value="backup_delete">Backup deleted</option>
        </select>
        <input
          type="text"
          value={filter.actor}
          onChange={e => { setFilter(f => ({ ...f, actor: e.target.value })); setPage(0) }}
          placeholder="Filter by actor..."
          className="h-8 px-2.5 text-xs rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
        />
      </div>

      {/* Event List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl shimmer" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-foreground">No audit events found</p>
          <p className="text-xs text-muted-foreground">Events will appear here once activity is recorded</p>
        </div>
      ) : (
        <div className="space-y-1">
          {events.map(event => {
            const detail = formatDetail(event)
            return (
              <div key={event.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-smooth group">
                {/* Icon */}
                <span className={`w-6 h-6 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5 ${actionColors[event.action] || 'text-muted-foreground'}`}>
                  {(() => {
                    const IconComponent = actionIcons[event.action]
                    return IconComponent ? <IconComponent className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />
                  })()}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">{event.actor}</span>
                    <span className={`text-xs ${actionColors[event.action] || 'text-muted-foreground'}`}>
                      {actionLabels[event.action] || event.action}
                    </span>
                    {event.target_id && event.target_type === 'user' && (
                      <span className="text-xs text-muted-foreground font-mono">
                        user #{event.target_id}
                      </span>
                    )}
                  </div>
                  {detail && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{detail}</p>
                  )}
                </div>

                {/* Meta */}
                <div className="text-right shrink-0">
                  <p className="text-2xs text-muted-foreground font-mono">{formatTime(event.created_at)}</p>
                  {event.ip_address && (
                    <p className="text-2xs text-muted-foreground/60 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{event.ip_address}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-smooth disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-xs text-muted-foreground font-mono">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-smooth disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
