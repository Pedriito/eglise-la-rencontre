import { test as base, expect, type Page, type BrowserContext, type Locator, type TestInfo } from '@playwright/test'
import { db, loadRefs, resetVolatile, assignmentsOf, must } from '../lib/db.mjs'

export { expect }
export type Refs = Awaited<ReturnType<typeof loadRefs>>

export const isDesktop = (ti: TestInfo) => ti.project.name === 'desktop-chrome'

/** Simule l'appli installée sur l'écran d'accueil (display-mode: standalone + navigator.standalone). */
async function emulateInstalledPwa(context: BrowserContext) {
  await context.addInitScript(() => {
    const native = window.matchMedia.bind(window)
    window.matchMedia = ((q: string) => q.includes('display-mode: standalone')
      ? ({ matches: true, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false } as unknown as MediaQueryList)
      : native(q)) as typeof window.matchMedia
    try { Object.defineProperty(navigator, 'standalone', { get: () => true }) } catch { /* déjà défini */ }
  })
}

type Fixtures = {
  refs: Refs
  /** Ouvre une page connectée en tant que `key` avec le même appareil que le projet courant. */
  as: (key: string) => Promise<Page>
}

export const test = base.extend<Fixtures>({
  refs: async ({}, use) => {
    await resetVolatile()
    await use(await loadRefs())
  },
  as: async ({ browser }, use, testInfo) => {
    const contexts: BrowserContext[] = []
    await use(async (key: string) => {
      const u = testInfo.project.use
      const context = await browser.newContext({
        storageState: `.auth/${key}.json`,
        baseURL: 'http://localhost:3100',
        viewport: u.viewport, userAgent: u.userAgent, isMobile: u.isMobile, hasTouch: u.hasTouch,
        deviceScaleFactor: u.deviceScaleFactor, locale: 'fr-FR', timezoneId: 'Europe/Paris',
      })
      if (!isDesktop(testInfo)) await emulateInstalledPwa(context)
      contexts.push(context)
      return context.newPage()
    })
    for (const c of contexts) await c.close()
  },
})

const visible = (l: Locator) => l.filter({ visible: true })

/** Attend la réponse d'une Server Action (POST portant l'en-tête Next-Action). */
export function waitForServerAction(page: Page) {
  return page.waitForResponse(r => r.request().method() === 'POST' && !!r.request().headers()['next-action'], { timeout: 30_000 })
}

export async function gotoPlan(page: Page, planId: string, title: string) {
  await page.goto(`/benevoles/admin/plans/${planId}`)
  await expect(visible(page.getByRole('heading', { name: title })).first()).toBeVisible({ timeout: 60_000 })
}

/** Déplie le bloc d'équipe s'il est replié (admin non membre → replié par défaut).
 *  L'état est lu sur le chevron (`rotate-180` = déplié) pour ne cliquer que si nécessaire : un clic
 *  perdu avant l'hydratation est rejoué, un clic tardif n'est jamais doublé (sinon on replierait). */
async function expandTeam(page: Page, team: string, probe: Locator) {
  const header = visible(page.getByRole('button', { name: new RegExp(`^\\s*${team}`) })).first()
  await expect(header).toBeVisible()
  await expect.poll(async () => {
    if (await probe.count() > 0) return true
    const expanded = await header.locator('svg').evaluate(el => el.classList.contains('rotate-180') || el.getAttribute('class')?.includes('rotate-180') === true)
    if (!expanded) await header.click()
    await page.waitForTimeout(400)
    return (await probe.count()) > 0
  }, { timeout: 30_000, intervals: [100, 500, 1000] }).toBe(true)
}

// ───────────────────────────── DESKTOP ─────────────────────────────

export type PickerSection = 'Disponibles' | 'Charge élevée' | 'Indisponibles ce jour' | 'absent'

/** Ouvre le panneau « Choisir un bénévole » pour un créneau (poste nommé ou « Ajouter un bénévole »). */
export async function desktopOpenSlot(page: Page, team: string, slotLabel: string) {
  const slot = visible(page.getByRole('button').filter({ hasText: slotLabel }).filter({ hasText: /Poste à pourvoir|Ajouter quelqu’un d’autre/ }))
  await expandTeam(page, team, slot)
  await slot.first().click()
  const picker = page.locator('aside').filter({ hasText: 'Choisir un bénévole' })
  await expect(picker).toBeVisible()
  return picker
}

/** Section du panneau dans laquelle apparaît la personne. */
export async function pickerSectionOf(picker: Locator, fullName: string): Promise<PickerSection> {
  // textContent (et non innerText) : les titres de section sont en `uppercase` CSS.
  const text = (await picker.evaluate(el => Array.from(el.querySelectorAll('p')).map(p => p.textContent ?? '').join('\n')))
  const lines = text.split('\n').map(s => s.trim()).filter(Boolean)
  const idx = lines.findIndex(l => l === fullName)
  if (idx === -1) return 'absent'
  for (let i = idx; i >= 0; i--) {
    for (const s of ['Disponibles', 'Charge élevée', 'Indisponibles ce jour'] as const) {
      if (lines[i].startsWith(`${s} ·`)) return s
    }
  }
  return 'absent'
}

