import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ok, makeFakeSupabase, type FakeResponse } from '@/test/helpers/fakeSupabase'

const { redirectMock, createClientMock, createAdminClientMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) }),
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: redirectMock }))
vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: createAdminClientMock }))

const { computeAutoFillProposal } = await import('./computeAutoFill')

/** Client "cookie" utilisé par `requireAdmin()` : auth.getUser() + vérification de permission. */
function fakeSessionClient(permission = 'admin') {
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'admin-1' } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { permission } }) }) }),
    }),
  }
}

const TARGET_PLAN = {
  id: 'plan-1',
  title: 'Culte du dimanche',
  service_date: '2026-12-06T10:00:00.000Z',
  team_ids: null,
  excluded_position_ids: null,
}
const TEAMS = [
  { id: 'team-1', name: 'Louange', positions: [{ id: 'pos-1', name: 'Guitare', team_id: 'team-1' }] },
]
const MEMBER_POSITIONS = [{ user_id: 'user-1', position_id: 'pos-1' }]
const PROFILES = [{ id: 'user-1', first_name: 'Alice', last_name: 'A', desired_frequency: null }]

/** Fixture "chemin heureux" complet : un plan, une équipe/poste, un bénévole qualifié,
 *  aucune affectation existante, aucune indisponibilité, aucun historique. */
function setupAdminClient(overrides: Partial<Record<string, FakeResponse[]>> = {}) {
  createAdminClientMock.mockReturnValue(
    makeFakeSupabase({
      plans: [ok([TARGET_PLAN]), ok([])], // 1er appel = plans de la plage, 2e = historique
      teams: [ok(TEAMS)],
      member_positions: [ok(MEMBER_POSITIONS)],
      profiles: [ok(PROFILES)],
      blockout_dates: [ok([])],
      plan_assignments: [ok([])],
      ...overrides,
    })
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  createClientMock.mockResolvedValue(fakeSessionClient())
})

describe('computeAutoFillProposal — permission', () => {
  it('redirige si le compte connecté ne peut pas gérer le planning', async () => {
    createClientMock.mockResolvedValue(fakeSessionClient('viewer'))
    createAdminClientMock.mockReturnValue(makeFakeSupabase({}))

    await expect(computeAutoFillProposal('2026-12-01', '2026-12-31')).rejects.toThrow('NEXT_REDIRECT')
  })
})

describe('computeAutoFillProposal — validation', () => {
  it('refuse une plage de dates invalide (fin avant début)', async () => {
    setupAdminClient()
    const result = await computeAutoFillProposal('2026-12-10', '2026-12-01')
    expect(result).toEqual({ ok: false, error: 'Plage de dates invalide.' })
  })
})

describe('computeAutoFillProposal — chemin heureux', () => {
  it('propose le bénévole qualifié pour le seul poste ouvert du plan', async () => {
    setupAdminClient()
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.skipped).toEqual([])
    expect(result.proposals).toHaveLength(1)
    expect(result.proposals[0]).toMatchObject({
      planId: 'plan-1', positionId: 'pos-1', userId: 'user-1', allowMultiple: false,
    })
  })

  it("renvoie un résultat vide (proposals ET skipped) si aucun plan n'existe sur la plage — sans planter", async () => {
    setupAdminClient({ plans: [ok([]), ok([])] })
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')
    expect(result).toEqual({ ok: true, proposals: [], skipped: [], scopeTeamNames: null })
  })
})

describe('computeAutoFillProposal — erreurs Supabase non avalées', () => {
  // Régression : la sélection de `teams.positions(...,allow_multiple,...)` échouait
  // silencieusement si la colonne n'existait pas en base, retombant sur `teams: []` et donc sur
  // "0 proposé · 0 non pourvu" — indiscernable d'un résultat légitimement vide. Toute erreur
  // Supabase doit maintenant remonter explicitement en `{ ok: false, error }`.
  it('remonte une erreur explicite si la requête `teams` échoue, plutôt que de rendre un résultat vide', async () => {
    setupAdminClient({ teams: [{ data: null, error: { message: 'column positions.allow_multiple does not exist' } }] })
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('teams')
    expect(result.error).toContain('allow_multiple')
  })

  it('remonte une erreur explicite si la requête `plans` échoue', async () => {
    setupAdminClient({ plans: [{ data: null, error: { message: 'network error' } }] })
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')
    expect(result).toEqual({ ok: false, error: 'Erreur base de données (plans) : network error' })
  })

  it('remonte une erreur explicite si la requête `plan_assignments` échoue', async () => {
    setupAdminClient({ plan_assignments: [{ data: null, error: { message: 'timeout' } }] })
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')
    expect(result).toEqual({ ok: false, error: 'Erreur base de données (plan_assignments) : timeout' })
  })
})

