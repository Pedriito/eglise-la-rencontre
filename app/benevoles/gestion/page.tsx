import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function GestionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('permission')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.permission === 'admin' || profile?.permission === 'editor'

  // Équipes accessibles
  let teams: { id: string; name: string }[] = []

  if (isAdmin) {
    const { data } = await supabase.from('teams').select('id, name').order('name')
    teams = data ?? []
  } else {
    const { data: memberships } = await supabase
      .from('team_members')
      .select('teams(id, name)')
      .eq('user_id', user.id)
    teams = (memberships ?? [])
      .map(m => m.teams as unknown as { id: string; name: string })
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-teal-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="font-sans text-sm text-dark/40">Vous n'êtes membre d'aucune équipe.</p>
          <Link href="/benevoles/dashboard" className="text-teal font-sans text-sm hover:underline">
            ← Tableau de bord
          </Link>
        </div>
      </div>
    )
  }

  const teamIds = teams.map(t => t.id)

  const [{ data: pendingDecisions }, { data: todoTasks }] = await Promise.all([
    supabase.from('decisions').select('id, team_id').eq('status', 'pending').in('team_id', teamIds),
    supabase.from('tasks').select('id, team_id').eq('status', 'todo').in('team_id', teamIds),
  ])

  const decisionsByTeam: Record<string, number> = {}
  pendingDecisions?.forEach(d => {
    decisionsByTeam[d.team_id] = (decisionsByTeam[d.team_id] ?? 0) + 1
  })

  const tasksByTeam: Record<string, number> = {}
  todoTasks?.forEach(t => {
    tasksByTeam[t.team_id] = (tasksByTeam[t.team_id] ?? 0) + 1
  })

  const totalPending = pendingDecisions?.length ?? 0

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4 flex items-center gap-4">
        <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm">
          ←
        </Link>
        <div>
          <h1 className="font-display text-2xl text-dark font-light">Gestion</h1>
          {totalPending > 0 && (
            <p className="text-xs text-amber-600 font-sans mt-0.5">
              {totalPending} décision{totalPending > 1 ? 's' : ''} en attente
            </p>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-3">
        {teams.map(team => {
          const nDecisions = decisionsByTeam[team.id] ?? 0
          const nTasks = tasksByTeam[team.id] ?? 0

          return (
            <Link
              key={team.id}
              href={`/benevoles/gestion/${team.id}`}
              className="flex items-center justify-between bg-white rounded-2xl border border-teal/20 px-5 py-4 hover:border-teal/40 transition-colors group"
            >
              <div>
                <p className="font-sans text-base text-dark font-medium">{team.name}</p>
                <p className="font-sans text-xs text-dark/40 mt-0.5">
                  {nTasks > 0
                    ? `${nTasks} tâche${nTasks > 1 ? 's' : ''} à faire`
                    : 'Aucune tâche en cours'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {nDecisions > 0 && (
                  <span className="bg-amber-100 text-amber-700 font-sans text-xs font-semibold px-2.5 py-1 rounded-full">
                    {nDecisions} à décider
                  </span>
                )}
                <span className="text-teal font-sans text-sm group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </Link>
          )
        })}
      </main>
    </div>
  )
}
