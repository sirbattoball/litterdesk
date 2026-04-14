'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { dogsApi } from '@/lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'

const BREEDS = ['Golden Retriever','Labrador Retriever','French Bulldog','German Shepherd','Bernese Mountain Dog','Doodle','Standard Poodle','Cavalier King Charles','Shih Tzu','Beagle','Other']
const HEALTH_OPTIONS = ['OFA Excellent','OFA Good','OFA Fair','CAER Clear','Embark Clear','DM Clear','EIC Clear','PRA Clear','vWD Clear']

export default function NewDogPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [health, setHealth] = useState<string[]>([])
  const [form, setForm] = useState({ name:'', registered_name:'', breed:'Golden Retriever', sex:'female', dob:'', akc_number:'', color:'', weight_lbs:'', is_external:false, health_notes:'' })
  const set = (k: string, v: any) => setForm(f => ({...f,[k]:v}))

  const toggleHealth = (h: string) => setHealth(prev => prev.includes(h) ? prev.filter(x=>x!==h) : [...prev, h])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const health_tests: Record<string,string> = {}
      health.forEach(h => { health_tests[h.split(' ')[0]] = h })
      const payload: any = { ...form, health_tests }
      if (form.weight_lbs) payload.weight_lbs = Number(form.weight_lbs)
      if (!form.dob) delete payload.dob
      if (!form.akc_number) delete payload.akc_number
      if (!form.registered_name) delete payload.registered_name
      await dogsApi.create(payload)
      toast.success('Dog added!')
      router.push('/dashboard/dogs')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add dog')
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="topbar">
        <div><div className="topbar-title">Add Dog</div><div className="topbar-sub">Add a dam or sire to your program</div></div>
        <div className="topbar-right"><Link href="/dashboard/dogs" className="btn-ghost">Cancel</Link></div>
      </div>
      <div className="page-body">
        <div style={{ maxWidth: 640 }}>
          <form onSubmit={handleSubmit}>
            <div className="card" style={{padding:24,marginBottom:16}}>
              <div className="section-label" style={{marginBottom:16}}>Basic Info</div>
              <div className="two-col">
                <div className="field"><label className="label">Call name *</label><input className="input" placeholder="Bella" value={form.name} onChange={e=>set('name',e.target.value)} required /></div>
                <div className="field"><label className="label">Registered name</label><input className="input" placeholder="Sunrise Bella of the Valley" value={form.registered_name} onChange={e=>set('registered_name',e.target.value)} /></div>
              </div>
              <div className="two-col">
                <div className="field">
                  <label className="label">Breed</label>
                  <select className="input" value={form.breed} onChange={e=>set('breed',e.target.value)}>
                    {BREEDS.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Sex</label>
                  <select className="input" value={form.sex} onChange={e=>set('sex',e.target.value)}>
                    <option value="female">Female (Dam)</option>
                    <option value="male">Male (Sire)</option>
                  </select>
                </div>
              </div>
              <div className="two-col">
                <div className="field"><label className="label">Date of birth</label><input type="date" className="input" value={form.dob} onChange={e=>set('dob',e.target.value)} /></div>
                <div className="field"><label className="label">Color / markings</label><input className="input" placeholder="Golden, cream" value={form.color} onChange={e=>set('color',e.target.value)} /></div>
              </div>
              <div className="two-col">
                <div className="field"><label className="label">AKC / registration #</label><input className="input" placeholder="SR12345678" value={form.akc_number} onChange={e=>set('akc_number',e.target.value)} /></div>
                <div className="field"><label className="label">Weight (lbs)</label><input type="number" className="input" placeholder="65" value={form.weight_lbs} onChange={e=>set('weight_lbs',e.target.value)} /></div>
              </div>
              <div className="field" style={{display:'flex',alignItems:'center',gap:10}}>
                <input type="checkbox" id="external" checked={form.is_external} onChange={e=>set('is_external',e.target.checked)} style={{width:16,height:16,accentColor:'var(--forest)'}} />
                <label htmlFor="external" style={{fontSize:14,color:'var(--ink-2)',cursor:'pointer'}}>External stud (not owned by me)</label>
              </div>
            </div>

            <div className="card" style={{padding:24,marginBottom:24}}>
              <div className="section-label" style={{marginBottom:12}}>Health Testing</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {HEALTH_OPTIONS.map(h => (
                  <button type="button" key={h} onClick={()=>toggleHealth(h)}
                    style={{padding:'6px 14px',borderRadius:20,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid',borderColor:health.includes(h)?'var(--forest)':'var(--paper-3)',background:health.includes(h)?'var(--sage-l)':'var(--white)',color:health.includes(h)?'var(--forest)':'var(--ink-4)'}}>
                    {health.includes(h) ? '✓ ' : ''}{h}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" disabled={saving} className="btn-primary" style={{fontSize:15,padding:'12px 28px'}}>
              {saving ? 'Adding…' : 'Add Dog →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
