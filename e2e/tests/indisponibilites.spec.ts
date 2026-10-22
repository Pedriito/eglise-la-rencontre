import type { Page, TestInfo } from '@playwright/test'
import {
  test, expect, isDesktop, gotoPlan, desktopOpenSlot, pickerSectionOf, desktopTryAssign,
  mobileOpenSlot, mobileBottomForm, mobileTryAssign, optionFor, expectNeverAssigned, expectAssigned,
  assign, waitForServerAction, type Refs,
} from './helpers'
import { db, createPlan, addBlockout, assignmentsOf, must } from '../lib/db.mjs'

const PAUL = 'Paul Piano'
const NINA = 'Nina Nouvelle'

/** Tente de planifier `fullName` sur un créneau, par l'UI du projet courant (desktop ou mobile).
 *  Renvoie ce que l'admin voit, pour des assertions explicites. */
async function tryScheduleViaUI(page: Page, ti: TestInfo, o: { team: string; slot: string; fullName: string; forceEnable?: boolean }) {
  if (isDesktop(ti)) {
    const picker = await desktopOpenSlot(page, o.team, o.slot)
    const section = await pickerSectionOf(picker, o.fullName)
    const attempt = await desktopTryAssign(page, picker, o.fullName)
    return { offeredAsAvailable: section === 'Disponibles' || section === 'Charge élevée', detail: `section=${section}, tentative=${attempt}` }
  }
  const form = await mobileOpenSlot(page, o.team, o.slot)
  const opt = await optionFor(form.locator('select[name="user_id"]'), o.fullName)
  const attempt = await mobileTryAssign(page, form, o.fullName, { forceEnable: o.forceEnable })
  return { offeredAsAvailable: opt.present && !opt.disabled && !opt.label?.includes('✗'), detail: `option=${JSON.stringify(opt)}, tentative=${attempt}` }
}

async function expectBlocked(page: Page, ti: TestInfo, planId: string, userId: string, o: { team: string; slot: string; fullName: string }) {
  const r = await tryScheduleViaUI(page, ti, o)
  expect.soft(r.offeredAsAvailable, `UI : ${o.fullName} ne doit pas être proposé(e) comme disponible (${r.detail})`).toBe(false)
  await expectNeverAssigned(planId, userId)
}

async function expectSchedulable(page: Page, ti: TestInfo, planId: string, userId: string, o: { team: string; slot: string; fullName: string }) {
  const r = await tryScheduleViaUI(page, ti, o)
  expect(r.offeredAsAvailable, `UI : ${o.fullName} doit être proposé(e) comme disponible (${r.detail})`).toBe(true)
  await expectAssigned(planId, userId)
}

// ═══════════════════════════ 1. DÉCLARATION PAR LE BÉNÉVOLE ═══════════════════════════

test.describe('1. Déclaration d’une indisponibilité par le bénévole', () => {
  async function declare(page: Page, start: string, end: string, reason = 'Vacances') {
    await page.goto('/benevoles/mes-indisponibilites')
    const form = page.locator('form').filter({ has: page.locator('input[name="start_date"]') }).filter({ visible: true }).first()
    await form.locator('input[name="start_date"]').fill(start)
    await form.locator('input[name="end_date"]').fill(end)
    await form.locator('input[name="reason"]').fill(reason)
    const done = waitForServerAction(page)
    await form.getByRole('button', { name: 'Enregistrer' }).click()
    await done
  }

  test('1.1 un jour → enregistrée en base avec les bonnes dates et affichée', async ({ refs, as }) => {
    const paul = await as('paul')
    await declare(paul, '2026-11-08', '2026-11-08')
    await expect(paul.getByText('Indisponibilité enregistrée.').filter({ visible: true })).toBeVisible()
    const rows = must(await db.from('blockout_dates').select('start_date, end_date').eq('user_id', refs.ids.paul))
    expect(rows).toEqual([{ start_date: '2026-11-08', end_date: '2026-11-08' }])
    await expect(paul.getByText('8 novembre 2026').filter({ visible: true }).first()).toBeVisible()
  })

  test('1.2 période de plusieurs jours → enregistrée', async ({ refs, as }) => {
    const paul = await as('paul')
    await declare(paul, '2026-11-07', '2026-11-15')
    const rows = must(await db.from('blockout_dates').select('start_date, end_date').eq('user_id', refs.ids.paul))
    expect(rows).toEqual([{ start_date: '2026-11-07', end_date: '2026-11-15' }])
  })

  test('1.3 fin avant début → refusée avec un message, rien en base', async ({ refs, as }) => {
    const paul = await as('paul')
    await declare(paul, '2026-11-15', '2026-11-07')
    await expect(paul.getByText('La date de fin doit être après la date de début.').filter({ visible: true })).toBeVisible()
    const rows = must(await db.from('blockout_dates').select('id').eq('user_id', refs.ids.paul))
    expect(rows).toHaveLength(0)
  })

  test('1.4 parcours complet : Paul déclare depuis son téléphone → l’admin ne peut pas le planifier', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte 8 nov', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    const paul = await as('paul')
    await declare(paul, '2026-11-08', '2026-11-08')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte 8 nov')
    await expectBlocked(admin, ti, plan.id, refs.ids.paul, { team: 'Louange', slot: 'Piano', fullName: PAUL })
  })
})

