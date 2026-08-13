'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TrialBanner } from '@/components/layout/TrialBanner'
import { useAuthStore } from '@/lib/store'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, token, refreshUser } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !token) {
      router.push('/login')
    }
  }, [hydrated, token, router])

  // The user object is cached in localStorage so the app loads instantly,
  // but that means it can silently go stale — subscription status, trial
  // countdown, plan changes made elsewhere all rely on a fresh copy.
  // Re-sync from the API once per load rather than trusting the cache
  // indefinitely.
  useEffect(() => {
    if (hydrated && token) {
      refreshUser()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, token])

  if (!hydrated) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  // Registrations no longer get a free trial automatically — they're sent
  // straight to Stripe Checkout to start one. If someone has an account but
  // never completed that (closed the tab, payment failed, etc.), they'll
  // have no active subscription AND no trial_ends_at ever set. Send them
  // back to pick a plan rather than letting them into a dashboard they
  // never actually unlocked. (Doesn't affect earlier accounts that got the
  // old automatic trial — they still have a trial_ends_at value.)
  //
  // Exception: Stripe redirects back here the instant checkout succeeds,
  // but the webhook that flips subscription_active on our side is a
  // separate, slightly-delayed server call — it can genuinely still be in
  // flight when this page loads. `subscribed=true` only ever appears on
  // that redirect, so treat it as trustworthy and skip the gate for this
  // load; refreshUser() already re-syncs on every dashboard visit, so the
  // real status catches up within a page or two regardless.
  const justSubscribed = searchParams.get('subscribed') === 'true'
  const isUpgradePage = pathname === '/dashboard/upgrade'
  const neverActivated = !user.subscription_active && !user.trial_ends_at
  if (neverActivated && !isUpgradePage && !justSubscribed) {
    router.replace('/dashboard/upgrade')
    return (
      <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  // Onboarding gets the full viewport, no sidebar — it's a focused setup flow,
  // not a normal dashboard screen, and the full nav shouldn't be clickable
  // before setup is done.
  const isOnboarding = pathname?.startsWith('/dashboard/onboarding')
  if (isOnboarding) return <>{children}</>

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-content">
        {!isUpgradePage && <TrialBanner />}
        {children}
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    }>
      <DashboardContent>{children}</DashboardContent>
    </Suspense>
  )
}
