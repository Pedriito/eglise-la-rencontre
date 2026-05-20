import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { respondAssignment } from '../admin/plans/actions'
import { permissionLabels } from '@/lib/labels'
import { StatusDot } from '../_components/StatusDot'
import { CancelAssignmentButton } from './CancelAssignmentButton'

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

  const [{ data: profile }, { data: teams }, { data: assignments }] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name, permission').eq('id', user.id).single(),
    supabase.from('team_members').select('role, teams(id, name)').eq('user_id', user.id),
    supabase
      .from('plan_assignments')
      .select('id, status, plans(title, service_date), positions(name), teams(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const isEditorOrAdmin = profile?.permission === 'admin' || profile?.permission === 'editor'

  // Pour les éditeurs/admins : tous les services à venir
  const { data: allPlans } = isEditorOrAdmin
    ? await supabase
        .from('plans')
        .select('id, title, service_date')
        .gte('service_date', new Date().toISOString())
        .order('service_date')
        .limit(10)
    : { data: null }

  // Sépare à venir / passés
  const now = new Date()
  const upcoming = assignments?.filter(a => {
    const plan = a.plans as unknown as { service_date: string } | null
    return plan && new Date(plan.service_date) >= now
  }) ?? []
  const pending = upcoming.filter(a => a.status === 'pending')

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4">
        <h1 className="font-display text-2xl text-dark font-light">Tableau de bord</h1>
        <p className="text-xs text-dark/50 font-sans mt-0.5">{permissionLabels[profile?.permission ?? ''] ?? profile?.permission}</p>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

        {/* Demandes en attente */}
        {pending.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-dark font-light mb-3">
              En attente de réponse
              <span className="ml-2 text-sm bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-sans">{pending.length}</span>
            </h2>
            <div className="space-y-2">
              {pending.map(a => {
                const plan = a.plans as unknown as { title: string; service_date: string } | null
                const pos = a.positions as unknown as { name: string } | null
                const date = plan ? new Date(plan.service_date).toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                }) : '—'
                return (
                  <div key={a.id} className="bg-white rounded-xl border border-amber-200 px-4 py-4 flex items-start sm:items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div>
                      <p className="font-sans text-sm text-dark font-medium capitalize">{date}</p>
                      <p className="font-sans text-xs text-dark/50 mt-0.5">
                        {plan?.title}{pos ? ` · ${pos.name}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={respondAssignment}>
                        <input type="hidden" name="assignment_id" value={a.id} />
                        <input type="hidden" name="status" value="confirmed" />
                        <button type="submit" className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg font-sans text-xs font-medium hover:bg-green-200 transition-colors">
                          Confirmer
                        </button>
                      </form>
                      <form action={respondAssignment}>
                        <input type="hidden" name="assignment_id" value={a.id} />
                        <input type="hidden" name="status" value="declined" />
                        <button type="submit" className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg font-sans text-xs font-medium hover:bg-red-100 transition-colors">
                          Décliner
                        </button>
                      </form>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Raccourcis admin */}
        {isEditorOrAdmin && (
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/benevoles/admin"
              className="flex items-center justify-between bg-white rounded-xl border border-teal/20 px-5 py-4 hover:border-teal/40 transition-colors group"
            >
              <p className="font-sans text-sm text-dark/70 font-medium">Bénévoles</p>
              <span className="text-teal font-sans text-sm group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
            <Link
              href="/benevoles/admin/stats"
              className="flex items-center justify-between bg-white rounded-xl border border-teal/20 px-5 py-4 hover:border-teal/40 transition-colors group"
            >
              <p className="font-sans text-sm text-dark/70 font-medium">Statistiques</p>
              <span className="text-teal font-sans text-sm group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        )}

        {/* Gestion — accessible à tous */}
        <section>
          <Link
            href="/benevoles/gestion"
            className="flex items-center justify-between bg-white rounded-2xl border border-teal/20 px-6 py-5 hover:border-teal/40 transition-colors group"
          >
            <div>
              <p className="font-sans text-sm text-dark font-medium">Gestion des équipes</p>
              <p className="font-sans text-xs text-dark/40 mt-0.5">Tâches et décisions en attente</p>
            </div>
            <span className="text-teal font-sans text-sm group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </section>

        {/* Services à venir — éditeurs/admins */}
        {isEditorOrAdmin && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl text-dark font-light">Services à venir</h2>
              <Link href="/benevoles/admin/plans" className="text-sm text-teal font-sans hover:underline">
                Tout voir →
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
              {allPlans && allPlans.length > 0 ? (
                <div className="divide-y divide-teal/10">
                  {allPlans.map(p => {
                    const date = new Date(p.service_date).toLocaleDateString('fr-FR', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })
                    return (
                      <Link
                        key={p.id}
                        href={`/benevoles/admin/plans/${p.id}`}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-teal-50/40 transition-colors group"
                      >
                        <div>
                          <p className="font-sans text-sm text-dark font-medium">{p.title}</p>
                          <p className="font-sans text-xs text-dark/50 capitalize mt-0.5">{date}</p>
                        </div>
                        <span className="text-teal font-sans text-sm group-hover:translate-x-0.5 transition-transform">→</span>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="font-sans text-sm text-dark/40 mb-2">Aucun service planifié.</p>
                  <Link href="/benevoles/admin/plans/nouveau" className="text-teal font-sans text-sm hover:underline">
                    Créer un service →
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Planning personnel */}
        <section>
          <h2 className="font-display text-xl text-dark font-light mb-3">Mon planning</h2>
          <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
            {upcoming.length > 0 ? (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="border-b border-teal/10">
                    <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Service</th>
                    <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Poste</th>
                    <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Statut</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((a, i) => {
                    const plan = a.plans as unknown as { title: string; service_date: string } | null
                    const pos = a.positions as unknown as { name: string } | null
                    const team = a.teams as unknown as { name: string } | null
                    const date = plan ? new Date(plan.service_date).toLocaleDateString('fr-FR', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    }) : '—'
                    return (
                      <tr key={a.id} className={i % 2 === 0 ? '' : 'bg-teal-50/40'}>
                        <td className="px-6 py-4 font-sans text-sm text-dark/60 capitalize">{date}</td>
                        <td className="px-6 py-4 font-sans text-sm text-dark font-medium">{plan?.title ?? '—'}</td>
                        <td className="px-6 py-4 font-sans text-sm text-dark/70">{pos?.name ?? team?.name ?? '—'}</td>
                        <td className="px-6 py-4"><StatusDot status={a.status} /></td>
                        <td className="px-6 py-4 text-right">
                          {a.status === 'confirmed' && (
                            <CancelAssignmentButton assignmentId={a.id} />
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="font-sans text-sm text-dark/40">Aucun service planifié pour le moment.</p>
              </div>
            )}
          </div>
        </section>

        {/* Historique */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl text-dark font-light">Historique</h2>
            <Link href="/benevoles/historique" className="text-sm text-teal font-sans hover:underline">
              Voir tout →
            </Link>
          </div>
          <Link
            href="/benevoles/historique"
            className="flex items-center justify-between bg-white rounded-2xl border border-teal/20 px-6 py-5 hover:border-teal/40 transition-colors group"
          >
            <p className="font-sans text-sm text-dark/60">Services passés auxquels j'ai participé</p>
            <span className="text-teal font-sans text-sm group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </section>

        {/* Mes équipes + indisponibilités */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <section>
            <h2 className="font-display text-xl text-dark font-light mb-3">Mes équipes</h2>
            {teams && teams.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {teams.map((t, i) => {
                  const team = t.teams as unknown as { id: string; name: string } | null
                  if (!team) return null
                  return (
                    <Link
                      key={i}
                      href={`/benevoles/admin/equipes/${team.id}`}
                      className="px-3 py-1.5 bg-white border border-teal/20 rounded-full font-sans text-sm text-dark hover:border-teal/50 hover:text-teal transition-colors"
                    >
                      {t.role === 'leader' && <span className="text-teal mr-1">★</span>}
                      {team.name}
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-teal/20 px-6 py-6 text-center">
                <p className="font-sans text-sm text-dark/40">Pas encore d'équipe assignée.</p>
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display text-xl text-dark font-light mb-3">Indisponibilités</h2>
            <Link
              href="/benevoles/mes-indisponibilites"
              className="flex items-center justify-between bg-white rounded-2xl border border-teal/20 px-6 py-5 hover:border-teal/40 transition-colors group"
            >
              <p className="font-sans text-sm text-dark/60">Gérer mes dates bloquées</p>
              <span className="text-teal font-sans text-sm group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </section>

          <section>
            <h2 className="font-display text-xl text-dark font-light mb-3">Mon profil</h2>
            <Link
              href="/benevoles/profil"
              className="flex items-center justify-between bg-white rounded-2xl border border-teal/20 px-6 py-5 hover:border-teal/40 transition-colors group"
            >
              <div>
                <p className="font-sans text-sm text-dark font-medium">{profile?.first_name} {profile?.last_name}</p>
                <p className="font-sans text-xs text-dark/40 mt-0.5">Modifier mes informations</p>
              </div>
              <span className="text-teal font-sans text-sm group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </section>
        </div>
      </main>
    </div>
  )
}

