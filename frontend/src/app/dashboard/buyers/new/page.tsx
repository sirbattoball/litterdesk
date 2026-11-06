'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { buyersApi } from '@/lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'

const BREEDS = ['Golden Retriever','Labrador Retriever','French Bulldog','German Shepherd','Bernese Mountain Dog','Doodle','Poodle','Cavalier King Charles','Shih Tzu','Beagle','Any','Other']
const SOURCES = ['Instagram','Facebook','AKC Marketplace','Referral','Website','Word of mouth','Other']

export default function NewBuyerPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name:'', email:'', phone:'', breed_preference:'Golden Retriever', sex_preference:'', budget_min:'', budget_max:'', timeline:'', source:'', notes:'', status:'inquiry' })
  const set = (k: string, v: any) => setForm(f => ({...f,[k]:v}))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { source, notes, ...fields } = form
      const payload: any = { ...fields, referral_source: source, lifestyle_notes: notes }
      if (form.budget_min) payload.budget_min = Number(form.budget_min)
      if (form.budget_max) payload.budget_max = Number(form.budget_max)
      if (!form.phone) delete payload.phone
      if (!form.budget_min) delete payload.budget_min
      if (!form.budget_max) delete payload.budget_max
      await buyersApi.create(payload)
      qc.invalidateQueries({queryKey:['buyers']})
      qc.invalidateQueries({queryKey:['dashboard-stats']})
      qc.invalidateQueries({queryKey:['dashboard-activity']})
      toast.success('Buyer added!')
      router.push('/dashboard/buyers')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add buyer')
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="topbar">
        <div><div className="topbar-title">Add Buyer</div><div className="topbar-sub">Add a new buyer to your CRM</div></div>
        <div className="topbar-right"><Link href="/dashboard/buyers" className="btn-ghost">Cancel</Link></div>
      </div>
      <div className="page-body">
        <div style={{ maxWidth: 640 }}>
          <form onSubmit={handleSubmit}>
            <div className="card" style={{padding:24,marginBottom:16}}>
              <div className="section-label" style={{marginBottom:16}}>Contact Info</div>
              <div className="field"><label className="label" htmlFor="field-full-name-1">Full name *</label><input id="field-full-name-1" className="input" placeholder="Jane Smith" value={form.full_name} onChange={e=>set('full_name',e.target.value)} required /></div>
              <div className="two-col">
                <div className="field"><label className="label" htmlFor="field-email-2">Email *</label><input id="field-email-2" type="email" className="input" placeholder="jane@email.com" value={form.email} onChange={e=>set('email',e.target.value)} required /></div>
                <div className="field"><label className="label" htmlFor="field-phone-3">Phone</label><input id="field-phone-3" className="input" placeholder="(555) 000-0000" value={form.phone} onChange={e=>set('phone',e.target.value)} /></div>
              </div>
              <div className="field">
                <label className="label" htmlFor="field-how-did-they-hear-about-you-4">How did they hear about you?</label>
                <select id="field-how-did-they-hear-about-you-4" className="input" value={form.source} onChange={e=>set('source',e.target.value)}>
                  <option value="">Select source…</option>
                  {SOURCES.map(s=><option key={s} value={s.toLowerCase()}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="card" style={{padding:24,marginBottom:16}}>
              <div className="section-label" style={{marginBottom:16}}>Puppy Preferences</div>
              <div className="two-col">
                <div className="field">
                  <label className="label" htmlFor="field-breed-preference-5">Breed preference</label>
                  <select id="field-breed-preference-5" className="input" value={form.breed_preference} onChange={e=>set('breed_preference',e.target.value)}>
                    {BREEDS.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label" htmlFor="field-sex-preference-6">Sex preference</label>
                  <select id="field-sex-preference-6" className="input" value={form.sex_preference} onChange={e=>set('sex_preference',e.target.value)}>
                    <option value="">No preference</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div className="two-col">
                <div className="field"><label className="label" htmlFor="field-budget-min-7">Budget min ($)</label><input id="field-budget-min-7" type="number" className="input" placeholder="2000" value={form.budget_min} onChange={e=>set('budget_min',e.target.value)} /></div>
                <div className="field"><label className="label" htmlFor="field-budget-max-8">Budget max ($)</label><input id="field-budget-max-8" type="number" className="input" placeholder="4000" value={form.budget_max} onChange={e=>set('budget_max',e.target.value)} /></div>
              </div>
              <div className="field"><label className="label" htmlFor="field-timeline-9">Timeline</label><input id="field-timeline-9" className="input" placeholder="e.g. Ready in spring 2025" value={form.timeline} onChange={e=>set('timeline',e.target.value)} /></div>
            </div>

            <div className="card" style={{padding:24,marginBottom:24}}>
              <div className="section-label" style={{marginBottom:16}}>Notes</div>
              <textarea className="input" rows={4} placeholder="Application answers, notes from call, etc…" value={form.notes} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}} />
            </div>

            <button type="submit" disabled={saving} className="btn-primary" style={{fontSize:15,padding:'12px 28px'}}>
              {saving ? 'Adding…' : 'Add Buyer →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
