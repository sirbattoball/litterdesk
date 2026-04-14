'use client'

import { useQuery } from '@tanstack/react-query'
import { littersApi } from '@/lib/api'
import Link from 'next/link'
import { format } from 'date-fns'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  planned:  { label: 'Planned',      cls: 'badge-planned' },
  pregnant: { label: 'Pregnant',     cls: 'badge-pregnant' },
  born:     { label: 'Born',         cls: 'badge-born' },
  weaning:  { label: 'Weaning',      cls: 'badge-weaning' },
  ready:    { label: 'Ready to go',  cls: 'badge-ready' },
  complete: { label: 'Complete',     cls: 'badge-complete' },
}

function LitterCard({ litter }: { litter: any }) {
  const s = STATUS_MAP[litter.status] ?? STATUS_MAP.planned
  const total = (litter.num_males ?? 0) + (litter.num_females ?? 0)
  return (
    <Link href={`/dashboard/litters/${litter.id}`} style={{ textDecoration: 'none' }}>
      <div className="litter-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="litter-name">{litter.name ?? `${litter.breed} Litter`}</div>
            <div className="litter-breed">{litter.breed}</div>
          </div>
          <span className={`badge ${s.cls}`}>{s.label}</span>
        </div>
        <div className="litter-stats">
          <div><div className="litter-stat-val">{total || '—'}</div><div className="litter-stat-key">Puppies</div></div>
          <div><div className="litter-stat-val">{total ? `${litter.num_males}M/${litter.num_females}F` : '—'}</div><div className="litter-stat-key">Sex split</div></div>
          <div><div className="litter-stat-val">{litter.puppy_price ? `$${litter.puppy_price.toLocaleString()}` : '—'}</div><div className="litter-stat-key">Per puppy</div></div>
        </div>
        {litter.go_home_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-4)', marginTop: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Go home: {format(new Date(litter.go_home_date), 'MMM d, yyyy')}
          </div>
        )}
      </div>
    </Link>
  )
}

export default function LittersPage() {
  const { data: litters, isLoading } = useQuery({ queryKey: ['litters'], queryFn: () => littersApi.list().then(r => r.data) })
  const active = litters?.filter((l: any) => l.status !== 'complete') ?? []
  const done = litters?.filter((l: any) => l.status === 'complete') ?? []

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Litters</div>
          <div className="topbar-sub">Track every litter from planned breeding to placement</div>
        </div>
        <div className="topbar-right">
          <Link href="/dashboard/litters/new" className="btn-primary">+ New Litter</Link>
        </div>
      </div>

      <div className="page-body">
        {isLoading && <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-4)' }}>Loading litters…</div>}

        {!isLoading && litters?.length === 0 && (
          <div className="empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <div className="empty-title">No litters yet</div>
            <div className="empty-sub">Add your first litter to start tracking your breeding program</div>
            <Link href="/dashboard/litters/new" className="btn-primary">Add First Litter</Link>
          </div>
        )}

        {active.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div className="section-label">Active — {active.length} litter{active.length !== 1 ? 's' : ''}</div>
            <div className="litter-grid">
              {active.map((l: any) => <LitterCard key={l.id} litter={l} />)}
            </div>
          </div>
        )}

        {done.length > 0 && (
          <div style={{ opacity: .65 }}>
            <div className="section-label">Completed — {done.length}</div>
            <div className="litter-grid">
              {done.map((l: any) => <LitterCard key={l.id} litter={l} />)}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
