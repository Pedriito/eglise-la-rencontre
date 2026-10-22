import { Badge } from '@eglise/ui'

/** Les six tons. Chacun porte un sens : `orange` signale une action attendue,
 *  `amber` une attente, `green` un état acquis, `red` un refus. */
export function Tons() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="teal">Louange</Badge>
      <Badge tone="orange">À pourvoir</Badge>
      <Badge tone="green">Confirmé</Badge>
      <Badge tone="amber">En attente</Badge>
      <Badge tone="red">Décliné</Badge>
      <Badge tone="neutral">Archivé</Badge>
    </div>
  )
}

/** Deux tailles : la petite pour les en-têtes denses, la moyenne quand
 *  l’étiquette porte l’information principale d’une ligne. */
export function Tailles() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge size="sm" tone="orange">À pourvoir</Badge>
      <Badge size="md" tone="orange">À pourvoir</Badge>
    </div>
  )
}

/** Les statuts d’affectation tels qu’ils apparaissent dans l’historique d’un
 *  bénévole, avec leur pastille de couleur. */
export function StatutsDAffectation() {
  const statuts = [
    { label: 'Confirmé', tone: 'green' as const, dot: 'bg-green-500' },
    { label: 'En attente', tone: 'amber' as const, dot: 'bg-amber-400' },
    { label: 'Décliné', tone: 'red' as const, dot: 'bg-red-400' },
  ]
  return (
    <div className="flex flex-col items-start gap-2">
      {statuts.map(s => (
        <Badge key={s.label} tone={s.tone} size="md">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          {s.label}
        </Badge>
      ))}
    </div>
  )
}

/** Dans un en-tête de section, le badge indique l’état de l’équipe d’un coup
 *  d’œil — c’est son usage le plus fréquent. */
export function DansUnEnTete() {
  return (
    <div className="max-w-sm bg-white border border-teal/20 rounded-2xl">
      <div className="px-4 py-3 flex items-center justify-between">
        <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Accueil</p>
        <Badge tone="orange">À pourvoir</Badge>
      </div>
      <div className="px-4 py-3 border-t border-teal/10 flex items-center justify-between">
        <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Production</p>
        <Badge tone="green">Complet</Badge>
      </div>
    </div>
  )
}
