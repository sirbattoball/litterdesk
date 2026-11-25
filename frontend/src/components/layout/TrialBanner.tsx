'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/store'

export function TrialBanner() {
  const { user } = useAuthStore()
  if (!user || !user.trial_ends_at) return null

  const msLeft = new Date(user.trial_ends_at).getTime() - Date.now()
  const daysLeft = Math.ceil(msLeft / 86400000)
  const expired = msLeft <= 0
  if (user.has_subscription && user.subscription_active) return null
  // A calm trial needs no banner: the sidebar already shows the days left.
  if (!expired && daysLeft > 3) return null

  const tone = expired ? 'expired' : 'soon'
  const message = expired
    ? 'Your trial has ended. Your data is saved and waiting.'
    : daysLeft <= 1
    ? 'Your trial ends within 24 hours.'
    : `Your trial ends in ${daysLeft} days.`

  return (
    <div className={`trial-banner ${tone}`}>
      <span>{message}</span>
      <Link href="/dashboard/upgrade">{expired ? 'Choose a plan' : 'See plans'} →</Link>
    </div>
  )
}
