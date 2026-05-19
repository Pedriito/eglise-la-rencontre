'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sendInviteEmail } from '@/lib/email'

export async function inviteBenevole(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('permission')
    .eq('id', user.id)
    .single()

  if (profile?.permission !== 'admin') redirect('/benevoles/dashboard')

  const firstName  = formData.get('first_name') as string
  const lastName   = formData.get('last_name') as string
  const email      = formData.get('email') as string
  const permission = formData.get('permission') as string
  const teamIds = formData.getAll('team_ids') as string[]

  const admin = createAdminClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('http://localhost')
    ? 'https://www.egliselarencontre.fr'
    : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.egliselarencontre.fr')

  // Crée l'utilisateur sans envoyer l'email Supabase (plan gratuit limité)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { first_name: firstName, last_name: lastName },
  })

  if (error) {
    redirect(`/benevoles/admin/inviter?error=${encodeURIComponent(error.message)}`)
  }

  const userId = data.user.id

  const { error: upsertError } = await admin
    .from('profiles')
    .upsert({ id: userId, permission, first_name: firstName, last_name: lastName, status: 'invited' })

  if (upsertError) {
    redirect(`/benevoles/admin/inviter?error=${encodeURIComponent(upsertError.message)}`)
  }

  if (teamIds.length > 0) {
    await admin.from('team_members').insert(
      teamIds.map(teamId => ({
        user_id: userId,
        team_id: teamId,
        role: (formData.get(`role_${teamId}`) as string) || 'member',
        frequency: (formData.get(`frequency_${teamId}`) as string) || null,
      }))
    )
  }

  // Génère un lien d'invitation et envoie via Resend
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/benevoles/auth/confirm` },
  })

  if (linkError) {
    console.error('[inviteBenevole] generateLink error:', linkError.message, { email, userId })
  }

  if (linkData?.properties?.action_link) {
    console.log('[inviteBenevole] storing pending invite for', email, 'userId:', userId)
    const { data: invite, error: inviteError } = await admin
      .from('pending_invites')
      .insert({ action_link: linkData.properties.action_link })
      .select('token')
      .single()

    if (inviteError || !invite) {
      console.error('[inviteBenevole] pending_invites insert error:', inviteError?.message)
    } else {
      const activateUrl = `${siteUrl}/benevoles/activer/${invite.token}`
      try {
        await sendInviteEmail({ to: email, firstName, inviteLink: activateUrl })
        console.log('[inviteBenevole] email sent OK to', email)
      } catch (err: any) {
        console.error('[inviteBenevole] Resend error:', err?.message, { email, userId })
      }
    }
  } else {
    console.error('[inviteBenevole] no action_link generated for', email)
  }

  redirect('/benevoles/admin?success=invited')
}

export async function resendInviteFromList(_: unknown, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non authentifié' }
  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin') return { ok: false, error: 'Accès refusé' }

  const targetId = formData.get('user_id') as string
  const admin = createAdminClient()
  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(targetId)
  const email = authUser?.user?.email
  console.log('[resendInviteFromList] targetId:', targetId, 'email:', email ?? 'INTROUVABLE', authErr?.message ?? '')
  if (!email) return { ok: false, error: 'Email introuvable' }

  const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', targetId).single()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('http://localhost')
    ? 'https://www.egliselarencontre.fr'
    : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.egliselarencontre.fr')

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/benevoles/auth/confirm` },
  })

  if (!linkData?.properties?.action_link) {
    console.error('[resendInviteFromList] generateLink failed:', linkErr?.message, { email, targetId })
    return { ok: false, error: 'Lien non généré' }
  }

  const { data: invite, error: inviteError } = await admin
    .from('pending_invites')
    .insert({ action_link: linkData.properties.action_link })
    .select('token')
    .single()

  if (inviteError || !invite) {
    console.error('[resendInviteFromList] pending_invites error:', inviteError?.message)
    return { ok: false, error: 'Erreur serveur' }
  }

  const activateUrl = `${siteUrl}/benevoles/activer/${invite.token}`

  try {
    console.log('[resendInviteFromList] sending email to', email)
    await sendInviteEmail({ to: email, firstName: profile?.first_name ?? '', inviteLink: activateUrl })
    console.log('[resendInviteFromList] email sent OK to', email)
  } catch (err: any) {
    console.error('[resendInviteFromList] Resend error:', err?.message, { email, targetId })
    return { ok: false, error: err?.message ?? 'Erreur envoi email' }
  }

  return { ok: true }
}

