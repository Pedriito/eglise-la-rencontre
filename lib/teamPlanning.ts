import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchBlockouts, isBlocked, parisDay } from '@/lib/availability'

type Admin = SupabaseClient

const INVITE_EXT_ID = '00000000-0000-0000-0000-000000000001'
const PAGE_SIZE = 1000
const DAY_MS = 86_400_000

/** « YYYY-MM » valide, sinon le mois courant (heure de Paris). */
export function parseMonth(raw: string | undefined, now: Date = new Date()): string {
  if (raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) return raw
  return parisDay(now).slice(0, 7)
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Bornes du mois : jours calendaires "YYYY-MM-DD" (inclus) + fenêtre UTC élargie d'un jour de
 *  chaque côté. `service_date` est un `timestamptz` : un service à 00h30 heure de Paris tombe la
 *  veille en UTC, la fenêtre large + un filtre final sur `parisDay` évitent d'en perdre un. */
export function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const start = Date.UTC(y, m - 1, 1)
  const end = Date.UTC(y, m, 1)
  const lastDay = new Date(end - DAY_MS)
  return {
    first: `${month}-01`,
    last: `${month}-${String(lastDay.getUTCDate()).padStart(2, '0')}`,
    fromIso: new Date(start - DAY_MS).toISOString(),
    toIso: new Date(end + DAY_MS).toISOString(),
  }
}

/** Même règle que `getPlanDetail` : un service de type « prayer_meeting » ne concerne que les
 *  équipes de prière ; sinon `team_ids` (s'il est renseigné) restreint les équipes, et vide/NULL
 *  = toutes les équipes. */
export function planInvolvesTeam(
  plan: { plan_type: string | null; team_ids: string[] | null },
  team: { id: string; is_prayer_meeting: boolean },
): boolean {
  if (plan.plan_type === 'prayer_meeting') return team.is_prayer_meeting
  if (plan.team_ids && plan.team_ids.length > 0) return plan.team_ids.includes(team.id)
  return true
}

export type TeamPosition = { id: string; name: string }

export type PlanColumn = {
  id: string
  title: string
  serviceDate: string
  day: string
  planType: string | null
  past: boolean
  excludedPositionIds: string[]
  /** Postes nommés encore à pourvoir (hors exclus/archivés/déclinés). Vide si l'équipe n'a pas de postes nommés. */
  openPositions: TeamPosition[]
  filled: number
  /** `null` = équipe sans postes nommés (ou postes masqués) : pas de taux de remplissage. */
  total: number | null
}

export type MemberRow = {
  id: string
  firstName: string
  lastName: string
  isLeader: boolean
  /** Postes de l'équipe cochés pour ce membre (member_positions). */
  positionIds: string[]
  /** Services du mois où il est affecté (toutes équipes, hors refusés). */
  servedCount: number
  desiredFrequency: string | null
}

export type CellAssignment = {
  id: string
  planId: string
  userId: string
  positionId: string | null
  positionName: string | null
  status: string
}

export type TeamPlanning = {
  team: { id: string; name: string; hidePositions: boolean; positions: TeamPosition[] }
  month: string
  plans: PlanColumn[]
  members: MemberRow[]
  assignments: CellAssignment[]
  /** Membres déclarés indisponibles ce jour-là — jamais planifiables. */
  unavailable: { userId: string; planId: string }[]
  /** Membres déjà affectés ce jour-là dans une AUTRE équipe (information, pas un blocage). */
  elsewhere: { userId: string; planId: string; teamName: string }[]
}

function must<T>(label: string, res: { data: T | null; error: { message: string } | null }): T {
  if (res.error || res.data === null) throw new Error(`[teamPlanning] ${label}: ${res.error?.message ?? 'aucune donnée'}`)
  return res.data
}

type RawAssignment = {
  id: string
  plan_id: string
  user_id: string
  position_id: string | null
  team_id: string | null
  status: string
  positions: { id: string; name: string; team_id: string } | null
}

