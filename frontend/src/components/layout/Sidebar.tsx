'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { LayoutGrid, Heart, Users, Dog, FileText, CreditCard, Settings, MoreHorizontal, LogOut } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutGrid /> },
  { href: '/dashboard/litters', label: 'Litters', icon: <Heart /> },
  { href: '/dashboard/buyers', label: 'Buyers', icon: <Users /> },
  { href: '/dashboard/dogs', label: 'My Dogs', icon: <Dog /> },
  { href: '/dashboard/contracts', label: 'Contracts', icon: <FileText /> },
  { href: '/dashboard/payments', label: 'Payments', icon: <CreditCard /> },
  { href: '/dashboard/settings', label: 'Settings', icon: <Settings /> },
]

// Bottom nav has room for 5 slots. 4 go to the most-used sections;
// the 5th is a "More" button revealing the rest — previously this just
// silently dropped Payments and Settings with no way to reach them on
// mobile at all.
const MOBILE_PRIMARY = NAV.slice(0, 4)
const MOBILE_OVERFLOW = NAV.slice(4)

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const initials = user?.full_name?.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase() ?? 'U'

  const planLabel = (() => {
    // Once they've actually subscribed, show the real plan name.
    if (user?.subscription_active && user?.subscription_plan) {
      return user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1) + ' Plan'
    }
    // Otherwise, if they're within their trial window, say so explicitly —
    // "Free Plan" reads as a permanent limited tier and undercuts the
    // "7-day free trial" pitch on the landing page.
    if (user?.trial_ends_at) {
      const daysLeft = Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysLeft > 0) return `Trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
      return 'Trial expired'
    }
    return user?.subscription_plan
      ? user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1) + ' Plan'
      : 'Free Trial'
  })()

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logomark">
            <svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          </div>
          <div>
            <div className="sidebar-name">LitterDesk</div>
            {user?.kennel_name && <div className="sidebar-kennel">{user.kennel_name}</div>}
          </div>
        </div>

        {/* Plan badge */}
        <div className="sidebar-plan">
          <span className="plan-chip">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            {planLabel}
          </span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive(href) ? 'active' : ''}`}
            >
              {icon}
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          {!user?.subscription_active && (
            <Link href="/dashboard/upgrade" className="upgrade-strip">
              <svg viewBox="0 0 24 24" fill="currentColor" style={{width:14,height:14}}><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              Upgrade to Pro
            </Link>
          )}
          <div style={{display:'flex',alignItems:'center',gap:9,padding:'6px 4px'}}>
            <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,var(--forest-l),var(--forest))',border:'1.5px solid rgba(255,255,255,.18)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11.5,fontWeight:700,color:'#fff',flexShrink:0}}>
              {initials}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12.5,fontWeight:600,color:'rgba(250,248,243,.92)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.full_name}</div>
              <div style={{fontSize:11,color:'rgba(250,248,243,.5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.email}</div>
            </div>
            <button onClick={logout} style={{border:'none',background:'none',cursor:'pointer',color:'rgba(250,248,243,.55)',padding:4,borderRadius:6,transition:'all var(--t-fast)'}}
              onMouseOver={e=>(e.currentTarget as HTMLElement).style.color='#f5a3a3'}
              onMouseOut={e=>(e.currentTarget as HTMLElement).style.color='rgba(250,248,243,.55)'}
              title="Sign out">
              <LogOut size={15}/>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <header className="mobile-topbar">
        <div className="mobile-topbar-logo">
          <div className="sidebar-logomark" style={{width:28,height:28,borderRadius:8}}>
            <svg viewBox="0 0 24 24" style={{width:14,height:14}}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          </div>
          <span className="sidebar-name" style={{fontSize:16}}>LitterDesk</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {!user?.subscription_active && (
            <Link href="/dashboard/upgrade" className="plan-chip" style={{fontSize:11,padding:'3px 10px',textDecoration:'none'}}>
              ↑ Upgrade
            </Link>
          )}
          <button onClick={logout} style={{border:'none',background:'var(--paper)',cursor:'pointer',color:'var(--ink-4)',padding:'6px 8px',borderRadius:8,fontSize:13}}>
            Sign out
          </button>
        </div>
      </header>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="mobile-bottom-nav">
        {MOBILE_PRIMARY.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`mobile-nav-item ${isActive(href) ? 'active' : ''}`}
          >
            {icon}
            <span>{label}</span>
          </Link>
        ))}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={`mobile-nav-item ${MOBILE_OVERFLOW.some(i => isActive(i.href)) ? 'active' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
        >
          <MoreHorizontal/>
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(13,26,15,.4)', zIndex: 90, display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--white)', width: '100%', borderRadius: '20px 20px 0 0', padding: '10px 8px calc(env(safe-area-inset-bottom,0) + 12px)', boxShadow: '0 -8px 30px rgba(0,0,0,.15)' }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--paper-3)', margin: '4px auto 12px' }} />
            {MOBILE_OVERFLOW.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 12, textDecoration: 'none', color: isActive(href) ? 'var(--forest)' : 'var(--ink-2)', fontWeight: isActive(href) ? 600 : 500, fontSize: 15, background: isActive(href) ? 'var(--sage-l)' : 'transparent' }}
              >
                <span style={{ width: 20, height: 20, flexShrink: 0 }}>{icon}</span>
                {label}
              </Link>
            ))}
            <button
              onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 12, width: '100%', textAlign: 'left', border: 'none', background: 'none', color: 'var(--ink-4)', fontWeight: 500, fontSize: 15, cursor: 'pointer', font: 'inherit' }}
            >
              <LogOut size={20}/>
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  )
}
