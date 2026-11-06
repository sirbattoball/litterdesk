'use client'
import { QueryFailure } from '@/components/QueryFailure'
import { BuyerEditor } from '@/components/BuyerEditor'
import { BuyerCommunications } from '@/components/BuyerCommunications'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { buyersApi, aiApi, littersApi } from '@/lib/api'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuthStore, isPro } from '@/lib/store'

const STATUS_OPTIONS = ['inquiry','waitlisted','deposit_paid','contract_sent','matched','complete']
const BADGE: Record<string,string> = {
  inquiry:'badge-inquiry',waitlisted:'badge-waitlisted',deposit_paid:'badge-deposit',
  matched:'badge-signed',contract_sent:'badge-sent',complete:'badge-complete'
}

const EMAIL_TYPES = [
  { value: 'inquiry_response', label: 'Reply to Inquiry' },
  { value: 'waitlist_update', label: 'Waitlist Update' },
  { value: 'deposit_request', label: 'Request Deposit' },
  { value: 'go_home_reminder', label: 'Go-Home Reminder' },
]

export default function BuyerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const router = useRouter()
  const qc = useQueryClient()

  const [notes, setNotes] = useState<string | null>(null)
  const [savingNotes, setSavingNotes] = useState(false)
  const [emailDraft, setEmailDraft] = useState<any>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [emailType, setEmailType] = useState('inquiry_response')
  const [emailContext, setEmailContext] = useState('')
  const [showEmailPanel, setShowEmailPanel] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showAddLitter, setShowAddLitter] = useState(false)
  const [selectedLitter, setSelectedLitter] = useState('')
  const [adding, setAdding] = useState(false)

  const { data: buyer, isLoading, isError, refetch } = useQuery({
    queryKey: ['buyer', id],
    queryFn: () => buyersApi.get(id).then(r => r.data),
  })

  const { data: litters } = useQuery({
    queryKey: ['litters'],
    queryFn: () => littersApi.list().then(r => r.data),
    enabled: showAddLitter,
  })

  const { data: waitlists } = useQuery({ queryKey: ['buyer-waitlists', id], queryFn: () => buyersApi.waitlists(id).then(r => r.data) })
  const saveNotes = async () => {
    setSavingNotes(true)
    try { await buyersApi.update(id, { lifestyle_notes: notes ?? buyer?.lifestyle_notes ?? '' }); await qc.invalidateQueries({ queryKey: ['buyer', id] }); setNotes(null); toast.success('Notes saved') }
    catch (err: any) { toast.error(err.response?.data?.detail || 'Could not save notes') }
    finally { setSavingNotes(false) }
  }
  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true)
    try {
      await buyersApi.update(id, { status: newStatus })
      qc.invalidateQueries({ queryKey: ['buyer', id] })
      qc.invalidateQueries({ queryKey: ['buyers'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      toast.success(`Status updated to ${newStatus.replace('_',' ')}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update status')
    } finally { setUpdatingStatus(false) }
  }

  const handleDraftEmail = async () => {
    if (!isPro(user)) { toast.error('Email drafting requires Pro plan'); return }
    setDraftLoading(true)
    try {
      const res = await aiApi.draftEmail({ buyer_id: id, email_type: emailType, context: emailContext })
      setEmailDraft(res.data)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to draft email. Check Anthropic API key.')
    } finally { setDraftLoading(false) }
  }

  const handleAddToWaitlist = async () => {
    if (!selectedLitter) { toast.error('Select a litter first'); return }
    setAdding(true)
    try {
      await buyersApi.addToWaitlist(id, selectedLitter)
      toast.success('Added to litter waitlist!')
      setShowAddLitter(false)
      setSelectedLitter('')
      qc.invalidateQueries({ queryKey: ['buyer-waitlists', id] })
      qc.invalidateQueries({ queryKey: ['buyer', id] })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add to waitlist')
    } finally { setAdding(false) }
  }

  const copyEmail = async () => {
    if (!emailDraft) return
    try { await navigator.clipboard.writeText(`Subject: ${emailDraft.subject}\n\n${emailDraft.body}`); toast.success('Copied to clipboard!') }
    catch { toast.error('Copy is unavailable. Select and copy the draft text instead.') }
  }

  if (isError) return <QueryFailure retry={() => { refetch() }} />

  if (isLoading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:64}}><div className="spinner" style={{width:32,height:32}}/></div>
  if (!buyer) return (
    <div className="page-body">
      <div className="empty">
        <div className="empty-title">Buyer not found</div>
        <Link href="/dashboard/buyers" className="btn-primary">← Back to Buyers</Link>
      </div>
    </div>
  )

  const COLORS = ['#2d6b4a','#1e4d7a','#9e3d56','#a85e2a']
  const avatarColor = COLORS[buyer.full_name.charCodeAt(0) % COLORS.length]

  return (
    <>
      <div className="topbar">
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div className="avatar" style={{background:`linear-gradient(135deg,${avatarColor},${avatarColor}99)`,width:38,height:38,fontSize:15}}>
            {buyer.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="topbar-title">{buyer.full_name}</div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginTop:2}}>
              <span className={`badge ${BADGE[buyer.status] ?? 'badge-inquiry'}`}>{buyer.status?.replace('_',' ')}</span>
            </div>
          </div>
        </div>
        <div className="topbar-right">
          <button onClick={()=>setShowEmailPanel(!showEmailPanel)} className="btn-ghost">
            ✉ Draft Email {isPro(user) ? '' : '(Pro)'}
          </button>
          <Link href="/dashboard/buyers" className="btn-ghost">← Buyers</Link>
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{padding:20,marginBottom:16}}><BuyerEditor buyer={buyer} onSaved={() => {qc.invalidateQueries({queryKey:['buyer',id]});qc.invalidateQueries({queryKey:['buyers']});qc.invalidateQueries({queryKey:['dashboard-stats']})}}/></div>
        <div className="two-col">
          {/* Left: Info + Status */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {/* Contact */}
            <div className="card" style={{padding:20}}>
              <div className="section-label" style={{marginBottom:14}}>Contact Info</div>
              <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {[
                  ['Email', buyer.email],
                  ['Phone', buyer.phone || '—'],
                  ['Source', buyer.referral_source || '—'],
                  ['Added', buyer.created_at ? format(parseISO(buyer.created_at),'MMM d, yyyy') : '—'],
                ].map(([k,v]) => (
                  <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:14,padding:'10px 0',borderBottom:'1px solid var(--paper-3)'}}>
                    <span style={{color:'var(--ink-4)'}}>{k}</span>
                    <span style={{fontWeight:500,color:'var(--ink)'}}>
                      {k==='Email' ? <a href={`mailto:${v}`} style={{color:'var(--forest)',textDecoration:'none'}}>{v}</a> : v}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferences */}
            <div className="card" style={{padding:20}}>
              <div className="section-label" style={{marginBottom:14}}>Preferences</div>
              <div style={{display:'flex',flexDirection:'column',gap:0}}>
                {[
                  ['Breed', buyer.breed_preference || '—'],
                  ['Sex', buyer.sex_preference || 'No preference'],
                  ['Budget', buyer.budget_min && buyer.budget_max ? `$${buyer.budget_min.toLocaleString()} – $${buyer.budget_max.toLocaleString()}` : buyer.budget_max ? `Up to $${buyer.budget_max.toLocaleString()}` : '—'],
                  ['Timeline', buyer.timeline || '—'],
                ].map(([k,v]) => (
                  <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:14,padding:'10px 0',borderBottom:'1px solid var(--paper-3)'}}>
                    <span style={{color:'var(--ink-4)'}}>{k}</span>
                    <span style={{fontWeight:500,color:'var(--ink)'}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="card" style={{padding:20}}>
              <div className="section-label" style={{marginBottom:14}}>Update Status</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {STATUS_OPTIONS.map(s => (
                  <button key={s} onClick={()=>handleStatusChange(s)} disabled={updatingStatus||buyer.status===s}
                    className={buyer.status===s ? 'btn-primary' : 'btn-ghost'}
                    style={{fontSize:12.5,padding:'6px 14px',opacity:buyer.status===s?1:.8}}>
                    {s.replace('_',' ')}
                    {buyer.status===s ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Notes + AI + Waitlist */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {/* Notes */}
            <div className="card" style={{padding:20}}>
              <div className="section-label" style={{marginBottom:10}}>Notes & Application</div>
              <label className="label" htmlFor="buyer-notes">Buyer notes</label>
              <textarea id="buyer-notes" className="input" rows={5} value={notes ?? buyer.lifestyle_notes ?? ''} onChange={e => setNotes(e.target.value)} />
              <button className="btn-primary" style={{marginTop:10}} disabled={savingNotes || notes === null} onClick={saveNotes}>{savingNotes ? 'Saving…' : 'Save notes'}</button>

            </div>

            {/* Add to waitlist */}
            <div className="card" style={{padding:20}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div className="section-label" style={{marginBottom:0}}>Litter Waitlists</div>
                <button onClick={()=>setShowAddLitter(!showAddLitter)} className="ai-pill">
                  {showAddLitter ? 'Cancel' : '+ Add to Litter'}
                </button>
              </div>
              {waitlists?.map((w:any) => <p key={w.litter_id} style={{marginBottom:10,fontSize:13}}><Link href={`/dashboard/litters/${w.litter_id}`}>{w.litter_name} · Position {w.position}{w.deposit_paid ? ' · Deposit paid' : ''}</Link></p>)}
              {showAddLitter && (
                <div style={{marginBottom:14,padding:14,background:'var(--paper)',borderRadius:'var(--r-lg)',border:'1px solid var(--paper-3)'}}>
                  <label className="label" htmlFor="field-select-litter-1">Select litter</label>
                  <select id="field-select-litter-1" className="input" value={selectedLitter} onChange={e=>setSelectedLitter(e.target.value)} style={{marginBottom:10}}>
                    <option value="">Choose litter…</option>
                    {litters?.map((l:any)=><option key={l.id} value={l.id}>{l.name??l.breed} ({l.status})</option>)}
                  </select>
                  <button onClick={handleAddToWaitlist} disabled={adding} className="btn-primary" style={{fontSize:13,padding:'8px 16px'}}>
                    {adding ? 'Adding…' : 'Add to Waitlist'}
                  </button>
                </div>
              )}
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <Link href={`/dashboard/contracts/new?buyer=${id}`} className="btn-primary" style={{textDecoration:'none',justifyContent:'center',fontSize:13}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  Create contract for this buyer
                </Link>
              </div>
            </div>

            {/* Email draft panel */}
            {showEmailPanel && (
              <div className="card" style={{padding:20}}>
                <div className="section-label" style={{marginBottom:14}}>AI Email Draft</div>
                <div className="field">
                  <label className="label" htmlFor="field-email-type-2">Email type</label>
                  <select id="field-email-type-2" className="input" value={emailType} onChange={e=>setEmailType(e.target.value)}>
                    {EMAIL_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Context <span style={{color:'var(--ink-4)',fontWeight:400}}>(optional)</span></label>
                  <textarea className="input" rows={2} placeholder="e.g. Their litter is due April 15, puppy 3 weeks old" value={emailContext} onChange={e=>setEmailContext(e.target.value)} style={{resize:'vertical'}}/>
                </div>
                <button onClick={handleDraftEmail} disabled={draftLoading||!isPro(user)} className="btn-primary" style={{fontSize:13,marginBottom:14}}>
                  {draftLoading ? 'Drafting…' : '⚡ Draft with Claude'}
                </button>
                {!isPro(user) && <p style={{fontSize:12,color:'var(--amber)',marginTop:-10,marginBottom:10}}>Pro plan required · <Link href="/dashboard/upgrade" style={{color:'var(--amber)'}}>Upgrade →</Link></p>}
                {emailDraft && (
                  <div className="ai-result">
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                      <div className="ai-result-label">Draft ready</div>
                      <button onClick={copyEmail} className="ai-pill">📋 Copy all</button>
                    </div>
                    <div style={{fontSize:12,fontWeight:600,color:'var(--ink-3)',marginBottom:4}}>Subject: {emailDraft.subject}</div>
                    <p style={{fontSize:13,color:'var(--ink-2)',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{emailDraft.body}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <BuyerCommunications buyerId={id}/>
      </div>
    </>
  )
}
