/** Centralized color maps for consistent theming across the app */

export const statusColors = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-500 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-500 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-500 dark:text-red-400',
    dot: 'bg-red-500',
  },
  info: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    text: 'text-cyan-500 dark:text-cyan-400',
    dot: 'bg-cyan-500',
  },
  neutral: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    text: 'text-slate-500 dark:text-slate-400',
    dot: 'bg-slate-500',
  },
} as const

export const logLevelColors = {
  error: { bg: 'bg-red-500/10', text: 'text-red-500 dark:text-red-400', border: 'border-red-500/20' },
  warn: { bg: 'bg-amber-500/10', text: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/20' },
  warning: { bg: 'bg-amber-500/10', text: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/20' },
  info: { bg: 'bg-cyan-500/10', text: 'text-cyan-500 dark:text-cyan-400', border: 'border-cyan-500/20' },
  debug: { bg: 'bg-slate-500/10', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-500/20' },
  trace: { bg: 'bg-slate-500/10', text: 'text-slate-400 dark:text-slate-500', border: 'border-slate-500/20' },
} as const

export const priorityColors = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-500 dark:text-red-400', border: 'border-red-500/20' },
  high: { bg: 'bg-amber-500/10', text: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/20' },
  medium: { bg: 'bg-cyan-500/10', text: 'text-cyan-500 dark:text-cyan-400', border: 'border-cyan-500/20' },
  low: { bg: 'bg-slate-500/10', text: 'text-slate-500 dark:text-slate-400', border: 'border-slate-500/20' },
} as const

export const agentColors = [
  { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-500 dark:text-violet-400' },
  { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-500 dark:text-cyan-400' },
  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-500 dark:text-emerald-400' },
  { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-500 dark:text-amber-400' },
  { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-500 dark:text-rose-400' },
  { bg: 'bg-sky-500/10', border: 'border-sky-500/20', text: 'text-sky-500 dark:text-sky-400' },
  { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-500 dark:text-pink-400' },
  { bg: 'bg-teal-500/10', border: 'border-teal-500/20', text: 'text-teal-500 dark:text-teal-400' },
] as const

export function getAgentColor(index: number) {
  return agentColors[index % agentColors.length]
}
