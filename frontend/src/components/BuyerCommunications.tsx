'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { buyersApi } from '@/lib/api'
import toast from 'react-hot-toast'
export function BuyerCommunications({buyerId}:{buyerId:string}){
  const [body,setBody]=useState(''),[busy,setBusy]=useState(false)
  const {data,isLoading,isError,refetch}=useQuery({queryKey:['buyer-communications',buyerId],queryFn:()=>buyersApi.communications(buyerId).then(r=>r.data)})
  const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);try{await buyersApi.logContact(buyerId,{channel:'note',direction:'outbound',body});setBody('');await refetch();toast.success('Contact logged')}catch(err:any){toast.error(err.response?.data?.detail||'Could not log contact')}finally{setBusy(false)}}
  return <div className="card" style={{padding:20,marginTop:20}}><h3>Contact history</h3><p style={{fontSize:13,margin:'8px 0 14px'}}>Record a call or conversation here. Logging a note does not send a message.</p><form onSubmit={save}><label className="label" htmlFor="contact-note">Conversation note</label><textarea id="contact-note" className="input" required rows={3} value={body} onChange={e=>setBody(e.target.value)}/><button className="btn-ghost" style={{marginTop:10}} disabled={busy||!body.trim()}>{busy?'Saving…':'Log contact'}</button></form>{isLoading?<p>Loading history…</p>:isError?<p>Could not load history. <button onClick={()=>refetch()}>Try again</button></p>:data?.map((c:any)=><div key={c.id} style={{padding:'15px 0',borderBottom:'1px solid var(--paper-3)'}}><small>{new Date(c.sent_at).toLocaleString()} · {c.channel}</small><p style={{whiteSpace:'pre-wrap'}}>{c.body}</p></div>)}</div>
}
