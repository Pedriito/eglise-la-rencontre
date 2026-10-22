import { defineConfig, devices } from '@playwright/test'

const common = { locale: 'fr-FR', timezoneId: 'Europe/Paris' }

export default defineConfig({
  testDir: './tests',
  // Les tests partagent une seule base locale : exécution séquentielle, déterministe.
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: 'results.json' }], ['html', { open: 'never', outputFolder: 'report' }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, ...common } },
    { name: 'iphone-pwa', use: { ...devices['iPhone 14'], ...common } },
    { name: 'android-pwa', use: { ...devices['Pixel 7'], ...common } },
  ],
})
