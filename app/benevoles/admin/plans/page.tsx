import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlanCalendar } from './PlanCalendar'
import { ICalCopySection } from './ICalCopySection'
import { IconCalendar, IconMusicalNote } from '@/app/benevoles/_components/Icons'

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
  searchParams: Promise<{ view?: string; month?: string }>
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

  const allPlans = [...(upcoming ?? []), ...(past ?? [])] as PlanItem[]

  // Compte affectations (liste seulement)
  const countByPlan: Record<string, number> = {}
  if (view === 'list') {
    const allIds = allPlans.map(p => p.id)
    const { data: counts } = await supabase
      .from('plan_assignments')
      .select('plan_id')
      .in('plan_id', allIds.length ? allIds : [''])
    counts?.forEach(c => { countByPlan[c.plan_id] = (countByPlan[c.plan_id] ?? 0) + 1 })
  }

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

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm shrink-0">←</Link>
          <h1 className="font-display text-xl md:text-2xl text-dark font-light truncate">Planification</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Liste / Calendrier */}
          <div className="flex rounded-lg border border-teal/20 overflow-hidden">
            <Link
              href="?view=list"
              className={`px-3 py-1.5 font-sans text-xs font-medium transition-colors ${view === 'list' ? 'bg-teal text-white' : 'text-dark/50 hover:bg-teal/5'}`}
            >
              ☰ Liste
            </Link>
            <Link
              href="?view=calendar"
              className={`px-3 py-1.5 font-sans text-xs font-medium transition-colors flex items-center gap-1 ${view === 'calendar' ? 'bg-teal text-white' : 'text-dark/50 hover:bg-teal/5'}`}
            >
              <IconCalendar className="w-3 h-3" />
              Calendrier
            </Link>
          </div>
          {canManage && (
            <Link
              href="/benevoles/admin/plans/nouveau"
              className="shrink-0 px-3 py-1.5 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
            >
              + Nouveau
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

        {view === 'calendar' ? (
          <PlanCalendar
            plans={allPlans}
            monthParam={params.month}
            icalUrl={icalUrl}
          />
        ) : (
          <>
            {/* Liste À venir */}
            <section>
              <h2 className="font-display text-xl text-dark font-light mb-3">À venir</h2>
              <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
                {upcoming && upcoming.length > 0 ? (
                  <>
                    {/* Mobile : cartes */}
                    <div className="md:hidden divide-y divide-teal/10">
                      {(upcoming as PlanItem[]).map(p => <PlanCard key={p.id} plan={p} />)}
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
                          {(upcoming as PlanItem[]).map(p => <PlanRow key={p.id} plan={p} />)}
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

            {/* Passés */}
            {past && past.length > 0 && (
              <section>
                <h2 className="font-display text-xl text-dark font-light mb-3 text-dark/50">Passés</h2>
                <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden opacity-60">
                  {/* Mobile : cartes */}
                  <div className="md:hidden divide-y divide-teal/10">
                    {(past as PlanItem[]).map(p => <PlanCard key={p.id} plan={p} />)}
                  </div>
                  {/* Desktop : tableau */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[480px]">
                      <tbody>
                        {(past as PlanItem[]).map(p => <PlanRow key={p.id} plan={p} />)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {canManage && <ICalCopySection icalUrl={icalUrl} />}
          </>
        )}
      </main>
    </div>
  )
}
