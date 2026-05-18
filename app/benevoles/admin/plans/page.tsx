import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PlansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin' && me?.permission !== 'editor') redirect('/benevoles/dashboard')

  const { data: upcoming } = await supabase
    .from('plans')
    .select('id, title, service_date, teams(name)')
    .gte('service_date', new Date().toISOString())
    .order('service_date')

  const { data: past } = await supabase
    .from('plans')
    .select('id, title, service_date, teams(name)')
    .lt('service_date', new Date().toISOString())
    .order('service_date', { ascending: false })
    .limit(5)

  // Compte des affectations par plan
  const allPlanIds = [...(upcoming ?? []), ...(past ?? [])].map(p => p.id)
  const { data: counts } = await supabase
    .from('plan_assignments')
    .select('plan_id')
    .in('plan_id', allPlanIds.length ? allPlanIds : [''])

  const countByPlan: Record<string, number> = {}
  counts?.forEach(c => { countByPlan[c.plan_id] = (countByPlan[c.plan_id] ?? 0) + 1 })

  function PlanRow({ plan }: { plan: { id: string; title: string; service_date: string; teams: unknown } }) {
    const team = plan.teams as unknown as { name: string } | null
    const date = new Date(plan.service_date).toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
    const n = countByPlan[plan.id] ?? 0
    return (
      <tr className="border-b border-teal/10 last:border-0 hover:bg-teal-50/40 transition-colors cursor-pointer group">
        <td className="px-6 py-4 font-sans text-sm text-dark/50 capitalize">
          <Link href={`/benevoles/admin/plans/${plan.id}`} className="block">{date}</Link>
        </td>
        <td className="px-6 py-4 font-sans text-sm text-dark font-medium">
          <Link href={`/benevoles/admin/plans/${plan.id}`} className="block">{plan.title}</Link>
        </td>
        <td className="px-6 py-4 font-sans text-sm text-dark/50">
          <Link href={`/benevoles/admin/plans/${plan.id}`} className="block">{team?.name ?? 'Toutes'}</Link>
        </td>
        <td className="px-6 py-4 font-sans text-sm text-dark/50">
          <Link href={`/benevoles/admin/plans/${plan.id}`} className="block">{n} affecté{n > 1 ? 's' : ''}</Link>
        </td>
        <td className="px-6 py-4 text-right">
          <Link href={`/benevoles/admin/plans/${plan.id}`} className="text-teal font-sans text-sm hover:underline">
            Gérer →
          </Link>
        </td>
      </tr>
    )
  }

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm shrink-0">
            ←
          </Link>
          <h1 className="font-display text-xl md:text-2xl text-dark font-light truncate">Planification</h1>
        </div>
        <Link
          href="/benevoles/admin/plans/nouveau"
          className="shrink-0 px-3 md:px-4 py-2 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
        >
          + Nouveau
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* À venir */}
        <section>
          <h2 className="font-display text-xl text-dark font-light mb-3">À venir</h2>
          <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
            {upcoming && upcoming.length > 0 ? (
              <div className="overflow-x-auto">
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
                  {upcoming.map(p => <PlanRow key={p.id} plan={p} />)}
                </tbody>
              </table>
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="font-sans text-sm text-dark/40 mb-3">Aucun service planifié.</p>
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
              <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <tbody>
                  {past.map(p => <PlanRow key={p.id} plan={p} />)}
                </tbody>
              </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
