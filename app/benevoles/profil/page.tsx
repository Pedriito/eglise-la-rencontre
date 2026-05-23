import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { saveProfile, changePassword } from './actions'
import { FlashMessage } from '../_components/FlashMessage'

const errors: Record<string, string> = {
  failed: 'Une erreur est survenue. Réessaie.',
  email_taken: 'Cet email est déjà utilisé par un autre compte.',
}

const pwdErrors: Record<string, string> = {
  short: 'Le mot de passe doit faire au moins 8 caractères.',
  mismatch: 'Les mots de passe ne correspondent pas.',
  wrong_current: 'Mot de passe actuel incorrect.',
  failed: 'Une erreur est survenue. Réessaie.',
}

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string; email_sent?: string; pwd_error?: string; pwd_success?: string }>
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
  const emailSent = !!params.email_sent
  const pwdErrorMsg = params.pwd_error ? pwdErrors[params.pwd_error] : null
  const pwdSuccess = !!params.pwd_success
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
              ? "Ces informations permettent à l'équipe de te contacter."
              : 'Mets à jour tes informations personnelles.'}
          </p>
          {emailSent && (
            <div className="mb-5">
              <FlashMessage
                message="Un email de confirmation a été envoyé à ta nouvelle adresse. Clique sur le lien pour valider le changement."
                type="info"
              />
            </div>
          )}

          <form action={saveProfile} className="space-y-5" key="profile-form">
            {isFirstTime && (
              <p className="text-xs font-sans text-red-500/80">
                Les champs marqués <span className="font-semibold">*</span> sont obligatoires.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-sans text-dark/70 mb-1.5">
                  Prénom {isFirstTime && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  defaultValue={profile?.first_name ?? ''}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-sans text-dark/70 mb-1.5">
                  Nom {isFirstTime && <span className="text-red-500">*</span>}
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  defaultValue={profile?.last_name ?? ''}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-sans text-dark/70 mb-1.5">
                Email {isFirstTime && <span className="text-red-500">*</span>}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email ?? ''}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
              />
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-sans text-dark/70 mb-1.5">
                Téléphone {isFirstTime && <span className="text-red-500">*</span>}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile?.phone ?? ''}
                required={isFirstTime}
                placeholder="06 12 34 56 78"
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
              />
            </div>

            {/* Date de naissance */}
            <div>
              <label htmlFor="birthdate" className="block text-sm font-sans text-dark/70 mb-1.5">
                Date de naissance {isFirstTime && <span className="text-red-500">*</span>}
              </label>
              <input
                id="birthdate"
                name="birthdate"
                type="date"
                defaultValue={profile?.birthdate ?? ''}
                required={isFirstTime}
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
              />
            </div>

            {/* Ville */}
            <div>
              <label htmlFor="city" className="block text-sm font-sans text-dark/70 mb-1.5">
                Ville {isFirstTime && <span className="text-red-500">*</span>}
              </label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={profile?.city ?? ''}
                required={isFirstTime}
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
        {/* Section changement de mot de passe — uniquement si profil déjà complété */}
        {!isFirstTime && (
          <div className="bg-white rounded-2xl shadow-sm border border-teal/20 p-8 mt-4">
            <h2 className="font-display text-xl text-dark font-light mb-1">Mot de passe</h2>
            <p className="text-sm text-dark/50 font-sans mb-6">Modifie ton mot de passe de connexion.</p>

            {pwdSuccess && (
              <div className="mb-5">
                <FlashMessage message="Mot de passe modifié avec succès." type="success" />
              </div>
            )}

            <form action={changePassword} className="space-y-4">
              <div>
                <label htmlFor="current_password" className="block text-sm font-sans text-dark/70 mb-1.5">
                  Mot de passe actuel
                </label>
                <input
                  id="current_password"
                  name="current_password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
                />
              </div>

              <div>
                <label htmlFor="new_password" className="block text-sm font-sans text-dark/70 mb-1.5">
                  Nouveau mot de passe
                </label>
                <input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                  className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
                />
              </div>

              <div>
                <label htmlFor="confirm_password" className="block text-sm font-sans text-dark/70 mb-1.5">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
                />
              </div>

              {pwdErrorMsg && (
                <p className="text-sm text-red-500 font-sans">{pwdErrorMsg}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
              >
                Changer le mot de passe
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
