import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTeamMonthPlanning, parseMonth, shiftMonth } from '@/lib/teamPlanning'
import { PlanningViewToggle } from '@/app/benevoles/_components/PlanningViewToggle'
import { TeamPlanningGrid } from './TeamPlanningGrid'

type TeamOption = { id: string; name: string }

const href = (team: string, month: string) => `/benevoles/equipe?team=${team}&month=${month}`

export default async function TeamPlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  const isAdmin = ['admin', 'super_admin'].includes(me?.permission ?? '')
  if (!isAdmin && me?.permission !== 'editor') redirect('/benevoles/dashboard')

  // Admin : toutes les équipes. Éditeur : uniquement celles dont il est responsable
  // (même règle que admin/equipes et que les actions de ./actions.ts).
  let teams: TeamOption[]
  if (isAdmin) {
    const { data } = await supabase.from('teams').select('id, name').order('name')
    teams = data ?? []
  } else {
    const { data } = await supabase
      .from('team_members')
      .select('teams(id, name)')
      .eq('user_id', user.id)
      .eq('role', 'leader')
    teams = (data ?? [])
      .map(r => r.teams as unknown as TeamOption | null)
      .filter((t): t is TeamOption => !!t)
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }

  const params = await searchParams
  const month = parseMonth(params.month)
  const current = teams.find(t => t.id === params.team) ?? teams[0]
  const planning = current ? await getTeamMonthPlanning(createAdminClient(), current.id, month) : null

  const monthLabel = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 pb-3" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 16px, 16px)' }}>
        <div className="flex items-center gap-4">
          <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm shrink-0">←</Link>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-xs text-dark/40 uppercase tracking-widest font-medium">Planifier</p>
            <h1 className="font-display text-2xl text-dark font-light">Planification</h1>
          </div>
          <PlanningViewToggle current="team" showTeam className="hidden md:flex shrink-0" />
        </div>
        <PlanningViewToggle current="team" showTeam className="md:hidden flex mt-3 w-fit" />
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-4">
        {current && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            {teams.length > 1 ? (
              <nav aria-label="Équipes" className="flex flex-wrap gap-2">
                {teams.map(t => (
                  <Link
                    key={t.id}
                    href={href(t.id, month)}
                    aria-current={t.id === current.id ? 'page' : undefined}
                    className={`rounded-full border px-3 py-1 font-sans text-sm transition-colors ${
                      t.id === current.id ? 'border-teal bg-teal text-white' : 'border-teal/20 bg-white text-dark hover:bg-teal/5'
                    }`}
                  >
                    {t.name}
                  </Link>
                ))}
              </nav>
            ) : (
              <h2 className="font-display text-xl text-dark font-light">{current.name}</h2>
            )}
            <nav aria-label="Mois" className="flex items-center gap-1">
              <Link href={href(current.id, shiftMonth(month, -1))} aria-label="Mois précédent" className="rounded-lg border border-teal/20 px-3 py-1.5 font-sans text-sm text-dark hover:bg-teal/5">←</Link>
              <span className="min-w-32 text-center font-sans text-sm font-medium text-dark capitalize">{monthLabel}</span>
              <Link href={href(current.id, shiftMonth(month, 1))} aria-label="Mois suivant" className="rounded-lg border border-teal/20 px-3 py-1.5 font-sans text-sm text-dark hover:bg-teal/5">→</Link>
            </nav>
          </div>
        )}

        {!current ? (
          <div className="bg-white rounded-2xl border border-teal/20 px-6 py-12 text-center font-sans text-sm text-dark/50">
            Tu n’es responsable d’aucune équipe pour l’instant. Un administrateur peut te nommer responsable depuis la page de l’équipe.
          </div>
        ) : !planning ? (
          <div className="bg-white rounded-2xl border border-teal/20 px-6 py-12 text-center font-sans text-sm text-dark/50">
            Équipe introuvable.
          </div>
        ) : (
          // `key` : changer de mois ou d'équipe repart d'un état client neuf (pas d'affectation optimiste résiduelle).
          <TeamPlanningGrid key={`${planning.team.id}:${month}`} planning={planning} />
        )}
      </main>
    </div>
  )
}
