'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Agent, Session } from '@/types'
import { sessionToAgent, generateNodePosition } from '@/lib/utils'
import { Crown, Bot, Clock, Users, FileText, Network } from 'lucide-react'

interface AgentNetworkProps {
  agents: Agent[]
  sessions: Session[]
}

// Custom node component for agents
function AgentNode({ data }: { data: any }) {
  const { agent, status } = data

  const getStatusColor = () => {
    switch (status) {
      case 'active': return 'border-emerald-500 bg-emerald-500/20'
      case 'idle': return 'border-yellow-500 bg-yellow-500/20'
      case 'error': return 'border-red-500 bg-red-500/20'
      default: return 'border-slate-500 bg-slate-500/20'
    }
  }

  const getTypeIcon = () => {
    switch (agent.type) {
      case 'main': return <Crown className="w-5 h-5 text-violet-400" />
      case 'subagent': return <Bot className="w-5 h-5 text-cyan-400" />
      case 'cron': return <Clock className="w-5 h-5 text-orange-400" />
      case 'group': return <Users className="w-5 h-5 text-cyan-400" />
      default: return <FileText className="w-5 h-5 text-slate-400" />
    }
  }

  const getRoleBadge = () => {
    switch (agent.type) {
      case 'main':
        return { label: 'LEAD', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' }
      case 'subagent':
        return { label: 'WORKER', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' }
      case 'cron':
        return { label: 'CRON', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' }
      default:
        return { label: 'SYSTEM', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }
    }
  }

  const roleBadge = getRoleBadge()
  const isWorking = status === 'active'

  return (
    <div className={`px-3 py-3 shadow-lg rounded-xl border-2 ${getStatusColor()} bg-background min-w-[140px]`}>
      <div className="flex items-start justify-between">
        <span className={`${isWorking ? 'working-indicator' : ''}`}>
          {getTypeIcon()}
        </span>
        {isWorking && (
          <span className="px-1.5 py-0.5 text-xs font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full animate-pulse">
            WORKING
          </span>
        )}
      </div>

      <div className="mt-2">
        <div className="flex items-center space-x-1 mb-1">
          <div className="font-medium text-foreground text-sm truncate">
            {agent.name}
          </div>
          <span className={`px-1.5 py-0.5 text-xs font-bold font-mono border rounded-full ${roleBadge.color}`}>
            {roleBadge.label}
          </span>
        </div>

        <div className="text-xs text-muted-foreground truncate font-mono">
          {(typeof agent.model === 'string' ? agent.model : '').split('/').pop() || 'unknown'}
        </div>

        {agent.session && (
          <div className="text-xs text-muted-foreground/70 mt-1 truncate font-mono">
            {agent.session.key.split(':').pop()}
          </div>
        )}
      </div>
    </div>
  )
}

const nodeTypes = {
  agent: AgentNode,
}

export function AgentNetwork({ agents, sessions }: AgentNetworkProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Convert sessions to nodes and edges
  const { nodeData, edgeData } = useMemo(() => {
    const agentList = sessions.map(sessionToAgent)

    const nodes: Node[] = agentList.map((agent, index) => ({
      id: agent.id,
      type: 'agent',
      position: generateNodePosition(index, agentList.length),
      data: {
        agent,
        status: agent.status,
        label: agent.name
      },
      style: {
        background: 'transparent',
        border: 'none',
      }
    }))

    // Create edges based on relationships (main -> subagents, etc.)
    const edges: Edge[] = []
    const mainAgents = agentList.filter(a => a.type === 'main')
    const subagents = agentList.filter(a => a.type === 'subagent')
    const cronAgents = agentList.filter(a => a.type === 'cron')

    // Connect main agents to subagents
    mainAgents.forEach(main => {
      subagents.forEach(sub => {
        edges.push({
          id: `${main.id}-${sub.id}`,
          source: main.id,
          target: sub.id,
          animated: sub.status === 'active',
          style: {
            stroke: '#06b6d4',
            strokeWidth: 2,
          },
          type: 'smoothstep'
        })
      })

      // Connect main agents to cron jobs
      cronAgents.forEach(cron => {
        edges.push({
          id: `${main.id}-${cron.id}`,
          source: main.id,
          target: cron.id,
          animated: false,
          style: {
            stroke: '#64748b',
            strokeWidth: 1,
            strokeDasharray: '5,5',
          },
          type: 'smoothstep'
        })
      })
    })

    return { nodeData: nodes, edgeData: edges }
  }, [sessions])

  useEffect(() => {
    setNodes(nodeData)
    setEdges(edgeData)
  }, [nodeData, edgeData, setNodes, setEdges])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  if (sessions.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border h-96 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Network className="w-10 h-10 mx-auto mb-2 text-slate-400" />
          <p>No agent network to display</p>
          <p className="text-xs">Agent connections will appear here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Agent Network</h3>
        <p className="text-sm text-muted-foreground">
          Visual representation of agent relationships
        </p>
      </div>

      <div className="h-96 bg-secondary/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-secondary/10"
        >
          <Controls
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
            }}
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="hsl(var(--muted-foreground))"
            style={{ opacity: 0.3 }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}
