import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, makeFakeSupabase } from '@/test/helpers/fakeSupabase'

const { redirectMock, revalidatePathMock, createClientMock, createAdminClientMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) }),
  revalidatePathMock: vi.fn(),
  createClientMock: vi.fn(),
  createAdminClientMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: redirectMock }))
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))
vi.mock('@/lib/supabase/server', () => ({ createClient: createClientMock }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: createAdminClientMock }))
vi.mock('@/lib/email', () => ({
  sendPlanAssignmentEmail: vi.fn(),
  sendCancellationNotificationEmail: vi.fn(),
  sendExternalGuestInvitationEmail: vi.fn(),
}))
vi.mock('@/lib/pushNotifications', () => ({ sendPushToUser: vi.fn(), sendPushToUsers: vi.fn() }))

const { setDmHolder, addAssignment, addAssignmentAsync, movePlan } = await import('./actions')

/** Client "cookie" utilisé par `requireAdmin()` : auth.getUser() + vérification de permission. */
function fakeSessionClient(permission = 'admin') {
  return {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'admin-1' } } }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { permission } }) }) }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  createClientMock.mockResolvedValue(fakeSessionClient())
})

/** Fixtures de la garde d'indisponibilité : jour du service (relu en base) + indispos lues. */
const planOn = (service_date: string) => ({ plans: [ok({ service_date })] })
const NO_BLOCKOUT = { blockout_dates: [ok([])] }
const blockoutFor = (user_id: string, start_date: string, end_date = start_date) =>
  ({ blockout_dates: [ok([{ user_id, start_date, end_date }])] })
const PAUL = { profiles: [ok([{ id: 'user-1', first_name: 'Paul', last_name: 'Piano' }])] }

describe('setDmHolder', () => {
  it("retire l'affectation DM sans la remplacer quand sourcePositionId est null (désélection)", async () => {
    createAdminClientMock.mockReturnValue(
      makeFakeSupabase({ plan_assignments: [ok(null)] }) // un seul appel : le delete
    )
    const result = await setDmHolder('plan-1', 'team-1', 'pos-dm', null)
    expect(result).toEqual({ ok: true })
  })

  it("copie l'affectation de l'instrument choisi (Piano/Basse/Batterie) vers le poste DM", async () => {
    createAdminClientMock.mockReturnValue(
      makeFakeSupabase({
        plan_assignments: [
          ok({ user_id: 'user-1' }), // select du titulaire actuel de l'instrument source
          ok(null),                  // delete de l'affectation DM existante
          ok(null),                  // insert de la nouvelle affectation DM
        ],
        ...planOn('2026-11-08T10:00:00.000Z'),
        ...NO_BLOCKOUT,
      })
    )
    const result = await setDmHolder('plan-1', 'team-1', 'pos-dm', 'pos-piano')
    expect(result).toEqual({ ok: true })
  })

  it("retourne une erreur explicite si personne n'est affecté à l'instrument source", async () => {
    createAdminClientMock.mockReturnValue(
      makeFakeSupabase({
        plan_assignments: [ok(null)], // select vide (maybeSingle -> null) : rien n'est supprimé ni inséré
      })
    )
    const result = await setDmHolder('plan-1', 'team-1', 'pos-dm', 'pos-piano')
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/personne d'affecté/)
  })

  it('remonte une erreur Supabase (delete) plutôt que de la masquer', async () => {
    createAdminClientMock.mockReturnValue(
      makeFakeSupabase({ plan_assignments: [{ data: null, error: { message: 'db down' } }] })
    )
    const result = await setDmHolder('plan-1', 'team-1', 'pos-dm', null)
    expect(result).toEqual({ ok: false, error: 'db down' })
  })

  describe('indisponibilité du titulaire de l’instrument', () => {
    it("refuse de faire porter le rôle DM à quelqu'un d'indisponible ce jour-là", async () => {
      const fake = makeFakeSupabase({
        plan_assignments: [ok({ user_id: 'user-1' })],
        ...planOn('2026-11-08T10:00:00.000Z'),
        ...blockoutFor('user-1', '2026-11-08'),
        ...PAUL,
      })
      createAdminClientMock.mockReturnValue(fake)

      const result = await setDmHolder('plan-1', 'team-1', 'pos-dm', 'pos-piano')

      expect(result).toEqual({ ok: false, error: expect.stringContaining('Paul Piano a déclaré une indisponibilité le dimanche 8 novembre') })
    })

    it("laisse l'affectation DM précédente INTACTE en cas de refus (ni suppression ni insertion)", async () => {
      const fake = makeFakeSupabase({
        plan_assignments: [ok({ user_id: 'user-1' })],
        ...planOn('2026-11-08T10:00:00.000Z'),
        ...blockoutFor('user-1', '2026-11-01', '2026-11-30'),
        ...PAUL,
      })
      createAdminClientMock.mockReturnValue(fake)

      await setDmHolder('plan-1', 'team-1', 'pos-dm', 'pos-piano')

      // Un seul accès à plan_assignments : la lecture du titulaire. Pas de delete, pas d'insert.
      expect(fake.calls.filter(t => t === 'plan_assignments')).toHaveLength(1)
    })

    it("une indispo qui se termine la veille ne bloque pas", async () => {
      createAdminClientMock.mockReturnValue(makeFakeSupabase({
        plan_assignments: [ok({ user_id: 'user-1' }), ok(null), ok(null)],
        ...planOn('2026-11-08T10:00:00.000Z'),
        ...blockoutFor('user-1', '2026-11-01', '2026-11-07'),
      }))

      expect(await setDmHolder('plan-1', 'team-1', 'pos-dm', 'pos-piano')).toEqual({ ok: true })
    })
  })
})

