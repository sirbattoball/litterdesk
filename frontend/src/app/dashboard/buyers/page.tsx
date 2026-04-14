'use client'

import { useQuery } from '@tanstack/react-query'
import { buyersApi, aiApi } from '@/lib/api'
import Link from 'next/link'
import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'

const STATUSES = [
  { key: '', label: 'All' },
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'waitlisted', label: 'Waitlisted' },
  { key: 'deposit_paid', label: 'Deposit Paid' },
  { key: 'matched', label: 'Matched' },
  { key: 'complete', label: 'Complete' },
]

const BADGE: Record<string, string> = {
  inquiry: 'badge-inquiry', waitlisted: 'badge-waitlisted',
  deposit_paid: 'badge-deposit', matched: 'badge-signed',
  contract_sent: 'badge-sent', complete: 'badge-complete',
}

const COLORS = ['#2d6b4a','#1e4d7a','#9e3d56','#a85e2a','#4c3980','#1a6b6b']

export default function BuyersPage() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [scoringId, setScoringId] = useState<string|null>(null)
  const qc = require('@tanstack/react-query').useQueryClient()

  const { data: buyers, isLoading } = useQuery({
    queryKey: ['buyers', search, status],
    queryFn: () => buyersApi.list({ search: search || undefined, status: status || undefined }).then(r => r.data),
  })

  const handleScore = async (b: any) => {
    if (!user?.subscription_active) { toast.error('AI scoring requires Pro plan'); return }
    setScoringId(b.id)
    try {
      await aiApi.scoreBuyer(b.id)
      toast.success('Buyer scored!')
      qc.invalidateQueries({ queryKey: ['buyers'] })
    } catch { toast.error('Scoring failed') }
    finally { setScoringId(null) }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Buyers</div>
          <div className="topbar-sub">{buyers?.length ?? 0} buyers in your pipeline</div>
        </div>
        <div className="topbar-right">
          <Link href="/dashboard/buyers/new" className="btn-primary">+ Add Buyer</Link>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="2" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input className="input" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, width: 220 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => setStatus(s.key)}
                className="badge"
                style={{ cursor:'pointer', padding:'6px 14px', fontSize:12.5, background: status===s.key ? 'var(--ink)' : 'var(--white)', color: status===s.key ? '#fff' : 'var(--ink-3)', border: status===s.key ? 'none' : '1px solid var(--paper-3)', borderRadius: 20 }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && <div style={{ textAlign:'center', padding:48, color:'var(--ink-4)' }}>Loading…</div>}

        {!isLoading && buyers?.length === 0 && (
          <div className="empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            <div className="empty-title">No buyers yet</div>
            <div className="empty-sub">Add buyers manually or share your inquiry page</div>
            <Link href="/dashboard/buyers/new" className="btn-primary">Add First Buyer</Link>
          </div>
        )}

        {buyers && buyers.length > 0 && (
          <div className="data-table">
            <div className="table-head" style={{ gridTemplateColumns: '2fr 1.2fr 1fr 90px 80px' }}>
              <div className="th">Buyer</div>
              <div className="th">Preference</div>
              <div className="th">Status</div>
              <div className="th">AI Score</div>
              <div className="th"></div>
            </div>
            {buyers.map((b: any, i: number) => (
              <div key={b.id} className="table-row" style={{ gridTemplateColumns: '2fr 1.2fr 1fr 90px 80px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div className="avatar avatar-sm" style={{ background: `linear-gradient(135deg, ${COLORS[i%COLORS.length]}, ${COLORS[(i+2)%COLORS.length]})` }}>
                    {b.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <Link href={`/dashboard/buyers/${b.id}`} style={{ fontSize:14, fontWeight:500, color:'var(--ink)', textDecoration:'none' }}>{b.full_name}</Link>
                    <div style={{ fontSize:12, color:'var(--ink-4)' }}>{b.email}</div>
                  </div>
                </div>
                <div style={{ fontSize:13, color:'var(--ink-3)' }}>{b.breed_preference ?? '—'} {b.sex_preference ? `· ${b.sex_preference}` : ''}</div>
                <div><span className={`badge ${BADGE[b.status] ?? 'badge-inquiry'}`}>{b.status?.replace('_',' ')}</span></div>
                <div>
                  {b.priority_score > 0 && (
                    <span className={`badge ${b.priority_score>=70?'score-high':b.priority_score>=40?'score-mid':'score-low'}`}>
                      ★ {b.priority_score}
                    </span>
                  )}
                </div>
                <div>
                  <button onClick={() => handleScore(b)} disabled={scoringId===b.id} className="ai-pill">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    {scoringId===b.id ? '…' : 'Score'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
