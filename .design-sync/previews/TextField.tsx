import { TextField, FieldLabel, HelperText, ErrorText } from '@eglise/ui'

/** Les trois fonds. `tealSoft` est la valeur par défaut et domine les
 *  formulaires du profil ; `sand` sert sur les écrans clairs ; `plain` quand le
 *  champ est déjà posé sur un fond teinté. */
export function Surfaces() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="s-sand">Prénom</FieldLabel>
        <div className="grid gap-1.5">
          <TextField id="s-sand" surface="sand" defaultValue="Marie" />
          <HelperText>surface « sand »</HelperText>
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="s-teal">Nom</FieldLabel>
        <div className="grid gap-1.5">
          <TextField id="s-teal" surface="tealSoft" defaultValue="Lefèvre" />
          <HelperText>surface « tealSoft » — par défaut</HelperText>
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="s-plain">Ville</FieldLabel>
        <div className="grid gap-1.5">
          <TextField id="s-plain" surface="plain" defaultValue="Lieusaint" />
          <HelperText>surface « plain »</HelperText>
        </div>
      </div>
    </div>
  )
}

/** Les deux tailles sur le même contenu. `md` est la taille des formulaires
 *  pleine page, `sm` celle des panneaux latéraux et des filtres. */
export function Tailles() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="t-md">Téléphone — md</FieldLabel>
        <TextField id="t-md" size="md" type="tel" defaultValue="06 12 34 56 78" />
      </div>
      <div>
        <FieldLabel htmlFor="t-sm">Téléphone — sm</FieldLabel>
        <TextField id="t-sm" size="sm" type="tel" defaultValue="06 12 34 56 78" />
      </div>
    </div>
  )
}

/** L'état invalide sur les trois fonds, avec le message qui l'explique.
 *  À lire attentivement : la bordure rouge ne ressort que sur `sand`. */
export function Invalide() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="i-sand">Email — sand</FieldLabel>
        <div className="grid gap-1.5">
          <TextField id="i-sand" surface="sand" invalid defaultValue="marie.lefevre@" />
          <ErrorText>Cet email est déjà utilisé par un autre compte.</ErrorText>
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="i-teal">Email — tealSoft</FieldLabel>
        <div className="grid gap-1.5">
          <TextField id="i-teal" invalid defaultValue="marie.lefevre@" />
          <ErrorText>Cet email est déjà utilisé par un autre compte.</ErrorText>
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="i-plain">Email — plain</FieldLabel>
        <div className="grid gap-1.5">
          <TextField id="i-plain" surface="plain" invalid defaultValue="marie.lefevre@" />
          <ErrorText>Cet email est déjà utilisé par un autre compte.</ErrorText>
        </div>
      </div>
    </div>
  )
}

/** Les trois états d'une même ligne : vide avec son indication, renseignée,
 *  puis figée quand la valeur ne se modifie pas à la main. */
export function EtatsDeSaisie() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="e-vide">Ville</FieldLabel>
        <TextField id="e-vide" placeholder="Lieusaint" />
      </div>
      <div>
        <FieldLabel htmlFor="e-ok">Ville</FieldLabel>
        <TextField id="e-ok" defaultValue="Combs-la-Ville" />
      </div>
      <div>
        <FieldLabel htmlFor="e-off">Identifiant bénévole</FieldLabel>
        <div className="grid gap-1.5">
          <TextField id="e-off" disabled defaultValue="BEN-2041" />
          <HelperText>Attribué automatiquement, non modifiable.</HelperText>
        </div>
      </div>
    </div>
  )
}

/** La mise en situation canonique : le bloc « Modifier mon profil », avec la
 *  paire prénom / nom sur deux colonnes puis les champs de contact. */
export function FormulaireDeProfil() {
  return (
    <div className="max-w-md bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
      <h2 className="font-display text-lg text-dark mb-1.5">Modifier mon profil</h2>
      <p className="font-sans text-xs text-dark/40 mb-4">Mets à jour tes informations personnelles.</p>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <FieldLabel htmlFor="p-prenom">Prénom</FieldLabel>
            <TextField id="p-prenom" defaultValue="Marie" />
          </div>
          <div className="min-w-0">
            <FieldLabel htmlFor="p-nom">Nom</FieldLabel>
            <TextField id="p-nom" defaultValue="Lefèvre" />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="p-tel">Téléphone</FieldLabel>
          <TextField id="p-tel" type="tel" placeholder="06 12 34 56 78" />
        </div>
        <div>
          <FieldLabel htmlFor="p-naissance">Date de naissance</FieldLabel>
          <TextField id="p-naissance" type="date" defaultValue="1988-04-17" />
        </div>
        <div>
          <FieldLabel htmlFor="p-ville">Ville</FieldLabel>
          <TextField id="p-ville" defaultValue="Lieusaint" />
        </div>
      </div>
    </div>
  )
}