// ═══════════════════════════ 2. PLANIFICATION MANUELLE ═══════════════════════════

test.describe('2. Planification manuelle par un admin', () => {
  const CASES = [
    { name: 'se termine la veille',          start: '2026-11-01', end: '2026-11-07', blocked: false },
    { name: 'commence le lendemain',         start: '2026-11-09', end: '2026-11-12', blocked: false },
    { name: 'commence le jour même',         start: '2026-11-08', end: '2026-11-12', blocked: true },
    { name: 'se termine le jour même',       start: '2026-11-01', end: '2026-11-08', blocked: true },
    { name: 'jour unique = jour du service', start: '2026-11-08', end: '2026-11-08', blocked: true },
    { name: 'longue période qui l’englobe',  start: '2026-10-20', end: '2026-12-31', blocked: true },
  ]
  for (const c of CASES) {
    test(`2.1 bornes — indispo qui ${c.name} → ${c.blocked ? 'BLOQUÉ' : 'planifiable'}`, async ({ refs, as }, ti) => {
      const plan = await createPlan({ title: 'Culte bornes', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
      await addBlockout(refs.ids.paul, c.start, c.end)
      const admin = await as('admin')
      await gotoPlan(admin, plan.id, 'Culte bornes')
      const o = { team: 'Louange', slot: 'Piano', fullName: PAUL }
      if (c.blocked) await expectBlocked(admin, ti, plan.id, refs.ids.paul, o)
      else await expectSchedulable(admin, ti, plan.id, refs.ids.paul, o)
    })
  }

  test('2.2 plusieurs indispos dont une seule couvre le jour → BLOQUÉ', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte multi', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-10-01', '2026-10-05')
    await addBlockout(refs.ids.paul, '2026-11-08', '2026-11-08')
    await addBlockout(refs.ids.paul, '2026-12-24', '2026-12-26')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte multi')
    await expectBlocked(admin, ti, plan.id, refs.ids.paul, { team: 'Louange', slot: 'Piano', fullName: PAUL })
  })

  test('2.3 l’indispo d’un AUTRE bénévole ne bloque pas Paul (pas de faux positif)', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte autre', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.nina, '2026-11-08', '2026-11-08')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte autre')
    await expectSchedulable(admin, ti, plan.id, refs.ids.paul, { team: 'Louange', slot: 'Piano', fullName: PAUL })
  })

  test('2.4 équipe SANS postes nommés (Accueil) → BLOQUÉ', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte accueil', paris: '2026-11-08T10:00', teamIds: [refs.accueil] })
    await addBlockout(refs.ids.paul, '2026-11-08')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte accueil')
    await expectBlocked(admin, ti, plan.id, refs.ids.paul, { team: 'Accueil', slot: 'Ajouter un bénévole', fullName: PAUL })
  })

  test('2.6 [mobile] formulaire d’ajout libre en bas du bloc équipe → BLOQUÉ', async ({ refs, as }, ti) => {
    test.skip(isDesktop(ti), 'formulaire propre à la vue mobile')
    const plan = await createPlan({ title: 'Culte bas', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-11-08')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte bas')
    const form = await mobileBottomForm(admin, 'Louange')
    const before = await (async () => { await form.locator('select[name="position_id"]').selectOption(refs.pos.Piano); return optionFor(form.locator('select[name="user_id"]'), PAUL) })()
    const attempt = await mobileTryAssign(admin, form, PAUL)
    expect.soft(before.present && !before.disabled && !before.label?.includes('✗') && !before.label?.includes('indisponible'),
      `UI : Paul ne doit pas être sélectionnable (${JSON.stringify(before)}, tentative=${attempt})`).toBe(false)
    await expectNeverAssigned(plan.id, refs.ids.paul)
  })

  test('2.7 [desktop] espace de travail de la liste des services (?plan=) → BLOQUÉ', async ({ refs, as }, ti) => {
    test.skip(!isDesktop(ti), 'vue ≥ xl uniquement')
    const plan = await createPlan({ title: 'Culte liste', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-11-08')
    const admin = await as('admin')
    await admin.goto(`/benevoles/admin/plans?plan=${plan.id}`)
    await expect(admin.getByRole('heading', { name: 'Culte liste' }).filter({ visible: true }).first()).toBeVisible({ timeout: 60_000 })
    await expectBlocked(admin, ti, plan.id, refs.ids.paul, { team: 'Louange', slot: 'Piano', fullName: PAUL })
  })

  test('2.8 un ÉDITEUR (pas admin) ne peut pas non plus planifier un indisponible', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte éditeur', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    // (seed) l'éditeur est responsable de Louange : condition existante pour voir le bloc d'équipe.
    await addBlockout(refs.ids.paul, '2026-11-08')
    const editor = await as('editor')
    await gotoPlan(editor, plan.id, 'Culte éditeur')
    await expectBlocked(editor, ti, plan.id, refs.ids.paul, { team: 'Louange', slot: 'Piano', fullName: PAUL })
  })
})

