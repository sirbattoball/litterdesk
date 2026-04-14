'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/lib/store'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!token || !user) router.push('/login')
  }, [token, user, router])

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  return (
    <div className="shell">
      <Sidebar />
      <div className="main-content">{children}</div>
    </div>
  )
}
