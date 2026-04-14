'use client'
import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState({ full_name: user?.full_name ?? '', kennel_name: user?.kennel_name ?? '', email: user?.email ?? '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await authApi.updateMe({ full_name: form.full_name, kennel_name: form.kennel_name })
      setUser(res.data)
      toast.success('Profile saved!')
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="topbar">
        <div><div className="topbar-title">Settings</div><div className="topbar-sub">Account and preferences</div></div>
      </div>
      <div className="page-body">
        <div className="two-col">
          <div>
            <div className="section-label">Kennel Profile</div>
            <div className="card" style={{ padding:24 }}>
              <form onSubmit={handleSave}>
                <div className="field"><label className="label">Your name</label><input className="input" value={form.full_name} onChange={e => setForm(f => ({...f,full_name:e.target.value}))} /></div>
                <div className="field"><label className="label">Kennel name</label><input className="input" value={form.kennel_name} onChange={e => setForm(f => ({...f,kennel_name:e.target.value}))} placeholder="Sunrise Goldens" /></div>
                <div className="field"><label className="label">Email</label><input className="input" value={form.email} disabled style={{ opacity:.6 }} /></div>
                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save changes'}</button>
              </form>
            </div>
          </div>

          <div>
            <div className="section-label">Notifications</div>
            <div className="card" style={{ padding:'4px 20px' }}>
              {[['Go-home reminders (email)',true],['Follow-up nudges (daily)',true],['New inquiry alerts',true],['Weekly digest',false]].map(([label,on]: any) => (
                <div key={label} className="settings-row">
                  <span style={{ fontSize:14, color:'var(--ink-2)' }}>{label}</span>
                  <div className={`toggle ${on ? '' : 'toggle-off'}`} onClick={e => { const el = e.currentTarget; el.classList.toggle('toggle-off') }}><div className="toggle-knob" /></div>
                </div>
              ))}
            </div>

            <div className="section-label" style={{ marginTop:20 }}>Subscription</div>
            <div className="card" style={{ padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <span className="badge badge-ready" style={{ fontSize:13, padding:'5px 14px' }}>
                  {user?.subscription_plan ? user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1) : 'Free'} Plan
                </span>
                {user?.subscription_active && <span style={{ fontSize:13, color:'var(--ink-4)' }}>Active</span>}
              </div>
              {!user?.subscription_active && (
                <a href="/dashboard/upgrade" className="btn-primary" style={{ textDecoration:'none' }}>Upgrade to Pro →</a>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
