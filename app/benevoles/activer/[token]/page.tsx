import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

async function activate(formData: FormData) {
  'use server'
  const token = formData.get('token') as string
  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('pending_invites')
    .select('action_link, expires_at')
    .eq('token', token)
    .single()

  if (!invite || new Date(invite.expires_at) < new Date()) {
    redirect('/benevoles/login?error=expired')
  }

  await admin.from('pending_invites').delete().eq('token', token)
  redirect(invite.action_link)
}

export default async function ActivatePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: invite } = await admin
    .from('pending_invites')
    .select('expires_at')
    .eq('token', token)
    .single()

  if (!invite || new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50 px-4">
        <div className="text-center space-y-3">
          <p className="font-sans text-dark/60">Ce lien d'invitation a expiré ou est invalide.</p>
          <a href="/benevoles/login" className="text-teal text-sm font-sans hover:underline">
            ← Se connecter
          </a>
        </div>
      </div>
    )
  }

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

        <div className="bg-white rounded-2xl shadow-sm border border-teal/20 p-8 text-center">
          <h2 className="font-display text-2xl text-dark font-light mb-3">
            Bienvenue !
          </h2>
          <p className="text-sm text-dark/50 font-sans mb-8">
            Clique sur le bouton ci-dessous pour créer ton mot de passe et activer ton compte bénévole.
          </p>

          <form action={activate}>
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="w-full py-3 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
            >
              Activer mon compte →
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
