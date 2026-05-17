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
    .gte('end_date', new Date().toISOString().split('T')[0])
    .order('start_date')

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-6 py-4 flex items-center gap-4">
        <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm">
          ← Dashboard
        </Link>
        <h1 className="font-display text-2xl text-dark font-light">Mes indisponibilités</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {params.success === 'added' && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 font-sans text-sm">
            Indisponibilité enregistrée.
          </div>
        )}

        {/* Formulaire */}
        <div className="bg-white rounded-2xl border border-teal/20 p-6">
          <h2 className="font-display text-lg text-dark font-light mb-4">Ajouter une période</h2>
          <form action={addBlockout} className="space-y-4">
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

        {/* Liste */}
        <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
          <div className="px-6 py-3 border-b border-teal/10">
            <p className="text-xs font-sans text-dark/40 uppercase tracking-widest font-medium">Périodes à venir</p>
          </div>
          {blockouts && blockouts.length > 0 ? (
            <div className="divide-y divide-teal/10">
              {blockouts.map(b => {
                const start = new Date(b.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                const end = new Date(b.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                const isSameDay = b.start_date === b.end_date
                return (
                  <div key={b.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-sans text-sm text-dark font-medium">
                        {isSameDay ? start : `${start} → ${end}`}
                      </p>
                      {b.reason && (
                        <p className="font-sans text-xs text-dark/40 mt-0.5">{b.reason}</p>
                      )}
                    </div>
                    <form action={removeBlockout}>
                      <input type="hidden" name="id" value={b.id} />
                      <button type="submit" className="text-xs text-dark/30 hover:text-red-400 transition-colors font-sans">
                        Supprimer
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="font-sans text-sm text-dark/40">Aucune indisponibilité enregistrée.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
