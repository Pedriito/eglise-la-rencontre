import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react'

// Parcours desktop complet (tableau + panneau de choix) pour les postes qui acceptent plusieurs
// bénévoles (Chorale, Choriste). Régression : le desktop n'offrait aucun créneau pour un 2e
// choriste (le drapeau `allow_multiple` n'était pas chargé), alors que le mobile le permettait.
vi.mock('./PlanTimeEditor', () => ({ PlanTimeEditor: () => null }))
vi.mock('./[id]/SongsSection', () => ({ SongsSection: () => null }))
vi.mock('./[id]/CopySetlistButton', () => ({ CopySetlistButton: () => null }))
vi.mock('./[id]/AnnoncesSection', () => ({ default: () => null }))
vi.mock('./[id]/SermonSection', () => ({ default: () => null }))
vi.mock('./[id]/VideoSection', () => ({ default: () => null }))
vi.mock('./[id]/ShareButton', () => ({ default: () => null }))
vi.mock('./[id]/AddPlanDateForm', () => ({ AddPlanDateForm: () => null }))
vi.mock('./[id]/PlanTeamsManager', () => ({ PlanTeamsManager: () => null }))

const { addAssignmentAsyncMock, stableRouter } = vi.hoisted(() => ({
  addAssignmentAsyncMock: vi.fn(async (_input: unknown) => ({ ok: true }) as { ok: boolean; error?: string }),
  stableRouter: { push: vi.fn(), refresh: vi.fn() },
}))

vi.mock('./actions', () => ({
  deletePlan: vi.fn(),
  sendSingleInvitation: vi.fn(),
  excludePlanPositionAsync: vi.fn(async () => ({ ok: true })),
  addAssignmentAsync: addAssignmentAsyncMock,
  removeAssignmentAsync: vi.fn(async () => ({ ok: true })),
  setDmHolder: vi.fn(async () => ({ ok: true })),
}))
vi.mock('next/navigation', () => ({ useRouter: () => stableRouter }))
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))

const { PlanWorkspace } = await import('./PlanWorkspace')

afterEach(() => { cleanup(); vi.clearAllMocks() })

const profile = (id: string, first: string, over: Record<string, unknown> = {}) => ({
  id, first_name: first, last_name: 'Test', unavailable: false, recentCount: 0,
  desired_frequency: null, servedThisMonth: 0, ...over,
})
const BEA = profile('bea', 'Béa')
const BOB = profile('bob', 'Bob')
const CHLOE = profile('chloe', 'Chloé')
const PAUL = profile('paul', 'Paul')
const NINA = profile('nina', 'Nina')

const POS_CHORISTE = { id: 'pos-choriste', name: 'Choriste', allow_multiple: true }
const POS_PIANO = { id: 'pos-piano', name: 'Piano', allow_multiple: false }

function assignmentOf(user: ReturnType<typeof profile>, pos: typeof POS_CHORISTE) {
  return {
    id: `a-${user.id}-${pos.id}`, status: 'pending', user_id: user.id, position_id: pos.id, team_id: 'team-1',
    external_name: null, external_email: null, invitation_sent_at: null,
    profiles: { first_name: user.first_name, last_name: user.last_name },
    positions: { id: pos.id, name: pos.name, team_id: 'team-1' }, unavailable: false,
  }
}

/** Détail tel que le serveur le renverrait : `assigned` = affectations déjà enregistrées ; les
 *  candidats d'un poste excluent ceux qui l'occupent déjà (comme `getPlanDetail`). */