describe('computeAutoFillProposal — indisponibilités déclarées', () => {
  it("n'enrôle pas un bénévole indisponible le jour du service (le poste reste non pourvu)", async () => {
    setupAdminClient({ blockout_dates: [ok([{ user_id: 'user-1', start_date: '2026-12-06', end_date: '2026-12-06' }])] })
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.proposals).toEqual([])
    expect(result.skipped).toHaveLength(1)
  })

  it("rattache un culte à 00h30 (Paris, stocké 23h30 UTC la veille) au jour de l'indispo", async () => {
    setupAdminClient({
      plans: [ok([{ ...TARGET_PLAN, service_date: '2026-12-05T23:30:00.000Z' }]), ok([])],
      blockout_dates: [ok([{ user_id: 'user-1', start_date: '2026-12-06', end_date: '2026-12-06' }])],
    })
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')

    expect(result.ok && result.proposals).toEqual([])
  })

  it('remonte une erreur explicite si la lecture des indisponibilités échoue (jamais « personne n’est indisponible »)', async () => {
    setupAdminClient({ blockout_dates: [{ data: null, error: { message: 'connection reset' } }] })
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')

    expect(result).toEqual({ ok: false, error: 'Erreur base de données (blockout_dates) : connection reset' })
  })
})

describe('computeAutoFillProposal — seules les équipes dont on est responsable sont planifiées', () => {
  const TWO_TEAMS = [
    { id: 'team-1', name: 'Louange', positions: [{ id: 'pos-1', name: 'Guitare', team_id: 'team-1' }] },
    { id: 'team-2', name: 'Accueil', positions: [{ id: 'pos-2', name: 'Hôte', team_id: 'team-2' }] },
  ]
  const BOTH_QUALIFIED = [
    { user_id: 'user-1', position_id: 'pos-1' },
    { user_id: 'user-2', position_id: 'pos-2' },
  ]
  const TWO_PROFILES = [
    { id: 'user-1', first_name: 'Alice', last_name: 'A', desired_frequency: null },
    { id: 'user-2', first_name: 'Bob', last_name: 'B', desired_frequency: null },
  ]
  const setupTwoTeams = (team_members: FakeResponse[]) =>
    setupAdminClient({ teams: [ok(TWO_TEAMS)], member_positions: [ok(BOTH_QUALIFIED)], profiles: [ok(TWO_PROFILES)], team_members })

  it('un administrateur voit toutes les équipes (comportement inchangé)', async () => {
    setupTwoTeams([])
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.proposals.map(p => p.teamName).sort()).toEqual(['Accueil', 'Louange'])
    expect(result.scopeTeamNames).toBeNull()
  })

  it('un éditeur responsable de Louange ne reçoit des propositions QUE pour Louange', async () => {
    createClientMock.mockResolvedValue(fakeSessionClient('editor'))
    setupTwoTeams([ok([{ team_id: 'team-1' }])])
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.proposals.map(p => [p.teamName, p.positionName])).toEqual([['Louange', 'Guitare']])
    // Accueil n'est ni proposé ni listé comme « non pourvu » : il est hors périmètre.
    expect(result.skipped.map(s => s.teamName)).not.toContain('Accueil')
    expect(result.scopeTeamNames).toEqual(['Louange'])
  })

  it('un éditeur responsable de plusieurs équipes les reçoit toutes, et elles seules', async () => {
    createClientMock.mockResolvedValue(fakeSessionClient('editor'))
    setupTwoTeams([ok([{ team_id: 'team-1' }, { team_id: 'team-2' }])])
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.proposals.map(p => p.teamName).sort()).toEqual(['Accueil', 'Louange'])
    expect(result.scopeTeamNames).toEqual(['Accueil', 'Louange'])
  })

  it("un éditeur qui n'est responsable d'aucune équipe est refusé (aucune proposition)", async () => {
    createClientMock.mockResolvedValue(fakeSessionClient('editor'))
    setupTwoTeams([ok([])])
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/responsable d'aucune équipe/)
  })

  it('un éditeur dont la lecture des responsabilités échoue est refusé par précaution (jamais « toutes les équipes »)', async () => {
    createClientMock.mockResolvedValue(fakeSessionClient('editor'))
    setupTwoTeams([{ data: null, error: { message: 'db down' } }])
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/refusé par précaution/)
  })

  it("être simple membre d'une équipe (sans en être responsable) ne suffit pas", async () => {
    createClientMock.mockResolvedValue(fakeSessionClient('editor'))
    // La requête filtre role = 'leader' : un simple membre ne renvoie aucune ligne.
    setupTwoTeams([ok([])])
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')
    expect(result.ok).toBe(false)
  })

  it('le périmètre reste appliqué quand aucun service n’existe sur la plage (résultat vide mais borné)', async () => {
    createClientMock.mockResolvedValue(fakeSessionClient('editor'))
    setupAdminClient({ teams: [ok(TWO_TEAMS)], plans: [ok([]), ok([])], team_members: [ok([{ team_id: 'team-2' }])] })
    const result = await computeAutoFillProposal('2026-12-01', '2026-12-31')
    expect(result).toEqual({ ok: true, proposals: [], skipped: [], scopeTeamNames: ['Accueil'] })
  })
})
