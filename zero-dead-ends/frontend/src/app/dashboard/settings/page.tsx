'use client'
import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    kennel_name: user?.kennel_name ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await authApi.updateMe(form)
      setUser(res.data)
      toast.success('Profile saved!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="topbar">
        <div><div className="topbar-title">Settings</div><div className="topbar-sub">Account and preferences</div></div>
      </div>
      <div className="page-body">
        <div className="two-col">
          {/* Profile */}
          <div>
            <div className="section-label">Kennel Profile</div>
            <div className="card" style={{padding:24}}>
              <form onSubmit={handleSave}>
                <div className="field">
                  <label className="label">Your name</label>
                  <input className="input" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} required/>
                </div>
                <div className="field">
                  <label className="label">Kennel name</label>
                  <input className="input" value={form.kennel_name} onChange={e=>setForm(f=>({...f,kennel_name:e.target.value}))} placeholder="Sunrise Goldens"/>
                </div>
                <div className="field">
                  <label className="label">Email address</label>
                  <input className="input" value={user?.email ?? ''} disabled style={{opacity:.6,cursor:'not-allowed'}}/>
                  <p style={{fontSize:12,color:'var(--ink-4)',marginTop:4}}>Email cannot be changed. Contact support if needed.</p>
                </div>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </form>
            </div>

            <div className="section-label" style={{marginTop:20}}>Subscription</div>
            <div className="card" style={{padding:20}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <span className="plan-chip" style={{fontSize:14,padding:'6px 16px'}}>
                  {user?.subscription_plan
                    ? user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1) + ' Plan'
                    : 'Free Trial'}
                </span>
                {user?.subscription_active && <span style={{fontSize:13,color:'var(--forest-ll)',fontWeight:500}}>✓ Active</span>}
              </div>
              {user?.subscription_active ? (
                <p style={{fontSize:13,color:'var(--ink-4)',marginBottom:12}}>Manage your billing, download invoices, or cancel your subscription.</p>
              ) : (
                <p style={{fontSize:13,color:'var(--ink-4)',marginBottom:12}}>Upgrade to unlock AI contracts, unlimited litters, and buyer automation.</p>
              )}
              {!user?.subscription_active && (
                <Link href="/dashboard/upgrade" className="btn-primary" style={{textDecoration:'none',fontSize:13}}>Upgrade to Pro →</Link>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <div className="section-label">Email Notifications</div>
            <div className="card" style={{padding:'4px 20px'}}>
              {[
                { label: 'Go-home reminders', sub: '7 and 3 days before go-home date', key: 'go_home' },
                { label: 'Follow-up nudges', sub: 'Daily digest of buyers needing contact', key: 'followup' },
                { label: 'New inquiry alerts', sub: 'Instant alert on new buyer inquiry', key: 'inquiry' },
                { label: 'Deposit confirmations', sub: 'When a buyer pays their deposit', key: 'deposit' },
                { label: 'Weekly digest', sub: 'Summary of kennel activity every Monday', key: 'weekly' },
              ].map((n) => (
                <div key={n.key} className="settings-row">
                  <div>
                    <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500}}>{n.label}</div>
                    <div style={{fontSize:12,color:'var(--ink-4)',marginTop:2}}>{n.sub}</div>
                  </div>
                  <button
                    className="toggle"
                    onClick={e => {
                      const el = e.currentTarget
                      el.classList.toggle('toggle-off')
                      toast(`${n.label} ${el.classList.contains('toggle-off') ? 'disabled' : 'enabled'}`, {icon: el.classList.contains('toggle-off') ? '🔕' : '🔔'})
                    }}>
                    <div className="toggle-knob"/>
                  </button>
                </div>
              ))}
            </div>

            <div className="section-label" style={{marginTop:20}}>Danger Zone</div>
            <div className="card" style={{padding:20}}>
              <h4 style={{fontSize:14,fontWeight:600,color:'var(--ink)',marginBottom:6}}>Delete account</h4>
              <p style={{fontSize:13,color:'var(--ink-4)',marginBottom:14,lineHeight:1.5}}>
                Permanently delete your LitterDesk account and all data. This cannot be undone. Export your data first.
              </p>
              <button
                onClick={() => toast.error('Please contact support@litterdesk.com to delete your account.')}
                style={{fontSize:13,color:'var(--red)',background:'none',border:'1px solid rgba(196,64,64,.3)',borderRadius:'var(--r-lg)',padding:'8px 16px',cursor:'pointer',fontFamily:'var(--sans)'}}>
                Request account deletion
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
