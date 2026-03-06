'use client'

interface OnlineStatusProps {
  isConnected: boolean
}

export function OnlineStatus({ isConnected }: OnlineStatusProps) {
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-emerald-500 pulse-dot' : 'bg-red-500'
      }`}></div>
      <span className={`text-sm font-semibold tracking-wide font-mono ${
        isConnected ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
      }`}>
        {isConnected ? 'ONLINE' : 'OFFLINE'}
      </span>
    </div>
  )
}
