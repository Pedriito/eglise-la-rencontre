import { Textarea, FieldLabel, HelperText, ErrorText } from '@eglise/ui'

/** L'emploi canonique : la note pastorale laissée sur la fiche d'un bénévole,
 *  dans une carte blanche, avec son libellé et son texte d'aide. */
export function NotePastorale() {
  return (
    <div className="max-w-md bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
      <h2 className="font-display text-lg text-dark mb-4">Note pastorale</h2>
      <FieldLabel htmlFor="n-note">Observations</FieldLabel>
      <div className="grid gap-1.5">
        <Textarea
          id="n-note"
          rows={4}
          defaultValue={"Marie reprend le service après son congé maternité. Elle souhaite être planifiée le dimanche matin uniquement, et pas deux semaines de suite."}
        />
        <HelperText>Visible par les responsables d'équipe seulement.</HelperText>
      </div>
    </div>
  )
}

/** Les trois fonds, sur un motif d'indisponibilité de même longueur. */
export function Surfaces() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="ts-sand">sand</FieldLabel>
        <Textarea id="ts-sand" surface="sand" rows={2} defaultValue="Absente du 12 au 26 juillet, vacances en famille." />
      </div>
      <div>
        <FieldLabel htmlFor="ts-teal">tealSoft — par défaut</FieldLabel>
        <Textarea id="ts-teal" surface="tealSoft" rows={2} defaultValue="Absente du 12 au 26 juillet, vacances en famille." />
      </div>
      <div>
        <FieldLabel htmlFor="ts-plain">plain</FieldLabel>
        <Textarea id="ts-plain" surface="plain" rows={2} defaultValue="Absente du 12 au 26 juillet, vacances en famille." />
      </div>
    </div>
  )
}

/** Les deux tailles, et le champ vide qui montre son indication. */
export function Tailles() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="tt-md">Motif d'indisponibilité — md</FieldLabel>
        <Textarea id="tt-md" size="md" rows={3} defaultValue="Déplacement professionnel à Lyon, retour le dimanche en fin de journée." />
      </div>
      <div>
        <FieldLabel htmlFor="tt-sm">Motif d'indisponibilité — sm</FieldLabel>
        <Textarea id="tt-sm" size="sm" rows={3} placeholder="Vacances, voyage, maladie…" />
      </div>
    </div>
  )
}

/** L'état invalide sur les trois fonds : le motif attendu n'a pas été saisi
 *  avant l'envoi. La bordure rouge ne ressort que sur `sand`. */
export function Invalide() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="ti-sand">Motif de l'annulation — sand</FieldLabel>
        <Textarea id="ti-sand" surface="sand" invalid rows={2} placeholder="En quelques mots…" />
      </div>
      <div>
        <FieldLabel htmlFor="ti-teal">Motif de l'annulation — tealSoft</FieldLabel>
        <div className="grid gap-1.5">
          <Textarea id="ti-teal" invalid rows={2} placeholder="En quelques mots…" />
          <ErrorText>Un motif est nécessaire pour prévenir le responsable d'équipe.</ErrorText>
        </div>
      </div>
    </div>
  )
}