// ═══════════════════════════ 3. CONTOURNEMENTS ═══════════════════════════

test.describe('3. Contournements de l’interface', () => {
  test('3.1 indispo posée PENDANT que l’admin a la page ouverte (page périmée) → refus serveur', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte course', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte course')
    // L'admin ouvre le créneau alors que Paul est encore disponible…
    if (isDesktop(ti)) {
      const picker = await desktopOpenSlot(admin, 'Louange', 'Piano')
      expect(await pickerSectionOf(picker, PAUL)).toBe('Disponibles')
      // … Paul pose son indispo depuis son téléphone à ce moment-là …
      await addBlockout(refs.ids.paul, '2026-11-08')
      // … l'admin clique « Assigner » sur sa page désormais périmée.
      expect(await desktopTryAssign(admin, picker, PAUL)).toBe('clicked')
    } else {
      const form = await mobileOpenSlot(admin, 'Louange', 'Piano')
      await addBlockout(refs.ids.paul, '2026-11-08')
      expect(await mobileTryAssign(admin, form, PAUL)).toBe('submitted')
    }
    await expectNeverAssigned(plan.id, refs.ids.paul)
  })

  test('3.2 [mobile] option désactivée réactivée à la main (devtools) → refus serveur', async ({ refs, as }, ti) => {
    test.skip(isDesktop(ti), 'formulaire HTML mobile')
    const plan = await createPlan({ title: 'Culte forcé', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-11-08')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte forcé')
    const form = await mobileOpenSlot(admin, 'Louange', 'Piano')
    expect(await mobileTryAssign(admin, form, PAUL, { forceEnable: true })).toBe('submitted')
    await expectNeverAssigned(plan.id, refs.ids.paul)
  })
})

// ═══════════════════════════ 4. CAS LIMITES ═══════════════════════════

