import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addAssignment, removeAssignment, deletePlan } from '../actions'

const statusStyles: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  declined:  'bg-red-100 text-red-600',
  pending:   'bg-amber-100 text-amber-700',
}
const statusLabels: Record<string, string> = {
  confirmed: 'Confirmé',
  declined:  'Décliné',
  pending:   'En attente',
}

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  const isAdmin = me?.permission === 'admin' || me?.permission === 'editor'
  if (!isAdmin) redirect('/benevoles/dashboard')

  const [{ data: plan }, { data: assignments }, { data: allProfiles }, { data: allPositions }, { data: blockouts }] = await Promise.all([
    supabase.from('plans').select('id, title, service_date, notes, teams(name)').eq('id', id).single(),
    supabase
      .from('plan_assignments')
      .select('id, status, user_id, profiles(first_name, last_name), positions(name, team_id, teams(name))')
      .eq('plan_id', id)
      .order('status'),
    supabase.from('profiles').select('id, first_name, last_name').order('last_name'),
    supabase.from('positions').select('id, name, team_id, teams(name)').order('teams(name), name'),
    supabase.from('blockout_dates').select('user_id, start_date, end_date'),
  ])

  if (!plan) redirect('/benevoles/admin/plans')

  const assignedUserIds = new Set(assignments?.map(a => a.user_id))

  // Bénévoles indisponibles ce jour-là
  const planDate = plan.service_date.split('T')[0]
  const unavailableIds = new Set(
    blockouts
      ?.filter(b => b.start_date <= planDate && b.end_date >= planDate)
      .map(b => b.user_id) ?? []
  )
  const availableProfiles = allProfiles?.filter(p => !assignedUserIds.has(p.id)) ?? []

  const date = new Date(plan.service_date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const time = new Date(plan.service_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  // Grouper les affectations par équipe
  const byTeam: Record<string, typeof assignments> = {}
  assignments?.forEach(a => {
    const pos = a.positions as unknown as { name: string; teams: { name: string } } | null
    const teamName = pos?.teams?.name ?? 'Sans équipe'
    if (!byTeam[teamName]) byTeam[teamName] = []
    byTeam[teamName]!.push(a)
  })

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/benevoles/admin/plans" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm">
            ← Planification
          </Link>
          <div>
            <h1 className="font-display text-2xl text-dark font-light">{plan.title}</h1>
            <p className="text-xs text-dark/50 font-sans capitalize">{date} · {time}</p>
          </div>
        </div>
        <form action={deletePlan}>
          <input type="hidden" name="plan_id" value={id} />
          <button type="submit" className="text-xs text-dark/30 hover:text-red-400 transition-colors font-sans">
            Supprimer
          </button>
        </form>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {plan.notes && (
          <div className="bg-teal/10 rounded-xl px-5 py-3 font-sans text-sm text-dark/70">
            {plan.notes}
          </div>
        )}

        {/* Affectations groupées par équipe */}
        {assignments && assignments.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-dark font-light mb-3">
              Affectations <span className="text-dark/30 text-base">({assignments.length})</span>
            </h2>
            <div className="space-y-3">
              {Object.entries(byTeam).map(([teamName, members]) => (
                <div key={teamName} className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
                  <div className="px-5 py-2.5 border-b border-teal/10 bg-teal-50/50">
                    <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">{teamName}</p>
                  </div>
                  <div className="divide-y divide-teal/10">
                    {members?.map(a => {
                      const profile = a.profiles as unknown as { first_name: string; last_name: string } | null
                      const pos = a.positions as unknown as { name: string } | null
                      return (
                        <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                          <div>
                            <span className="font-sans text-sm text-dark font-medium">
                              {profile?.first_name} {profile?.last_name}
                            </span>
                            {pos && (
                              <span className="text-dark/40 font-sans text-sm"> · {pos.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {unavailableIds.has(a.user_id) && (
                              <span className="text-xs text-red-400 font-sans">⚠ Indisponible</span>
                            )}
                            <span className={`px-2.5 py-1 rounded-full text-xs font-sans font-medium ${statusStyles[a.status] ?? ''}`}>
                              {statusLabels[a.status] ?? a.status}
                            </span>
                            <form action={removeAssignment}>
                              <input type="hidden" name="plan_id" value={id} />
                              <input type="hidden" name="assignment_id" value={a.id} />
                              <button type="submit" className="text-xs text-dark/30 hover:text-red-400 transition-colors font-sans">
                                ×
                              </button>
                            </form>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ajouter une affectation */}
        {availableProfiles.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-dark font-light mb-3">Affecter un bénévole</h2>
            <div className="bg-white rounded-2xl border border-teal/20 p-6">
              <form action={addAssignment} className="flex flex-wrap gap-3 items-end">
                <input type="hidden" name="plan_id" value={id} />

                <div>
                  <label className="block text-xs font-sans text-dark/50 mb-1">Bénévole</label>
                  <select name="user_id" className="px-3 py-2 rounded-lg border border-teal/30 bg-teal-50 text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/40">
                    {availableProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-sans text-dark/50 mb-1">Poste</label>
                  <select name="position_id" className="px-3 py-2 rounded-lg border border-teal/30 bg-teal-50 text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/40">
                    <option value="">— Sans poste —</option>
                    {allPositions?.map(p => {
                      const team = p.teams as unknown as { name: string } | null
                      return (
                        <option key={p.id} value={p.id}>
                          {team?.name} · {p.name}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <button type="submit" className="px-4 py-2 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors">
                  Affecter
                </button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
