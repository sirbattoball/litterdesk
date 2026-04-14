'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { littersApi } from '@/lib/api'
import Link from 'next/link'
import { Plus, Heart, Calendar, Users, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planned: { label: 'Planned', color: 'bg-gray-100 text-gray-600' },
  pregnant: { label: 'Pregnant', color: 'bg-pink-100 text-pink-700' },
  born: { label: 'Born', color: 'bg-blue-100 text-blue-700' },
  weaning: { label: 'Weaning', color: 'bg-purple-100 text-purple-700' },
  ready: { label: 'Ready to Go', color: 'bg-green-100 text-green-700' },
  complete: { label: 'Complete', color: 'bg-gray-100 text-gray-500' },
}

export default function LittersPage() {
  const { data: litters, isLoading } = useQuery({
    queryKey: ['litters'],
    queryFn: () => littersApi.list().then(r => r.data),
  })

  const active = litters?.filter((l: any) => l.status !== 'complete') || []
  const complete = litters?.filter((l: any) => l.status === 'complete') || []

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Litters</h1>
          <p className="text-gray-500 text-sm mt-1">Track all your litters from breeding to placement</p>
        </div>
        <Link href="/dashboard/litters/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Litter
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : litters?.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={48} className="text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No litters yet</h3>
          <p className="text-gray-400 text-sm mb-6">Add your first litter to start tracking</p>
          <Link href="/dashboard/litters/new" className="btn-primary">
            Add First Litter
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Active ({active.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {active.map((litter: any) => (
                  <LitterCard key={litter.id} litter={litter} />
                ))}
              </div>
            </div>
          )}

          {complete.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Completed ({complete.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-70">
                {complete.map((litter: any) => (
                  <LitterCard key={litter.id} litter={litter} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LitterCard({ litter }: { litter: any }) {
  const status = STATUS_CONFIG[litter.status] || STATUS_CONFIG.planned
  const totalPuppies = (litter.num_males || 0) + (litter.num_females || 0)

  return (
    <Link
      href={`/dashboard/litters/${litter.id}`}
      className="card p-5 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors truncate">
            {litter.name || `${litter.breed} Litter`}
          </h3>
          <p className="text-sm text-gray-500">{litter.breed}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('badge', status.color)}>{status.label}</span>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-green-500 transition-colors" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center border-t border-gray-100 pt-3">
        <div>
          <p className="text-lg font-bold text-gray-900">{totalPuppies}</p>
          <p className="text-xs text-gray-400">Puppies</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{litter.num_males}M / {litter.num_females}F</p>
          <p className="text-xs text-gray-400">Sex split</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">
            {litter.puppy_price ? `$${litter.puppy_price.toLocaleString()}` : '—'}
          </p>
          <p className="text-xs text-gray-400">Per puppy</p>
        </div>
      </div>

      {(litter.go_home_date || litter.whelp_date) && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
          <Calendar size={12} />
          {litter.go_home_date
            ? `Go home: ${format(new Date(litter.go_home_date), 'MMM d, yyyy')}`
            : litter.whelp_date
            ? `Born: ${format(new Date(litter.whelp_date), 'MMM d, yyyy')}`
            : null
          }
        </div>
      )}
    </Link>
  )
}
