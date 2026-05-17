import { setPassword } from './actions'

const errors: Record<string, string> = {
  mismatch: 'Les mots de passe ne correspondent pas.',
  short: 'Le mot de passe doit faire au moins 8 caractères.',
  failed: 'Une erreur est survenue. Réessaie.',
}

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const errorMsg = params.error ? errors[params.error] : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-teal-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-dark font-light tracking-wide">
            Église La Rencontre
          </h1>
          <p className="mt-2 text-sm text-teal-dark font-sans uppercase tracking-widest">
            Espace bénévoles
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-teal/20 p-8">
          <h2 className="font-display text-2xl text-dark font-light mb-2">
            Créer mon mot de passe
          </h2>
          <p className="text-sm text-dark/50 font-sans mb-6">
            Choisis un mot de passe pour accéder à ton espace bénévole.
          </p>

          <form action={setPassword} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-sans text-dark/70 mb-1.5">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
                placeholder="8 caractères minimum"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-sans text-dark/70 mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
                placeholder="••••••••"
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-500 font-sans">{errorMsg}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
            >
              Enregistrer et accéder à mon espace
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
