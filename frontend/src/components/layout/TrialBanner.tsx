'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/store'

export function TrialBanner() {
  const { user } = useAuthStore()

  // Paying customers never see this.
  if (!user || user.subscription_active || !user.trial_ends_at) return null

  const endsAt = new Date(user.trial_ends_at)
  const now = new Date()
  const msLeft = endsAt.getTime() - now.getTime()
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))

  const expired = msLeft <= 0
  const urgent = !expired && daysLeft <= 2

  const bg = expired
    ? 'var(--red-f)'
    : urgent
    ? 'var(--amber-f)'
    : 'var(--paper-2)'
  const fg = expired ? '#b91c1c' : urgent ? 'var(--amber)' : 'var(--ink-3)'
  const border = expired ? '#f3caca' : urgent ? '#f0dcb0' : 'var(--paper-3)'

  const message = expired
    ? "Your free trial has ended. Upgrade to keep using LitterDesk — your data is safe and waiting."
    : daysLeft === 1
    ? "Your free trial ends tomorrow."
    : urgent
    ? `Your free trial ends in ${daysLeft} days.`
    : `${daysLeft} days left in your free trial.`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 20px',
        background: bg,
        borderBottom: `1px solid ${border}`,
        fontSize: 13.5,
        color: fg,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontWeight: 500 }}>{message}</span>
      <Link
        href="/dashboard/upgrade"
        style={{
          fontWeight: 600,
          color: fg,
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
        }}
      >
        {expired ? 'Upgrade now →' : 'Add payment method →'}
      </Link>
    </div>
  )
}
