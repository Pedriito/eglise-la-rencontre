'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendInviteEmail } from '@/lib/email'

function getSiteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  if (!url || url.startsWith('http://localhost')) return 'https://www.egliselarencontre.fr'
  return url
}

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: string }

export async function registerViaToken(formData: FormData): Promise<RegisterResult> {
  const token     = formData.get('token') as string
  const firstName = (formData.get('first_name') as string)?.trim()
  const lastName  = (formData.get('last_name') as string)?.trim()
  const email     = (formData.get('email') as string)?.trim().toLowerCase()
  const phone     = (formData.get('phone') as string)?.trim() || null

  if (!firstName || !lastName || !email || !token) {
    return { ok: false, error: 'Tous les champs obligatoires doivent être remplis.' }
  }

  const admin = createAdminClient()

  // Vérifier le token
  const { data: tk } = await admin
    .from('invite_tokens')
    .select('id, expires_at, max_uses, uses_count, revoked_at')
    .eq('token', token)
    .single()

  if (!tk) return { ok: false, error: 'Lien invalide ou introuvable.' }
  if (tk.revoked_at) return { ok: false, error: 'Ce lien a été désactivé.' }
  if (tk.expires_at && new Date(tk.expires_at) < new Date()) return { ok: false, error: 'Ce lien a expiré.' }
  if (tk.max_uses && tk.uses_count >= tk.max_uses) return { ok: false, error: 'Ce lien a atteint son nombre maximum d\'inscriptions.' }

  // Vérifier si l'email existe déjà dans les profils
  const { data: existing } = await admin
    .from('profiles')
    .select('id, status')
    .eq('email', email)
    .maybeSingle()

  let userId: string

  if (existing) {
    // Compte déjà créé (invité manuellement mais jamais activé)
    if (existing.status === 'active') {
      return { ok: false, error: 'Un compte actif existe déjà avec cette adresse email. Utilise la page de connexion.' }
    }
    // Status 'invited' → renvoyer le lien d'activation
    userId = existing.id
    // Mettre à jour le prénom/nom si renseignés via ce formulaire
    await admin.from('profiles').update({ first_name: firstName, last_name: lastName, phone: phone ?? undefined }).eq('id', userId)
  } else {
    // Créer le compte Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { first_name: firstName, last_name: lastName },
    })

    if (authError) {
      if (authError.message.toLowerCase().includes('already')) {
        // Compte auth existant mais pas dans profiles → récupérer l'id
        const { data: authList } = await admin.auth.admin.listUsers()
        const existingAuthUser = authList?.users?.find(u => u.email?.toLowerCase() === email)
        if (existingAuthUser) {
          userId = existingAuthUser.id
        } else {
          return { ok: false, error: 'Un compte existe déjà avec cette adresse email.' }
        }
      } else {
        return { ok: false, error: 'Erreur lors de la création du compte. Réessaie.' }
      }
    } else {
      userId = authData.user.id
    }

    // Créer le profil (le trigger handle_new_user le crée aussi, upsert pour compléter)
    await admin.from('profiles').upsert({
      id: userId,
      permission: 'viewer',
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      status: 'invited',
    })
  }

  // Incrémenter le compteur du token (seulement pour les nouvelles inscriptions)
  if (!existing) {
    await admin.from('invite_tokens')
      .update({ uses_count: tk.uses_count + 1 })
      .eq('id', tk.id)
  }

  // Générer le lien d'activation et envoyer l'email
  const siteUrl = getSiteUrl()
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/benevoles/auth/confirm` },
  })

  if (linkData?.properties?.action_link) {
    const { data: invite } = await admin
      .from('pending_invites')
      .insert({ action_link: linkData.properties.action_link, email, user_id: userId })
      .select('token')
      .single()

    if (invite) {
      const activateUrl = `${siteUrl}/benevoles/activer/${invite.token}`
      try {
        await sendInviteEmail({ to: email, firstName, inviteLink: activateUrl })
      } catch {
        // Email error non-bloquante
      }
    }
  }

  return { ok: true }
}
