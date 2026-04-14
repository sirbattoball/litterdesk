'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { littersApi, aiApi } from '@/lib/api'
import { useParams, useRouter } from 'next/navigation'
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

export default function LitterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [announcing, setAnnouncing] = useState(false)

  const { data: litter, isLoading } = useQuery({ queryKey: ['litter', id], queryFn: () => littersApi.get(id).then(r=>r.data) })
  const { data: waitlist } = useQuery({ queryKey: ['litter-waitlist', id], queryFn: () => littersApi.waitlist(id).then(r=>r.data) })

  const s = litter ? (STATUS_MAP[litter.status] ?? STATUS_MAP.planned) : null

  const handleAnnounce = async () => {
    setAnnouncing(true)
    try {
      const res = await aiApi.litterAnnouncement(id)
      toast.success('Announcement drafted!')
    } catch { toast.error('AI announcement requires Pro plan') }
    finally { setAnnouncing(false) }
  }

  if (isLoading) return <div style={{padding:64,textAlign:'center',color:'var(--ink-4)'}}>Loading…</div>
  if (!litter) return <div style={{padding:64,textAlign:'center',color:'var(--ink-4)'}}>Litter not found. <Link href="/dashboard/litters" style={{color:'var(--forest)'}}>Go back</Link></div>

  const total = (litter.num_males ?? 0) + (litter.num_females ?? 0)

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
          <button onClick={handleAnnounce} disabled={announcing} className="btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            {announcing ? 'Drafting…' : 'AI Announcement'}
          </button>
          <Link href="/dashboard/litters" className="btn-ghost">← Litters</Link>
        </div>
      </div>

      <div className="page-body">
        <div className="three-col" style={{marginBottom:20}}>
          {[
            ['Puppies', total || '—', ''],
            ['Sex split', total ? `${litter.num_males}M / ${litter.num_females}F` : '—', ''],
            ['Price each', litter.puppy_price ? `$${litter.puppy_price.toLocaleString()}` : '—', ''],
            litter.whelp_date ? ['Whelp date', format(new Date(litter.whelp_date), 'MMM d, yyyy'), ''] : ['Whelp date', '—', ''],
            litter.go_home_date ? ['Go-home', format(new Date(litter.go_home_date), 'MMM d, yyyy'), ''] : ['Go-home', '—', ''],
            ['Waitlist', waitlist?.length ?? 0, ''],
          ].map(([l,v]: any) => (
            <div key={l} className="stat-card">
              <div className="stat-label">{l}</div>
              <div className="stat-value" style={{fontSize:22}}>{v}</div>
            </div>
          ))}
        </div>

        <div className="two-col">
          <div className="card" style={{padding:20}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:600}}>Waitlist</h3>
              <Link href="/dashboard/buyers" style={{fontSize:13,color:'var(--forest)',textDecoration:'none'}}>View all buyers →</Link>
            </div>
            {waitlist?.length === 0 && <p style={{fontSize:14,color:'var(--ink-4)',textAlign:'center',padding:'24px 0'}}>No buyers on waitlist yet.</p>}
            {waitlist?.map((w:any, i:number) => (
              <div key={w.id} className="activity-item">
                <div style={{width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,var(--forest),var(--forest-ll))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#fff',fontWeight:600,flexShrink:0}}>
                  {i+1}
                </div>
                <div>
                  <Link href={`/dashboard/buyers/${w.buyer_id}`} style={{fontSize:14,fontWeight:500,color:'var(--ink)',textDecoration:'none'}}>{w.buyer_name ?? 'Buyer'}</Link>
                  <div className="activity-time">{w.sex_preference ? `Wants: ${w.sex_preference}` : 'No preference'}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{padding:20}}>
            <h3 style={{fontSize:15,fontWeight:600,marginBottom:16}}>Litter Info</h3>
            {litter.notes && <p style={{fontSize:14,color:'var(--ink-3)',lineHeight:1.6,marginBottom:16}}>{litter.notes}</p>}
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                ['Dam', litter.dam_name ?? '—'],
                ['Sire', litter.sire_name ?? '—'],
                ['Status', litter.status?.charAt(0).toUpperCase()+litter.status?.slice(1)],
              ].map(([k,v]) => (
                <div key={k} style={{display:'flex',justifyContent:'space-between',fontSize:14,padding:'8px 0',borderBottom:'1px solid var(--paper-3)'}}>
                  <span style={{color:'var(--ink-4)'}}>{k}</span>
                  <span style={{fontWeight:500}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:16}}>
              <Link href={`/dashboard/contracts/new?litter=${id}`} className="btn-primary" style={{width:'100%',justifyContent:'center',textDecoration:'none'}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Generate AI Contract
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
