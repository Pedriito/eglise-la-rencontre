// Accès direct (service role) à la réplique Supabase LOCALE de test — jamais la prod.
import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'http://127.0.0.1:55421'
// Clés de démonstration publiques fournies par `supabase start` (stack locale uniquement).
export const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
export const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

if (!SUPABASE_URL.startsWith('http://127.0.0.1:')) throw new Error('Refus : la base de test doit être locale')

export const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })

export const CHURCH_ID = '00000000-0000-0000-0000-000000000010'
export const INVITE_EXT_ID = '00000000-0000-0000-0000-000000000001'
export const PASSWORD = 'Test-Indispo-2026!'

export const USERS = {
  admin:  { email: 'admin@indispo.test',  first: 'Ada',    last: 'Admin',      permission: 'admin',  church: true },
  editor: { email: 'editor@indispo.test', first: 'Eddy',   last: 'Editeur',    permission: 'editor', church: true },
  paul:   { email: 'paul@indispo.test',   first: 'Paul',   last: 'Piano',      permission: 'viewer', church: true },
  bea:    { email: 'bea@indispo.test',    first: 'Béa',    last: 'Basse',      permission: 'viewer', church: true },
  bob:    { email: 'bob@indispo.test',    first: 'Bob',    last: 'Batterie',   permission: 'viewer', church: true },
  chloe:  { email: 'chloe@indispo.test',  first: 'Chloé',  last: 'Chorale',    permission: 'viewer', church: true },
  gael:   { email: 'gael@indispo.test',   first: 'Gaël',   last: 'Guitare',    permission: 'viewer', church: true },
  alice:  { email: 'alice@indispo.test',  first: 'Alice',  last: 'Accueil',    permission: 'viewer', church: true },
  // Inscrite via lien d'invitation : le code (register-action / inviteBenevole) ne renseigne
  // jamais church_id → NULL, exactement comme le trigger versionné dans le dépôt.
  nina:   { email: 'nina@indispo.test',   first: 'Nina',   last: 'Nouvelle',   permission: 'viewer', church: false },
}

export function must({ data, error }, label = 'requête') {
  if (error) throw new Error(`${label}: ${error.message}`)
  return data
}

/** "YYYY-MM-DDTHH:mm" heure de Paris → ISO UTC (même algorithme que lib/timezone.ts). */
export function parisToUtc(naive) {
  const [d, t = '00:00'] = naive.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [h, mi] = t.split(':').map(Number)
  const guess = new Date(Date.UTC(y, mo - 1, da, h, mi))
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const p = Object.fromEntries(f.formatToParts(guess).map(x => [x.type, x.value]))
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return new Date(guess.getTime() - (asUtc - guess.getTime())).toISOString()
}

/** Charge l'état de référence (ids) déjà semé. */
export async function loadRefs() {
  const profiles = must(await db.from('profiles').select('id, email'), 'profiles')
  const byEmail = Object.fromEntries(profiles.map(p => [p.email, p.id]))
  const ids = Object.fromEntries(Object.entries(USERS).map(([k, u]) => [k, byEmail[u.email]]))
  const teams = must(await db.from('teams').select('id, name, positions(id, name)'), 'teams')
  const louange = teams.find(t => t.name === 'Louange')
  const accueil = teams.find(t => t.name === 'Accueil')
  const pos = Object.fromEntries(louange.positions.map(p => [p.name, p.id]))
  return { ids, louange: louange.id, accueil: accueil.id, pos }
}

export async function createPlan({ title, paris, teamIds = null, planType = 'sunday_service' }) {
  return must(await db.from('plans').insert({
    title, service_date: parisToUtc(paris), plan_type: planType, team_ids: teamIds,
    team_id: teamIds?.[0] ?? null, church_id: CHURCH_ID,
  }).select('id, service_date').single(), 'plan')
}

export async function addBlockout(userId, start, end = start, reason = 'Test') {
  return must(await db.from('blockout_dates').insert({ user_id: userId, start_date: start, end_date: end, reason }).select('id').single(), 'blockout')
}

export async function assignmentsOf(planId) {
  return must(await db.from('plan_assignments').select('id, user_id, position_id, team_id, status').eq('plan_id', planId), 'assignments')
}

/** Remet à zéro les données volatiles (plans, affectations, indispos) — garde personnes/équipes. */
export async function resetVolatile() {
  must(await db.from('plan_assignments').delete().not('id', 'is', null), 'del assignments')
  must(await db.from('blockout_dates').delete().not('id', 'is', null), 'del blockouts')
  must(await db.from('plans').delete().not('id', 'is', null), 'del plans')
}
