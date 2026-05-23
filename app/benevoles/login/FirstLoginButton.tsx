'use client'

export function FirstLoginButton() {
  return (
    <button
      type="button"
      onClick={() => { window.location.href = '/benevoles/mot-de-passe-oublie' }}
      className="block w-full py-3 border border-teal/40 rounded-lg text-teal text-sm font-sans font-medium text-center cursor-pointer hover:bg-teal/5 transition-colors"
    >
      Première connexion ? Créer mon mot de passe
    </button>
  )
}
