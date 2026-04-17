'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { contractsApi } from '@/lib/api'
import Link from 'next/link'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useState } from 'react'

const BADGE: Record<string, string> = {
  draft:'badge-draft', sent:'badge-sent', signed:'badge-deposit', voided:'badge-complete'
}

export default function ContractsPage() {
  const qc = useQueryClient()
  const [actionId, setActionId] = useState<string|null>(null)
  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list().then(r => r.data)
  })

  const pending = contracts?.filter((c: any) => ['draft','sent'].includes(c.status)).length ?? 0
  const signed = contracts?.filter((c: any) => c.status === 'signed').length ?? 0

  const handleSend = async (id: string) => {
    setActionId(id)
    try {
      await contractsApi.send(id)
      toast.success('Contract sent to buyer!')
      qc.invalidateQueries({ queryKey: ['contracts'] })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to send contract')
    } finally { setActionId(null) }
  }

  const handleResend = async (id: string) => {
    setActionId(id)
    try {
      await contractsApi.send(id)
      toast.success('Contract re-sent to buyer!')
      qc.invalidateQueries({ queryKey: ['contracts'] })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to resend contract')
    } finally { setActionId(null) }
  }

  const handleVoid = async (id: string) => {
    if (!confirm('Void this contract? This cannot be undone.')) return
    setActionId(id)
    try {
      await contractsApi.void(id)
      toast.success('Contract voided')
      qc.invalidateQueries({ queryKey: ['contracts'] })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to void contract')
    } finally { setActionId(null) }
  }

  return (
    <>
      <div className="topbar">
        <div><div className="topbar-title">Contracts</div><div className="topbar-sub">AI-generated · Digitally signed</div></div>
        <div className="topbar-right">
          <Link href="/dashboard/contracts/new" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Generate AI Contract
          </Link>
        </div>
      </div>

      <div className="page-body">
        <div className="three-col" style={{marginBottom:24}}>
          {[
            ['Drafts / Pending', pending, 'var(--amber)'],
            ['Signed', signed, 'var(--forest-ll)'],
            ['Total contracts', contracts?.length ?? 0, 'var(--ink-3)']
          ].map(([l,v,c]: any) => (
            <div key={l} className="stat-card">
              <div className="stat-label">{l}</div>
              <div className="stat-value" style={{color:c,fontSize:28}}>{v}</div>
            </div>
          ))}
        </div>

        {isLoading && <div style={{textAlign:'center',padding:48,color:'var(--ink-4)'}}>Loading…</div>}

        {!isLoading && contracts?.length === 0 && (
          <div className="empty">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="empty-title">No contracts yet</div>
            <div className="empty-sub">Generate your first AI contract — breed-specific, legally-informed, ready in 90 seconds</div>
            <Link href="/dashboard/contracts/new" className="btn-primary">Generate First Contract</Link>
          </div>
        )}

        {contracts && contracts.length > 0 && (
          <div className="data-table">
            {contracts.map((c: any) => (
              <div key={c.id} className="table-row" style={{gridTemplateColumns:'1fr auto auto auto',gap:16,alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:'var(--ink)'}}>{c.title ?? 'Puppy Sale Contract'}</div>
                  <div style={{fontSize:12.5,color:'var(--ink-4)',marginTop:2}}>
                    {c.sale_price ? `$${c.sale_price.toLocaleString()}` : ''}
                    {c.created_at ? ` · ${format(new Date(c.created_at),'MMM d, yyyy')}` : ''}
                    {c.buyer_name ? ` · ${c.buyer_name}` : ''}
                  </div>
                </div>
                <span className={`badge ${BADGE[c.status] ?? 'badge-draft'}`}>{c.status}</span>
                <div style={{display:'flex',gap:8}}>
                  {c.status === 'draft' && (
                    <button
                      disabled={actionId===c.id}
                      onClick={()=>handleSend(c.id)}
                      className="btn-primary"
                      style={{fontSize:12,padding:'6px 14px'}}>
                      {actionId===c.id ? 'Sending…' : 'Send →'}
                    </button>
                  )}
                  {c.status === 'sent' && (
                    <button
                      disabled={actionId===c.id}
                      onClick={()=>handleResend(c.id)}
                      className="btn-ghost"
                      style={{fontSize:12,padding:'6px 14px'}}>
                      {actionId===c.id ? 'Sending…' : 'Resend'}
                    </button>
                  )}
                  {['draft','sent'].includes(c.status) && (
                    <button
                      disabled={actionId===c.id}
                      onClick={()=>handleVoid(c.id)}
                      style={{border:'none',background:'none',cursor:'pointer',fontSize:12,color:'var(--red)',padding:'6px 8px'}}>
                      Void
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
