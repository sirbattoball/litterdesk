'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House } from 'lucide-react'

export function HomeLink() {
  const pathname = usePathname()
  if (pathname === '/') return null
  const mobileNavigation = pathname.startsWith('/dashboard') && !pathname.startsWith('/dashboard/onboarding')

  return (
    <Link href="/" className={`site-home-link${mobileNavigation ? ' above-mobile-nav' : ''}`} aria-label="Home — LitterDesk front page">
      <House size={16} aria-hidden="true" />
      <span>Home</span>
    </Link>
  )
}