/** Pagine jusqu'à épuisement : l'API plafonne chaque réponse à 1000 lignes (cf. lib/availability). */
async function fetchAssignments(admin: Admin, planIds: string[], userIds: string[]): Promise<RawAssignment[]> {
  const rows: RawAssignment[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await admin
      .from('plan_assignments')
      .select('id, plan_id, user_id, position_id, team_id, status, positions(id, name, team_id)')
      .in('plan_id', planIds)
      .in('user_id', userIds)
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`[teamPlanning] affectations: ${error.message}`)
    const page = (data ?? []) as unknown as RawAssignment[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}

/** Vue d'ensemble d'une équipe sur un mois : services concernés, membres, affectations,
 *  indisponibilités. Tout est lu avec le client service (les indispos sont masquées par la RLS
 *  pour certains bénévoles) ; l'appelant a déjà vérifié que le viewer gère cette équipe. */
export async function getTeamMonthPlanning(admin: Admin, teamId: string, month: string): Promise<TeamPlanning | null> {
  const { first, last, fromIso, toIso } = monthRange(month)

  const [teamRes, plansRes, membersRes, teamsRes] = await Promise.all([
    admin.from('teams').select('id, name, is_prayer_meeting, hide_positions, positions(id, name, archived)').eq('id', teamId).maybeSingle(),
    admin
      .from('plans')
      .select('id, title, service_date, plan_type, team_ids, excluded_position_ids')
      .gte('service_date', fromIso)
      .lt('service_date', toIso)
      .order('service_date'),
    admin.from('team_members').select('user_id, role, profiles(id, first_name, last_name, desired_frequency)').eq('team_id', teamId),
    admin.from('teams').select('id, name'),
  ])
  if (teamRes.error) throw new Error(`[teamPlanning] équipe: ${teamRes.error.message}`)
  if (!teamRes.data) return null
  const team = teamRes.data as unknown as {
    id: string; name: string; is_prayer_meeting: boolean; hide_positions: boolean
    positions: { id: string; name: string; archived: boolean | null }[]
  }
  const monthPlans = (must('services', plansRes) as unknown as {
    id: string; title: string; service_date: string; plan_type: string | null
    team_ids: string[] | null; excluded_position_ids: string[] | null
  }[]).filter(p => {
    const day = parisDay(p.service_date)
    return day >= first && day <= last
  })
  const teamNames = new Map((must('équipes', teamsRes) as { id: string; name: string }[]).map(t => [t.id, t.name]))
  const memberRows = must('membres', membersRes) as unknown as {
    user_id: string; role: string
    profiles: { id: string; first_name: string; last_name: string; desired_frequency: string | null } | null
  }[]

  const positions = team.positions.filter(p => !p.archived).map(p => ({ id: p.id, name: p.name }))
  const teamPositionIds = new Set(positions.map(p => p.id))
  const memberIds = memberRows.map(m => m.user_id)
  const teamPlans = monthPlans.filter(p => planInvolvesTeam(p, team))

  const [memberPositionsRes, assignments, blockouts] = await Promise.all([
    memberIds.length > 0
      ? admin.from('member_positions').select('user_id, position_id').in('user_id', memberIds)
      : Promise.resolve({ data: [] as { user_id: string; position_id: string }[], error: null }),
    monthPlans.length > 0
      ? fetchAssignments(admin, monthPlans.map(p => p.id), [...memberIds, INVITE_EXT_ID])
      : Promise.resolve([] as RawAssignment[]),
    fetchBlockouts(admin, { from: first, to: last, userIds: memberIds }),
  ])
  const memberPositions = must('postes des membres', memberPositionsRes)
  if (blockouts.error !== null) throw new Error(`[teamPlanning] indisponibilités: ${blockouts.error}`)

  const isTeamAssignment = (a: RawAssignment) => (a.team_id ?? a.positions?.team_id ?? null) === teamId

  const served: Record<string, number> = {}
  for (const a of assignments) {
    if (a.status !== 'declined') served[a.user_id] = (served[a.user_id] ?? 0) + 1
  }

  const members: MemberRow[] = memberRows
    .filter(m => m.profiles && m.user_id !== INVITE_EXT_ID)
    .map(m => ({
      id: m.user_id,
      firstName: m.profiles!.first_name ?? '',
      lastName: m.profiles!.last_name ?? '',
      isLeader: m.role === 'leader',
      positionIds: memberPositions.filter(mp => mp.user_id === m.user_id && teamPositionIds.has(mp.position_id)).map(mp => mp.position_id),
      servedCount: served[m.user_id] ?? 0,
      desiredFrequency: m.profiles!.desired_frequency ?? null,
    }))
    .sort((a, b) => Number(b.isLeader) - Number(a.isLeader) || a.firstName.localeCompare(b.firstName, 'fr'))

  const teamAssignments = assignments.filter(isTeamAssignment)
  const now = Date.now()

  const plans: PlanColumn[] = teamPlans.map(p => {
    const excluded = p.excluded_position_ids ?? []
    const planPositions = team.hide_positions ? [] : positions.filter(pos => !excluded.includes(pos.id))
    const planAssignments = teamAssignments.filter(a => a.plan_id === p.id && a.status !== 'declined')
    const filledIds = new Set(planAssignments.map(a => a.position_id).filter((id): id is string => !!id))
    const hasNamedPositions = planPositions.length > 0
    return {
      id: p.id,
      title: p.title,
      serviceDate: p.service_date,
      day: parisDay(p.service_date),
      planType: p.plan_type,
      past: new Date(p.service_date).getTime() < now,
      excludedPositionIds: excluded,
      openPositions: planPositions.filter(pos => !filledIds.has(pos.id)),
      filled: hasNamedPositions ? planPositions.filter(pos => filledIds.has(pos.id)).length : planAssignments.length,
      total: hasNamedPositions ? planPositions.length : null,
    }
  })

  const planDay = new Map(teamPlans.map(p => [p.id, parisDay(p.service_date)]))
  const unavailable = teamPlans.flatMap(p =>
    memberIds.filter(id => isBlocked(blockouts.data, id, planDay.get(p.id)!)).map(userId => ({ userId, planId: p.id })),
  )

  const teamPlanIds = new Set(teamPlans.map(p => p.id))
  const elsewhere = assignments
    .filter(a => !isTeamAssignment(a) && a.user_id !== INVITE_EXT_ID && a.status !== 'declined' && teamPlanIds.has(a.plan_id))
    .map(a => ({
      userId: a.user_id,
      planId: a.plan_id,
      teamName: teamNames.get(a.team_id ?? a.positions?.team_id ?? '') ?? 'une autre équipe',
    }))

  return {
    team: { id: team.id, name: team.name, hidePositions: team.hide_positions, positions },
    month,
    plans,
    members,
    assignments: teamAssignments
      .filter(a => a.user_id !== INVITE_EXT_ID && teamPlanIds.has(a.plan_id))
      .map(a => ({
        id: a.id,
        planId: a.plan_id,
        userId: a.user_id,
        positionId: a.position_id,
        positionName: a.positions?.name ?? null,
        status: a.status,
      })),
    unavailable,
    elsewhere,
  }
}
