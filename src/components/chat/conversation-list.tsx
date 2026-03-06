'use client'

import { useState, useCallback } from 'react'
import { useAgentControlRoom, Conversation, Agent } from '@/store'
import { useSmartPoll } from '@/lib/use-smart-poll'
import { createClientLogger } from '@/lib/client-logger'
import { Plus, Search } from 'lucide-react'

const log = createClientLogger('ConversationList')

function timeAgo(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

const STATUS_COLORS: Record<string, string> = {
  busy: 'bg-emerald-500',
  idle: 'bg-yellow-500',
  error: 'bg-red-500',
  offline: 'bg-muted-foreground/30',
}

interface ConversationListProps {
  onNewConversation: (agentName: string) => void
}

export function ConversationList({ onNewConversation }: ConversationListProps) {
  const {
    conversations,
    setConversations,
    activeConversation,
    setActiveConversation,
    agents,
    markConversationRead,
  } = useAgentControlRoom()
  const [showNewChat, setShowNewChat] = useState(false)
  const [search, setSearch] = useState('')

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations')
      if (!res.ok) return
      const data = await res.json()
      if (data.conversations) {
        setConversations(
          data.conversations.map((c: any) => ({
            id: c.conversation_id,
            participants: [],
            lastMessage: c.last_message
              ? {
                  id: c.last_message.id,
                  conversation_id: c.last_message.conversation_id,
                  from_agent: c.last_message.from_agent,
                  to_agent: c.last_message.to_agent,
                  content: c.last_message.content,
                  message_type: c.last_message.message_type,
                  metadata: c.last_message.metadata,
                  read_at: c.last_message.read_at,
                  created_at: c.last_message.created_at,
                }
              : undefined,
            unreadCount: c.unread_count || 0,
            updatedAt: c.last_message_at || 0,
          }))
        )
      }
    } catch (err) {
      log.error('Failed to load conversations:', err)
    }
  }, [setConversations])

  useSmartPoll(loadConversations, 30000, { pauseWhenSseConnected: true })

  const handleSelect = (convId: string) => {
    setActiveConversation(convId)
    markConversationRead(convId)
  }

  const filteredConversations = conversations.filter((c) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      c.id.toLowerCase().includes(s) ||
      c.lastMessage?.from_agent.toLowerCase().includes(s) ||
      c.lastMessage?.content.toLowerCase().includes(s)
    )
  })

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chats</h3>
          <button
            onClick={() => setShowNewChat(!showNewChat)}
            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-smooth"
            title="New conversation"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-secondary rounded-md pl-7 pr-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
          />
        </div>
      </div>

      {/* New chat agent picker */}
      {showNewChat && (
        <div className="border-b border-border p-2 bg-secondary max-h-48 overflow-y-auto flex-shrink-0 fade-in">
          <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1 px-1">Chat with agent</div>
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => {
                onNewConversation(agent.name)
                setShowNewChat(false)
              }}
              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent/50 flex items-center gap-2 transition-smooth"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[agent.status] || STATUS_COLORS.offline}`} />
              <span className="font-medium text-foreground">{agent.name}</span>
              <span className="text-muted-foreground/50 text-[10px] ml-auto truncate max-w-[60px]">{agent.role}</span>
            </button>
          ))}
          {agents.length === 0 && (
            <div className="text-xs text-muted-foreground/50 px-1 py-2">No agents registered</div>
          )}
        </div>
      )}

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground/50">
            No conversations yet
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const agentName = conv.id.replace('agent_', '')
            const agent = agents.find(a => a.name.toLowerCase() === agentName.toLowerCase())
            const isActive = activeConversation === conv.id

            return (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv.id)}
                className={`w-full text-left px-3 py-2.5 transition-smooth ${
                  isActive
                    ? 'bg-accent/60 border-l-2 border-violet-500'
                    : 'hover:bg-secondary border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* Mini avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {agentName.charAt(0).toUpperCase()}
                    </div>
                    {agent && (
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${STATUS_COLORS[agent.status] || STATUS_COLORS.offline}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground truncate">
                        {agentName}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                        {conv.unreadCount > 0 && (
                          <span className="bg-violet-500 text-primary-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                            {conv.unreadCount}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/40">
                          {conv.updatedAt ? timeAgo(conv.updatedAt) : ''}
                        </span>
                      </div>
                    </div>
                    {conv.lastMessage && (
                      <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                        {conv.lastMessage.from_agent === 'human'
                          ? `You: ${conv.lastMessage.content}`
                          : conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
