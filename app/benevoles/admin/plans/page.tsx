import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlanCalendar } from './PlanCalendar'
import { SubscribeCalendarButton } from './SubscribeCalendarButton'
import { IconCalendar, IconMusicalNote } from '@/app/benevoles/_components/Icons'
import { getPlanDetail } from './getPlanDetail'
import { TriagePanel } from './TriagePanel'
import { AssignmentBoard } from './AssignmentBoard'
import { VolunteerPicker } from './VolunteerPicker'

export type PlanItem = {
  id: string
  title: string
  service_date: string
  plan_type: string | null
  teams: unknown
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; plan?: string; fill?: string; sent?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()

  const isAdmin   = ['admin', 'super_admin'].includes(me?.permission ?? '')
  const isEditor  = me?.permission === 'editor'
  const canManage = isAdmin || isEditor

  const params = await searchParams
  const view   = params.view === 'calendar' ? 'calendar' : 'list'

  // Pour le calendrier : charger les plans du mois en cours + 2 mois
  // Pour la liste : plans à venir + 10 passés
  const now = new Date().toISOString()

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from('plans')
      .select('id, title, service_date, plan_type, teams(name)')
      .gte('service_date', now)
      .order('service_date'),
    canManage
      ? supabase
          .from('plans')
          .select('id, title, service_date, plan_type, teams(name)')
          .lt('service_date', now)
          .order('service_date', { ascending: false })
          .limit(view === 'calendar' ? 60 : 10)
      : Promise.resolve({ data: [] as PlanItem[] }),
  ])

  const upcomingPlans = (upcoming ?? []) as PlanItem[]
  const pastPlans = (past ?? []) as PlanItem[]
  const allPlans = [...upcomingPlans, ...pastPlans]

  // Compte affectations (liste + agenda du calendrier)
  const countByPlan: Record<string, number> = {}
  const allIds = allPlans.map(p => p.id)
  const { data: counts } = await supabase
    .from('plan_assignments')
    .select('plan_id')
    .in('plan_id', allIds.length ? allIds : [''])
  counts?.forEach(c => { countByPlan[c.plan_id] = (countByPlan[c.plan_id] ?? 0) + 1 })

  // Token iCal (généré une fois, stocké dans projection_settings)
  const admin = createAdminClient()
  const { data: settings } = await admin
    .from('projection_settings')
    .select('calendar_token')
    .single()
  let calToken = settings?.calendar_token as string | null
  if (!calToken) {
    calToken = crypto.randomUUID()
    await admin.from('projection_settings').update({ calendar_token: calToken }).not('id', 'is', null)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('http://localhost')
    ? 'https://www.egliselarencontre.fr'
    : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.egliselarencontre.fr')
  const icalUrl = `${siteUrl}/api/calendar/${calToken}.ics`

  // ── Workspace desktop unifié (≥ xl, admin/editor, vue liste) ──────────
  const selectedPlanId = view === 'list'
    ? (params.plan ?? upcomingPlans[0]?.id ?? pastPlans[0]?.id ?? null)
    : null
  const detail = (canManage && selectedPlanId)
    ? await getPlanDetail(supabase, selectedPlanId, user.id, isAdmin)
    : null
  const fillKey = params.fill ?? null

  const openPositionsCount = detail
    ? detail.teams.filter(t => t.visible).reduce((sum, t) => {
        if (t.positions.length === 0) return sum
        const filledIds = new Set(t.assignments.map(a => a.position_id).filter(Boolean))
        return sum + t.positions.filter(p => !filledIds.has(p.id)).length
      }, 0)
    : 0

  function PlanRow({ plan }: { plan: PlanItem }) {
    const team = plan.teams as unknown as { name: string } | null
    const date = new Date(plan.service_date).toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
    const n    = countByPlan[plan.id] ?? 0
    const past = plan.service_date < now
    return (
      <tr className={`border-b border-teal/10 last:border-0 hover:bg-teal-50/40 transition-colors ${past ? 'opacity-50' : ''}`}>
        <td className="px-6 py-4 font-sans text-sm text-dark/50 capitalize">
          <Link href={`/benevoles/admin/plans/${plan.id}`} className="block">{date}</Link>
        </td>
        <td className="px-6 py-4 font-sans text-sm text-dark font-medium">
          <Link href={`/benevoles/admin/plans/${plan.id}`} className="flex items-center gap-2">
            {plan.plan_type === 'rehearsal' && <IconMusicalNote className="w-3 h-3 text-teal/60 shrink-0" />}
            {plan.title}
          </Link>
        </td>
        <td className="px-6 py-4 font-sans text-sm text-dark/50">
          <Link href={`/benevoles/admin/plans/${plan.id}`} className="block">{team?.name ?? 'Toutes'}</Link>
        </td>
        <td className="px-6 py-4 font-sans text-sm text-dark/50">
          <Link href={`/benevoles/admin/plans/${plan.id}`} className="block">{n} affecté{n > 1 ? 's' : ''}</Link>
        </td>
        <td className="px-6 py-4 text-right">
          <Link href={`/benevoles/admin/plans/${plan.id}`} className="text-teal font-sans text-sm hover:underline">
            {canManage ? 'Gérer →' : 'Voir →'}
          </Link>
        </td>
      </tr>
    )
  }

  function PlanCard({ plan }: { plan: PlanItem }) {
    const team = plan.teams as unknown as { name: string } | null
    const date = new Date(plan.service_date).toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
    const time = new Date(plan.service_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const n    = countByPlan[plan.id] ?? 0
    const past = plan.service_date < now
    return (
      <Link
        href={`/benevoles/admin/plans/${plan.id}`}
        className={`flex items-center justify-between gap-3 px-4 py-3.5 border-b border-teal/10 last:border-0 hover:bg-teal-50/40 transition-colors ${past ? 'opacity-50' : ''}`}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {plan.plan_type === 'rehearsal' && <IconMusicalNote className="w-3 h-3 text-teal/50 shrink-0" />}
            <p className="font-sans text-sm text-dark font-medium truncate">{plan.title}</p>
          </div>
          <p className="font-sans text-xs text-dark/50 capitalize">{date} · {time}</p>
          {team && <p className="font-sans text-xs text-dark/40 mt-0.5">{team.name}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {n > 0 && <span className="font-sans text-xs text-dark/40 tabular-nums">{n} pers.</span>}
          <span className="text-teal font-sans text-sm">→</span>
        </div>
      </Link>
    )
  }

  /** Liste à venir / passés + export iCal — vue classique (mobile, tablette, et non-managers). */
  function ClassicListView() {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <section>
          <h2 className="font-display text-xl text-dark font-light mb-3">À venir</h2>
          <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
            {upcomingPlans.length > 0 ? (
              <>
                {/* Mobile : cartes */}
                <div className="md:hidden divide-y divide-teal/10">
                  {upcomingPlans.map(p => <PlanCard key={p.id} plan={p} />)}
                </div>
                {/* Desktop : tableau */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[480px]">
                    <thead>
                      <tr className="border-b border-teal/10">
                        <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Date</th>
                        <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Titre</th>
                        <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Équipe</th>
                        <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Bénévoles</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcomingPlans.map(p => <PlanRow key={p.id} plan={p} />)}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="font-sans text-sm text-dark/40 mb-3">Aucun service à venir.</p>
                <Link href="/benevoles/admin/plans/nouveau" className="text-teal font-sans text-sm hover:underline">
                  Créer le premier service →
                </Link>
              </div>
            )}
          </div>
        </section>

        {pastPlans.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-dark font-light mb-3 text-dark/50">Passés</h2>
            <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden opacity-60">
              <div className="md:hidden divide-y divide-teal/10">
                {pastPlans.map(p => <PlanCard key={p.id} plan={p} />)}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <tbody>
                    {pastPlans.map(p => <PlanRow key={p.id} plan={p} />)}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {canManage && (
          <div className="flex justify-center">
            <SubscribeCalendarButton icalUrl={icalUrl} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-lg shrink-0">‹</Link>
          <h1 className="font-display text-xl md:text-2xl text-dark font-light truncate">Planification</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Liste / Calendrier */}
          <div className="flex rounded-full bg-dark/5 p-1 gap-1">
            <Link
              href="?view=list"
              className={`px-3 py-1.5 rounded-full font-sans text-xs font-medium transition-colors flex items-center gap-1 ${view === 'list' ? 'bg-white text-dark shadow-sm' : 'text-dark/45 hover:text-dark'}`}
            >
              ☰ Liste
            </Link>
            <Link
              href="?view=calendar"
              className={`px-3 py-1.5 rounded-full font-sans text-xs font-medium transition-colors flex items-center gap-1 ${view === 'calendar' ? 'bg-white text-dark shadow-sm' : 'text-dark/45 hover:text-dark'}`}
            >
              <IconCalendar className="w-3 h-3" />
              Calendrier
            </Link>
          </div>
          {canManage && (
            <Link
              href="/benevoles/admin/plans/nouveau"
              className="shrink-0 px-3.5 py-1.5 bg-coral text-white rounded-full font-sans text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + Nouveau
            </Link>
          )}
        </div>
      </header>

      <main className="px-4 md:px-6 py-6 md:py-8">
        {view === 'calendar' ? (
          <div className="max-w-5xl mx-auto">
            <PlanCalendar plans={allPlans} monthParam={params.month} icalUrl={icalUrl} canManage={canManage} countByPlan={countByPlan} />
          </div>
        ) : canManage && detail && selectedPlanId ? (
          <>
            {/* ≥ xl : workspace unifié triage + tableau d'affectation + sélecteur */}
            <div className="hidden xl:flex gap-5 max-w-370 mx-auto items-start">
              <TriagePanel
                plans={upcomingPlans}
                pastPlans={pastPlans}
                countByPlan={countByPlan}
                selectedPlanId={selectedPlanId}
                openPositionsCount={openPositionsCount}
                pendingCount={detail.pendingCount}
                featuredPlanTitle={detail.plan.title}
              />
              <AssignmentBoard
                planId={selectedPlanId}
                detail={detail}
                fillKey={fillKey}
                isAdmin={isAdmin}
                flashError={params.error}
                flashSent={params.sent}
              />
              <VolunteerPicker planId={selectedPlanId} detail={detail} fillKey={fillKey} />
            </div>
            {/* < xl : liste classique */}
            <div className="xl:hidden">
              <ClassicListView />
            </div>
          </>
        ) : (
          <ClassicListView />
        )}
      </main>
    </div>
  )
}
