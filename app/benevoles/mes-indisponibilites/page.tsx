import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addBlockout, removeBlockout } from './actions'

export default async function IndisponibilitesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const params = await searchParams

  const { data: blockouts } = await supabase
    .from('blockout_dates')
    .select('id, start_date, end_date, reason')
    .eq('user_id', user.id)
    .order('start_date', { ascending: false })

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-sand">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-lg shrink-0">‹</Link>
          <h1 className="font-display text-xl md:text-2xl text-dark font-light truncate">Mes indisponibilités</h1>
        </div>
      </header>

      <main className="px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {params.success === 'added' && (
            <div className="bg-teal-light border border-teal/20 text-teal-dark rounded-xl px-4 py-3 font-sans text-sm">
              Indisponibilité enregistrée.
            </div>
          )}
          {params.error === 'insert' && (
            <div className="bg-red-50 border border-red-200 text-red-500 rounded-xl px-4 py-3 font-sans text-sm">
              Une erreur s'est produite lors de l'enregistrement. Veuillez réessayer.
            </div>
          )}

          {/* Formulaire */}
          <section>
            <h2 className="font-display text-xl text-dark font-light mb-3">Ajouter une période</h2>
            <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
              <form action={addBlockout} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-sans text-dark/50 mb-1">Du</label>
                    <input
                      name="start_date"
                      type="date"
                      required
                      min={today}
                      className="w-full px-3 py-2 rounded-lg border border-teal/30 bg-teal-50 text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans text-dark/50 mb-1">Au</label>
                    <input
                      name="end_date"
                      type="date"
                      min={today}
                      className="w-full px-3 py-2 rounded-lg border border-teal/30 bg-teal-50 text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-sans text-dark/50 mb-1">
                    Raison <span className="text-dark/30">(optionnel)</span>
                  </label>
                  <input
                    name="reason"
                    type="text"
                    className="w-full px-3 py-2 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/40"
                    placeholder="Vacances, voyage, maladie…"
                  />
                </div>

                {params.error === 'dates' && (
                  <p className="text-sm text-red-500 font-sans">La date de fin doit être après la date de début.</p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
                >
                  Enregistrer
                </button>
              </form>
            </div>
          </section>

          {/* Liste */}
          <section>
            <h2 className="font-display text-xl text-dark font-light mb-3">
              {blockouts && blockouts.length > 0
                ? `${blockouts.length} période${blockouts.length > 1 ? 's' : ''} enregistrée${blockouts.length > 1 ? 's' : ''}`
                : 'Périodes enregistrées'}
            </h2>
            <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
              {blockouts && blockouts.length > 0 ? (
                <div>
                  <div className="border-b border-teal/10">
                    <div className="grid grid-cols-[1fr_auto] px-6 py-3">
                      <span className="text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Période</span>
                      <span className="text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Action</span>
                    </div>
                  </div>
                  {blockouts.map(b => {
                    const start = new Date(b.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    const end = new Date(b.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    const isSameDay = b.start_date === b.end_date
                    const isPast = b.end_date < today
                    return (
                      <div
                        key={b.id}
                        className={`px-6 py-4 flex items-center justify-between gap-4 border-b border-teal/10 last:border-0 hover:bg-teal-50/40 transition-colors ${isPast ? 'opacity-50' : ''}`}
                      >
                        <div className="min-w-0">
                          <p className={`font-sans text-sm font-medium truncate ${isPast ? 'text-dark/50' : 'text-dark'}`}>
                            {isSameDay ? start : `${start} → ${end}`}
                            {isPast && <span className="ml-2 text-xs text-dark/30 font-normal">(passée)</span>}
                          </p>
                          {b.reason && (
                            <p className="font-sans text-xs text-dark/40 mt-0.5">{b.reason}</p>
                          )}
                        </div>
                        <form action={removeBlockout} className="shrink-0">
                          <input type="hidden" name="id" value={b.id} />
                          <button type="submit" className="text-dark/30 hover:text-red-400 transition-colors font-sans text-sm">
                            Supprimer
                          </button>
                        </form>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="px-6 py-10 text-center">
                  <p className="font-sans text-sm text-dark/40">Aucune indisponibilité enregistrée.</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
