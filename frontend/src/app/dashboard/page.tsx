'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { format } from 'date-fns'
import Link from 'next/link'
import { Heart, Users, TrendingUp, Bell, UserPlus, Zap, Dog } from 'lucide-react'

function StatCard({ label, value, sub, color, fill, icon, href, delay = 0 }: any) {
  const inner = (
    <div
      className="stat-card animate-fade-in-up"
      style={{
        animationDelay: `${delay}ms`,
        borderTop: `3px solid ${color}`,
        background: `linear-gradient(165deg, ${fill} 0%, var(--white) 55%)`,
      }}
    >
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <div className="stat-icon" style={{ background: 'var(--white)', boxShadow: '0 1px 3px rgba(13,26,15,.08)' }}>
          {icon}
        </div>
      </div>
      <div className="stat-value">{value ?? <span className="skeleton skeleton-title" style={{width:60,display:'inline-block'}}/>}</div>
      {sub && <div className="stat-sub" style={{marginTop:4}}>{sub}</div>}
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

const QUICK_ACTIONS = [
  { href: '/dashboard/litters/new', label: 'New Litter', icon: Heart, color: 'var(--pink)', bg: 'var(--pink-f)' },
  { href: '/dashboard/buyers/new', label: 'Add Buyer', icon: UserPlus, color: 'var(--blue)', bg: 'var(--blue-f)' },
  { href: '/dashboard/contracts/new', label: 'AI Contract', icon: Zap, color: 'var(--purple)', bg: 'var(--purple-f)' },
  { href: '/dashboard/dogs/new', label: 'Add Dog', icon: Dog, color: 'var(--amber)', bg: 'var(--amber-f)' },
]

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: stats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: () => dashboardApi.stats().then(r => r.data) })
  const { data: activity } = useQuery({ queryKey: ['dashboard-activity'], queryFn: () => dashboardApi.recentActivity().then(r => r.data) })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] ?? 'there'
  const emoji = hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙'

  return (
    <div className="page-enter">
      <div className="topbar">
        <div>
          <div className="topbar-title">{greeting}, {firstName} {emoji}</div>
          <div className="topbar-sub">{user?.kennel_name ?? 'Your Kennel'} · {format(new Date(), 'EEEE, MMMM d')}</div>
        </div>
        <div className="topbar-right">
          <Link href="/dashboard/litters/new" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Litter
          </Link>
        </div>
      </div>

      <div className="page-body">

        <div className="stats-grid stagger">
          <StatCard delay={0} label="Active Litters" value={stats?.active_litters} sub="↑ tracking in real time" color="var(--pink)" fill="var(--pink-f)" href="/dashboard/litters"
            icon={<Heart size={17} color="var(--pink)" strokeWidth={2}/>}
          />
          <StatCard delay={60} label="Total Buyers" value={stats?.total_buyers} sub="↑ in your pipeline" color="var(--blue)" fill="var(--blue-f)" href="/dashboard/buyers"
            icon={<Users size={17} color="var(--blue)" strokeWidth={2}/>}
          />
          <StatCard delay={120} label="Deposits Collected" value={stats?.buyers_with_deposit} sub="via Stripe Connect" color="var(--forest-ll)" fill="var(--sage-l)"
            icon={<TrendingUp size={17} color="var(--forest-ll)" strokeWidth={2}/>}
          />
          <StatCard delay={180} label="Follow-ups Due" value={stats?.follow_ups_due ?? 0}
            sub={stats?.follow_ups_due > 0 ? '⚠ Action needed' : '✓ All caught up'}
            color={stats?.follow_ups_due > 0 ? 'var(--red)' : 'var(--forest-ll)'}
            fill={stats?.follow_ups_due > 0 ? 'var(--red-f)' : 'var(--sage-l)'}
            href="/dashboard/buyers"
            icon={<Bell size={17} color={stats?.follow_ups_due > 0 ? 'var(--red)' : 'var(--forest-ll)'} strokeWidth={2}/>}
          />
        </div>

        <div className="two-col">
          {/* Activity Feed */}
          <div className="card animate-fade-in-up" style={{padding:22,animationDelay:'220ms'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700,color:'var(--ink)'}}>Recent Activity</h3>
              <Link href="/dashboard/buyers" style={{fontSize:13,color:'var(--forest)',textDecoration:'none',fontWeight:500}}>View all →</Link>
            </div>
            {activity?.length ? activity.slice(0,6).map((item: any, i: number) => (
              <div key={i} className="activity-item animate-slide-in" style={{animationDelay:`${i*40}ms`}}>
                <div className="activity-dot" style={{background: i%3===0?'var(--forest-ll)':i%3===1?'var(--blue)':'var(--amber)'}}/>
                <div>
                  <div className="activity-text">{item.description}</div>
                  <div className="activity-time">{format(new Date(item.timestamp),'MMM d, h:mm a')}</div>
                </div>
              </div>
            )) : (
              <div style={{textAlign:'center',padding:'32px 0'}}>
                <div className="empty-icon" style={{margin:'0 auto 12px'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{width:24,height:24,color:'var(--ink-4)'}}><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                </div>
                <p style={{fontSize:14,color:'var(--ink-4)',lineHeight:1.5}}>No activity yet.<br/>Add your first litter to get started.</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card animate-fade-in-up" style={{padding:22,animationDelay:'280ms'}}>
            <h3 style={{fontSize:15,fontWeight:700,color:'var(--ink)',marginBottom:16}}>Quick Actions</h3>
            <div className="qa-grid" style={{marginBottom:16}}>
              {QUICK_ACTIONS.map((a, i) => (
                <Link key={a.href} href={a.href} className="qa-btn" style={{
                  animationDelay:`${i*40}ms`,
                  background: `linear-gradient(165deg, ${a.bg} 0%, var(--white) 75%)`,
                  borderColor: a.color,
                }}>
                  <div className="qa-icon" style={{ background: 'var(--white)', boxShadow: '0 1px 3px rgba(13,26,15,.1)' }}>
                    <a.icon size={20} color={a.color} strokeWidth={2}/>
                  </div>
                  <div className="qa-label">{a.label}</div>
                </Link>
              ))}
            </div>

            {user?.subscription_active ? (
              <div className="ai-result">
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--forest)"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--forest)',textTransform:'uppercase',letterSpacing:'.4px'}}>AI features active</span>
                </div>
                <p style={{fontSize:13,color:'var(--ink-3)',lineHeight:1.5}}>Generate contracts, draft litter announcements, and write buyer emails with Claude from any buyer or litter page.</p>
              </div>
            ) : (
              <div style={{background:'var(--paper)',border:'1px solid var(--paper-3)',borderRadius:'var(--r-lg)',padding:14}}>
                <p style={{fontSize:13,color:'var(--ink-4)',lineHeight:1.5,marginBottom:10}}>Unlock AI contracts, litter announcements, and automated follow-ups.</p>
                <Link href="/dashboard/upgrade" style={{fontSize:13,color:'var(--forest)',fontWeight:600,textDecoration:'none'}}>Upgrade to Pro →</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
