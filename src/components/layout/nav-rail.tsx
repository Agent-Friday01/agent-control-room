'use client'

import { useState, useEffect } from 'react'
import { useAgentControlRoom } from '@/store'
import { useNavigateToPanel } from '@/lib/navigation'
import {
  LayoutDashboard, Users, ClipboardList, Monitor, Building2,
  Activity, FileText, Coins, DollarSign, Database,
  Clock, Rocket, Webhook, Bell, Github,
  UserCog, ShieldCheck, History, Server, Settings,
  Puzzle, Crown, ChevronLeft, ChevronRight, ChevronDown,
  MoreHorizontal, Wand2,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  priority: boolean
  requiresGateway?: boolean
}

interface NavGroup {
  id: string
  label?: string
  items: NavItem[]
}

const ICON_SIZE = 18

const navGroups: NavGroup[] = [
  {
    id: 'core',
    items: [
      { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={ICON_SIZE} />, priority: true },
      { id: 'agents', label: 'Agents', icon: <Users size={ICON_SIZE} />, priority: true, requiresGateway: true },
      { id: 'tasks', label: 'Tasks', icon: <ClipboardList size={ICON_SIZE} />, priority: true },
      { id: 'sessions', label: 'Sessions', icon: <Monitor size={ICON_SIZE} />, priority: false },
      { id: 'office', label: 'Office', icon: <Building2 size={ICON_SIZE} />, priority: false },
    ],
  },
  {
    id: 'observe',
    label: 'OBSERVE',
    items: [
      { id: 'activity', label: 'Activity', icon: <Activity size={ICON_SIZE} />, priority: true },
      { id: 'logs', label: 'Logs', icon: <FileText size={ICON_SIZE} />, priority: false },
      { id: 'tokens', label: 'Tokens', icon: <Coins size={ICON_SIZE} />, priority: false },
      { id: 'agent-costs', label: 'Agent Costs', icon: <DollarSign size={ICON_SIZE} />, priority: false },
      { id: 'memory', label: 'Memory', icon: <Database size={ICON_SIZE} />, priority: false },
    ],
  },
  {
    id: 'automate',
    label: 'AUTOMATE',
    items: [
      { id: 'cron', label: 'Cron', icon: <Clock size={ICON_SIZE} />, priority: false },
      { id: 'spawn', label: 'Spawn', icon: <Rocket size={ICON_SIZE} />, priority: false, requiresGateway: true },
      { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={ICON_SIZE} />, priority: false },
      { id: 'alerts', label: 'Alerts', icon: <Bell size={ICON_SIZE} />, priority: false },
      { id: 'github', label: 'GitHub', icon: <Github size={ICON_SIZE} />, priority: false },
    ],
  },
  {
    id: 'admin',
    label: 'ADMIN',
    items: [
      { id: 'users', label: 'Users', icon: <UserCog size={ICON_SIZE} />, priority: false },
      { id: 'audit', label: 'Audit', icon: <ShieldCheck size={ICON_SIZE} />, priority: false },
      { id: 'history', label: 'History', icon: <History size={ICON_SIZE} />, priority: false },
      { id: 'gateways', label: 'Gateways', icon: <Server size={ICON_SIZE} />, priority: false },
      { id: 'gateway-config', label: 'Config', icon: <Settings size={ICON_SIZE} />, priority: false, requiresGateway: true },
      { id: 'integrations', label: 'Integrations', icon: <Puzzle size={ICON_SIZE} />, priority: false },
      { id: 'skills', label: 'Skills', icon: <Wand2 size={ICON_SIZE} />, priority: false },
      { id: 'workspaces', label: 'Workspaces', icon: <Crown size={ICON_SIZE} />, priority: false },
      { id: 'super-admin', label: 'Super Admin', icon: <Crown size={ICON_SIZE} />, priority: false },
      { id: 'settings', label: 'Settings', icon: <Settings size={ICON_SIZE} />, priority: false },
    ],
  },
]

const allNavItems = navGroups.flatMap(g => g.items)

