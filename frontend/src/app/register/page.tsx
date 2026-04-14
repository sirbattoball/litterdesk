'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import toast from 'react-hot-toast'
import { CheckCircle } from 'lucide-react'

const PERKS = [
  'Unlimited buyer tracking',
  'Litter & puppy management',
  'AI-generated contracts',
  'Automated follow-up emails',
  'Stripe payment collection',
]

export default function RegisterPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    kennel_name: '',
  })
  const { register, isLoading } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await register(form)
      toast.success('Welcome to LitterDesk! 14-day free trial started.')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

        {/* Left — Value prop */}
        <div className="hidden md:block">
          <div className="w-12 h-12 bg-green-700 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white text-xl font-bold">L</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Run your breeding program like a pro
          </h1>
          <p className="text-gray-600 mb-8">
            LitterDesk gives serious breeders the tools to manage litters, qualify buyers, generate contracts, and collect deposits — all in one place.
          </p>
          <ul className="space-y-3">
            {PERKS.map(perk => (
              <li key={perk} className="flex items-center gap-3 text-gray-700">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                {perk}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-gray-500">
            14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Right — Form */}
        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Start your free trial</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Your name</label>
              <input
                className="input"
                placeholder="Jane Smith"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Kennel name (optional)</label>
              <input
                className="input"
                placeholder="Sunrise Goldens"
                value={form.kennel_name}
                onChange={e => setForm(f => ({ ...f, kennel_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@kennel.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                minLength={8}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base"
            >
              {isLoading ? 'Creating account...' : 'Start Free Trial →'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-green-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
