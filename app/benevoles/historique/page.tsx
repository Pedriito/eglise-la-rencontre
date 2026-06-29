import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

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

  const past = (rawAssignments ?? [])
    .filter(a => {
      const plan = a.plans as unknown as { service_date: string } | null
      return plan && new Date(plan.service_date) < now
    })
    .sort((a, b) => {
      const da = new Date((a.plans as unknown as { service_date: string } | null)?.service_date ?? 0)
      const db = new Date((b.plans as unknown as { service_date: string } | null)?.service_date ?? 0)
      return db.getTime() - da.getTime()
    })

  const total = past.length
  const confirmed = past.filter(a => a.status === 'confirmed').length
  const tauxConfirmation = total > 0 ? Math.round((confirmed / total) * 100) : 0

  const byYear: Record<string, typeof past> = {}
  past.forEach(a => {
    const year = new Date((a.plans as unknown as { service_date: string } | null)?.service_date ?? 0).getFullYear().toString()
    if (!byYear[year]) byYear[year] = []
    byYear[year].push(a)
  })
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="min-h-screen bg-sand">
      <header className="bg-white border-b border-dark/8 px-4 md:px-6 py-4 flex items-center gap-3">
        <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-lg shrink-0">‹</Link>
        <div>
          <h1 className="font-display text-xl md:text-2xl text-dark font-light">Historique</h1>
          <p className="font-sans text-xs text-dark/40 mt-0.5">{profile?.first_name} {profile?.last_name}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Services', value: total },
            { label: 'Confirmés', value: confirmed },
            { label: 'Taux', value: `${tauxConfirmation} %` },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-dark/8 p-5 text-center">
              <p className="font-display text-3xl text-teal font-light">{stat.value}</p>
              <p className="font-sans text-[10px] text-dark/35 mt-2 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Liste par année */}
        {past.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dark/8 px-6 py-12 text-center">
            <p className="font-sans text-sm text-dark/40">Aucun service passé pour le moment.</p>
          </div>
        ) : (
          years.map(year => (
            <section key={year}>
              <h2 className="font-display text-xl text-dark/40 font-light mb-3">{year}</h2>
              <div className="bg-white rounded-2xl border border-dark/8 overflow-hidden">
                <div className="divide-y divide-dark/6">
                  {byYear[year].map(a => {
                    const plan = a.plans     as unknown as { title: string; service_date: string } | null
                    const pos  = a.positions as unknown as { name: string } | null
                    const team = a.teams     as unknown as { name: string } | null
                    const d    = plan?.service_date ? new Date(plan.service_date) : null
                    const weekday = d ? d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').toUpperCase() : ''
                    const dayNum  = d ? d.getDate() : ''
                    const month   = d ? d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '').toUpperCase() : ''
                    const roleLabel = pos?.name ?? team?.name ?? null

                    return (
                      <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-sand/50 transition-colors">
                        {/* Date colonne */}
                        <div className="w-9 shrink-0 text-center leading-none">
                          <div className="font-sans text-[9px] text-dark/35 uppercase tracking-wide">{weekday}</div>
                          <div className="font-display text-[22px] text-dark/60 font-light my-0.5">{dayNum}</div>
                          <div className="font-sans text-[9px] text-dark/35 uppercase tracking-wide">{month}</div>
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm text-dark font-medium truncate">{plan?.title ?? '—'}</p>
                          {roleLabel && (
                            <p className="font-sans text-xs text-dark/40 mt-0.5">{roleLabel}</p>
                          )}
                        </div>

                        {/* Statut */}
                        <div className="shrink-0">
                          {a.status === 'confirmed' && (
                            <span className="px-2.5 py-1 rounded-full font-sans text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                              Confirmé
                            </span>
                          )}
                          {a.status === 'declined' && (
                            <span className="px-2.5 py-1 rounded-full font-sans text-xs font-medium bg-red-50 text-red-400 border border-red-100">
                              Décliné
                            </span>
                          )}
                          {a.status === 'pending' && (
                            <span className="px-2.5 py-1 rounded-full font-sans text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                              En attente
                            </span>
                          )}
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
