'use client'
import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { paymentsApi, authApi } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function PaymentsPage() {
  const { user, setUser } = useAuthStore()

  // Stripe Connect redirects back to this page — refetch user so
  // stripe_onboarded flips to true without a manual page refresh
  useEffect(() => {
    const refreshUser = async () => {
      try {
        const res = await authApi.me()
        const fresh = res.data
        setUser(fresh)
        // If we just returned from Stripe Connect and are now onboarded, celebrate
        if (fresh.stripe_onboarded && !user?.stripe_onboarded) {
          toast.success('Bank account connected! You can now collect deposits.', { duration: 5000 })
        }
      } catch (_) {}
    }
    refreshUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePortal = async () => {
    try {
      const res = await paymentsApi.createPortal()
      window.open(res.data.portal_url, '_blank')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Could not open billing portal')
    }
  }

  const handleConnect = async () => {
    try {
      const res = await paymentsApi.stripeConnectOnboard()
      window.location.href = res.data.onboard_url
    } catch (err: any) {
      const detail = err.response?.data?.detail || ''
      if (detail.includes('signed up for Connect')) {
        toast.error(
          'You need to enable Stripe Connect first. Go to dashboard.stripe.com → Connect and enable it.',
          { duration: 8000 }
        )
      } else {
        toast.error(detail || 'Could not open Stripe onboarding')
      }
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Payments</div>
          <div className="topbar-sub">Deposits and billing management</div>
        </div>
      </div>

      <div className="page-body">
        <div className="two-col" style={{ marginBottom: 24 }}>
          {/* Subscription */}
          <div className="card" style={{ padding: 24 }}>
            <div className="section-label" style={{ marginBottom: 12 }}>Your Subscription</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="plan-chip" style={{ fontSize: 14, padding: '6px 16px' }}>
                {user?.subscription_plan
                  ? user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1) + ' Plan'
                  : 'Free Trial'}
              </span>
              {user?.subscription_active && (
                <span style={{ fontSize: 13, color: 'var(--forest-ll)', fontWeight: 500 }}>✓ Active</span>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 16, lineHeight: 1.5 }}>
              {user?.subscription_active
                ? 'Manage your billing, download invoices, or update your plan.'
                : 'Upgrade to Pro to unlock AI contracts, unlimited litters, and buyer automation.'}
            </p>
            {user?.subscription_active ? (
              <button onClick={handlePortal} className="btn-ghost">Manage billing →</button>
            ) : (
              <Link href="/dashboard/upgrade" className="btn-primary" style={{ textDecoration: 'none' }}>
                Upgrade to Pro →
              </Link>
            )}
          </div>

          {/* Stripe Connect */}
          <div className="card" style={{ padding: 24 }}>
            <div className="section-label" style={{ marginBottom: 12 }}>Deposit Collection</div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.6, marginBottom: 16 }}>
              Connect your bank account via Stripe to collect deposits directly from buyers.
              Funds transfer in 2 business days. LitterDesk takes 1.5% on deposits collected.
            </p>

            {user?.stripe_onboarded ? (
              <div>
                <span className="badge badge-ready" style={{ fontSize: 13, padding: '5px 14px', marginBottom: 12, display: 'inline-flex' }}>
                  ✓ Stripe Connected
                </span>
                <p style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 8 }}>
                  Your bank account is connected. You can now collect deposits from buyers.
                </p>
              </div>
            ) : (
              <div>
                <button onClick={handleConnect} className="btn-primary" style={{ marginBottom: 12 }}>
                  Connect Bank Account →
                </button>
                <div style={{ background: 'var(--amber-f)', border: '1px solid rgba(200,117,26,.2)', borderRadius: 'var(--r-lg)', padding: '10px 14px', marginTop: 8 }}>
                  <p style={{ fontSize: 12, color: 'var(--amber)', lineHeight: 1.5 }}>
                    <strong>Setup required:</strong> Before connecting, enable Stripe Connect at{' '}
                    <a href="https://dashboard.stripe.com/connect" target="_blank" rel="noreferrer"
                      style={{ color: 'var(--amber)', fontWeight: 600 }}>
                      dashboard.stripe.com/connect
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transaction history */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Transaction history</h3>
          <p style={{ fontSize: 13, color: 'var(--ink-4)', marginBottom: 20 }}>
            Deposits and payments collected through LitterDesk appear here.
          </p>
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ink-4)', fontSize: 14 }}>
            No transactions yet. Connect your bank account to start collecting deposits.
          </div>
        </div>
      </div>
    </>
  )
}
