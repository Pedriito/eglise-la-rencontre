import Link from 'next/link'
import { addAssignment } from './actions'
import { INVITE_EXT_ID, type PlanDetail, type Profile, type TeamDetail } from './getPlanDetail'

type Props = {
  planId: string
  detail: PlanDetail
  fillKey: string | null
}

function resolveFillTarget(detail: PlanDetail, fillKey: string | null) {
  if (!fillKey) return null
  const sep = fillKey.indexOf(':')
  if (sep === -1) return null
  const kind = fillKey.slice(0, sep)
  const id = fillKey.slice(sep + 1)
  for (const team of detail.teams) {
    if (!team.visible) continue
    if (kind === 'team' && team.id === id) {
      return { team, positionId: null as string | null, positionName: null as string | null }
    }
    if (kind === 'pos') {
      const pos = team.positions.find(p => p.id === id)
      if (pos) return { team, positionId: pos.id, positionName: pos.name }
    }
  }
  return null
}

function initials(firstName?: string, lastName?: string) {
  return `${(firstName ?? '')[0] ?? ''}${(lastName ?? '')[0] ?? ''}`.toUpperCase()
}

function CandidateRow({
  p, team, planId, positionId, returnTo, warn,
}: {
  p: Profile
  team: TeamDetail
  planId: string
  positionId: string | null
  returnTo: string
  warn?: 'busy' | 'unavailable'
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-9 h-9 rounded-full bg-teal/10 text-teal-dark flex items-center justify-center font-sans text-xs font-bold shrink-0">
        {initials(p.first_name, p.last_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-sans text-sm font-medium text-dark truncate">{p.first_name} {p.last_name}</p>
        {warn === 'unavailable' && <p className="font-sans text-xs text-red-400">Indisponible ce jour-là</p>}
        {warn === 'busy' && <p className="font-sans text-xs text-amber-600">⚡ déjà {p.recentCount} services (60j)</p>}
      </div>
      <form action={addAssignment}>
        <input type="hidden" name="plan_id" value={planId} />
        <input type="hidden" name="team_id" value={team.id} />
        <input type="hidden" name="user_id" value={p.id} />
        {positionId && <input type="hidden" name="position_id" value={positionId} />}
        <input type="hidden" name="return_to" value={returnTo} />
        <button
          type="submit"
          className={`font-sans text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0 ${
            warn ? 'border border-amber-300 text-amber-700 hover:bg-amber-50' : 'bg-teal text-white hover:bg-teal-dark'
          }`}
        >
          Assigner
        </button>
      </form>
    </div>
  )
}

export function VolunteerPicker({ planId, detail, fillKey }: Props) {
  const target = resolveFillTarget(detail, fillKey)
  const returnTo = `/benevoles/admin/plans?plan=${planId}`

  if (!target) {
    return (
      <aside className="w-75 shrink-0 sticky top-6">
        <div className="bg-white border border-teal/15 rounded-2xl p-5 text-center">
          <p className="font-sans text-sm text-dark/40">Cliquez sur un poste à pourvoir pour affecter un bénévole.</p>
        </div>
      </aside>
    )
  }

  const { team, positionId, positionName } = target
  // Pour un poste nommé, on ne propose que les bénévoles cochés pour ce poste précis
  // (page Équipe) — sinon (équipe sans postes), tout le pool de l'équipe.
  const pool = positionId ? (team.candidatesByPosition[positionId] ?? []) : team.candidateProfiles
  const available = pool.filter(p => !p.unavailable && p.recentCount < 3)
  const busy = pool.filter(p => !p.unavailable && p.recentCount >= 3)
  const unavailable = pool.filter(p => p.unavailable)

  return (
    <aside className="w-75 shrink-0 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
      <div className="bg-white border border-teal/15 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="min-w-0">
            <p className="font-sans text-[10px] uppercase tracking-widest font-semibold text-dark/40">
              Poste · {positionName ?? team.name}
            </p>
            <p className="font-display text-lg font-semibold text-dark leading-tight">Choisir un bénévole</p>
          </div>
          <Link
            href={returnTo}
            scroll={false}
            aria-label="Fermer"
            className="w-7 h-7 rounded-full bg-teal-50 flex items-center justify-center text-dark/40 hover:text-dark transition-colors shrink-0 font-sans text-sm"
          >
            ×
          </Link>
        </div>

        {team.allowsGuests && (
          <form action={addAssignment} className="space-y-1.5 mb-4 pb-4 border-b border-teal/10">
            <input type="hidden" name="plan_id" value={planId} />
            <input type="hidden" name="team_id" value={team.id} />
            <input type="hidden" name="user_id" value={INVITE_EXT_ID} />
            {positionId && <input type="hidden" name="position_id" value={positionId} />}
            <input type="hidden" name="return_to" value={returnTo} />
            <p className="font-sans text-xs font-semibold text-dark/50 mb-1">Invité externe</p>
            <input
              type="text"
              name="external_name"
              required
              placeholder="Prénom Nom"
              className="w-full px-2.5 py-1.5 rounded-lg border border-teal/30 bg-teal-50/40 text-dark placeholder:text-dark/30 font-sans text-xs focus:outline-none focus:ring-1 focus:ring-teal/40"
            />
            <input
              type="email"
              name="external_email"
              placeholder="email@exemple.com (optionnel)"
              className="w-full px-2.5 py-1.5 rounded-lg border border-teal/30 bg-teal-50/40 text-dark placeholder:text-dark/30 font-sans text-xs focus:outline-none focus:ring-1 focus:ring-teal/40"
            />
            <button type="submit" className="w-full py-1.5 bg-teal text-white rounded-lg font-sans text-xs font-semibold hover:bg-teal-dark transition-colors">
              Inviter
            </button>
          </form>
        )}

        {available.length === 0 && busy.length === 0 && unavailable.length === 0 && (
          <p className="font-sans text-xs text-dark/40 italic">
            {positionId
              ? "Aucun bénévole n'est coché pour ce poste. Ajoutez-le depuis la page Équipe."
              : 'Aucun bénévole disponible pour cette équipe.'}
          </p>
        )}

        {available.length > 0 && (
          <div className="mb-3">
            <p className="font-sans text-[10px] uppercase tracking-wide font-semibold text-green-600 mb-1">Disponibles · {available.length}</p>
            <div className="divide-y divide-teal/10">
              {available.map(p => (
                <CandidateRow key={p.id} p={p} team={team} planId={planId} positionId={positionId} returnTo={returnTo} />
              ))}
            </div>
          </div>
        )}

        {busy.length > 0 && (
          <div className="mb-3">
            <p className="font-sans text-[10px] uppercase tracking-wide font-semibold text-amber-600 mb-1">Charge élevée · {busy.length}</p>
            <div className="divide-y divide-teal/10">
              {busy.map(p => (
                <CandidateRow key={p.id} p={p} team={team} planId={planId} positionId={positionId} returnTo={returnTo} warn="busy" />
              ))}
            </div>
          </div>
        )}

        {unavailable.length > 0 && (
          <div>
            <p className="font-sans text-[10px] uppercase tracking-wide font-semibold text-dark/30 mb-1">Indisponibles ce jour · {unavailable.length}</p>
            <div className="divide-y divide-teal/10 opacity-60">
              {unavailable.map(p => (
                <CandidateRow key={p.id} p={p} team={team} planId={planId} positionId={positionId} returnTo={returnTo} warn="unavailable" />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
