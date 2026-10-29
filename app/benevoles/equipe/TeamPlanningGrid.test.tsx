import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import type { TeamPlanning } from '@/lib/teamPlanning'

const { assignMock, moveMock, removeMock } = vi.hoisted(() => ({ assignMock: vi.fn(), moveMock: vi.fn(), removeMock: vi.fn() }))
vi.mock('./actions', () => ({ assignTeamMember: assignMock, moveTeamAssignment: moveMock, removeTeamAssignment: removeMock }))

const { TeamPlanningGrid } = await import('./TeamPlanningGrid')

const plan = (id: string, serviceDate: string, past = false) => ({
  id, title: 'Culte', serviceDate, day: serviceDate.slice(0, 10), planType: null, past,
  excludedPositionIds: [], openPositions: [], filled: 0, total: 2,
})

const PLANNING: TeamPlanning = {
  team: { id: 'team-1', name: 'Louange', hidePositions: false, positions: [{ id: 'pos-piano', name: 'Piano' }, { id: 'pos-basse', name: 'Basse' }] },
  month: '2099-03',
  plans: [plan('p1', '2099-03-01T09:00:00Z'), plan('p2', '2099-03-08T09:00:00Z'), plan('p3', '2001-03-15T09:00:00Z', true)],
  members: [
    { id: 'bob', firstName: 'Bob', lastName: 'B', isLeader: false, positionIds: ['pos-piano'], servedCount: 1, desiredFrequency: null },
    { id: 'lea', firstName: 'Léa', lastName: 'L', isLeader: true, positionIds: [], servedCount: 0, desiredFrequency: null },
  ],
  assignments: [{ id: 'a1', planId: 'p1', userId: 'bob', positionId: 'pos-piano', positionName: 'Piano', status: 'confirmed' }],
  unavailable: [{ userId: 'bob', planId: 'p2' }],
  elsewhere: [],
}

const dt = () => ({ setData: vi.fn(), effectAllowed: '', dropEffect: '' })

/** Cellule (membre × n-ième service). Les lignes suivent l'ordre de `members`, les colonnes celui de `plans`. */
function cell(rowName: string, planIndex: number) {
  const row = screen.getByText(new RegExp(`^${rowName}`)).closest('tr')!
  return row.querySelectorAll('td')[planIndex] as HTMLElement
}

