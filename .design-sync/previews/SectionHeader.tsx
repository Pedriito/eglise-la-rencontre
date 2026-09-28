import { SectionHeader, Badge, Card, EmptyState } from '@eglise/ui'

/** Les deux tailles. `sm` — 10px semi-gras — est la variante dominante :
 *  elle coiffe les cartes. `md` respire davantage et sert aux en-têtes de
 *  section larges et aux colonnes de tableau. */
export function Tailles() {
  return (
    <div className="max-w-md flex flex-col gap-3">
      <div className="rounded-xl border border-teal/20 bg-white px-4 py-3">
        <SectionHeader size="sm">Équipe du culte</SectionHeader>
        <p className="font-sans text-xs text-dark/40 mt-0.5">sm — 10px semi-gras, au-dessus d’une carte</p>
      </div>
      <div className="rounded-xl border border-teal/20 bg-white px-4 py-3">
        <SectionHeader size="md">Équipe du culte</SectionHeader>
        <p className="font-sans text-xs text-dark/40 mt-0.5">md — 12px médium, section large ou en-tête de tableau</p>
      </div>
    </div>
  )
}

/** L’usage dominant : l’intitulé d’équipe en tête de carte, avec à droite le
 *  badge qui dit l’état de l’équipe. C’est la composition de la page de plan. */
export function EnTeteDEquipe() {
  const equipes = [
    {
      nom: 'Louange',
      badge: <Badge tone="orange">À pourvoir</Badge>,
      membres: ['Marie Lefèvre · Piano', 'Jean Dubois · Basse'],
    },
    {
      nom: 'Accueil',
      badge: <Badge tone="green">Complet</Badge>,
      membres: ['Sarah Nguyen · Hôte', 'Jean Dubois · Hôte'],
    },
  ]
  return (
    <div className="max-w-md flex flex-col gap-3">
      {equipes.map(e => (
        <Card key={e.nom}>
          <div className="flex items-center justify-between border-b border-teal/10 px-4 py-3">
            <SectionHeader>{e.nom}</SectionHeader>
            {e.badge}
          </div>
          <div className="divide-y divide-teal/10">
            {e.membres.map(m => (
              <p key={m} className="font-sans text-sm text-dark px-4 py-3">{m}</p>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

/** En `md`, l’intitulé sert de colonne de tableau : il coiffe une liste dont
 *  chaque ligne reprend le même rythme de colonnes. */
export function EnTeteDeTableau() {
  const lignes = [
    { date: '12 oct.', service: 'Culte du dimanche', poste: 'Piano' },
    { date: '19 oct.', service: 'Culte du dimanche', poste: 'Batterie' },
    { date: '23 oct.', service: 'Répétition', poste: 'Ingé son' },
  ]
  return (
    <div className="max-w-md">
      <Card>
        <div className="grid grid-cols-3 gap-3 border-b border-teal/10 px-4 py-3">
          <SectionHeader size="md">Date</SectionHeader>
          <SectionHeader size="md">Service</SectionHeader>
          <SectionHeader size="md">Poste</SectionHeader>
        </div>
        <div className="divide-y divide-teal/10">
          {lignes.map(l => (
            <div key={l.date} className="grid grid-cols-3 gap-3 px-4 py-3">
              <p className="font-sans text-sm text-dark">{l.date}</p>
              <p className="font-sans text-sm text-dark">{l.service}</p>
              <p className="font-sans text-sm text-dark/50">{l.poste}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/** Sur fond sombre, le ton `onDark` découpe la barre latérale en groupes sans
 *  tirer l’œil : l’intitulé reste un repère, pas un titre. */
export function BarreLaterale() {
  const groupes = [
    { titre: 'Planning', liens: ['Prochains cultes', 'Répétitions', 'Historique'] },
    { titre: 'Équipes', liens: ['Louange', 'Accueil', 'Production', 'Technique'] },
  ]
  return (
    <div className="max-w-sm rounded-2xl bg-ink overflow-hidden p-4">
      <div className="flex flex-col gap-4">
        {groupes.map(g => (
          <div key={g.titre}>
            <SectionHeader tone="onDark" className="mb-1.5">{g.titre}</SectionHeader>
            <div className="flex flex-col gap-1.5">
              {g.liens.map(l => (
                <p key={l} className="font-sans text-sm text-white/60 px-3 py-1.5 rounded-lg">{l}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** L’intitulé sépare aussi deux blocs d’une même page — ici les services à
 *  venir et les services passés — sans carte ni bordure autour de lui. */
export function SeparateurDeListe() {
  return (
    <div className="max-w-md bg-teal-50 p-4">
      <div className="flex flex-col gap-3">
        <div>
          <SectionHeader className="mb-1.5">À venir</SectionHeader>
          <Card variant="elevated" padding="md">
            <p className="font-sans text-sm font-semibold text-dark">Culte du dimanche</p>
            <p className="font-sans text-xs text-dark/40 mt-0.5">12 octobre · 10:00 · Piano</p>
          </Card>
        </div>
        <div>
          <SectionHeader className="mb-1.5">Passés</SectionHeader>
          <Card variant="elevated">
            <EmptyState variant="block">Aucun service passé.</EmptyState>
          </Card>
        </div>
      </div>
    </div>
  )
}
