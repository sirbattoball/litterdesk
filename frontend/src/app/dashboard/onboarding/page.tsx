'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { littersApi, dogsApi, buyersApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import Link from 'next/link'

const STEPS = ['Welcome', 'First Litter', 'First Dog', 'Done']

const BREEDS = ['Golden Retriever','Labrador Retriever','French Bulldog','German Shepherd','Bernese Mountain Dog','Doodle','Standard Poodle','Cavalier King Charles','Other']
const STATUSES = ['planned','pregnant','born','ready']

export default function OnboardingPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [litter, setLitter] = useState({ breed: 'Golden Retriever', status: 'planned', num_males: 0, num_females: 0, puppy_price: '', go_home_date: '' })
  const [dog, setDog] = useState({ name: '', breed: 'Golden Retriever', sex: 'female' })
  const [skipDog, setSkipDog] = useState(false)

  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  const handleLitter = async () => {
    setSaving(true)
    try {
      const payload: any = { ...litter, num_males: Number(litter.num_males), num_females: Number(litter.num_females) }
      if (litter.puppy_price) payload.puppy_price = Number(litter.puppy_price)
      if (!litter.go_home_date) delete payload.go_home_date
      await littersApi.create(payload)
      setStep(2)
    } catch { toast.error('Failed — try again') }
    finally { setSaving(false) }
  }

  const handleDog = async () => {
    if (skipDog) { setStep(3); return }
    if (!dog.name) { toast.error('Enter your dog\'s name'); return }
    setSaving(true)
    try {
      await dogsApi.create({ ...dog, health_tests: {} })
      setStep(3)
    } catch { toast.error('Failed — try again') }
    finally { setSaving(false) }
  }

  const progress = (step / (STEPS.length - 1)) * 100

  return (
    <div style={{minHeight:'100vh',background:'radial-gradient(ellipse at 20% 60%,rgba(196,217,200,.18) 0%,transparent 55%),var(--paper)',display:'flex',flex:'column',alignItems:'center',justifyContent:'center',padding:24}}>

      {/* Logo */}
      <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:32}}>
        <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,var(--forest-l),var(--forest))',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(26,71,48,.25)'}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
        </div>
        <span style={{fontFamily:'var(--serif)',fontSize:20,color:'var(--ink)'}}>LitterDesk</span>
      </div>

      {/* Progress */}
      <div style={{width:'100%',maxWidth:520,marginBottom:32}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          {STEPS.map((s, i) => (
            <span key={s} style={{fontSize:12,fontWeight:i<=step?600:400,color:i<=step?'var(--forest)':'var(--ink-4)'}}>
              {i < step ? '✓ ' : ''}{s}
            </span>
          ))}
        </div>
        <div style={{height:4,background:'var(--paper-3)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${progress}%`,background:'linear-gradient(90deg,var(--forest-l),var(--sage))',borderRadius:2,transition:'width .4s cubic-bezier(0.16,1,0.3,1)'}}/>
        </div>
      </div>

      <div style={{width:'100%',maxWidth:520}}>

        {/* STEP 0 — Welcome */}
        {step === 0 && (
          <div className="card animate-fade-in-up" style={{padding:36,textAlign:'center'}}>
            <div style={{fontSize:40,marginBottom:16}}>🐾</div>
            <h2 style={{fontFamily:'var(--serif)',fontSize:28,color:'var(--ink)',marginBottom:10,letterSpacing:'-.2px'}}>
              Welcome, {firstName}!
            </h2>
            <p style={{fontSize:16,color:'var(--ink-3)',lineHeight:1.65,marginBottom:28}}>
              Let's get your kennel set up in 3 minutes.<br/>
              We'll add your first litter and dog, then you're ready to go.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
              {['Add your first litter to start tracking','Log your dam or sire with health testing','Invite buyers to your waitlist'].map((item, i) => (
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,background:'var(--paper)',borderRadius:12,padding:'12px 16px',textAlign:'left'}}>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'var(--sage-l)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:12,fontWeight:700,color:'var(--forest)'}}>
                    {i + 1}
                  </div>
                  <span style={{fontSize:14,color:'var(--ink-2)'}}>{item}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(1)} className="btn-primary" style={{width:'100%',justifyContent:'center',padding:'13px',fontSize:15}}>
              Let's set up your kennel →
            </button>
          </div>
        )}

        {/* STEP 1 — First Litter */}
        {step === 1 && (
          <div className="card animate-fade-in-up" style={{padding:32}}>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--forest-ll)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Step 1 of 3</div>
              <h2 style={{fontFamily:'var(--serif)',fontSize:24,color:'var(--ink)',marginBottom:6}}>Add your first litter</h2>
              <p style={{fontSize:14,color:'var(--ink-4)'}}>Even a planned or future litter is fine — you can edit everything later.</p>
            </div>

            <div className="two-col">
              <div className="field">
                <label className="label">Breed</label>
                <select className="input" value={litter.breed} onChange={e=>setLitter(l=>({...l,breed:e.target.value}))}>
                  {BREEDS.map(b=><option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Status</label>
                <select className="input" value={litter.status} onChange={e=>setLitter(l=>({...l,status:e.target.value}))}>
                  {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="two-col">
              <div className="field"><label className="label">Males</label><input type="number" className="input" min={0} value={litter.num_males} onChange={e=>setLitter(l=>({...l,num_males:+e.target.value}))} /></div>
              <div className="field"><label className="label">Females</label><input type="number" className="input" min={0} value={litter.num_females} onChange={e=>setLitter(l=>({...l,num_females:+e.target.value}))} /></div>
            </div>
            <div className="two-col">
              <div className="field"><label className="label">Puppy price ($)</label><input type="number" className="input" placeholder="2800" value={litter.puppy_price} onChange={e=>setLitter(l=>({...l,puppy_price:e.target.value}))} /></div>
              <div className="field"><label className="label">Go-home date</label><input type="date" className="input" value={litter.go_home_date} onChange={e=>setLitter(l=>({...l,go_home_date:e.target.value}))} /></div>
            </div>

            <div style={{display:'flex',gap:10}}>
              <button onClick={() => setStep(0)} className="btn-ghost" style={{flex:'0 0 auto'}}>← Back</button>
              <button onClick={handleLitter} disabled={saving} className="btn-primary" style={{flex:1,justifyContent:'center',padding:'12px',fontSize:15}}>
                {saving ? 'Saving…' : 'Save litter & continue →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — First Dog */}
        {step === 2 && (
          <div className="card animate-fade-in-up" style={{padding:32}}>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:12,fontWeight:700,color:'var(--forest-ll)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:6}}>Step 2 of 3</div>
              <h2 style={{fontFamily:'var(--serif)',fontSize:24,color:'var(--ink)',marginBottom:6}}>Add your dam or sire</h2>
              <p style={{fontSize:14,color:'var(--ink-4)'}}>Health records and pedigree tracking starts here. You can skip this for now.</p>
            </div>

            {!skipDog ? (
              <>
                <div className="field"><label className="label">Call name</label><input className="input" placeholder="Bella" value={dog.name} onChange={e=>setDog(d=>({...d,name:e.target.value}))} /></div>
                <div className="two-col">
                  <div className="field">
                    <label className="label">Breed</label>
                    <select className="input" value={dog.breed} onChange={e=>setDog(d=>({...d,breed:e.target.value}))}>
                      {BREEDS.map(b=><option key={b}>{b}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Sex</label>
                    <select className="input" value={dog.sex} onChange={e=>setDog(d=>({...d,sex:e.target.value}))}>
                      <option value="female">Female (Dam)</option>
                      <option value="male">Male (Sire)</option>
                    </select>
                  </div>
                </div>
                <div style={{display:'flex',gap:10,marginBottom:12}}>
                  <button onClick={() => setStep(1)} className="btn-ghost" style={{flex:'0 0 auto'}}>← Back</button>
                  <button onClick={handleDog} disabled={saving} className="btn-primary" style={{flex:1,justifyContent:'center',padding:'12px',fontSize:15}}>
                    {saving ? 'Saving…' : 'Save dog & continue →'}
                  </button>
                </div>
                <button onClick={() => setSkipDog(true)} style={{width:'100%',background:'none',border:'none',cursor:'pointer',fontSize:13,color:'var(--ink-4)',padding:'8px'}}>
                  Skip this step for now
                </button>
              </>
            ) : (
              <>
                <p style={{fontSize:14,color:'var(--ink-4)',marginBottom:20}}>No problem — you can add dogs anytime from the My Dogs section.</p>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={() => setSkipDog(false)} className="btn-ghost">← Back</button>
                  <button onClick={() => setStep(3)} className="btn-primary" style={{flex:1,justifyContent:'center',padding:'12px',fontSize:15}}>Continue →</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 3 — Done */}
        {step === 3 && (
          <div className="card animate-fade-in-up" style={{padding:36,textAlign:'center'}}>
            <div style={{width:64,height:64,borderRadius:'50%',background:'var(--sage-l)',border:'2px solid var(--sage)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',animation:'check-pop .4s cubic-bezier(0.34,1.56,0.64,1) both'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--forest)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style={{fontFamily:'var(--serif)',fontSize:28,color:'var(--ink)',marginBottom:10}}>You're all set!</h2>
            <p style={{fontSize:15,color:'var(--ink-3)',lineHeight:1.65,marginBottom:28,maxWidth:380,margin:'0 auto 28px'}}>
              Your kennel is live. Add buyers to your waitlist, generate contracts, and collect deposits — all from your dashboard.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <button onClick={() => router.push('/dashboard')} className="btn-primary" style={{justifyContent:'center',padding:'13px',fontSize:15}}>
                Go to my dashboard →
              </button>
              <Link href="/dashboard/buyers/new" style={{fontSize:14,color:'var(--forest)',fontWeight:500,textDecoration:'none',padding:'8px'}}>
                Add your first buyer →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
