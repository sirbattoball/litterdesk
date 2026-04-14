'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { littersApi, dogsApi } from '@/lib/api'
import Link from 'next/link'
import toast from 'react-hot-toast'

const BREEDS = ['Golden Retriever','Labrador Retriever','French Bulldog','German Shepherd','Bernese Mountain Dog','Doodle','Poodle','Cavalier King Charles','Shih Tzu','Beagle','Other']
const STATUSES = ['planned','pregnant','born','weaning','ready','complete']

export default function NewLitterPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name:'', breed:'Golden Retriever', status:'planned', whelp_date:'', go_home_date:'', num_males:0, num_females:0, puppy_price:'', dam_id:'', sire_id:'', notes:'' })
  const { data: dogs } = useQuery({ queryKey:['dogs'], queryFn: () => dogsApi.list().then(r=>r.data) })
  const females = dogs?.filter((d:any) => d.sex==='female') ?? []
  const males = dogs?.filter((d:any) => d.sex==='male' || d.is_external) ?? []

  const set = (k: string, v: any) => setForm(f => ({...f, [k]: v}))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = { ...form, num_males: Number(form.num_males), num_females: Number(form.num_females) }
      if (form.puppy_price) payload.puppy_price = Number(form.puppy_price)
      if (!form.dam_id) delete payload.dam_id
      if (!form.sire_id) delete payload.sire_id
      if (!form.whelp_date) delete payload.whelp_date
      if (!form.go_home_date) delete payload.go_home_date
      await littersApi.create(payload)
      toast.success('Litter created!')
      router.push('/dashboard/litters')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create litter')
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">New Litter</div>
          <div className="topbar-sub">Add a litter to your breeding program</div>
        </div>
        <div className="topbar-right">
          <Link href="/dashboard/litters" className="btn-ghost">Cancel</Link>
        </div>
      </div>
      <div className="page-body">
        <div style={{ maxWidth: 640 }}>
          <form onSubmit={handleSubmit}>
            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 16 }}>Litter Details</div>
              <div className="field"><label className="label">Litter name <span style={{color:'var(--ink-4)',fontWeight:400}}>(optional)</span></label><input className="input" placeholder="e.g. Spring Litter '25" value={form.name} onChange={e=>set('name',e.target.value)} /></div>
              <div className="two-col">
                <div className="field">
                  <label className="label">Breed</label>
                  <select className="input" value={form.breed} onChange={e=>set('breed',e.target.value)}>
                    {BREEDS.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={e=>set('status',e.target.value)}>
                    {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="two-col">
                <div className="field"><label className="label">Whelp date</label><input type="date" className="input" value={form.whelp_date} onChange={e=>set('whelp_date',e.target.value)} /></div>
                <div className="field"><label className="label">Go-home date</label><input type="date" className="input" value={form.go_home_date} onChange={e=>set('go_home_date',e.target.value)} /></div>
              </div>
              <div className="two-col">
                <div className="field"><label className="label">Males</label><input type="number" className="input" min={0} value={form.num_males} onChange={e=>set('num_males',e.target.value)} /></div>
                <div className="field"><label className="label">Females</label><input type="number" className="input" min={0} value={form.num_females} onChange={e=>set('num_females',e.target.value)} /></div>
              </div>
              <div className="field"><label className="label">Price per puppy ($)</label><input type="number" className="input" placeholder="e.g. 2800" value={form.puppy_price} onChange={e=>set('puppy_price',e.target.value)} /></div>
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
              <div className="section-label" style={{ marginBottom: 16 }}>Parents</div>
              <div className="two-col">
                <div className="field">
                  <label className="label">Dam (mother)</label>
                  <select className="input" value={form.dam_id} onChange={e=>set('dam_id',e.target.value)}>
                    <option value="">Select dam…</option>
                    {females.map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Sire (father)</label>
                  <select className="input" value={form.sire_id} onChange={e=>set('sire_id',e.target.value)}>
                    <option value="">Select sire…</option>
                    {males.map((d:any)=><option key={d.id} value={d.id}>{d.name}{d.is_external?' (external)':''}</option>)}
                  </select>
                </div>
              </div>
              {females.length === 0 && <p style={{fontSize:13,color:'var(--ink-4)'}}>No dogs added yet. <Link href="/dashboard/dogs/new" style={{color:'var(--forest)'}}>Add a dog →</Link></p>}
            </div>

            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <div className="section-label" style={{ marginBottom: 16 }}>Notes</div>
              <textarea className="input" rows={3} placeholder="Any notes about this litter…" value={form.notes} onChange={e=>set('notes',e.target.value)} style={{resize:'vertical'}} />
            </div>

            <button type="submit" disabled={saving} className="btn-primary" style={{fontSize:15,padding:'12px 28px'}}>
              {saving ? 'Creating…' : 'Create Litter →'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
