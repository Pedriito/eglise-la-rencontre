import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export const INVITE_EXT_ID = '00000000-0000-0000-0000-000000000001'

export type Profile = {
  id: string
  first_name: string
  last_name: string
  unavailable: boolean   // blockout ce jour
  recentCount: number    // nb de services les 60 derniers jours
}

export type Position = { id: string; name: string }

export type AssignmentRow = {
  id: string
  status: string
  user_id: string
  position_id: string | null
  team_id: string | null
  external_name: string | null
  external_email: string | null
  invitation_sent_at: string | null
  profiles: { first_name: string; last_name: string } | null
  positions: { id: string; name: string; team_id: string } | null
  unavailable: boolean
}

export type TeamDetail = {
  id: string
  name: string
  allowsGuests: boolean
  isCoordination: boolean
  hidePositions: boolean
  isPrayerMeeting: boolean
  visible: boolean
  positions: Position[]
  assignments: AssignmentRow[]
  /** Pool de l'équipe entière — utilisé seulement quand l'équipe n'a pas de postes nommés. */
  candidateProfiles: Profile[]
  /** Pool restreint aux bénévoles cochés pour ce poste précis (member_positions). */
  candidatesByPosition: Record<string, Profile[]>
}

export type PlanDetail = {
  plan: { id: string; title: string; service_date: string; notes: string | null; plan_type: string | null }
  isRehearsal: boolean
  teams: TeamDetail[]
  noTeamAssignments: AssignmentRow[]
  pendingCount: number
  planSongs: unknown[]
  allSongs: unknown[]
  announcements: unknown[]
  recurringAnnouncements: unknown[]
  sermons: unknown[]
  videos: unknown[]
}

/** Charge toutes les données d'un plan (équipes, affectations, candidats, contenus)
 *  — utilisé à la fois par la page de détail mobile et le workspace desktop. */
