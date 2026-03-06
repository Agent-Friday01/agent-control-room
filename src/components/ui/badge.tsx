'use client'

import { type HTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'

type BadgeVariant =
  | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  | 'delivered' | 'bounced' | 'opened' | 'clicked' | 'failed'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
  children: ReactNode
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  info: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  delivered: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  bounced: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  opened: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  clicked: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
}

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-cyan-500',
  neutral: 'bg-slate-500',
  delivered: 'bg-emerald-500',
  bounced: 'bg-red-500',
  opened: 'bg-cyan-500',
  clicked: 'bg-violet-500',
  failed: 'bg-red-500',
}

function Badge({ className, variant = 'neutral', dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span className={clsx('h-1.5 w-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}

export { Badge, type BadgeProps, type BadgeVariant }
