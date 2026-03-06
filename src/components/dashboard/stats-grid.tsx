'use client'

import { formatUptime } from '@/lib/utils'
import {
  BarChart3,
  CircleDot,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react'

interface Stats {
  totalSessions: number
  activeSessions: number
  totalMessages: number
  uptime: number
  errors: number
}

interface StatsGridProps {
  stats: Stats
  systemStats?: any
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
  subtitle?: string
  color?: 'default' | 'success' | 'warning' | 'danger'
}

function StatCard({ title, value, icon, trend, subtitle, color = 'default' }: StatCardProps) {
  const colorClasses = {
    default: 'bg-card border-border',
    success: 'bg-emerald-500/10 border-emerald-500/30',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    danger: 'bg-red-500/10 border-red-500/30'
  }

  const iconColorClasses = {
    default: 'text-violet-600 dark:text-violet-400',
    success: 'text-emerald-400',
    warning: 'text-yellow-400',
    danger: 'text-red-400'
  }

  return (
    <div className={`p-4 bg-card border border-border rounded-xl ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-semibold font-mono text-foreground">{value}</p>
            {trend && (
              <span className={`text-sm ${
                trend === 'up' ? 'text-emerald-400' :
                trend === 'down' ? 'text-red-400' :
                'text-muted-foreground'
              }`}>
                {trend === 'up' ? <TrendingUp className="w-4 h-4 inline" /> : trend === 'down' ? <TrendingDown className="w-4 h-4 inline" /> : <ArrowRight className="w-4 h-4 inline" />}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`${iconColorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export function StatsGrid({ stats, systemStats }: StatsGridProps) {
  const uptimeFormatted = systemStats?.uptime ?
    formatUptime(systemStats.uptime) :
    formatUptime(Date.now() - stats.uptime)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard
        title="Total Sessions"
        value={stats.totalSessions}
        icon={<BarChart3 className="w-5 h-5" />}
        trend="stable"
        color="default"
      />

      <StatCard
        title="Active Sessions"
        value={stats.activeSessions}
        icon={<CircleDot className="w-5 h-5" />}
        trend="up"
        subtitle={`${stats.totalSessions > 0 ? Math.round((stats.activeSessions / stats.totalSessions) * 100) : 0}% active`}
        color="success"
      />

      <StatCard
        title="Messages"
        value={stats.totalMessages.toLocaleString()}
        icon={<MessageSquare className="w-5 h-5" />}
        trend="up"
        subtitle="Total processed"
        color="default"
      />

      <StatCard
        title="Uptime"
        value={uptimeFormatted}
        icon={<Clock className="w-5 h-5" />}
        trend="stable"
        subtitle="System running"
        color="default"
      />

      <StatCard
        title="Errors"
        value={stats.errors}
        icon={stats.errors > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
        trend={stats.errors > 0 ? "up" : "stable"}
        subtitle="Past 24h"
        color={stats.errors > 0 ? "danger" : "success"}
      />
    </div>
  )
}
