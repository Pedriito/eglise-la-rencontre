import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, makeFakeSupabase } from '@/test/helpers/fakeSupabase'

const { revalidatePathMock, createClientMock, createAdminClientMock, addMock, removeMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
  addMock: vi.fn(),
  removeMock: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))
vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: createAdminClientMock }))
vi.mock('@/app/benevoles/admin/plans/actions', () => ({ addAssignmentAsync: addMock, removeAssignmentAsync: removeMock }))

const { assignTeamMember, moveTeamAssignment, removeTeamAssignment } = await import('./actions')

/** Client « cookie » : l'utilisateur connecté, sa permission, et son éventuel rôle dans l'équipe. */
function session(permission: string, teamRole: string | null = null) {
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'me' } } }) },
    from: (table: string) => ({
      select: () => {
        const builder: any = {
          eq: () => builder,
          single: () => Promise.resolve({ data: { permission } }),
          maybeSingle: () => Promise.resolve({ data: table === 'team_members' && teamRole ? { role: teamRole } : null }),
        }
        return builder
      },
    }),
  }
}

const FUTURE = '2099-03-08T09:00:00.000Z'
const PAST = '2001-03-08T09:00:00.000Z'

/** Fixtures de `refusalForTarget` : service, équipe (Piano + Basse), appartenance, affectations existantes. */
function target(over: { service_date?: string; member?: boolean; existing?: unknown[]; teamIds?: string[] | null } = {}) {
  return {
    plans: [ok({ service_date: over.service_date ?? FUTURE, plan_type: null, team_ids: over.teamIds ?? null, excluded_position_ids: null })],
    teams: [ok({ id: 'team-1', is_prayer_meeting: false, hide_positions: false, positions: [{ id: 'pos-piano', archived: false }, { id: 'pos-basse', archived: false }] })],
    team_members: [ok(over.member === false ? null : { user_id: 'u1' })],
    plan_assignments: [ok(over.existing ?? [])],
  }
}

const INPUT = { teamId: 'team-1', planId: 'plan-1', userId: 'u1', positionId: 'pos-piano' }

beforeEach(() => {
  vi.clearAllMocks()
  createClientMock.mockResolvedValue(session('admin'))
  addMock.mockResolvedValue({ ok: true })
  removeMock.mockResolvedValue({ ok: true })
})

