'use client'

import { type HTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'

interface ChipProps extends HTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  removable?: boolean
  onRemove?: () => void
  children: React.ReactNode
}

function Chip({ className, selected = false, removable = false, onRemove, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
        'transition-colors duration-150',
        selected
          ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted',
        className,
      )}
      {...props}
    >
      {children}
      {removable && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            onRemove?.()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation()
              onRemove?.()
            }
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
        >
          <X size={12} />
        </span>
      )}
    </button>
  )
}

export { Chip, type ChipProps }
