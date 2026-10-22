/** Postes qui acceptent plusieurs bénévoles sur un même service.
 *
 *  Miroir exact de la migration 012 (`UPDATE positions SET allow_multiple = true WHERE name IN
 *  ('Chorale', 'Choriste')`). Sert de repli quand la colonne `allow_multiple` n'existe pas en
 *  base (migration non appliquée) : sans lui, le desktop n'offrirait plus aucun créneau pour
 *  ajouter un deuxième choriste, alors que le formulaire mobile le permet. */
export const MULTI_POSITION_NAMES: readonly string[] = ['Chorale', 'Choriste']

export function isMultiPositionName(name: string): boolean {
  return MULTI_POSITION_NAMES.includes(name)
}

/** Garantit un `allow_multiple` booléen sur chaque poste : la valeur de la base quand la colonne
 *  existe (`true`/`false`), sinon la règle par nom ci-dessus. */
export function withAllowMultiple<T extends { name: string; allow_multiple?: boolean | null }>(
  positions: T[],
): (T & { allow_multiple: boolean })[] {
  return positions.map(p => ({
    ...p,
    allow_multiple: typeof p.allow_multiple === 'boolean' ? p.allow_multiple : isMultiPositionName(p.name),
  }))
}
