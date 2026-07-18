'use client'
import { useState } from 'react'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await authApi.forgotPassword({ email })
      setSent(true)
    } catch {
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="auth-logo">
          <div className="auth-logomark">
            <svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          </div>
          <span className="auth-logo-text">LitterDesk</span>
        </div>

        <div className="auth-card">
          {sent ? (
            <>
              <h1 className="auth-title">Check your email</h1>
              <p className="auth-sub">
                If an account exists for that email, we&apos;ve sent a link to reset your password. The link expires in 1 hour.
              </p>
              <div className="divider" />
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-4)' }}>
                <Link href="/login" style={{ color: 'var(--forest)', fontWeight: 600, textDecoration: 'none' }}>Back to sign in</Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="auth-title">Reset your password</h1>
              <p className="auth-sub">Enter your email and we&apos;ll send you a reset link</p>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">Email address</label>
                  <input type="email" className="input" placeholder="you@kennel.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>

                <button type="submit" disabled={loading} className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 4 }}>
                  {loading
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} />Sending…</span>
                    : 'Send reset link →'}
                </button>
              </form>

              <div className="divider" />
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-4)' }}>
                Remembered your password?{' '}
                <Link href="/login" style={{ color: 'var(--forest)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
