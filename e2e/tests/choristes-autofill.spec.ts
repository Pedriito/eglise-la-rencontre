import type { Page } from '@playwright/test'
import {
  test, expect, isDesktop, gotoPlan, desktopOpenSlot, pickerSectionOf, desktopTryAssign, mobileOpenSlot,
  mobileTryAssign, optionFor, expandTeam, expectNeverAssigned, waitForServerAction,
} from './helpers'
import { db, createPlan, addBlockout, assignmentsOf, must, CHURCH_ID } from '../lib/db.mjs'

const CHLOE = 'Chloé Chorale'
const PAUL = 'Paul Piano'
const BEA = 'Béa Basse'
const BOB = 'Bob Batterie'

/** Équipe de test (hors Louange/Accueil, que les autres specs utilisent) : l'auto-remplissage lit la base
 *  en direct, contrairement au catalogue d'équipes de la page d'un service, mis en cache 5 min. */
async function createSideTeam(name: string, positionName: string, qualifiedUserId: string) {
  await removeSideTeam(name)
  const team = must(await db.from('teams').insert({ name, church_id: CHURCH_ID }).select('id').single(), 'team').id as string
  const position = must(await db.from('positions').insert({ team_id: team, name: positionName }).select('id').single(), 'position').id as string
  must(await db.from('member_positions').insert({ user_id: qualifiedUserId, position_id: position }), 'qualif')
  return { team, position }
}

/** Supprime l'équipe de test ET ce qui la référence (clés étrangères). */
async function removeSideTeam(name: string) {
  const { data } = await db.from('teams').select('id, positions(id)').eq('name', name)
  for (const t of data ?? []) {
    for (const p of t.positions ?? []) must(await db.from('plan_assignments').delete().eq('position_id', p.id), 'del assignments')
    must(await db.from('plans').update({ team_ids: null }).not('id', 'is', null), 'reset team_ids')
    must(await db.from('teams').delete().eq('id', t.id), 'del team')
  }
}

// ═══════════════════════ A. PLUSIEURS CHORISTES SUR UN MÊME SERVICE ═══════════════════════

