import Link from 'next/link'
import { removeAssignment, deletePlan, sendSingleInvitation } from './actions'
import { PlanTimeEditor } from './PlanTimeEditor'
import { INVITE_EXT_ID, type PlanDetail, type TeamDetail } from './getPlanDetail'
import { IconEnvelope, IconMusicalNote, IconPlay, IconProjector, IconWarning } from '@/app/benevoles/_components/Icons'
import { StatusDot } from '../../_components/StatusDot'
import { FlashMessage } from '../../_components/FlashMessage'
import { SongsSection } from './[id]/SongsSection'
import { CopySetlistButton } from './[id]/CopySetlistButton'
import AnnoncesSection from './[id]/AnnoncesSection'
import SermonSection from './[id]/SermonSection'
import VideoSection from './[id]/VideoSection'
import ShareButton from './[id]/ShareButton'

type Props = {
  planId: string
  detail: PlanDetail
  fillKey: string | null
  isAdmin: boolean
  flashError?: string
  flashSent?: string
  returnTo: string
  slotHref: (key: string) => string
}

function initials(firstName?: string, lastName?: string) {
  return `${(firstName ?? '')[0] ?? ''}${(lastName ?? '')[0] ?? ''}`.toUpperCase()
}

function PersonCard({ planId, a, returnTo }: { planId: string; a: TeamDetail['assignments'][number]; returnTo: string }) {
  const isInvite = a.user_id === INVITE_EXT_ID
  const displayName = isInvite ? (a.external_name ?? 'Invité (Ext)') : `${a.profiles?.first_name} ${a.profiles?.last_name}`
  const canSendInvite = isInvite ? !!a.external_email : a.status === 'pending'
  return (
    <div className="bg-white border border-teal/15 rounded-xl px-3.5 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-teal/10 text-teal-dark flex items-center justify-center font-sans text-xs font-bold shrink-0">
        {isInvite ? '✦' : initials(a.profiles?.first_name, a.profiles?.last_name)}
      </div>
      <div className="flex-1 min-w-0">
        {a.positions && (
          <p className="font-sans text-[10px] text-teal/60 uppercase tracking-wide leading-none mb-0.5">{a.positions.name}</p>
        )}
        <p className="font-sans text-sm font-medium text-dark truncate">{displayName}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {!isInvite && a.unavailable && (
          <span className="text-red-400" title="Indisponible ce jour-là"><IconWarning className="w-3.5 h-3.5" /></span>
        )}
        <StatusDot status={a.status} />
        {canSendInvite && (
          <form action={sendSingleInvitation}>
            <input type="hidden" name="assignment_id" value={a.id} />
            <input type="hidden" name="plan_id" value={planId} />
            <input type="hidden" name="return_to" value={returnTo} />
            <button type="submit" title="Envoyer l'invitation" aria-label="Envoyer l'invitation" className="text-dark/40 hover:text-teal transition-colors">
              <IconEnvelope className="w-4 h-4" />
            </button>
          </form>
        )}
        <form action={removeAssignment}>
          <input type="hidden" name="plan_id" value={planId} />
          <input type="hidden" name="assignment_id" value={a.id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <button type="submit" aria-label="Retirer" className="text-dark/20 hover:text-red-400 transition-colors font-sans text-lg leading-none">×</button>
        </form>
      </div>
    </div>
  )
}

function OpenSlotCard({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded-xl px-3.5 py-3 flex items-center gap-3 border-2 border-dashed transition-colors ${
        active ? 'border-teal bg-teal/5' : 'border-orange-200 hover:border-orange-300 bg-orange-50/40'
      }`}
    >
      <div className="w-9 h-9 rounded-full border-2 border-dashed border-orange-300 flex items-center justify-center text-orange-400 text-lg shrink-0">+</div>
      <div className="min-w-0">
        <p className="font-sans text-sm font-medium text-dark truncate">{label}</p>
        <p className="font-sans text-xs text-orange-500 font-medium">Poste à pourvoir</p>
      </div>
    </Link>
  )
}

export function AssignmentBoard({ planId, detail, fillKey, isAdmin, flashError, flashSent, returnTo, slotHref }: Props) {
  const { plan, isRehearsal, teams, noTeamAssignments, planSongs, allSongs, announcements, recurringAnnouncements, sermons, videos } = detail

  const visibleTeams = teams.filter(t => t.visible)
  const positionTeams = visibleTeams.filter(t => t.positions.length > 0)
  const totalPositions = positionTeams.reduce((s, t) => s + t.positions.length, 0)
  const filledPositions = positionTeams.reduce((s, t) => {
    const filledIds = new Set(t.assignments.map(a => a.position_id).filter(Boolean))
    return s + t.positions.filter(p => filledIds.has(p.id)).length
  }, 0)

  const date = new Date(plan.service_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex-1 min-w-0 space-y-5">
      {flashError && <FlashMessage message={`Erreur : ${flashError}`} type="error" />}
      {flashSent && <FlashMessage message="Invitation envoyée avec succès." type="success" />}

      {/* Hero */}
      <div className="bg-gradient-to-br from-teal to-teal-dark rounded-2xl px-6 py-5 text-white shadow-lg shadow-teal/20">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-sans text-[10px] uppercase tracking-widest font-semibold text-white/70 capitalize">
              {date} ·{' '}
              <PlanTimeEditor
                planId={planId}
                serviceDate={plan.service_date}
                className="font-sans text-[10px] uppercase tracking-widest font-semibold text-white/70 hover:text-white transition-colors cursor-pointer hover:underline decoration-dotted tabular-nums"
                inputClassName="font-sans text-[10px] border border-white/30 rounded px-1 bg-white/10 text-white focus:outline-none focus:border-white/60"
              />
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <h2 className="font-display text-2xl font-semibold leading-tight truncate">{plan.title}</h2>
              {isRehearsal && (
                <span className="inline-flex items-center gap-1 font-sans text-[11px] bg-white/15 px-2 py-0.5 rounded-full shrink-0"><IconMusicalNote className="w-3 h-3" /> Répétition</span>
              )}
            </div>
            {detail.pendingCount > 0 && (
              <p className="font-sans text-xs text-white/80 mt-2">{detail.pendingCount} réponse{detail.pendingCount > 1 ? 's' : ''} en attente</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ShareButton planId={planId} />
            <Link href={`/benevoles/admin/plans/${planId}/setlist`} className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors">
              <IconPlay className="w-3.5 h-3.5" /> Live
            </Link>
            <Link href={`/benevoles/admin/plans/${planId}/setlist?projection=1`} className="inline-flex items-center gap-1.5 font-sans text-xs font-semibold px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-colors">
              <IconProjector className="w-3.5 h-3.5" /> Projection
            </Link>
            {isAdmin && (
              <form action={deletePlan}>
                <input type="hidden" name="plan_id" value={planId} />
                <button type="submit" className="font-sans text-xs text-white/60 hover:text-white transition-colors px-1">Supprimer</button>
              </form>
            )}
          </div>
        </div>

        {totalPositions > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-sans text-white/80 mb-1.5">
              <span>Postes pourvus</span>
              <span className="font-semibold">{filledPositions} / {totalPositions}</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: totalPositions }).map((_, i) => (
                <span key={i} className={`flex-1 h-1.5 rounded-full ${i < filledPositions ? 'bg-white' : 'bg-white/25'}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      {plan.notes && (
        <div className="bg-teal/10 rounded-xl px-5 py-3 font-sans text-sm text-dark/70">{plan.notes}</div>
      )}

      {/* Équipes — masquées pour les répétitions */}
      {!isRehearsal && visibleTeams.map(team => {
        const filledPositionIds = new Set(team.assignments.map(a => a.position_id).filter(Boolean) as string[])
        const openPositions = team.positions.filter(p => !filledPositionIds.has(p.id))
        const noNamedPositions = team.positions.length === 0

        return (
          <section key={team.id} className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <p className="font-sans text-[10px] uppercase tracking-widest font-semibold text-dark/40">{team.name}</p>
              {team.assignments.length > 0 && (
                <span className="font-sans text-xs text-dark/30 tabular-nums">{team.assignments.length}</span>
              )}
            </div>

            {team.assignments.length === 0 && openPositions.length === 0 && !noNamedPositions && (
              <p className="font-sans text-xs text-dark/40 italic px-1">Aucun bénévole</p>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              {team.assignments.map(a => (
                <PersonCard key={a.id} planId={planId} a={a} returnTo={returnTo} />
              ))}
              {openPositions.map(pos => (
                <OpenSlotCard
                  key={pos.id}
                  label={pos.name}
                  href={slotHref(`pos:${pos.id}`)}
                  active={fillKey === `pos:${pos.id}`}
                />
              ))}
              {noNamedPositions && (
                <OpenSlotCard
                  label="Ajouter un bénévole"
                  href={slotHref(`team:${team.id}`)}
                  active={fillKey === `team:${team.id}`}
                />
              )}
            </div>
          </section>
        )
      })}

      {/* Chants */}
      <div className="space-y-2">
        {planSongs.length > 0 && (
          <div className="flex justify-end">
            <CopySetlistButton planId={planId} songCount={planSongs.length} />
          </div>
        )}
        <SongsSection planId={planId} planSongs={planSongs as any} allSongs={allSongs as any} />
      </div>

      {/* Annonces */}
      <section className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
        <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50">
          <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Annonces</p>
        </div>
        <div className="p-4">
          <AnnoncesSection planId={planId} initial={announcements as any} initialRecurring={recurringAnnouncements as any} canManage />
        </div>
      </section>

      {/* Prédication */}
      <section className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
        <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50">
          <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Prédication</p>
        </div>
        <div className="p-4">
          <SermonSection planId={planId} initial={sermons as any} canManage />
        </div>
      </section>

      {/* Vidéos */}
      <section className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
        <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50">
          <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Vidéos</p>
        </div>
        <div className="p-4">
          <VideoSection planId={planId} initial={videos as any} canManage />
        </div>
      </section>

      {/* Sans équipe (ancien format) */}
      {noTeamAssignments.length > 0 && (
        <div className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50">
            <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Sans équipe</p>
          </div>
          <div className="divide-y divide-teal/10">
            {noTeamAssignments.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <p className="font-sans text-sm text-dark font-medium">{a.profiles?.first_name} {a.profiles?.last_name}</p>
                <div className="flex gap-2 items-center">
                  <StatusDot status={a.status} />
                  <form action={removeAssignment}>
                    <input type="hidden" name="plan_id" value={planId} />
                    <input type="hidden" name="assignment_id" value={a.id} />
                    <input type="hidden" name="return_to" value={returnTo} />
                    <button type="submit" aria-label="Retirer" className="text-dark/20 hover:text-red-400 font-sans text-lg leading-none">×</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
