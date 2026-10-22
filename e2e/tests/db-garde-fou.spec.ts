import { test as base, expect } from '@playwright/test'
import { db, loadRefs, resetVolatile, createPlan, addBlockout, assignmentsOf, must, INVITE_EXT_ID } from '../lib/db.mjs'

/** Garde-fou de la base (migration 022) : indépendant de toute l'application — on écrit directement
 *  avec le client service, comme le ferait un script, une requête forgée ou un futur oubli de code. */
const test = base.extend<{ refs: Awaited<ReturnType<typeof loadRefs>> }>({
  refs: async ({}, use) => { await resetVolatile(); await use(await loadRefs()) },
})
test.describe.configure({ mode: 'serial' })
test.beforeEach(({}, ti) => { test.skip(ti.project.name !== 'desktop-chrome', 'test de base de données, indépendant de l’appareil') })

const insert = (planId: string, userId: string, positionId: string | null, teamId: string, status = 'pending') =>
  db.from('plan_assignments').insert({ plan_id: planId, user_id: userId, position_id: positionId, team_id: teamId, status })

test.describe('7. Garde-fou base de données — affectation', () => {
  test('7.1 insertion refusée pour un indisponible, avec un message explicite', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB 1', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-11-08')

    const { error } = await insert(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange)

    expect(error?.message).toContain('INDISPONIBILITE_DECLAREE')
    expect(error?.message).toContain('08/11/2026')
    expect(await assignmentsOf(plan.id)).toHaveLength(0)
  })

  for (const [label, start, end, blocked] of [
    ['veille', '2026-11-01', '2026-11-07', false],
    ['lendemain', '2026-11-09', '2026-11-15', false],
    ['premier jour', '2026-11-08', '2026-11-15', true],
    ['dernier jour', '2026-11-01', '2026-11-08', true],
    ['englobante', '2026-01-01', '2026-12-31', true],
  ] as const) {
    test(`7.2 bornes — indispo ${label} → ${blocked ? 'refusée' : 'acceptée'}`, async ({ refs }) => {
      const plan = await createPlan({ title: 'DB bornes', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
      await addBlockout(refs.ids.paul, start, end)
      const { error } = await insert(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange)
      if (blocked) expect(error?.message).toContain('INDISPONIBILITE_DECLAREE')
      else expect(error).toBeNull()
    })
  }

  test('7.3 minuit heure de Paris : 00h30 refusé (jour de l’indispo), 23h30 la veille accepté', async ({ refs }) => {
    const minuit = await createPlan({ title: 'DB 00h30', paris: '2026-11-22T00:30', teamIds: [refs.louange] })
    const veille = await createPlan({ title: 'DB 23h30', paris: '2026-11-21T23:30', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-11-22')

    expect((await insert(minuit.id, refs.ids.paul, refs.pos.Piano, refs.louange)).error?.message).toContain('INDISPONIBILITE_DECLAREE')
    expect((await insert(veille.id, refs.ids.paul, refs.pos.Piano, refs.louange)).error).toBeNull()
  })

  test('7.4 équipe sans poste nommé (position_id NULL) : refusé aussi', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB accueil', paris: '2026-11-08T10:00', teamIds: [refs.accueil] })
    await addBlockout(refs.ids.paul, '2026-11-08')

    expect((await insert(plan.id, refs.ids.paul, null, refs.accueil)).error?.message).toContain('INDISPONIBILITE_DECLAREE')
  })

  test('7.5 une réponse « décliné » n’est pas une planification : acceptée', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB décliné', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-11-08')

    expect((await insert(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange, 'declined')).error).toBeNull()
  })

  test('7.6 indispo posée APRÈS la planification : confirmer/décliner/rappels restent possibles', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB après coup', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    const a = must(await insert(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange).select('id').single())
    await addBlockout(refs.ids.paul, '2026-11-08')

    expect((await db.from('plan_assignments').update({ status: 'declined' }).eq('id', a.id)).error).toBeNull()
    expect((await db.from('plan_assignments').update({ reminder_sent_days: [3] }).eq('id', a.id)).error).toBeNull()
  })

  test('7.7 l’indispo d’un autre bénévole n’empêche pas l’insertion', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB autre', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.nina, '2026-11-08')

    expect((await insert(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange)).error).toBeNull()
  })

  test('7.8 l’invité externe (pas d’indispo possible) reste planifiable', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB externe', paris: '2026-11-08T10:00', teamIds: [refs.louange] })

    expect((await insert(plan.id, INVITE_EXT_ID, refs.pos.Piano, refs.louange)).error).toBeNull()
  })

  test('7.9 réaffecter une ligne existante à un autre bénévole indisponible (UPDATE user_id) : refusé', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB update', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    const a = must(await insert(plan.id, refs.ids.bea, refs.pos.Piano, refs.louange).select('id').single())
    await addBlockout(refs.ids.paul, '2026-11-08')

    const { error } = await db.from('plan_assignments').update({ user_id: refs.ids.paul }).eq('id', a.id)

    expect(error?.message).toContain('INDISPONIBILITE_DECLAREE')
  })

  test('7.10 une insertion en lot dont UNE seule ligne est interdite est refusée en entier (atomique)', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB lot', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-11-08')

    const { error } = await db.from('plan_assignments').insert([
      { plan_id: plan.id, user_id: refs.ids.bea, position_id: refs.pos.Basse, team_id: refs.louange, status: 'pending' },
      { plan_id: plan.id, user_id: refs.ids.paul, position_id: refs.pos.Piano, team_id: refs.louange, status: 'pending' },
    ])

    expect(error?.message).toContain('INDISPONIBILITE_DECLAREE')
    expect(await assignmentsOf(plan.id)).toHaveLength(0)
  })
})

