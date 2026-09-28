import { CloseButton, SectionHeader, Badge, Button, Card, TextField } from '@eglise/ui'

/** L’usage canonique : le `×` en haut à droite d’une modale. Isolé, ce bouton
 *  ne se lit pas ; c’est l’en-tête qui lui donne sa place et sa cible. */
export function EnTeteDeModale() {
  const candidats = [
    { nom: 'Marie Lefèvre', poste: 'Piano' },
    { nom: 'Jean Dubois', poste: 'Basse' },
    { nom: 'Sarah Nguyen', poste: 'Chœur' },
  ]
  return (
    <div className="max-w-sm">
      <Card variant="elevated">
        <div className="flex items-start justify-between border-b border-teal/10 p-4">
          <div className="min-w-0">
            <SectionHeader>Louange</SectionHeader>
            <p className="font-sans text-sm font-semibold text-dark mt-0.5">Ajouter un bénévole</p>
            <p className="font-sans text-xs text-dark/40 mt-0.5">Culte du dimanche · 12 octobre</p>
          </div>
          <CloseButton />
        </div>
        <div className="flex flex-col gap-2 p-4">
          <TextField placeholder="Rechercher un bénévole…" size="sm" />
          {candidats.map(c => (
            <div key={c.nom} className="flex items-center justify-between rounded-xl bg-teal/5 px-3.5 py-2.5">
              <p className="font-sans text-sm text-dark">{c.nom}</p>
              <p className="font-sans text-xs text-dark/40">{c.poste}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-teal/10 p-4">
          <Button variant="outline" size="sm">Annuler</Button>
          <Button size="sm">Ajouter</Button>
        </div>
      </Card>
    </div>
  )
}

/** Un bandeau que l’on peut écarter. Le libellé par défaut « Fermer » ne
 *  convient plus ici : on nomme ce que l’on referme. */
export function BandeauEcartable() {
  return (
    <div className="max-w-md flex flex-col gap-2">
      <div className="flex items-center gap-3 rounded-xl bg-teal/10 px-4 py-3">
        <p className="flex-1 min-w-0 font-sans text-xs text-dark/60">
          Trois postes restent à pourvoir pour le culte du 12 octobre.
        </p>
        <Badge tone="orange">À pourvoir</Badge>
        <CloseButton size="sm" aria-label="Masquer ce rappel" />
      </div>
      <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3">
        <p className="flex-1 min-w-0 font-sans text-xs text-dark/60">
          Jean Dubois s’est déclaré indisponible le 19 octobre.
        </p>
        <CloseButton size="sm" aria-label="Masquer cette alerte" />
      </div>
    </div>
  )
}

/** Les trois tailles, dans le contexte qui appelle chacune : bandeau dense,
 *  panneau, modale pleine page. Le `×` suit la taille du bouton. */
export function Tailles() {
  const tailles = [
    { size: 'sm' as const, titre: 'Rappel', legende: 'sm — bandeau ou puce de filtre' },
    { size: 'md' as const, titre: 'Filtres', legende: 'md — panneau latéral' },
    { size: 'lg' as const, titre: 'Ajouter un bénévole', legende: 'lg — modale pleine page' },
  ]
  return (
    <div className="max-w-md flex flex-col gap-2">
      {tailles.map(t => (
        <div key={t.size} className="rounded-xl border border-teal/20 bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="font-sans text-sm text-dark">{t.titre}</p>
            <CloseButton size={t.size} aria-label={`Fermer ${t.titre}`} />
          </div>
          <p className="font-sans text-xs text-dark/40 mt-0.5">{t.legende}</p>
        </div>
      ))}
    </div>
  )
}

/** Panneau de filtres sur fond sombre : le ton `onDark` est le seul qui reste
 *  lisible, et le `×` garde son alignement avec l’intitulé de section. */
export function PanneauSombre() {
  return (
    <div className="max-w-sm rounded-2xl bg-ink overflow-hidden">
      <div className="flex items-center justify-between border-b border-dark/10 p-4">
        <SectionHeader tone="onDark">Filtrer le planning</SectionHeader>
        <CloseButton tone="onDark" aria-label="Fermer les filtres" />
      </div>
      <div className="flex flex-col gap-2 p-4">
        {['Louange', 'Accueil', 'Production', 'Technique'].map(e => (
          <div key={e} className="flex items-center justify-between rounded-xl bg-white/10 px-3.5 py-2.5">
            <p className="font-sans text-sm text-white">{e}</p>
            <CloseButton size="sm" tone="onDark" aria-label={`Retirer le filtre ${e}`} />
          </div>
        ))}
      </div>
    </div>
  )
}
