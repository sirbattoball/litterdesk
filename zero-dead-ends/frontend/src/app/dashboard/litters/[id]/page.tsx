'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { littersApi, buyersApi, aiApi } from '@/lib/api'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useState } from 'react'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  planned:  { label: 'Planned',      cls: 'badge-planned' },
  pregnant: { label: 'Pregnant',     cls: 'badge-pregnant' },
  born:     { label: 'Born',         cls: 'badge-born' },
  weaning:  { label: 'Weaning',      cls: 'badge-weaning' },
  ready:    { label: 'Ready to go',  cls: 'badge-ready' },
  complete: { label: 'Complete',     cls: 'badge-complete' },
}

const STATUS_NEXT: Record<string, string> = {
  planned: 'pregnant', pregnant: 'born', born: 'weaning',
  weaning: 'ready', ready: 'complete'
}

export default function LitterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [announcing, setAnnouncing] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showAddBuyer, setShowAddBuyer] = useState(false)
  const [addingBuyerId, setAddingBuyerId] = useState('')
  const [adding, setAdding] = useState(false)

  const { data: litter, isLoading } = useQuery({
    queryKey: ['litter', id],
    queryFn: () => littersApi.get(id).then(r => r.data)
  })
  const { data: waitlist, refetch: refetchWaitlist } = useQuery({
    queryKey: ['litter-waitlist', id],
    queryFn: () => littersApi.waitlist(id).then(r => r.data)
  })
  const { data: allBuyers } = useQuery({
    queryKey: ['buyers'],
    queryFn: () => buyersApi.list().then(r => r.data),
    enabled: showAddBuyer,
  })

  const s = litter ? (STATUS_MAP[litter.status] ?? STATUS_MAP.planned) : null

  const handleAnnounce = async () => {
    setAnnouncing(true)
    try {
      const res = await aiApi.litterAnnouncement(id)
      toast.success('Announcement drafted! Check your email.')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'AI announcement requires Pro plan')
    } finally { setAnnouncing(false) }
  }

  const handleAdvanceStatus = async () => {
    if (!litter || !STATUS_NEXT[litter.status]) return
    setUpdatingStatus(true)
    try {
      await littersApi.update(id, { status: STATUS_NEXT[litter.status] })
      qc.invalidateQueries({ queryKey: ['litter', id] })
      qc.invalidateQueries({ queryKey: ['litters'] })
      toast.success(`Status updated to ${STATUS_NEXT[litter.status]}!`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update status')
    } finally { setUpdatingStatus(false) }
  }

  const handleAddToWaitlist = async () => {
    if (!addingBuyerId) { toast.error('Select a buyer first'); return }
    setAdding(true)
    try {
      await buyersApi.addToWaitlist(addingBuyerId, id)
      refetchWaitlist()
      setShowAddBuyer(false)
      setAddingBuyerId('')
      toast.success('Buyer added to waitlist!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add buyer to waitlist')
    } finally { setAdding(false) }
  }

  if (isLoading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:64}}>
      <div className="spinner" style={{width:32,height:32}}/>
    </div>
  )

  if (!litter) return (
    <div className="page-body">
      <div className="empty">
        <div className="empty-title">Litter not found</div>
        <Link href="/dashboard/litters" className="btn-primary">← Back to Litters</Link>
      </div>
    </div>
  )

  const total = (litter.num_males ?? 0) + (litter.num_females ?? 0)
  const nextStatus = STATUS_NEXT[litter.status]

  return (
    <>
      <div className="topbar">
        <div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div className="topbar-title">{litter.name ?? `${litter.breed} Litter`}</div>
            {s && <span className={`badge ${s.cls}`}>{s.label}</span>}
          </div>
          <div className="topbar-sub">{litter.breed}</div>
        </div>
        <div className="topbar-right">
          {nextStatus && (
            <button onClick={handleAdvanceStatus} disabled={updatingStatus} className="btn-ghost">
              {updatingStatus ? 'Updating…' : `Mark as ${nextStatus} →`}
            </button>
          )}
          <button onClick={handleAnnounce} disabled={announcing} className="btn-ghost">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            {announcing ? 'Drafting…' : 'AI Announcement'}
          </button>
          <Link href="/dashboard/litters" className="btn-ghost">← Litters</Link>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="three-col" style={{marginBottom:20}}>
          {[
            ['Puppies', total || '—'],
            ['Sex split', total ? `${litter.num_males}M / ${litter.num_females}F` : '—'],
            ['Price each', litter.puppy_price ? `$${litter.puppy_price.toLocaleString()}` : '—'],
            ['Whelp date', litter.whelp_date ? format(new Date(litter.whelp_date),'MMM d, yyyy') : '—'],
            ['Go-home', litter.go_home_date ? format(new Date(litter.go_home_date),'MMM d, yyyy') : '—'],
            ['Waitlist', waitlist?.length ?? 0],
          ].map(([l,v]: any) => (
            <div key={l} className="stat-card">
              <div className="stat-label">{l}</div>
              <div className="stat-value" style={{fontSize:22}}>{v}</div>
            </div>
          ))}
        </div>

        <div className="two-col">
          {/* Waitlist */}
          <div className="card" style={{padding:20}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700}}>Waitlist ({waitlist?.length ?? 0})</h3>
              <button onClick={()=>setShowAddBuyer(!showAddBuyer)} className="ai-pill">
                {showAddBuyer ? 'Cancel' : '+ Add Buyer'}
              </button>
            </div>

            {showAddBuyer && (
              <div style={{background:'var(--paper)',borderRadius:'var(--r-lg)',padding:14,marginBottom:14,border:'1px solid var(--paper-3)'}}>
                <label className="label">Select buyer to add</label>
                <select className="input" value={addingBuyerId} onChange={e=>setAddingBuyerId(e.target.value)} style={{marginBottom:10}}>
                  <option value="">Choose buyer…</option>
                  {allBuyers?.map((b:any)=><option key={b.id} value={b.id}>{b.full_name} ({b.email})</option>)}
                </select>
                <button onClick={handleAddToWaitlist} disabled={adding} className="btn-primary" style={{fontSize:13,padding:'8px 16px'}}>
                  {adding ? 'Adding…' : 'Add to Waitlist'}
                </button>
              </div>
            )}

            {waitlist?.length === 0 && !showAddBuyer && (
              <p style={{fontSize:14,color:'var(--ink-4)',textAlign:'center',padding:'24px 0'}}>
                No buyers on waitlist yet.<br/>
                <button onClick={()=>setShowAddBuyer(true)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--forest)',fontSize:14,fontWeight:500,marginTop:8}}>Add a buyer →</button>
              </p>
            )}

            {waitlist?.map((w:any, i:number) => (
              <div key={w.id ?? i} className="activity-item">
                <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,var(--forest),var(--forest-ll))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:700,flexShrink:0}}>
                  {i+1}
                </div>
                <div style={{flex:1}}>
                  <Link href={`/dashboard/buyers/${w.buyer_id}`} style={{fontSize:14,fontWeight:600,color:'var(--ink)',textDecoration:'none'}}>
                    {w.buyer_name ?? `Buyer ${i+1}`}
                  </Link>
                  <div className="activity-time">{w.sex_preference ? `Wants: ${w.sex_preference}` : 'No sex preference'}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Litter Info */}
          <div className="card" style={{padding:20}}>
            <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Details</h3>
            {litter.notes && (
              <p style={{fontSize:14,color:'var(--ink-3)',lineHeight:1.6,marginBottom:16,padding:'12px',background:'var(--paper)',borderRadius:'var(--r-lg)'}}>{litter.notes}</p>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {[
                ['Breed', litter.breed],
                ['Dam', litter.dam?.name ?? '—'],
                ['Sire', litter.sire?.name ?? '—'],
                ['Status', litter.status?.charAt(0).toUpperCase()+litter.status?.slice(1)],
                ['Puppy price', litter.puppy_price ? `$${litter.puppy_price.toLocaleString()}` : '—'],
              ].map(([k,v]) => (
                <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:14,padding:'10px 0',borderBottom:'1px solid var(--paper-3)'}}>
                  <span style={{color:'var(--ink-4)'}}>{k}</span>
                  <span style={{fontWeight:600,color:'var(--ink)'}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:8}}>
              <Link href={`/dashboard/contracts/new?litter=${id}`} className="btn-primary" style={{textDecoration:'none',justifyContent:'center'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Generate AI Contract
              </Link>
              <Link href={`/dashboard/buyers/new`} className="btn-ghost" style={{textDecoration:'none',justifyContent:'center'}}>
                + Add Buyer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
