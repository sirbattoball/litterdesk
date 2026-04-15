'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dogsApi } from '@/lib/api'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useState, useEffect } from 'react'

const HEALTH_OPTIONS = ['OFA Excellent','OFA Good','OFA Fair','CAER Clear','Embark Clear','DM Clear','EIC Clear','PRA Clear','vWD Clear']

export default function DogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)

  const { data: dog, isLoading } = useQuery({
    queryKey: ['dog', id],
    queryFn: () => dogsApi.get(id).then(r => r.data),
  })

  // Populate edit form when dog loads
  useEffect(() => {
    if (dog && !editForm) setEditForm({ ...dog })
  }, [dog])

  const handleSave = async () => {
    setSaving(true)
    try {
      await dogsApi.update(id, editForm)
      qc.invalidateQueries({ queryKey: ['dog', id] })
      qc.invalidateQueries({ queryKey: ['dogs'] })
      toast.success('Dog updated!')
      setEditing(false)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete ${dog?.name}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await dogsApi.delete(id)
      qc.invalidateQueries({ queryKey: ['dogs'] })
      toast.success('Dog removed')
      router.push('/dashboard/dogs')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    } finally { setDeleting(false) }
  }

  const toggleHealth = (h: string) => {
    if (!editForm) return
    const tests = { ...(editForm.health_tests || {}) }
    const key = h.split(' ')[0]
    if (tests[key]) delete tests[key]
    else tests[key] = h
    setEditForm({ ...editForm, health_tests: tests })
  }

  if (isLoading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:64}}>
      <div className="spinner" style={{width:32,height:32}}/>
    </div>
  )

  if (!dog) return (
    <div className="page-body">
      <div className="empty">
        <div className="empty-title">Dog not found</div>
        <Link href="/dashboard/dogs" className="btn-primary">← Back to Dogs</Link>
      </div>
    </div>
  )

  const healthTests = Object.values(dog.health_tests || {}) as string[]

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">{dog.name}</div>
          <div className="topbar-sub">{dog.breed} · {dog.sex === 'female' ? 'Dam' : 'Sire'}{dog.is_external ? ' · External' : ''}</div>
        </div>
        <div className="topbar-right">
          {!editing ? (
            <>
              <button onClick={()=>{setEditForm({...dog});setEditing(true)}} className="btn-ghost">Edit</button>
              <button onClick={handleDelete} disabled={deleting}
                style={{border:'none',background:'none',cursor:'pointer',fontSize:13,color:'var(--red)',padding:'8px 12px',fontFamily:'var(--sans)',fontWeight:500}}>
                {deleting?'Removing…':'Remove'}
              </button>
              <Link href="/dashboard/dogs" className="btn-ghost">← Dogs</Link>
            </>
          ) : (
            <>
              <button onClick={()=>setEditing(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving?'Saving…':'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="two-col">
          <div className="card" style={{padding:24}}>
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
              <div style={{width:60,height:60,borderRadius:'50%',background:'linear-gradient(135deg,var(--sage),var(--forest-ll))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,color:'#fff',fontWeight:700,flexShrink:0}}>
                {dog.name.charAt(0)}
              </div>
              <div>
                <h2 style={{fontSize:20,fontWeight:700,color:'var(--ink)'}}>{dog.name}</h2>
                {dog.registered_name && <p style={{fontSize:13,color:'var(--ink-4)',fontStyle:'italic'}}>{dog.registered_name}</p>}
              </div>
            </div>

            {!editing ? (
              <div>
                {[
                  ['Breed', dog.breed],
                  ['Sex', dog.sex === 'female' ? 'Female (Dam)' : 'Male (Sire)'],
                  ['Date of birth', dog.dob ? format(new Date(dog.dob),'MMM d, yyyy') : '—'],
                  ['Color', dog.color || '—'],
                  ['Weight', dog.weight_lbs ? `${dog.weight_lbs} lbs` : '—'],
                  ['AKC / Reg #', dog.akc_number || '—'],
                  ['External stud', dog.is_external ? 'Yes' : 'No'],
                ].map(([k,v]) => (
                  <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:14,padding:'10px 0',borderBottom:'1px solid var(--paper-3)'}}>
                    <span style={{color:'var(--ink-4)'}}>{k}</span>
                    <span style={{fontWeight:600,color:'var(--ink)'}}>{v}</span>
                  </div>
                ))}
              </div>
            ) : editForm && (
              <div>
                <div className="field"><label className="label">Call name</label><input className="input" value={editForm.name||''} onChange={e=>setEditForm({...editForm,name:e.target.value})}/></div>
                <div className="field"><label className="label">Registered name</label><input className="input" value={editForm.registered_name||''} onChange={e=>setEditForm({...editForm,registered_name:e.target.value})}/></div>
                <div className="two-col">
                  <div className="field"><label className="label">Color</label><input className="input" value={editForm.color||''} onChange={e=>setEditForm({...editForm,color:e.target.value})}/></div>
                  <div className="field"><label className="label">Weight (lbs)</label><input type="number" className="input" value={editForm.weight_lbs||''} onChange={e=>setEditForm({...editForm,weight_lbs:e.target.value})}/></div>
                </div>
                <div className="field"><label className="label">AKC / Reg #</label><input className="input" value={editForm.akc_number||''} onChange={e=>setEditForm({...editForm,akc_number:e.target.value})}/></div>
              </div>
            )}
          </div>

          <div className="card" style={{padding:24}}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Health Testing</h3>
            {!editing ? (
              healthTests.length > 0 ? (
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:20}}>
                  {healthTests.map((h:any)=>(
                    <span key={h} className="badge badge-ready" style={{fontSize:13,padding:'5px 14px'}}>{h}</span>
                  ))}
                </div>
              ) : (
                <p style={{fontSize:14,color:'var(--ink-4)',marginBottom:20}}>No health tests recorded. Click Edit to add.</p>
              )
            ) : editForm && (
              <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:20}}>
                {HEALTH_OPTIONS.map(h => {
                  const active = Object.values(editForm.health_tests||{}).includes(h)
                  return (
                    <button key={h} type="button" onClick={()=>toggleHealth(h)}
                      style={{padding:'6px 14px',borderRadius:20,fontSize:13,fontWeight:500,cursor:'pointer',border:'1px solid',transition:'all .15s',
                        borderColor:active?'var(--forest)':'var(--paper-3)',
                        background:active?'var(--sage-l)':'var(--white)',
                        color:active?'var(--forest)':'var(--ink-4)'}}>
                      {active ? '✓ ' : ''}{h}
                    </button>
                  )
                })}
              </div>
            )}

            <div style={{paddingTop:16,borderTop:'1px solid var(--paper-3)'}}>
              <div className="section-label" style={{marginBottom:12}}>Litters with {dog.name}</div>
              <Link href={`/dashboard/litters/new`} className="btn-primary" style={{textDecoration:'none',justifyContent:'center',fontSize:13,display:'flex'}}>
                + Create Litter
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