export async function resendInvite(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin') redirect('/benevoles/dashboard')

  const targetId = formData.get('user_id') as string
  const admin = createAdminClient()

  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(targetId)
  const email = authUser?.user?.email
  console.log('[resendInvite] targetId:', targetId, 'email:', email ?? 'INTROUVABLE', authErr?.message ?? '')
  if (!email) redirect(`/benevoles/admin/benevoles/${targetId}?error=Email+introuvable`)

  const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', targetId).single()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.startsWith('http://localhost')
    ? 'https://www.egliselarencontre.fr'
    : (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.egliselarencontre.fr')

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${siteUrl}/benevoles/auth/confirm`,
    },
  })

  if (error || !linkData) {
    console.error('[resendInvite] generateLink failed:', error?.message, { email, targetId })
    redirect(`/benevoles/admin/benevoles/${targetId}?error=${encodeURIComponent(error?.message ?? 'Lien non généré')}`)
  }

  const { data: invite, error: inviteError } = await admin
    .from('pending_invites')
    .insert({ action_link: linkData.properties.action_link })
    .select('token')
    .single()

  if (inviteError || !invite) {
    console.error('[resendInvite] pending_invites error:', inviteError?.message, { email, targetId })
    redirect(`/benevoles/admin/benevoles/${targetId}?error=Erreur+serveur`)
  }

  const activateUrl = `${siteUrl}/benevoles/activer/${invite.token}`

  try {
    console.log('[resendInvite] sending email to', email)
    await sendInviteEmail({
      to: email,
      firstName: profile?.first_name ?? '',
      inviteLink: activateUrl,
    })
    console.log('[resendInvite] email sent OK to', email)
  } catch (err: any) {
    console.error('[resendInvite] Resend error:', err?.message, { email, targetId })
    redirect(`/benevoles/admin/benevoles/${targetId}?error=${encodeURIComponent(err?.message ?? 'Erreur envoi email')}`)
  }

  redirect(`/benevoles/admin/benevoles/${targetId}?sent=1`)
}

export async function updateBenevoleAdmin(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin') redirect('/benevoles/dashboard')

  const userId     = formData.get('user_id') as string
  const firstName  = (formData.get('first_name') as string)?.trim()
  const lastName   = (formData.get('last_name') as string)?.trim()
  const email      = (formData.get('email') as string)?.trim()
  const phone      = (formData.get('phone') as string)?.trim() || null
  const city       = (formData.get('city') as string)?.trim() || null
  const birthdate  = (formData.get('birthdate') as string) || null
  const permission = formData.get('permission') as string
  const status     = formData.get('status') as string

  const admin = createAdminClient()

  const { error: authError } = await admin.auth.admin.updateUserById(userId, { email })
  if (authError) {
    redirect(`/benevoles/admin/benevoles/${userId}/modifier?error=${encodeURIComponent(authError.message)}`)
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ first_name: firstName, last_name: lastName, phone, city, birthdate, permission, status, email })
    .eq('id', userId)

  if (profileError) {
    redirect(`/benevoles/admin/benevoles/${userId}/modifier?error=${encodeURIComponent(profileError.message)}`)
  }

  redirect(`/benevoles/admin/benevoles/${userId}?updated=1`)
}

export async function deleteBenevole(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin') redirect('/benevoles/dashboard')

  const userId = formData.get('user_id') as string
  if (userId === user.id) redirect('/benevoles/admin?error=self')

  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(userId)

  redirect('/benevoles/admin')
}
