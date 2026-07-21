'use client'
import { useQuery } from '@tanstack/react-query'
import { contractsApi } from '@/lib/api'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'

const BADGE: Record<string, string> = {
  draft: 'badge-draft', sent: 'badge-sent', signed: 'badge-deposit', voided: 'badge-complete'
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.get(id).then(r => r.data),
  })

  if (isLoading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:64}}>
      <div className="spinner" style={{width:32,height:32}}/>
    </div>
  )

  if (!contract) return (
    <div className="page-body">
      <div className="empty">
        <div className="empty-title">Contract not found</div>
        <Link href="/dashboard/contracts" className="btn-primary">← Back to Contracts</Link>
      </div>
    </div>
  )

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">{contract.title}</div>
          <div className="topbar-sub">
            <span className={`badge ${BADGE[contract.status] ?? 'badge-draft'}`} style={{marginRight:8}}>{contract.status}</span>
            {contract.sale_price ? `$${contract.sale_price.toLocaleString()}` : ''}
            {contract.created_at ? ` · ${format(new Date(contract.created_at),'MMM d, yyyy')}` : ''}
          </div>
        </div>
        <div className="topbar-right">
          <Link href="/dashboard/contracts" className="btn-ghost">← Contracts</Link>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{padding:32,maxWidth:800}}>
          <pre style={{fontFamily:'var(--sans)',fontSize:13.5,lineHeight:1.9,color:'#0d1a0f',whiteSpace:'pre-wrap',wordBreak:'break-word',margin:0}}>{contract.content}</pre>
        </div>
      </div>
    </>
  )
}
