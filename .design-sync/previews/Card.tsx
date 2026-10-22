import { Card, SectionHeader, Badge, Button } from '@eglise/ui'

/** Les deux traitements de surface. `bordered` est le cas courant ; `elevated`
 *  s’emploie quand la carte est posée sur un fond déjà teinté. */
export function Variantes() {
  return (
    <div className="bg-teal-50 p-6 grid grid-cols-2 gap-4">
      <Card padding="md">
        <p className="font-sans text-sm text-dark/70">Bordure teal — le cas courant.</p>
      </Card>
      <Card variant="elevated" padding="md">
        <p className="font-sans text-sm text-dark/70">Ombre légère, sans bordure.</p>
      </Card>
    </div>
  )
}

/** La composition dominante de l’application : un en-tête de section, un badge
 *  d’état, puis une liste de lignes séparées. */
export function CarteDEquipe() {
  const membres = [
    { nom: 'Marie Lefèvre', poste: 'Conducteur de louange' },
    { nom: 'Jean Dubois', poste: 'Piano' },
    { nom: 'Sarah Nguyen', poste: 'Chœur' },
  ]
  return (
    <div className="max-w-md">
      <Card>
        <div className="px-4 py-3 border-b border-teal/10 flex items-center justify-between">
          <SectionHeader>Louange</SectionHeader>
          <Badge tone="orange">À pourvoir</Badge>
        </div>
        <div className="divide-y divide-teal/10">
          {membres.map(m => (
            <div key={m.nom} className="px-4 py-3">
              <p className="font-sans text-sm text-dark">{m.nom}</p>
              <p className="font-sans text-xs text-dark/40 mt-0.5">{m.poste}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/** Une carte peut porter son propre espacement, ou le laisser à son contenu
 *  quand celui-ci contient des sections bordées. */
export function Espacements() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card padding="none"><div className="bg-teal/5 p-3 font-sans text-xs text-dark/50">aucun</div></Card>
      <Card padding="sm"><p className="font-sans text-xs text-dark/50">réduit</p></Card>
      <Card padding="md"><p className="font-sans text-xs text-dark/50">confortable</p></Card>
    </div>
  )
}

/** Une carte de service, telle qu’elle apparaît sur le tableau de bord d’un
 *  bénévole : date, intitulé, rôle, et l’action attendue. */
export function CarteDeService() {
  return (
    <div className="max-w-md">
      <Card variant="elevated" padding="md">
        <div className="flex items-start gap-4">
          <div className="text-center shrink-0">
            <p className="font-sans text-[9px] uppercase tracking-wide text-teal font-semibold">DIM</p>
            <p className="font-display text-[26px] text-teal font-semibold leading-tight">12</p>
            <p className="font-sans text-[9px] uppercase tracking-wide text-teal font-semibold">OCT</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-sm font-semibold text-dark">Culte du dimanche</p>
            <p className="font-sans text-xs text-dark/40 mt-0.5">10:00 · Piano · Louange</p>
            <div className="flex gap-2 mt-3">
              <Button size="xs">Confirmer</Button>
              <Button size="xs" variant="outline">Décliner</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
