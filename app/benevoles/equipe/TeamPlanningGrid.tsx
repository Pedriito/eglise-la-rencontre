'use client'

import { useMemo, useOptimistic, useRef, useState, useTransition } from 'react'
import { assignTeamMember, moveTeamAssignment, removeTeamAssignment } from './actions'
import type { CellAssignment, MemberRow, PlanColumn, TeamPlanning, TeamPosition } from '@/lib/teamPlanning'

type Drag =
  | { kind: 'member'; userId: string }
  | { kind: 'assignment'; assignment: CellAssignment }

/** Choix de poste en attente : un membre a plusieurs postes possibles sur ce service. */
type Pending = {
  userId: string
  planId: string
  choices: TeamPosition[]
  /** Présent quand on déplace une affectation existante plutôt qu'on en crée une. */
  moving?: CellAssignment
}

type OptimisticOp =
  | { type: 'add'; assignment: CellAssignment }
  | { type: 'remove'; id: string }

const STATUS_STYLE: Record<string, { chip: string; dot: string; label: string }> = {
  confirmed: { chip: 'bg-green-50 border-green-200 text-green-800', dot: 'bg-green-500', label: 'Confirmé' },
  declined:  { chip: 'bg-red-50 border-red-200 text-red-700',       dot: 'bg-red-500',   label: 'Décliné' },
  pending:   { chip: 'bg-amber-50 border-amber-200 text-amber-800', dot: 'bg-amber-400', label: 'En attente' },
}

const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', timeZone: 'Europe/Paris' })
const fmtTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })

const cellKey = (userId: string, planId: string) => `${userId}:${planId}`

function coverageTone(plan: PlanColumn) {
  if (plan.past) return 'bg-dark/5 text-dark/40'
  if (plan.total === null) return plan.filled > 0 ? 'bg-teal/10 text-teal-dark' : 'bg-amber-100 text-amber-700'
  if (plan.filled >= plan.total) return 'bg-green-100 text-green-700'
  return plan.filled === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
}

