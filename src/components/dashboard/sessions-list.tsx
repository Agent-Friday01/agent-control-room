'use client'

import { Session } from '@/types'
import { formatAge, parseTokenUsage, getStatusBadgeColor } from '@/lib/utils'
import { Crown, Bot, Clock, Users, FileText } from 'lucide-react'

interface SessionsListProps {
  sessions: Session[]
}

interface SessionCardProps {
  session: Session
}

function SessionCard({ session }: SessionCardProps) {
  const tokenUsage = parseTokenUsage(session.tokens)
  const statusColor = session.active ? 'success' : 'warning'

  const getSessionTypeIcon = (key: string) => {
    if (key.includes('main:main')) return <Crown className="w-5 h-5 text-violet-400" />
    if (key.includes('subagent')) return <Bot className="w-5 h-5 text-cyan-400" />
    if (key.includes('cron')) return <Clock className="w-5 h-5 text-orange-400" />
    if (key.includes('group')) return <Users className="w-5 h-5 text-cyan-400" />
    return <FileText className="w-5 h-5 text-slate-400" />
  }

  const getModelColor = (model: string) => {
    if (model.includes('opus')) return 'text-violet-400'
    if (model.includes('sonnet')) return 'text-cyan-400'
    if (model.includes('haiku')) return 'text-emerald-400'
    return 'text-slate-400'
  }

  const getRoleBadge = (key: string) => {
    if (key.includes('main:main')) {
      return { label: 'LEAD', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' }
    }
    if (key.includes('subagent')) {
      return { label: 'WORKER', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' }
    }
    if (key.includes('cron')) {
      return { label: 'CRON', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
    }
    return { label: 'SYSTEM', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
  }

  const getCurrentTask = (session: Session) => {
    // Extract task from session label or key
    if (session.label && session.label !== session.key.split(':').pop()) {
      return session.label
    }
    // For sub-agents, try to extract task from key
    const parts = session.key.split(':')
    if (parts.length > 3 && parts[2] === 'subagent') {
      return parts[3] || 'Unknown task'
    }
    return session.active ? 'Active' : 'Idle'
  }

  const roleBadge = getRoleBadge(session.key)
  const currentTask = getCurrentTask(session)

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:bg-secondary/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`${session.active ? 'working-indicator' : ''}`}>
            {getSessionTypeIcon(session.key)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-foreground truncate">
                {session.key.split(':').pop() || session.key}
              </h4>
              {/* Role Badge */}
              <span className={`px-2 py-0.5 text-xs font-bold font-mono border rounded-full ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>

            {/* Current Task/Status */}
            <div className="text-xs text-muted-foreground mb-1">
              <span className="font-medium">{currentTask}</span>
            </div>

            <p className="text-xs text-muted-foreground/70 truncate font-mono">
              {session.key}
            </p>

            <div className="flex items-center space-x-2 mt-2">
              <span className={`text-xs font-mono ${getModelColor(session.model)}`}>
                {session.model}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                · {formatAge(session.age)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end space-y-1">
          {/* Working/Status Badge */}
          <div className={`px-2 py-1 rounded-full border text-xs font-medium font-mono ${
            session.active
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse'
              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
          }`}>
            {session.active ? 'WORKING' : 'IDLE'}
          </div>

          {/* Token Usage */}
          {session.tokens !== '-' && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-mono">
                {session.tokens}
              </div>
              {tokenUsage.total > 0 && (
                <div className="w-16 h-1 bg-secondary rounded-full mt-1">
                  <div
                    className={`h-full rounded-full ${
                      tokenUsage.percentage > 80 ? 'bg-red-400' :
                      tokenUsage.percentage > 60 ? 'bg-yellow-400' :
                      'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(tokenUsage.percentage, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Flags */}
      {session.flags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {session.flags.map((flag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-violet-500/20 text-violet-400 rounded text-xs font-mono"
            >
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function SessionsList({ sessions }: SessionsListProps) {
  const activeSessions = sessions.filter(s => s.active)
  const idleSessions = sessions.filter(s => !s.active)

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Active Sessions</h3>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{sessions.length}</span> total · <span className="font-mono">{activeSessions.length}</span> active
        </p>
      </div>

      <div className="p-4">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="w-10 h-10 mx-auto mb-2 text-slate-400" />
            <p>No sessions active</p>
            <p className="text-xs">Sessions will appear here when agents start</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                  Active (<span className="font-mono">{activeSessions.length}</span>)
                </h4>
                <div className="space-y-2">
                  {activeSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}

            {/* Idle Sessions */}
            {idleSessions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                  Idle (<span className="font-mono">{idleSessions.length}</span>)
                </h4>
                <div className="space-y-2">
                  {idleSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