describe('contrôle d’accès', () => {
  it('refuse un éditeur qui n’est pas responsable de l’équipe, sans rien écrire', async () => {
    createClientMock.mockResolvedValue(session('editor', 'member'))
    const res = await assignTeamMember(INPUT)
    expect(res).toEqual({ ok: false, error: "Tu n'es pas responsable de cette équipe." })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('refuse un simple bénévole même s’il est leader de l’équipe', async () => {
    createClientMock.mockResolvedValue(session('member', 'leader'))
    expect((await assignTeamMember(INPUT)).ok).toBe(false)
    expect(addMock).not.toHaveBeenCalled()
  })

  it('accepte un éditeur responsable de l’équipe', async () => {
    createClientMock.mockResolvedValue(session('editor', 'leader'))
    createAdminClientMock.mockReturnValue(makeFakeSupabase(target()))
    expect(await assignTeamMember(INPUT)).toEqual({ ok: true })
  })
})

describe('assignTeamMember', () => {
  it('délègue la création (avec l’équipe) et rafraîchit la page', async () => {
    createAdminClientMock.mockReturnValue(makeFakeSupabase(target()))
    expect(await assignTeamMember(INPUT)).toEqual({ ok: true })
    expect(addMock).toHaveBeenCalledWith({ planId: 'plan-1', userId: 'u1', positionId: 'pos-piano', teamId: 'team-1' })
    expect(revalidatePathMock).toHaveBeenCalledWith('/benevoles/equipe')
  })

  it('refuse un service déjà passé', async () => {
    createAdminClientMock.mockReturnValue(makeFakeSupabase(target({ service_date: PAST })))
    const res = await assignTeamMember(INPUT)
    expect(res).toEqual({ ok: false, error: 'Ce service est déjà passé.' })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('refuse quelqu’un qui n’est pas membre de l’équipe', async () => {
    createAdminClientMock.mockReturnValue(makeFakeSupabase(target({ member: false })))
    expect((await assignTeamMember(INPUT)).error).toMatch(/ne fait pas partie/)
    expect(addMock).not.toHaveBeenCalled()
  })

  it('refuse un service qui ne concerne pas l’équipe', async () => {
    createAdminClientMock.mockReturnValue(makeFakeSupabase(target({ teamIds: ['team-2'] })))
    expect((await assignTeamMember(INPUT)).error).toMatch(/pas concernée/)
  })

  it('refuse un poste inconnu de l’équipe', async () => {
    createAdminClientMock.mockReturnValue(makeFakeSupabase(target()))
    expect((await assignTeamMember({ ...INPUT, positionId: 'pos-autre' })).error).toMatch(/pas disponible/)
  })

  it('exige un poste quand l’équipe en a', async () => {
    createAdminClientMock.mockReturnValue(makeFakeSupabase(target()))
    expect((await assignTeamMember({ ...INPUT, positionId: null })).error).toBe('Choisis un poste.')
  })

  it('refuse un doublon sur le même poste', async () => {
    createAdminClientMock.mockReturnValue(makeFakeSupabase(target({ existing: [{ id: 'x', position_id: 'pos-piano' }] })))
    expect((await assignTeamMember(INPUT)).error).toMatch(/déjà affectée/)
  })

  it('remonte le refus d’indisponibilité de l’action déléguée, sans rafraîchir', async () => {
    createAdminClientMock.mockReturnValue(makeFakeSupabase(target()))
    addMock.mockResolvedValue({ ok: false, error: 'Léa a déclaré une indisponibilité : affectation refusée.' })
    expect(await assignTeamMember(INPUT)).toEqual({ ok: false, error: 'Léa a déclaré une indisponibilité : affectation refusée.' })
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})

describe('moveTeamAssignment', () => {
  const MOVE = { teamId: 'team-1', assignmentId: 'a1', toPlanId: 'plan-2', toUserId: 'u1', positionId: 'pos-piano' }
  const source = (over = {}) => ok({ id: 'a1', plan_id: 'plan-1', user_id: 'u1', position_id: 'pos-piano', team_id: 'team-1', positions: null, ...over })

  function adminFor(src: ReturnType<typeof source>, over: Parameters<typeof target>[0] = {}) {
    const t = target(over)
    return makeFakeSupabase({ ...t, plan_assignments: [src, ...t.plan_assignments] })
  }

  it('crée la nouvelle affectation puis retire l’ancienne', async () => {
    createAdminClientMock.mockReturnValue(adminFor(source()))
    expect(await moveTeamAssignment(MOVE)).toEqual({ ok: true })
    expect(addMock).toHaveBeenCalledWith({ planId: 'plan-2', userId: 'u1', positionId: 'pos-piano', teamId: 'team-1' })
    expect(removeMock).toHaveBeenCalledWith('a1', 'plan-1')
    expect(addMock.mock.invocationCallOrder[0]).toBeLessThan(removeMock.mock.invocationCallOrder[0])
  })

  it('conserve l’ancienne affectation si la nouvelle est refusée (ex : indisponibilité)', async () => {
    createAdminClientMock.mockReturnValue(adminFor(source()))
    addMock.mockResolvedValue({ ok: false, error: 'indisponible' })
    expect(await moveTeamAssignment(MOVE)).toEqual({ ok: false, error: 'indisponible' })
    expect(removeMock).not.toHaveBeenCalled()
  })

  it('ne fait rien quand la cible est la case d’origine', async () => {
    createAdminClientMock.mockReturnValue(adminFor(source()))
    expect(await moveTeamAssignment({ ...MOVE, toPlanId: 'plan-1' })).toEqual({ ok: true })
    expect(addMock).not.toHaveBeenCalled()
    expect(removeMock).not.toHaveBeenCalled()
  })

  it('refuse de toucher à l’affectation d’une autre équipe', async () => {
    createAdminClientMock.mockReturnValue(adminFor(source({ team_id: 'team-2' })))
    expect((await moveTeamAssignment(MOVE)).error).toMatch(/n'appartient pas/)
    expect(addMock).not.toHaveBeenCalled()
  })

  it('signale une ancienne affectation non retirée', async () => {
    createAdminClientMock.mockReturnValue(adminFor(source()))
    removeMock.mockResolvedValue({ ok: false, error: 'db down' })
    const res = await moveTeamAssignment(MOVE)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/ancienne n'a pas pu être retirée/)
  })
})

describe('removeTeamAssignment', () => {
  it('retire une affectation de l’équipe', async () => {
    createAdminClientMock.mockReturnValue(makeFakeSupabase({
      plan_assignments: [ok({ id: 'a1', plan_id: 'plan-1', user_id: 'u1', position_id: null, team_id: 'team-1', positions: null })],
    }))
    expect(await removeTeamAssignment({ teamId: 'team-1', assignmentId: 'a1' })).toEqual({ ok: true })
    expect(removeMock).toHaveBeenCalledWith('a1', 'plan-1')
  })

  it('refuse une affectation d’une autre équipe', async () => {
    createAdminClientMock.mockReturnValue(makeFakeSupabase({
      plan_assignments: [ok({ id: 'a1', plan_id: 'plan-1', user_id: 'u1', position_id: null, team_id: 'team-2', positions: null })],
    }))
    expect((await removeTeamAssignment({ teamId: 'team-1', assignmentId: 'a1' })).ok).toBe(false)
    expect(removeMock).not.toHaveBeenCalled()
  })
})