function detail(assigned: { user: ReturnType<typeof profile>; pos: typeof POS_CHORISTE }[], pool: ReturnType<typeof profile>[] = [BEA, BOB, CHLOE]) {
  const candidatesFor = (pos: typeof POS_CHORISTE) =>
    pool.filter(p => !assigned.some(a => a.pos.id === pos.id && a.user.id === p.id))
  return {
    plan: { id: 'plan-1', title: 'Culte', service_date: '2026-11-08T09:00:00.000Z', notes: null, plan_type: 'sunday_service', team_ids: null, excluded_position_ids: null },
    isRehearsal: false,
    teams: [{
      id: 'team-1', name: 'Louange', allowsGuests: false, isCoordination: false, hidePositions: false, isPrayerMeeting: false,
      visible: true, isMyTeam: true,
      positions: [POS_CHORISTE, POS_PIANO],
      assignments: assigned.map(a => assignmentOf(a.user, a.pos)),
      candidateProfiles: pool,
      candidatesByPosition: { [POS_CHORISTE.id]: candidatesFor(POS_CHORISTE), [POS_PIANO.id]: candidatesFor(POS_PIANO as never) },
    }],
    availableTeams: [], noTeamAssignments: [], pendingCount: 0, planSongs: [], allSongs: [],
    announcements: [], recurringAnnouncements: [], sermons: [], videos: [],
  } as never
}

const props = { planId: 'plan-1', userId: 'viewer', isAdmin: true, returnTo: '/benevoles/admin/plans' }

function personRow(name: string) {
  return screen.getByText(name).closest('div.flex.items-center.gap-3') as HTMLElement
}
const assignButtonOf = (name: string) => within(personRow(name)).getByRole('button', { name: 'Assigner' })

