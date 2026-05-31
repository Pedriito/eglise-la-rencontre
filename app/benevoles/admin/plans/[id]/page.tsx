import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { removeAssignment, deletePlan, sendSingleInvitation } from '../actions'
import { SongsSection } from './SongsSection'
import { StatusDot } from '../../../_components/StatusDot'
import { FlashMessage } from '../../../_components/FlashMessage'
import { AddAssignmentForm } from './AddAssignmentForm'
import AnnoncesSection from './AnnoncesSection'
import SermonSection from './SermonSection'
import VideoSection from './VideoSection'

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
  external_name: string | null
  external_email: string | null
  invitation_sent_at: string | null
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

  const [
    { data: plan },
    { data: rawAssignments },
    { data: teams },
    { data: allProfiles },
    { data: blockouts },
    { data: teamMemberships },
    { data: planSongs },
    { data: allSongs },
    { data: announcements },
    { data: sermons },
    { data: videos },
  ] = await Promise.all([
    supabase.from('plans').select('id, title, service_date, notes, plan_type').eq('id', id).single(),
    supabase
      .from('plan_assignments')
      .select('id, status, user_id, position_id, team_id, external_name, external_email, invitation_sent_at, profiles(first_name, last_name), positions(id, name, team_id)')
      .eq('plan_id', id),
    supabase.from('teams').select('id, name, positions(id, name)').order('name'),
    supabase.from('profiles').select('id, first_name, last_name').order('last_name'),
    supabase.from('blockout_dates').select('user_id, start_date, end_date'),
    supabase.from('team_members').select('user_id, team_id'),
    supabase
      .from('plan_songs')
      .select('id, order_index, key_selected, songs(id, title), arrangements(id, name, chord_chart, chord_chart_key)')
      .eq('plan_id', id)
      .order('order_index'),
    supabase
      .from('songs')
      .select('id, title, arrangements(id, name, chord_chart_key, keys_available)')
      .order('title'),
    supabase
      .from('plan_announcements')
      .select('id, title, body, order_index')
      .eq('plan_id', id)
      .order('order_index'),
    supabase
      .from('plan_sermons')
      .select('id, title, url, storage_path, created_at')
      .eq('plan_id', id)
      .order('created_at'),
    supabase
      .from('plan_videos')
      .select('id, title, url, order_index')
      .eq('plan_id', id)
      .order('order_index'),
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

  const isAdmin   = me?.permission === 'admin'
  const isEditor  = me?.permission === 'editor'
  const canManage = isAdmin || isEditor

  // Équipes visibles selon le rôle :
  // - admin : tout
  // - affecté à "Coordination des célébrations" dans ce plan : tout
  // - sinon : uniquement les équipes où l'utilisateur est affecté dans ce plan
  const COORDINATION_NAME = 'Coordination des célébrations'
  const myTeamIdsInPlan = new Set(
    assignments
      .filter(a => a.user_id === user.id)
      .map(a => a.team_id ?? a.positions?.team_id)
      .filter((id): id is string => !!id)
  )
  const isCoordinator = (teams ?? []).some(
    t => t.name === COORDINATION_NAME && myTeamIdsInPlan.has(t.id)
  )
  const canSeeAllTeams = isAdmin || isCoordinator

  // Équipes dont l'utilisateur est membre (indépendamment de ce plan)
  const myTeamMemberIds = new Set(
    teamMemberships?.filter(tm => tm.user_id === user.id).map(tm => tm.team_id) ?? []
  )

  function isTeamVisible(team: { id: string }): boolean {
    return canSeeAllTeams || myTeamMemberIds.has(team.id)
  }

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
          <Link
            href={`/benevoles/admin/plans/${id}/setlist`}
            className="font-sans text-xs font-semibold px-3 py-1.5 bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors"
          >
            ♩ Mode live
          </Link>
          <Link
            href={`/benevoles/admin/plans/${id}/setlist?projection=1`}
            className="font-sans text-xs font-semibold px-3 py-1.5 bg-dark text-white rounded-lg hover:bg-dark/80 transition-colors"
          >
            ⬛ Projection
          </Link>
          {isAdmin && (
            <form action={deletePlan}>
              <input type="hidden" name="plan_id" value={id} />
              <button type="submit" className="text-xs text-dark/30 hover:text-red-400 transition-colors font-sans">
                Supprimer
              </button>
            </form>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {flashError && <FlashMessage message={`Erreur : ${flashError}`} type="error" />}
        {flashSent && <FlashMessage message="Invitation envoyée avec succès." type="success" />}
        {plan.notes && (
          <div className="bg-teal/10 rounded-xl px-5 py-3 font-sans text-sm text-dark/70">
            {plan.notes}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {((plan as any).plan_type === 'prayer_meeting'
            ? (teams ?? []).filter(t => PRAYER_MEETING_TEAMS.has(t.name))
            : (teams ?? [])
          ).filter(isTeamVisible).map(team => {
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
                    const displayName = isInvite
                      ? (a.external_name ?? 'Invité (Ext)')
                      : `${a.profiles?.first_name} ${a.profiles?.last_name}`
                    const canSendInvite = isInvite ? !!a.external_email : a.status === 'pending'
                    return (
                      <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          {a.positions && (
                            <p className="text-xs text-teal/60 font-sans uppercase tracking-wide leading-none mb-1">
                              {a.positions.name}
                            </p>
                          )}
                          <p className="font-sans text-sm text-dark font-medium truncate">
                            {displayName}
                          </p>
                          {isInvite && a.external_email && (
                            <p className="text-xs text-dark/30 font-sans truncate">{a.external_email}</p>
                          )}
                          {a.invitation_sent_at && (
                            <p className="text-xs text-teal/60 font-sans mt-0.5" title={`Envoyée le ${new Date(a.invitation_sent_at).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}>
                              ✉ envoyée le {new Date(a.invitation_sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!isInvite && unavailableIds.has(a.user_id) && (
                            <span className="text-xs text-red-400 font-sans" title="Indisponible ce jour-là">⚠</span>
                          )}
                          <StatusDot status={a.status} />
                          {canManage && canSendInvite && (
                            <form action={sendSingleInvitation}>
                              <input type="hidden" name="assignment_id" value={a.id} />
                              <input type="hidden" name="plan_id" value={id} />
                              <button type="submit" title="Envoyer l'invitation" className="text-dark/40 hover:text-teal transition-colors text-xl leading-none">
                                ✉
                              </button>
                            </form>
                          )}
                          {canManage && (
                            <form action={removeAssignment}>
                              <input type="hidden" name="plan_id" value={id} />
                              <input type="hidden" name="assignment_id" value={a.id} />
                              <button type="submit" className="text-dark/20 hover:text-red-400 transition-colors font-sans text-lg leading-none">
                                ×
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Formulaire d'ajout — admin/editor uniquement */}
                {canManage && (
                  <div className="px-4 py-3 border-t border-teal/10 bg-teal-50/20">
                    <AddAssignmentForm
                      planId={id}
                      teamId={team.id}
                      teamPositions={teamPositions}
                      teamProfiles={teamProfiles}
                      isInviteTeam={isInviteTeam}
                      hidePositions={hidePositions}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Chants du plan ─────────────────────────────────────────── */}
        <SongsSection
          planId={id}
          planSongs={(planSongs ?? []) as any}
          allSongs={(allSongs ?? []) as any}
        />

        {/* ── Annonces ────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50">
            <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Annonces</p>
          </div>
          <div className="p-4">
            <AnnoncesSection
              planId={id}
              initial={(announcements ?? []) as any}
              canManage={canManage}
            />
          </div>
        </section>

        {/* ── Prédication ─────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50">
            <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Prédication</p>
          </div>
          <div className="p-4">
            <SermonSection
              planId={id}
              initial={(sermons ?? []) as any}
              canManage={canManage}
            />
          </div>
        </section>

        {/* ── Vidéos ──────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50">
            <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Vidéos</p>
          </div>
          <div className="p-4">
            <VideoSection
              planId={id}
              initial={(videos ?? []) as any}
              canManage={canManage}
            />
          </div>
        </section>

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