/** Tente d'assigner comme le ferait un admin : clique « Assigner » sur la ligne si le bouton existe et est actif.
 *  Renvoie 'clicked' si une Server Action a été déclenchée, 'no-button' sinon. */
export async function desktopTryAssign(page: Page, picker: Locator, fullName: string) {
  const row = picker.locator('div.flex.items-center.gap-3').filter({ has: page.getByText(fullName, { exact: true }) })
  const button = row.getByRole('button', { name: 'Assigner' })
  if (await row.count() === 0 || await button.count() === 0 || !(await button.isEnabled())) return 'no-button' as const
  const done = waitForServerAction(page)
  await button.click()
  await done
  return 'clicked' as const
}

// ───────────────────────────── MOBILE ─────────────────────────────

/** Formulaire d'un créneau mobile (MobileOpenSlot) déplié. */
export async function mobileOpenSlot(page: Page, team: string, positionLabel: string) {
  const collapsed = visible(page.getByRole('button', { name: positionLabel, exact: true }))
  await expandTeam(page, team, collapsed)
  await collapsed.first().click()
  const form = visible(page.locator('form.border-2').filter({ has: page.locator('select[name="user_id"]') }).filter({ hasText: positionLabel }))
  await expect(form).toHaveCount(1)
  return form
}

/** Formulaire « ajout libre » en bas du bloc d'équipe (AddAssignmentForm). */
export async function mobileBottomForm(page: Page, team: string) {
  const form = visible(page.locator('form.space-y-2').filter({ has: page.locator('select[name="user_id"]') }))
  await expandTeam(page, team, form)
  return form.first()
}

export type OptionState = { present: boolean; disabled: boolean; label: string | null; value: string | null }

export async function optionFor(select: Locator, fullName: string): Promise<OptionState> {
  return select.evaluate((el, name) => {
    const opt = Array.from((el as HTMLSelectElement).options).find(o => o.textContent?.includes(name))
    return opt
      ? { present: true, disabled: opt.disabled, label: opt.textContent, value: opt.value }
      : { present: false, disabled: false, label: null, value: null }
  }, fullName)
}

/** Tente d'assigner via un formulaire mobile (sélection + validation), comme un admin au doigt.
 *  'blocked-ui' = l'option n'est pas sélectionnable ; 'submitted' = la Server Action est partie. */
export async function mobileTryAssign(page: Page, form: Locator, fullName: string, opts: { positionId?: string; forceEnable?: boolean } = {}) {
  if (opts.positionId) await form.locator('select[name="position_id"]').selectOption(opts.positionId)
  const select = form.locator('select[name="user_id"]')
  let opt = await optionFor(select, fullName)
  if (!opt.present) return 'absent' as const
  if (opt.disabled && opts.forceEnable) {
    // Contournement délibéré de l'UI (devtools / page périmée) : le serveur doit refuser seul.
    await select.evaluate((el, value) => {
      const o = Array.from((el as HTMLSelectElement).options).find(x => x.value === value)
      if (o) o.disabled = false
    }, opt.value)
    opt = await optionFor(select, fullName)
  }
  if (opt.disabled) return 'blocked-ui' as const
  await select.selectOption(opt.value!)
  const submit = form.locator('button[type="submit"]')
  if (!(await submit.isEnabled())) {
    if (!opts.forceEnable) return 'blocked-ui' as const
    await submit.evaluate(b => (b as HTMLButtonElement).disabled = false)
  }
  const done = waitForServerAction(page)
  await submit.click()
  await done
  return 'submitted' as const
}

// ───────────────────────────── BASE ─────────────────────────────

/** Vérifie en base, pendant 2,5 s, qu'aucune affectation n'existe pour ce bénévole sur ce plan. */
export async function expectNeverAssigned(planId: string, userId: string) {
  const deadline = Date.now() + 2_500
  while (Date.now() < deadline) {
    const rows = (await assignmentsOf(planId)).filter((a: { user_id: string }) => a.user_id === userId)
    expect(rows, `affectation trouvée en base pour ${userId} sur ${planId}`).toHaveLength(0)
    await new Promise(r => setTimeout(r, 250))
  }
}

export async function expectAssigned(planId: string, userId: string) {
  await expect.poll(async () => (await assignmentsOf(planId)).filter((a: { user_id: string }) => a.user_id === userId).length, { timeout: 10_000 }).toBeGreaterThan(0)
}

export async function assign(planId: string, userId: string, positionId: string | null, teamId: string) {
  return must(await db.from('plan_assignments').insert({ plan_id: planId, user_id: userId, position_id: positionId, team_id: teamId, status: 'pending' }).select('id').single(), 'assign')
}
