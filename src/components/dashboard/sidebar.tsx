'use client'

import { useEffect, useState } from 'react'
import { useAgentControlRoom } from '@/store'
import { useNavigateToPanel } from '@/lib/navigation'
import { createClientLogger } from '@/lib/client-logger'
import {
  LayoutDashboard,
  MessageSquare,
  ClipboardList,
  Bot,
  Activity,
  Bell,
  BarChart3,
  Rocket,
  FileText,
  Clock,
  Brain,
  Coins,
} from 'lucide-react'

const log = createClientLogger('Sidebar')

interface MenuItem {
  id: string
  label: string
  icon: React.ReactNode
  description?: string
}

const menuItems: MenuItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" />, description: 'System dashboard' },
  { id: 'sessions', label: 'Sessions', icon: <MessageSquare className="w-5 h-5" />, description: 'Active agent sessions' },
  { id: 'tasks', label: 'Task Board', icon: <ClipboardList className="w-5 h-5" />, description: 'Kanban task management' },
  { id: 'agents', label: 'Agent Squad', icon: <Bot className="w-5 h-5" />, description: 'Agent management & status' },
  { id: 'activity', label: 'Activity Feed', icon: <Activity className="w-5 h-5" />, description: 'Real-time activity stream' },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" />, description: 'Mentions & alerts' },
  { id: 'standup', label: 'Daily Standup', icon: <BarChart3 className="w-5 h-5" />, description: 'Generate standup reports' },
  { id: 'spawn', label: 'Spawn Agent', icon: <Rocket className="w-5 h-5" />, description: 'Launch new sub-agents' },
  { id: 'logs', label: 'Logs', icon: <FileText className="w-5 h-5" />, description: 'Real-time log viewer' },
  { id: 'cron', label: 'Cron Jobs', icon: <Clock className="w-5 h-5" />, description: 'Automated tasks' },
  { id: 'memory', label: 'Memory', icon: <Brain className="w-5 h-5" />, description: 'Knowledge browser' },
  { id: 'tokens', label: 'Tokens', icon: <Coins className="w-5 h-5" />, description: 'Usage & cost tracking' },
]

export function Sidebar() {
  const { activeTab, connection, sessions } = useAgentControlRoom()
  const navigateToPanel = useNavigateToPanel()
  const [systemStats, setSystemStats] = useState<any>(null)

  useEffect(() => {
    // Fetch system status
    fetch('/api/status?action=overview')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setSystemStats(data) })
      .catch(err => log.error('Failed to fetch system status:', err))
  }, [])

  const activeSessions = sessions.filter(s => s.active).length
  const totalSessions = sessions.length

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-violet-500 rounded-xl flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">MC</span>
          </div>
          <div>
            <h2 className="font-bold text-foreground">Agent Control Room</h2>
            <p className="text-xs text-muted-foreground">ClawdBot Orchestration</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => navigateToPanel(item.id)}
                className={`w-full flex items-start space-x-3 px-3 py-3 rounded-xl text-left transition-colors group ${
                  activeTab === item.id
                    ? 'bg-violet-500 text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                title={item.description}
              >
                <span className="mt-0.5">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.label}</div>
                  <div className={`text-xs mt-0.5 ${
                    activeTab === item.id
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground group-hover:text-foreground/70'
                  }`}>
                    {item.description}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Status Footer */}
      <div className="p-4 border-t border-border space-y-3">
        {/* Connection Status */}
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Gateway</span>
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                connection.isConnected
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-muted-foreground">
                {connection.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
            <div className="mt-2 space-y-1">
              <div className="text-xs text-muted-foreground font-mono">
                {connection.url || 'ws://<gateway-host>:<gateway-port>'}
              </div>
              {connection.latency && (
                <div className="text-xs text-muted-foreground font-mono">
                  Latency: {connection.latency}ms
                </div>
            )}
          </div>
        </div>

        {/* Session Stats */}
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Sessions</span>
            <span className="text-xs text-muted-foreground font-mono">
              {activeSessions}/{totalSessions}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-mono">{activeSessions}</span> active · <span className="font-mono">{totalSessions - activeSessions}</span> idle
          </div>
        </div>

        {/* System Stats */}
        {systemStats && (
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-sm font-semibold text-foreground mb-2">System</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Memory:</span>
                <span className="font-mono">{systemStats.memory ? Math.round((systemStats.memory.used / systemStats.memory.total) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between">
                <span>Disk:</span>
                <span className="font-mono">{systemStats.disk.usage || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Processes:</span>
                <span className="font-mono">{systemStats.processes?.length || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
