'use client'

import { useAgentControlRoom } from '@/store'
import { useNavigateToPanel } from '@/lib/navigation'
import { X } from 'lucide-react'

export function LocalModeBanner() {
  const { dashboardMode, bannerDismissed, dismissBanner } = useAgentControlRoom()
  const navigateToPanel = useNavigateToPanel()

  if (dashboardMode === 'full' || bannerDismissed) return null

  return (
    <div className="mx-4 mt-3 mb-0 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
      <p className="flex-1 text-xs text-cyan-600 dark:text-cyan-300">
        <span className="font-medium text-cyan-700 dark:text-cyan-200">No OpenClaw gateway detected</span>
        {' — running in Local Mode. Monitoring Claude Code sessions, tasks, and local data.'}
      </p>
      <button
        onClick={() => navigateToPanel('gateways')}
        className="shrink-0 text-2xs font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 px-2 py-1 rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-colors"
      >
        Configure Gateway
      </button>
      <button
        onClick={dismissBanner}
        className="shrink-0 text-cyan-500/60 hover:text-cyan-500 dark:hover:text-cyan-300 transition-colors"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
