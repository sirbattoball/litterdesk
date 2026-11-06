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
        <aside className="login-story" aria-label="Welcome to LitterDesk">
          <Link href="/" className="login-wordmark">LitterDesk<span>FOR THE LOVE OF THE LITTER</span></Link>
          <div className="login-story-copy"><span className="login-eyebrow">A LITTLE LESS ADMIN</span><h2>More time for<br/><em>the little things.</em></h2><p>From the first plans to the last goodbye. Keep your litters, buyers, and contracts close.</p></div>
          <div className="login-art" aria-hidden="true"><svg viewBox="0 0 480 280" fill="none"><ellipse cx="248" cy="250" rx="170" ry="17" fill="#102f24" opacity=".35"/><path d="M92 247c-7-44-18-67-38-86m39 85c13-39 14-72 2-100m0 58c-27-6-40-20-39-41 24 1 36 15 39 41m2-25c22-15 30-34 23-55-23 10-29 29-23 55" stroke="#91ac85" strokeWidth="5" strokeLinecap="round"/><path d="M380 246c5-33 16-58 31-77m-29 55c-21-13-27-29-19-46 19 7 25 23 19 46m12-28c23-2 36-13 38-31-21-2-34 9-38 31" stroke="#91ac85" strokeWidth="5" strokeLinecap="round"/><ellipse cx="248" cy="216" rx="76" ry="33" fill="#c18b62"/><path d="M177 220c-28-3-48-20-47-42 20 5 30 13 36 28" fill="#c18b62"/><path d="M207 219c-17-35-14-67 3-88h72c23 28 23 57 1 89" fill="#e5bb8c"/><path d="M194 145c-19-40 2-75 49-75 48 0 73 31 59 76-8 26-33 43-58 43-26 0-43-17-50-44" fill="#f3d7ae"/><path d="M207 80c-35-8-60 29-46 65 10 24 28 14 33-5l18-45m67-14c32-7 59 26 47 63-8 27-29 16-32-4l-20-45" fill="#aa724e"/><path d="M240 80c-9 22-9 42-3 57h19c7-17 6-37-2-57" fill="#fff0d4"/><ellipse cx="220" cy="132" rx="5" ry="6" fill="#283a2d"/><ellipse cx="276" cy="132" rx="5" ry="6" fill="#283a2d"/><ellipse cx="248" cy="154" rx="20" ry="14" fill="#fff0d4"/><path d="M240 147c3-4 13-4 16 0 0 7-8 11-8 11s-8-4-8-11" fill="#283a2d"/><path d="M248 157v6m0 0c-5 5-10 3-13 0m13 0c5 5 10 3 13 0" stroke="#283a2d" strokeWidth="2" strokeLinecap="round"/><path d="M208 183c25 11 49 11 74 0l-4 13c-22 10-44 10-65 0" fill="#52775d"/><circle cx="247" cy="201" r="7" fill="#d9b765"/><path d="M209 215l-6 27m75-27 7 27" stroke="#f3d7ae" strokeWidth="20" strokeLinecap="round"/><path d="m358 68 4-9 4 9 9 4-9 4-4 9-4-9-9-4Z" fill="#d9b765"/><circle cx="145" cy="65" r="4" fill="#d9b765"/></svg></div>
          <p className="login-story-footer">Small-scale breeding. Thoughtfully organized.</p>
        </aside>
      <div className="login-form-panel" style={{width:'100%',maxWidth:520}}>
        <div className="auth-logo">
          <div className="auth-logomark">
            <svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          </div>
          <span className="auth-logo-text">LitterDesk</span>
        </div>

        <div className="auth-card login-card">
          <span className="login-eyebrow">YOUR KENNEL, TOGETHER</span><h1 className="auth-title">Welcome back.</h1>
          <p className="auth-sub">Sign in to your kennel account</p>

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

        {/* Trust signal */}
        <p style={{textAlign:'center',fontSize:12,color:'var(--ink-4)',marginTop:20,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Your litters, buyers, and contracts. Together at last.
        </p>
      </div>
      </div>
    </div>
  )
}
