'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { littersApi } from '@/lib/api'
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

function LitterCard({ litter, onDeleted }: { litter: any; onDeleted: () => void }) {
  const s = STATUS_MAP[litter.status] ?? STATUS_MAP.planned
  const total = (litter.num_males ?? 0) + (litter.num_females ?? 0)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this litter? This cannot be undone.')) return
    setDeleting(true)
    try {
      await littersApi.delete(litter.id)
      toast.success('Litter deleted')
      onDeleted()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete litter')
    } finally { setDeleting(false) }
  }

  return (
    <Link href={`/dashboard/litters/${litter.id}`} style={{ textDecoration: 'none' }}>
      <div className="litter-card">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="litter-name">{litter.name ?? `${litter.breed} Litter`}</div>
            <div className="litter-breed">{litter.breed}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge ${s.cls}`}>{s.label}</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete litter"
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, color: 'var(--red)', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
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
  const qc = useQueryClient()
  const { data: litters, isLoading } = useQuery({ queryKey: ['litters'], queryFn: () => littersApi.list().then(r => r.data) })
  const active = litters?.filter((l: any) => l.status !== 'complete') ?? []
  const done = litters?.filter((l: any) => l.status === 'complete') ?? []
  const refresh = () => qc.invalidateQueries({ queryKey: ['litters'] })

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
            <div className="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>
            <div className="empty-title">No litters yet</div>
            <div className="empty-sub">Add your first litter to start tracking your breeding program</div>
            <Link href="/dashboard/litters/new" className="btn-primary">Add First Litter</Link>
          </div>
        )}

        {active.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div className="section-label">Active — {active.length} litter{active.length !== 1 ? 's' : ''}</div>
            <div className="litter-grid">
              {active.map((l: any) => <LitterCard key={l.id} litter={l} onDeleted={refresh} />)}
            </div>
          </div>
        )}

        {done.length > 0 && (
          <div style={{ opacity: .65 }}>
            <div className="section-label">Completed — {done.length}</div>
            <div className="litter-grid">
              {done.map((l: any) => <LitterCard key={l.id} litter={l} onDeleted={refresh} />)}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
