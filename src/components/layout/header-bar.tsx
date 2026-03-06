'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAgentControlRoom } from '@/store'
import { useWebSocket } from '@/lib/websocket'
import { useNavigateToPanel } from '@/lib/navigation'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { DigitalClock } from '@/components/ui/digital-clock'
import { APP_VERSION } from '@/lib/version'
import { Search, MessageSquare, Bell, X } from 'lucide-react'

interface SearchResult {
  type: string
  id: number
  title: string
  subtitle?: string
  excerpt?: string
  created_at: number
}

export function HeaderBar() {
  const { activeTab, connection, sessions, chatPanelOpen, setChatPanelOpen, notifications, unreadNotificationCount, currentUser, setCurrentUser } = useAgentControlRoom()
  const { isConnected, reconnect } = useWebSocket()
  const navigateToPanel = useNavigateToPanel()

  const activeSessions = sessions.filter(s => s.active).length
  const tabLabels: Record<string, string> = {
    overview: 'Overview',
    agents: 'Agent Squad',
    tasks: 'Task Board',
    sessions: 'Sessions',
    activity: 'Activity Feed',
    notifications: 'Notifications',
    standup: 'Daily Standup',
    logs: 'Log Viewer',
    spawn: 'Spawn Agent',
    cron: 'Cron Jobs',
    memory: 'Memory Browser',
    tokens: 'Token Usage',
    history: 'Agent History',
    audit: 'Audit Trail',
    webhooks: 'Webhooks',
    alerts: 'Alert Rules',
    gateways: 'Gateway Manager',
    users: 'Users',
    workspaces: 'Workspaces',
    'gateway-config': 'Gateway Config',
    settings: 'Settings',
  }

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!searchOpen) return
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [searchOpen])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=12`)
      if (!res.ok) return
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => doSearch(value), 250)
  }

  const handleResultClick = (result: SearchResult) => {
    const typeToTab: Record<string, string> = {
      task: 'tasks', agent: 'agents', activity: 'activity',
      audit: 'audit', message: 'agents', notification: 'notifications',
      webhook: 'webhooks', pipeline: 'agents', alert_rule: 'alerts',
    }
    navigateToPanel(typeToTab[result.type] || 'overview')
    setSearchOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const typeIcons: Record<string, string> = {
    task: 'T', agent: 'A', activity: 'E', audit: 'S',
    message: 'M', notification: 'N', webhook: 'W', pipeline: 'P',
  }
  const typeColors: Record<string, string> = {
    task: 'bg-cyan-500/20 text-cyan-400',
    agent: 'bg-violet-500/20 text-violet-400',
    activity: 'bg-emerald-500/20 text-emerald-400',
    audit: 'bg-amber-500/20 text-amber-400',
    message: 'bg-cyan-500/20 text-cyan-400',
    notification: 'bg-red-500/20 text-red-400',
    webhook: 'bg-amber-500/20 text-amber-400',
    pipeline: 'bg-violet-500/20 text-violet-400',
  }

  return (
    <header role="banner" aria-label="Application header" className="h-12 bg-background/80 backdrop-blur-xl border-b border-border px-4 flex items-center justify-between shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-foreground">
          {tabLabels[activeTab] || 'Agent Control Room'}
        </h1>
        <span className="text-2xs text-muted-foreground font-mono">
          v{APP_VERSION}
        </span>
      </div>

      {/* Center (desktop) */}
      <div className="hidden md:flex items-center gap-4">
        <button
          onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50) }}
          className="flex items-center gap-2 h-7 px-3 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground hover:text-foreground hover:border-violet-500/30 transition-colors"
        >
          <Search size={16} />
          <span>Search...</span>
          <kbd className="text-2xs px-1 py-0.5 rounded bg-muted border border-border font-mono ml-2">&#8984;K</kbd>
        </button>

        <Stat label="Sessions" value={`${activeSessions}/${sessions.length}`} />
        <ConnectionBadge connection={connection} onReconnect={reconnect} />
        <SseBadge connected={connection.sseConnected ?? false} />
      </div>

      <MobileConnectionDot connection={connection} onReconnect={reconnect} />

      {/* Right */}
      <div className="flex items-center gap-2">
        <div className="hidden md:block">
          <DigitalClock />
        </div>

        <button
          onClick={() => { setSearchOpen(true); setTimeout(() => searchInputRef.current?.focus(), 50) }}
          className="md:hidden h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150 flex items-center justify-center"
          title="Search"
        >
          <Search size={16} />
        </button>

        <button
          onClick={() => setChatPanelOpen(!chatPanelOpen)}
          className={`h-8 px-2.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
            chatPanelOpen
              ? 'bg-violet-500 text-white'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          }`}
        >
          <MessageSquare size={16} />
          Chat
        </button>

        <button
          onClick={() => navigateToPanel('notifications')}
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150 flex items-center justify-center relative"
        >
          <Bell size={16} />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-violet-500 text-white text-2xs flex items-center justify-center font-medium">
              {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
            </span>
          )}
        </button>

        <ThemeToggle />

        {currentUser && (
          <UserMenu user={currentUser} onLogout={() => setCurrentUser(null)} />
        )}
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div ref={searchRef} className="fixed inset-0 z-50">
          <div className="absolute inset-0" onClick={() => setSearchOpen(false)} />
          <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[min(24rem,calc(100vw-2rem))] bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => handleSearchInput(e.target.value)}
                placeholder="Search tasks, agents, activity..."
                className="w-full h-8 px-3 rounded-lg bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto">
              {searchLoading ? (
                <div className="p-4 text-center text-xs text-muted-foreground">Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((r, i) => (
                  <button
                    key={`${r.type}-${r.id}-${i}`}
                    onClick={() => handleResultClick(r)}
                    className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors flex items-start gap-2.5"
                  >
                    <span className={`text-2xs font-mono font-medium w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${typeColors[r.type] || 'bg-muted text-muted-foreground'}`}>
                      {typeIcons[r.type] || '?'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground truncate">{r.title}</div>
                      {r.subtitle && <div className="text-2xs text-muted-foreground truncate">{r.subtitle}</div>}
                      {r.excerpt && <div className="text-2xs text-muted-foreground/70 truncate mt-0.5">{r.excerpt}</div>}
                    </div>
                  </button>
                ))
              ) : searchQuery.length >= 2 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">No results found</div>
              ) : (
                <div className="p-4 text-center text-xs text-muted-foreground">Type to search across all entities</div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function MobileConnectionDot({
  connection,
  onReconnect,
}: {
  connection: { isConnected: boolean; reconnectAttempts: number }
  onReconnect: () => void
}) {
  const { dashboardMode } = useAgentControlRoom()
  const isLocal = dashboardMode === 'local'
  const isReconnecting = !connection.isConnected && connection.reconnectAttempts > 0

  let dotClass: string
  let title: string

  if (isLocal) {
    dotClass = 'bg-cyan-500'
    title = 'Local Mode'
  } else if (connection.isConnected) {
    dotClass = 'bg-emerald-500'
    title = 'Gateway connected'
  } else if (isReconnecting) {
    dotClass = 'bg-amber-500 animate-pulse'
    title = `Reconnecting (${connection.reconnectAttempts})`
  } else {
    dotClass = 'bg-red-500 animate-pulse'
    title = 'Gateway disconnected — tap to reconnect'
  }

  return (
    <button
      onClick={!isLocal && !connection.isConnected ? onReconnect : undefined}
      className={`md:hidden flex items-center justify-center h-8 w-8 rounded-lg ${
        isLocal || connection.isConnected ? 'cursor-default' : 'hover:bg-secondary cursor-pointer'
      } transition-all duration-150`}
      title={title}
    >
      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
    </button>
  )
}

function ConnectionBadge({
  connection,
  onReconnect,
}: {
  connection: { isConnected: boolean; reconnectAttempts: number; latency?: number }
  onReconnect: () => void
}) {
  const { dashboardMode } = useAgentControlRoom()
  const isLocal = dashboardMode === 'local'
  const isReconnecting = !connection.isConnected && connection.reconnectAttempts > 0

  if (isLocal) {
    return (
      <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg cursor-default">
        <span className="text-muted-foreground">Gateway</span>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
        <span className="font-medium font-mono text-cyan-500 dark:text-cyan-400">Local</span>
      </div>
    )
  }

  let dotClass: string
  let label: string

  if (connection.isConnected) {
    dotClass = 'bg-emerald-500'
    label = connection.latency != null ? `${connection.latency}ms` : 'Online'
  } else if (isReconnecting) {
    dotClass = 'bg-amber-500 animate-pulse'
    label = `Connecting... (${connection.reconnectAttempts})`
  } else {
    dotClass = 'bg-red-500 animate-pulse'
    label = 'Disconnected'
  }

  return (
    <button
      onClick={!connection.isConnected ? onReconnect : undefined}
      className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-all duration-150 ${
        connection.isConnected
          ? 'cursor-default'
          : 'hover:bg-secondary cursor-pointer'
      }`}
      title={connection.isConnected ? 'Gateway connected' : 'Click to reconnect'}
    >
      <span className="text-muted-foreground">Gateway</span>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span className={`font-medium font-mono ${
        connection.isConnected ? 'text-emerald-500 dark:text-emerald-400' : isReconnecting ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400'
      }`}>
        {label}
      </span>
    </button>
  )
}

