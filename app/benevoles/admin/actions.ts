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

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { first_name: firstName, last_name: lastName },
    redirectTo: `${siteUrl}/benevoles/auth/confirm`,
  })

  if (error) {
    redirect(`/benevoles/admin/inviter?error=${encodeURIComponent(error.message)}`)
  }

  const userId = data.user.id

  await admin
    .from('profiles')
    .upsert({ id: userId, permission, first_name: firstName, last_name: lastName })

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

  redirect('/benevoles/admin?success=invited')
}

export async function resendInvite(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin') redirect('/benevoles/dashboard')

  const targetId = formData.get('user_id') as string
  const admin = createAdminClient()

  const { data: authUser } = await admin.auth.admin.getUserById(targetId)
  const email = authUser?.user?.email
  if (!email) redirect(`/benevoles/admin/benevoles/${targetId}?error=Email+introuvable`)

  const { data: profile } = await supabase.from('profiles').select('first_name').eq('id', targetId).single()

  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/benevoles/auth/confirm`,
    },
  })

  if (error || !linkData) redirect(`/benevoles/admin/benevoles/${targetId}?error=${encodeURIComponent(error?.message ?? 'Lien non généré')}`)

  try {
    await sendInviteEmail({
      to: email,
      firstName: profile?.first_name ?? '',
      inviteLink: linkData.properties.action_link,
    })
  } catch (err: any) {
    redirect(`/benevoles/admin/benevoles/${targetId}?error=${encodeURIComponent(err?.message ?? 'Erreur envoi email')}`)
  }

  redirect(`/benevoles/admin/benevoles/${targetId}?sent=1`)
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
