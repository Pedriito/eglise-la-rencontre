import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { saveProfile } from './actions'

const errors: Record<string, string> = {
  failed: 'Une erreur est survenue. Réessaie.',
}

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone, birthdate, city, profile_complete')
    .eq('id', user.id)
    .single()

  const params = await searchParams
  const errorMsg = params.error ? errors[params.error] : null
  const isFirstTime = !profile?.profile_complete

  return (
    <div className="min-h-screen flex items-center justify-center bg-teal-50 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-dark font-light tracking-wide">
            Église La Rencontre
          </h1>
          <p className="mt-2 text-sm text-teal-dark font-sans uppercase tracking-widest">
            Espace bénévoles
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-teal/20 p-8">
          <h2 className="font-display text-2xl text-dark font-light mb-1">
            {isFirstTime ? 'Bienvenue ! Complète ta fiche' : 'Mon profil'}
          </h2>
          <p className="text-sm text-dark/50 font-sans mb-6">
            {isFirstTime
              ? 'Ces informations permettent à l'équipe de te contacter.'
              : 'Mets à jour tes informations personnelles.'}
          </p>

          <form action={saveProfile} className="space-y-5">
            {/* Nom (lecture seule) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-sans text-dark/70 mb-1.5">Prénom</label>
                <input
                  value={profile?.first_name ?? ''}
                  readOnly
                  className="w-full px-4 py-2.5 rounded-lg border border-teal/20 bg-teal-50/40 text-dark/60 font-sans text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-sans text-dark/70 mb-1.5">Nom</label>
                <input
                  value={profile?.last_name ?? ''}
                  readOnly
                  className="w-full px-4 py-2.5 rounded-lg border border-teal/20 bg-teal-50/40 text-dark/60 font-sans text-sm"
                />
              </div>
            </div>

            {/* Email (lecture seule) */}
            <div>
              <label className="block text-sm font-sans text-dark/70 mb-1.5">Email</label>
              <input
                value={user.email ?? ''}
                readOnly
                className="w-full px-4 py-2.5 rounded-lg border border-teal/20 bg-teal-50/40 text-dark/60 font-sans text-sm"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-sans text-dark/70 mb-1.5">
                Téléphone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile?.phone ?? ''}
                placeholder="06 12 34 56 78"
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
              />
            </div>

            {/* Date de naissance */}
            <div>
              <label htmlFor="birthdate" className="block text-sm font-sans text-dark/70 mb-1.5">
                Date de naissance
              </label>
              <input
                id="birthdate"
                name="birthdate"
                type="date"
                defaultValue={profile?.birthdate ?? ''}
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
              />
            </div>

            {/* Ville */}
            <div>
              <label htmlFor="city" className="block text-sm font-sans text-dark/70 mb-1.5">
                Ville
              </label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={profile?.city ?? ''}
                placeholder="Lieusaint"
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-500 font-sans">{errorMsg}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                className="flex-1 py-3 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
              >
                {isFirstTime ? 'Enregistrer et accéder à mon espace' : 'Enregistrer'}
              </button>
              {!isFirstTime && (
                <a
                  href="/benevoles/dashboard"
                  className="px-5 py-3 border border-teal/30 text-dark/60 rounded-lg font-sans text-sm hover:bg-teal-50 transition-colors"
                >
                  Annuler
                </a>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
