import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { permissionLabels, statusLabels, roleLabels, frequencyLabels } from '@/lib/labels'

export default async function BenevoleProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin') redirect('/benevoles/dashboard')

  const admin = createAdminClient()

  const [
    { data: profile },
    { data: authUser },
    { data: teamMemberships },
    { data: memberPositions },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, email, birthdate, city, permission, status, created_at')
      .eq('id', id)
      .single(),
    admin.auth.admin.getUserById(id),
    supabase
      .from('team_members')
      .select('role, frequency, team_id, teams(id, name)')
      .eq('user_id', id),
    supabase
      .from('member_positions')
      .select('position_id, positions(id, name, team_id)')
      .eq('user_id', id),
  ])

  if (!profile) redirect('/benevoles/admin')

  const email = profile.email || authUser?.user?.email

  // Regroupe les positions par équipe
  const positionsByTeam: Record<string, string[]> = {}
  memberPositions?.forEach(mp => {
    const pos = mp.positions as { id: string; name: string; team_id: string } | null
    if (!pos) return
    if (!positionsByTeam[pos.team_id]) positionsByTeam[pos.team_id] = []
    positionsByTeam[pos.team_id].push(pos.name)
  })

  const st = statusLabels[profile.status] ?? statusLabels.inactive

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-6 py-4 flex items-center gap-4">
        <Link
          href="/benevoles/admin"
          className="text-dark/40 hover:text-dark transition-colors font-sans text-sm"
        >
          ← Bénévoles
        </Link>
        <h1 className="font-display text-2xl text-dark font-light">
          {profile.first_name} {profile.last_name}
        </h1>
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-sans font-medium ${st.color}`}>
          {st.label}
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Coordonnées */}
        <section className="bg-white rounded-2xl border border-teal/20 p-6">
          <h2 className="font-display text-xl text-dark font-light mb-4">Coordonnées</h2>
          <dl className="space-y-3">
            <Row label="Email" value={email ?? '—'} />
            <Row label="Téléphone" value={profile.phone ?? '—'} />
            <Row label="Ville" value={profile.city ?? '—'} />
            <Row
              label="Date de naissance"
              value={profile.birthdate
                ? new Date(profile.birthdate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                : '—'}
            />
            <Row label="Niveau d'accès" value={permissionLabels[profile.permission] ?? profile.permission} />
            <Row
              label="Membre depuis"
              value={new Date(profile.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            />
          </dl>
        </section>

        {/* Équipes & postes */}
        <section className="bg-white rounded-2xl border border-teal/20 p-6">
          <h2 className="font-display text-xl text-dark font-light mb-4">Équipes & rôles</h2>
          {teamMemberships && teamMemberships.length > 0 ? (
            <div className="space-y-3">
              {teamMemberships.map(tm => {
                const team = tm.teams as { id: string; name: string } | null
                if (!team) return null
                const positions = positionsByTeam[team.id] ?? []
                return (
                  <div key={team.id} className="flex items-start gap-4 py-3 border-b border-teal/10 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-sans text-sm text-dark font-medium">{team.name}</span>
                        {tm.role === 'leader' && (
                          <span className="text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full font-sans">
                            {roleLabels.leader}
                          </span>
                        )}
                        {tm.frequency && (
                          <span className="text-xs text-dark/40 font-sans">
                            {frequencyLabels[tm.frequency] ?? tm.frequency}
                          </span>
                        )}
                      </div>
                      {positions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {positions.map(name => (
                            <span key={name} className="px-2.5 py-1 bg-teal text-white rounded-full text-xs font-sans">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/benevoles/admin/equipes/${team.id}`}
                      className="text-xs text-teal hover:underline font-sans shrink-0"
                    >
                      Voir l'équipe →
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-dark/40 font-sans">Aucune équipe assignée.</p>
          )}
        </section>

      </main>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <dt className="w-40 shrink-0 text-xs text-dark/40 font-sans uppercase tracking-widest pt-0.5">{label}</dt>
      <dd className="font-sans text-sm text-dark">{value}</dd>
    </div>
  )
}
