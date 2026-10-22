import { chromium } from '@playwright/test'
import fs from 'node:fs'
import { USERS, PASSWORD } from './lib/db.mjs'

/** Connecte chaque compte une fois via le vrai formulaire de login et sauvegarde ses cookies. */
export default async function globalSetup() {
  fs.mkdirSync('.auth', { recursive: true })
  const browser = await chromium.launch()
  for (const [key, u] of Object.entries(USERS)) {
    const context = await browser.newContext({ baseURL: 'http://localhost:3100', locale: 'fr-FR', timezoneId: 'Europe/Paris' })
    const page = await context.newPage()
    await page.goto('/benevoles/login')
    await page.locator('input[name="email"]').fill(u.email)
    await page.locator('input[name="password"]').fill(PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/benevoles/dashboard', { timeout: 60_000 })
    await context.storageState({ path: `.auth/${key}.json` })
    await context.close()
  }
  await browser.close()
}
