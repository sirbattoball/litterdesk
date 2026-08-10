'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TrialBanner } from '@/components/layout/TrialBanner'
import { useAuthStore } from '@/lib/store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !token) {
      router.push('/login')
    }
  }, [hydrated, token, router])

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

  // Onboarding gets the full viewport, no sidebar — it's a focused setup flow,
  // not a normal dashboard screen, and the full nav shouldn't be clickable
  // before setup is done.
  const isOnboarding = pathname?.startsWith('/dashboard/onboarding')
  if (isOnboarding) return <>{children}</>

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-content">
        <TrialBanner />
        {children}
      </div>
    </div>
  )
}
