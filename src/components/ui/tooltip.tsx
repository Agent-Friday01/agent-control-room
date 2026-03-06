'use client'

import { useState, type ReactNode } from 'react'
import { clsx } from 'clsx'

interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

const positionStyles = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={clsx(
            'absolute z-50 whitespace-nowrap pointer-events-none',
            'bg-elevated text-foreground text-sm rounded-md px-2 py-1 border border-border shadow-lg',
            'animate-fade-in',
            positionStyles[side],
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export { Tooltip, type TooltipProps }
