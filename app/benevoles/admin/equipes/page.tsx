import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function EquipesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  const isAdmin = me?.permission === 'admin'
  const isEditor = me?.permission === 'editor'
  if (!isAdmin && !isEditor) redirect('/benevoles/dashboard')

  // Admin voit toutes les équipes ; éditeur voit uniquement celles où il est responsable
  let teams: { id: string; name: string }[] = []
  if (isAdmin) {
    const { data } = await supabase.from('teams').select('id, name').order('name')
    teams = data ?? []
  } else {
    const { data } = await supabase
      .from('team_members')
      .select('team_id, teams(id, name)')
      .eq('user_id', user.id)
      .eq('role', 'leader')
    teams = (data ?? [])
      .map(r => r.teams as unknown as { id: string; name: string } | null)
      .filter((t): t is { id: string; name: string } => !!t)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const { data: memberCounts } = await supabase.from('team_members').select('team_id')
  const countByTeam: Record<string, number> = {}
  memberCounts?.forEach(m => { countByTeam[m.team_id] = (countByTeam[m.team_id] ?? 0) + 1 })

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4 flex items-center gap-3">
        <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm">
          ← Tableau de bord
        </Link>
        <h1 className="font-display text-2xl text-dark font-light">Équipes</h1>
        {isEditor && (
          <span className="text-xs text-dark/40 font-sans bg-teal/10 px-2 py-0.5 rounded-full">Mes équipes</span>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {teams.length === 0 ? (
          <div className="bg-white rounded-2xl border border-teal/20 px-6 py-10 text-center">
            <p className="font-sans text-sm text-dark/40">Vous n'êtes responsable d'aucune équipe.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[360px]">
              <thead>
                <tr className="border-b border-teal/10">
                  <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Équipe</th>
                  <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Membres</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t, i) => {
                  const count = countByTeam[t.id] ?? 0
                  return (
                    <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-teal-50/40'}>
                      <td className="px-6 py-4 font-sans text-sm text-dark font-medium">
                      <Link href={`/benevoles/admin/equipes/${t.id}`} className="hover:text-teal transition-colors">
                        {t.name}
                      </Link>
                    </td>
                      <td className="px-6 py-4 font-sans text-sm text-dark/50">{count}</td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/benevoles/admin/equipes/${t.id}`} className="text-teal font-sans text-sm hover:underline cursor-pointer">
                          Gérer →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
