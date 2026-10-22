import type { SupabaseClient } from '@supabase/supabase-js'

/** Source de vérité unique de la règle « une indisponibilité déclarée interdit la planification ».
 *
 *  Tout est calculé côté serveur avec le client service (`createAdminClient`) :
 *  - la RLS de `blockout_dates` masque les indispos d'un bénévole sans `church_id` (inscription par
 *    lien d'invitation) à l'admin qui planifie — avec le client « cookie » elles étaient invisibles ;
 *  - l'API REST plafonne chaque réponse à 1000 lignes (`max_rows`) : une table qui grossit (une
 *    indispo par jour d'absence, pour tous les bénévoles, depuis toujours) finit par tronquer
 *    silencieusement la lecture, donc par « oublier » des indispos récentes.
 *
 *  Principe de sécurité : en cas d'erreur de lecture on REFUSE de planifier (fail-closed). */

type Admin = SupabaseClient

export type Blockout = { user_id: string; start_date: string; end_date: string }
export type AvailabilityEntry = { userId: string; day: string }

const PARIS_DAY_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
})

/** Jour calendaire "YYYY-MM-DD" d'un instant, en heure de Paris.
 *
 *  `service_date` est un `timestamptz` : un culte à 00h30 heure de Paris est stocké à 23h30 UTC la
 *  veille. Lire son jour avec `iso.split('T')[0]` (= jour UTC) rattacherait ce service au mauvais
 *  jour entre minuit et 1h/2h du matin (hiver/été), et l'indispo déclarée ce jour-là passerait
 *  inaperçue. Les indispos (`start_date`/`end_date`) sont des dates « murales » françaises. */
export function parisDay(instant: string | Date): string {
  const parts = Object.fromEntries(
    PARIS_DAY_PARTS.formatToParts(typeof instant === 'string' ? new Date(instant) : instant).map(p => [p.type, p.value]),
  ) as Record<string, string>
  return `${parts.year}-${parts.month}-${parts.day}`
}

const PAGE_SIZE = 1000

/** Indispos qui chevauchent [from, to] (dates "YYYY-MM-DD" incluses), éventuellement limitées à
 *  `userIds`. Pagine jusqu'à épuisement pour ne jamais subir le plafond de lignes de l'API. */
export async function fetchBlockouts(
  admin: Admin,
  { from, to, userIds }: { from: string; to: string; userIds?: string[] },
): Promise<{ data: Blockout[]; error: null } | { data: null; error: string }> {
  if (userIds && userIds.length === 0) return { data: [], error: null }

  const rows: Blockout[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = admin
      .from('blockout_dates')
      .select('user_id, start_date, end_date')
      .lte('start_date', to)
      .gte('end_date', from)
    if (userIds) query = query.in('user_id', userIds)
    const { data, error } = await query.order('id').range(offset, offset + PAGE_SIZE - 1)
    if (error) return { data: null, error: error.message }
    const page = (data ?? []) as Blockout[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return { data: rows, error: null }
}

export function isBlocked(blockouts: Blockout[], userId: string, day: string): boolean {
  return blockouts.some(b => b.user_id === userId && b.start_date <= day && b.end_date >= day)
}

export type BlockedCheck =
  | { ok: true; blocked: AvailabilityEntry[] }
  | { ok: false; error: string }

/** Parmi `entries` (bénévole × jour), lesquelles tombent dans une indisponibilité déclarée. */
export async function findBlockedEntries(admin: Admin, entries: AvailabilityEntry[]): Promise<BlockedCheck> {
  if (entries.length === 0) return { ok: true, blocked: [] }
  const days = entries.map(e => e.day).sort()
  const res = await fetchBlockouts(admin, {
    from: days[0],
    to: days[days.length - 1],
    userIds: [...new Set(entries.map(e => e.userId))],
  })
  if (res.error !== null) {
    return { ok: false, error: `Vérification des indisponibilités impossible (${res.error}) : affectation refusée par précaution.` }
  }
  return { ok: true, blocked: entries.filter(e => isBlocked(res.data, e.userId, e.day)) }
}

const fmtDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

/** Message lisible pour l'admin : qui est indisponible, quel jour. */
export async function describeBlocked(admin: Admin, blocked: AvailabilityEntry[]): Promise<string> {
  const ids = [...new Set(blocked.map(b => b.userId))]
  const { data } = await admin.from('profiles').select('id, first_name, last_name').in('id', ids)
  const nameOf = new Map((data ?? []).map(p => [p.id as string, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()]))
  const label = (b: AvailabilityEntry) => nameOf.get(b.userId) || 'Un·e bénévole'
  if (blocked.length === 1) {
    return `${label(blocked[0])} a déclaré une indisponibilité le ${fmtDay(blocked[0].day)} : affectation refusée.`
  }
  return `Indisponibilité déclarée — ${blocked.map(b => `${label(b)} (${fmtDay(b.day)})`).join(', ')} : affectation refusée.`
}

/** Garde-fou des Server Actions : `null` si tout le monde est disponible sur le jour du service
 *  `planId`, sinon le message de refus à renvoyer à l'admin. Le jour est relu en base (jamais fourni
 *  par le client) et calculé en heure de Paris. */
export async function refusalIfUnavailable(admin: Admin, planId: string, userIds: string[]): Promise<string | null> {
  if (userIds.length === 0) return null
  const { data: plan, error } = await admin.from('plans').select('service_date').eq('id', planId).single()
  if (error || !plan) return 'Service introuvable : affectation refusée.'
  const day = parisDay(plan.service_date as string)
  const check = await findBlockedEntries(admin, userIds.map(userId => ({ userId, day })))
  if (!check.ok) return check.error
  return check.blocked.length === 0 ? null : describeBlocked(admin, check.blocked)
}
