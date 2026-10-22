import { FieldLabel, TextField, Select, HelperText } from '@eglise/ui'

/** Les deux variantes, chacune au-dessus du champ qu'elle nomme. `caps` est la
 *  variante dominante de l'application ; `sentence` allège les formulaires
 *  longs, où les majuscules deviennent fatigantes à lire. */
export function Variantes() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="lv-caps" variant="caps">Date de naissance</FieldLabel>
        <TextField id="lv-caps" type="date" defaultValue="1988-04-17" />
      </div>
      <div>
        <FieldLabel htmlFor="lv-sentence" variant="sentence">Date de naissance</FieldLabel>
        <TextField id="lv-sentence" type="date" defaultValue="1988-04-17" />
      </div>
    </div>
  )
}

/** Un libellé peut porter une mention secondaire, plus pâle : ici le caractère
 *  facultatif du motif, et la destination du numéro. */
export function MentionSecondaire() {
  return (
    <div className="max-w-sm grid gap-4">
      <div>
        <FieldLabel htmlFor="lm-motif">
          Raison <span className="text-dark/25">(optionnel)</span>
        </FieldLabel>
        <TextField id="lm-motif" surface="plain" placeholder="Vacances, voyage, maladie…" />
      </div>
      <div>
        <FieldLabel htmlFor="lm-tel" variant="sentence">
          Téléphone <span className="text-dark/40">— pour les urgences du dimanche</span>
        </FieldLabel>
        <TextField id="lm-tel" type="tel" defaultValue="06 12 34 56 78" />
      </div>
    </div>
  )
}

/** Le rythme réel d'un formulaire : des libellés `caps` alignés au-dessus de
 *  champs de natures différentes, sur une même carte. */
export function DansUnFormulaire() {
  return (
    <div className="max-w-md bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <FieldLabel htmlFor="lf-prenom">Prénom</FieldLabel>
            <TextField id="lf-prenom" defaultValue="Jean" />
          </div>
          <div className="min-w-0">
            <FieldLabel htmlFor="lf-nom">Nom</FieldLabel>
            <TextField id="lf-nom" defaultValue="Dubois" />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="lf-ville">Ville</FieldLabel>
          <TextField id="lf-ville" defaultValue="Combs-la-Ville" />
        </div>
        <div>
          <FieldLabel htmlFor="lf-freq">Rythme de service souhaité</FieldLabel>
          <div className="grid gap-1.5">
            <Select id="lf-freq" defaultValue="1× par mois">
              <option>Chaque semaine</option>
              <option>2× par mois</option>
              <option>1× par mois</option>
              <option>Toutes les 6 semaines</option>
              <option>Selon les besoins</option>
            </Select>
            <HelperText>Utilisé pour respecter ton rythme lors de la planification.</HelperText>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Sur une plage de dates, deux libellés très courts cadencent la ligne — la
 *  forme employée par l'écran des indisponibilités. */
export function SurUnePlageDeDates() {
  return (
    <div className="max-w-sm flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <FieldLabel htmlFor="ld-du">Du</FieldLabel>
        <TextField id="ld-du" type="date" defaultValue="2026-07-12" />
      </div>
      <span className="font-sans text-sm text-dark/25 shrink-0 mt-3">→</span>
      <div className="flex-1 min-w-0">
        <FieldLabel htmlFor="ld-au">Au</FieldLabel>
        <TextField id="ld-au" type="date" defaultValue="2026-07-26" />
      </div>
    </div>
  )
}
