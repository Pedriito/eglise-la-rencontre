import { Select, FieldLabel, HelperText, ErrorText } from '@eglise/ui'

const RYTHMES = [
  'Chaque semaine',
  '2× par mois',
  '1× par mois',
  'Toutes les 6 semaines',
  'Selon les besoins',
]

/** L'emploi canonique : le rythme de service souhaité, dans le formulaire de
 *  profil du bénévole, avec le texte d'aide qui en explique l'usage. */
export function RythmeDeService() {
  return (
    <div className="max-w-md bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
      <h2 className="font-display text-lg text-dark mb-4">Disponibilité</h2>
      <FieldLabel htmlFor="r-freq">Rythme de service souhaité</FieldLabel>
      <div className="grid gap-1.5">
        <Select id="r-freq" defaultValue="2× par mois">
          <option value="">Non précisé</option>
          {RYTHMES.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
        <HelperText>Utilisé pour respecter ton rythme lors de la planification.</HelperText>
      </div>
    </div>
  )
}

/** Les trois fonds, sur la même liste de rythmes. */
export function Surfaces() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="ss-sand">sand</FieldLabel>
        <Select id="ss-sand" surface="sand" defaultValue="Chaque semaine">
          {RYTHMES.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="ss-teal">tealSoft — par défaut</FieldLabel>
        <Select id="ss-teal" surface="tealSoft" defaultValue="2× par mois">
          {RYTHMES.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="ss-plain">plain</FieldLabel>
        <Select id="ss-plain" surface="plain" defaultValue="Toutes les 6 semaines">
          {RYTHMES.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>
    </div>
  )
}

/** Les deux tailles sur la même liste d'équipes. */
export function Tailles() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="st-md">Équipe — md</FieldLabel>
        <Select id="st-md" size="md" defaultValue="Louange">
          <option>Louange</option>
          <option>Accueil</option>
          <option>Technique</option>
          <option>Enfance</option>
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="st-sm">Équipe — sm</FieldLabel>
        <Select id="st-sm" size="sm" defaultValue="Accueil">
          <option>Louange</option>
          <option>Accueil</option>
          <option>Technique</option>
          <option>Enfance</option>
        </Select>
      </div>
    </div>
  )
}

/** L'état invalide sur deux fonds : la liste est restée sur « Non précisé »
 *  alors que le profil demande un rythme. La bordure rouge ne ressort que
 *  sur `sand`. */
export function Invalide() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="si-sand">Rythme souhaité — sand</FieldLabel>
        <Select id="si-sand" surface="sand" invalid defaultValue="">
          <option value="">Non précisé</option>
          {RYTHMES.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>
      <div>
        <FieldLabel htmlFor="si-teal">Rythme souhaité — tealSoft</FieldLabel>
        <div className="grid gap-1.5">
          <Select id="si-teal" invalid defaultValue="">
            <option value="">Non précisé</option>
            {RYTHMES.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
          <ErrorText>Choisis un rythme pour compléter ton profil.</ErrorText>
        </div>
      </div>
    </div>
  )
}
