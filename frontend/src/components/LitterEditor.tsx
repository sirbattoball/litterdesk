'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dogsApi, littersApi } from '@/lib/api'
import toast from 'react-hot-toast'

export function LitterEditor({ litter, onSaved }: { litter: any; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<any>({})
  const [busy, setBusy] = useState(false)
  const { data: dogs } = useQuery({ queryKey: ['dogs'], queryFn: () => dogsApi.list().then(r => r.data), enabled: open })
  const fields = [['name','Litter name','text'],['breed','Breed','text'],['breeding_date','Breeding date','date'],['due_date','Due date','date'],['whelp_date','Whelp date','date'],['go_home_date','Go-home date','date'],['puppy_price','Puppy price ($)','number'],['deposit_amount','Deposit requested ($)','number']]
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true)
    try {
      const payload: any = { ...form }
      for (const [key,,type] of fields) payload[key] = type === 'number' ? (form[key] === '' ? null : Number(form[key])) : form[key] || null
      payload.breed = form.breed
      payload.dam_id = form.dam_id || null; payload.sire_id = form.sire_id || null
      await littersApi.update(litter.id, payload); onSaved(); setOpen(false); toast.success('Litter details saved')
    } catch (err:any) { toast.error(err.response?.data?.detail || 'Could not save litter') } finally { setBusy(false) }
  }
  if (!open) return <button className="btn-ghost" onClick={() => { setForm(Object.fromEntries([...fields.map(([key]) => [key,litter[key] ?? '']),['status',litter.status],['dam_id',litter.dam_id ?? ''],['sire_id',litter.sire_id ?? ''],['notes',litter.notes ?? ''],['waitlist_open',litter.waitlist_open]])); setOpen(true) }}>Edit litter details</button>
  return <form onSubmit={save}><h3 style={{marginBottom:16}}>Litter details</h3><div className="two-col">{fields.map(([key,label,type]) => <div className="field" key={key}><label className="label" htmlFor={`litter-${key}`}>{label}</label><input id={`litter-${key}`} className="input" type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? '0.01' : undefined} required={key === 'breed'} value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})} onInput={e => setForm({...form,[key]:(e.target as HTMLInputElement).value})}/></div>)}
  <div className="field"><label className="label" htmlFor="litter-status">Status</label><select id="litter-status" className="input" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>{['planned','pregnant','born','weaning','ready','complete'].map(s => <option key={s}>{s}</option>)}</select></div>
  {['dam','sire'].map((kind,i) => <div className="field" key={kind}><label className="label" htmlFor={`litter-${kind}`}>{kind === 'dam' ? 'Dam' : 'Sire'}</label><select id={`litter-${kind}`} className="input" value={form[kind+'_id']} onChange={e => setForm({...form,[kind+'_id']:e.target.value})}><option value="">Not selected</option>{dogs?.filter((d:any)=>d.sex === (i===0?'female':'male')).map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>)}</div>
  <label className="label" htmlFor="litter-notes">Notes</label><textarea id="litter-notes" className="input" rows={4} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><label style={{display:'block',margin:'16px 0'}}><input type="checkbox" checked={form.waitlist_open} onChange={e=>setForm({...form,waitlist_open:e.target.checked})}/> Waitlist open</label><div style={{display:'flex',gap:10}}><button className="btn-primary" disabled={busy}>Save details</button><button className="btn-ghost" type="button" disabled={busy} onClick={()=>setOpen(false)}>Cancel</button></div></form>
}
