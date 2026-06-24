import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { removeAssignment, deletePlan, sendSingleInvitation } from '../actions'
import { IconEnvelope, IconMusicalNote, IconPlay, IconProjector, IconWarning } from '@/app/benevoles/_components/Icons'
import { SongsSection } from './SongsSection'
import { CopySetlistButton } from './CopySetlistButton'
import { StatusDot } from '../../../_components/StatusDot'
import { FlashMessage } from '../../../_components/FlashMessage'
import { AddAssignmentForm } from './AddAssignmentForm'
import AnnoncesSection from './AnnoncesSection'
import SermonSection from './SermonSection'
import VideoSection from './VideoSection'
import ShareButton from './ShareButton'
import { getPlanDetail, INVITE_EXT_ID } from '../getPlanDetail'

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

  const isAdmin   = ['admin', 'super_admin'].includes(me?.permission ?? '')
  const isEditor  = me?.permission === 'editor'
  const canManage = isAdmin || isEditor

  const detail = await getPlanDetail(supabase, id, user.id, isAdmin)
  if (!detail) redirect('/benevoles/admin/plans')

  const {
    plan, isRehearsal, teams, noTeamAssignments,
    planSongs, allSongs, announcements, recurringAnnouncements, sermons, videos,
  } = detail

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
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl text-dark font-light">{plan.title}</h1>
              {isRehearsal && (
                <span className="inline-flex items-center gap-1 font-sans text-xs bg-teal/10 text-teal px-2 py-0.5 rounded-full"><IconMusicalNote className="w-3 h-3" /> Répétition</span>
              )}
            </div>
            <p className="text-xs text-dark/50 font-sans capitalize">{date} · {time}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ShareButton planId={id} />
          <Link
            href={`/benevoles/admin/plans/${id}/setlist`}
            className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold px-3 py-1.5 bg-teal text-white rounded-lg hover:bg-teal-dark transition-colors"
          >
            <IconPlay className="w-3.5 h-3.5" /> Mode live
          </Link>
          <Link
            href={`/benevoles/admin/plans/${id}/setlist?projection=1`}
            className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold px-3 py-1.5 bg-dark text-white rounded-lg hover:bg-dark/80 transition-colors"
          >
            <IconProjector className="w-3.5 h-3.5" /> Projection
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

        {/* Grille d'équipes — masquée pour les répétitions */}
        {!isRehearsal && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.filter(team => team.visible).map(team => (
            <div key={team.id} className="bg-white rounded-2xl border border-teal/20 overflow-hidden flex flex-col">
              {/* En-tête équipe */}
              <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50 flex items-center justify-between">
                <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">{team.name}</p>
                {team.assignments.length > 0 && (
                  <span className="text-xs text-dark/30 font-sans tabular-nums">{team.assignments.length}</span>
                )}
              </div>

              {/* Membres affectés */}
              <div className="divide-y divide-teal/10 flex-1">
                {team.assignments.length === 0 && (
                  <p className="px-5 py-4 text-xs text-dark/50 font-sans italic">Aucun bénévole</p>
                )}
                {team.assignments.map(a => {
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
                            <span className="inline-flex items-center gap-1"><IconEnvelope className="w-3 h-3" /> envoyée le {new Date(a.invitation_sent_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!isInvite && a.unavailable && (
                          <span className="text-red-400" title="Indisponible ce jour-là"><IconWarning className="w-3.5 h-3.5" /></span>
                        )}
                        <StatusDot status={a.status} />
                        {canManage && canSendInvite && (
                          <form action={sendSingleInvitation}>
                            <input type="hidden" name="assignment_id" value={a.id} />
                            <input type="hidden" name="plan_id" value={id} />
                            <button type="submit" title="Envoyer l'invitation" aria-label="Envoyer l'invitation" className="text-dark/40 hover:text-teal transition-colors">
                              <IconEnvelope className="w-4 h-4" />
                            </button>
                          </form>
                        )}
                        {canManage && (
                          <form action={removeAssignment}>
                            <input type="hidden" name="plan_id" value={id} />
                            <input type="hidden" name="assignment_id" value={a.id} />
                            <button type="submit" aria-label="Retirer" className="text-dark/20 hover:text-red-400 transition-colors font-sans text-lg leading-none">
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
                    teamPositions={team.positions}
                    teamProfiles={team.candidateProfiles}
                    candidatesByPosition={team.candidatesByPosition}
                    isInviteTeam={team.allowsGuests}
                    hidePositions={team.hidePositions}
                  />
                </div>
              )}
            </div>
          ))}
        </div>}

        {/* ── Chants du plan ─────────────────────────────────────────── */}
        <div className="space-y-2">
          {canManage && planSongs.length > 0 && (
            <div className="flex justify-end">
              <CopySetlistButton planId={id} songCount={planSongs.length} />
            </div>
          )}
          <SongsSection
            planId={id}
            planSongs={planSongs as any}
            allSongs={allSongs as any}
          />
        </div>

        {/* ── Annonces ────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50">
            <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Annonces</p>
          </div>
          <div className="p-4">
            <AnnoncesSection
              planId={id}
              initial={announcements as any}
              initialRecurring={recurringAnnouncements as any}
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
              initial={sermons as any}
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
              initial={videos as any}
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
                      <button type="submit" aria-label="Retirer" className="text-dark/20 hover:text-red-400 font-sans text-lg leading-none">×</button>
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
