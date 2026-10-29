'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { addAssignmentAsync, removeAssignmentAsync } from '@/app/benevoles/admin/plans/actions'
import { planInvolvesTeam } from '@/lib/teamPlanning'

type Result = { ok: boolean; error?: string }
type Admin = ReturnType<typeof createAdminClient>

const INVITE_EXT_ID = '00000000-0000-0000-0000-000000000001'

/** Admin : toutes les équipes. Éditeur : uniquement celles où il est responsable (`leader`) —
 *  même règle que admin/equipes/[id]/actions.ts. Les actions de planification déléguées
 *  (`addAssignmentAsync`…) n'exigent qu'un rôle de gestion, pas l'appartenance à l'équipe : ce
 *  contrôle d'équipe est donc fait ICI, avant toute délégation. */
async function requireTeamManager(teamId: string): Promise<{ admin: Admin } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée : reconnecte-toi.' }
  const { data: profile } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  const permission = profile?.permission ?? ''
  if (['admin', 'super_admin'].includes(permission)) return { admin: createAdminClient() }
  if (permission === 'editor') {
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .maybeSingle()
    if (membership?.role === 'leader') return { admin: createAdminClient() }
  }
  return { error: "Tu n'es pas responsable de cette équipe." }
}

type AssignmentRow = { id: string; plan_id: string; user_id: string; position_id: string | null; team_id: string | null; positions: { team_id: string } | null }

/** L'affectation existe, appartient bien à cette équipe, et n'est pas celle d'un invité externe. */
async function loadTeamAssignment(admin: Admin, teamId: string, assignmentId: string): Promise<AssignmentRow | string> {
  const { data, error } = await admin
    .from('plan_assignments')
    .select('id, plan_id, user_id, position_id, team_id, positions(team_id)')
    .eq('id', assignmentId)
    .maybeSingle()
  if (error) return error.message
  const row = data as unknown as AssignmentRow | null
  if (!row) return 'Affectation introuvable.'
  if ((row.team_id ?? row.positions?.team_id ?? null) !== teamId) return "Cette affectation n'appartient pas à ton équipe."
  if (row.user_id === INVITE_EXT_ID) return "Les invités externes se gèrent depuis la page du service."
  return row
}

/** Refus lisible, ou `null` si `userId` peut être planifié sur `planId` à `positionId` pour cette
 *  équipe. L'indisponibilité est vérifiée plus loin, par `addAssignmentAsync`. */
async function refusalForTarget(
  admin: Admin,
  teamId: string,
  planId: string,
  userId: string,
  positionId: string | null,
): Promise<string | null> {
  const [planRes, teamRes, membershipRes, existingRes] = await Promise.all([
    admin.from('plans').select('service_date, plan_type, team_ids, excluded_position_ids').eq('id', planId).maybeSingle(),
    admin.from('teams').select('id, is_prayer_meeting, hide_positions, positions(id, archived)').eq('id', teamId).maybeSingle(),
    admin.from('team_members').select('user_id').eq('team_id', teamId).eq('user_id', userId).maybeSingle(),
    admin.from('plan_assignments').select('id, position_id').eq('plan_id', planId).eq('user_id', userId),
  ])
  for (const res of [planRes, teamRes, membershipRes, existingRes]) if (res.error) return res.error.message

  const plan = planRes.data as unknown as { service_date: string; plan_type: string | null; team_ids: string[] | null; excluded_position_ids: string[] | null } | null
  const team = teamRes.data as unknown as { id: string; is_prayer_meeting: boolean; hide_positions: boolean; positions: { id: string; archived: boolean | null }[] } | null
  if (!plan) return 'Service introuvable.'
  if (!team) return 'Équipe introuvable.'
  if (new Date(plan.service_date).getTime() < Date.now()) return 'Ce service est déjà passé.'
  if (!planInvolvesTeam(plan, team)) return "Cette équipe n'est pas concernée par ce service."
  if (!membershipRes.data) return "Cette personne ne fait pas partie de l'équipe."

  const available = team.positions.filter(p => !p.archived && !(plan.excluded_position_ids ?? []).includes(p.id))
  if (positionId) {
    if (!available.some(p => p.id === positionId)) return "Ce poste n'est pas disponible pour ce service."
  } else if (!team.hide_positions && available.length > 0) {
    return 'Choisis un poste.'
  }

  const existing = (existingRes.data ?? []) as { id: string; position_id: string | null }[]
  if (existing.some(e => e.position_id === positionId)) return 'Cette personne est déjà affectée à ce poste sur ce service.'
  return null
}

/** Planifie un membre de l'équipe sur un service (glisser un nom sur une date, ou « + »). */
export async function assignTeamMember(input: {
  teamId: string
  planId: string
  userId: string
  positionId: string | null
}): Promise<Result> {
  const { teamId, planId, userId, positionId } = input
  const auth = await requireTeamManager(teamId)
  if ('error' in auth) return { ok: false, error: auth.error }

  const refusal = await refusalForTarget(auth.admin, teamId, planId, userId, positionId)
  if (refusal) return { ok: false, error: refusal }

  const result = await addAssignmentAsync({ planId, userId, positionId, teamId })
  if (result.ok) revalidatePath('/benevoles/equipe')
  return result
}

/** Déplace une affectation vers un autre service et/ou un autre membre (glisser une pastille).
 *  On crée la nouvelle affectation AVANT de supprimer l'ancienne : un refus (indisponibilité,
 *  doublon…) laisse donc le planning intact. */
export async function moveTeamAssignment(input: {
  teamId: string
  assignmentId: string
  toPlanId: string
  toUserId: string
  positionId: string | null
}): Promise<Result> {
  const { teamId, assignmentId, toPlanId, toUserId, positionId } = input
  const auth = await requireTeamManager(teamId)
  if ('error' in auth) return { ok: false, error: auth.error }

  const source = await loadTeamAssignment(auth.admin, teamId, assignmentId)
  if (typeof source === 'string') return { ok: false, error: source }
  if (source.plan_id === toPlanId && source.user_id === toUserId && source.position_id === positionId) return { ok: true }

  const refusal = await refusalForTarget(auth.admin, teamId, toPlanId, toUserId, positionId)
  if (refusal) return { ok: false, error: refusal }

  const added = await addAssignmentAsync({ planId: toPlanId, userId: toUserId, positionId, teamId })
  if (!added.ok) return added

  const removed = await removeAssignmentAsync(assignmentId, source.plan_id)
  revalidatePath('/benevoles/equipe')
  if (!removed.ok) {
    return { ok: false, error: `Nouvelle affectation créée, mais l'ancienne n'a pas pu être retirée : ${removed.error}` }
  }
  return { ok: true }
}

export async function removeTeamAssignment(input: { teamId: string; assignmentId: string }): Promise<Result> {
  const { teamId, assignmentId } = input
  const auth = await requireTeamManager(teamId)
  if ('error' in auth) return { ok: false, error: auth.error }

  const source = await loadTeamAssignment(auth.admin, teamId, assignmentId)
  if (typeof source === 'string') return { ok: false, error: source }

  const result = await removeAssignmentAsync(assignmentId, source.plan_id)
  if (result.ok) revalidatePath('/benevoles/equipe')
  return result
}
