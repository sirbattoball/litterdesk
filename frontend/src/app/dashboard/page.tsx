'use client'
import { QueryFailure } from '@/components/QueryFailure'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'
import {
  ArrowRight, Check, FileText, Heart, Home, Bell, Baby, Sparkles,
  Users, Wallet, CalendarDays, CircleCheck, Mail, TrendingUp, PawPrint, Eye, X,
} from 'lucide-react'

type SetupItem = { key: string; label: string; hint: string; done: boolean; href: string; cta: string; optional?: boolean }
type Action = { key: string; tone: 'urgent' | 'normal'; title: string; detail: string; href: string; cta: string }
type LitterCard = {
  id: string; name: string; breed: string; status: string; stage: number; due_date: string | null
  go_home_date: string | null; days_to_go_home: number | null; puppies: number; waitlist: number
  deposits: number; open_spots: number | null; puppy_price: number | null; waitlist_open: boolean
}
type Overview = {
  sample: boolean
  setup: { items: SetupItem[]; done: number; total: number }
  kpis: { expected_revenue: number; deposits_held: number; deposits_count: number; puppies_expected: number; buyers_waiting: number; open_spots: number; active_litters: number; total_buyers: number }
  pipeline: { status: string; label: string; count: number }[]
  litters: LitterCard[]
  actions: Action[]
  upcoming: { date: string; kind: string; title: string; href: string }[]
}

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
const STAGES = ['Planned', 'Expecting', 'Born', 'Weaning', 'Ready']
const EVENT_ICON: Record<string, any> = { due: Baby, go_home: Home, follow_up: Bell, balance: Wallet }

function Ring({ done, total }: { done: number; total: number }) {
  const r = 34, c = 2 * Math.PI * r, pct = total ? done / total : 0
  return (
    <svg className="dash-ring" viewBox="0 0 80 80" aria-label={`${done} of ${total} steps done`}>
      <circle cx="40" cy="40" r={r} className="dash-ring-bg" />
      <circle cx="40" cy="40" r={r} className="dash-ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      <text x="40" y="45" textAnchor="middle" className="dash-ring-text">{done}/{total}</text>
    </svg>
  )
}

function SetupCard({ setup }: { setup: Overview['setup'] }) {
  const next = setup.items.find(i => !i.done && !i.optional)
  return (
    <section className="dash-setup animate-fade-in-up">
      <div className="dash-setup-head">
        <Ring done={setup.done} total={setup.total} />
        <div>
          <h2 className="dash-h2">Get your kennel running</h2>
          <p className="dash-muted">{setup.done === 0 ? 'Five quick steps. Each one unlocks something below.' : `${setup.total - setup.done} step${setup.total - setup.done === 1 ? '' : 's'} left. You are ${Math.round((setup.done / setup.total) * 100)}% there.`}</p>
        </div>
        {next && <Link href={next.href} className="btn-primary dash-setup-cta">{next.cta}<ArrowRight size={15} /></Link>}
      </div>
      <ol className="dash-steps">
        {setup.items.map(i => (
          <li key={i.key} className={`dash-step${i.done ? ' done' : ''}${next?.key === i.key ? ' next' : ''}`}>
            <span className="dash-step-mark">{i.done ? <Check size={13} strokeWidth={3} /> : null}</span>
            <div className="dash-step-body">
              <div className="dash-step-label">{i.label}{i.optional && <em>optional</em>}</div>
              <div className="dash-step-hint">{i.hint}</div>
            </div>
            {!i.done && next?.key !== i.key && <Link href={i.href} className="dash-step-link">{i.cta}<ArrowRight size={13} /></Link>}
          </li>
        ))}
      </ol>
    </section>
  )
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: string }) {
  return (
    <div className={`dash-kpi tone-${tone}`}>
      <div className="dash-kpi-top"><span>{label}</span><i>{icon}</i></div>
      <div className="dash-kpi-value">{value}</div>
      <div className="dash-kpi-sub">{sub}</div>
    </div>
  )
}