test.describe('4. Cas limites', () => {
  test('4.1 service à 00h30 (heure de Paris, hiver) le jour de l’indispo → BLOQUÉ', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Veillée minuit', paris: '2026-11-22T00:30', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-11-22')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Veillée minuit')
    await expectBlocked(admin, ti, plan.id, refs.ids.paul, { team: 'Louange', slot: 'Piano', fullName: PAUL })
  })

  test('4.2 service à 01h30 (heure de Paris, été) le jour de l’indispo → BLOQUÉ', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Nuit de prière', paris: '2027-06-13T01:30', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2027-06-13')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Nuit de prière')
    await expectBlocked(admin, ti, plan.id, refs.ids.paul, { team: 'Louange', slot: 'Piano', fullName: PAUL })
  })

  test('4.3 service à 23h30 la VEILLE d’une indispo → planifiable (pas de faux positif)', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Soirée veille', paris: '2026-11-21T23:30', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-11-22')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Soirée veille')
    await expectSchedulable(admin, ti, plan.id, refs.ids.paul, { team: 'Louange', slot: 'Piano', fullName: PAUL })
  })

  test('4.4 plus de 1000 indispos en base (historique) → la nouvelle est quand même prise en compte', async ({ refs, as }, ti) => {
    test.setTimeout(180_000)
    const plan = await createPlan({ title: 'Culte volume', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    const others = [refs.ids.bea, refs.ids.bob, refs.ids.chloe, refs.ids.gael, refs.ids.alice]
    const rows = Array.from({ length: 1200 }, (_, i) => {
      const d = new Date(Date.UTC(2023, 0, 1) + i * 86_400_000).toISOString().slice(0, 10)
      return { user_id: others[i % others.length], start_date: d, end_date: d, reason: 'historique' }
    })
    for (let i = 0; i < rows.length; i += 500) must(await db.from('blockout_dates').insert(rows.slice(i, i + 500)))
    await addBlockout(refs.ids.paul, '2026-11-08')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte volume')
    await expectBlocked(admin, ti, plan.id, refs.ids.paul, { team: 'Louange', slot: 'Piano', fullName: PAUL })
  })

  test('4.5 bénévole inscrit sans église (church_id NULL) → BLOQUÉ quand même', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte Nina', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.nina, '2026-11-08')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte Nina')
    await expectBlocked(admin, ti, plan.id, refs.ids.nina, { team: 'Louange', slot: 'Piano', fullName: NINA })
  })
})

// ═══════════════════════════ 5. AUTO-REMPLISSAGE ═══════════════════════════

