'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendPushToUser } from '@/lib/pushNotifications'
import { parisDay, findBlockedEntries, describeBlocked } from '@/lib/availability'
import { resolveAutoFillScope } from './scope'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: profile } = await supabase.from('profiles').select('permission, church_id').eq('id', user.id).single()
  if (!profile || !['admin', 'editor', 'super_admin'].includes(profile.permission)) redirect('/benevoles/dashboard')
  return { admin: createAdminClient(), church_id: profile.church_id as string, userId: user.id, permission: profile.permission as string }
}

export type CommitRow = {
  planId: string
  serviceDate: string
  teamId: string
  positionId: string
  positionName: string
  allowMultiple: boolean
  userId: string
}

type Result =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string }

/** Persiste la proposition d'auto-remplissage éditée par l'admin dans la modale d'aperçu.
 *  Re-vérifie que chaque poste (non `allow_multiple`) ciblé est toujours libre avant d'insérer,
 *  au cas où il aurait été rempli manuellement pendant que la modale était ouverte. */
export async function commitAutoFillProposal(rows: CommitRow[]): Promise<Result> {
  const { admin, userId, permission } = await requireAdmin()

  if (rows.length === 0) return { ok: true, inserted: 0, skipped: 0 }

  // Un éditeur ne peut valider que des postes d'équipes dont il est responsable. Le client est
  // modifiable (ligne éditée, requête forgée) : l'équipe réelle de chaque poste est relue en base
  // et la validation est refusée en bloc au moindre poste hors périmètre.
  const scope = await resolveAutoFillScope(admin, userId, permission)
  if (!scope.ok) return { ok: false, error: scope.error }
  if (scope.teamIds !== null) {
    const allowed = new Set(scope.teamIds)
    const { data: positions, error: positionsError } = await admin
      .from('positions')
      .select('id, team_id, teams(name)')
      .in('id', [...new Set(rows.map(r => r.positionId))])
    if (positionsError) return { ok: false, error: `Vérification des postes impossible (${positionsError.message}) : validation refusée par précaution.` }
    const teamOfPosition = new Map((positions ?? []).map(p => [p.id as string, p]))
    const outOfScope = rows.filter(r => {
      const pos = teamOfPosition.get(r.positionId)
      return !pos || !allowed.has(pos.team_id as string) || r.teamId !== pos.team_id
    })
    if (outOfScope.length > 0) {
      const names = [...new Set(outOfScope.map(r => {
        const teams = teamOfPosition.get(r.positionId)?.teams as { name: string } | { name: string }[] | null | undefined
        return (Array.isArray(teams) ? teams[0]?.name : teams?.name) ?? 'inconnue'
      }))]
      return {
        ok: false,
        error: `Vous n'êtes pas responsable de l'équipe ${names.map(n => `« ${n} »`).join(', ')} : validation refusée. Retirez ces lignes (« Ne pas assigner ») puis validez à nouveau.`,
      }
    }
  }

  const planIds = [...new Set(rows.map(r => r.planId))]

  // Dernier rempart contre une indisponibilité déclarée entre « Générer » et « Valider » (ou une
  // ligne éditée à la main dans la modale) : les jours sont relus en base — `serviceDate` envoyé
  // par le client n'est pas digne de confiance — et la validation est refusée en bloc plutôt que
  // de laisser passer un seul indisponible.
  const { data: plans, error: plansError } = await admin.from('plans').select('id, service_date').in('id', planIds)
  if (plansError) return { ok: false, error: plansError.message }
  const dayByPlan = new Map((plans ?? []).map(p => [p.id as string, parisDay(p.service_date as string)]))
  const unknownPlan = rows.find(r => !dayByPlan.has(r.planId))
  if (unknownPlan) return { ok: false, error: 'Un service de la proposition est introuvable : validation refusée.' }
  const check = await findBlockedEntries(admin, rows.map(r => ({ userId: r.userId, day: dayByPlan.get(r.planId)! })))
  if (!check.ok) return { ok: false, error: check.error }
  if (check.blocked.length > 0) {
    return { ok: false, error: `${await describeBlocked(admin, check.blocked)} Retirez ces lignes (« Ne pas assigner ») puis validez à nouveau.` }
  }

  const { data: existing } = await admin
    .from('plan_assignments')
    .select('plan_id, position_id')
    .in('plan_id', planIds)
    .not('position_id', 'is', null)

  const takenKeys = new Set((existing ?? []).map(a => `${a.plan_id}:${a.position_id}`))
  const toInsert = rows.filter(r => r.allowMultiple || !takenKeys.has(`${r.planId}:${r.positionId}`))
  const skipped = rows.length - toInsert.length

  if (toInsert.length === 0) return { ok: true, inserted: 0, skipped }

  const { error } = await admin
    .from('plan_assignments')
    .insert(toInsert.map(r => ({
      plan_id: r.planId,
      user_id: r.userId,
      position_id: r.positionId,
      team_id: r.teamId,
      status: 'pending',
    })))

  if (error) return { ok: false, error: error.message }

  // Notifications push — bonus non-bloquant, envoyées en parallèle.
  await Promise.allSettled(
    toInsert.map(r => {
      const date = new Date(r.serviceDate).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' })
      return sendPushToUser(r.userId, {
        title: '📋 Tu as été planifié·e',
        body: `${r.positionName} · ${date} — confirme ta présence !`,
        url: '/benevoles/historique',
        tag: `assignment-${r.planId}`,
      })
    })
  )

  revalidatePath('/benevoles/admin/plans')
  for (const planId of planIds) revalidatePath(`/benevoles/admin/plans/${planId}`)

  return { ok: true, inserted: toInsert.length, skipped }
}