export function NavRail() {
  const { activeTab, connection, dashboardMode, sidebarExpanded, collapsedGroups, toggleSidebar, toggleGroup } = useAgentControlRoom()
  const navigateToPanel = useNavigateToPanel()
  const isLocal = dashboardMode === 'local'

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === '[' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable)) {
        e.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggleSidebar])

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={`hidden md:flex flex-col bg-background border-r border-border shrink-0 transition-all duration-200 ease-in-out ${
          sidebarExpanded ? 'w-[220px]' : 'w-14'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center shrink-0 ${sidebarExpanded ? 'px-3 py-3 gap-2.5' : 'flex-col py-3 gap-2'}`}>
          <div className="w-9 h-9 rounded-lg bg-violet-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">MC</span>
          </div>
          {sidebarExpanded && (
            <span className="text-sm font-semibold text-foreground truncate flex-1">Agent Control Room</span>
          )}
          <button
            onClick={toggleSidebar}
            title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-150 shrink-0"
          >
            {sidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Nav groups */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
          {navGroups.map((group, groupIndex) => (
            <div key={group.id}>
              {groupIndex > 0 && (
                <div className={`my-1.5 border-t border-border ${sidebarExpanded ? 'mx-3' : 'mx-2'}`} />
              )}

              {sidebarExpanded && group.label && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 mt-3 mb-1 group/header"
                >
                  <span className="text-[10px] font-mono tracking-wider text-muted-foreground/60 font-semibold select-none uppercase">
                    {group.label}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-muted-foreground/40 group-hover/header:text-muted-foreground transition-transform duration-150 ${
                      collapsedGroups.includes(group.id) ? '-rotate-90' : ''
                    }`}
                  />
                </button>
              )}

              <div
                className={`overflow-hidden transition-all duration-150 ease-in-out ${
                  sidebarExpanded && collapsedGroups.includes(group.id) ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'
                }`}
              >
                <div className={`flex flex-col ${sidebarExpanded ? 'gap-0.5 px-2' : 'items-center gap-1'}`}>
                  {group.items.map((item) => {
                    const disabled = isLocal && item.requiresGateway
                    return (
                      <NavButton
                        key={item.id}
                        item={item}
                        active={activeTab === item.id}
                        expanded={sidebarExpanded}
                        disabled={disabled}
                        onClick={() => { if (!disabled) navigateToPanel(item.id) }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Connection indicator */}
        <div className={`shrink-0 py-3 flex ${sidebarExpanded ? 'px-3 items-center gap-2' : 'flex-col items-center'}`}>
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isLocal
                ? 'bg-cyan-500'
                : connection.isConnected ? 'bg-emerald-500 pulse-dot' : 'bg-red-500'
            }`}
            title={isLocal ? 'Local Mode' : connection.isConnected ? 'Gateway connected' : 'Gateway disconnected'}
          />
          {sidebarExpanded && (
            <span className="text-xs text-muted-foreground truncate">
              {isLocal ? 'Local Mode' : connection.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          )}
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <MobileBottomBar activeTab={activeTab} navigateToPanel={navigateToPanel} />
    </>
  )
}

function NavButton({ item, active, expanded, disabled, onClick }: {
  item: NavItem
  active: boolean
  expanded: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const disabledClass = disabled ? 'opacity-40 pointer-events-none' : ''
  const tooltipLabel = disabled ? `${item.label} (Requires gateway)` : item.label

  if (expanded) {
    return (
      <button
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        aria-disabled={disabled || undefined}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all duration-150 relative ${disabledClass} ${
          active
            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        }`}
      >
        {active && (
          <span className="absolute left-0 w-0.5 h-5 bg-violet-500 rounded-r" />
        )}
        <span className="w-5 h-5 shrink-0 flex items-center justify-center">{item.icon}</span>
        <span className="text-sm truncate">{item.label}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      title={tooltipLabel}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 group relative ${disabledClass} ${
        active
          ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
      <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium bg-elevated text-foreground border border-border rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
        {tooltipLabel}
      </span>
      {active && (
        <span className="absolute left-0 w-0.5 h-5 bg-violet-500 rounded-r" />
      )}
    </button>
  )
}

function MobileBottomBar({ activeTab, navigateToPanel }: {
  activeTab: string
  navigateToPanel: (tab: string) => void
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const priorityItems = allNavItems.filter(i => i.priority)
  const nonPriorityIds = new Set(allNavItems.filter(i => !i.priority).map(i => i.id))
  const moreIsActive = nonPriorityIds.has(activeTab)

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
        <div className="flex items-center justify-around px-1 h-14">
          {priorityItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigateToPanel(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg transition-all duration-150 min-w-[48px] min-h-[48px] ${
                activeTab === item.id
                  ? 'text-violet-500'
                  : 'text-muted-foreground'
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setSheetOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-lg transition-all duration-150 min-w-[48px] min-h-[48px] relative ${
              moreIsActive ? 'text-violet-500' : 'text-muted-foreground'
            }`}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium">More</span>
            {moreIsActive && (
              <span className="absolute top-1.5 right-2.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
            )}
          </button>
        </div>
      </nav>

      <MobileBottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        activeTab={activeTab}
        navigateToPanel={navigateToPanel}
      />
    </>
  )
}

function MobileBottomSheet({ open, onClose, activeTab, navigateToPanel }: {
  open: boolean
  onClose: () => void
  activeTab: string
  navigateToPanel: (tab: string) => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
    }
  }, [open])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  if (!open) return null

  return (
    <div className="md:hidden fixed inset-0 z-[60]">
      <div
        className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      <div
        className={`absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl max-h-[70vh] overflow-y-auto safe-area-bottom transition-transform duration-200 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-4 pb-6">
          {navGroups.map((group, groupIndex) => (
            <div key={group.id}>
              {groupIndex > 0 && <div className="my-3 border-t border-border" />}
              <div className="px-1 pt-1 pb-2">
                <span className="text-[10px] font-mono tracking-wider text-muted-foreground/60 font-semibold uppercase">
                  {group.label || 'CORE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigateToPanel(item.id)
                      handleClose()
                    }}
                    className={`flex items-center gap-2.5 px-3 min-h-[48px] rounded-xl transition-all duration-150 ${
                      activeTab === item.id
                        ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    <span className="w-5 h-5 shrink-0 flex items-center justify-center">{item.icon}</span>
                    <span className="text-xs font-medium truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
