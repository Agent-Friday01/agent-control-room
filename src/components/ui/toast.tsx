'use client'

import { useEffect, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

type ToastVariant = 'success' | 'warning' | 'error' | 'info'

interface ToastProps {
  variant?: ToastVariant
  title: string
  description?: string
  onClose: () => void
  duration?: number
  className?: string
}

const variantConfig: Record<ToastVariant, { border: string; icon: ReactNode }> = {
  success: {
    border: 'border-l-emerald-500',
    icon: <CheckCircle size={18} className="text-emerald-500" />,
  },
  warning: {
    border: 'border-l-amber-500',
    icon: <AlertTriangle size={18} className="text-amber-500" />,
  },
  error: {
    border: 'border-l-red-500',
    icon: <XCircle size={18} className="text-red-500" />,
  },
  info: {
    border: 'border-l-cyan-500',
    icon: <Info size={18} className="text-cyan-500" />,
  },
}

function Toast({ variant = 'info', title, description, onClose, duration = 5000, className }: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const config = variantConfig[variant]

  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-lg border border-border border-l-4 bg-card p-4 shadow-lg',
        'animate-slide-in-right',
        config.border,
        className,
      )}
    >
      <span className="shrink-0 mt-0.5">{config.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export { Toast, type ToastProps, type ToastVariant }