function LitterBoard({ litter }: { litter: LitterCard }) {
  const fill = litter.puppies ? Math.min(100, Math.round((litter.waitlist / litter.puppies) * 100)) : 0
  const full = litter.puppies > 0 && litter.waitlist >= litter.puppies
  return (
    <Link href={`/dashboard/litters/${litter.id}`} className="dash-litter">
      <div className="dash-litter-top">
        <div>
          <div className="dash-litter-name">{litter.name}</div>
          <div className="dash-litter-meta">
            {litter.breed}
            {litter.go_home_date && <> · go-home {format(parseISO(litter.go_home_date), 'MMM d')}{litter.days_to_go_home != null && litter.days_to_go_home >= 0 && <> ({litter.days_to_go_home}d)</>}</>}
          </div>
        </div>
        {litter.puppy_price ? <div className="dash-litter-price">{money(litter.puppy_price)}<small>per puppy</small></div> : null}
      </div>
      <div className="dash-stages" aria-label={`Stage: ${STAGES[litter.stage]}`}>
        {STAGES.map((s, i) => (
          <div key={s} className={`dash-stage${i < litter.stage ? ' past' : ''}${i === litter.stage ? ' now' : ''}`}>
            <span /><label>{s}</label>
          </div>
        ))}
      </div>
      {litter.puppies > 0 ? (
        <div className="dash-fill">
          <div className="dash-fill-bar"><div style={{ width: `${fill}%` }} className={full ? 'full' : ''} /></div>
          <div className="dash-fill-text">
            <p><b>{litter.waitlist}</b> of {litter.puppies} spots claimed</p>
            <span>{litter.deposits} deposit{litter.deposits === 1 ? '' : 's'}{full ? ' · full' : litter.open_spots ? ` · ${litter.open_spots} open` : ''}</span>
          </div>
        </div>
      ) : (
        <div className="dash-fill-text dim">Add expected puppies to track spots and deposits.</div>
      )}
    </Link>
  )
}

function SampleStrip({ loaded }: { loaded: boolean }) {
  const qc = useQueryClient()
  const m = useMutation({
    mutationFn: () => (loaded ? dashboardApi.removeSample() : dashboardApi.loadSample()),
    onSuccess: () => { qc.invalidateQueries() },
  })
  const err = (m.error as any)?.response?.data?.detail
  return (
    <section className={`dash-sample ${loaded ? 'on' : ''}`}>
      <span className="dash-sample-icon">{loaded ? <Eye size={16} /> : <Sparkles size={16} />}</span>
      <p>
        {loaded
          ? <><b>You are looking at a sample kennel.</b> Click around, then remove it when you are ready to add your own.</>
          : <><b>Want to see it with real-looking data?</b> Load a sample kennel with litters, buyers and contracts. Remove it in one click.</>}
        {err && <span className="dash-sample-err"> {String(err)}</span>}
      </p>
      <button className={loaded ? 'btn-ghost' : 'btn-primary'} disabled={m.isPending} onClick={() => m.mutate()}>
        {m.isPending ? 'One moment…' : loaded ? <><X size={14} /> Remove sample</> : 'Load sample kennel'}
      </button>
    </section>
  )
}

