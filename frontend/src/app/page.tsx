import Link from 'next/link'
import { CheckCircle, Zap, Heart, Users, FileText, CreditCard } from 'lucide-react'

const FEATURES = [
  {
    icon: Heart,
    title: 'Litter Management',
    desc: 'Track every litter from planned breeding to go-home day. Manage puppies, weights, and waitlists.'
  },
  {
    icon: Users,
    title: 'Buyer CRM',
    desc: 'Never lose a buyer inquiry. AI scores every buyer on fit and flags your best matches.'
  },
  {
    icon: Zap,
    title: 'AI Contracts',
    desc: 'Generate breed-specific sale contracts in seconds. Buyers sign online with one link.'
  },
  {
    icon: CreditCard,
    title: 'Deposit Collection',
    desc: 'Collect deposits directly through LitterDesk. Funds go straight to your bank account.'
  },
]

const PRICING = [
  {
    name: 'Starter',
    price: 29,
    litters: 2,
    ai: false,
    desc: 'Perfect for hobby breeders'
  },
  {
    name: 'Pro',
    price: 79,
    litters: 'Unlimited',
    ai: true,
    desc: 'For serious breeders',
    popular: true,
  },
  {
    name: 'Kennel',
    price: 149,
    litters: 'Unlimited',
    ai: true,
    desc: 'Multi-breed operations'
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">LitterDesk</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-600 text-sm hover:text-gray-900">Sign in</Link>
          <Link href="/register" className="btn-primary text-sm">Start Free Trial</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-20 pb-16">
        <span className="badge bg-green-100 text-green-700 mb-4 inline-block">
          Built for dog breeders, by dog people
        </span>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Run your kennel like<br />a real business
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
          LitterDesk replaces your spreadsheets, Word contracts, and text message waitlists
          with one modern platform built for serious breeders.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="btn-primary text-base px-8 py-3">
            Start Free Trial →
          </Link>
          <span className="text-sm text-gray-400">14 days free. No card required.</span>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                <Icon size={20} className="text-green-700" />
              </div>
              <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
              <p className="text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Simple, honest pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`card p-6 ${plan.popular ? 'ring-2 ring-green-600 relative' : ''}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-green-700 text-white px-3 py-1">
                    Most Popular
                  </span>
                )}
                <div className="mb-5">
                  <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                  <p className="text-gray-400 text-sm">{plan.desc}</p>
                  <div className="mt-3">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                </div>
                <ul className="space-y-2.5 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={16} className="text-green-600" />
                    {plan.litters} active litters
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={16} className="text-green-600" />
                    Buyer CRM
                  </li>
                  <li className={`flex items-center gap-2 text-sm ${plan.ai ? 'text-gray-600' : 'text-gray-300'}`}>
                    <CheckCircle size={16} className={plan.ai ? 'text-green-600' : 'text-gray-200'} />
                    AI contracts & email
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle size={16} className="text-green-600" />
                    Deposit collection
                  </li>
                </ul>
                <Link
                  href="/register"
                  className={`w-full py-2.5 rounded-lg text-center text-sm font-medium block transition-colors ${
                    plan.popular
                      ? 'bg-green-700 text-white hover:bg-green-800'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-sm text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} LitterDesk · Built for breeders
      </footer>
    </div>
  )
}
