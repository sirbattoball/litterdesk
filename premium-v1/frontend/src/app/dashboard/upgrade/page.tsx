'use client'
import { paymentsApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    key: 'starter', name: 'Starter', price: 39, desc: 'For dedicated hobby breeders',
    features: ['2 active litters', 'Unlimited buyer CRM', 'Dog health records', 'Deposit collection via Stripe', 'Go-home reminders'],
    cta: 'Get started'
  },
  {
    key: 'pro', name: 'Pro', price: 89, desc: 'For serious breeding programs', popular: true,
    features: ['Unlimited litters', 'Everything in Starter', 'AI contract generation', 'AI buyer scoring & email drafting', 'Automated follow-up sequences', 'Weekly digest & analytics'],
    cta: 'Start Pro trial'
  },
  {
    key: 'kennel', name: 'Kennel', price: 179, desc: 'Multi-breed & team operations',
    features: ['Everything in Pro', 'Up to 5 team members', 'Public kennel listing page', 'Buyer-facing inquiry portal', 'Revenue analytics & reporting'],
    cta: 'Contact us'
  },
]

const TESTIMONIALS = [
  { name: 'Sarah M.', kennel: 'Sunrise Goldens', text: 'Replaced 4 spreadsheets and a notebook. My waitlist is now actually organized.', plan: 'Pro' },
  { name: 'Jake R.', kennel: 'Blue Ridge Berners', text: 'The AI contract generator alone saves me 2 hours per litter. Worth every penny.', plan: 'Pro' },
]

