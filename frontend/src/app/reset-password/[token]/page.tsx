'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword({ token, new_password: newPassword })
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Reset link is invalid or expired')
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
          {done ? (
            <>
              <h1 className="auth-title">Password reset!</h1>
              <p className="auth-sub">Redirecting you to sign in…</p>
            </>
          ) : (
            <>
              <h1 className="auth-title">Set a new password</h1>
              <p className="auth-sub">Choose a new password for your account</p>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">New password</label>
                  <input type="password" className="input" placeholder="••••••••"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                </div>
                <div className="field">
                  <label className="label">Confirm new password</label>
                  <input type="password" className="input" placeholder="••••••••"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                </div>

                <button type="submit" disabled={loading} className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 4 }}>
                  {loading
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="spinner" style={{ width: 14, height: 14, borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} />Resetting…</span>
                    : 'Reset password →'}
                </button>
              </form>

              <div className="divider" />
              <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-4)' }}>
                <Link href="/login" style={{ color: 'var(--forest)', fontWeight: 600, textDecoration: 'none' }}>Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
