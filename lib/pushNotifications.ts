import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL ?? 'admin@egliselarencontre.fr'}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export type PushPayload = {
  title: string
  body:  string
  url?:  string
  tag?:  string
}

type Subscription = { endpoint: string; p256dh: string; auth: string }

/** Envoie une notification à un abonnement. Retourne false si l'abonnement est expiré. */
export async function sendPush(sub: Subscription, payload: PushPayload): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return true
  } catch (err: unknown) {
    // 410 Gone = abonnement révoqué par le navigateur
    if ((err as { statusCode?: number }).statusCode === 410) return false
    console.error('[push] sendPush error:', (err as Error).message)
    return false
  }
}

/** Envoie une notification à tous les abonnements d'un utilisateur.
 *  Supprime automatiquement les abonnements expirés. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs || subs.length === 0) return

  const expired: string[] = []
  await Promise.all(subs.map(async (s) => {
    const ok = await sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload)
    if (!ok) expired.push(s.id)
  }))

  if (expired.length > 0) {
    await admin.from('push_subscriptions').delete().in('id', expired)
  }
}

/** Envoie une notification à une liste d'utilisateurs */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.all(userIds.map(id => sendPushToUser(id, payload)))
}
