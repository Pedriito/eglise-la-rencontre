import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'

const { movePlanMock, stableRouter } = vi.hoisted(() => ({
  movePlanMock: vi.fn(async () => ({ ok: true })),
  stableRouter: { push: vi.fn(), refresh: vi.fn() },
}))
vi.mock('./actions', () => ({ movePlan: movePlanMock }))
vi.mock('next/navigation', () => ({ useRouter: () => stableRouter }))

const { PlanTimeEditor } = await import('./PlanTimeEditor')

// Régression : l'heure était lue dans le fuseau de la machine. Le serveur (UTC, comme Vercel) et le
// navigateur (Paris) rendaient « 09:00 » vs « 10:00 » → erreur d'hydratation React #418, qui rend
// les rafraîchissements de la page peu fiables. Le rendu doit être identique quel que soit le fuseau.
const ORIGINAL_TZ = process.env.TZ
afterEach(() => { cleanup(); vi.clearAllMocks(); process.env.TZ = ORIGINAL_TZ })

const MACHINE_TIMEZONES = ['UTC', 'Europe/Paris', 'America/Los_Angeles', 'Pacific/Auckland']

describe('PlanTimeEditor — heure de Paris, quel que soit le fuseau de la machine', () => {
  beforeEach(() => { process.env.TZ = 'UTC' })

  for (const tz of MACHINE_TIMEZONES) {
    it(`affiche 10:00 pour un culte à 09:00 UTC (machine en ${tz})`, () => {
      process.env.TZ = tz
      render(<PlanTimeEditor planId="p1" serviceDate="2026-11-08T09:00:00.000Z" />)
      expect(screen.getByRole('button')).toHaveTextContent('10:00')
    })

    it(`heure d'été : 08:00 UTC = 10:00 à Paris (machine en ${tz})`, () => {
      process.env.TZ = tz
      render(<PlanTimeEditor planId="p1" serviceDate="2026-07-05T08:00:00.000Z" />)
      expect(screen.getByRole('button')).toHaveTextContent('10:00')
    })

    it(`culte à 00h30 Paris (23h30 UTC la veille) : le jour envoyé est celui de Paris (machine en ${tz})`, async () => {
      process.env.TZ = tz
      render(<PlanTimeEditor planId="p1" serviceDate="2026-11-07T23:30:00.000Z" />)
      const trigger = screen.getByRole('button')
      expect(trigger).toHaveTextContent('00:30')

      fireEvent.click(trigger)
      const input = document.querySelector('input[type="time"]') as HTMLInputElement
      expect(input.value).toBe('00:30')
      fireEvent.change(input, { target: { value: '01:00' } })
      fireEvent.blur(input)

      // 8 novembre (jour de Paris), et non le 7 (jour UTC) ni un jour décalé par le fuseau de la machine.
      await waitFor(() => expect(movePlanMock).toHaveBeenCalledWith('p1', '2026-11-08T01:00'))
    })
  }
})
