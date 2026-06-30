'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/pushNotifications'

export async function savePushSubscription(sub: {
  endpoint: string
  p256dh: string
  auth: string
}): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user) {
    console.error('[push] savePushSubscription — utilisateur non authentifié', authError)
    return { ok: false }
  }

  console.log('[push] savePushSubscription — user:', user.id, '| endpoint:', sub.endpoint.slice(0, 60) + '…')

  const admin = createAdminClient()
  const { error } = await admin.from('push_subscriptions').upsert({
    user_id:  user.id,
    endpoint: sub.endpoint,
    p256dh:   sub.p256dh,
    auth:     sub.auth,
  }, { onConflict: 'user_id,endpoint' })

  if (error) {
    console.error('[push] savePushSubscription — erreur DB:', error.message, error.code)
    return { ok: false }
  }

  console.log('[push] savePushSubscription — OK')
  return { ok: true }
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const admin = createAdminClient()
  await admin.from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)
}

/** Vérifie si l'utilisateur courant a au moins un abonnement push */
export async function hasPushSubscription(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const admin = createAdminClient()
  const { count } = await admin
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (count ?? 0) > 0
}

/** Test : envoie une notif de test à l'utilisateur courant */
export async function sendTestPush(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[push] sendTestPush — utilisateur non authentifié')
    return { ok: false }
  }

  console.log('[push] sendTestPush — envoi pour user:', user.id)

  const admin = createAdminClient()
  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint')
    .eq('user_id', user.id)

  if (error) {
    console.error('[push] sendTestPush — erreur lecture subscriptions:', error.message, error.code)
    return { ok: false }
  }

  console.log('[push] sendTestPush — subscriptions trouvées:', subs?.length ?? 0)

  if (!subs || subs.length === 0) {
    console.warn('[push] sendTestPush — aucune subscription en base pour cet utilisateur')
    return { ok: false }
  }

  await sendPushToUser(user.id, {
    title: '🔔 Église La Rencontre',
    body:  'Les notifications push fonctionnent !',
    url:   '/benevoles/dashboard',
    tag:   'test',
  })

  console.log('[push] sendTestPush — OK')
  return { ok: true }
}