function Skeleton() {
  return (
    <div className="page-body">
      <div className="skeleton skeleton-card" style={{ height: 180, marginBottom: 16 }} />
      <div className="dash-kpis">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" />)}</div>
      <div className="skeleton skeleton-card" style={{ height: 320 }} />
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data, isError, refetch } = useQuery<Overview>({ queryKey: ['dashboard-overview'], queryFn: () => dashboardApi.overview().then(r => r.data) })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  if (isError) return <QueryFailure retry={() => refetch()} />

  const header = (
    <div className="topbar">
      <div>
        <div className="topbar-title">{greeting}, {firstName}</div>
        <div className="topbar-sub">{user?.kennel_name ?? 'Your kennel'} · {format(new Date(), 'EEEE, MMMM d')}</div>
      </div>
      <div className="topbar-right">
        <Link href="/dashboard/buyers/new" className="btn-ghost">Add buyer</Link>
        <Link href="/dashboard/litters/new" className="btn-primary">+ New litter</Link>
      </div>
    </div>
  )
  if (!data) return <div className="page-enter">{header}<Skeleton /></div>

  const { setup, kpis, pipeline, litters, actions, upcoming } = data
  const setupDone = setup.done >= setup.total
  const maxPipe = Math.max(1, ...pipeline.map(p => p.count))
  const hasMoney = kpis.expected_revenue > 0
  const firstLitter = litters[0]
  const aiOn = !!user?.subscription_active

  return (
    <div className="page-enter">
      {header}
      <div className="page-body dash">
        {(data.sample || kpis.total_buyers === 0) && <SampleStrip loaded={data.sample} />}
        {!setupDone && <SetupCard setup={setup} />}

        <div className="dash-kpis stagger">
          <Kpi tone="gold" icon={<TrendingUp size={16} />} label="Expected revenue" value={money(kpis.expected_revenue)}
            sub={hasMoney ? `${kpis.puppies_expected} puppies across ${kpis.active_litters} active litter${kpis.active_litters === 1 ? '' : 's'}` : 'Add a price and puppy count to a litter'} />
          <Kpi tone="green" icon={<Wallet size={16} />} label="Deposits held" value={money(kpis.deposits_held)}
            sub={kpis.deposits_count ? `${kpis.deposits_count} buyer${kpis.deposits_count === 1 ? '' : 's'} committed` : 'Nothing recorded yet'} />
          <Kpi tone="blue" icon={<Users size={16} />} label="Buyers waiting" value={String(kpis.buyers_waiting)}
            sub={kpis.puppies_expected ? `${kpis.open_spots} spot${kpis.open_spots === 1 ? '' : 's'} still open` : `${kpis.total_buyers} buyer${kpis.total_buyers === 1 ? '' : 's'} in total`} />
          <Kpi tone="pink" icon={<PawPrint size={16} />} label="Puppies expected" value={String(kpis.puppies_expected)}
            sub={kpis.active_litters ? `${kpis.active_litters} active litter${kpis.active_litters === 1 ? '' : 's'}` : 'No active litters'} />
        </div>

        <div className="dash-grid">
          <div className="dash-col">
            <section className="dash-card animate-fade-in-up">
              <div className="dash-card-head">
                <h3 className="dash-h3">Next best actions</h3>
                {actions.length > 0 && <span className="dash-pill">{actions.length}</span>}
              </div>
              {actions.length ? (
                <ul className="dash-actions">
                  {actions.map(a => (
                    <li key={a.key}>
                      <Link href={a.href} className={`dash-action ${a.tone}`}>
                        <span className="dash-action-dot" />
                        <span className="dash-action-body"><b>{a.title}</b><small>{a.detail}</small></span>
                        <span className="dash-action-cta">{a.cta}<ArrowRight size={13} /></span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="dash-clear">
                  <CircleCheck size={26} />
                  <b>{kpis.total_buyers || kpis.active_litters ? 'You are all caught up' : 'Nothing needs you yet'}</b>
                  <p>{kpis.total_buyers || kpis.active_litters ? 'Follow-ups, unsigned contracts and litter updates will show up here the moment they need you.' : 'Once you add a litter and a few buyers, this list tells you what to do each day.'}</p>
                </div>
              )}
            </section>

            <section className="dash-card animate-fade-in-up">
              <div className="dash-card-head">
                <h3 className="dash-h3">Your litters</h3>
                <Link href="/dashboard/litters" className="dash-link">All litters<ArrowRight size={13} /></Link>
              </div>
              {litters.length ? (
                <div className="dash-litters">{litters.map(l => <LitterBoard key={l.id} litter={l} />)}</div>
              ) : (
                <div className="dash-clear">
                  <Heart size={26} />
                  <b>No active litters</b>
                  <p>Create one to track its stage, waitlist and deposits in one card.</p>
                  <Link href="/dashboard/litters/new" className="btn-primary">New litter</Link>
                </div>
              )}
            </section>
          </div>

          <div className="dash-col">
            <section className="dash-card animate-fade-in-up">
              <div className="dash-card-head">
                <h3 className="dash-h3">Buyer pipeline</h3>
                <Link href="/dashboard/buyers" className="dash-link">All buyers<ArrowRight size={13} /></Link>
              </div>
              <ul className="dash-pipe">
                {pipeline.map(p => (
                  <li key={p.status}>
                    <span>{p.label}</span>
                    <div className="dash-pipe-bar"><div style={{ width: `${(p.count / maxPipe) * 100}%` }} /></div>
                    <b>{p.count}</b>
                  </li>
                ))}
              </ul>
            </section>

            <section className="dash-card animate-fade-in-up">
              <div className="dash-card-head"><h3 className="dash-h3">Coming up</h3></div>
              {upcoming.length ? (
                <ul className="dash-upcoming">
                  {upcoming.map((e, i) => {
                    const Icon = EVENT_ICON[e.kind] ?? CalendarDays
                    const d = parseISO(e.date)
                    return (
                      <li key={i}>
                        <Link href={e.href}>
                          <span className="dash-date"><b>{format(d, 'd')}</b>{format(d, 'MMM')}</span>
                          <span className="dash-up-body"><Icon size={14} />{e.title}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="dash-muted dash-pad">Due dates, go-home days and follow-ups land here once you set them.</p>
              )}
            </section>

            {aiOn ? (
              <section className="dash-ai animate-fade-in-up">
                <div className="dash-ai-head"><Sparkles size={15} /> Claude can do this for you</div>
                <Link href="/dashboard/contracts/new"><FileText size={15} />Draft a sales contract</Link>
                {firstLitter && <Link href={`/dashboard/litters/${firstLitter.id}`}><Mail size={15} />Announce {firstLitter.name}</Link>}
                <Link href="/dashboard/buyers"><Users size={15} />Write a buyer email</Link>
                <Link href={firstLitter ? `/dashboard/litters/${firstLitter.id}` : '/dashboard/litters'}><Heart size={15} />Match buyers to a litter</Link>
              </section>
            ) : (
              <section className="dash-ai muted animate-fade-in-up">
                <div className="dash-ai-head"><Sparkles size={15} /> Pro adds AI</div>
                <p>Contract drafts, litter announcements and buyer emails, written for you to review.</p>
                <Link href="/dashboard/upgrade" className="dash-ai-cta">See Pro<ArrowRight size={13} /></Link>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
