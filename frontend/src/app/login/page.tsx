'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const { login, isLoading } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.status === 401 ? 'Invalid email or password' : err.response?.data?.detail || 'Could not sign in. Please try again.')
    }
  }

  return (
    <div className="auth-wrap login-wrap">
      <div className="login-shell">
        <svg className="login-botanical" viewBox="0 0 200 300" fill="none" aria-hidden="true"><path d="M95 290c30-90 10-157 45-260M111 209c-54-3-78-29-70-67 43 6 66 28 70 67m5-47c47-5 70-31 63-69-39 5-61 29-63 69m9-54c-38-3-56-25-50-55 33 5 49 23 50 55m11-49c29-8 42-27 35-51-24 7-36 24-35 51" stroke="currentColor" strokeWidth="1.5"/></svg>
      <div className="login-form-panel">
        <Link href="/" className="auth-logo" aria-label="LitterDesk home">
          <div className="auth-logomark">
            <svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          </div>
          <span className="auth-logo-text">LitterDesk</span>
        </Link>

        <div className="auth-card login-card">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Pick up where you left off.</p>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="label" htmlFor="login-email">Email address</label>
              <input id="login-email" type="email" className="input" placeholder="you@kennel.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="field" style={{position:'relative'}}>
              <label className="label" htmlFor="login-password">Password</label>
              <input id="login-password" type={showPass?'text':'password'} className="input" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                style={{paddingRight:44}} />
              <button type="button" aria-label={showPass ? "Hide password" : "Show password"} aria-pressed={showPass} onClick={()=>setShowPass(!showPass)}
                style={{position:'absolute',right:12,bottom:11,border:'none',background:'none',cursor:'pointer',color:'var(--ink-4)',padding:2}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showPass
                    ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                    : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                </svg>
              </button>
            </div>

            <p style={{textAlign:'right',marginTop:-8,marginBottom:16}}>
              <Link href="/forgot-password" style={{fontSize:13,color:'var(--ink-4)',textDecoration:'none'}}>Forgot password?</Link>
            </p>

            <button type="submit" disabled={isLoading} className="btn-primary"
              style={{width:'100%',justifyContent:'center',padding:'13px',fontSize:15,marginTop:4}}>
              {isLoading
                ? <span style={{display:'flex',alignItems:'center',gap:8}}><span className="spinner" style={{width:14,height:14,borderColor:'rgba(255,255,255,.4)',borderTopColor:'#fff'}}/>Signing in…</span>
                : 'Sign in →'}
            </button>
          </form>

          <div className="divider"/>
          <p style={{textAlign:'center',fontSize:14,color:'var(--ink-4)'}}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{color:'var(--forest)',fontWeight:600,textDecoration:'none'}}>Start free trial</Link>
          </p>
        </div>

      </div>
      </div>
    </div>
  )
}
