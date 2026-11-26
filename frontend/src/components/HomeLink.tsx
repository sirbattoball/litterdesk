'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House } from 'lucide-react'

export function HomeLink() {
  const pathname = usePathname()
  if (pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/sign')) return null
  const mobileNavigation = false

  return (
    <Link href="/" className={`site-home-link${mobileNavigation ? ' above-mobile-nav' : ''}`} aria-label="Home — LitterDesk front page">
      <House size={16} aria-hidden="true" />
      <span>Home</span>
    </Link>
  )
}