test.describe('A. Plusieurs choristes sur un même service (desktop ET mobile)', () => {
  // Poste « Choriste » (multi-bénévoles) semé avec le jeu de données : Chloé, Paul, Béa, Bob qualifiés.
  const choristesOf = async (planId: string) => {
    const { data } = await db.from('positions').select('id').eq('name', 'Choriste').single()
    return (await assignmentsOf(planId)).filter((a: { position_id: string }) => a.position_id === data!.id).map((a: { user_id: string }) => a.user_id)
  }
  const choristeId = async () => (await db.from('positions').select('id').eq('name', 'Choriste').single()).data!.id as string

  /** Planifie `names` UN PAR UN comme un admin, avec l'UI de l'appareil courant. */
  async function scheduleOneByOne(page: Page, ti: Parameters<typeof isDesktop>[0], planId: string, names: string[]) {
    if (isDesktop(ti)) {
      const picker = await desktopOpenSlot(page, 'Louange', 'Choriste')
      for (const name of names) {
        expect(await desktopTryAssign(page, picker, name), `${name} doit être assignable`).toBe('clicked')
        // Le panneau reste ouvert pour enchaîner, et la personne affectée n'est plus proposée.
        await expect(picker).toBeVisible()
        await expect.poll(() => pickerSectionOf(picker, name), { timeout: 20_000 }).toBe('absent')
      }
      return
    }
    for (const [i, name] of names.entries()) {
      const form = await mobileOpenSlot(page, 'Louange', i === 0 ? 'Choriste' : 'Ajouter · Choriste', 'Choriste')
      expect(await mobileTryAssign(page, form, name), `${name} doit être assignable`).toBe('submitted')
      await expect.poll(async () => (await choristesOf(planId)).length, { timeout: 15_000 }).toBe(i + 1)
      // Le formulaire d'un poste multi-bénévoles reste ouvert, SANS la personne qu'on vient d'ajouter
      // présélectionnée (sinon un 2e appui sur ✓ créerait un doublon). 1er ajout : le créneau « à
      // pourvoir » est remplacé par le créneau d'ajout « Ajouter · Choriste ».
      const refreshed = i === 0
        ? expect(page.getByRole('button', { name: 'Ajouter · Choriste', exact: true }).filter({ visible: true })).toBeVisible({ timeout: 8_000 })
        : expect(form.locator('select[name="user_id"]')).toHaveValue('', { timeout: 8_000 })
      // WebKit headless n'applique pas toujours le rafraîchissement qui suit une action serveur (constaté
      // à l'identique sur le code d'avant correctif, même pour un poste simple) : l'enregistrement est
      // acquis (vérifié en base), on recharge la page, comme le ferait l'utilisateur.
      if (!(await refreshed.then(() => true, () => false))) await gotoPlan(page, planId, 'Culte choristes')
    }
  }
  test('A.1 trois choristes l’un après l’autre sur le même service', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte choristes', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte choristes')

    await scheduleOneByOne(admin, ti, plan.id, [CHLOE, PAUL, BEA])

    await expect.poll(async () => (await choristesOf(plan.id)).sort(), { timeout: 15_000 })
      .toEqual([refs.ids.chloe, refs.ids.paul, refs.ids.bea].sort())

    // Le créneau d'ajout reste proposé après 3 choristes (il y en a un 4e qualifié : Bob).
    await gotoPlan(admin, plan.id, 'Culte choristes')
    const more = isDesktop(ti)
      ? admin.getByRole('button').filter({ hasText: 'Choriste' }).filter({ hasText: 'Ajouter quelqu’un d’autre' })
      : admin.getByRole('button', { name: 'Ajouter · Choriste', exact: true })
    await expandTeam(admin, 'Louange', more.filter({ visible: true }))
    await expect(more.filter({ visible: true }).first()).toBeVisible()
  })

  test('A.2 une personne déjà choriste n’est jamais reproposée sur ce poste', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte doublon', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    must(await db.from('plan_assignments').insert({ plan_id: plan.id, user_id: refs.ids.chloe, position_id: await choristeId(), team_id: refs.louange, status: 'pending' }), 'seed')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte doublon')

    if (isDesktop(ti)) {
      const picker = await desktopOpenSlot(admin, 'Louange', 'Choriste')
      expect(await pickerSectionOf(picker, CHLOE)).toBe('absent')
      expect(await pickerSectionOf(picker, PAUL)).toBe('Disponibles')
    } else {
      const form = await mobileOpenSlot(admin, 'Louange', 'Ajouter · Choriste', 'Choriste')
      expect((await optionFor(form.locator('select[name="user_id"]'), CHLOE)).present).toBe(false)
      expect((await optionFor(form.locator('select[name="user_id"]'), PAUL)).present).toBe(true)
    }
    expect(await choristesOf(plan.id)).toEqual([refs.ids.chloe])
  })

  test('A.3 un choriste indisponible n’est pas assignable, les autres le restent', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte indispo choristes', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-11-08')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte indispo choristes')

    if (isDesktop(ti)) {
      const picker = await desktopOpenSlot(admin, 'Louange', 'Choriste')
      expect(await pickerSectionOf(picker, PAUL)).toBe('Indisponibles ce jour')
      expect(await desktopTryAssign(admin, picker, PAUL)).toBe('no-button')
      expect(await desktopTryAssign(admin, picker, CHLOE)).toBe('clicked')
    } else {
      const form = await mobileOpenSlot(admin, 'Louange', 'Choriste')
      expect((await optionFor(form.locator('select[name="user_id"]'), PAUL)).disabled).toBe(true)
      expect(await mobileTryAssign(admin, form, PAUL)).toBe('blocked-ui')
      expect(await mobileTryAssign(admin, form, CHLOE)).toBe('submitted')
    }
    await expect.poll(async () => (await choristesOf(plan.id)).length, { timeout: 15_000 }).toBe(1)
    await expectNeverAssigned(plan.id, refs.ids.paul)
  })

  test('A.4 un poste à occupant unique (Piano) pourvu n’offre pas de créneau supplémentaire', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte piano', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    must(await db.from('plan_assignments').insert({ plan_id: plan.id, user_id: refs.ids.paul, position_id: refs.pos.Piano, team_id: refs.louange, status: 'pending' }), 'seed')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte piano')

    // Probe : le créneau (encore ouvert) du Choriste prouve que le bloc Louange est déplié.
    const probe = isDesktop(ti)
      ? admin.getByRole('button').filter({ hasText: 'Choriste' }).filter({ hasText: 'Poste à pourvoir' }).filter({ visible: true })
      : admin.getByRole('button', { name: 'Choriste', exact: true }).filter({ visible: true })
    await expandTeam(admin, 'Louange', probe)
    const extraPiano = isDesktop(ti)
      ? admin.getByRole('button').filter({ hasText: 'Piano' }).filter({ hasText: 'Ajouter quelqu’un d’autre' })
      : admin.getByRole('button', { name: 'Ajouter · Piano', exact: true })
    await expect(extraPiano.filter({ visible: true })).toHaveCount(0)
  })
})

