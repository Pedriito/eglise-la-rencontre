import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addAssignment, removeAssignment, deletePlan, sendSingleInvitation } from '../actions'
import { StatusDot } from '../../../_components/StatusDot'

const INVITE_EXT_ID = '00000000-0000-0000-0000-000000000001'
const TEAMS_WITH_INVITE = new Set(['Prédicateurs', 'Louange'])
const PRAYER_MEETING_TEAMS = new Set(['Prédicateurs', 'Louange', 'Production'])

type TeamPosition = { id: string; name: string }
type AssignmentRow = {
  id: string
  status: string
  user_id: string
  position_id: string | null
  team_id: string | null
  profiles: { first_name: string; last_name: string } | null
  positions: { id: string; name: string; team_id: string } | null
}

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; sent?: string }>
}) {
  const { id } = await params
  const { error: flashError, sent: flashSent } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin' && me?.permission !== 'editor') redirect('/benevoles/dashboard')

  const [
    { data: plan },
    { data: rawAssignments },
    { data: teams },
    { data: allProfiles },
    { data: blockouts },
    { data: teamMemberships },
  ] = await Promise.all([
    supabase.from('plans').select('id, title, service_date, notes, plan_type').eq('id', id).single(),
    supabase
      .from('plan_assignments')
      .select('id, status, user_id, position_id, team_id, profiles(first_name, last_name), positions(id, name, team_id)')
      .eq('plan_id', id),
    supabase.from('teams').select('id, name, positions(id, name)').order('name'),
    supabase.from('profiles').select('id, first_name, last_name').order('last_name'),
    supabase.from('blockout_dates').select('user_id, start_date, end_date'),
    supabase.from('team_members').select('user_id, team_id'),
  ])

  if (!plan) redirect('/benevoles/admin/plans')

  const assignments = (rawAssignments ?? []) as unknown as AssignmentRow[]

  const planDate = plan.service_date.split('T')[0]
  const unavailableIds = new Set(
    blockouts?.filter(b => b.start_date <= planDate && b.end_date >= planDate).map(b => b.user_id) ?? []
  )

  const assignedUserIds = new Set(assignments.map(a => a.user_id))

  // Membres par équipe
  const membersByTeam: Record<string, Set<string>> = {}
  teamMemberships?.forEach(tm => {
    if (!membersByTeam[tm.team_id]) membersByTeam[tm.team_id] = new Set()
    membersByTeam[tm.team_id].add(tm.user_id)
  })

  // Grouper les affectations par équipe (team_id direct, sinon via positions)
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

  const date = new Date(plan.service_date).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const time = new Date(plan.service_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/benevoles/admin/plans" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm">
            ← Planification
          </Link>
          <div>
            <h1 className="font-display text-2xl text-dark font-light">{plan.title}</h1>
            <p className="text-xs text-dark/50 font-sans capitalize">{date} · {time}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <form action={deletePlan}>
            <input type="hidden" name="plan_id" value={id} />
            <button type="submit" className="text-xs text-dark/30 hover:text-red-400 transition-colors font-sans">
              Supprimer
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {flashError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 font-sans text-sm text-red-600">
            Erreur : {flashError}
          </div>
        )}
        {flashSent && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 font-sans text-sm text-green-700">
            Invitation envoyée avec succès.
          </div>
        )}
        {plan.notes && (
          <div className="bg-teal/10 rounded-xl px-5 py-3 font-sans text-sm text-dark/70">
            {plan.notes}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {((plan as any).plan_type === 'prayer_meeting'
            ? (teams ?? []).filter(t => PRAYER_MEETING_TEAMS.has(t.name))
            : (teams ?? [])
          ).map(team => {
            const teamPositions = team.positions as unknown as TeamPosition[]
            const teamAssignments = assignmentsByTeam[team.id] ?? []
            const isInviteTeam = TEAMS_WITH_INVITE.has(team.name)
            const hidePositions = team.name === 'Prédicateurs'

            const teamMemberIds = membersByTeam[team.id]
            const teamProfiles = (allProfiles ?? []).filter(p => {
              if (assignedUserIds.has(p.id)) return false
              if (!teamMemberIds || teamMemberIds.size === 0) return true
              return teamMemberIds.has(p.id)
            })

            return (
              <div key={team.id} className="bg-white rounded-2xl border border-teal/20 overflow-hidden flex flex-col">
                {/* En-tête équipe */}
                <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50 flex items-center justify-between">
                  <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">{team.name}</p>
                  {teamAssignments.length > 0 && (
                    <span className="text-xs text-dark/30 font-sans tabular-nums">{teamAssignments.length}</span>
                  )}
                </div>

                {/* Membres affectés */}
                <div className="divide-y divide-teal/10 flex-1">
                  {teamAssignments.length === 0 && (
                    <p className="px-5 py-4 text-xs text-dark/25 font-sans italic">Aucun bénévole</p>
                  )}
                  {teamAssignments.map(a => {
                    const isInvite = a.user_id === INVITE_EXT_ID
                    return (
                      <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          {a.positions && (
                            <p className="text-xs text-teal/60 font-sans uppercase tracking-wide leading-none mb-1">
                              {a.positions.name}
                            </p>
                          )}
                          <p className="font-sans text-sm text-dark font-medium truncate">
                            {isInvite ? 'Invité (Ext)' : `${a.profiles?.first_name} ${a.profiles?.last_name}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!isInvite && unavailableIds.has(a.user_id) && (
                            <span className="text-xs text-red-400 font-sans" title="Indisponible ce jour-là">⚠</span>
                          )}
                          {!isInvite && <StatusDot status={a.status} />}
                          {!isInvite && a.status === 'pending' && (
                            <form action={sendSingleInvitation}>
                              <input type="hidden" name="assignment_id" value={a.id} />
                              <input type="hidden" name="plan_id" value={id} />
                              <button type="submit" title="Envoyer l'invitation" className="text-dark/40 hover:text-teal transition-colors text-xl leading-none">
                                ✉
                              </button>
                            </form>
                          )}
                          <form action={removeAssignment}>
                            <input type="hidden" name="plan_id" value={id} />
                            <input type="hidden" name="assignment_id" value={a.id} />
                            <button type="submit" className="text-dark/20 hover:text-red-400 transition-colors font-sans text-lg leading-none">
                              ×
                            </button>
                          </form>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Formulaire d'ajout */}
                <div className="px-4 py-3 border-t border-teal/10 bg-teal-50/20">
                  <form action={addAssignment} className="flex gap-2 items-center">
                    <input type="hidden" name="plan_id" value={id} />
                    <input type="hidden" name="team_id" value={team.id} />
                    <select
                      name="user_id"
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-teal/30 bg-white text-dark font-sans text-xs focus:outline-none focus:ring-1 focus:ring-teal/40"
                    >
                      <option value="">— Bénévole —</option>
                      {isInviteTeam && (
                        <option value={INVITE_EXT_ID}>Invité (Ext)</option>
                      )}
                      {teamProfiles.map(p => (
                        <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                      ))}
                    </select>
                    {!hidePositions && teamPositions.length === 1 && (
                      <input type="hidden" name="position_id" value={teamPositions[0].id} />
                    )}
                    {!hidePositions && teamPositions.length > 1 && (
                      <select
                        name="position_id"
                        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-teal/30 bg-white text-dark font-sans text-xs focus:outline-none focus:ring-1 focus:ring-teal/40"
                      >
                        <option value="">— Poste —</option>
                        {teamPositions.map(pos => (
                          <option key={pos.id} value={pos.id}>{pos.name}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-teal text-white rounded-lg font-sans text-xs font-medium hover:bg-teal-dark transition-colors shrink-0"
                    >
                      +
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>

        {/* Affectations sans équipe (ancien format sans team_id) */}
        {noTeamAssignments.length > 0 && (
          <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
            <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50">
              <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Sans équipe</p>
            </div>
            <div className="divide-y divide-teal/10">
              {noTeamAssignments.map(a => (
                <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <p className="font-sans text-sm text-dark font-medium">
                    {a.profiles?.first_name} {a.profiles?.last_name}
                  </p>
                  <div className="flex gap-2 items-center">
                    <StatusDot status={a.status} />
                    <form action={removeAssignment}>
                      <input type="hidden" name="plan_id" value={id} />
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <button type="submit" className="text-dark/20 hover:text-red-400 font-sans text-lg leading-none">×</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
