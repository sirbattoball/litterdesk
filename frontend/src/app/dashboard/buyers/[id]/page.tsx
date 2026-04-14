'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { buyersApi, aiApi } from '@/lib/api'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowLeft, Mail, Phone, MapPin, Zap, Star, Edit,
  MessageSquare, CheckCircle, Copy, X
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { useAuthStore, isPro } from '@/lib/store'

const EMAIL_TYPES = [
  { value: 'inquiry_response', label: 'Reply to Inquiry' },
  { value: 'waitlist_update', label: 'Waitlist Update' },
  { value: 'deposit_request', label: 'Request Deposit' },
  { value: 'go_home_reminder', label: 'Go Home Reminder' },
  { value: 'contract_followup', label: 'Contract Follow-up' },
]

export default function BuyerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [emailDraft, setEmailDraft] = useState<any>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [emailType, setEmailType] = useState('inquiry_response')
  const [emailContext, setEmailContext] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)

  const { data: buyer, isLoading } = useQuery({
    queryKey: ['buyer', id],
    queryFn: () => buyersApi.get(id).then(r => r.data),
  })

  const { data: comms } = useQuery({
    queryKey: ['buyer-comms', id],
    queryFn: () => buyersApi.communications(id).then(r => r.data),
  })

  const scoreMutation = useMutation({
    mutationFn: () => aiApi.scoreBuyer(id),
    onSuccess: (res) => {
      toast.success(`Score: ${res.data.score}/100`)
      qc.invalidateQueries({ queryKey: ['buyer', id] })
    },
    onError: () => toast.error('Scoring failed'),
  })

  const handleDraftEmail = async () => {
    if (!isPro(user)) {
      toast.error('Email drafting requires Pro plan')
      return
    }
    setDraftLoading(true)
    try {
      const res = await aiApi.draftEmail({
        buyer_id: id,
        email_type: emailType,
        context: emailContext,
      })
      setEmailDraft(res.data)
    } catch {
      toast.error('Failed to draft email')
    } finally {
      setDraftLoading(false)
    }
  }

  const copyEmail = () => {
    navigator.clipboard.writeText(
      `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`
    )
    toast.success('Copied to clipboard!')
  }

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!buyer) return <div className="p-8 text-gray-400">Buyer not found</div>

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href="/dashboard/buyers"
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft size={16} />
        Back to Buyers
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xl font-bold">
              {buyer.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{buyer.full_name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Mail size={14} />{buyer.email}</span>
                {buyer.phone && <span className="flex items-center gap-1"><Phone size={14} />{buyer.phone}</span>}
                {buyer.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} />{buyer.city}, {buyer.state}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {buyer.priority_score > 0 && (
              <div className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold',
                buyer.priority_score >= 70 ? 'bg-green-100 text-green-700' :
                buyer.priority_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              )}>
                <Star size={14} />
                {buyer.priority_score}/100
              </div>
            )}
            <button
              onClick={() => scoreMutation.mutate()}
              disabled={scoreMutation.isPending}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Zap size={14} className="text-green-600" />
              {scoreMutation.isPending ? 'Scoring...' : 'AI Score'}
            </button>
          </div>
        </div>

        {buyer.ai_notes && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800 font-medium">AI Assessment</p>
            <p className="text-sm text-green-700 mt-1">{buyer.ai_notes}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Details */}
        <div className="col-span-2 space-y-6">

          {/* Preferences */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Preferences & Background</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-400">Breed preference</dt>
                <dd className="font-medium text-gray-900">{buyer.breed_preference || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Sex preference</dt>
                <dd className="font-medium text-gray-900 capitalize">{buyer.sex_preference || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Experience</dt>
                <dd className="font-medium text-gray-900 capitalize">{buyer.experience_level || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-400">Color preference</dt>
                <dd className="font-medium text-gray-900">{buyer.color_preference || '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-400">Lifestyle notes</dt>
                <dd className="font-medium text-gray-900 mt-1">{buyer.lifestyle_notes || '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Communication history */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Communication History</h2>
              <button
                onClick={() => setShowEmailModal(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Zap size={14} className="text-green-600" />
                Draft Email with AI
              </button>
            </div>

            {comms?.length ? (
              <div className="space-y-3">
                {comms.map((c: any) => (
                  <div key={c.id} className="flex gap-3 text-sm">
                    <div className={clsx(
                      'w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0',
                      c.direction === 'outbound' ? 'bg-green-500' : 'bg-blue-500'
                    )} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{c.subject || c.channel}</span>
                        {c.ai_generated && (
                          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">AI</span>
                        )}
                        <span className="text-gray-400 text-xs">
                          {format(new Date(c.sent_at), 'MMM d, h:mm a')}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-0.5 line-clamp-2">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No communication logged yet.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Status</h3>
            <select className="input text-sm capitalize"
              defaultValue={buyer.status}
            >
              {['inquiry','waitlisted','deposit_paid','matched','contract_sent','complete','declined'].map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Actions</h3>
            <div className="space-y-2">
              <Link
                href={`/dashboard/contracts/new?buyer=${id}`}
                className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
              >
                Generate Contract
              </Link>
            </div>
          </div>

          <div className="card p-5 text-sm text-gray-500">
            <div>Added {format(new Date(buyer.created_at), 'MMM d, yyyy')}</div>
            {buyer.last_contacted && (
              <div>Last contact {format(new Date(buyer.last_contacted), 'MMM d')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-lg">Draft Email with AI</h3>
              <button onClick={() => setShowEmailModal(false)}>
                <X size={20} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Email type</label>
                <select className="input" value={emailType} onChange={e => setEmailType(e.target.value)}>
                  {EMAIL_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Context (optional)</label>
                <textarea
                  className="input h-20 resize-none"
                  placeholder="e.g. Litter just born, 4 puppies. Tell them we'll have photos soon..."
                  value={emailContext}
                  onChange={e => setEmailContext(e.target.value)}
                />
              </div>
              <button
                onClick={handleDraftEmail}
                disabled={draftLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Zap size={16} />
                {draftLoading ? 'Drafting...' : 'Generate Draft'}
              </button>

              {emailDraft && (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Subject</p>
                    <p className="font-medium text-gray-900">{emailDraft.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Body</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                      {emailDraft.body}
                    </p>
                  </div>
                  <button onClick={copyEmail} className="btn-secondary flex items-center gap-2 text-sm">
                    <Copy size={14} />
                    Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