export function TeamPlanningGrid({ planning }: { planning: TeamPlanning }) {
  const { team, plans, members, unavailable, elsewhere } = planning
  const [isPending, startTransition] = useTransition()
  const [assignments, applyOptimistic] = useOptimistic(
    planning.assignments,
    (current: CellAssignment[], op: OptimisticOp) =>
      op.type === 'add' ? [...current, op.assignment] : current.filter(a => a.id !== op.id),
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [over, setOver] = useState<{ key: string; ok: boolean } | null>(null)
  // `dataTransfer` n'est lisible qu'au `drop` : on garde la charge utile en ref pour le survol.
  const drag = useRef<Drag | null>(null)

  const unavailableSet = useMemo(() => new Set(unavailable.map(u => cellKey(u.userId, u.planId))), [unavailable])
  const elsewhereMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const e of elsewhere) map.set(cellKey(e.userId, e.planId), [...(map.get(cellKey(e.userId, e.planId)) ?? []), e.teamName])
    return map
  }, [elsewhere])
  const byCell = useMemo(() => {
    const map = new Map<string, CellAssignment[]>()
    for (const a of assignments) map.set(cellKey(a.userId, a.planId), [...(map.get(cellKey(a.userId, a.planId)) ?? []), a])
    return map
  }, [assignments])
  const memberById = useMemo(() => new Map(members.map(m => [m.id, m])), [members])
  const planById = useMemo(() => new Map(plans.map(p => [p.id, p])), [plans])

  /** Postes que `member` peut tenir sur `plan` : ses postes cochés (à défaut, tous ceux de
   *  l'équipe), hors postes exclus du service et hors postes qu'il tient déjà ce jour-là. */
  function positionChoices(member: MemberRow, plan: PlanColumn): TeamPosition[] {
    if (team.hidePositions || team.positions.length === 0) return []
    const taken = new Set((byCell.get(cellKey(member.id, plan.id)) ?? []).map(a => a.positionId))
    const open = team.positions.filter(p => !plan.excludedPositionIds.includes(p.id) && !taken.has(p.id))
    const mine = open.filter(p => member.positionIds.includes(p.id))
    return mine.length > 0 ? mine : open
  }

  function run(optimistic: OptimisticOp[], task: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      for (const op of optimistic) applyOptimistic(op)
      try {
        const res = await task()
        if (!res.ok) setError(res.error ?? 'Action impossible.')
      } catch {
        setError('Erreur réseau : le planning n’a pas été modifié.')
      }
    })
  }

  function doAssign(userId: string, planId: string, positionId: string | null, moving?: CellAssignment) {
    const positionName = team.positions.find(p => p.id === positionId)?.name ?? null
    const added: OptimisticOp = {
      type: 'add',
      assignment: { id: `tmp-${crypto.randomUUID()}`, planId, userId, positionId, positionName, status: 'pending' },
    }
    if (moving) {
      run([added, { type: 'remove', id: moving.id }], () =>
        moveTeamAssignment({ teamId: team.id, assignmentId: moving.id, toPlanId: planId, toUserId: userId, positionId }),
      )
    } else {
      run([added], () => assignTeamMember({ teamId: team.id, planId, userId, positionId }))
    }
  }

  /** Point d'entrée commun au « + », au dépôt d'un nom et au dépôt d'une pastille. */
  function request(userId: string, planId: string, moving?: CellAssignment) {
    const member = memberById.get(userId)
    const plan = planById.get(planId)
    if (!member || !plan || plan.past) return
    if (unavailableSet.has(cellKey(userId, planId))) {
      setError(`${member.firstName} a déclaré une indisponibilité ce jour-là.`)
      return
    }
    if (moving && moving.userId === userId && moving.planId === planId) return

    const choices = positionChoices(member, plan)
    if (team.hidePositions || team.positions.length === 0) return doAssign(userId, planId, null, moving)
    if (choices.length === 0) {
      setError(`${member.firstName} occupe déjà tous les postes possibles sur ce service.`)
      return
    }
    // Une pastille déplacée garde son poste quand la personne ciblée peut le tenir.
    const kept = moving && choices.find(p => p.id === moving.positionId)
    if (kept) return doAssign(userId, planId, kept.id, moving)
    // Confier la place de quelqu'un d'autre à un membre non qualifié pour ce poste : jamais de
    // conversion silencieuse vers un autre poste, le responsable choisit en connaissance de cause.
    if (choices.length === 1 && !(moving && moving.userId !== userId)) return doAssign(userId, planId, choices[0].id, moving)
    setPending({ userId, planId, choices, moving })
  }

  /** `null` si le dépôt est possible, sinon la raison du refus. */
  function dropRefusal(userId: string, planId: string): string | null {
    const d = drag.current
    const plan = planById.get(planId)
    if (!d || !plan) return 'Dépôt impossible ici.'
    if (plan.past) return 'Ce service est déjà passé.'
    const target = d.kind === 'member' ? d.userId : userId
    if (unavailableSet.has(cellKey(target, planId))) {
      return `${memberById.get(target)?.firstName ?? 'Cette personne'} a déclaré une indisponibilité ce jour-là.`
    }
    return null
  }

  function onDrop(userId: string, planId: string) {
    const d = drag.current
    const reason = dropRefusal(userId, planId)
    drag.current = null
    setOver(null)
    if (!d || isPending) return
    if (reason) { setError(reason); return }
    if (d.kind === 'member') request(d.userId, planId)
    else request(userId, planId, d.assignment)
  }

  function dropProps(userId: string, planId: string) {
    const key = cellKey(userId, planId)
    return {
      // Toute case accepte le dépôt, même interdit : un navigateur n'envoie PAS `drop` sur une cible
      // qui n'a pas annulé `dragover`, et le refus resterait alors muet. Le survol rouge prévient,
      // et `onDrop` explique le refus.
      onDragOver: (e: React.DragEvent) => {
        if (!drag.current) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        const ok = dropRefusal(userId, planId) === null
        if (over?.key !== key || over.ok !== ok) setOver({ key, ok })
      },
      onDragLeave: () => setOver(prev => (prev?.key === key ? null : prev)),
      onDrop: (e: React.DragEvent) => { e.preventDefault(); onDrop(userId, planId) },
    }
  }

  function startDrag(e: React.DragEvent, payload: Drag) {
    drag.current = payload
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', payload.kind) // requis par Firefox pour démarrer le glisser
  }
  const endDrag = () => { drag.current = null; setOver(null) }

  if (plans.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-teal/20 px-6 py-12 text-center font-sans text-sm text-dark/50">
        Aucun service ce mois-ci pour l’équipe {team.name}.
      </div>
    )
  }
  if (members.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-teal/20 px-6 py-12 text-center font-sans text-sm text-dark/50">
        Aucun membre dans l’équipe {team.name} pour l’instant.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-sans text-sm text-red-600">
          <span>{error}</span>
          <button type="button" aria-label="Fermer" onClick={() => setError(null)} className="opacity-60 hover:opacity-100 text-lg leading-none">×</button>
        </div>
      )}

      <p className="font-sans text-xs text-dark/40 hidden md:block">
        Glisse un nom sur un service pour planifier, ou une pastille pour la déplacer (même un autre membre). Sur mobile, touche « + ».
      </p>

      <div
        aria-busy={isPending}
        className={`bg-white rounded-2xl border border-teal/20 overflow-auto max-h-[70vh] transition-opacity ${isPending ? 'opacity-80' : ''}`}
      >
        <table className="border-separate border-spacing-0 min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 bg-teal-50 border-b border-r border-teal/15 px-2 md:px-3 py-2 text-left font-sans text-[10px] uppercase tracking-widest text-dark/40 font-medium min-w-28 md:min-w-40">
                Membre
              </th>
              {plans.map(plan => (
                <th
                  key={plan.id}
                  scope="col"
                  className={`sticky top-0 z-20 bg-teal-50 border-b border-teal/15 px-2 py-2 text-left align-top min-w-36 ${plan.past ? 'opacity-60' : ''}`}
                >
                  <p className="font-sans text-xs font-semibold text-dark capitalize">{fmtDay.format(new Date(plan.serviceDate))}</p>
                  <p className="font-sans text-[11px] text-dark/50 truncate max-w-36" title={plan.title}>
                    {fmtTime.format(new Date(plan.serviceDate))} · {plan.title}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 font-sans text-[10px] font-semibold ${coverageTone(plan)}`}
                    title={plan.openPositions.length > 0 ? `À pourvoir : ${plan.openPositions.map(p => p.name).join(', ')}` : 'Complet'}
                  >
                    {plan.total === null ? `${plan.filled} affecté${plan.filled > 1 ? 's' : ''}` : `${plan.filled}/${plan.total} postes`}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-white border-b border-r border-teal/10 px-2 md:px-3 py-2 text-left font-normal"
                >
                  <div
                    draggable={!isPending}
                    onDragStart={e => startDrag(e, { kind: 'member', userId: member.id })}
                    onDragEnd={endDrag}
                    className="cursor-grab active:cursor-grabbing select-none"
                    title="Glisse ce nom sur un service pour planifier"
                  >
                    <p className="font-sans text-xs md:text-sm font-medium text-dark truncate max-w-24 md:max-w-40">
                      {member.firstName} {member.lastName}
                      {member.isLeader && <span className="hidden md:inline ml-1.5 align-middle rounded bg-teal/10 px-1 py-0.5 text-[9px] uppercase tracking-wide text-teal-dark">resp.</span>}
                    </p>
                    <p className="font-sans text-[10px] md:text-[11px] text-dark/40">
                      {member.servedCount} service{member.servedCount > 1 ? 's' : ''}<span className="hidden md:inline"> ce mois-ci</span>
                    </p>
                  </div>
                </th>
                {plans.map(plan => {
                  const key = cellKey(member.id, plan.id)
                  const cell = byCell.get(key) ?? []
                  const blocked = unavailableSet.has(key)
                  const elsewhereTeams = elsewhereMap.get(key)
                  const highlight = over?.key === key ? (over.ok ? 'ok' : 'refused') : null
                  return (
                    <td
                      key={plan.id}
                      {...dropProps(member.id, plan.id)}
                      className={`group border-b border-teal/10 px-1.5 py-1.5 align-top transition-colors ${
                        blocked
                          ? 'bg-[repeating-linear-gradient(135deg,transparent,transparent_6px,rgb(0_0_0/0.04)_6px,rgb(0_0_0/0.04)_12px)]'
                          : highlight === 'ok' ? 'bg-teal/10 ring-2 ring-inset ring-teal/40' : plan.past ? 'bg-dark/[0.02]' : ''
                      } ${highlight === 'refused' ? 'ring-2 ring-inset ring-red-300' : ''}`}
                    >
                      <div className="flex flex-col gap-1 min-h-9">
                        {cell.map(a => {
                          const style = STATUS_STYLE[a.status] ?? STATUS_STYLE.pending
                          const isTemp = a.id.startsWith('tmp-')
                          return (
                            <div
                              key={a.id}
                              draggable={!isPending && !isTemp && !plan.past}
                              onDragStart={e => startDrag(e, { kind: 'assignment', assignment: a })}
                              onDragEnd={endDrag}
                              title={`${style.label}${a.positionName ? ` · ${a.positionName}` : ''}`}
                              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 font-sans text-xs ${style.chip} ${
                                !isPending && !isTemp && !plan.past ? 'cursor-grab active:cursor-grabbing' : ''
                              } ${isTemp ? 'opacity-60' : ''}`}
                            >
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
                              <span className="flex-1 truncate font-medium">{a.positionName ?? 'Affecté'}</span>
                              {!isTemp && (
                                <button
                                  type="button"
                                  aria-label={`Retirer ${member.firstName} du service du ${fmtDay.format(new Date(plan.serviceDate))}`}
                                  disabled={isPending}
                                  onClick={() => run([{ type: 'remove', id: a.id }], () => removeTeamAssignment({ teamId: team.id, assignmentId: a.id }))}
                                  className="shrink-0 opacity-40 hover:opacity-100 focus-visible:opacity-100 text-sm leading-none disabled:opacity-20"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          )
                        })}

                        {blocked && cell.length === 0 && (
                          <span className="font-sans text-[11px] text-dark/40 px-1 py-1">Indispo</span>
                        )}

                        {!blocked && !plan.past && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => request(member.id, plan.id)}
                            aria-label={`Planifier ${member.firstName} le ${fmtDay.format(new Date(plan.serviceDate))}`}
                            className={`rounded-lg border border-dashed border-teal/25 text-teal/60 hover:border-teal hover:text-teal hover:bg-teal/5 transition-colors text-sm leading-none disabled:opacity-40 ${
                              cell.length === 0 ? 'py-1.5' : 'py-0.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                            }`}
                          >
                            +
                          </button>
                        )}

                        {elsewhereTeams && (
                          <span className="font-sans text-[10px] text-dark/40 truncate" title={`Déjà affecté·e ce jour-là : ${elsewhereTeams.join(', ')}`}>
                            aussi : {elsewhereTeams.join(', ')}
                          </span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 font-sans text-[11px] text-dark/50" aria-label="Légende">
        {Object.entries(STATUS_STYLE).map(([key, s]) => (
          <li key={key} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${s.dot}`} />{s.label}</li>
        ))}
        <li className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-[repeating-linear-gradient(135deg,transparent,transparent_2px,rgb(0_0_0/0.15)_2px,rgb(0_0_0/0.15)_4px)] border border-dark/10" />Indisponible (non planifiable)</li>
      </ul>

      {pending && (
        <PositionPicker
          pending={pending}
          member={memberById.get(pending.userId)!}
          plan={planById.get(pending.planId)!}
          onCancel={() => setPending(null)}
          onPick={positionId => {
            const { userId, planId, moving } = pending
            setPending(null)
            doAssign(userId, planId, positionId, moving)
          }}
        />
      )}
    </div>
  )
}

function PositionPicker({
  pending, member, plan, onPick, onCancel,
}: {
  pending: Pending
  member: MemberRow
  plan: PlanColumn
  onPick: (positionId: string) => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-dark/40 p-4"
      onClick={onCancel}
      onKeyDown={e => e.key === 'Escape' && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choisir un poste"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="font-sans text-xs uppercase tracking-widest text-dark/40">
          {fmtDay.format(new Date(plan.serviceDate))} · {plan.title}
        </p>
        <h2 className="font-display text-xl text-dark font-light mt-1">Quel poste pour {member.firstName} ?</h2>
        <div className="mt-4 grid gap-2">
          {pending.choices.map((p, i) => (
            <button
              key={p.id}
              type="button"
              autoFocus={i === 0}
              onClick={() => onPick(p.id)}
              className="rounded-xl border border-teal/20 px-4 py-2.5 text-left font-sans text-sm font-medium text-dark hover:border-teal hover:bg-teal/5 transition-colors"
            >
              {p.name}
              {plan.openPositions.some(o => o.id === p.id) && <span className="ml-2 text-xs font-normal text-orange-500">à pourvoir</span>}
            </button>
          ))}
        </div>
        <button type="button" onClick={onCancel} className="mt-3 w-full rounded-xl py-2 font-sans text-sm text-dark/50 hover:text-dark">
          Annuler
        </button>
      </div>
    </div>
  )
}
