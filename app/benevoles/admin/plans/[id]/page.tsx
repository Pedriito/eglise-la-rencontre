import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { removeAssignment, deletePlan, sendSingleInvitation, respondAssignmentOnPlanDetail } from '../actions'
import { IconEnvelope, IconMusicalNote, IconPlay, IconProjector, IconWarning } from '@/app/benevoles/_components/Icons'
import { StatusDot } from '../../../_components/StatusDot'
import { FlashMessage } from '../../../_components/FlashMessage'
import { AddAssignmentForm } from './AddAssignmentForm'
import AnnoncesSection from './AnnoncesSection'
import SermonSection from './SermonSection'
import VideoSection from './VideoSection'
import ShareButton from './ShareButton'
import { getPlanDetail, INVITE_EXT_ID } from '../getPlanDetail'
import { AssignmentBoard } from '../AssignmentBoard'
import { VolunteerPicker } from '../VolunteerPicker'

const PLAN_TYPE_LABELS: Record<string, string> = {
  sunday_service: 'Culte',
  prayer_meeting: 'Prière',
  rehearsal:      'Répétition',
  other:          'Événement',
}

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; sent?: string; fill?: string }>
}) {
  const { id } = await params
  const { error: flashError, sent: flashSent, fill: fillParam } = await searchParams
  const fillKey = fillParam ?? null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()

  const isAdmin   = ['admin', 'super_admin'].includes(me?.permission ?? '')
  const isEditor  = me?.permission === 'editor'
  const canManage = isAdmin || isEditor

  const detail = await getPlanDetail(supabase, id, user.id, isAdmin)
  if (!detail) redirect('/benevoles/admin/plans')

  const {
    plan, isRehearsal, teams, noTeamAssignments,
    planSongs, allSongs, announcements, recurringAnnouncements, sermons, videos,
  } = detail

  const allAssignments = [...teams.flatMap(t => t.assignments), ...noTeamAssignments]
  const myAssignment = allAssignments.find(a => a.user_id === user.id) ?? null

  const dateObj  = new Date(plan.service_date)
  const dateLong = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const dateMed  = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const time     = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const typeLabel = PLAN_TYPE_LABELS[plan.plan_type ?? ''] ?? 'Événement'

  const visibleTeams = teams.filter(t => t.visible)

  return (
    <div className="min-h-screen bg-teal-50">

      {/* ════════════════════════════════════════════════════
          MOBILE  (< lg)
      ════════════════════════════════════════════════════ */}
      <div className="lg:hidden">

        {/* Barre supérieure */}
        <div
          className="px-4 pb-3 flex items-center justify-between"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 52px)' }}
        >
          <Link
            href="/benevoles/historique"
            className="w-9 h-9 rounded-full bg-white/80 shadow-sm flex items-center justify-center text-dark/60 hover:text-dark transition-colors shrink-0"
          >
            <span className="font-sans text-xl leading-none -translate-x-px">‹</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/benevoles/admin/plans/${id}/setlist`}
              className="inline-flex items-center gap-1.5 bg-teal text-white px-3 py-2 rounded-full font-sans text-xs font-semibold"
            >
              <IconPlay className="w-3 h-3" /> Live
            </Link>
            {(canManage) && (
              <Link
                href={`/benevoles/admin/plans/${id}/setlist?projection=1`}
                className="inline-flex items-center gap-1.5 bg-dark text-white px-3 py-2 rounded-full font-sans text-xs font-semibold"
              >
                <IconProjector className="w-3 h-3" /> Proj.
              </Link>
            )}
            {canManage && <ShareButton planId={id} />}
          </div>
        </div>

        {/* Hero card */}
        <div className="mx-4 mb-4">
          <div
            className="rounded-3xl overflow-hidden text-white"
            style={{ background: 'linear-gradient(135deg, #5A9EA6, #3D7D85)' }}
          >
            <div className="p-5">
              <p className="font-sans text-[10px] uppercase tracking-widest text-white/55 font-semibold mb-1">
                {typeLabel}
              </p>
              <h1 className="font-display text-[2rem] font-light leading-tight">{plan.title}</h1>
              <p className="font-sans text-sm text-white/65 capitalize mt-1 flex items-center gap-1.5">
                <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0 opacity-70" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="12" height="11" rx="2" />
                  <path d="M5 1v4M11 1v4M2 7h12" />
                </svg>
                {dateMed} · {time}
              </p>

              {/* Mon affectation */}
              {myAssignment && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  {myAssignment.status === 'pending' ? (
                    <>
                      <p className="font-sans text-xs text-white/55 mb-3">
                        {myAssignment.positions?.name
                          ? `Demande · ${myAssignment.positions.name}`
                          : 'Demande en attente de confirmation'}
                      </p>
                      <div className="flex gap-3">
                        <form action={respondAssignmentOnPlanDetail} className="flex-1">
                          <input type="hidden" name="assignment_id" value={myAssignment.id} />
                          <input type="hidden" name="status" value="declined" />
                          <input type="hidden" name="plan_id" value={id} />
                          <button
                            type="submit"
                            className="w-full py-2.5 rounded-2xl font-sans text-sm border border-white/30 bg-white/10 text-white flex items-center justify-center gap-2"
                          >
                            <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M2 2l10 10M12 2L2 12" />
                            </svg>
                            Décliner
                          </button>
                        </form>
                        <form action={respondAssignmentOnPlanDetail} className="flex-1">
                          <input type="hidden" name="assignment_id" value={myAssignment.id} />
                          <input type="hidden" name="status" value="confirmed" />
                          <input type="hidden" name="plan_id" value={id} />
                          <button
                            type="submit"
                            className="w-full py-2.5 rounded-2xl font-sans text-sm font-semibold bg-white text-teal-dark flex items-center justify-center gap-2"
                          >
                            <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1.5 7.5l3.5 3.5 7-7" />
                            </svg>
                            Je serai là
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-sans text-[10px] uppercase tracking-widest text-white/55 font-semibold">Mon rôle</p>
                        <p className="font-sans text-base text-white font-semibold mt-0.5">
                          {myAssignment.positions?.name ?? 'Bénévole'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-sans text-xs font-medium ${
                          myAssignment.status === 'confirmed'
                            ? 'bg-white/20 text-white'
                            : 'bg-white/10 text-white/60'
                        }`}>
                          {myAssignment.status === 'confirmed' ? '✓ Confirmé·e' : 'Décliné'}
                        </span>
                        {myAssignment.status === 'confirmed' && (
                          <form action={respondAssignmentOnPlanDetail}>
                            <input type="hidden" name="assignment_id" value={myAssignment.id} />
                            <input type="hidden" name="status" value="declined" />
                            <input type="hidden" name="plan_id" value={id} />
                            <button
                              type="submit"
                              className="font-sans text-xs text-white/50 hover:text-white transition-colors"
                            >
                              Se désister
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="px-4 pb-28 space-y-3">

          {flashError && <FlashMessage message={`Erreur : ${flashError}`} type="error" />}
          {flashSent  && <FlashMessage message="Invitation envoyée." type="success" />}

          {plan.notes && (
            <div className="bg-teal/10 rounded-2xl px-4 py-3 font-sans text-sm text-dark/70">
              {plan.notes}
            </div>
          )}

          {/* Équipes */}
          {!isRehearsal && visibleTeams.length > 0 && (
            <>
              <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold px-1 pt-1">
                Équipe du culte
              </p>
              {visibleTeams.map(team => {
                const filledPositionIds = new Set(team.assignments.map(a => a.position_id).filter(Boolean) as string[])
                const openPositions = team.positions.filter(p => !filledPositionIds.has(p.id))
                const noNamedPos = team.positions.length === 0
                const hasOpenSlots = openPositions.length > 0 || (noNamedPos && team.assignments.length === 0)

                return (
                  <div key={team.id} className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                    <div className="px-4 py-3 border-b border-teal/10 flex items-center justify-between">
                      <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">{team.name}</p>
                      {hasOpenSlots ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-500 font-sans text-[10px] font-semibold">
                          À pourvoir
                        </span>
                      ) : team.assignments.length > 0 ? (
                        <span className="font-sans text-xs text-dark/25 tabular-nums">{team.assignments.length}</span>
                      ) : null}
                    </div>

                    <div className="p-3 space-y-2">
                      {team.assignments.map(a => {
                        const isMe     = a.user_id === user.id
                        const isInvite = a.user_id === INVITE_EXT_ID
                        const name = isInvite
                          ? (a.external_name ?? 'Invité')
                          : `${a.profiles?.first_name ?? ''} ${a.profiles?.last_name ?? ''}`
                        const canSendInvite = isInvite ? !!a.external_email : a.status === 'pending'
                        return (
                          <div key={a.id} className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ${isMe ? 'bg-teal/10' : 'bg-teal/5'}`}>
                            <StatusDot status={a.status} />
                            <div className="flex-1 min-w-0">
                              <p className={`font-sans text-sm truncate ${isMe ? 'font-semibold text-teal-dark' : 'text-dark'}`}>
                                {name}{isMe ? ' · moi' : ''}
                              </p>
                              {a.positions && !team.hidePositions && (
                                <p className="font-sans text-xs text-dark/40 mt-0.5">{a.positions.name}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isInvite && a.unavailable && (
                                <span className="text-red-400" title="Indisponible"><IconWarning className="w-3.5 h-3.5" /></span>
                              )}
                              {canManage && canSendInvite && (
                                <form action={sendSingleInvitation}>
                                  <input type="hidden" name="assignment_id" value={a.id} />
                                  <input type="hidden" name="plan_id" value={id} />
                                  <button type="submit" title="Envoyer l'invitation" className="p-1.5 text-dark/30 hover:text-teal transition-colors">
                                    <IconEnvelope className="w-4 h-4" />
                                  </button>
                                </form>
                              )}
                              {canManage && (
                                <form action={removeAssignment}>
                                  <input type="hidden" name="plan_id" value={id} />
                                  <input type="hidden" name="assignment_id" value={a.id} />
                                  <button type="submit" aria-label="Retirer" className="p-1.5 text-dark/20 hover:text-red-400 transition-colors font-sans text-xl leading-none">×</button>
                                </form>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {openPositions.length > 0 ? openPositions.map(pos => (
                        <div key={pos.id} className="flex items-center gap-3 border-2 border-dashed border-orange-200 rounded-xl px-3.5 py-2.5 bg-orange-50/30">
                          <div className="w-7 h-7 rounded-full border-2 border-dashed border-orange-300 flex items-center justify-center shrink-0 text-orange-300">
                            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 5a5 5 0 0 1 10 0H3Z" />
                            </svg>
                          </div>
                          <span className="font-sans text-sm text-dark/30 italic">Aucun bénévole</span>
                        </div>
                      )) : hasOpenSlots ? (
                        <div className="flex items-center gap-3 border-2 border-dashed border-orange-200 rounded-xl px-3.5 py-2.5 bg-orange-50/30">
                          <div className="w-7 h-7 rounded-full border-2 border-dashed border-orange-300 flex items-center justify-center shrink-0 text-orange-300">
                            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 5a5 5 0 0 1 10 0H3Z" />
                            </svg>
                          </div>
                          <span className="font-sans text-sm text-dark/30 italic">Aucun bénévole</span>
                        </div>
                      ) : null}

                      {canManage && (
                        <AddAssignmentForm
                          planId={id}
                          teamId={team.id}
                          teamPositions={team.positions}
                          teamProfiles={team.candidateProfiles}
                          candidatesByPosition={team.candidatesByPosition}
                          isInviteTeam={team.allowsGuests}
                          hidePositions={team.hidePositions}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Chants */}
          {(planSongs as unknown[]).length > 0 && (
            <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-4 py-3 border-b border-teal/10 flex items-center justify-between bg-teal-50/50">
                <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">
                  <IconMusicalNote className="w-3 h-3 inline-block mr-1 text-dark/30" />
                  Chants
                </p>
                <Link href={`/benevoles/admin/plans/${id}/setlist`} className="font-sans text-xs text-teal">
                  Setlist →
                </Link>
              </div>
              <div className="divide-y divide-teal/8">
                {(planSongs as any[]).map((ps, i) => (
                  <div key={ps.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="font-sans text-xs text-dark/25 tabular-nums w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm text-dark font-medium truncate">{ps.songs?.title ?? '—'}</p>
                      {ps.key_selected && (
                        <p className="font-sans text-xs text-dark/35 mt-0.5">Tonalité : {ps.key_selected}</p>
                      )}
                    </div>
                    {ps.songs?.id && (
                      <Link href={`/benevoles/chants/${ps.songs.id}`} className="text-dark/25 hover:text-teal transition-colors font-sans text-sm shrink-0 p-1">→</Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Annonces */}
          <section className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 py-3 border-b border-teal/10 bg-teal-50/50">
              <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Annonces</p>
            </div>
            <div className="p-4">
              <AnnoncesSection planId={id} initial={announcements as any} initialRecurring={recurringAnnouncements as any} canManage={canManage} />
            </div>
          </section>

          {/* Prédication */}
          <section className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 py-3 border-b border-teal/10 bg-teal-50/50">
              <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Prédication</p>
            </div>
            <div className="p-4">
              <SermonSection planId={id} initial={sermons as any} canManage={canManage} />
            </div>
          </section>

          {/* Vidéos */}
          <section className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-4 py-3 border-b border-teal/10 bg-teal-50/50">
              <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Vidéos</p>
            </div>
            <div className="p-4">
              <VideoSection planId={id} initial={videos as any} canManage={canManage} />
            </div>
          </section>

          {/* Affectations sans équipe */}
          {noTeamAssignments.length > 0 && (
            <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-4 py-3 border-b border-teal/10 bg-teal-50/50">
                <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Sans équipe</p>
              </div>
              <div className="divide-y divide-teal/8">
                {noTeamAssignments.map(a => (
                  <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                    <StatusDot status={a.status} />
                    <p className="font-sans text-sm text-dark font-medium flex-1 min-w-0 truncate">
                      {a.profiles?.first_name} {a.profiles?.last_name}
                    </p>
                    {canManage && (
                      <form action={removeAssignment}>
                        <input type="hidden" name="plan_id" value={id} />
                        <input type="hidden" name="assignment_id" value={a.id} />
                        <button type="submit" aria-label="Retirer" className="p-1.5 text-dark/20 hover:text-red-400 transition-colors font-sans text-xl leading-none">×</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supprimer (admin only) */}
          {isAdmin && (
            <div className="pt-2 flex justify-center">
              <form action={deletePlan}>
                <input type="hidden" name="plan_id" value={id} />
                <button type="submit" className="font-sans text-xs text-dark/25 hover:text-red-400 transition-colors px-4 py-2">
                  Supprimer ce service
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          DESKTOP  (lg+)
      ════════════════════════════════════════════════════ */}
      <div className="hidden lg:block bg-sand min-h-screen">
        {canManage ? (
          <div className="flex gap-5 items-start max-w-5xl mx-auto px-6 py-6">
            <AssignmentBoard
              planId={id}
              detail={detail}
              fillKey={fillKey}
              isAdmin={isAdmin}
              flashError={flashError ?? undefined}
              flashSent={flashSent ?? undefined}
              returnTo={`/benevoles/admin/plans/${id}`}
              slotHref={(k) => `?fill=${k}`}
            />
            <VolunteerPicker
              planId={id}
              detail={detail}
              fillKey={fillKey}
              returnTo={`/benevoles/admin/plans/${id}`}
            />
          </div>
        ) : (
          <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Link href="/benevoles/admin/plans" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm">←</Link>
              <div>
                <p className="font-sans text-xs text-dark/40 uppercase tracking-widest font-medium capitalize">{dateLong} · {time}</p>
                <h1 className="font-display text-2xl text-dark font-light">{plan.title}</h1>
              </div>
            </div>
            {plan.notes && (
              <div className="bg-teal/10 rounded-xl px-5 py-3 font-sans text-sm text-dark/70">{plan.notes}</div>
            )}
            {myAssignment && (
              <div className="bg-white rounded-2xl border border-teal/20 px-5 py-4">
                <p className="font-sans text-xs text-dark/40 uppercase tracking-widest font-medium mb-1">Mon rôle</p>
                <p className="font-sans text-sm font-medium text-dark">{myAssignment.positions?.name ?? 'Bénévole'}</p>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  )
}
