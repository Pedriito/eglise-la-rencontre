// Peuple la réplique locale : église, comptes (mot de passe commun), équipes, postes, qualifications.
import { db, must, USERS, PASSWORD, CHURCH_ID, INVITE_EXT_ID } from './lib/db.mjs'

must(await db.from('churches').upsert({ id: CHURCH_ID, name: 'Église La Rencontre', slug: 'la-rencontre' }), 'church')

async function ensureUser(id, email, meta) {
  const { data: list } = await db.auth.admin.listUsers({ perPage: 200 })
  const existing = list?.users?.find(u => u.email === email)
  if (existing) return existing.id
  const { data, error } = await db.auth.admin.createUser({
    ...(id ? { id } : {}), email, password: PASSWORD, email_confirm: true, user_metadata: meta,
  })
  if (error) throw new Error(`createUser ${email}: ${error.message}`)
  return data.user.id
}

// Placeholder des invités externes (user_id = INVITE_EXT_ID, comme en prod)
await ensureUser(INVITE_EXT_ID, 'invite-ext@indispo.test', { first_name: 'Invité', last_name: '(Ext)' })
must(await db.from('profiles').update({ first_name: 'Invité', last_name: '(Ext)', status: 'active', email: 'invite-ext@indispo.test', church_id: CHURCH_ID }).eq('id', INVITE_EXT_ID), 'ext profile')

const ids = {}
for (const [key, u] of Object.entries(USERS)) {
  const id = await ensureUser(null, u.email, { first_name: u.first, last_name: u.last })
  ids[key] = id
  must(await db.from('profiles').update({
    first_name: u.first, last_name: u.last, email: u.email, permission: u.permission,
    status: 'active', profile_complete: true, church_id: u.church ? CHURCH_ID : null,
  }).eq('id', id), `profile ${key}`)
}

// Équipes (attributs comme en prod après la migration 009)
const { data: teamsExisting } = await db.from('teams').select('id, name')
let louange = teamsExisting?.find(t => t.name === 'Louange')?.id
let accueil = teamsExisting?.find(t => t.name === 'Accueil')?.id
if (!louange) louange = must(await db.from('teams').insert({ name: 'Louange', church_id: CHURCH_ID, allows_guests: true, is_prayer_meeting: true }).select('id').single()).id
if (!accueil) accueil = must(await db.from('teams').insert({ name: 'Accueil', church_id: CHURCH_ID }).select('id').single()).id

const POSITIONS = [
  { name: 'Piano' }, { name: 'Basse' }, { name: 'Batterie' }, { name: 'DM' },
  { name: 'Chorale', allow_multiple: true }, { name: 'Choriste', allow_multiple: true }, { name: 'Guitare Acoustique' },
]
for (const p of POSITIONS) {
  must(await db.from('positions').upsert({ team_id: louange, name: p.name, allow_multiple: !!p.allow_multiple }, { onConflict: 'team_id,name' }), `pos ${p.name}`)
}
const pos = Object.fromEntries(must(await db.from('positions').select('id, name').eq('team_id', louange)).map(p => [p.name, p.id]))

const membership = [
  ['paul', louange], ['nina', louange], ['bea', louange], ['bob', louange], ['chloe', louange], ['gael', louange],
  ['alice', accueil], ['paul', accueil], ['nina', accueil],
  ['editor', louange, 'leader'],
]
for (const [k, team, role = 'member'] of membership) {
  must(await db.from('team_members').upsert({ user_id: ids[k], team_id: team, role }, { onConflict: 'user_id,team_id' }), `tm ${k}`)
}
const qualif = [
  ['paul', 'Piano'], ['nina', 'Piano'], ['bea', 'Basse'], ['bob', 'Batterie'],
  ['chloe', 'Chorale'], ['paul', 'Chorale'], ['gael', 'Guitare Acoustique'],
  // Poste multi-bénévoles « Choriste » : 4 qualifiés pour tester l'enchaînement (spec choristes-autofill).
  ['chloe', 'Choriste'], ['paul', 'Choriste'], ['bea', 'Choriste'], ['bob', 'Choriste'],
]
for (const [k, p] of qualif) {
  must(await db.from('member_positions').upsert({ user_id: ids[k], position_id: pos[p] }, { onConflict: 'user_id,position_id' }), `mp ${k}`)
}

const { data: ps } = await db.from('projection_settings').select('id')
if (!ps?.length) must(await db.from('projection_settings').insert({ calendar_token: 'local-test-token' }), 'projection')

console.log(JSON.stringify({ ids, louange, accueil, pos }, null, 2))
