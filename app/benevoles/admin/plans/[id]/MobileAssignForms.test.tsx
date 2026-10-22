import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'

vi.mock('../actions', () => ({ addAssignment: vi.fn() }))

const { MobileOpenSlot } = await import('./MobileOpenSlot')
const { AddAssignmentForm } = await import('./AddAssignmentForm')

afterEach(cleanup)

function profile(id: string, first: string, over: Record<string, unknown> = {}) {
  return { id, first_name: first, last_name: 'Test', unavailable: false, recentCount: 0, desired_frequency: null, servedThisMonth: 0, ...over }
}
const PAUL = profile('paul', 'Paul', { unavailable: true })
const BEA = profile('bea', 'Béa')

function optionOf(select: HTMLElement, text: string) {
  return within(select).getByText(new RegExp(text)) as HTMLOptionElement
}

describe('MobileOpenSlot — créneau à pourvoir (mobile / PWA)', () => {
  function open(candidates: ReturnType<typeof profile>[]) {
    render(<MobileOpenSlot planId="p1" teamId="t1" positionId="pos1" positionName="Piano" candidates={candidates as never} isInviteTeam={false} />)
    fireEvent.click(screen.getByRole('button', { name: /Piano/ }))
    return screen.getByRole('combobox')
  }

  it("l'option d'un indisponible est DÉSACTIVÉE (non sélectionnable) et porte la mention « indisponible »", () => {
    const select = open([PAUL, BEA])

    expect(optionOf(select, 'Paul Test').disabled).toBe(true)
    expect(optionOf(select, 'Paul Test').textContent).toContain('indisponible')
    expect(optionOf(select, 'Béa Test').disabled).toBe(false)
  })

  it("désactivée aussi quand TOUS les candidats sont indisponibles (pas de groupe « Disponibles »)", () => {
    const select = open([PAUL, profile('luc', 'Luc', { unavailable: true })])

    expect(optionOf(select, 'Paul Test').disabled).toBe(true)
    expect(optionOf(select, 'Luc Test').disabled).toBe(true)
  })

  it('un disponible reste sélectionnable', () => {
    const select = open([PAUL, BEA])

    fireEvent.change(select, { target: { value: 'bea' } })
    expect((select as HTMLSelectElement).value).toBe('bea')
  })
})

describe('AddAssignmentForm — ajout libre en bas du bloc équipe (mobile)', () => {
  function renderForm(profiles: ReturnType<typeof profile>[]) {
    render(
      <AddAssignmentForm
        planId="p1" teamId="t1" teamPositions={[]} teamProfiles={profiles as never}
        candidatesByPosition={{}} isInviteTeam={false} hidePositions={false}
      />,
    )
    return screen.getAllByRole('combobox').at(-1)!
  }

  it("désactive l'option d'un indisponible, libellée « indisponible »", () => {
    const select = renderForm([PAUL, BEA])

    expect(optionOf(select, 'Paul Test').disabled).toBe(true)
    expect(optionOf(select, 'Paul Test').textContent).toContain('indisponible')
    expect(optionOf(select, 'Béa Test').disabled).toBe(false)
  })

  it("désactive aussi quand tous sont indisponibles", () => {
    const select = renderForm([PAUL])

    expect(optionOf(select, 'Paul Test').disabled).toBe(true)
  })
})
