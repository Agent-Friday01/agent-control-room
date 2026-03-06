'use client'

import { clsx } from 'clsx'

type SpinnerSize = 'sm' | 'md' | 'lg'

interface LoadingSpinnerProps {
  size?: SpinnerSize
  className?: string
}

const sizeMap: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-[1.5px]',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-2',
}

function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-violet-500 border-t-transparent',
        sizeMap[size],
        className,
      )}
    />
  )
}

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-lg bg-muted',
        className,
      )}
    />
  )
}

export { LoadingSpinner, Skeleton, type LoadingSpinnerProps, type SkeletonProps }
