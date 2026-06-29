import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { respondAssignment } from '../admin/plans/actions'
import { CancelAssignmentButton } from './CancelAssignmentButton'
import { PushManager } from '../_components/PushManager'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: profileCheck } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()
  if (profileCheck?.status === 'invited') redirect('/benevoles/set-password')

  const now = new Date()
  const yearStart  = new Date(now.getFullYear(), 0, 1).toISOString()
  const quarterMonth = Math.floor(now.getMonth() / 3) * 3
  const quarterStart = new Date(now.getFullYear(), quarterMonth, 1).toISOString()

  const [
    { data: profile },
    { data: teamMemberships },
    { data: assignments },
    { data: confirmedHistory },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('first_name, last_name, permission')
      .eq('id', user.id)
      .single(),
    supabase
      .from('team_members')
      .select('role, teams(id, name)')
      .eq('user_id', user.id),
    supabase
      .from('plan_assignments')
      .select('id, status, plans(id, title, service_date), positions(name), teams(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('plan_assignments')
      .select('plans(service_date)')
      .eq('user_id', user.id)
      .eq('status', 'confirmed'),
  ])

  // Upcoming assignments sorted by service_date asc
  const upcoming = (assignments ?? [])
    .filter(a => {
      const plan = a.plans as unknown as { service_date: string } | null
      return plan && new Date(plan.service_date) >= now
    })
    .sort((a, b) => {
      const dA = (a.plans as unknown as { service_date: string } | null)?.service_date ?? ''
      const dB = (b.plans as unknown as { service_date: string } | null)?.service_date ?? ''
      return dA.localeCompare(dB)
    })

  const pending       = upcoming.filter(a => a.status === 'pending')
  const nextConfirmed = upcoming.find(a => a.status === 'confirmed')
  const nextPlan      = nextConfirmed
    ? nextConfirmed.plans as unknown as { id: string; title: string; service_date: string } | null
    : null

  // Stats (services confirmés ce trimestre / cette année)
  const yearCount = (confirmedHistory ?? []).filter(a => {
    const d = (a.plans as unknown as { service_date: string } | null)?.service_date
    return d && d >= yearStart
  }).length
  const quarterCount = (confirmedHistory ?? []).filter(a => {
    const d = (a.plans as unknown as { service_date: string } | null)?.service_date
    return d && d >= quarterStart
  }).length

  // Days until next confirmed service
  const daysUntil = nextPlan
    ? Math.ceil((new Date(nextPlan.service_date).getTime() - now.getTime()) / 86_400_000)
    : null

  // Header date label
  const todayRaw = now.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const todayLabel = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1)

  return (
    <div className="min-h-screen bg-sand">

      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-dark/8 px-6 md:px-10 py-5">
        <div className="max-w-5xl mx-auto flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-dark font-light">Tableau de bord</h1>
            <p className="font-sans text-sm text-teal mt-1">
              {todayLabel} · Bonjour {profile?.first_name}
            </p>
          </div>
          <div className="shrink-0 pt-1">
            <PushManager />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 md:px-10 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ══ Colonne gauche ══════════════════════════════════════ */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* À confirmer */}
            {pending.length > 0 && (
              <section>
                <div className="flex items-center gap-2.5 mb-4">
                  <h2 className="font-display text-2xl text-dark font-light">À confirmer</h2>
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-white font-sans text-xs font-bold flex items-center justify-center leading-none shrink-0">
                    {pending.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {pending.map(a => {
                    const plan = a.plans as unknown as { id: string; title: string; service_date: string } | null
                    const pos  = a.positions as unknown as { name: string } | null
                    const team = a.teams    as unknown as { name: string } | null
                    const d    = plan?.service_date ? new Date(plan.service_date) : null
                    const dateLabel = d
                      ? (() => { const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1) })()
                      : '—'
                    const time = d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
                    const subtitle = [plan?.title, pos?.name ?? team?.name, time].filter(Boolean).join(' · ')

                    return (
                      <div
                        key={a.id}
                        className="bg-white rounded-2xl border border-dark/8 border-l-[4px] border-l-amber-400 px-6 py-5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="font-display text-xl text-dark font-light">{dateLabel}</p>
                          <p className="font-sans text-sm text-dark/45 mt-0.5">{subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <form action={respondAssignment}>
                            <input type="hidden" name="assignment_id" value={a.id} />
                            <input type="hidden" name="status" value="declined" />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-white border border-dark/15 text-dark/60 rounded-full font-sans text-sm hover:bg-dark/5 transition-colors"
                            >
                              Décliner
                            </button>
                          </form>
                          <form action={respondAssignment}>
                            <input type="hidden" name="assignment_id" value={a.id} />
                            <input type="hidden" name="status" value="confirmed" />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-teal-dark text-white rounded-full font-sans text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                              Je serai présent·e
                            </button>
                          </form>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Mon planning */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-2xl text-dark font-light">Mon planning</h2>
                <Link href="/benevoles/historique" className="font-sans text-sm text-teal hover:underline">
                  Tout voir →
                </Link>
              </div>
              <div className="bg-white rounded-2xl border border-dark/8 overflow-hidden">
                {upcoming.length > 0 ? (
                  <div className="divide-y divide-dark/6">
                    {upcoming.map(a => {
                      const plan = a.plans     as unknown as { id: string; title: string; service_date: string } | null
                      const pos  = a.positions as unknown as { name: string } | null
                      const team = a.teams     as unknown as { name: string } | null
                      const d    = plan?.service_date ? new Date(plan.service_date) : null
                      const weekday = d ? d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').toUpperCase() : ''
                      const dayNum  = d ? d.getDate() : ''
                      const month   = d ? d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase() : ''
                      const time    = d ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''
                      const details = [time, pos?.name, team?.name].filter(Boolean).join(' · ')
                      const isDeclined = a.status === 'declined'

                      return (
                        <div
                          key={a.id}
                          className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sand/50 ${isDeclined ? 'opacity-40' : ''}`}
                        >
                          {/* Date colonne */}
                          <div className="w-9 shrink-0 text-center leading-none">
                            <div className="font-sans text-[9px] text-dark/35 uppercase tracking-wide">{weekday}</div>
                            <div className="font-display text-[22px] text-dark/70 font-light my-0.5">{dayNum}</div>
                            <div className="font-sans text-[9px] text-dark/35 uppercase tracking-wide">{month}</div>
                          </div>

                          {/* Titre + détails */}
                          <div className="flex-1 min-w-0">
                            <p className="font-sans text-sm font-medium text-dark truncate">{plan?.title ?? '—'}</p>
                            {details && <p className="font-sans text-xs text-dark/40 mt-0.5">{details}</p>}
                          </div>

                          {/* Statut */}
                          <div className="flex items-center gap-3 shrink-0">
                            {a.status === 'confirmed' && (
                              <span className="px-2.5 py-1 rounded-full font-sans text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                Confirmé
                              </span>
                            )}
                            {a.status === 'pending' && (
                              <span className="px-2.5 py-1 rounded-full font-sans text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                                En attente
                              </span>
                            )}
                            {a.status === 'declined' && (
                              <span className="px-2.5 py-1 rounded-full font-sans text-xs font-medium bg-red-50 text-red-400 border border-red-100">
                                Décliné
                              </span>
                            )}
                            {a.status === 'confirmed' && (
                              <CancelAssignmentButton assignmentId={a.id} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="font-sans text-sm text-dark/40">Aucun service planifié pour le moment.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ══ Colonne droite ══════════════════════════════════════ */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-3">

            {/* Prochain service */}
            {nextPlan && (
              <div className="bg-teal-dark rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <p className="font-sans text-[10px] uppercase tracking-widest text-white/50 font-semibold mt-0.5">
                    Prochain service
                  </p>
                  <span className="shrink-0 font-sans text-xs text-white bg-black/20 px-2.5 py-1 rounded-full">
                    {new Date(nextPlan.service_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="font-display text-2xl text-white font-light leading-tight capitalize">
                  {(() => {
                    const s = new Date(nextPlan.service_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                    return s.charAt(0).toUpperCase() + s.slice(1)
                  })()}
                </p>
                {(() => {
                  const pos  = nextConfirmed?.positions as unknown as { name: string } | null
                  const team = nextConfirmed?.teams     as unknown as { name: string } | null
                  const sub  = [pos?.name, team?.name].filter(Boolean).join(' · ')
                  return sub ? <p className="font-sans text-sm text-white/55 mt-1">{sub}</p> : null
                })()}
                <div className="border-t border-white/15 mt-4 pt-3 flex items-center justify-between">
                  <p className="font-sans text-xs text-white/45">
                    {daysUntil !== null && daysUntil > 0
                      ? `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`
                      : "Aujourd'hui"}
                  </p>
                  <Link
                    href={`/benevoles/admin/plans/${nextPlan.id}`}
                    className="font-sans text-xs text-white/60 hover:text-white transition-colors"
                  >
                    Voir le service →
                  </Link>
                </div>
              </div>
            )}

            {/* Liens rapides */}
            <Link
              href="/benevoles/mes-indisponibilites"
              className="flex items-center justify-between bg-white rounded-2xl border border-dark/8 px-5 py-4 hover:border-dark/15 transition-colors group"
            >
              <div>
                <p className="font-sans text-sm font-semibold text-dark">Mes indisponibilités</p>
                <p className="font-sans text-xs text-dark/40 mt-0.5">Déclarer une absence</p>
              </div>
              <span className="text-dark/25 font-sans text-sm group-hover:translate-x-0.5 transition-transform shrink-0">→</span>
            </Link>

            <Link
              href="/benevoles/chants"
              className="flex items-center justify-between bg-white rounded-2xl border border-dark/8 px-5 py-4 hover:border-dark/15 transition-colors group"
            >
              <div>
                <p className="font-sans text-sm font-semibold text-dark">Les chants</p>
                <p className="font-sans text-xs text-dark/40 mt-0.5">Paroles &amp; accords</p>
              </div>
              <span className="text-dark/25 font-sans text-sm group-hover:translate-x-0.5 transition-transform shrink-0">→</span>
            </Link>

            <Link
              href="/benevoles/gestion"
              className="flex items-center justify-between bg-white rounded-2xl border border-dark/8 px-5 py-4 hover:border-dark/15 transition-colors group"
            >
              <div>
                <p className="font-sans text-sm font-semibold text-dark">Gestion équipes</p>
                <p className="font-sans text-xs text-dark/40 mt-0.5">Tâches en attente</p>
              </div>
              <span className="text-dark/25 font-sans text-sm group-hover:translate-x-0.5 transition-transform shrink-0">→</span>
            </Link>

            {/* Mes équipes */}
            {teamMemberships && teamMemberships.length > 0 && (
              <div className="pt-2">
                <p className="font-sans text-[10px] uppercase tracking-widest text-dark/35 font-semibold px-1 mb-2.5">
                  Mes équipes
                </p>
                <div className="flex flex-wrap gap-2">
                  {teamMemberships.map((t, i) => {
                    const team = t.teams as unknown as { id: string; name: string } | null
                    if (!team) return null
                    return (
                      <Link
                        key={i}
                        href={`/benevoles/admin/equipes/${team.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-dark/10 rounded-full font-sans text-xs text-dark hover:border-teal/40 transition-colors"
                      >
                        {t.role === 'leader' && <span className="text-teal text-[10px]">★</span>}
                        {team.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white rounded-2xl border border-dark/8 px-4 py-5 text-center">
                <p className="font-display text-4xl text-teal font-light">{quarterCount}</p>
                <p className="font-sans text-[10px] uppercase tracking-widest text-dark/35 mt-2 leading-tight">
                  Ce trimestre
                </p>
              </div>
              <div className="bg-white rounded-2xl border border-dark/8 px-4 py-5 text-center">
                <p className="font-display text-4xl text-teal font-light">{yearCount}</p>
                <p className="font-sans text-[10px] uppercase tracking-widest text-dark/35 mt-2 leading-tight">
                  Cette année
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
