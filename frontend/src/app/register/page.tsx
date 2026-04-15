'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

const PERKS = [
  { icon: '📋', text: 'Replace your spreadsheets & Word contracts' },
  { icon: '🤖', text: 'AI generates sale contracts in seconds' },
  { icon: '💳', text: 'Collect deposits via Stripe — 1.5% platform fee' },
  { icon: '📬', text: 'Automated go-home reminders & follow-ups' },
  { icon: '⭐', text: '14-day free trial · No credit card required' },
]

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name:'', email:'', password:'', kennel_name:'' })
  const { register, isLoading } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(form)
      toast.success('Welcome to LitterDesk! 🐾')
      router.push('/dashboard/onboarding')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Something went wrong')
    }
  }

  return (
    <>
      <style>{`
        .reg-shell {
          min-height: 100vh;
          background: radial-gradient(ellipse at 15% 60%, rgba(196,217,200,.2) 0%, transparent 55%),
                      radial-gradient(ellipse at 85% 20%, rgba(200,117,26,.07) 0%, transparent 50%),
                      var(--paper);
          display: flex;
          align-items: stretch;
        }
        .reg-left {
          flex: 0 0 420px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px;
          border-right: 1px solid rgba(230,223,212,.6);
          background: rgba(255,255,255,.5);
          backdrop-filter: blur(20px);
        }
        .reg-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 40px;
        }
        @media (max-width: 768px) {
          .reg-shell { align-items: flex-start; }
          .reg-left { display: none; }
          .reg-right {
            flex: 1;
            padding: 24px 20px 40px;
            align-items: flex-start;
          }
        }
      `}</style>

      <div className="reg-shell">
        {/* Left panel — hidden on mobile */}
        <div className="reg-left">
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:40}}>
            <div className="auth-logomark">
              <svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            </div>
            <span style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--ink)'}}>LitterDesk</span>
          </div>
          <h2 style={{fontFamily:'var(--serif)',fontSize:32,color:'var(--ink)',lineHeight:1.1,marginBottom:12,letterSpacing:'-.3px'}}>
            Run your kennel<br/><span style={{color:'var(--forest-l)'}}>like a real business.</span>
          </h2>
          <p style={{fontSize:15,color:'var(--ink-3)',marginBottom:32,lineHeight:1.65}}>
            400+ breeders already replaced their spreadsheets with LitterDesk.
          </p>
          <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:14}}>
            {PERKS.map(p => (
              <li key={p.text} style={{display:'flex',alignItems:'flex-start',gap:12,fontSize:14,color:'var(--ink-2)',lineHeight:1.4}}>
                <span style={{fontSize:17,flexShrink:0,marginTop:1}}>{p.icon}</span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Right panel — full width on mobile */}
        <div className="reg-right">
          <div style={{width:'100%',maxWidth:440}}>

            {/* Mobile-only logo */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:28}} className="mobile-logo-header">
              <style>{`.mobile-logo-header { display: none; } @media (max-width: 768px) { .mobile-logo-header { display: flex; } }`}</style>
              <div className="auth-logomark" style={{width:34,height:34,borderRadius:10}}>
                <svg viewBox="0 0 24 24" style={{width:17,height:17}}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              </div>
              <span style={{fontFamily:'var(--serif)',fontSize:20,color:'var(--ink)'}}>LitterDesk</span>
            </div>

            <div className="auth-card">
              <h1 className="auth-title">Start free trial</h1>
              <p className="auth-sub">14 days free · No credit card needed</p>

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="label">Your name</label>
                  <input className="input" placeholder="Jane Smith" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} required />
                </div>
                <div className="field">
                  <label className="label">Kennel name <span style={{color:'var(--ink-4)',fontWeight:400}}>(optional)</span></label>
                  <input className="input" placeholder="Sunrise Goldens" value={form.kennel_name} onChange={e=>setForm(f=>({...f,kennel_name:e.target.value}))} />
                </div>
                <div className="field">
                  <label className="label">Email address</label>
                  <input type="email" className="input" placeholder="you@kennel.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required />
                </div>
                <div className="field">
                  <label className="label">Password</label>
                  <input type="password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} minLength={8} required />
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary" style={{width:'100%',justifyContent:'center',padding:'13px',fontSize:15,marginTop:4}}>
                  {isLoading
                    ? <span style={{display:'flex',alignItems:'center',gap:8}}><span className="spinner" style={{width:14,height:14,borderColor:'rgba(255,255,255,.4)',borderTopColor:'#fff'}}/>Creating account…</span>
                    : 'Start free trial →'}
                </button>
              </form>

              <div className="divider"/>
              <p style={{textAlign:'center',fontSize:14,color:'var(--ink-4)'}}>
                Already have an account?{' '}
                <Link href="/login" style={{color:'var(--forest)',fontWeight:600,textDecoration:'none'}}>Sign in</Link>
              </p>
            </div>

            <p style={{textAlign:'center',fontSize:12,color:'var(--ink-4)',marginTop:16,display:'flex',alignItems:'center',justifyContent:'center',gap:5}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              256-bit SSL · No spam · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
