'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TrialBanner } from '@/components/layout/TrialBanner'
import { useAuthStore } from '@/lib/store'
import { authApi, paymentsApi } from '@/lib/api'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, token, setUser } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const accountPage = ['/dashboard/upgrade', '/dashboard/settings', '/dashboard/payments'].includes(pathname)
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const billingReturn = params.get('billing_return')
  const connectReturn = params.get('connect_return')
  const [hydrated, setHydrated] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => { setHydrated(true) }, [])
  useEffect(() => {
    if (!hydrated) return
    if (!token) { router.replace('/login'); return }
    let cancelled = false
    setChecked(false)
    setError('')
    const verify = async () => {
      try {
        if (sessionId) await paymentsApi.syncSubscription(sessionId)
        if (billingReturn) await paymentsApi.refreshSubscription()
        if (connectReturn) await paymentsApi.refreshConnect()
        const res = await authApi.me()
        if (cancelled) return
        setUser(res.data)
        setChecked(true)
        if (!res.data.subscription_active && !accountPage) {
          router.replace('/dashboard/upgrade')
        } else if (res.data.subscription_active && !res.data.onboarding_completed && !pathname.startsWith('/dashboard/onboarding') && !accountPage) {
          router.replace('/dashboard/onboarding')
        } else if (sessionId || billingReturn || connectReturn) {
          router.replace(pathname)
        }
      } catch {
        if (!cancelled) setError('We could not verify your account. Please try again.')
      }
    }
    verify()
    return () => { cancelled = true }
  }, [hydrated, token, sessionId, billingReturn, connectReturn, accountPage, retry, router, setUser, pathname])
  if (error) return <div className="page-body"><p>{error}</p><button className="btn-primary" onClick={() => setRetry(r => r + 1)}>Try again</button><a className="btn-ghost" href="/dashboard/upgrade">Manage subscription</a></div>
  if (!hydrated || !checked || !user || (!user.subscription_active && !accountPage)) return <div style={{ padding: 64, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
  if (pathname?.startsWith('/dashboard/onboarding')) return <>{children}</>
  return <div className="shell"><Sidebar /><div className="main-content">{pathname !== '/dashboard/upgrade' && <TrialBanner />}{children}</div></div>
}
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div>Loading…</div>}><DashboardContent>{children}</DashboardContent></Suspense>
}
