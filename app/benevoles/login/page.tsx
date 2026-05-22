import { login } from './actions'
import Link from 'next/link'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-teal-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / titre */}
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-dark font-light tracking-wide">
            Église La Rencontre
          </h1>
          <p className="mt-2 text-sm text-teal-dark font-sans uppercase tracking-widest">
            Espace bénévoles
          </p>
        </div>

        {/* Carte */}
        <div className="bg-white rounded-2xl shadow-sm border border-teal/20 p-8">
          <h2 className="font-display text-2xl text-dark font-light mb-6">
            Connexion
          </h2>

          <form action={login} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-sans text-dark/70 mb-1.5">
                Adresse email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
                placeholder="prenom@exemple.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-sans text-dark/70">
                  Mot de passe
                </label>
                <Link
                  href="/benevoles/mot-de-passe-oublie"
                  className="text-xs text-teal font-sans hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
                placeholder="••••••••"
              />
            </div>

            <ErrorMessage searchParams={searchParams} />

            <button
              type="submit"
              className="w-full py-3 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
            >
              Se connecter
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-3">
          <p className="text-xs text-dark/40 font-sans">
            Accès réservé aux bénévoles invités par l'équipe.
          </p>
          <Link
            href="/benevoles/mot-de-passe-oublie"
            className="block w-full py-3 border border-teal/40 rounded-lg text-teal text-sm font-sans font-medium hover:bg-teal/5 transition-colors"
          >
            Première connexion ? Créer mon mot de passe
          </Link>
        </div>
      </div>
    </div>
  )
}

async function ErrorMessage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  if (!params.error) return null
  return (
    <p className="text-sm text-red-500 font-sans">
      Email ou mot de passe incorrect. Vérifie tes identifiants.
    </p>
  )
}
