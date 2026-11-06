'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { littersApi, buyersApi, contractsApi, aiApi } from '@/lib/api'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { isPro, useAuthStore } from '@/lib/store'

export default function NewContractPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [content, setContent] = useState('')
  const [contractId, setContractId] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [form, setForm] = useState({ buyer_id: params.get('buyer') || '', litter_id: params.get('litter') || '', sale_price: '', deposit_amount: '', puppy_name: '', puppy_sex: 'female', dob: '', go_home_date: '', balance_due_date: '', health_guarantee_months: '24', spay_neuter_required: true, special_terms: '' })
  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))
  const { data: buyers } = useQuery({ queryKey: ['buyers'], queryFn: () => buyersApi.list().then(r => r.data) })
  const { data: litters } = useQuery({ queryKey: ['litters'], queryFn: () => littersApi.list().then(r => r.data) })
  const error = (err: any) => toast.error(typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Please check the details and try again')

  const generate = async () => {
    if (!form.buyer_id || !form.sale_price || !form.dob || !form.go_home_date) {
      toast.error('Select a buyer and enter price, date of birth, and go-home date for AI drafting'); return
    }
    setBusy('generate')
    try {
      const res = await aiApi.generateContract({ ...form, litter_id: form.litter_id || null, sale_price: Number(form.sale_price), deposit_amount: Number(form.deposit_amount || 0), balance_due_date: form.balance_due_date || form.go_home_date, health_guarantee_months: Number(form.health_guarantee_months) })
      setContent(res.data.content)
      toast.success('Draft ready to review and edit')
    } catch (err) { error(err) } finally { setBusy('') }
  }
  const save = async (send: boolean) => {
    if (!form.buyer_id || !content.trim()) { toast.error('Select a buyer and enter the contract text'); return }
    if (form.sale_price && Number(form.deposit_amount || 0) > Number(form.sale_price)) { toast.error('Deposit cannot exceed the sale price'); return }
    setBusy(send ? 'send' : 'save')
    try {
      let id = contractId
      if (id) await contractsApi.update(id, { content })
      else {
        const res = await contractsApi.create({ buyer_id: form.buyer_id, litter_id: form.litter_id || null, sale_price: form.sale_price ? Number(form.sale_price) : null, deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : null, balance_due_date: form.balance_due_date || null, content })
        id = res.data.id as string
        setContractId(id)
      }
      qc.invalidateQueries({ queryKey: ['contracts'] })
      if (send) await contractsApi.send(id)
      toast.success(send ? 'Contract sent to buyer' : 'Draft saved')
      router.push('/dashboard/contracts')
    } catch (err) { error(err) } finally { setBusy('') }
  }
  return <>
    <div className="topbar"><div><div className="topbar-title">New contract</div><div className="topbar-sub">Write or paste your agreement, then review before sending</div></div><Link href="/dashboard/contracts" className="btn-ghost">Cancel</Link></div>
    <div className="page-body"><div style={{ maxWidth: 800 }}>
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <fieldset disabled={!!busy || !!contractId} style={{ border: 0, padding: 0, margin: 0 }}>
          <div className="two-col">
            <div className="field"><label className="label" htmlFor="buyer">Buyer *</label><select id="buyer" className="input" value={form.buyer_id} onChange={e => set('buyer_id', e.target.value)}><option value="">Select buyer…</option>{buyers?.map((b: any) => <option key={b.id} value={b.id}>{b.full_name}</option>)}</select></div>
            <div className="field"><label className="label" htmlFor="litter">Litter (optional)</label><select id="litter" className="input" value={form.litter_id} onChange={e => set('litter_id', e.target.value)}><option value="">Select litter…</option>{litters?.map((l: any) => <option key={l.id} value={l.id}>{l.name || l.breed}</option>)}</select></div>
          </div>
          <div className="two-col">{[['sale_price', 'Sale price ($)'], ['deposit_amount', 'Deposit paid ($)']].map(([key, label]) => <div className="field" key={key}><label className="label" htmlFor={key}>{label}</label><input id={key} type="number" min="0" step="0.01" className="input" value={(form as any)[key]} onChange={e => set(key, e.target.value)} /></div>)}</div>
          <details style={{ marginBottom: 16 }}><summary style={{ cursor: 'pointer', marginBottom: 16 }}>AI drafting details (Pro)</summary>
            <div className="two-col">
              <div className="field"><label className="label" htmlFor="field-puppy-name-1">Puppy name</label><input id="field-puppy-name-1" className="input" value={form.puppy_name} onChange={e => set('puppy_name', e.target.value)} /></div>
              <div className="field"><label className="label" htmlFor="field-sex-2">Sex</label><select id="field-sex-2" className="input" value={form.puppy_sex} onChange={e => set('puppy_sex', e.target.value)}><option value="female">Female</option><option value="male">Male</option></select></div>
            </div>
            <div className="two-col">{[['dob', 'Date of birth'], ['go_home_date', 'Go-home date'], ['balance_due_date', 'Balance due date']].map(([key, label]) => <div className="field" key={key}><label className="label" htmlFor={`ai-${key}`}>{label}</label><input id={`ai-${key}`} type="date" className="input" value={(form as any)[key]} onChange={e => set(key, e.target.value)} onInput={e => set(key, (e.target as HTMLInputElement).value)} /></div>)}</div>
            <div className="field"><label className="label" htmlFor="field-health-guarantee-months-3">Health guarantee (months)</label><input id="field-health-guarantee-months-3" type="number" min="1" className="input" value={form.health_guarantee_months} onChange={e => set('health_guarantee_months', e.target.value)} /></div>
            <label><input type="checkbox" checked={form.spay_neuter_required} onChange={e => set('spay_neuter_required', e.target.checked)} /> Spay/neuter required</label>
            <div className="field" style={{ marginTop: 16 }}><label className="label" htmlFor="field-special-terms-4">Special terms</label><textarea id="field-special-terms-4" className="input" value={form.special_terms} onChange={e => set('special_terms', e.target.value)} /></div>
          </details>
        </fieldset>
        {isPro(user) ? <button className="btn-ghost" onClick={generate} disabled={!!busy || !!contractId}>{busy === 'generate' ? 'Drafting… this may take a few minutes' : 'Draft with AI'}</button> : <p>Manual contracts are available on every plan. <Link href="/dashboard/upgrade">Upgrade to Pro for AI drafting.</Link></p>}
      </div>
      <div className="card" style={{ padding: 24 }}><label className="label" htmlFor="contract-content">Contract text *</label><textarea id="contract-content" className="input" rows={22} value={content} onChange={e => setContent(e.target.value)} disabled={!!busy} placeholder="Write or paste your puppy sales agreement here…" /><p style={{ margin: '12px 0', fontSize: 13 }}>Review all terms before sharing. Save a draft, then open it to copy a signing link for your buyer. Email invitations require a configured sending domain.</p><div style={{ display: 'flex', gap: 12 }}><button className="btn-ghost" disabled={!!busy} onClick={() => save(false)}>{busy === 'save' ? 'Saving…' : 'Save draft'}</button><button className="btn-primary" disabled={!!busy} onClick={() => save(true)}>{busy === 'send' ? 'Sending…' : 'Save & send'}</button></div></div>
    </div></div>
  </>
}
