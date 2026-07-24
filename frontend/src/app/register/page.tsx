'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

const PERKS = [
  { icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--forest-l)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`, text: 'Manage litters from planned breeding to go-home day' },
  { icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--forest-l)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, text: 'Buyer CRM — one pipeline for every inquiry' },
  { icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--forest-l)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`, text: 'AI contracts in 90 seconds — buyers sign online' },
  { icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--forest-l)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`, text: 'Collect deposits via Stripe — funds in 2 days' },
  { icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--forest-l)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`, text: '7-day free trial · Cancel anytime' },
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
        .reg-shell { min-height:100vh; background:radial-gradient(ellipse at 15% 60%,rgba(196,217,200,.2) 0%,transparent 55%),radial-gradient(ellipse at 85% 20%,rgba(200,117,26,.07) 0%,transparent 50%),var(--paper); display:flex; align-items:stretch; }
        .reg-left { flex:0 0 420px; display:flex; flex-direction:column; justify-content:center; padding:48px; border-right:1px solid rgba(230,223,212,.6); background:rgba(255,255,255,.5); backdrop-filter:blur(20px); }
        .reg-right { flex:1; display:flex; align-items:center; justify-content:center; padding:32px 40px; }
        .mobile-logo { display:none; }
        @media(max-width:768px) { .reg-left{display:none} .reg-right{padding:24px 20px 40px;align-items:flex-start} .mobile-logo{display:flex} }
      `}</style>
      <div className="reg-shell">
        <div className="reg-left">
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:40}}>
            <div className="auth-logomark"><svg viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></div>
            <span style={{fontFamily:'var(--serif)',fontSize:22,color:'var(--ink)'}}>LitterDesk</span>
          </div>
          <h2 style={{fontFamily:'var(--serif)',fontSize:32,color:'var(--ink)',lineHeight:1.1,marginBottom:12,letterSpacing:'-.3px'}}>Run your kennel<br/><span style={{color:'var(--forest-l)'}}>like a real business.</span></h2>
          <p style={{fontSize:15,color:'var(--ink-3)',marginBottom:32,lineHeight:1.65}}>Built for professional breeders. Replace your spreadsheets, Word contracts, and text-thread waitlists.</p>
          <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:14}}>
            {PERKS.map(p=>(
              <li key={p.text} style={{display:'flex',alignItems:'center',gap:12,fontSize:14,color:'var(--ink-2)',lineHeight:1.4}}>
                <span style={{flexShrink:0,width:28,height:28,borderRadius:8,background:'var(--sage-l)',display:'flex',alignItems:'center',justifyContent:'center'}} dangerouslySetInnerHTML={{__html:p.icon}}/>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="reg-right">
          <div style={{width:'100%',maxWidth:440}}>
            <div className="mobile-logo" style={{alignItems:'center',gap:10,marginBottom:28}}>
              <div className="auth-logomark" style={{width:34,height:34,borderRadius:10}}><svg viewBox="0 0 24 24" style={{width:17,height:17}}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></div>
              <span style={{fontFamily:'var(--serif)',fontSize:20,color:'var(--ink)'}}>LitterDesk</span>
            </div>
            <div className="auth-card">
              <h1 className="auth-title">Start free trial</h1>
              <p className="auth-sub">7 days free · Cancel anytime</p>
              <form onSubmit={handleSubmit}>
                <div className="field"><label className="label">Your name</label><input className="input" placeholder="Jane Smith" value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} required/></div>
                <div className="field"><label className="label">Kennel name <span style={{color:'var(--ink-4)',fontWeight:400}}>(optional)</span></label><input className="input" placeholder="Oakwood Goldens" value={form.kennel_name} onChange={e=>setForm(f=>({...f,kennel_name:e.target.value}))}/></div>
                <div className="field"><label className="label">Email address</label><input type="email" className="input" placeholder="you@kennel.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/></div>
                <div className="field"><label className="label">Password</label><input type="password" className="input" placeholder="Min. 8 characters" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} minLength={8} required/></div>
                <button type="submit" disabled={isLoading} className="btn-primary" style={{width:'100%',justifyContent:'center',padding:'13px',fontSize:15,marginTop:4}}>
                  {isLoading?<span style={{display:'flex',alignItems:'center',gap:8}}><span className="spinner" style={{width:14,height:14,borderColor:'rgba(255,255,255,.4)',borderTopColor:'#fff'}}/>Creating account…</span>:'Start free trial →'}
                </button>
              </form>
              <div className="divider"/>
              <p style={{textAlign:'center',fontSize:14,color:'var(--ink-4)'}}>Already have an account?{' '}<Link href="/login" style={{color:'var(--forest)',fontWeight:600,textDecoration:'none'}}>Sign in</Link></p>
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
