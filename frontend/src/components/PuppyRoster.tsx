'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { littersApi, aiApi } from '@/lib/api'
import { useAuthStore, isPro } from '@/lib/store'
import toast from 'react-hot-toast'
export function PuppyRoster({ litterId }: { litterId: string }) {
  const qc = useQueryClient(), { user } = useAuthStore()
  const [open,setOpen] = useState(false), [busy,setBusy] = useState(false), [matching,setMatching] = useState(false)
  const [matches,setMatches] = useState<any[] | null>(null)
  const [form,setForm] = useState({name:'',collar_color:'',sex:'female',color:'',is_keeper:false})
  const {data:puppies,isLoading,isError,refetch} = useQuery({queryKey:['puppies',litterId],queryFn:()=>littersApi.puppies(litterId).then(r=>r.data)})
  const add = async (e:React.FormEvent) => {e.preventDefault();setBusy(true);try{await littersApi.addPuppy(litterId,form);await refetch();qc.invalidateQueries({queryKey:['litter',litterId]});setOpen(false);setForm({name:'',collar_color:'',sex:'female',color:'',is_keeper:false});toast.success('Puppy added')}catch(err:any){toast.error(err.response?.data?.detail||'Could not add puppy')}finally{setBusy(false)}}
  const match = async () => {setMatching(true);try{const res=await aiApi.matchLitter(litterId);setMatches(res.data.matches);if(res.data.message)toast(res.data.message)}catch(err:any){toast.error(err.response?.data?.detail||'Could not suggest matches')}finally{setMatching(false)}}
  return <div className="card" style={{padding:20,marginTop:20}}><h3>Puppy profiles</h3><p style={{fontSize:13,margin:'8px 0 16px'}}>Add individual puppies for your records and Pro buyer-match suggestions. Birth counts remain editable above.</p><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn-ghost" onClick={()=>setOpen(!open)}>{open?'Cancel':'+ Add puppy'}</button>{isPro(user)&&<button className="btn-ghost" disabled={matching} onClick={match}>{matching?'Matching…':'Suggest buyer matches (Pro)'}</button>}</div>
  {open&&<form onSubmit={add} style={{marginTop:16}}><div className="two-col">{[['name','Puppy name'],['collar_color','Collar color'],['color','Coat color']].map(([key,label])=><div className="field" key={key}><label className="label" htmlFor={`puppy-${key}`}>{label}</label><input id={`puppy-${key}`} className="input" value={(form as any)[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></div>)}<div className="field"><label className="label" htmlFor="puppy-sex">Sex</label><select id="puppy-sex" className="input" value={form.sex} onChange={e=>setForm({...form,sex:e.target.value})}><option value="female">Female</option><option value="male">Male</option></select></div></div><label><input type="checkbox" checked={form.is_keeper} onChange={e=>setForm({...form,is_keeper:e.target.checked})}/> Staying with breeder</label><button className="btn-primary" disabled={busy} style={{marginLeft:12}}>{busy?'Saving…':'Save puppy'}</button></form>}
  {isLoading?<p>Loading puppies…</p>:isError?<p>Could not load puppies. <button onClick={()=>refetch()}>Retry</button></p>:!puppies?.length?<p style={{marginTop:16}}>No individual puppy profiles yet.</p>:<ul>{puppies.map((p:any)=><li key={p.id} style={{marginTop:12}}>{p.name||p.collar_color||'Puppy'} · {p.sex||'Sex not set'}{p.is_keeper?' · Staying with breeder':''}{p.color?` · ${p.color}`:''}</li>)}</ul>}
  {matches!==null&&<div style={{marginTop:20}}><h4>Suggestions for your review</h4><p>These suggestions do not assign puppies or change your waitlist.</p>{!matches.length?<p>No suggestions yet. Add available puppies and waitlisted buyers first.</p>:matches.map((m:any,i:number)=><p key={i} style={{marginTop:12}}><strong>{m.buyer_name} → {m.puppy_collar}</strong><br/>{m.match_reason}</p>)}</div>}</div>
}