test.describe('5. Auto-remplissage', () => {
  async function openAutofill(page: Page, from: string, to: string) {
    await page.goto('/benevoles/admin/plans')
    await page.locator('button:has-text("Auto-remplissage")').filter({ visible: true }).first().click()
    const modal = page.locator('div.fixed.inset-0').filter({ hasText: 'Auto-remplissage du planning' })
    const dates = modal.locator('input[type="date"]')
    await dates.nth(0).fill(from)
    await dates.nth(1).fill(to)
    await modal.getByRole('button', { name: 'Générer' }).click()
    await expect(page.getByText('Aperçu de l\'auto-remplissage')).toBeVisible({ timeout: 30_000 })
    return page.locator('div.fixed.inset-0').filter({ hasText: 'Aperçu' })
  }

  test('5.1 un indisponible n’est jamais proposé, ni en titulaire ni en alternative', async ({ refs, as }) => {
    await createPlan({ title: 'Culte auto', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.paul, '2026-11-08')
    const admin = await as('admin')
    const modal = await openAutofill(admin, '2026-11-08', '2026-11-08')
    const row = modal.locator('div.flex.items-center.gap-3').filter({ hasText: 'Louange · Piano' })
    await expect(row).toHaveCount(1)
    const options = await row.locator('select option').allTextContents()
    expect(options.join(' | ')).not.toContain(PAUL)
    expect(options).toContain(NINA)
  })

  test('5.2 indispo posée entre « Générer » et « Valider » → pas d’affectation', async ({ refs, as }) => {
    const plan = await createPlan({ title: 'Culte auto2', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await addBlockout(refs.ids.nina, '2026-11-08') // Paul seul candidat Piano
    const admin = await as('admin')
    const modal = await openAutofill(admin, '2026-11-08', '2026-11-08')
    const row = modal.locator('div.flex.items-center.gap-3').filter({ hasText: 'Louange · Piano' })
    await expect(row.locator('select')).toHaveValue(refs.ids.paul)
    await addBlockout(refs.ids.paul, '2026-11-08') // Paul se déclare indispo pendant ce temps
    const done = waitForServerAction(admin)
    await modal.getByRole('button', { name: /^Valider/ }).click()
    await done
    await expectNeverAssigned(plan.id, refs.ids.paul)
  })
})

// ═══════════════════════════ 6. AUTRES CHEMINS ═══════════════════════════

test.describe('6. Autres chemins de planification', () => {
  test('6.1 rôle DM attribué à un pianiste devenu indisponible → refusé', async ({ refs, as }) => {
    const plan = await createPlan({ title: 'Culte DM', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await assign(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange) // planifié AVANT sa déclaration
    await addBlockout(refs.ids.paul, '2026-11-08')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte DM')
    const dmRow = admin.locator('div.flex.items-center.gap-2').filter({ has: admin.locator('span', { hasText: /^DM$/ }) }).filter({ visible: true })
    if (await dmRow.count() === 0) await admin.getByRole('button', { name: /^\s*Louange/ }).filter({ visible: true }).first().click()
    const select = dmRow.first().locator('select')
    const done = waitForServerAction(admin)
    await select.selectOption(refs.pos.Piano)
    await done
    const dm = (await assignmentsOf(plan.id)).filter((a: { position_id: string }) => a.position_id === refs.pos.DM)
    expect(dm, 'aucune affectation DM ne doit être créée pour un indisponible').toHaveLength(0)
  })

  test('6.2 [desktop] déplacer (glisser-déposer) un service sur le jour d’indispo d’un affecté → refusé', async ({ refs, as }, ti) => {
    test.skip(!isDesktop(ti), 'glisser-déposer du calendrier desktop')
    const plan = await createPlan({ title: 'Culte déplacé', paris: '2026-11-01T10:00', teamIds: [refs.louange] })
    await assign(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange)
    await addBlockout(refs.ids.paul, '2026-11-08')
    const admin = await as('admin')
    await admin.goto('/benevoles/admin/plans?view=calendar')
    const event = admin.locator('.fc-event').filter({ hasText: 'Culte déplacé' }).first()
    const target = admin.locator('td.fc-daygrid-day[data-date="2026-11-08"]')
    await expect(event).toBeVisible({ timeout: 60_000 })
    const from = (await event.boundingBox())!
    const to = (await target.boundingBox())!
    const done = waitForServerAction(admin)
    await admin.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await admin.mouse.down()
    await admin.mouse.move(from.x + from.width / 2 + 5, from.y + from.height / 2 + 5, { steps: 5 })
    await admin.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 25 })
    await admin.mouse.up()
    await done
    await admin.waitForTimeout(1_000)
    const after = must(await db.from('plans').select('service_date').eq('id', plan.id).single())
    const parisDay = new Date(after.service_date).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
    expect(parisDay, 'le service ne doit pas avoir été déplacé sur le jour d’indispo de Paul').toBe('2026-11-01')
  })

  test('6.3 « Planifier une autre date » ne recopie pas les affectations (pas de contournement)', async ({ refs, as }) => {
    const plan = await createPlan({ title: 'Culte source', paris: '2026-11-01T10:00', teamIds: [refs.louange] })
    await assign(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange)
    await addBlockout(refs.ids.paul, '2026-11-08')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte source')
    await admin.getByRole('button', { name: '+ Planifier une autre date' }).filter({ visible: true }).first().click()
    const input = admin.locator('input[name="service_date"][type="datetime-local"]').filter({ visible: true }).first()
    await expect(input).toHaveValue('2026-11-08T10:00')
    await admin.getByRole('button', { name: 'Créer →' }).filter({ visible: true }).first().click()
    await admin.waitForURL(url => /\/benevoles\/admin\/plans\/[0-9a-f-]{36}$/.test(url.pathname) && !url.pathname.endsWith(plan.id), { timeout: 30_000 })
    const newId = admin.url().split('/').pop()!.split('?')[0]
    expect(await assignmentsOf(newId)).toHaveLength(0)
  })

  test('6.4 Paul planifié PUIS déclare une indispo → l’admin voit une alerte sur sa carte', async ({ refs, as }, ti) => {
    const plan = await createPlan({ title: 'Culte alerte', paris: '2026-11-08T10:00', teamIds: [refs.louange] })
    await assign(plan.id, refs.ids.paul, refs.pos.Piano, refs.louange)
    await addBlockout(refs.ids.paul, '2026-11-08')
    const admin = await as('admin')
    await gotoPlan(admin, plan.id, 'Culte alerte')
    const title = isDesktop(ti) ? 'Indisponible ce jour-là' : 'Indisponible'
    const probe = admin.locator(`span[title="${title}"]`).filter({ visible: true })
    if (await probe.count() === 0) await admin.getByRole('button', { name: /^\s*Louange/ }).filter({ visible: true }).first().click()
    await expect(probe.first()).toBeVisible()
  })
})
