'use client'

import { type ReactNode } from 'react'
import { clsx } from 'clsx'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={clsx('flex items-start justify-between gap-4', className)}>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export { PageHeader, type PageHeaderProps }
