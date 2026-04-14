'use client'
import { useQuery } from '@tanstack/react-query'
import { dogsApi } from '@/lib/api'
import Link from 'next/link'

export default function DogsPage() {
  const { data: dogs, isLoading } = useQuery({ queryKey: ['dogs'], queryFn: () => dogsApi.list().then(r => r.data) })
  const females = dogs?.filter((d: any) => d.sex === 'female') ?? []
  const males = dogs?.filter((d: any) => d.sex === 'male') ?? []

  const DogCard = ({ dog }: { dog: any }) => (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width:48, height:48, borderRadius:'50%', background:'linear-gradient(135deg,var(--sage),var(--forest-ll))', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'#fff' }}>
        {dog.name.charAt(0)}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:600, fontSize:15 }}>{dog.name}</div>
        {dog.registered_name && <div style={{ fontSize:12, color:'var(--ink-4)', fontStyle:'italic' }}>{dog.registered_name}</div>}
        <div style={{ fontSize:12.5, color:'var(--ink-4)', marginTop:3 }}>{dog.breed} · {dog.sex}{dog.is_external ? ' · External stud' : ''}</div>
        {dog.health_tests && Object.keys(dog.health_tests).length > 0 && (
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:8 }}>
            {Object.entries(dog.health_tests).map(([k,v]: any) => (
              <span key={k} className="badge badge-ready" style={{ fontSize:11 }}>{v}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div className="topbar">
        <div><div className="topbar-title">My Dogs</div><div className="topbar-sub">Your breeding program</div></div>
        <div className="topbar-right"><Link href="/dashboard/dogs/new" className="btn-primary">+ Add Dog</Link></div>
      </div>
      <div className="page-body">
        {isLoading && <div style={{ textAlign:'center', padding:48, color:'var(--ink-4)' }}>Loading…</div>}
        {!isLoading && dogs?.length === 0 && (
          <div className="empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
            <div className="empty-title">No dogs yet</div>
            <div className="empty-sub">Add your dams and sires to start tracking health records and pedigrees</div>
            <Link href="/dashboard/dogs/new" className="btn-primary">Add First Dog</Link>
          </div>
        )}
        <div className="two-col">
          {females.length > 0 && <div><div className="section-label">Females (Dams) — {females.length}</div><div style={{ display:'flex',flexDirection:'column',gap:10 }}>{females.map((d: any) => <DogCard key={d.id} dog={d} />)}</div></div>}
          {males.length > 0 && <div><div className="section-label">Males (Sires) — {males.length}</div><div style={{ display:'flex',flexDirection:'column',gap:10 }}>{males.map((d: any) => <DogCard key={d.id} dog={d} />)}</div></div>}
        </div>
      </div>
    </>
  )
}
