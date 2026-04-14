'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Dog, Heart, Users, FileText,
  CreditCard, Settings, LogOut, Zap
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/litters', label: 'Litters', icon: Heart },
  { href: '/dashboard/dogs', label: 'My Dogs', icon: Dog },
  { href: '/dashboard/buyers', label: 'Buyers', icon: Users },
  { href: '/dashboard/contracts', label: 'Contracts', icon: FileText },
  { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
          <span className="text-white text-sm font-bold">L</span>
        </div>
        <div>
          <span className="font-bold text-gray-900">LitterDesk</span>
          {user?.kennel_name && (
            <p className="text-xs text-gray-400 truncate max-w-[140px]">{user.kennel_name}</p>
          )}
        </div>
      </div>

      {/* Plan badge */}
      {user && (
        <div className="px-4 py-3 border-b border-gray-100">
          <span className={clsx(
            'badge text-xs',
            user.subscription_active
              ? 'bg-green-50 text-green-700'
              : 'bg-amber-50 text-amber-700'
          )}>
            {user.subscription_active
              ? `${user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1)} Plan`
              : 'Free Trial'}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-green-50 text-green-800'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon size={18} className={active ? 'text-green-700' : 'text-gray-400'} />
              {label}
            </Link>
          )
        })}

        {/* AI Upsell */}
        {!user?.subscription_active && (
          <Link
            href="/dashboard/upgrade"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 mt-4"
          >
            <Zap size={18} className="text-amber-500" />
            Upgrade to Pro
          </Link>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Settings size={18} className="text-gray-400" />
          Settings
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut size={18} className="text-gray-400" />
          Sign out
        </button>
      </div>
    </div>
  )
}
