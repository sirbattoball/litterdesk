'use client'
import { paymentsApi } from '@/lib/api'
import toast from 'react-hot-toast'
import { useState } from 'react'

const PLANS = [
  { key:'starter', name:'Starter', price:39, desc:'For hobby breeders', features:['2 active litters','Unlimited buyers','Dog profiles & health records','Deposit collection'] },
  { key:'pro', name:'Pro', price:89, desc:'For serious breeders', popular:true, features:['Unlimited litters','Everything in Starter','AI contract generation','AI buyer scoring & email drafting','Go-home reminders','Weekly digest'] },
  { key:'kennel', name:'Kennel', price:179, desc:'Multi-breed operations', features:['Everything in Pro','Up to 5 team members','Public kennel listing page','Buyer-facing portal','Revenue analytics'] },
]

export default function UpgradePage() {
  const [loading, setLoading] = useState<string|null>(null)

  const handleUpgrade = async (plan: string) => {
    setLoading(plan)
    try {
      const res = await paymentsApi.createSubscription(plan)
      window.location.href = res.data.checkout_url
    } catch { toast.error('Could not open checkout') }
    finally { setLoading(null) }
  }

  return (
    <>
      <div className="topbar"><div><div className="topbar-title">Upgrade Plan</div><div className="topbar-sub">Unlock AI features and unlimited litters</div></div></div>
      <div className="page-body">
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <h2 style={{ fontFamily:'var(--serif)', fontSize:32, color:'var(--ink)', marginBottom:10 }}>Simple, honest pricing</h2>
            <p style={{ fontSize:16, color:'var(--ink-4)' }}>Every plan includes a 14-day free trial.</p>
          </div>
          <div className="three-col">
            {PLANS.map(p => (
              <div key={p.key} className="card" style={{ padding:28, position:'relative', ...(p.popular ? { border:'2px solid var(--forest)', background:'var(--forest)' } : {}) }}>
                {p.popular && <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:'var(--amber)', color:'#fff', fontSize:12, fontWeight:600, padding:'4px 14px', borderRadius:20, whiteSpace:'nowrap' }}>Most Popular</div>}
                <div style={{ fontSize:13, fontWeight:600, color: p.popular ? 'rgba(250,248,243,.6)' : 'var(--ink-4)', textTransform:'uppercase', letterSpacing:'.3px', marginBottom:6 }}>{p.name}</div>
                <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:6 }}>
                  <span style={{ fontFamily:'var(--serif)', fontSize:44, color: p.popular ? 'var(--cream)' : 'var(--ink)', letterSpacing:'-1px' }}>${p.price}</span>
                  <span style={{ fontSize:14, color: p.popular ? 'rgba(250,248,243,.5)' : 'var(--ink-4)' }}>/month</span>
                </div>
                <p style={{ fontSize:13, color: p.popular ? 'rgba(250,248,243,.6)' : 'var(--ink-4)', marginBottom:20 }}>{p.desc}</p>
                <button onClick={() => handleUpgrade(p.key)} disabled={loading===p.key} style={{ width:'100%', padding:'11px', borderRadius:'var(--r-lg)', border:'none', cursor:'pointer', fontFamily:'var(--sans)', fontSize:14, fontWeight:500, marginBottom:20, background: p.popular ? 'var(--cream)' : 'var(--forest)', color: p.popular ? 'var(--forest)' : 'var(--cream)' }}>
                  {loading===p.key ? 'Opening…' : 'Get started'}
                </button>
                <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:9 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:13.5, color: p.popular ? 'rgba(250,248,243,.85)' : 'var(--ink-2)' }}>
                      <span style={{ width:17, height:17, borderRadius:'50%', background: p.popular ? 'rgba(250,248,243,.15)' : 'var(--sage-l)', flexShrink:0, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <svg width="9" height="7" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke={p.popular ? '#fff' : '#2d6b4a'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