function Stat({ label, value, status }: { label: string; value: string; status?: 'success' | 'error' | 'warning' }) {
  const statusColor = status === 'success' ? 'text-emerald-500 dark:text-emerald-400' : status === 'error' ? 'text-red-500 dark:text-red-400' : status === 'warning' ? 'text-amber-500 dark:text-amber-400' : 'text-foreground'

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium font-mono ${statusColor}`}>{value}</span>
    </div>
  )
}

function SseBadge({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">Events</span>
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-cyan-500' : 'bg-muted-foreground/30'}`} />
      <span className={`font-medium font-mono ${connected ? 'text-cyan-500 dark:text-cyan-400' : 'text-muted-foreground'}`}>
        {connected ? 'Live' : 'Off'}
      </span>
    </div>
  )
}

function UserMenu({ user, onLogout }: { user: { username: string; display_name: string; role: string }; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const router = useRouter()

  const initials = user.display_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    onLogout()
    router.push('/login')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-8 w-8 rounded-full bg-violet-500/20 text-violet-500 dark:text-violet-400 text-xs font-semibold flex items-center justify-center hover:bg-violet-500/30 transition-all duration-150"
        title={`${user.display_name} (${user.role})`}
      >
        {initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-card border border-border shadow-lg z-50 py-1">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground">{user.display_name}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
            <button
              onClick={() => { setOpen(false); setShowPasswordDialog(true) }}
              className="w-full px-3 py-2 text-sm text-left text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150"
            >
              Change password
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-3 py-2 text-sm text-left text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150"
            >
              Sign out
            </button>
          </div>
        </>
      )}

      {showPasswordDialog && (
        <PasswordDialog onClose={() => setShowPasswordDialog(false)} />
      )}
    </div>
  )
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to change password')
        return
      }
      const data = await res.json()
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-80 pointer-events-auto" onClick={e => e.stopPropagation()}>
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
            <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={16} />
            </button>
          </div>

          {success ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-emerald-500 font-medium">Password changed successfully</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500"
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-8 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-8 rounded-lg text-xs font-medium bg-violet-500 text-white hover:bg-violet-600 transition-all duration-150 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
