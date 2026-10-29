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

describe('MobileOpenSlot — poste multi-bénévoles (Chorale, Choriste) : enchaîner plusieurs ajouts', () => {
  const CHLOE = profile('chloe', 'Chloé')
  const element = (candidates: ReturnType<typeof profile>[], variant: 'open' | 'more' = 'more') => (
    <MobileOpenSlot planId="p1" teamId="t1" positionId="pos1" positionName="Choriste" candidates={candidates as never} isInviteTeam={false} variant={variant} />
  )

  it("après un ajout, la personne affectée n'est plus candidate : la sélection repart à « — Choisir un bénévole — »", () => {
    const view = render(element([CHLOE, BEA]))
    fireEvent.click(screen.getByRole('button', { name: /Ajouter · Choriste/ }))
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'chloe' } })
    expect(select.value).toBe('chloe')

    // Rafraîchissement serveur : Chloé est affectée, il ne reste que Béa. Le formulaire reste ouvert.
    view.rerender(element([BEA]))

    const after = screen.getByRole('combobox') as HTMLSelectElement
    expect(after.value).toBe('')
    expect(within(after).queryByText(/Chloé Test/)).toBeNull()
    expect(optionOf(after, 'Béa Test').disabled).toBe(false)

    // Preuve que l'état interne a bien été vidé (et pas seulement masqué par le navigateur) : si
    // Chloé redevient candidate (affectation retirée), elle n'est PAS présélectionnée.
    view.rerender(element([CHLOE, BEA]))
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('')
  })

  it('ne touche pas à la sélection tant que la personne reste candidate', () => {
    const view = render(element([CHLOE, BEA]))
    fireEvent.click(screen.getByRole('button', { name: /Ajouter · Choriste/ }))
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'bea' } })

    view.rerender(element([BEA, profile('bob', 'Bob')]))
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('bea')
  })

  it("l'invité externe (Ext) n'est pas désélectionné par la mise à jour de la liste", () => {
    const view = render(
      <MobileOpenSlot planId="p1" teamId="t1" positionId="pos1" positionName="Choriste" candidates={[BEA] as never} isInviteTeam variant="more" />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Ajouter · Choriste/ }))
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: '00000000-0000-0000-0000-000000000001' } })

    view.rerender(<MobileOpenSlot planId="p1" teamId="t1" positionId="pos1" positionName="Choriste" candidates={[BEA] as never} isInviteTeam variant="more" />)
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('00000000-0000-0000-0000-000000000001')
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