describe('addAssignmentAsync — indisponibilités déclarées', () => {
  const input = { planId: 'plan-1', userId: 'user-1', positionId: 'pos-piano', teamId: 'team-1' }
  const inserts = (fake: { calls: string[] }) => fake.calls.filter(t => t === 'plan_assignments').length

  it("refuse d'affecter un bénévole indisponible le jour du service — et n'écrit rien", async () => {
    const fake = makeFakeSupabase({ ...planOn('2026-11-08T10:00:00.000Z'), ...blockoutFor('user-1', '2026-11-08'), ...PAUL })
    createAdminClientMock.mockReturnValue(fake)

    const result = await addAssignmentAsync(input)

    expect(result).toEqual({ ok: false, error: expect.stringContaining('Paul Piano a déclaré une indisponibilité') })
    expect(inserts(fake)).toBe(0)
  })

  it.each([
    ['indispo sur un seul jour = jour du service', '2026-11-08', '2026-11-08'],
    ['indispo qui commence le jour du service', '2026-11-08', '2026-11-20'],
    ['indispo qui se termine le jour du service', '2026-11-01', '2026-11-08'],
    ['longue indispo qui englobe le service', '2026-10-01', '2026-12-31'],
  ])('refuse : %s', async (_label, start, end) => {
    const fake = makeFakeSupabase({ ...planOn('2026-11-08T10:00:00.000Z'), ...blockoutFor('user-1', start, end), ...PAUL })
    createAdminClientMock.mockReturnValue(fake)

    expect((await addAssignmentAsync(input)).ok).toBe(false)
    expect(inserts(fake)).toBe(0)
  })

  it.each([
    ['se termine la veille', '2026-11-01', '2026-11-07'],
    ['commence le lendemain', '2026-11-09', '2026-11-15'],
  ])("autorise quand l'indispo %s (pas de faux positif)", async (_label, start, end) => {
    const fake = makeFakeSupabase({
      ...planOn('2026-11-08T10:00:00.000Z'), ...blockoutFor('user-1', start, end),
      plan_assignments: [ok(null)], positions: [ok({ name: 'Piano' })],
    })
    createAdminClientMock.mockReturnValue(fake)

    expect(await addAssignmentAsync(input)).toEqual({ ok: true })
    expect(inserts(fake)).toBe(1)
  })

  it("n'est pas bloqué par l'indisponibilité d'UN AUTRE bénévole", async () => {
    const fake = makeFakeSupabase({
      ...planOn('2026-11-08T10:00:00.000Z'), ...blockoutFor('user-2', '2026-11-08'),
      plan_assignments: [ok(null)], positions: [ok({ name: 'Piano' })],
    })
    createAdminClientMock.mockReturnValue(fake)

    expect(await addAssignmentAsync(input)).toEqual({ ok: true })
  })

  it("rattache un culte à 00h30 (Paris) au bon jour : 23h30 UTC la veille est BIEN le jour de l'indispo", async () => {
    // 2026-11-21T23:30Z = dimanche 22 novembre 00h30 à Paris (CET)
    const fake = makeFakeSupabase({ ...planOn('2026-11-21T23:30:00.000Z'), ...blockoutFor('user-1', '2026-11-22'), ...PAUL })
    createAdminClientMock.mockReturnValue(fake)

    expect((await addAssignmentAsync(input)).ok).toBe(false)
    expect(inserts(fake)).toBe(0)
  })

  it("ne rattache PAS à tort un culte de 23h30 (Paris) au lendemain", async () => {
    // 2026-11-21T22:30Z = samedi 21 novembre 23h30 à Paris : l'indispo du 22 ne le concerne pas
    const fake = makeFakeSupabase({
      ...planOn('2026-11-21T22:30:00.000Z'), ...blockoutFor('user-1', '2026-11-22'),
      plan_assignments: [ok(null)], positions: [ok({ name: 'Piano' })],
    })
    createAdminClientMock.mockReturnValue(fake)

    expect(await addAssignmentAsync(input)).toEqual({ ok: true })
  })

  it("échoue FERMÉ si la lecture des indisponibilités échoue : on ne planifie pas dans le doute", async () => {
    const fake = makeFakeSupabase({
      ...planOn('2026-11-08T10:00:00.000Z'),
      blockout_dates: [{ data: null, error: { message: 'connection reset' } }],
    })
    createAdminClientMock.mockReturnValue(fake)

    const result = await addAssignmentAsync(input)

    expect(result).toEqual({ ok: false, error: expect.stringContaining('connection reset') })
    expect(inserts(fake)).toBe(0)
  })

  it("refuse si le service est introuvable", async () => {
    const fake = makeFakeSupabase({ plans: [{ data: null, error: { message: 'not found' } }] })
    createAdminClientMock.mockReturnValue(fake)

    expect(await addAssignmentAsync(input)).toEqual({ ok: false, error: expect.stringContaining('introuvable') })
    expect(inserts(fake)).toBe(0)
  })

  it("ne contrôle pas les invités externes (aucun compte, donc aucune indisponibilité)", async () => {
    const fake = makeFakeSupabase({ plan_assignments: [ok(null)] })
    createAdminClientMock.mockReturnValue(fake)

    const result = await addAssignmentAsync({ ...input, userId: '00000000-0000-0000-0000-000000000001', externalName: 'Jean' })

    expect(result).toEqual({ ok: true })
    expect(fake.calls).toEqual(['plan_assignments'])
  })

  it("remonte l'erreur du trigger de base de données si la garde applicative était contournée", async () => {
    const fake = makeFakeSupabase({
      ...planOn('2026-11-08T10:00:00.000Z'), ...NO_BLOCKOUT,
      plan_assignments: [{ data: null, error: { message: 'INDISPONIBILITE_DECLAREE: ce bénévole a déclaré une indisponibilité' } }],
    })
    createAdminClientMock.mockReturnValue(fake)

    expect(await addAssignmentAsync(input)).toEqual({ ok: false, error: expect.stringContaining('INDISPONIBILITE_DECLAREE') })
  })
})

