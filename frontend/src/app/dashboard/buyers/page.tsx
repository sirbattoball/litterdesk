'use client'

import { useQuery } from '@tanstack/react-query'
import { buyersApi, aiApi } from '@/lib/api'
import Link from 'next/link'
import { Plus, Users, Search, Zap, Star, MapPin, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuthStore, isPro } from '@/lib/store'

const STATUS_PIPELINE = [
  { key: 'inquiry', label: 'Inquiry', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'waitlisted', label: 'Waitlisted', color: 'bg-blue-100 text-blue-700' },
  { key: 'deposit_paid', label: 'Deposit Paid', color: 'bg-green-100 text-green-700' },
  { key: 'matched', label: 'Matched', color: 'bg-purple-100 text-purple-700' },
  { key: 'contract_sent', label: 'Contract Sent', color: 'bg-orange-100 text-orange-700' },
  { key: 'complete', label: 'Complete', color: 'bg-gray-100 text-gray-500' },
]

export default function BuyersPage() {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [scoringId, setScoringId] = useState<string | null>(null)
  const qc = require('@tanstack/react-query').useQueryClient()

  const { data: buyers, isLoading } = useQuery({
    queryKey: ['buyers', search, statusFilter],
    queryFn: () => buyersApi.list({ search, status: statusFilter || undefined }).then(r => r.data),
    staleTime: 30000,
  })

  const handleScore = async (buyer: any) => {
    if (!isPro(user)) {
      toast.error('AI scoring requires Pro plan')
      return
    }
    setScoringId(buyer.id)
    try {
      const res = await aiApi.scoreBuyer(buyer.id)
      toast.success(`Scored: ${res.data.score}/100 — ${res.data.summary}`)
      qc.invalidateQueries({ queryKey: ['buyers'] })
    } catch {
      toast.error('Scoring failed')
    } finally {
      setScoringId(null)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buyers</h1>
          <p className="text-gray-500 text-sm mt-1">
            {buyers?.length ?? 0} total buyers in your pipeline
          </p>
        </div>
        <Link href="/dashboard/buyers/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Buyer
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9 w-64"
            placeholder="Search name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('')}
            className={clsx('badge px-3 py-1.5 cursor-pointer', !statusFilter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600')}
          >
            All
          </button>
          {STATUS_PIPELINE.map(s => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key === statusFilter ? '' : s.key)}
              className={clsx('badge px-3 py-1.5 cursor-pointer transition-all',
                statusFilter === s.key ? s.color + ' ring-2 ring-offset-1 ring-gray-400' : s.color
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="card p-8 text-center text-gray-400">Loading...</div>
      ) : buyers?.length === 0 ? (
        <div className="card p-16 text-center">
          <Users size={48} className="text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No buyers yet</h3>
          <p className="text-gray-400 text-sm mb-6">Add buyers manually or share your inquiry form</p>
          <Link href="/dashboard/buyers/new" className="btn-primary">Add First Buyer</Link>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {buyers.map((buyer: any) => {
            const status = STATUS_PIPELINE.find(s => s.key === buyer.status)
            return (
              <div key={buyer.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 group">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {buyer.full_name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{buyer.full_name}</span>
                    {status && (
                      <span className={clsx('badge', status.color)}>{status.label}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>{buyer.email}</span>
                    {buyer.breed_preference && <span>· {buyer.breed_preference}</span>}
                    {buyer.city && (
                      <span className="flex items-center gap-0.5">
                        <MapPin size={10} />
                        {buyer.city}, {buyer.state}
                      </span>
                    )}
                  </div>
                  {buyer.ai_notes && (
                    <p className="text-xs text-green-600 mt-0.5 truncate">{buyer.ai_notes}</p>
                  )}
                </div>

                {/* Score */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {buyer.priority_score > 0 && (
                    <div className={clsx(
                      'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                      buyer.priority_score >= 70 ? 'bg-green-100 text-green-700' :
                      buyer.priority_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    )}>
                      <Star size={10} />
                      {buyer.priority_score}
                    </div>
                  )}

                  <button
                    onClick={() => handleScore(buyer)}
                    disabled={scoringId === buyer.id}
                    className="opacity-0 group-hover:opacity-100 text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-all disabled:opacity-50"
                  >
                    <Zap size={12} />
                    {scoringId === buyer.id ? 'Scoring...' : 'AI Score'}
                  </button>

                  <Link
                    href={`/dashboard/buyers/${buyer.id}`}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
