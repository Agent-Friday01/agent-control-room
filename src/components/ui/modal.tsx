'use client'

import { useEffect, useCallback, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

function Modal({ open, onClose, title, children, className }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={clsx(
          'relative z-10 w-full bg-card border border-border rounded-2xl shadow-2xl',
          'max-h-[90vh] overflow-y-auto',
          'max-sm:h-full max-sm:max-h-full max-sm:rounded-none',
          'sm:max-w-lg sm:mx-4',
          'animate-fade-in',
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className={clsx(!title && 'pt-6', 'px-6 py-4')}>
          {children}
        </div>
      </div>
    </div>
  )
}

export { Modal, type ModalProps }
