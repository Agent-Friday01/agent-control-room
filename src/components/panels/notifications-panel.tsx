'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSmartPoll } from '@/lib/use-smart-poll'
import { Bell, Check } from 'lucide-react'

interface Notification {
  id: number
  recipient: string
  type: string
  title: string
  message: string
  source_type?: string
  source_id?: number
  read_at?: number
  delivered_at?: number
  created_at: number
}

export function NotificationsPanel() {
  const [recipient, setRecipient] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem('mc.notifications.recipient') || ''
  })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!recipient) return
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/notifications?recipient=${encodeURIComponent(recipient)}`)
      if (!response.ok) throw new Error('Failed to fetch notifications')
      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (err) {
      setError('Failed to fetch notifications')
    } finally {
      setLoading(false)
    }
  }, [recipient])

  useEffect(() => {
    if (recipient) {
      window.localStorage.setItem('mc.notifications.recipient', recipient)
    }
  }, [recipient])

  useSmartPoll(fetchNotifications, 30000, { enabled: !!recipient, pauseWhenSseConnected: true })

  const markAllRead = async () => {
    if (!recipient) return
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient, markAllRead: true })
    })
    fetchNotifications()
  }

  const markRead = async (id: number) => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] })
    })
    fetchNotifications()
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6">
      <div className="max-w-7xl mx-auto w-full flex flex-col flex-1">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        <button
          onClick={markAllRead}
          className="px-3 py-1.5 bg-secondary text-foreground rounded-md text-sm hover:bg-secondary/80 transition-smooth flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          Mark All Read
        </button>
      </div>

      <div className="p-4 border-b border-border flex-shrink-0">
        <label className="block text-sm text-muted-foreground mb-2">Recipient</label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full bg-surface-1 text-foreground rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          placeholder="Agent name (e.g., my-agent)"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 m-4 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
            <span className="ml-2 text-muted-foreground text-sm">Loading...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/50">
            <Bell className="w-10 h-10 mb-2" />
            <span className="text-sm font-medium">No notifications</span>
            <span className="text-xs text-muted-foreground mt-1">You&apos;re all caught up</span>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-card border border-border rounded-xl p-4 transition-smooth ${
                !n.read_at ? 'border-primary/30 bg-primary/5' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{n.title}</div>
                  <div className="text-xs text-muted-foreground/60">{n.type}</div>
                </div>
                {!n.read_at && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="text-xs text-violet-600 dark:text-violet-400 hover:text-primary/80 transition-smooth flex-shrink-0 ml-2"
                  >
                    Mark read
                  </button>
                )}
              </div>
              <div className="text-sm text-foreground/80 mt-2 whitespace-pre-wrap">{n.message}</div>
              <div className="text-[10px] text-muted-foreground/40 mt-2">
                {new Date(n.created_at * 1000).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  )
}
