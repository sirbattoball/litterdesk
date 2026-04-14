'use client'
import { useAuthStore } from '@/lib/store'
import { paymentsApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function PaymentsPage() {
  const { user } = useAuthStore()

  const handlePortal = async () => {
    try {
      const res = await paymentsApi.createPortal()
      window.open(res.data.portal_url, '_blank')
    } catch { toast.error('Could not open billing portal') }
  }

  const handleConnect = async () => {
    try {
      const res = await paymentsApi.stripeConnectOnboard()
      window.open(res.data.onboard_url, '_blank')
    } catch { toast.error('Could not open Stripe onboarding') }
  }

  return (
    <>
      <div className="topbar">
        <div><div className="topbar-title">Payments</div><div className="topbar-sub">Deposits and billing management</div></div>
      </div>
      <div className="page-body">
        <div className="two-col" style={{ marginBottom:24 }}>
          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:13, color:'var(--ink-4)', marginBottom:8, fontWeight:500, textTransform:'uppercase', letterSpacing:'.3px' }}>Subscription</div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <span className="badge badge-ready" style={{ fontSize:14, padding:'5px 14px' }}>
                {user?.subscription_plan ? user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1) : 'Free'} Plan
              </span>
              {user?.subscription_active && <span style={{ fontSize:13, color:'var(--ink-4)' }}>Active</span>}
            </div>
            {user?.subscription_active ? (
              <button onClick={handlePortal} className="btn-ghost">Manage billing →</button>
            ) : (
              <a href="/dashboard/upgrade" className="btn-primary">Upgrade to Pro</a>
            )}
          </div>

          <div className="card" style={{ padding:24 }}>
            <div style={{ fontSize:13, color:'var(--ink-4)', marginBottom:8, fontWeight:500, textTransform:'uppercase', letterSpacing:'.3px' }}>Deposit Collection</div>
            <p style={{ fontSize:14, color:'var(--ink-3)', lineHeight:1.6, marginBottom:14 }}>
              Connect your bank account via Stripe to collect deposits from buyers. Funds transfer in 2 business days. LitterDesk takes 1.5%.
            </p>
            {user?.stripe_onboarded ? (
              <span className="badge badge-ready" style={{ fontSize:13, padding:'5px 14px' }}>Stripe Connected ✓</span>
            ) : (
              <button onClick={handleConnect} className="btn-primary">Connect Bank Account →</button>
            )}
          </div>
        </div>

        <div className="card" style={{ padding:24 }}>
          <h3 style={{ fontSize:15, fontWeight:600, marginBottom:4 }}>Transaction history</h3>
          <p style={{ fontSize:13, color:'var(--ink-4)', marginBottom:20 }}>Recent deposits and payments will appear here once you start collecting.</p>
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--ink-4)', fontSize:14 }}>
            No transactions yet. Collect your first deposit to get started.
          </div>
        </div>
      </div>
    </>
  )
}
