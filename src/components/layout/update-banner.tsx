'use client'

import { useAgentControlRoom } from '@/store'
import { X } from 'lucide-react'

export function UpdateBanner() {
  const { updateAvailable, updateDismissedVersion, dismissUpdate } = useAgentControlRoom()

  if (!updateAvailable) return null
  if (updateDismissedVersion === updateAvailable.latestVersion) return null

  return (
    <div className="mx-4 mt-3 mb-0 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      <p className="flex-1 text-xs text-emerald-600 dark:text-emerald-300">
        <span className="font-medium text-emerald-700 dark:text-emerald-200">
          Update available: v{updateAvailable.latestVersion}
        </span>
        {' — a newer version of Agent Control Room is available.'}
      </p>
      <a
        href={updateAvailable.releaseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 text-2xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 px-2 py-1 rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
      >
        View Release
      </a>
      <button
        onClick={() => dismissUpdate(updateAvailable.latestVersion)}
        className="shrink-0 text-emerald-500/60 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors"
        title="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}
