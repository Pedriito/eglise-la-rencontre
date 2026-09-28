import { HelperText, FieldLabel, TextField, Select, Textarea } from '@eglise/ui'

/** L'usage canonique : une phrase discrète posée sous le champ, qui dit à quoi
 *  la valeur saisie va servir. */
export function SousUnChamp() {
  return (
    <div className="max-w-sm">
      <FieldLabel htmlFor="hs-freq">Rythme de service souhaité</FieldLabel>
      <div className="grid gap-1.5">
        <Select id="hs-freq" defaultValue="2× par mois">
          <option>Chaque semaine</option>
          <option>2× par mois</option>
          <option>1× par mois</option>
          <option>Toutes les 6 semaines</option>
          <option>Selon les besoins</option>
        </Select>
        <HelperText>Utilisé pour respecter ton rythme lors de la planification.</HelperText>
      </div>
    </div>
  )
}

/** Dans un formulaire, le texte d'aide n'accompagne que les champs dont la
 *  destination n'est pas évidente — jamais tous. */
export function DansUnFormulaire() {
  return (
    <div className="max-w-md bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
      <div className="grid gap-4">
        <div>
          <FieldLabel htmlFor="hf-tel">Téléphone</FieldLabel>
          <div className="grid gap-1.5">
            <TextField id="hf-tel" type="tel" defaultValue="06 12 34 56 78" />
            <HelperText>Communiqué au responsable d'équipe le jour du service.</HelperText>
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="hf-ville">Ville</FieldLabel>
          <TextField id="hf-ville" defaultValue="Lieusaint" />
        </div>
        <div>
          <FieldLabel htmlFor="hf-naissance">Date de naissance</FieldLabel>
          <div className="grid gap-1.5">
            <TextField id="hf-naissance" type="date" defaultValue="1988-04-17" />
            <HelperText>Sert uniquement à souhaiter les anniversaires en équipe.</HelperText>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Sous une zone de texte, l'aide précise qui lira la note — la mention la
 *  plus utile sur une fiche pastorale. */
export function SousUneZoneDeTexte() {
  return (
    <div className="max-w-sm">
      <FieldLabel htmlFor="hz-note">Note pastorale</FieldLabel>
      <div className="grid gap-1.5">
        <Textarea
          id="hz-note"
          rows={3}
          defaultValue={"Sarah préfère le chœur au chant principal pour l'instant, le temps de reprendre confiance."}
        />
        <HelperText>Visible par les responsables d'équipe seulement.</HelperText>
      </div>
    </div>
  )
}

/** Sur fond teinté, le gris très clair du texte d'aide tient encore, à
 *  condition de rester sur une seule ligne. */
export function SurFondTeinte() {
  return (
    <div className="max-w-sm bg-teal-50 rounded-2xl p-6">
      <FieldLabel htmlFor="ht-motif">Raison</FieldLabel>
      <div className="grid gap-1.5">
        <TextField id="ht-motif" surface="plain" placeholder="Vacances, voyage, maladie…" />
        <HelperText>Facultatif — utile au responsable pour anticiper le remplacement.</HelperText>
      </div>
    </div>
  )
}
