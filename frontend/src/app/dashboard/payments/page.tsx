'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/store'
import { paymentsApi, authApi } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function PaymentsPage() {
  const { user, setUser } = useAuthStore()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const { data: deposits, isLoading, isError } = useQuery({ queryKey: ['deposits'], queryFn: () => paymentsApi.deposits().then(r => r.data), refetchInterval: 15000 })
  useQuery({ queryKey: ['payment-account'], queryFn: async () => { const res = await authApi.me(); setUser(res.data); return res.data } })
  const error = (err: any) => toast.error(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Please try again')
  const openBilling = async () => {
    setBusy(true)
    try { const res = await paymentsApi.createPortal(); window.location.href = res.data.portal_url } catch (err) { error(err) } finally { setBusy(false) }
  }
  return <>
    <div className="topbar"><div><div className="topbar-title">Payments</div><div className="topbar-sub">Buyer deposits and subscription billing</div></div></div>
    <div className="page-body">
      <div className="two-col" style={{ marginBottom: 20 }}>
        <div className="card" style={{ padding: 24 }}><h3>Your subscription</h3><p style={{ margin: '12px 0' }}>{user?.subscription_active ? `${user.subscription_plan} · Active` : 'No active subscription'}</p><button className="btn-ghost" onClick={openBilling} disabled={!!busy}>Manage billing</button></div>
        <div className="card" style={{ padding: 24 }}>
          <h3>Track buyer deposits</h3>
          <p style={{ margin: '12px 0' }}>After you receive a payment, open the litter and mark the deposit as received on its waitlist.</p>
          <Link href="/dashboard/litters" className="btn-ghost">Open litters</Link>
        </div>
      </div>
      <div className="card" style={{ padding: 24 }}><h3 style={{ marginBottom: 16 }}>Past Stripe deposits</h3>{isLoading ? <p>Loading deposits…</p> : isError ? <p>Could not load deposits. <button onClick={() => qc.invalidateQueries({ queryKey: ['deposits'] })}>Try again</button></p> : !deposits?.length ? <p>No past Stripe deposits.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}><thead><tr>{['Buyer', 'Litter', 'Amount', 'Status', 'Created'].map(h => <th key={h} style={{ padding: 10 }}>{h}</th>)}</tr></thead><tbody>{deposits.map((d: any) => <tr key={d.id}><td style={{ padding: 10 }}>{d.buyer_name}</td><td style={{ padding: 10 }}>{d.litter_name}</td><td style={{ padding: 10 }}>${(d.amount_cents / 100).toFixed(2)}</td><td style={{ padding: 10 }}>{d.status === 'pending' ? 'Awaiting payment' : d.status}</td><td style={{ padding: 10 }}>{new Date(d.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>}</div>
    </div>
  </>
}
