'use client'
import { useQuery } from '@tanstack/react-query'
import { contractsApi } from '@/lib/api'
import Link from 'next/link'
import { format } from 'date-fns'

const BADGE: Record<string, string> = { draft:'badge-draft', sent:'badge-sent', signed:'badge-deposit', voided:'badge-complete' }

export default function ContractsPage() {
  const { data: contracts, isLoading } = useQuery({ queryKey: ['contracts'], queryFn: () => contractsApi.list().then(r => r.data) })
  const pending = contracts?.filter((c: any) => ['draft','sent'].includes(c.status)).length ?? 0
  const signed = contracts?.filter((c: any) => c.status === 'signed').length ?? 0

  return (
    <>
      <div className="topbar">
        <div><div className="topbar-title">Contracts</div><div className="topbar-sub">AI-generated, digitally signed</div></div>
        <div className="topbar-right">
          <Link href="/dashboard/contracts/new" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Generate AI Contract
          </Link>
        </div>
      </div>
      <div className="page-body">
        <div className="three-col" style={{ marginBottom:24 }}>
          {[['Drafts / Pending', pending, 'var(--amber)'],['Signed this month', signed, 'var(--forest-ll)'],['Total contracts', contracts?.length ?? 0, 'var(--ink-3)']].map(([l,v,c]: any) => (
            <div key={l} className="stat-card"><div className="stat-label">{l}</div><div className="stat-value" style={{ color:c }}>{v}</div></div>
          ))}
        </div>

        {isLoading && <div style={{ textAlign:'center', padding:48, color:'var(--ink-4)' }}>Loading…</div>}
        {!isLoading && contracts?.length === 0 && (
          <div className="empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <div className="empty-title">No contracts yet</div>
            <div className="empty-sub">Generate your first AI contract in seconds — breed-specific, legally informed</div>
            <Link href="/dashboard/contracts/new" className="btn-primary">Generate First Contract</Link>
          </div>
        )}

        {contracts && contracts.length > 0 && (
          <div className="data-table">
            {contracts.map((c: any) => (
              <div key={c.id} className="table-row" style={{ gridTemplateColumns:'1fr auto auto', gap:16 }}>
                <div>
                  <div style={{ fontWeight:500, fontSize:14 }}>{c.title ?? 'Puppy Sale Contract'}</div>
                  <div style={{ fontSize:12.5, color:'var(--ink-4)', marginTop:2 }}>{c.sale_price ? `$${c.sale_price.toLocaleString()}` : ''} {c.created_at ? `· Created ${format(new Date(c.created_at), 'MMM d')}` : ''}</div>
                </div>
                <span className={`badge ${BADGE[c.status] ?? 'badge-draft'}`}>{c.status}</span>
                <div style={{ display:'flex', gap:8 }}>
                  {c.status === 'draft' && <button className="btn-primary" style={{ fontSize:12, padding:'6px 12px' }} onClick={() => contractsApi.send(c.id)}>Send</button>}
                  {c.status === 'sent' && <button className="btn-ghost" style={{ fontSize:12, padding:'6px 12px' }}>Remind</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