beforeEach(() => {
  assignMock.mockResolvedValue({ ok: true })
  moveMock.mockResolvedValue({ ok: true })
  removeMock.mockResolvedValue({ ok: true })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('TeamPlanningGrid', () => {
  it('affiche l’indisponibilité sans proposer de planifier, et grise les services passés', () => {
    render(<TeamPlanningGrid planning={PLANNING} />)
    expect(cell('Bob', 1)).toHaveTextContent('Indispo')
    expect(cell('Bob', 1).querySelector('button')).toBeNull()
    expect(cell('Bob', 2).querySelector('button')).toBeNull()
  })

  it('« + » demande le poste quand le membre peut en tenir plusieurs', async () => {
    render(<TeamPlanningGrid planning={PLANNING} />)
    // Léa n'a aucun poste coché → tous ceux de l'équipe sont proposés
    fireEvent.click(screen.getByRole('button', { name: /Planifier Léa le .*1/ }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Basse' }))
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith({ teamId: 'team-1', planId: 'p1', userId: 'lea', positionId: 'pos-basse' }))
  })

  it('un nom glissé sur un service planifie ce membre (poste unique choisi d’office)', async () => {
    const planning = { ...PLANNING, assignments: [], unavailable: [] }
    render(<TeamPlanningGrid planning={planning} />)
    const handle = screen.getByText(/^Bob/).closest('[draggable]')!
    const data = dt()
    fireEvent.dragStart(handle, { dataTransfer: data })
    fireEvent.drop(cell('Léa', 1), { dataTransfer: data }) // dépôt sur la colonne : c'est le membre glissé qui est planifié
    await waitFor(() => expect(assignMock).toHaveBeenCalledWith({ teamId: 'team-1', planId: 'p2', userId: 'bob', positionId: 'pos-piano' }))
  })

  it('une pastille glissée vers un autre service est déplacée en gardant son poste', async () => {
    render(<TeamPlanningGrid planning={{ ...PLANNING, unavailable: [] }} />)
    const chip = screen.getByText('Piano').closest('[draggable]')!
    const data = dt()
    fireEvent.dragStart(chip, { dataTransfer: data })
    fireEvent.drop(cell('Bob', 1), { dataTransfer: data })
    await waitFor(() =>
      expect(moveMock).toHaveBeenCalledWith({ teamId: 'team-1', assignmentId: 'a1', toPlanId: 'p2', toUserId: 'bob', positionId: 'pos-piano' }),
    )
  })

  it('confier une place à un membre non qualifié pour ce poste demande le poste au lieu de le convertir', async () => {
    const planning = {
      ...PLANNING, unavailable: [],
      assignments: [{ id: 'a2', planId: 'p1', userId: 'lea', positionId: 'pos-basse', positionName: 'Basse', status: 'pending' }],
    }
    render(<TeamPlanningGrid planning={planning} />)
    const chip = screen.getByText('Basse').closest('[draggable]')!
    const data = dt()
    fireEvent.dragStart(chip, { dataTransfer: data })
    fireEvent.drop(cell('Bob', 0), { dataTransfer: data }) // Bob n'est coché que pour Piano
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByRole('button').filter(b => b.textContent === 'Piano').length).toBeGreaterThan(0)
    expect(moveMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(moveMock).not.toHaveBeenCalled()
  })

  it('refuse un dépôt sur une indisponibilité en expliquant pourquoi, sans appeler le serveur', async () => {
    render(<TeamPlanningGrid planning={PLANNING} />)
    const chip = screen.getByText('Piano').closest('[draggable]')!
    const data = dt()
    fireEvent.dragStart(chip, { dataTransfer: data })
    // La case accepte le dépôt (sinon le navigateur n'enverrait pas `drop` et le refus resterait muet)
    expect(fireEvent.dragOver(cell('Bob', 1), { dataTransfer: data })).toBe(false)
    fireEvent.drop(cell('Bob', 1), { dataTransfer: data })
    expect(await screen.findByRole('alert')).toHaveTextContent(/Bob a déclaré une indisponibilité/)
    expect(moveMock).not.toHaveBeenCalled()
  })

  it('refuse un dépôt sur un service passé en expliquant pourquoi', () => {
    render(<TeamPlanningGrid planning={PLANNING} />)
    const handle = screen.getByText(/^Bob/).closest('[draggable]')!
    const data = dt()
    fireEvent.dragStart(handle, { dataTransfer: data })
    expect(fireEvent.dragOver(cell('Léa', 2), { dataTransfer: data })).toBe(false)
    fireEvent.drop(cell('Léa', 2), { dataTransfer: data })
    expect(assignMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Ce service est déjà passé.')
  })

  it('affiche l’erreur du serveur quand l’action est refusée', async () => {
    assignMock.mockResolvedValue({ ok: false, error: 'Ce service est déjà passé.' })
    render(<TeamPlanningGrid planning={{ ...PLANNING, assignments: [], unavailable: [] }} />)
    fireEvent.click(screen.getByRole('button', { name: /Planifier Bob le .*1/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ce service est déjà passé.')
  })

  it('« × » retire l’affectation', async () => {
    render(<TeamPlanningGrid planning={PLANNING} />)
    fireEvent.click(screen.getByRole('button', { name: /Retirer Bob/ }))
    await waitFor(() => expect(removeMock).toHaveBeenCalledWith({ teamId: 'team-1', assignmentId: 'a1' }))
  })
})