export async function getPlanDetail(
  supabase: SupabaseServerClient,
  planId: string,
  userId: string,
  isAdmin: boolean,
): Promise<PlanDetail | null> {
  const [
    { data: plan },
    { data: rawAssignments },
    { data: teams },
    { data: allProfiles },
    { data: blockouts },
    { data: teamMemberships },
    { data: memberPositions },
    { data: planSongs },
    { data: allSongs },
    { data: announcements },
    { data: sermons },
    { data: videos },
  ] = await Promise.all([
    supabase.from('plans').select('id, title, service_date, notes, plan_type').eq('id', planId).single(),
    supabase
      .from('plan_assignments')
      .select('id, status, user_id, position_id, team_id, external_name, external_email, invitation_sent_at, profiles(first_name, last_name), positions(id, name, team_id)')
      .eq('plan_id', planId),
    supabase.from('teams').select('id, name, allows_guests, is_coordination, hide_positions, is_prayer_meeting, positions(id, name)').order('name'),
    supabase.from('profiles').select('id, first_name, last_name').order('first_name'),
    supabase.from('blockout_dates').select('user_id, start_date, end_date'),
    supabase.from('team_members').select('user_id, team_id'),
    supabase.from('member_positions').select('user_id, position_id'),
    supabase
      .from('plan_songs')
      .select('id, order_index, key_selected, songs(id, title), arrangements(id, name, chord_chart, chord_chart_key)')
      .eq('plan_id', planId)
      .order('order_index'),
    supabase
      .from('songs')
      .select('id, title, arrangements(id, name, chord_chart_key, keys_available)')
      .order('title'),
    supabase
      .from('plan_announcements')
      .select('id, title, body, order_index, image_url, video_url')
      .eq('plan_id', planId)
      .order('order_index'),
    supabase
      .from('plan_sermons')
      .select('id, title, url, storage_path, created_at')
      .eq('plan_id', planId)
      .order('created_at'),
    supabase
      .from('plan_videos')
      .select('id, title, url, order_index')
      .eq('plan_id', planId)
      .order('order_index'),
  ])

  if (!plan) return null

  // Annonces récurrentes (globales, apparaissent sur tous les cultes)
  const { data: recurringAnnouncements } = await supabase
    .from('recurring_announcements')
    .select('id, title, body, order_index, image_url, video_url, active')
    .eq('active', true)
    .order('order_index')

  // Fréquence récente : nb de services les 60 derniers jours par bénévole
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 60)
  const { data: recentPlans } = await supabase
    .from('plans')
    .select('id')
    .gte('service_date', cutoff.toISOString().split('T')[0])
    .neq('id', planId)
  const recentPlanIds = (recentPlans ?? []).map(p => p.id)
  const recentCountMap: Record<string, number> = {}
  if (recentPlanIds.length > 0) {
    const { data: recentAssignments } = await supabase
      .from('plan_assignments')
      .select('user_id')
      .in('plan_id', recentPlanIds)
      .neq('user_id', INVITE_EXT_ID)
    for (const a of recentAssignments ?? []) {
      recentCountMap[a.user_id] = (recentCountMap[a.user_id] ?? 0) + 1
    }
  }

  const planDate = plan.service_date.split('T')[0]
  const unavailableIds = new Set(
    blockouts?.filter(b => b.start_date <= planDate && b.end_date >= planDate).map(b => b.user_id) ?? []
  )

  const assignments = (rawAssignments ?? []).map(a => ({
    ...a,
    unavailable: unavailableIds.has(a.user_id),
  })) as unknown as AssignmentRow[]

  // Membres par équipe
  const membersByTeam: Record<string, Set<string>> = {}
  teamMemberships?.forEach(tm => {
    if (!membersByTeam[tm.team_id]) membersByTeam[tm.team_id] = new Set()
    membersByTeam[tm.team_id].add(tm.user_id)
  })

  // Bénévoles cochés par poste (member_positions)
  const userIdsByPosition: Record<string, Set<string>> = {}
  memberPositions?.forEach(mp => {
    if (!userIdsByPosition[mp.position_id]) userIdsByPosition[mp.position_id] = new Set()
    userIdsByPosition[mp.position_id].add(mp.user_id)
  })

  // Affectations par équipe (team_id direct, sinon via positions)
  const assignmentsByTeam: Record<string, AssignmentRow[]> = {}
  const noTeamAssignments: AssignmentRow[] = []
  assignments.forEach(a => {
    const tid = a.team_id ?? a.positions?.team_id ?? null
    if (tid) {
      if (!assignmentsByTeam[tid]) assignmentsByTeam[tid] = []
      assignmentsByTeam[tid].push(a)
    } else {
      noTeamAssignments.push(a)
    }
  })

  const pendingCount = assignments.filter(a => a.status === 'pending' && a.user_id !== INVITE_EXT_ID).length

  const myTeamIdsInPlan = new Set(
    assignments
      .filter(a => a.user_id === userId)
      .map(a => a.team_id ?? a.positions?.team_id)
      .filter((id): id is string => !!id)
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isCoordinator = (teams ?? []).some((t: any) => t.is_coordination && myTeamIdsInPlan.has(t.id))
  const canSeeAllTeams = isAdmin || isCoordinator

  const myTeamMemberIds = new Set(
    teamMemberships?.filter(tm => tm.user_id === userId).map(tm => tm.team_id) ?? []
  )

  const isRehearsal = plan.plan_type === 'rehearsal'
  const relevantTeams = plan.plan_type === 'prayer_meeting'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (teams ?? []).filter((t: any) => t.is_prayer_meeting)
    : (teams ?? [])

  const teamDetails: TeamDetail[] = relevantTeams.map((team: any) => {
    const teamPositions = team.positions as unknown as Position[]
    const teamAssignments = assignmentsByTeam[team.id] ?? []
    const teamMemberIds = membersByTeam[team.id]
    const alreadyInThisTeam = new Set(teamAssignments.map(a => a.user_id))

    const candidateProfiles: Profile[] = (allProfiles ?? [])
      .filter(p => {
        if (alreadyInThisTeam.has(p.id)) return false
        if (!teamMemberIds || teamMemberIds.size === 0) return true
        return teamMemberIds.has(p.id)
      })
      .map(p => ({
        ...p,
        unavailable: unavailableIds.has(p.id),
        recentCount: recentCountMap[p.id] ?? 0,
      }))

    // Pour chaque poste nommé, on ne propose que les bénévoles cochés pour ce poste précis.
    const candidatesByPosition: Record<string, Profile[]> = {}
    teamPositions.forEach(pos => {
      const qualifiedIds = userIdsByPosition[pos.id]
      candidatesByPosition[pos.id] = candidateProfiles.filter(p => qualifiedIds?.has(p.id))
    })

    return {
      id: team.id,
      name: team.name,
      allowsGuests: !!team.allows_guests,
      isCoordination: !!team.is_coordination,
      hidePositions: !!team.hide_positions,
      isPrayerMeeting: !!team.is_prayer_meeting,
      visible: canSeeAllTeams || myTeamMemberIds.has(team.id),
      positions: teamPositions,
      assignments: teamAssignments,
      candidateProfiles,
      candidatesByPosition,
    }
  })

  return {
    plan,
    isRehearsal,
    teams: teamDetails,
    noTeamAssignments,
    pendingCount,
    planSongs: planSongs ?? [],
    allSongs: allSongs ?? [],
    announcements: announcements ?? [],
    recurringAnnouncements: recurringAnnouncements ?? [],
    sermons: sermons ?? [],
    videos: videos ?? [],
  }
}
