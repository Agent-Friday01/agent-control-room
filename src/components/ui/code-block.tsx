'use client'

import { clsx } from 'clsx'

interface CodeBlockProps {
  title?: string
  children: string
  className?: string
}

function CodeBlock({ title, children, className }: CodeBlockProps) {
  return (
    <div className={clsx('rounded-xl border border-border overflow-hidden bg-card', className)}>
      {/* Traffic-light header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
        </div>
        {title && (
          <span className="ml-2 text-xs font-mono text-muted-foreground">{title}</span>
        )}
      </div>
      {/* Code body */}
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="font-mono">{children}</code>
      </pre>
    </div>
  )
}

export { CodeBlock, type CodeBlockProps }
