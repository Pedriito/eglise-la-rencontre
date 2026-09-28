import { ErrorText, FieldLabel, TextField, Select, Button, HelperText } from '@eglise/ui'

/** L'usage canonique : le message suit immédiatement le champ fautif, qui
 *  porte lui-même l'état `invalid`. */
export function SousUnChampInvalide() {
  return (
    <div className="max-w-sm">
      <FieldLabel htmlFor="ec-email">Email</FieldLabel>
      <div className="grid gap-1.5">
        <TextField id="ec-email" surface="sand" invalid defaultValue="marie.lefevre@" />
        <ErrorText>Cet email est déjà utilisé par un autre compte.</ErrorText>
      </div>
    </div>
  )
}

/** Plusieurs champs fautifs dans le même formulaire : chaque message reste
 *  attaché à son champ, et les champs valides ne changent pas d'apparence. */
export function PlusieursErreurs() {
  return (
    <div className="max-w-md bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <FieldLabel htmlFor="ep-prenom">Prénom</FieldLabel>
            <TextField id="ep-prenom" defaultValue="Jean" />
          </div>
          <div className="min-w-0">
            <FieldLabel htmlFor="ep-nom">Nom</FieldLabel>
            <div className="grid gap-1.5">
              <TextField id="ep-nom" invalid defaultValue="" />
              <ErrorText>Nom obligatoire.</ErrorText>
            </div>
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="ep-tel">Téléphone</FieldLabel>
          <div className="grid gap-1.5">
            <TextField id="ep-tel" invalid defaultValue="06 12 34" />
            <ErrorText>Numéro incomplet — dix chiffres attendus.</ErrorText>
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="ep-freq">Rythme de service souhaité</FieldLabel>
          <div className="grid gap-1.5">
            <Select id="ep-freq" invalid defaultValue="">
              <option value="">Non précisé</option>
              <option>Chaque semaine</option>
              <option>2× par mois</option>
              <option>1× par mois</option>
              <option>Toutes les 6 semaines</option>
              <option>Selon les besoins</option>
            </Select>
            <ErrorText>Choisis un rythme pour compléter ton profil.</ErrorText>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Une erreur qui ne vise aucun champ en particulier se place juste au-dessus
 *  du bouton d'envoi — ici l'incohérence des deux dates d'indisponibilité. */
export function ErreurDeFormulaire() {
  return (
    <div className="max-w-sm bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <FieldLabel htmlFor="ef-du">Du</FieldLabel>
            <TextField id="ef-du" type="date" defaultValue="2026-07-26" />
          </div>
          <span className="font-sans text-sm text-dark/25 shrink-0 mt-3">→</span>
          <div className="flex-1 min-w-0">
            <FieldLabel htmlFor="ef-au">Au</FieldLabel>
            <TextField id="ef-au" type="date" defaultValue="2026-07-12" />
          </div>
        </div>
        <ErrorText>La date de fin doit être après la date de début.</ErrorText>
        <Button className="w-full">Enregistrer</Button>
      </div>
    </div>
  )
}

/** Le message d'erreur remplace le texte d'aide, il ne s'y ajoute pas : à
 *  gauche l'état calme, à droite le même champ en erreur. */
export function RemplaceLAide() {
  return (
    <div className="max-w-md grid grid-cols-2 gap-4">
      <div>
        <FieldLabel htmlFor="er-ok">Nouveau mot de passe</FieldLabel>
        <div className="grid gap-1.5">
          <TextField id="er-ok" surface="sand" type="password" defaultValue="Bethanie2026" />
          <HelperText>8 caractères minimum.</HelperText>
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="er-ko">Nouveau mot de passe</FieldLabel>
        <div className="grid gap-1.5">
          <TextField id="er-ko" surface="sand" type="password" invalid defaultValue="beth" />
          <ErrorText>Le mot de passe doit faire au moins 8 caractères.</ErrorText>
        </div>
      </div>
    </div>
  )
}
