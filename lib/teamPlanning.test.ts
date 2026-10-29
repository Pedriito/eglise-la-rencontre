import { describe, it, expect } from 'vitest'
import { ok, makeFakeSupabase } from '@/test/helpers/fakeSupabase'
import { parseMonth, shiftMonth, monthRange, planInvolvesTeam, getTeamMonthPlanning } from './teamPlanning'

describe('parseMonth', () => {
  it('garde un mois valide', () => {
    expect(parseMonth('2026-11')).toBe('2026-11')
  })

  it.each(['2026-13', '2026-00', '26-11', 'novembre', ''])('retombe sur le mois courant pour %j', raw => {
    expect(parseMonth(raw, new Date('2026-10-29T10:00:00Z'))).toBe('2026-10')
  })

  it('utilise le mois courant en heure de Paris (minuit passé le dernier jour du mois)', () => {
    // 31/10 à 23h30 UTC = 01/11 à 00h30 à Paris (heure d'hiver : UTC+1)
    expect(parseMonth(undefined, new Date('2026-10-31T23:30:00Z'))).toBe('2026-11')
  })
})

describe('shiftMonth', () => {
  it('passe d’une année à l’autre', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
})

describe('monthRange', () => {
  it('donne le dernier jour réel du mois (février bissextile compris)', () => {
    expect(monthRange('2026-02').last).toBe('2026-02-28')
    expect(monthRange('2028-02').last).toBe('2028-02-29')
    expect(monthRange('2026-11')).toMatchObject({ first: '2026-11-01', last: '2026-11-30' })
  })

  it('élargit la fenêtre UTC d’un jour de chaque côté', () => {
    const { fromIso, toIso } = monthRange('2026-11')
    expect(fromIso).toBe('2026-10-31T00:00:00.000Z')
    expect(toIso).toBe('2026-12-02T00:00:00.000Z')
  })
})

describe('planInvolvesTeam', () => {
  const louange = { id: 'louange', is_prayer_meeting: true }
  const accueil = { id: 'accueil', is_prayer_meeting: false }

  it('concerne toutes les équipes quand team_ids est NULL ou vide', () => {
    expect(planInvolvesTeam({ plan_type: null, team_ids: null }, accueil)).toBe(true)
    expect(planInvolvesTeam({ plan_type: null, team_ids: [] }, accueil)).toBe(true)
  })

  it('restreint aux équipes listées dans team_ids', () => {
    expect(planInvolvesTeam({ plan_type: null, team_ids: ['louange'] }, louange)).toBe(true)
    expect(planInvolvesTeam({ plan_type: null, team_ids: ['louange'] }, accueil)).toBe(false)
  })

  it('réserve la réunion de prière aux équipes de prière', () => {
    expect(planInvolvesTeam({ plan_type: 'prayer_meeting', team_ids: null }, louange)).toBe(true)
    expect(planInvolvesTeam({ plan_type: 'prayer_meeting', team_ids: null }, accueil)).toBe(false)
  })
})

describe('getTeamMonthPlanning', () => {
  const futureDay = '2099-03-08'
  const plan = (id: string, extra = {}) => ({
    id, title: 'Culte', service_date: `${futureDay}T09:00:00.000Z`, plan_type: null, team_ids: null, excluded_position_ids: null, ...extra,
  })

  function build(overrides: Record<string, ReturnType<typeof ok>[]> = {}) {
    return makeFakeSupabase({
      teams: [
        ok({ id: 'team-1', name: 'Louange', is_prayer_meeting: false, hide_positions: false,
          positions: [{ id: 'pos-piano', name: 'Piano', archived: false }, { id: 'pos-basse', name: 'Basse', archived: false }, { id: 'pos-old', name: 'Ancien', archived: true }] }),
        ok([{ id: 'team-1', name: 'Louange' }, { id: 'team-2', name: 'Accueil' }]),
      ],
      plans: [ok([plan('plan-1'), plan('plan-2', { team_ids: ['team-2'] })])],
      team_members: [ok([
        { user_id: 'u-lea', role: 'leader', profiles: { id: 'u-lea', first_name: 'Léa', last_name: 'L', desired_frequency: null } },
        { user_id: 'u-bob', role: 'member', profiles: { id: 'u-bob', first_name: 'Bob', last_name: 'B', desired_frequency: 'monthly' } },
      ])],
      member_positions: [ok([{ user_id: 'u-bob', position_id: 'pos-piano' }, { user_id: 'u-bob', position_id: 'pos-ailleurs' }])],
      plan_assignments: [ok([
        { id: 'a1', plan_id: 'plan-1', user_id: 'u-bob', position_id: 'pos-piano', team_id: 'team-1', status: 'pending', positions: { id: 'pos-piano', name: 'Piano', team_id: 'team-1' } },
        { id: 'a2', plan_id: 'plan-1', user_id: 'u-lea', position_id: null, team_id: 'team-2', status: 'confirmed', positions: null },
      ])],
      blockout_dates: [ok([{ user_id: 'u-lea', start_date: futureDay, end_date: futureDay }])],
      ...overrides,
    })
  }

  it('ne garde que les services concernés par l’équipe, avec leur taux de remplissage', async () => {
    const res = await getTeamMonthPlanning(build() as never, 'team-1', '2099-03')
    expect(res!.plans.map(p => p.id)).toEqual(['plan-1'])
    // 2 postes actifs (Ancien est archivé) dont 1 pourvu
    expect(res!.plans[0]).toMatchObject({ filled: 1, total: 2, past: false })
    expect(res!.plans[0].openPositions).toEqual([{ id: 'pos-basse', name: 'Basse' }])
  })

  it('ne compte pas un poste refusé comme pourvu', async () => {
    const declined = ok([
      { id: 'a1', plan_id: 'plan-1', user_id: 'u-bob', position_id: 'pos-piano', team_id: 'team-1', status: 'declined', positions: { id: 'pos-piano', name: 'Piano', team_id: 'team-1' } },
    ])
    const res = await getTeamMonthPlanning(build({ plan_assignments: [declined] }) as never, 'team-1', '2099-03')
    expect(res!.plans[0].filled).toBe(0)
    expect(res!.plans[0].openPositions.map(p => p.id)).toEqual(['pos-piano', 'pos-basse'])
  })

  it('sépare affectations de l’équipe, indisponibilités et affectations ailleurs', async () => {
    const res = await getTeamMonthPlanning(build() as never, 'team-1', '2099-03')
    expect(res!.assignments.map(a => a.id)).toEqual(['a1'])
    expect(res!.unavailable).toEqual([{ userId: 'u-lea', planId: 'plan-1' }])
    expect(res!.elsewhere).toEqual([{ userId: 'u-lea', planId: 'plan-1', teamName: 'Accueil' }])
  })

  it('met les responsables en premier et ignore les postes d’autres équipes', async () => {
    const res = await getTeamMonthPlanning(build() as never, 'team-1', '2099-03')
    expect(res!.members.map(m => [m.firstName, m.isLeader])).toEqual([['Léa', true], ['Bob', false]])
    expect(res!.members[1].positionIds).toEqual(['pos-piano'])
    expect(res!.members[1].servedCount).toBe(1)
  })

  it('renvoie null pour une équipe inconnue', async () => {
    const res = await getTeamMonthPlanning(build({ teams: [ok(null), ok([])] }) as never, 'nope', '2099-03')
    expect(res).toBeNull()
  })

  it('remonte une erreur de lecture plutôt que d’afficher une grille vide', async () => {
    const failing = build({ plans: [{ data: null, error: { message: 'db down' } }] })
    await expect(getTeamMonthPlanning(failing as never, 'team-1', '2099-03')).rejects.toThrow(/db down/)
  })
})