describe('addAssignment (formulaire mobile) — indisponibilités déclarées', () => {
  function form(fields: Record<string, string>) {
    const fd = new FormData()
    for (const [k, v] of Object.entries(fields)) fd.set(k, v)
    return fd
  }
  const fields = { plan_id: 'plan-1', user_id: 'user-1', position_id: 'pos-piano', team_id: 'team-1', return_to: '/benevoles/admin/plans/plan-1' }

  it("redirige avec un message d'erreur lisible et n'écrit rien", async () => {
    const fake = makeFakeSupabase({ ...planOn('2026-11-08T10:00:00.000Z'), ...blockoutFor('user-1', '2026-11-08'), ...PAUL })
    createAdminClientMock.mockReturnValue(fake)

    await expect(addAssignment(form(fields))).rejects.toThrow(
      /NEXT_REDIRECT:\/benevoles\/admin\/plans\/plan-1\?error=.*indisponibilit/,
    )
    expect(fake.calls.filter(t => t === 'plan_assignments')).toHaveLength(0)
  })

  it("une requête forgée (option « désactivée » réactivée à la main) est refusée par le serveur", async () => {
    const fake = makeFakeSupabase({ ...planOn('2026-11-08T10:00:00.000Z'), ...blockoutFor('user-1', '2026-11-01', '2026-11-30'), ...PAUL })
    createAdminClientMock.mockReturnValue(fake)

    await expect(addAssignment(form({ ...fields, return_to: '/benevoles/admin/plans?plan=plan-1' }))).rejects.toThrow(/\?plan=plan-1&error=/)
    expect(fake.calls.filter(t => t === 'plan_assignments')).toHaveLength(0)
  })

  it("n'est plus silencieux quand l'insertion échoue (trigger de base ou contrainte)", async () => {
    const fake = makeFakeSupabase({
      ...planOn('2026-11-08T10:00:00.000Z'), ...NO_BLOCKOUT,
      plan_assignments: [{ data: null, error: { message: 'duplicate key' } }],
    })
    createAdminClientMock.mockReturnValue(fake)

    await expect(addAssignment(form(fields))).rejects.toThrow(/error=duplicate%20key/)
  })
})

