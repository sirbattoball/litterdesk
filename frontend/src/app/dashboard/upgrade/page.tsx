'use client'
import { paymentsApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  { key:'starter', name:'Starter', price:39, desc:'Everything you need to get organized',
    features:['Unlimited litters','Unlimited buyer CRM','Dog & health records','Waitlist management','Go-home date tracking','Contract drafting & e-sign'], cta:'Get started' },
  { key:'pro', name:'Pro', price:89, desc:'Starter, plus AI contracts & automation', popular:true,
    features:['Everything in Starter','Instant AI contract drafting','AI litter announcements','AI buyer email drafting','Stripe deposit collection','Priority support'], cta:'Start Pro trial' },
]

export default function UpgradePage() {
  const { user, refreshUser } = useAuthStore()
  const [loading, setLoading] = useState<string|null>(null)
  const hasUsedTrial = !!user?.trial_ends_at
  const handleUpgrade = async (plan: string) => {
    setLoading(plan)
    try {
      const res = await paymentsApi.createSubscription(plan)
      if (res.data.switched) {
        await refreshUser()
        toast.success(`Switched to ${plan === 'pro' ? 'Pro' : 'Starter'} — you'll see prorated billing on your next invoice.`)
      } else {
        window.location.href = res.data.checkout_url
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || ''
      if (detail.includes('Price ID not configured')) {
        toast.error('Payments not configured yet. Contact support.')
      } else if (detail) {
        toast.error(detail)
      } else {
        toast.error('Could not open checkout. Try again.')
      }
    } finally { setLoading(null) }
  }

  return (
    <div className="page-enter">
      <div className="topbar">
        <div><div className="topbar-title">{user?.subscription_active ? 'Change Plan' : 'Upgrade Plan'}</div><div className="topbar-sub">{user?.subscription_active ? 'Switch between Starter and Pro anytime' : hasUsedTrial ? 'Pick a plan to continue' : 'Every plan includes a 7-day free trial'}</div></div>
        <div className="topbar-right"><Link href="/dashboard" className="btn-ghost">← Back</Link></div>
      </div>
      <div className="page-body">
        <div style={{textAlign:'center',marginBottom:40,maxWidth:520,margin:'0 auto 40px'}}>
          <h2 style={{fontFamily:'var(--serif)',fontSize:34,color:'var(--ink)',marginBottom:10,letterSpacing:'-.3px'}}>Simple, honest pricing</h2>
          <p style={{fontSize:16,color:'var(--ink-4)',lineHeight:1.6}}>Built for professional breeders who want to run a tighter operation.</p>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:28,marginBottom:36,flexWrap:'wrap'}}>
          {(hasUsedTrial ? ['🔒 SSL secured','💳 Cancel anytime'] : ['🔒 SSL secured','💳 Cancel anytime','7-day free trial']).map(t=>(
            <span key={t} style={{fontSize:13,color:'var(--ink-4)',fontWeight:500}}>{t}</span>
          ))}
        </div>
        <div className="two-col animate-fade-in-up" style={{maxWidth:820,margin:'0 auto 48px',gap:20}}>
          {PLANS.map((p,i)=>{
            const isCurrent = user?.subscription_active && user?.subscription_plan === p.key
            return (
            <div key={p.key} className="animate-fade-in-up" style={{animationDelay:`${i*80}ms`,position:'relative'}}>
              {p.popular&&<div style={{position:'absolute',top:-13,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,var(--amber),#e8891e)',color:'#fff',fontSize:11.5,fontWeight:700,padding:'4px 16px',borderRadius:20,whiteSpace:'nowrap',zIndex:1}}>✦ Most Popular</div>}
              <div style={{borderRadius:'var(--r-2xl)',padding:28,height:'100%',...(p.popular?{background:'linear-gradient(160deg,var(--forest-l) 0%,var(--forest) 100%)',border:'2px solid rgba(255,255,255,.1)',boxShadow:'0 8px 32px rgba(26,71,48,.35)'}:{background:'var(--white)',border:'1px solid rgba(230,223,212,.7)',boxShadow:'var(--sh-sm)'})}}>
                <div style={{fontSize:12,fontWeight:700,color:p.popular?'rgba(250,248,243,.6)':'var(--ink-4)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>{p.name}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:3,marginBottom:6}}>
                  <span style={{fontFamily:'var(--serif)',fontSize:46,color:p.popular?'var(--cream)':'var(--ink)',letterSpacing:'-2px',lineHeight:1}}>${p.price}</span>
                  <span style={{fontSize:14,color:p.popular?'rgba(250,248,243,.5)':'var(--ink-4)'}}>/mo</span>
                </div>
                <p style={{fontSize:13,color:p.popular?'rgba(250,248,243,.6)':'var(--ink-4)',marginBottom:20,lineHeight:1.5}}>{p.desc}</p>
                <button onClick={()=>handleUpgrade(p.key)} disabled={loading===p.key || isCurrent} style={{width:'100%',padding:'12px',borderRadius:'var(--r-xl)',border:'none',cursor:isCurrent?'default':'pointer',opacity:isCurrent?0.6:1,fontFamily:'var(--sans)',fontSize:14,fontWeight:600,marginBottom:22,transition:'all var(--t-base) var(--ease-out)',...(p.popular?{background:'var(--cream)',color:'var(--forest)'}:{background:'linear-gradient(135deg,var(--forest-l),var(--forest))',color:'#fff',boxShadow:'0 2px 8px rgba(26,71,48,.25)'})}}>
                  {loading===p.key?<span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><span className="spinner" style={{width:14,height:14}}/>{user?.subscription_active?'Switching…':'Opening…'}</span>:isCurrent?'Current plan':(user?.subscription_active?`Switch to ${p.name}`:hasUsedTrial?'Subscribe':p.cta)}
                </button>
                <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:9}}>
                  {p.features.map(f=>(
                    <li key={f} style={{display:'flex',alignItems:'flex-start',gap:9,fontSize:13.5,color:p.popular?'rgba(250,248,243,.85)':'var(--ink-2)'}}>
                      <span style={{width:18,height:18,borderRadius:'50%',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',background:p.popular?'rgba(255,255,255,.15)':'var(--sage-l)'}}>
                        <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke={p.popular?'#fff':'var(--forest-l)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  )
}
