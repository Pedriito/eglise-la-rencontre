import { createAdminClient } from '@/lib/supabase/admin'
import { sendReminderEmail } from '@/lib/email'
import { sendPushToUser } from '@/lib/pushNotifications'
import { NextRequest } from 'next/server'

const INVITE_EXT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(req: NextRequest) {
  // Vérification du secret Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()

  // Calcul des fenêtres J-7 et J-2 (en UTC)
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const windows = ([7, 2, 1] as const).map(days => {
    const start = new Date(todayUTC)
    start.setUTCDate(start.getUTCDate() + days)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 1)
    return { days, start: start.toISOString(), end: end.toISOString() }
  })

  const results: { planId: string; days: number; sent: number; errors: string[] }[] = []

  for (const { days, start, end } of windows) {
    // Plans dont le service tombe dans cette fenêtre
    const { data: plans, error: plansError } = await admin
      .from('plans')
      .select('id, title, service_date')
      .gte('service_date', start)
      .lt('service_date', end)

    if (plansError) {
      console.error(`[cron/reminders] erreur plans J-${days}:`, plansError.message)
      continue
    }

    for (const plan of plans ?? []) {
      const planResult = { planId: plan.id, days, sent: 0, errors: [] as string[] }

      // Affectations pending ou confirmed (on rappelle les deux)
      const { data: assignments } = await admin
        .from('plan_assignments')
        .select('id, user_id, status, external_name, external_email, positions(name), teams(name)')
        .eq('plan_id', plan.id)
        .in('status', ['pending', 'confirmed'])

      for (const a of assignments ?? []) {
        const position = a.positions as any
        const team = a.teams as any

        try {
          if (a.user_id === INVITE_EXT_ID) {
            // Invité externe — uniquement si email renseigné
            if (!a.external_email) continue
            await sendReminderEmail({
              to: a.external_email,
              firstName: a.external_name ?? 'Invité',
              planTitle: plan.title,
              serviceDate: plan.service_date,
              positionName: position?.name ?? null,
              teamName: team?.name ?? null,
              assignmentId: a.id,
              daysLeft: days,
              isExternal: true,
            })
          } else {
            // Bénévole interne
            const [{ data: profile }, { data: authData }] = await Promise.all([
              admin.from('profiles').select('first_name').eq('id', a.user_id).single(),
              admin.auth.admin.getUserById(a.user_id),
            ])
            const email = authData?.user?.email
            if (!email || !profile) continue

            await sendReminderEmail({
              to: email,
              firstName: profile.first_name,
              planTitle: plan.title,
              serviceDate: plan.service_date,
              positionName: position?.name ?? null,
              teamName: team?.name ?? null,
              assignmentId: a.id,
              daysLeft: days,
              isExternal: false,
            })

            // Push notification en complément de l'email
            const dayLabel = days === 1 ? 'demain' : `dans ${days} jours`
            const dateStr = new Date(plan.service_date).toLocaleDateString('fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long',
            })
            await sendPushToUser(a.user_id, {
              title: `⏰ Rappel — ${plan.title}`,
              body:  `Tu es planifié(e) ${dayLabel} (${dateStr})${team?.name ? ` · ${team.name}` : ''}`,
              url:   '/benevoles/dashboard',
              tag:   `reminder-${a.id}-${days}`,
            }).catch(() => {})
          }
          planResult.sent++
          console.log(`[cron/reminders] J-${days} — plan "${plan.title}" — assignmentId ${a.id} OK`)
        } catch (err: any) {
          const msg = err?.message ?? 'Erreur inconnue'
          planResult.errors.push(`assignment ${a.id}: ${msg}`)
          console.error(`[cron/reminders] J-${days} — plan "${plan.title}" — assignmentId ${a.id} ERREUR:`, msg)
        }
      }

      results.push(planResult)
    }
  }

  console.log('[cron/reminders] terminé:', JSON.stringify(results))
  return Response.json({ ok: true, results })
}
