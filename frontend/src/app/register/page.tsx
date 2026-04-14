'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

const PERKS = [
  'Unlimited buyer tracking & CRM',
  'Litter & puppy management',
  'AI-generated sale contracts',
  'Automated follow-up emails',
  'Stripe deposit collection',
  '14-day free trial, no card needed',
]

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', kennel_name: '' })
  const { register, isLoading } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(form)
      toast.success('Welcome to LitterDesk! 🐾')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Something went wrong')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 960, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>

        {/* Left */}
        <div style={{ display: 'none' }} className="register-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div className="auth-logomark"><svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></div>
            <span className="auth-logo-text">LitterDesk</span>
          </div>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, color: 'var(--ink)', lineHeight: 1.1, marginBottom: 16, letterSpacing: '-.3px' }}>
            Run your kennel<br/>like a real business
          </h1>
          <p style={{ fontSize: 16, color: 'var(--ink-3)', marginBottom: 32, lineHeight: 1.6 }}>
            LitterDesk gives serious breeders the tools to manage litters, qualify buyers, generate contracts, and collect deposits — all in one place.
          </p>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PERKS.map(p => (
              <li key={p} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: 'var(--ink-2)' }}>
                <span style={{ width: 20, height: 20, background: 'var(--sage-l)', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="#2d6b4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — Form (full width on mobile, half on desktop) */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <div className="auth-logo" style={{ justifyContent: 'flex-start', marginBottom: 24 }}>
              <div className="auth-logomark"><svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></div>
              <span className="auth-logo-text">LitterDesk</span>
            </div>

            <div className="auth-card">
              <h1 className="auth-title" style={{ marginBottom: 4 }}>Start your free trial</h1>
              <p className="auth-sub">14 days free. No credit card required.</p>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">Your name</label>
                  <input className="input" placeholder="Jane Smith" value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} required />
                </div>
                <div className="field">
                  <label className="label">Kennel name <span style={{color:'var(--ink-4)',fontWeight:400}}>(optional)</span></label>
                  <input className="input" placeholder="Sunrise Goldens" value={form.kennel_name} onChange={e => setForm(f => ({...f, kennel_name: e.target.value}))} />
                </div>
                <div className="field">
                  <label className="label">Email address</label>
                  <input type="email" className="input" placeholder="you@kennel.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} required />
                </div>
                <div className="field">
                  <label className="label">Password</label>
                  <input type="password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} minLength={8} required />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '15px', marginTop: 8 }}
                >
                  {isLoading ? 'Creating account…' : 'Start free trial →'}
                </button>
              </form>

              <div className="divider" />
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-4)' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: 'var(--forest)', fontWeight: 500, textDecoration: 'none' }}>Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
