'use client'
import { useState } from 'react'
import { buyersApi } from '@/lib/api'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
export function BuyerEditor({buyer,onSaved}:{buyer:any;onSaved:()=>void}){
  const [open,setOpen]=useState(false),[form,setForm]=useState<any>({}),[busy,setBusy]=useState(false)
  const fields=[['full_name','Name','text'],['email','Email','email'],['phone','Phone','tel'],['breed_preference','Breed preference','text'],['sex_preference','Sex preference (male, female, or blank)','text'],['referral_source','Source','text'],['budget_min','Minimum budget ($)','number'],['budget_max','Maximum budget ($)','number'],['timeline','Timeline','text'],['follow_up_date','Next follow-up','date']]
  const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{const data:any={};for(const[key,,type]of fields)data[key]=type==='number'?(form[key]===''?null:Number(form[key])):key==='follow_up_date'?(form[key]?new Date(form[key]+'T12:00:00').toISOString():null):form[key]||null;await buyersApi.update(buyer.id,data);onSaved();setOpen(false);toast.success('Buyer details saved')}catch(err:any){toast.error(err.response?.data?.detail||'Could not save buyer')}finally{setBusy(false)}}
  if(!open)return <button className="btn-ghost" onClick={()=>{setForm(Object.fromEntries(fields.map(([k])=>[k,k==='follow_up_date'&&buyer[k]?format(parseISO(buyer[k]),'yyyy-MM-dd'):buyer[k]??''])));setOpen(true)}}>Edit buyer details</button>
  return <form onSubmit={save}><h3 style={{marginBottom:16}}>Buyer details</h3><div className="two-col">{fields.map(([key,label,type])=><div className="field" key={key}><label className="label" htmlFor={`edit-buyer-${key}`}>{label}</label><input id={`edit-buyer-${key}`} type={type} className="input" required={key==='full_name'||key==='email'} min={type==='number'?0:undefined} step={type==='number'?'0.01':undefined} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} onInput={e=>setForm({...form,[key]:(e.target as HTMLInputElement).value})}/></div>)}</div><div style={{display:'flex',gap:10}}><button disabled={busy} className="btn-primary">Save buyer details</button><button type="button" disabled={busy} className="btn-ghost" onClick={()=>setOpen(false)}>Cancel</button></div></form>
}
