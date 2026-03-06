'use client'

import { type ReactNode } from 'react'
import { clsx } from 'clsx'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  icon?: ReactNode
  className?: string
}

function StatCard({ label, value, delta, deltaLabel, icon, className }: StatCardProps) {
  const isPositive = delta !== undefined && delta >= 0

  return (
    <div
      className={clsx(
        'rounded-xl border border-border bg-card p-4',
        'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        {icon && (
          <div className="rounded-lg bg-violet-500/10 p-2 text-violet-500">
            {icon}
          </div>
        )}
      </div>
      {delta !== undefined && (
        <div className="mt-2 flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp size={14} className="text-emerald-500" />
          ) : (
            <TrendingDown size={14} className="text-red-500" />
          )}
          <span
            className={clsx(
              'text-xs font-mono font-medium',
              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
            )}
          >
            {isPositive ? '+' : ''}{delta}%
          </span>
          {deltaLabel && (
            <span className="text-xs text-muted-foreground">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}

export { StatCard, type StatCardProps }
