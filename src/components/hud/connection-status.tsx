'use client'

import { useAgentControlRoom } from '@/store'

interface ConnectionStatusProps {
  isConnected: boolean
  onConnect: () => void
  onDisconnect: () => void
  onReconnect?: () => void
}

export function ConnectionStatus({
  isConnected,
  onConnect,
  onDisconnect,
  onReconnect
}: ConnectionStatusProps) {
  const { connection } = useAgentControlRoom()
  const displayUrl = connection.url || 'ws://<gateway-host>:<gateway-port>'

  const getStatusColor = () => {
    if (isConnected) return 'bg-emerald-500 animate-pulse'
    if (connection.reconnectAttempts > 0) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getStatusText = () => {
    if (isConnected) {
      return 'Connected'
    }
    if (connection.reconnectAttempts > 0) {
      return `Reconnecting... (${connection.reconnectAttempts}/10)`
    }
    return 'Disconnected'
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
        <span className="text-sm font-medium">
          {getStatusText()}
        </span>
        <span className="text-xs text-muted-foreground font-mono">
          {displayUrl}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        {isConnected ? (
          <button
            onClick={onDisconnect}
            className="px-3 py-1 bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors"
            title="Disconnect from gateway"
          >
            Disconnect
          </button>
        ) : connection.reconnectAttempts > 0 ? (
          <button
            onClick={onDisconnect}
            className="px-3 py-1 bg-slate-500/20 text-slate-500 dark:text-slate-400 border border-slate-500/30 rounded-lg text-xs font-medium hover:bg-slate-500/30 transition-colors"
            title="Cancel reconnection attempts"
          >
            Cancel
          </button>
        ) : (
          <div className="flex space-x-1">
            <button
              onClick={onConnect}
              className="px-3 py-1 bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-colors"
              title="Connect to gateway"
            >
              Connect
            </button>
            {onReconnect && (
              <button
                onClick={onReconnect}
                className="px-3 py-1 bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-medium hover:bg-cyan-500/30 transition-colors"
                title="Reconnect with fresh session"
              >
                Reconnect
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
        {connection.latency ? (
          <>
            <span>Latency:</span>
            <span className="font-mono">{connection.latency}ms</span>
          </>
        ) : connection.lastConnected ? (
          <>
            <span>Last connected:</span>
            <span className="font-mono">
              {new Date(connection.lastConnected).toLocaleTimeString()}
            </span>
          </>
        ) : (
          <>
            <span>Status:</span>
            <span className="font-mono">Not connected</span>
          </>
        )}
      </div>
    </div>
  )
}
