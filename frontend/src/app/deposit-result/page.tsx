'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
function Result() {
  const params = useSearchParams(), sessionId = params.get('session_id')
  const cancelled = params.get('cancelled') === 'true'
  const [status,setStatus] = useState(cancelled ? 'cancelled' : sessionId ? 'loading' : 'unknown')
  const [retry,setRetry] = useState(0)
  useEffect(()=>{
    if(!sessionId)return
    let live=true, timer:ReturnType<typeof setTimeout>
    let attempts=0
    const check=async()=>{
      try{
        const r=await fetch(`${API}/api/payments/deposit-status?session_id=${encodeURIComponent(sessionId)}`)
        if(!r.ok)throw new Error()
        const data=await r.json()
        if(!live)return
        setStatus(data.status)
        if(data.status==='pending'&&++attempts<6)timer=setTimeout(check,5000)
      }catch{if(live)setStatus('error')}
    }
    check();return()=>{live=false;clearTimeout(timer)}
  },[sessionId,retry])
  const titles:Record<string,string>={paid:'Deposit confirmed',cancelled:'Checkout cancelled',expired:'Payment link expired',pending:'Your payment is being checked',loading:'Checking your payment…',failed:'Payment did not complete',error:'We could not check your payment',unknown:'Deposit checkout'}
  return <main className="auth-wrap"><div className="auth-card" style={{maxWidth:560}}><h1 className="auth-title">{titles[status]||titles.unknown}</h1><p style={{marginTop:20}}>{status==='paid'?'Your deposit has been recorded. Contact your breeder about the next steps.':status==='cancelled'?'Checkout was cancelled. If you still want to pay, return to the payment link your breeder sent you.':status==='pending'||status==='loading'?'Please wait while we confirm the result with Stripe. If your payment is still processing, contact your breeder before trying another payment.':status==='expired'?'Ask your breeder for a new payment link.':'Contact your breeder if you need help confirming your deposit. Do not submit another payment until the first result is clear.'}</p>{sessionId&&status!=='paid'&&<button className="btn-ghost" style={{marginTop:20}} onClick={()=>setRetry(r=>r+1)}>Check again</button>}</div></main>
}
export default function DepositResultPage(){return <Suspense fallback={<p>Checking checkout…</p>}><Result/></Suspense>}
