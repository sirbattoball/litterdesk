'use client'
import { useQuery } from '@tanstack/react-query'
import { dogsApi } from '@/lib/api'
import Link from 'next/link'

export default function DogsPage() {
  const { data: dogs, isLoading } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => dogsApi.list().then(r => r.data)
  })
  const females = dogs?.filter((d: any) => d.sex === 'female') ?? []
  const males = dogs?.filter((d: any) => d.sex === 'male' || d.is_external) ?? []

  const DogCard = ({ dog }: { dog: any }) => (
    <Link href={`/dashboard/dogs/${dog.id}`} style={{textDecoration:'none'}}>
      <div className="card card-hover" style={{padding:'16px 18px',display:'flex',alignItems:'flex-start',gap:14,cursor:'pointer'}}>
        <div style={{width:48,height:48,borderRadius:'50%',background:'linear-gradient(135deg,var(--sage),var(--forest-ll))',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,color:'#fff',fontWeight:700}}>
          {dog.name.charAt(0)}
        </div>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:15,color:'var(--ink)'}}>{dog.name}</div>
          {dog.registered_name && <div style={{fontSize:12,color:'var(--ink-4)',fontStyle:'italic'}}>{dog.registered_name}</div>}
          <div style={{fontSize:12.5,color:'var(--ink-4)',marginTop:3}}>
            {dog.breed} · {dog.sex}{dog.is_external ? ' · External stud' : ''}
            {dog.dob ? ` · born ${new Date(dog.dob).getFullYear()}` : ''}
          </div>
          {dog.health_tests && Object.keys(dog.health_tests).length > 0 && (
            <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:8}}>
              {Object.values(dog.health_tests).map((v: any) => (
                <span key={v} className="badge badge-ready" style={{fontSize:11}}>{v}</span>
              ))}
            </div>
          )}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)" strokeWidth="2" style={{flexShrink:0,marginTop:4}}><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </Link>
  )

  return (
    <>
      <div className="topbar">
        <div><div className="topbar-title">My Dogs</div><div className="topbar-sub">Your breeding program</div></div>
        <div className="topbar-right"><Link href="/dashboard/dogs/new" className="btn-primary">+ Add Dog</Link></div>
      </div>
      <div className="page-body">
        {isLoading && <div style={{textAlign:'center',padding:48,color:'var(--ink-4)'}}>Loading…</div>}

        {!isLoading && dogs?.length === 0 && (
          <div className="empty">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
            </div>
            <div className="empty-title">No dogs yet</div>
            <div className="empty-sub">Add your dams and sires to track health records, pedigrees, and build your breeding program.</div>
            <Link href="/dashboard/dogs/new" className="btn-primary">Add First Dog</Link>
          </div>
        )}

        <div className="two-col">
          {females.length > 0 && (
            <div>
              <div className="section-label">Females (Dams) — {females.length}</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {females.map((d: any) => <DogCard key={d.id} dog={d}/>)}
              </div>
            </div>
          )}
          {males.length > 0 && (
            <div>
              <div className="section-label">Males (Sires) — {males.length}</div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {males.map((d: any) => <DogCard key={d.id} dog={d}/>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
