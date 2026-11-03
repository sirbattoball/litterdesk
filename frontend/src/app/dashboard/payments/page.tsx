'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore, isPro } from '@/lib/store'
import { paymentsApi, authApi, buyersApi, littersApi } from '@/lib/api'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function PaymentsPage() {
  const { user, setUser } = useAuthStore()
  const qc = useQueryClient()
  const [busy, setBusy] = useState('')
  const [buyerId, setBuyerId] = useState('')
  const [litterId, setLitterId] = useState('')
  const [amount, setAmount] = useState('')
  const [checkoutUrl, setCheckoutUrl] = useState('')
  const { data: buyers } = useQuery({ queryKey: ['buyers'], queryFn: () => buyersApi.list().then(r => r.data) })
  const { data: litters } = useQuery({ queryKey: ['litters'], queryFn: () => littersApi.list().then(r => r.data) })
  const { data: deposits, isLoading, isError } = useQuery({ queryKey: ['deposits'], queryFn: () => paymentsApi.deposits().then(r => r.data), refetchInterval: 15000 })
  useQuery({ queryKey: ['payment-account'], queryFn: async () => { const res = await authApi.me(); setUser(res.data); return res.data } })
  const error = (err: any) => toast.error(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Please try again')
  const openBilling = async () => {
    setBusy('billing')
    try { const res = await paymentsApi.createPortal(); window.location.href = res.data.portal_url } catch (err) { error(err) } finally { setBusy('') }
  }
  const connect = async () => {
    setBusy('connect')
    try { const res = await paymentsApi.stripeConnectOnboard(); window.location.href = res.data.onboard_url } catch (err) { error(err) } finally { setBusy('') }
  }
  const createLink = async (event: React.FormEvent) => {
    event.preventDefault()
    setCheckoutUrl('')
    const cents = Math.round(Number(amount) * 100)
    if (!buyerId || !litterId || !Number.isFinite(cents) || cents < 50) { toast.error('Select a buyer, litter, and deposit of at least $0.50'); return }
    setBusy('deposit')
    try {
      const res = await paymentsApi.collectDeposit({ buyer_id: buyerId, litter_id: litterId, amount_cents: cents })
      setCheckoutUrl(res.data.checkout_url)
      qc.invalidateQueries({ queryKey: ['deposits'] })
      toast.success('Payment link ready to share with your buyer')
    } catch (err) { error(err) } finally { setBusy('') }
  }
  return <>
    <div className="topbar"><div><div className="topbar-title">Payments</div><div className="topbar-sub">Buyer deposits and subscription billing</div></div></div>
    <div className="page-body">
      <div className="two-col" style={{ marginBottom: 20 }}>
        <div className="card" style={{ padding: 24 }}><h3>Your subscription</h3><p style={{ margin: '12px 0' }}>{user?.subscription_plan} · {user?.subscription_active ? 'Active' : 'Inactive'}</p><button className="btn-ghost" onClick={openBilling} disabled={!!busy}>Manage billing</button></div>
        <div className="card" style={{ padding: 24 }}><h3>Bank account</h3><p style={{ margin: '12px 0' }}>{user?.stripe_onboarded ? 'Connected for deposits' : 'Connect your bank account to receive buyer deposits.'}</p>{isPro(user) ? <button className="btn-ghost" onClick={connect} disabled={!!busy}>{user?.stripe_onboarded ? 'Update bank details' : 'Connect bank account'}</button> : <Link href="/dashboard/upgrade">Upgrade to Pro for deposits</Link>}</div>
      </div>
      {isPro(user) && user?.stripe_onboarded && <div className="card" style={{ padding: 24, marginBottom: 20 }}><h3 style={{ marginBottom: 12 }}>Create a buyer payment link</h3><p style={{ marginBottom: 16 }}>Add the buyer to the litter waitlist first. Share the link so they can pay securely on Stripe. Links expire after 24 hours.</p><form onSubmit={createLink}>
        <div className="two-col"><div className="field"><label className="label" htmlFor="deposit-buyer">Buyer</label><select id="deposit-buyer" className="input" value={buyerId} onChange={e => { setBuyerId(e.target.value); setCheckoutUrl('') }} required><option value="">Select buyer…</option>{buyers?.map((b: any) => <option key={b.id} value={b.id}>{b.full_name}</option>)}</select></div><div className="field"><label className="label" htmlFor="deposit-litter">Litter</label><select id="deposit-litter" className="input" value={litterId} onChange={e => { setLitterId(e.target.value); setCheckoutUrl('') }} required><option value="">Select litter…</option>{litters?.map((l: any) => <option key={l.id} value={l.id}>{l.name || l.breed}</option>)}</select></div></div>
        <div className="field"><label className="label" htmlFor="deposit-amount">Deposit ($)</label><input id="deposit-amount" className="input" type="number" min="0.50" step="0.01" value={amount} onChange={e => { setAmount(e.target.value); setCheckoutUrl('') }} required /></div><button className="btn-primary" type="submit" disabled={!!busy}>{busy === 'deposit' ? 'Creating…' : 'Create payment link'}</button>
      </form>{checkoutUrl && <div style={{ marginTop: 16 }}><label className="label" htmlFor="payment-link">Share this link with the buyer</label><input id="payment-link" className="input" value={checkoutUrl} readOnly onFocus={e => e.target.select()} /><button className="btn-ghost" style={{ marginTop: 8 }} onClick={async () => { try { await navigator.clipboard.writeText(checkoutUrl); toast.success('Link copied') } catch { toast.error('Select and copy the link above') } }}>Copy link</button></div>}</div>}
      <div className="card" style={{ padding: 24 }}><h3 style={{ marginBottom: 16 }}>Deposit history</h3>{isLoading ? <p>Loading deposits…</p> : isError ? <p>Could not load deposits. <button onClick={() => qc.invalidateQueries({ queryKey: ['deposits'] })}>Try again</button></p> : !deposits?.length ? <p>No deposit links yet.</p> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}><thead><tr>{['Buyer', 'Litter', 'Amount', 'Status', 'Created'].map(h => <th key={h} style={{ padding: 10 }}>{h}</th>)}</tr></thead><tbody>{deposits.map((d: any) => <tr key={d.id}><td style={{ padding: 10 }}>{d.buyer_name}</td><td style={{ padding: 10 }}>{d.litter_name}</td><td style={{ padding: 10 }}>${(d.amount_cents / 100).toFixed(2)}</td><td style={{ padding: 10 }}>{d.status === 'pending' ? 'Awaiting payment' : d.status}</td><td style={{ padding: 10 }}>{new Date(d.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>}</div>
    </div>
  </>
}
