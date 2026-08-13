'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({
    full_name: user?.full_name ?? '',
    kennel_name: user?.kennel_name ?? '',
    email: user?.email ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [changingPw, setChangingPw] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    if (pwForm.new_password.length < 8) {
      toast.error('New password must be at least 8 characters')
      return
    }
    setChangingPw(true)
    try {
      await authApi.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      })
      toast.success('Password changed!')
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally { setChangingPw(false) }
  }

  useEffect(() => {
    authApi.me().then(res => {
      setUser(res.data)
      setForm({
        full_name: res.data.full_name ?? '',
        kennel_name: res.data.kennel_name ?? '',
        email: res.data.email ?? '',
      })
    }).catch(() => {})
  }, [])

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
                  <input className="input" value={form.kennel_name} onChange={e=>setForm(f=>({...f,kennel_name:e.target.value}))} placeholder="Oakwood Goldens"/>
                </div>
                <div className="field">
                  <label className="label">Email address</label>
                  <input type="email" className="input" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/>
                  <p style={{fontSize:12,color:'var(--ink-4)',marginTop:4}}>Used for login and contract notifications.</p>
                </div>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </form>
            </div>

            <div className="section-label" style={{marginTop:20}}>Change Password</div>
            <div className="card" style={{padding:24}}>
              <form onSubmit={handleChangePassword}>
                <div className="field">
                  <label className="label">Current password</label>
                  <input type="password" className="input" value={pwForm.current_password}
                    onChange={e=>setPwForm(f=>({...f,current_password:e.target.value}))} required/>
                </div>
                <div className="field">
                  <label className="label">New password</label>
                  <input type="password" className="input" value={pwForm.new_password}
                    onChange={e=>setPwForm(f=>({...f,new_password:e.target.value}))} required minLength={8}/>
                </div>
                <div className="field">
                  <label className="label">Confirm new password</label>
                  <input type="password" className="input" value={pwForm.confirm_password}
                    onChange={e=>setPwForm(f=>({...f,confirm_password:e.target.value}))} required minLength={8}/>
                </div>
                <button type="submit" disabled={changingPw} className="btn-primary">
                  {changingPw ? 'Changing…' : 'Change password'}
                </button>
              </form>
            </div>

            <div className="section-label" style={{marginTop:20}}>Subscription</div>
            <div className="card" style={{padding:20}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                <span className="plan-chip" style={{fontSize:14,padding:'6px 16px'}}>
                  {(() => {
                    if (user?.subscription_active && user?.subscription_plan) {
                      return user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1) + ' Plan'
                    }
                    if (user?.trial_ends_at) {
                      const daysLeft = Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      if (daysLeft > 0) return `Trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
                      return 'Trial expired'
                    }
                    return 'Free Trial'
                  })()}
                </span>
                {user?.subscription_active && <span style={{fontSize:13,color:'var(--forest-ll)',fontWeight:500}}>✓ Active</span>}
              </div>
              {user?.subscription_active ? (
                <p style={{fontSize:13,color:'var(--ink-4)',marginBottom:12}}>Manage billing, download invoices, or cancel your subscription.</p>
              ) : (
                <p style={{fontSize:13,color:'var(--ink-4)',marginBottom:12}}>Upgrade to Pro to unlock AI contracts, litter announcements, and Stripe deposit collection.</p>
              )}
              {!user?.subscription_active && (
                <Link href="/dashboard/upgrade" className="btn-primary" style={{textDecoration:'none',fontSize:13}}>{user?.trial_ends_at ? 'Subscribe →' : 'Upgrade to Pro →'}</Link>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <div className="section-label" style={{display:'flex',alignItems:'center',gap:8}}>
              Email Notifications
              <span style={{fontSize:10.5,fontWeight:600,background:'var(--amber-f)',color:'var(--amber)',border:'1px solid rgba(200,117,26,.25)',padding:'2px 8px',borderRadius:20,letterSpacing:'.2px'}}>Coming soon</span>
            </div>
            <div className="card" style={{padding:'4px 20px',opacity:.6,pointerEvents:'none'}}>
              {[
                { label: 'Go-home reminders', sub: '7 and 3 days before go-home date' },
                { label: 'Follow-up nudges', sub: 'Daily digest of buyers needing contact' },
                { label: 'New inquiry alerts', sub: 'Instant alert on new buyer inquiry' },
                { label: 'Deposit confirmations', sub: 'When a buyer pays their deposit' },
                { label: 'Weekly digest', sub: 'Summary of kennel activity every Monday' },
              ].map((n) => (
                <div key={n.label} className="settings-row">
                  <div>
                    <div style={{fontSize:14,color:'var(--ink-2)',fontWeight:500}}>{n.label}</div>
                    <div style={{fontSize:12,color:'var(--ink-4)',marginTop:2}}>{n.sub}</div>
                  </div>
                  <button className="toggle toggle-off" disabled><div className="toggle-knob"/></button>
                </div>
              ))}
            </div>

            <div className="section-label" style={{marginTop:20}}>Danger Zone</div>
            <div className="card" style={{padding:20}}>
              <h4 style={{fontSize:14,fontWeight:600,color:'var(--ink)',marginBottom:6}}>Delete account</h4>
              <p style={{fontSize:13,color:'var(--ink-4)',marginBottom:14,lineHeight:1.5}}>
                Permanently delete your LitterDesk account and all data. This cannot be undone.
              </p>
              <button
                onClick={() => toast.error('Please contact litterdesk.hello@gmail.com to delete your account.')}
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
