'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { format } from 'date-fns'
import Link from 'next/link'

function StatCard({ label, value, sub, color, icon, href }: any) {
  const inner = (
    <div className="stat-card" style={{ cursor: href ? 'pointer' : 'default' }}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <div className="stat-icon" style={{ background: color + '20' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">{icon}</svg>
        </div>
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: () => dashboardApi.stats().then(r => r.data) })
  const { data: activity } = useQuery({ queryKey: ['dashboard-activity'], queryFn: () => dashboardApi.recentActivity().then(r => r.data) })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">{greeting}, {firstName} 👋</div>
          <div className="topbar-sub">{user?.kennel_name ?? 'Your Kennel'} · {format(new Date(), 'EEEE, MMMM d')}</div>
        </div>
        <div className="topbar-right">
          <Link href="/dashboard/litters/new" className="btn-primary">+ New Litter</Link>
        </div>
      </div>

      <div className="page-body">
        {!user?.subscription_active && (
          <div className="trial-banner">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--amber)' }}>You&apos;re on the free trial</p>
                <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>Upgrade to Pro for AI contracts, unlimited litters, and buyer automation</p>
              </div>
            </div>
            <Link href="/dashboard/upgrade" className="btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>Upgrade Now</Link>
          </div>
        )}

        <div className="stats-grid">
          <StatCard label="Active Litters" value={stats?.active_litters} sub="↑ tracking in real time" color="var(--pink)" href="/dashboard/litters"
            icon={<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>}
          />
          <StatCard label="Total Buyers" value={stats?.total_buyers} sub="↑ in your pipeline" color="var(--blue)" href="/dashboard/buyers"
            icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>}
          />
          <StatCard label="Deposits Paid" value={stats?.buyers_with_deposit} sub="via Stripe Connect" color="var(--forest-ll)"
            icon={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>}
          />
          <StatCard label="Follow-ups Due" value={stats?.follow_ups_due} sub={stats?.follow_ups_due > 0 ? 'Action needed today' : 'All caught up'} color={stats?.follow_ups_due > 0 ? 'var(--red)' : 'var(--ink-4)'} href="/dashboard/buyers"
            icon={<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>}
          />
        </div>

        <div className="two-col">
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Recent Activity</h3>
              <Link href="/dashboard/buyers" style={{ fontSize: 13, color: 'var(--forest)', textDecoration: 'none' }}>View all →</Link>
            </div>
            {activity?.length ? activity.slice(0, 6).map((item: any, i: number) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" style={{ background: i % 3 === 0 ? 'var(--forest-ll)' : i % 3 === 1 ? 'var(--blue)' : 'var(--amber)' }} />
                <div>
                  <div className="activity-text">{item.description}</div>
                  <div className="activity-time">{format(new Date(item.timestamp), 'MMM d, h:mm a')}</div>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: 14, color: 'var(--ink-4)', textAlign: 'center', padding: '24px 0' }}>
                No activity yet. Add your first litter to get started.
              </p>
            )}
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h3>
            <div className="qa-grid" style={{ marginBottom: 16 }}>
              <Link href="/dashboard/litters" className="qa-btn" style={{ ':hover': { borderColor: 'var(--pink)', background: 'var(--pink-f)' } } as any}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--pink)'; (e.currentTarget as HTMLElement).style.background = 'var(--pink-f)' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.background = '' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--pink)" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <div className="qa-label">New Litter</div>
              </Link>
              <Link href="/dashboard/buyers" className="qa-btn"
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)'; (e.currentTarget as HTMLElement).style.background = 'var(--blue-f)' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.background = '' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                <div className="qa-label">Add Buyer</div>
              </Link>
              <Link href="/dashboard/contracts" className="qa-btn"
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--purple)'; (e.currentTarget as HTMLElement).style.background = 'var(--purple-f)' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.background = '' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.8"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <div className="qa-label">AI Contract</div>
              </Link>
              <Link href="/dashboard/dogs" className="qa-btn"
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--amber)'; (e.currentTarget as HTMLElement).style.background = 'var(--amber-f)' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.background = '' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                <div className="qa-label">Add Dog</div>
              </Link>
            </div>

            {user?.subscription_active && (
              <div style={{ background: 'var(--sage-l)', border: '1px solid var(--sage)', borderRadius: 'var(--r-lg)', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--forest)"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--forest)' }}>AI features active</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>Generate contracts, score buyers, and draft emails with Claude — from any buyer or litter page.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
