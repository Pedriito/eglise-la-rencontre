import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusDot } from '../_components/StatusDot'

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmé',
  declined: 'Décliné',
  pending: 'Sans réponse',
}

export default async function HistoriquePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const [{ data: profile }, { data: rawAssignments }] = await Promise.all([
    supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single(),
    supabase
      .from('plan_assignments')
      .select('id, status, plans(id, title, service_date), positions(name), teams(name)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const now = new Date()

  // Filtre les affectations passées
  const past = (rawAssignments ?? []).filter(a => {
    const plan = a.plans as unknown as { service_date: string } | null
    return plan && new Date(plan.service_date) < now
  }).sort((a, b) => {
    const da = new Date((a.plans as any)?.service_date ?? 0)
    const db = new Date((b.plans as any)?.service_date ?? 0)
    return db.getTime() - da.getTime() // plus récent en premier
  })

  // Stats
  const total = past.length
  const confirmed = past.filter(a => a.status === 'confirmed').length
  const declined = past.filter(a => a.status === 'declined').length
  const tauxConfirmation = total > 0 ? Math.round((confirmed / total) * 100) : 0

  // Grouper par année
  const byYear: Record<string, typeof past> = {}
  past.forEach(a => {
    const year = new Date((a.plans as any)?.service_date).getFullYear().toString()
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(a)
  })
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4 flex items-center gap-4">
        <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm">
          ← Tableau de bord
        </Link>
        <div>
          <h1 className="font-display text-2xl text-dark font-light">Historique</h1>
          <p className="text-xs text-dark/50 font-sans mt-0.5">{profile?.first_name} {profile?.last_name}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Services', value: total },
            { label: 'Confirmés', value: confirmed },
            { label: 'Taux', value: `${tauxConfirmation} %` },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-teal/20 p-5 text-center">
              <p className="font-display text-3xl text-dark font-light">{stat.value}</p>
              <p className="text-xs text-dark/50 font-sans mt-1 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Liste par année */}
        {past.length === 0 ? (
          <div className="bg-white rounded-2xl border border-teal/20 px-6 py-12 text-center">
            <p className="font-sans text-sm text-dark/40">Aucun service passé pour le moment.</p>
          </div>
        ) : (
          years.map(year => (
            <section key={year}>
              <h2 className="font-display text-lg text-dark/40 font-light mb-3">{year}</h2>
              <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
                <div className="divide-y divide-teal/10">
                  {byYear[year].map(a => {
                    const plan = a.plans as unknown as { title: string; service_date: string } | null
                    const pos = a.positions as unknown as { name: string } | null
                    const team = a.teams as unknown as { name: string } | null
                    const date = plan
                      ? new Date(plan.service_date).toLocaleDateString('fr-FR', {
                          weekday: 'long', day: 'numeric', month: 'long',
                        })
                      : '—'
                    const roleLabel = pos?.name ?? team?.name ?? null

                    return (
                      <div key={a.id} className="px-5 py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-sans text-sm text-dark font-medium">{plan?.title ?? '—'}</p>
                          <p className="font-sans text-xs text-dark/50 capitalize mt-0.5">
                            {date}{roleLabel ? ` · ${roleLabel}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-sans text-xs text-dark/40 hidden sm:block">
                            {STATUS_LABEL[a.status] ?? a.status}
                          </span>
                          <StatusDot status={a.status} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  )
}