export default function UpgradePage() {
  const [loading, setLoading] = useState<string|null>(null)

  const handleUpgrade = async (plan: string) => {
    setLoading(plan)
    try {
      const res = await paymentsApi.createSubscription(plan)
      window.location.href = res.data.checkout_url
    } catch (err: any) {
      const detail = err.response?.data?.detail || ''
      if (detail.includes('Stripe') || err.response?.status === 500) {
        toast.error('Stripe not configured yet — add your STRIPE_SECRET_KEY in Railway.')
      } else {
        toast.error('Could not open checkout. Try again.')
      }
    } finally { setLoading(null) }
  }

  return (
    <div className="page-enter">
      <div className="topbar">
        <div>
          <div className="topbar-title">Upgrade Plan</div>
          <div className="topbar-sub">Every plan includes a 14-day free trial</div>
        </div>
        <div className="topbar-right">
          <Link href="/dashboard" className="btn-ghost">← Back</Link>
        </div>
      </div>

      <div className="page-body">
        {/* Header */}
        <div style={{textAlign:'center',marginBottom:40,maxWidth:520,margin:'0 auto 40px'}}>
          <h2 style={{fontFamily:'var(--serif)',fontSize:34,color:'var(--ink)',marginBottom:10,letterSpacing:'-.3px'}}>
            Simple, honest pricing
          </h2>
          <p style={{fontSize:16,color:'var(--ink-4)',lineHeight:1.6}}>
            Join 400+ breeders who replaced their spreadsheets with LitterDesk.
          </p>
        </div>

        {/* Trust bar */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:28,marginBottom:36,flexWrap:'wrap'}}>
          {['🔒 SSL secured','💳 Cancel anytime','🇺🇸 US-based support','14-day free trial'].map(t => (
            <span key={t} style={{fontSize:13,color:'var(--ink-4)',fontWeight:500}}>{t}</span>
          ))}
        </div>

        {/* Pricing cards */}
        <div className="three-col animate-fade-in-up" style={{maxWidth:900,margin:'0 auto 48px',gap:16}}>
          {PLANS.map((p, i) => (
            <div key={p.key} className="animate-fade-in-up" style={{animationDelay:`${i*80}ms`,position:'relative'}}>
              {p.popular && (
                <div style={{position:'absolute',top:-13,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,var(--amber),#e8891e)',color:'#fff',fontSize:11.5,fontWeight:700,padding:'4px 16px',borderRadius:20,whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(200,117,26,.3)',zIndex:1}}>
                  ✦ Most Popular
                </div>
              )}
              <div style={{
                borderRadius:'var(--r-2xl)',padding:28,height:'100%',
                ...(p.popular
                  ? {background:'linear-gradient(160deg,var(--forest-l) 0%,var(--forest) 100%)',border:'2px solid rgba(255,255,255,.1)',boxShadow:'0 8px 32px rgba(26,71,48,.35)'}
                  : {background:'var(--white)',border:'1px solid rgba(230,223,212,.7)',boxShadow:'var(--sh-sm)'}
                )
              }}>
                <div style={{fontSize:12,fontWeight:700,color:p.popular?'rgba(250,248,243,.6)':'var(--ink-4)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>{p.name}</div>
                <div style={{display:'flex',alignItems:'baseline',gap:3,marginBottom:6}}>
                  <span style={{fontFamily:'var(--serif)',fontSize:46,color:p.popular?'var(--cream)':'var(--ink)',letterSpacing:'-2px',lineHeight:1}}>${p.price}</span>
                  <span style={{fontSize:14,color:p.popular?'rgba(250,248,243,.5)':'var(--ink-4)'}}>/mo</span>
                </div>
                <p style={{fontSize:13,color:p.popular?'rgba(250,248,243,.6)':'var(--ink-4)',marginBottom:20,lineHeight:1.5}}>{p.desc}</p>

                <button onClick={() => handleUpgrade(p.key)} disabled={loading===p.key}
                  style={{width:'100%',padding:'12px',borderRadius:'var(--r-xl)',border:'none',cursor:'pointer',fontFamily:'var(--sans)',fontSize:14,fontWeight:600,marginBottom:22,transition:'all var(--t-base) var(--ease-out)',
                    ...(p.popular
                      ? {background:'var(--cream)',color:'var(--forest)',boxShadow:'0 2px 8px rgba(0,0,0,.12)'}
                      : {background:'linear-gradient(135deg,var(--forest-l),var(--forest))',color:'#fff',boxShadow:'0 2px 8px rgba(26,71,48,.25)'}
                    )
                  }}>
                  {loading===p.key ? (
                    <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                      <span className="spinner" style={{width:14,height:14,borderColor:'currentColor',borderTopColor:'transparent',opacity:.6}}/>
                      Opening…
                    </span>
                  ) : p.cta}
                </button>

                <ul style={{listStyle:'none',display:'flex',flexDirection:'column',gap:9}}>
                  {p.features.map(f => (
                    <li key={f} style={{display:'flex',alignItems:'flex-start',gap:9,fontSize:13.5,color:p.popular?'rgba(250,248,243,.85)':'var(--ink-2)'}}>
                      <span style={{width:18,height:18,borderRadius:'50%',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',background:p.popular?'rgba(255,255,255,.15)':'var(--sage-l)'}}>
                        <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke={p.popular?'#fff':'var(--forest-l)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div style={{maxWidth:680,margin:'0 auto',textAlign:'center'}}>
          <div className="section-label" style={{marginBottom:20}}>What breeders say</div>
          <div className="two-col">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card animate-fade-in-up" style={{padding:20,textAlign:'left',animationDelay:`${i*80+200}ms`}}>
                <p style={{fontSize:14,color:'var(--ink-2)',lineHeight:1.6,marginBottom:14,fontStyle:'italic'}}>"{t.text}"</p>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div className="avatar avatar-sm" style={{background:'linear-gradient(135deg,var(--forest),var(--forest-ll))',fontSize:11,fontWeight:700}}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:'var(--ink)'}}>{t.name}</div>
                    <div style={{fontSize:11.5,color:'var(--ink-4)'}}>{t.kennel} · {t.plan}</div>
                  </div>
                  <span className="plan-chip" style={{marginLeft:'auto',fontSize:11}}>✓ Verified</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
