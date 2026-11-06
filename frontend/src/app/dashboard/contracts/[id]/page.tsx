'use client'
import { QueryFailure } from '@/components/QueryFailure'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { contractsApi } from '@/lib/api'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [text, setText] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [signUrl, setSignUrl] = useState('')
  const { data: contract, isLoading, isError, refetch } = useQuery({ queryKey: ['contract', id], queryFn: () => contractsApi.get(id).then(r => r.data) })
  const act = async (send: boolean) => {
    setBusy(send ? 'send' : 'save')
    try {
      if (contract.status === 'draft') await contractsApi.update(id, { content: text ?? contract.content })
      if (send) await contractsApi.send(id)
      await qc.invalidateQueries({ queryKey: ['contract', id] })
      qc.invalidateQueries({ queryKey: ['contracts'] })
      setText(null)
      toast.success(send ? 'Contract sent to buyer' : 'Draft saved')
    } catch (err: any) { toast.error(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Could not save the contract') } finally { setBusy('') }
  }
  const share = async () => {
    setBusy('share')
    try {
      if (contract.status === 'draft') await contractsApi.update(id, { content: text ?? contract.content })
      const res = await contractsApi.share(id)
      setSignUrl(res.data.sign_url)
      await qc.invalidateQueries({ queryKey: ['contract', id] })
      qc.invalidateQueries({ queryKey: ['contracts'] })
      setText(null)
      try { await navigator.clipboard.writeText(res.data.sign_url); toast.success('Signing link copied. No email was sent.') }
      catch { toast.success('Signing link ready below. No email was sent.') }
    } catch (err:any) { toast.error(err.response?.data?.detail || 'Could not prepare the signing link') }
    finally { setBusy('') }
  }
  if (isError) return <QueryFailure retry={() => { refetch() }} />

  if (isLoading) return <div className="page-body">Loading contract…</div>
  if (!contract) return <div className="page-body"><p>Contract not found</p><Link href="/dashboard/contracts">Back to contracts</Link></div>
  return <>
    <div className="topbar"><div><div className="topbar-title">{contract.title}</div><div className="topbar-sub">{contract.status}</div></div><Link href="/dashboard/contracts" className="btn-ghost">← Contracts</Link></div>
    <div className="page-body"><div className="card" style={{ padding: 32, maxWidth: 800 }}>
      {contract.status === 'signed' && <p style={{marginBottom:20}}>Signed by <strong>{contract.buyer_signature}</strong>{contract.signed_at ? ` · ${new Date(contract.signed_at).toLocaleString()}` : ''}</p>}
      {contract.status === 'draft' ? <><label className="label" htmlFor="draft-content">Contract text</label><textarea id="draft-content" className="input" rows={24} value={text ?? contract.content ?? ''} onChange={e => setText(e.target.value)} disabled={!!busy} /></> : <pre style={{ fontFamily: 'var(--sans)', fontSize: 13.5, lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{contract.content}</pre>}
      {signUrl && <div style={{marginTop:20}}><label className="label" htmlFor="signing-link">Signing link — share it privately with your buyer</label><input id="signing-link" className="input" readOnly value={signUrl} onFocus={e => e.target.select()} /><p style={{fontSize:12,marginTop:8}}>Anyone with this link can view the agreement. No email was sent.</p></div>}
      <div style={{ display: 'flex', flexWrap:'wrap', gap: 12, marginTop: 16 }}>
        {['draft','sent','signed'].includes(contract.status) && <button className="btn-ghost" disabled={!!busy} onClick={share}>{busy === 'share' ? 'Preparing link…' : contract.status === 'signed' ? 'Copy signed copy link' : 'Copy signing link'}</button>}{contract.status === 'draft' && <button className="btn-ghost" disabled={!!busy} onClick={() => act(false)}>{busy === 'save' ? 'Saving…' : 'Save changes'}</button>}{['draft', 'sent'].includes(contract.status) && <button className="btn-primary" disabled={!!busy} onClick={() => act(true)}>{busy === 'send' ? 'Sending…' : contract.status === 'sent' ? 'Resend to buyer' : 'Save & send'}</button>}</div>
    </div></div>
  </>
}
