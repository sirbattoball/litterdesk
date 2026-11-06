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
      toast.success('Password changed. Please sign in again.')
      useAuthStore.getState().logout()
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
  }, [setUser])

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
                  <label className="label" htmlFor="field-your-name-1">Your name</label>
                  <input id="field-your-name-1" className="input" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} required/>
                </div>
                <div className="field">
                  <label className="label" htmlFor="field-kennel-name-2">Kennel name</label>
                  <input id="field-kennel-name-2" className="input" value={form.kennel_name} onChange={e=>setForm(f=>({...f,kennel_name:e.target.value}))} placeholder="Oakwood Goldens"/>
                </div>
                <div className="field">
                  <label className="label" htmlFor="field-email-address-3">Email address</label>
                  <input id="field-email-address-3" type="email" className="input" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/>
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
                  <label className="label" htmlFor="field-current-password-4">Current password</label>
                  <input id="field-current-password-4" type="password" className="input" value={pwForm.current_password}
                    onChange={e=>setPwForm(f=>({...f,current_password:e.target.value}))} required/>
                </div>
                <div className="field">
                  <label className="label" htmlFor="field-new-password-5">New password</label>
                  <input id="field-new-password-5" type="password" className="input" value={pwForm.new_password}
                    onChange={e=>setPwForm(f=>({...f,new_password:e.target.value}))} required minLength={8}/>
                </div>
                <div className="field">
                  <label className="label" htmlFor="field-confirm-new-password-6">Confirm new password</label>
                  <input id="field-confirm-new-password-6" type="password" className="input" value={pwForm.confirm_password}
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
                    if (user?.has_subscription && user?.subscription_active && user?.subscription_plan) {
                      return user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1) + ' Plan'
                    }
                    if (user?.trial_ends_at) {
                      const daysLeft = Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      if (daysLeft > 0) return `Trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
                      return 'Trial expired'
                    }
                    return 'No active plan'
                  })()}
                </span>
                {user?.subscription_active && <span style={{fontSize:13,color:'var(--forest-ll)',fontWeight:500}}>✓ Active</span>}
              </div>
              <Link href="/dashboard/payments" className="btn-ghost" style={{marginBottom:12}}>Manage billing →</Link>
              {user?.has_subscription ? (
                <p style={{fontSize:13,color:'var(--ink-4)',marginBottom:12}}>Manage billing, download invoices, or cancel your subscription.</p>
              ) : (
                <p style={{fontSize:13,color:'var(--ink-4)',marginBottom:12}}>Your trial will end without a charge. Choose Starter or Pro when you are ready to subscribe.</p>
              )}
              {!user?.has_subscription && (
                <Link href="/dashboard/upgrade" className="btn-primary" style={{textDecoration:'none',fontSize:13}}>{user?.trial_ends_at ? 'Subscribe →' : 'Upgrade to Pro →'}</Link>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <div className="section-label">Email & communication</div>
            <div className="card" style={{padding:20}}><h4 style={{marginBottom:8}}>Keep the conversation personal</h4><p style={{fontSize:13,lineHeight:1.7}}>Send a contract invitation from its contract page. Pro can also draft buyer emails for you to review and copy into your email app. Log calls and conversations on each buyer’s page.</p><p style={{fontSize:13,lineHeight:1.7,marginTop:12}}>Password recovery uses the email address in your profile. Keep that address up to date.</p></div>

            <div className="section-label" style={{marginTop:20}}>Danger Zone</div>
            <div className="card" style={{padding:20}}>
              <h4 style={{fontSize:14,fontWeight:600,color:'var(--ink)',marginBottom:6}}>Delete account</h4>
              <p style={{fontSize:13,color:'var(--ink-4)',marginBottom:14,lineHeight:1.5}}>
                Permanently delete your LitterDesk account and all data. This cannot be undone.
              </p>
              <button
                onClick={() => { window.location.href = 'mailto:litterdesk.hello@gmail.com?subject=LitterDesk%20account%20deletion%20request' }}
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