test.describe('8. Garde-fou base de données — déplacement d’un service', () => {
  const move = (planId: string, paris: string) => {
    const [d, t] = paris.split('T')
    const utc = new Date(`${d}T${t}:00Z`) // heure d'hiver : Paris = UTC+1
    utc.setUTCHours(utc.getUTCHours() - 1)
    return db.from('plans').update({ service_date: utc.toISOString() }).eq('id', planId)
  }

  test('8.1 déplacer un service sur le jour d’indispo d’un affecté : refusé', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB move', paris: '2026-11-01T10:00', teamIds: [refs.louange] })
    must(await insert(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange))
    await addBlockout(refs.ids.paul, '2026-11-08')

    const { error } = await move(plan.id, '2026-11-08T10:00')

    expect(error?.message).toContain('INDISPONIBILITE_DECLAREE')
    expect(error?.message).toContain('Paul Piano')
    expect(error?.message).toContain('déplacement refusé')
  })

  test('8.2 déplacer vers un jour libre : accepté', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB move libre', paris: '2026-11-01T10:00', teamIds: [refs.louange] })
    must(await insert(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange))
    await addBlockout(refs.ids.paul, '2026-11-15')

    expect((await move(plan.id, '2026-11-08T10:00')).error).toBeNull()
  })

  test('8.3 changement d’heure le MÊME jour : jamais bloqué, même avec un conflit déjà présent', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB heure', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    must(await insert(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange))
    await addBlockout(refs.ids.paul, '2026-11-08') // posée après coup

    expect((await move(plan.id, '2026-11-08T11:30')).error).toBeNull()
  })

  test('8.4 un affecté qui a décliné ne bloque pas le déplacement', async ({ refs }) => {
    const plan = await createPlan({ title: 'DB move décliné', paris: '2026-11-01T10:00', teamIds: [refs.louange] })
    must(await insert(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange, 'declined'))
    await addBlockout(refs.ids.paul, '2026-11-08')

    expect((await move(plan.id, '2026-11-08T10:00')).error).toBeNull()
  })
})
