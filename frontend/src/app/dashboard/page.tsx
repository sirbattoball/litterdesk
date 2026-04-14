'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { format } from 'date-fns'
import {
  Heart, Users, FileText, Dog, Bell, Zap, TrendingUp, Calendar
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

function StatCard({
  label, value, icon: Icon, color, href
}: {
  label: string; value: string | number; icon: any; color: string; href?: string
}) {
  const content = (
    <div className={clsx('stat-card hover:shadow-md transition-shadow', href && 'cursor-pointer')}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={clsx('p-2 rounded-lg', color)}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600',
  pregnant: 'bg-pink-100 text-pink-700',
  born: 'bg-blue-100 text-blue-700',
  weaning: 'bg-purple-100 text-purple-700',
  ready: 'bg-green-100 text-green-700',
  complete: 'bg-gray-100 text-gray-500',
  inquiry: 'bg-yellow-100 text-yellow-700',
  waitlisted: 'bg-blue-100 text-blue-700',
  deposit_paid: 'bg-green-100 text-green-700',
  matched: 'bg-purple-100 text-purple-700',
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats().then(r => r.data),
  })

  const { data: activity } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardApi.recentActivity().then(r => r.data),
  })

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {user?.kennel_name || 'Your Kennel'} · {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </div>

      {/* Trial Banner */}
      {!user?.subscription_active && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-800">You're on the free trial</p>
              <p className="text-xs text-amber-600">Upgrade to Pro for AI contracts, unlimited litters, and buyer automation</p>
            </div>
          </div>
          <Link href="/dashboard/upgrade" className="btn-primary text-sm py-1.5">
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Litters"
          value={stats?.active_litters ?? '—'}
          icon={Heart}
          color="bg-pink-50 text-pink-600"
          href="/dashboard/litters"
        />
        <StatCard
          label="Total Buyers"
          value={stats?.total_buyers ?? '—'}
          icon={Users}
          color="bg-blue-50 text-blue-600"
          href="/dashboard/buyers"
        />
        <StatCard
          label="Deposits Paid"
          value={stats?.buyers_with_deposit ?? '—'}
          icon={TrendingUp}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Follow-ups Due"
          value={stats?.follow_ups_due ?? '—'}
          icon={Bell}
          color={stats?.follow_ups_due > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}
          href="/dashboard/buyers"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Activity */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {activity?.length ? activity.slice(0, 8).map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 truncate">{item.description}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(item.timestamp), 'MMM d, h:mm a')}
                  </p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-gray-400 text-center py-8">
                No recent activity. Add your first litter to get started.
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/dashboard/litters/new"
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all text-center"
            >
              <Heart size={24} className="text-green-600" />
              <span className="text-sm font-medium text-gray-700">New Litter</span>
            </Link>
            <Link
              href="/dashboard/buyers/new"
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center"
            >
              <Users size={24} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Add Buyer</span>
            </Link>
            <Link
              href="/dashboard/dogs/new"
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-center"
            >
              <Dog size={24} className="text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Add Dog</span>
            </Link>
            <Link
              href="/dashboard/contracts"
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-center"
            >
              <FileText size={24} className="text-amber-600" />
              <span className="text-sm font-medium text-gray-700">Contracts</span>
            </Link>
          </div>

          {/* AI Feature promo */}
          {user?.subscription_active && (
            <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-800">AI Features Active</span>
              </div>
              <p className="text-xs text-green-600">
                Generate contracts, score buyers, and match puppies with AI from any litter or buyer page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
