import { EmptyState, SectionHeader, Badge, Button, Card } from '@eglise/ui'

/** Les deux variantes. `inline` est une ligne glissée dans une liste : petite,
 *  italique, elle ne prend pas la place d’un élément. `block` occupe la carte
 *  entière quand il n’y a rien d’autre à montrer. */
export function Variantes() {
  return (
    <div className="max-w-md flex flex-col gap-3">
      <div>
        <SectionHeader className="mb-1.5">inline</SectionHeader>
        <div className="rounded-xl border border-teal/20 bg-white px-4 py-3">
          <EmptyState>Aucun bénévole affecté.</EmptyState>
        </div>
      </div>
      <div>
        <SectionHeader className="mb-1.5">block</SectionHeader>
        <Card>
          <EmptyState variant="block">Aucun service à venir.</EmptyState>
        </Card>
      </div>
    </div>
  )
}

/** En `inline`, le message tient la place d’une ligne de bénévole : la carte
 *  garde sa hauteur et l’équipe vide se lit au même rythme que les autres. */
export function EquipeSansBenevole() {
  return (
    <div className="max-w-md">
      <Card>
        <div className="flex items-center justify-between border-b border-teal/10 px-4 py-3">
          <SectionHeader>Accueil</SectionHeader>
          <Badge tone="orange">À pourvoir</Badge>
        </div>
        <div className="px-4 py-3">
          <EmptyState>Aucun bénévole affecté.</EmptyState>
        </div>
      </Card>
    </div>
  )
}

/** Plusieurs équipes d’un même plan : deux pourvues, une vide. La ligne en
 *  italique se distingue des noms sans rompre l’alignement de la liste. */
export function DansUnPlanDeCulte() {
  const equipes = [
    { nom: 'Louange', membres: ['Marie Lefèvre · Piano', 'Jean Dubois · Basse'] },
    { nom: 'Accueil', membres: ['Sarah Nguyen · Hôte'] },
    { nom: 'Technique', membres: [] as string[] },
  ]
  return (
    <div className="max-w-md">
      <Card>
        <div className="divide-y divide-teal/10">
          {equipes.map(e => (
            <div key={e.nom} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <SectionHeader>{e.nom}</SectionHeader>
                {e.membres.length === 0 ? <Badge tone="orange">À pourvoir</Badge> : <Badge tone="green">Complet</Badge>}
              </div>
              {e.membres.length === 0
                ? <EmptyState>Aucun bénévole affecté.</EmptyState>
                : e.membres.map(m => <p key={m} className="font-sans text-sm text-dark mt-0.5">{m}</p>)}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/** En `block`, sur le tableau de bord d’un bénévole : la carte est vide, le
 *  message est centré, et l’action qui la remplirait se pose en dessous. */
export function TableauDeBordVide() {
  return (
    <div className="max-w-md bg-teal-50 p-6">
      <SectionHeader className="mb-1.5">Mes services</SectionHeader>
      <Card variant="elevated">
        <EmptyState variant="block">Aucun service à venir.</EmptyState>
      </Card>
      <div className="flex justify-center mt-3">
        <Button variant="outline" size="sm">Voir les postes à pourvoir</Button>
      </div>
    </div>
  )
}