describe('movePlan — déplacer un service sur le jour d’indisponibilité d’un affecté', () => {
  const assigned = (...ids: string[]) => ({ plan_assignments: [ok(ids.map(user_id => ({ user_id })))] })
  const updates = (fake: { calls: string[] }) => fake.calls.filter(t => t === 'plans').length - 1 // −1 = la lecture de la date actuelle

  it("refuse le déplacement quand un affecté est indisponible le nouveau jour — et ne modifie rien", async () => {
    const fake = makeFakeSupabase({
      plans: [ok({ service_date: '2026-11-01T09:00:00.000Z' })],
      ...assigned('user-1'), ...blockoutFor('user-1', '2026-11-08'), ...PAUL,
    })
    createAdminClientMock.mockReturnValue(fake)

    const result = await movePlan('plan-1', '2026-11-08T10:00')

    expect(result).toEqual({ ok: false, error: expect.stringContaining('déplacement refusé') })
    expect(updates(fake)).toBe(0)
  })

  it("autorise le déplacement quand personne n'est indisponible ce jour-là", async () => {
    const fake = makeFakeSupabase({
      plans: [ok({ service_date: '2026-11-01T09:00:00.000Z' }), ok(null)],
      ...assigned('user-1'), ...blockoutFor('user-1', '2026-11-15'),
    })
    createAdminClientMock.mockReturnValue(fake)

    expect(await movePlan('plan-1', '2026-11-08T10:00')).toEqual({ ok: true })
    expect(updates(fake)).toBe(1)
  })

  it("un simple changement d'HEURE le même jour n'est jamais bloqué (même si un conflit est déjà signalé)", async () => {
    const fake = makeFakeSupabase({
      plans: [ok({ service_date: '2026-11-08T09:00:00.000Z' }), ok(null)], // 10h00 Paris
    })
    createAdminClientMock.mockReturnValue(fake)

    expect(await movePlan('plan-1', '2026-11-08T11:30')).toEqual({ ok: true })
    expect(fake.calls).toEqual(['plans', 'plans']) // ni lecture d'affectations, ni d'indispos
  })

  it("échoue FERMÉ si la lecture des indisponibilités échoue", async () => {
    const fake = makeFakeSupabase({
      plans: [ok({ service_date: '2026-11-01T09:00:00.000Z' })],
      ...assigned('user-1'),
      blockout_dates: [{ data: null, error: { message: 'connection reset' } }],
    })
    createAdminClientMock.mockReturnValue(fake)

    expect(await movePlan('plan-1', '2026-11-08T10:00')).toEqual({ ok: false, error: expect.stringContaining('connection reset') })
    expect(updates(fake)).toBe(0)
  })

  it("un service sans affecté se déplace librement (aucune lecture d'indispo inutile)", async () => {
    const fake = makeFakeSupabase({ plans: [ok({ service_date: '2026-11-01T09:00:00.000Z' }), ok(null)], ...assigned() })
    createAdminClientMock.mockReturnValue(fake)

    expect(await movePlan('plan-1', '2026-11-08T10:00')).toEqual({ ok: true })
    expect(fake.calls).not.toContain('blockout_dates')
  })
})
