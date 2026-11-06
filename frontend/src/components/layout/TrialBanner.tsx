'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/store'

export function TrialBanner() {
  const { user } = useAuthStore()

  if (!user || !user.trial_ends_at) return null

  const endsAt = new Date(user.trial_ends_at)
  const now = new Date()
  const msLeft = endsAt.getTime() - now.getTime()
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
  const expired = msLeft <= 0

  if (expired && user.has_subscription && user.subscription_active) return null

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
    ? "Your free trial ends within 24 hours."
    : urgent
    ? `Your free trial ends in ${daysLeft} days.`
    : `${daysLeft} days left in your free trial.`

  const ctaText = user.has_subscription ? 'Manage plan →' : 'Choose a paid plan →'

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
      <span style={{ fontWeight: 500 }}>{message}{!user.has_subscription && ' No automatic charges.'}</span>
      <Link
        href="/dashboard/upgrade"
        style={{
          fontWeight: 600,
          color: fg,
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
        }}
      >
        {ctaText}
      </Link>
    </div>
  )
}
