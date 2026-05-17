import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createPlan } from '../actions'

export default async function NouveauPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin' && me?.permission !== 'editor') redirect('/benevoles/dashboard')

  const { data: teams } = await supabase.from('teams').select('id, name').order('name')
  const params = await searchParams

  // Date par défaut : prochain dimanche
  const today = new Date()
  const day = today.getDay()
  const daysUntilSunday = day === 0 ? 7 : 7 - day
  const nextSunday = new Date(today)
  nextSunday.setDate(today.getDate() + daysUntilSunday)
  const defaultDate = `${nextSunday.getFullYear()}-${String(nextSunday.getMonth() + 1).padStart(2, '0')}-${String(nextSunday.getDate()).padStart(2, '0')}T10:00`

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-6 py-4 flex items-center gap-4">
        <Link href="/benevoles/admin/plans" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm">
          ← Planification
        </Link>
        <h1 className="font-display text-2xl text-dark font-light">Nouveau service</h1>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-teal/20 p-8">
          <form action={createPlan} className="space-y-5">
            <div>
              <label className="block text-sm font-sans text-dark/70 mb-1.5">Titre</label>
              <input
                name="title"
                type="text"
                required
                defaultValue="Culte du dimanche"
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-sans text-dark/70 mb-1.5">Date et heure</label>
              <input
                name="service_date"
                type="datetime-local"
                required
                defaultValue={defaultDate}
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-sans text-dark/70 mb-1.5">
                Équipe <span className="text-dark/30">(optionnel)</span>
              </label>
              <select
                name="team_id"
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
              >
                <option value="">Toutes les équipes</option>
                {teams?.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-sans text-dark/70 mb-1.5">
                Notes <span className="text-dark/30">(optionnel)</span>
              </label>
              <textarea
                name="notes"
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm resize-none"
                placeholder="Thème, instructions particulières…"
              />
            </div>

            {params.error && (
              <p className="text-sm text-red-500 font-sans">{params.error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
            >
              Créer le service
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
