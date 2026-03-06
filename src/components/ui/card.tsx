'use client'

import { type HTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'featured'
  hoverable?: boolean
  children: ReactNode
}

function Card({ className, variant = 'default', hoverable = false, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border',
        variant === 'default' && 'bg-card border-border',
        variant === 'featured' && 'border-violet-500/50 bg-violet-500/5',
        hoverable && 'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('px-4 py-3 border-b border-border flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('p-4', className)} {...props}>
      {children}
    </div>
  )
}

export { Card, CardHeader, CardBody, type CardProps }
