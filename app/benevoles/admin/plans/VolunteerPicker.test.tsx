import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'

const { addAssignmentAsyncMock, stableRouter } = vi.hoisted(() => ({
  addAssignmentAsyncMock: vi.fn(async () => ({ ok: true })),
  stableRouter: { push: vi.fn(), refresh: vi.fn() },
}))

vi.mock('./actions', () => ({ addAssignmentAsync: addAssignmentAsyncMock }))
vi.mock('next/navigation', () => ({ useRouter: () => stableRouter }))

const { VolunteerPicker } = await import('./VolunteerPicker')

afterEach(() => { cleanup(); vi.clearAllMocks() })

function profile(id: string, first: string, over: Record<string, unknown> = {}) {
  return { id, first_name: first, last_name: 'Test', unavailable: false, recentCount: 0, desired_frequency: null, servedThisMonth: 0, ...over }
}

const PAUL = profile('paul', 'Paul', { unavailable: true })
const BEA = profile('bea', 'Béa')
const BOB = profile('bob', 'Bob', { recentCount: 5 }) // charge élevée

function detailWith(team: Record<string, unknown>) {
  return {
    plan: { id: 'plan-1', title: 'Culte', service_date: '2026-11-08T09:00:00.000Z', notes: null, plan_type: 'sunday_service', team_ids: null, excluded_position_ids: null },
    teams: [{
      id: 'team-1', name: 'Louange', allowsGuests: false, isCoordination: false, hidePositions: false, isPrayerMeeting: false,
      visible: true, isMyTeam: true, positions: [{ id: 'pos-1', name: 'Piano' }], assignments: [],
      candidateProfiles: [], candidatesByPosition: {}, ...team,
    }],
  } as never
}

function row(name: string) {
  // la ligne du bénévole = le plus proche ancêtre qui contient aussi un bouton/pastille d'action
  return screen.getByText(name).closest('div.flex.items-center.gap-3') as HTMLElement
}

describe('VolunteerPicker (desktop) — un indisponible n’est jamais assignable', () => {
  const renderPicker = (team: Record<string, unknown>, fillKey = 'pos:pos-1') =>
    render(<VolunteerPicker planId="plan-1" detail={detailWith(team)} fillKey={fillKey} onClose={() => {}} />)

  it("n'affiche PAS de bouton « Assigner » pour un bénévole indisponible, mais une pastille « Indisponible »", () => {
    renderPicker({ candidatesByPosition: { 'pos-1': [PAUL, BEA] } })

    expect(within(row('Paul Test')).queryByRole('button', { name: 'Assigner' })).toBeNull()
    expect(within(row('Paul Test')).getByText('Indisponible')).toBeInTheDocument()
    expect(within(row('Béa Test')).getByRole('button', { name: 'Assigner' })).toBeInTheDocument()
  })

  it('range l’indisponible sous « Indisponibles ce jour » avec la mention explicite', () => {
    renderPicker({ candidatesByPosition: { 'pos-1': [PAUL, BEA] } })

    expect(screen.getByText(/Indisponibles ce jour · 1/)).toBeInTheDocument()
    expect(screen.getByText('Indisponible ce jour-là')).toBeInTheDocument()
    expect(screen.getByText(/Disponibles · 1/)).toBeInTheDocument()
  })

  it("assigner un bénévole disponible appelle l'action avec le bon bénévole, poste et équipe", async () => {
    renderPicker({ candidatesByPosition: { 'pos-1': [PAUL, BEA] } })

    fireEvent.click(within(row('Béa Test')).getByRole('button', { name: 'Assigner' }))

    await waitFor(() => expect(addAssignmentAsyncMock).toHaveBeenCalledTimes(1))
    expect(addAssignmentAsyncMock).toHaveBeenCalledWith({ planId: 'plan-1', teamId: 'team-1', userId: 'bea', positionId: 'pos-1' })
  })

  it("aucun clic possible sur l'indisponible : l'action n'est jamais appelée pour lui", () => {
    renderPicker({ candidatesByPosition: { 'pos-1': [PAUL] } })

    fireEvent.click(screen.getByText('Indisponible'))
    fireEvent.click(screen.getByText('Paul Test'))

    expect(addAssignmentAsyncMock).not.toHaveBeenCalled()
  })

  it('un bénévole en « charge élevée » reste assignable (avertissement seulement) — contrairement à l’indisponible', () => {
    renderPicker({ candidatesByPosition: { 'pos-1': [BOB, PAUL] } })

    expect(within(row('Bob Test')).getByRole('button', { name: 'Assigner' })).toBeInTheDocument()
    expect(within(row('Paul Test')).queryByRole('button', { name: 'Assigner' })).toBeNull()
  })

  it("même règle pour une équipe SANS postes nommés (pool de l'équipe entière)", () => {
    renderPicker({ positions: [], candidateProfiles: [PAUL, BEA] }, 'team:team-1')

    expect(within(row('Paul Test')).queryByRole('button', { name: 'Assigner' })).toBeNull()
    expect(within(row('Béa Test')).getByRole('button', { name: 'Assigner' })).toBeInTheDocument()
  })

  it('quand tout le monde est indisponible, aucun bouton « Assigner » n’existe dans le panneau', () => {
    renderPicker({ candidatesByPosition: { 'pos-1': [PAUL, profile('luc', 'Luc', { unavailable: true })] } })

    expect(screen.queryByRole('button', { name: 'Assigner' })).toBeNull()
  })
})