describe('desktop — plusieurs choristes sur un même service', () => {
  it('poste multi encore vide : créneau « à pourvoir » orange', () => {
    render(<PlanWorkspace {...props} detail={detail([])} />)
    const slot = screen.getByText('Choriste', { selector: 'p' }).closest('button') as HTMLElement
    expect(within(slot).getByText('Poste à pourvoir')).toBeInTheDocument()
    expect(screen.queryByText('Ajouter quelqu’un d’autre')).toBeNull()
  })

  it('après le 1er choriste, un créneau « Ajouter quelqu’un d’autre » reste disponible', () => {
    render(<PlanWorkspace {...props} detail={detail([{ user: BEA, pos: POS_CHORISTE }])} />)
    expect(screen.getByText('Ajouter quelqu’un d’autre')).toBeInTheDocument()
  })

  it('un poste à occupant unique pourvu (Piano) n’offre PAS de créneau supplémentaire', () => {
    render(<PlanWorkspace {...props} detail={detail([{ user: PAUL, pos: POS_PIANO as never }], [PAUL, NINA])} />)
    expect(screen.queryByText('Ajouter quelqu’un d’autre')).toBeNull()
  })

  it('enchaîne 3 choristes : le panneau reste ouvert et ne reproposera jamais celui déjà affecté', async () => {
    const view = render(<PlanWorkspace {...props} detail={detail([])} />)

    // 1) clic sur le créneau vide → panneau avec les 3 candidats
    fireEvent.click(screen.getByText('Choriste', { selector: 'p' }))
    expect(screen.getByText(/Disponibles · 3/)).toBeInTheDocument()

    fireEvent.click(assignButtonOf('Béa Test'))
    await waitFor(() => expect(addAssignmentAsyncMock).toHaveBeenCalledTimes(1))
    expect(addAssignmentAsyncMock).toHaveBeenLastCalledWith({ planId: 'plan-1', teamId: 'team-1', userId: 'bea', positionId: 'pos-choriste' })

    // 2) le serveur rafraîchit : Béa est affectée. Le panneau est TOUJOURS ouvert, sans Béa.
    view.rerender(<PlanWorkspace {...props} detail={detail([{ user: BEA, pos: POS_CHORISTE }])} />)
    expect(screen.getByText(/Disponibles · 2/)).toBeInTheDocument()
    expect(within(screen.getByText(/Disponibles · 2/).parentElement as HTMLElement).queryByText('Béa Test')).toBeNull()

    fireEvent.click(assignButtonOf('Bob Test'))
    await waitFor(() => expect(addAssignmentAsyncMock).toHaveBeenCalledTimes(2))
    expect(addAssignmentAsyncMock).toHaveBeenLastCalledWith({ planId: 'plan-1', teamId: 'team-1', userId: 'bob', positionId: 'pos-choriste' })

    // 3) troisième choriste
    view.rerender(<PlanWorkspace {...props} detail={detail([{ user: BEA, pos: POS_CHORISTE }, { user: BOB, pos: POS_CHORISTE }])} />)
    expect(screen.getByText(/Disponibles · 1/)).toBeInTheDocument()
    fireEvent.click(assignButtonOf('Chloé Test'))
    await waitFor(() => expect(addAssignmentAsyncMock).toHaveBeenCalledTimes(3))
    expect(addAssignmentAsyncMock).toHaveBeenLastCalledWith({ planId: 'plan-1', teamId: 'team-1', userId: 'chloe', positionId: 'pos-choriste' })

    // Les trois choristes sont affichés sur le tableau, le créneau d'ajout reste proposé.
    view.rerender(<PlanWorkspace {...props} detail={detail([
      { user: BEA, pos: POS_CHORISTE }, { user: BOB, pos: POS_CHORISTE }, { user: CHLOE, pos: POS_CHORISTE },
    ])} />)
    expect(screen.getAllByText('Choriste', { selector: 'p' }).length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText('Ajouter quelqu’un d’autre')).toBeInTheDocument()
  })

  it('la personne affectée disparaît du panneau tout de suite, même si le serveur n’a pas encore rafraîchi', async () => {
    // Le rafraîchissement serveur peut tarder (ou être abandonné par React) : sans masquage local,
    // on pourrait recliquer sur la même personne et provoquer un doublon.
    render(<PlanWorkspace {...props} detail={detail([])} />)
    fireEvent.click(screen.getByText('Choriste', { selector: 'p' }))
    expect(screen.getByText(/Disponibles · 3/)).toBeInTheDocument()

    fireEvent.click(assignButtonOf('Béa Test'))
    await waitFor(() => expect(addAssignmentAsyncMock).toHaveBeenCalledTimes(1))

    await waitFor(() => expect(screen.getByText(/Disponibles · 2/)).toBeInTheDocument())
    expect(screen.queryByText('Béa Test')).toBeNull()
    expect(screen.getByText('Choisir un bénévole')).toBeInTheDocument()
  })

  it('poste à occupant unique : le panneau se referme après l’affectation (comportement inchangé)', async () => {
    render(<PlanWorkspace {...props} detail={detail([], [PAUL, NINA])} />)

    fireEvent.click(screen.getByText('Piano', { selector: 'p' }))
    expect(screen.getByText('Choisir un bénévole')).toBeInTheDocument()

    fireEvent.click(assignButtonOf('Paul Test'))
    await waitFor(() => expect(addAssignmentAsyncMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByText('Choisir un bénévole')).toBeNull())
  })

  it('un échec d’affectation garde le panneau ouvert et affiche l’erreur', async () => {
    addAssignmentAsyncMock.mockResolvedValueOnce({ ok: false, error: 'Doublon refusé' })
    render(<PlanWorkspace {...props} detail={detail([])} />)

    fireEvent.click(screen.getByText('Choriste', { selector: 'p' }))
    fireEvent.click(assignButtonOf('Béa Test'))

    expect(await screen.findByText('Doublon refusé')).toBeInTheDocument()
    expect(screen.getByText('Choisir un bénévole')).toBeInTheDocument()
  })

  it('un choriste indisponible reste non assignable même en enchaînant les ajouts', () => {
    render(<PlanWorkspace {...props} detail={detail([{ user: BEA, pos: POS_CHORISTE }], [BEA, profile('luc', 'Luc', { unavailable: true }), BOB])} />)

    fireEvent.click(screen.getByText('Ajouter quelqu’un d’autre'))
    expect(within(personRow('Luc Test')).queryByRole('button', { name: 'Assigner' })).toBeNull()
    expect(within(personRow('Luc Test')).getByText('Indisponible')).toBeInTheDocument()
    expect(assignButtonOf('Bob Test')).toBeInTheDocument()
  })
})
