import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function EquipesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin') redirect('/benevoles/dashboard')

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .order('name')

  // Compte les membres par équipe
  const { data: memberCounts } = await supabase
    .from('team_members')
    .select('team_id')

  const countByTeam: Record<string, number> = {}
  memberCounts?.forEach(m => {
    countByTeam[m.team_id] = (countByTeam[m.team_id] ?? 0) + 1
  })

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-6 py-4 flex items-center gap-4">
        <Link href="/benevoles/admin" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm">
          ← Administration
        </Link>
        <h1 className="font-display text-2xl text-dark font-light">Équipes</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-teal/10">
                <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Équipe</th>
                <th className="text-left px-6 py-3 text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Membres</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {teams?.map((t, i) => {
                const count = countByTeam[t.id] ?? 0
                return (
                  <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-teal-50/40'}>
                    <td className="px-6 py-4 font-sans text-sm text-dark font-medium">{t.name}</td>
                    <td className="px-6 py-4 font-sans text-sm text-dark/50">{count}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/benevoles/admin/equipes/${t.id}`}
                        className="text-teal font-sans text-sm hover:underline"
                      >
                        Gérer →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
