'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch {
      toast.error('Invalid email or password')
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
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Sign in to your kennel account</p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@kennel.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '15px', marginTop: 8 }}
            >
              {isLoading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="divider" />
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-4)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--forest)', fontWeight: 500, textDecoration: 'none' }}>
              Start free trial
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
