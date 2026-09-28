import { Button } from '@eglise/ui'

/** Les six variantes, côte à côte. `primary` porte l'action principale d'un
 *  formulaire, `accent` celle d'un en-tête de page. */
export function Variantes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Enregistrer</Button>
      <Button variant="accent">+ Nouveau service</Button>
      <Button variant="dark">Projection</Button>
      <Button variant="outline">Annuler</Button>
      <Button variant="link">Voir la setlist →</Button>
    </div>
  )
}

/** La variante `ghost` est prévue pour les fonds sombres et teintés. */
export function SurFondSombre() {
  return (
    <div className="bg-ink rounded-2xl p-6 flex flex-wrap items-center gap-3">
      <Button variant="ghost">Dupliquer</Button>
      <Button variant="ghost">Partager</Button>
      <Button variant="ghost">Exporter l’agenda</Button>
    </div>
  )
}

/** Quatre tailles, de la puce d’action au bouton de validation pleine largeur. */
export function Tailles() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="xs">Réafficher</Button>
      <Button size="sm">Inviter</Button>
      <Button size="md">Confirmer</Button>
      <Button size="lg">Valider la planification</Button>
    </div>
  )
}

/** La forme pilule est réservée aux boutons d’en-tête et aux puces. */
export function Formes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button shape="rounded">Enregistrer</Button>
      <Button shape="pill" variant="accent">+ Nouveau</Button>
      <Button shape="pill" variant="outline">Filtrer</Button>
    </div>
  )
}

/** Un bouton désactivé conserve sa couleur mais perd son relief, et ne réagit
 *  plus au survol. Une seule opacité dans tout le système. */
export function Desactive() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button disabled>Envoyer les invitations</Button>
      <Button variant="outline" disabled>Annuler</Button>
      <Button variant="accent" disabled>Générer le planning</Button>
    </div>
  )
}

/** Une paire annuler / valider, la composition la plus fréquente en pied de
 *  modale : l’action secondaire à gauche, la principale à droite. */
export function PaireDeModale() {
  return (
    <div className="max-w-sm border border-teal/20 rounded-2xl bg-white p-4">
      <p className="font-sans text-sm text-dark/70 mb-4">
        Douze affectations seront enregistrées pour les quatre prochains dimanches.
      </p>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm">Annuler</Button>
        <Button size="sm">Valider</Button>
      </div>
    </div>
  )
}