// ═══════════════════════ B. AUTO-REMPLISSAGE : SEULEMENT LES ÉQUIPES DONT ON EST RESPONSABLE ═══════════════════════

test.describe('B. Auto-remplissage limité aux équipes dont on est responsable', () => {
  const SIDE = 'Régie test'
  let side = { team: '', position: '' }
  test.beforeAll(async () => {
    const alice = must(await db.from('profiles').select('id').eq('email', 'alice@indispo.test').single()).id as string
    side = await createSideTeam(SIDE, 'Hôte', alice)
  })
  test.afterAll(async () => {
    await removeSideTeam(SIDE)
    // `alice` peut avoir été promue éditrice par un test : on la remet simple bénévole.
    await db.from('profiles').update({ permission: 'viewer' }).eq('email', 'alice@indispo.test')
  })

  async function openAutofill(page: Page, from: string, to: string, generate = true) {
    await page.goto('/benevoles/admin/plans')
    await page.locator('button:has-text("Auto-remplissage")').filter({ visible: true }).first().click()
    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Auto-remplissage du planning' })
    const dates = modal.locator('input[type="date"]')
    await dates.nth(0).fill(from)
    await dates.nth(1).fill(to)
    if (generate) {
      await modal.getByRole('button', { name: 'Générer' }).click()
      await expect(page.getByText('Aperçu de l\'auto-remplissage')).toBeVisible({ timeout: 30_000 })
    }
    return page.locator('div.fixed.inset-0').filter({ hasText: generate ? 'Aperçu' : 'Auto-remplissage du planning' })
  }

  const bothTeamsPlan = (refs: { louange: string }) =>
    createPlan({ title: 'Culte auto-resp', paris: '2026-11-08T10:00', teamIds: [refs.louange, side.team] })

  test('B.1 un administrateur se voit proposer TOUTES les équipes', async ({ refs, as }) => {
    await bothTeamsPlan(refs)
    const admin = await as('admin')
    const modal = await openAutofill(admin, '2026-11-08', '2026-11-08')
    await expect(modal.getByText('Louange · Piano')).toHaveCount(1)
    await expect(modal.getByText('Régie test · Hôte')).toHaveCount(1)
    await expect(modal.getByText(/Équipes planifiées/)).toHaveCount(0)
  })

  test('B.2 un éditeur responsable de Louange ne reçoit QUE Louange, et la validation n’insère que Louange', async ({ refs, as }) => {
    const plan = await bothTeamsPlan(refs)
    const editor = await as('editor')
    const modal = await openAutofill(editor, '2026-11-08', '2026-11-08')

    await expect(modal.getByText('Louange · Piano')).toHaveCount(1)
    await expect(modal.getByText(/Régie test ·/)).toHaveCount(0)
    await expect(modal.getByText('Équipes planifiées : Louange')).toBeVisible()

    const done = waitForServerAction(editor)
    await modal.getByRole('button', { name: /^Valider/ }).click()
    await done
    await expect.poll(async () => (await assignmentsOf(plan.id)).length, { timeout: 20_000 }).toBeGreaterThan(0)
    const rows = await assignmentsOf(plan.id)
    expect(rows.every((a: { team_id: string }) => a.team_id === refs.louange), 'seul Louange doit être planifié (jamais l’équipe de test)').toBe(true)
  })

  test('B.3 requête forgée : un éditeur ne peut pas faire valider un poste d’une autre équipe', async ({ refs, as }) => {
    const plan = await bothTeamsPlan(refs)
    const editor = await as('editor')
    const modal = await openAutofill(editor, '2026-11-08', '2026-11-08')
    await expect(modal.getByText('Louange · Piano')).toHaveCount(1)

    // On observe la VRAIE requête de validation (elle part normalement : Louange est bien dans le
    // périmètre de l'éditeur), puis on la rejoue depuis le client HTTP du navigateur en visant un poste
    // de l'équipe de test : un client est modifiable, le serveur doit relire l'équipe réelle du poste.
    // `page.on('request')` plutôt que `page.route` : WebKit (PWA, service worker) n'y route pas les fetch.
    let captured: { url: string; headers: Record<string, string>; body: string } | null = null
    editor.on('request', req => {
      const body = req.postData()
      if (req.method() !== 'POST' || !body?.includes('positionId')) return
      void req.allHeaders().then(headers => {
        if (headers['next-action'] && !captured) captured = { url: req.url(), headers, body }
      })
    })
    await modal.getByRole('button', { name: /^Valider/ }).click()
    await expect.poll(() => captured, { timeout: 15_000 }).not.toBeNull()

    const sent = captured!
    const forgedBody = sent.body.split(refs.pos.Piano).join(side.position).split(refs.louange).join(side.team)
    expect(forgedBody, 'la requête forgée doit bien viser l’équipe de test').toContain(side.team)
    const forgedHeaders = Object.fromEntries(
      ['next-action', 'content-type', 'accept', 'next-router-state-tree', 'next-url'].filter(h => sent.headers[h]).map(h => [h, sent.headers[h]]),
    )
    const response = await editor.context().request.post(sent.url, { headers: forgedHeaders, data: forgedBody })
    const text = await response.text()

    expect(text).toMatch(/pas responsable de l.équipe « Régie test »/)
    // Seule la validation légitime (Louange) a abouti : rien n'a été écrit sur l'équipe de test.
    const rows = await assignmentsOf(plan.id)
    expect(rows.filter((a: { team_id: string }) => a.team_id === side.team)).toHaveLength(0)
  })

  test('B.4 un éditeur qui n’est responsable d’aucune équipe est refusé', async ({ refs, as }) => {
    await bothTeamsPlan(refs)
    // Alice est simple membre (jamais responsable) : promue éditrice, elle ne planifie rien.
    must(await db.from('profiles').update({ permission: 'editor' }).eq('id', refs.ids.alice), 'promote')
    const alice = await as('alice')
    const modal = await openAutofill(alice, '2026-11-08', '2026-11-08', false)
    await expect(modal.getByText('Seules les équipes dont vous êtes responsable sont planifiées.')).toBeVisible()
    await modal.getByRole('button', { name: 'Générer' }).click()
    await expect(modal.getByText(/responsable d'aucune équipe/)).toBeVisible({ timeout: 20_000 })
    await expect(alice.getByText('Aperçu de l\'auto-remplissage')).toHaveCount(0)
  })
})
