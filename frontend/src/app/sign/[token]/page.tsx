'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const API = 'https://litterdesk-production.up.railway.app/api'

type ContractData = {
  contract_id: string; title: string; content: string; buyer_name: string
  kennel_name: string; breeder_name: string; sale_price: number; deposit_amount: number; status: string
}

export default function SignContractPage() {
  const { token } = useParams<{ token: string }>()
  const [contract, setContract] = useState<ContractData | null>(null)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'loading'|'review'|'signed'|'error'>('loading')
  const [typedName, setTypedName] = useState('')
  const [signing, setSigning] = useState(false)
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`${API}/contracts/sign/${token}`)
      .then(async r => { if (!r.ok) { const d = await r.json().catch(()=>({})); throw new Error(d.detail||'Contract not found') } return r.json() })
      .then(data => { setContract(data); setStep(data.status === 'signed' ? 'signed' : 'review') })
      .catch(e => { setError(e.message); setStep('error') })
  }, [token])

  const handleSign = async () => {
    if (!typedName.trim()) return
    setSigning(true)
    try {
      const r = await fetch(`${API}/contracts/sign/${token}?buyer_name=${encodeURIComponent(typedName)}`, { method: 'POST' })
      if (!r.ok) { const d = await r.json().catch(()=>({})); throw new Error(d.detail||'Signing failed') }
      setStep('signed')
    } catch(e: any) { setError(e.message) } finally { setSigning(false) }
  }

  const logo = <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#2d6b4a,#1a4730)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></div>

  const shell = (children: React.ReactNode) => (
    <div style={{minHeight:'100vh',background:'#f8f6f1',fontFamily:"'Instrument Sans',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{background:'#fff',borderBottom:'1px solid rgba(230,223,212,.7)',padding:'14px 24px',display:'flex',alignItems:'center',gap:10}}>
        {logo}
        <div><div style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:18,color:'#0d1a0f'}}>LitterDesk</div><div style={{fontSize:11.5,color:'#7a9070'}}>Secure Contract Signing</div></div>
        <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#7a9070'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>256-bit SSL</div>
      </div>
      <div style={{maxWidth:720,margin:'0 auto',padding:'32px 20px 64px'}}>{children}</div>
    </div>
  )

  if (step==='loading') return shell(<div style={{textAlign:'center',padding:'80px 0'}}><div style={{width:32,height:32,border:'3px solid #c4d9c8',borderTopColor:'#1a4730',borderRadius:'50%',animation:'spin .65s linear infinite',margin:'0 auto 16px'}}/><p style={{color:'#7a9070',fontSize:14}}>Loading your contract…</p></div>)
  if (step==='error') return shell(<div style={{textAlign:'center',padding:'80px 20px'}}><h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:24,color:'#0d1a0f',marginBottom:8}}>Contract Unavailable</h2><p style={{color:'#7a9070',fontSize:14}}>{error||'This link is invalid or has already been completed.'}</p></div>)
  if (step==='signed') return shell(<div style={{textAlign:'center',padding:'80px 20px'}}><div style={{width:64,height:64,background:'#dcfce7',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></div><h2 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:28,color:'#0d1a0f',marginBottom:8}}>Contract Signed!</h2><p style={{color:'#4a5e4c',fontSize:15}}>{contract?`Thank you, ${contract.buyer_name}. Your contract with ${contract.kennel_name} is complete.`:'This contract has been signed.'}</p><p style={{color:'#7a9070',fontSize:13,marginTop:6}}>Congratulations on your new puppy! 🐾</p></div>)
  if (!contract) return null

  const balance = contract.sale_price && contract.deposit_amount ? contract.sale_price - contract.deposit_amount : null

  return shell(<>
    <div style={{background:'#fff',border:'1px solid rgba(230,223,212,.8)',borderRadius:20,padding:'24px 28px',marginBottom:20,boxShadow:'0 1px 3px rgba(13,26,15,.05),0 2px 8px rgba(13,26,15,.04)'}}>
      <div style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:'#7a9070',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:4}}>Puppy Sale Agreement</div><h1 style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:22,color:'#0d1a0f',margin:0}}>{contract.title}</h1><p style={{fontSize:13,color:'#7a9070',marginTop:4}}>From {contract.kennel_name} · {contract.breeder_name}</p></div>
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        {contract.sale_price&&<div style={{background:'#f8f6f1',borderRadius:12,padding:'10px 16px'}}><div style={{fontSize:11,color:'#7a9070',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px'}}>Sale Price</div><div style={{fontSize:20,fontWeight:700,color:'#0d1a0f'}}>${contract.sale_price.toLocaleString()}</div></div>}
        {contract.deposit_amount&&<div style={{background:'#f8f6f1',borderRadius:12,padding:'10px 16px'}}><div style={{fontSize:11,color:'#7a9070',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px'}}>Deposit Paid</div><div style={{fontSize:20,fontWeight:700,color:'#16a34a'}}>${contract.deposit_amount.toLocaleString()}</div></div>}
        {balance!==null&&balance>0&&<div style={{background:'#f8f6f1',borderRadius:12,padding:'10px 16px'}}><div style={{fontSize:11,color:'#7a9070',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px'}}>Balance Due</div><div style={{fontSize:20,fontWeight:700,color:'#0d1a0f'}}>${balance.toLocaleString()}</div></div>}
      </div>
    </div>
    <div style={{background:'#fff',border:'1px solid rgba(230,223,212,.8)',borderRadius:20,padding:'28px',marginBottom:20,boxShadow:'0 1px 3px rgba(13,26,15,.05),0 2px 8px rgba(13,26,15,.04)'}}>
      <div style={{fontSize:11,fontWeight:700,color:'#7a9070',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:16}}>Contract Terms</div>
      <div style={{fontFamily:'Georgia,serif',fontSize:14,lineHeight:1.8,color:'#2a3a2c',whiteSpace:'pre-wrap',maxHeight:480,overflowY:'auto'}}>{contract.content}</div>
    </div>
    <div style={{background:'#fff',border:'1px solid rgba(230,223,212,.8)',borderRadius:20,padding:'28px',boxShadow:'0 1px 3px rgba(13,26,15,.05),0 2px 8px rgba(13,26,15,.04)'}}>
      <h3 style={{fontSize:16,fontWeight:700,color:'#0d1a0f',marginBottom:6}}>Sign this contract</h3>
      <p style={{fontSize:13,color:'#7a9070',marginBottom:20,lineHeight:1.5}}>By typing your full legal name and clicking Sign, you agree to all terms above. This constitutes a legally binding electronic signature.</p>
      <label style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:20,cursor:'pointer'}}>
        <input type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)} style={{marginTop:2,width:16,height:16,accentColor:'#1a4730',cursor:'pointer',flexShrink:0}}/>
        <span style={{fontSize:13,color:'#4a5e4c',lineHeight:1.5}}>I have read and agree to all terms of this contract.</span>
      </label>
      <div style={{marginBottom:16}}>
        <label style={{display:'block',fontSize:12.5,fontWeight:600,color:'#4a5e4c',marginBottom:6}}>Type your full legal name to sign</label>
        <input type="text" placeholder={contract.buyer_name||'Your full name'} value={typedName} onChange={e=>setTypedName(e.target.value)} style={{width:'100%',border:'1px solid #e6dfd4',borderRadius:10,padding:'11px 14px',fontSize:16,fontFamily:'Georgia,serif',color:'#0d1a0f',background:'#fff',outline:'none',boxSizing:'border-box'}}/>
        {typedName&&<div style={{marginTop:8,fontFamily:'Georgia,serif',fontSize:22,color:'#1a4730',borderBottom:'2px solid #1a4730',paddingBottom:4,display:'inline-block'}}>{typedName}</div>}
      </div>
      <button onClick={handleSign} disabled={!typedName.trim()||!agreed||signing} style={{width:'100%',padding:'14px',borderRadius:14,border:'none',cursor:(!typedName.trim()||!agreed||signing)?'not-allowed':'pointer',background:(!typedName.trim()||!agreed)?'#c4d9c8':'linear-gradient(135deg,#2d6b4a,#1a4730)',color:'#fff',fontSize:15,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        {signing?<><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.4)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .65s linear infinite'}}/>Signing…</>:'✍ Sign Contract'}
      </button>
    </div>
  </>)
}
