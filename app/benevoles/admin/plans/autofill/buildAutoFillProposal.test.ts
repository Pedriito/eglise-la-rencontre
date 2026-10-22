import { describe, it, expect } from 'vitest'
import { buildAutoFillProposal, type BuildAutoFillInput, type BuildPlan, type BuildTeam, type BuildProfile } from './buildAutoFillProposal'

function plan(id: string, service_date: string, overrides: Partial<BuildPlan> = {}): BuildPlan {
  return { id, title: `Culte ${id}`, service_date, team_ids: null, excluded_position_ids: null, ...overrides }
}

function profile(id: string, desired_frequency: string | null = null): BuildProfile {
  return { id, first_name: id, last_name: 'Bénévole', desired_frequency }
}

function team(id: string, name: string, positions: BuildTeam['positions']): BuildTeam {
  return { id, name, positions }
}

function baseInput(overrides: Partial<BuildAutoFillInput> = {}): BuildAutoFillInput {
  return {
    plans: [],
    teams: [],
    qualifiedUserIdsByPosition: {},
    profiles: [],
    blockouts: [],
    existingAssignments: [],
    ...overrides,
  }
}

describe('buildAutoFillProposal', () => {
  it('propose le seul bénévole qualifié et disponible pour un poste ouvert', () => {
    const { proposals, skipped } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-06T11:00:00Z')],
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])],
      qualifiedUserIdsByPosition: { pos1: ['u1'] },
      profiles: [profile('u1')],
    }))

    expect(skipped).toEqual([])
    expect(proposals).toHaveLength(1)
    expect(proposals[0]).toMatchObject({ planId: 'p1', positionId: 'pos1', userId: 'u1' })
  })

  it("inclut un service même si son horaire est en fin de journée (régression borne de date déléguée à l'appelant, mais l'algorithme lui-même ne filtre pas par heure)", () => {
    const { proposals } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-06T23:30:00Z')],
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])],
      qualifiedUserIdsByPosition: { pos1: ['u1'] },
      profiles: [profile('u1')],
    }))
    expect(proposals).toHaveLength(1)
  })

  it("marque le créneau 'no_eligible' si aucun bénévole n'est coché pour le poste", () => {
    const { proposals, skipped } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-06T11:00:00Z')],
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])],
      qualifiedUserIdsByPosition: {},
      profiles: [],
    }))
    expect(proposals).toEqual([])
    expect(skipped).toHaveLength(1)
    expect(skipped[0].reason).toBe('no_eligible')
  })

  it("respecte le rythme souhaité : quelqu'un ayant déjà servi trop récemment n'est pas reproposé", () => {
    const { proposals, skipped } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-13T11:00:00Z')], // 6 jours après le dernier service connu
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])],
      qualifiedUserIdsByPosition: { pos1: ['u1'] },
      profiles: [profile('u1', 'weekly')], // gap minimum 7 jours
      existingAssignments: [{ userId: 'u1', positionId: 'pos1', planId: 'past', date: '2026-12-07' }],
    }))
    expect(proposals).toEqual([])
    expect(skipped).toHaveLength(1)
    expect(skipped[0].reason).toBe('none_within_frequency')
  })

  it('choisit un autre bénévole qualifié quand le premier est hors rythme', () => {
    const { proposals } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-13T11:00:00Z')],
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])],
      qualifiedUserIdsByPosition: { pos1: ['u1', 'u2'] },
      profiles: [profile('u1', 'weekly'), profile('u2', 'weekly')],
      existingAssignments: [{ userId: 'u1', positionId: 'pos1', planId: 'past', date: '2026-12-07' }],
    }))
    expect(proposals).toHaveLength(1)
    expect(proposals[0].userId).toBe('u2')
  })

  it('priorise qui a servi le moins récemment ; jamais servi = priorité absolue', () => {
    const { proposals } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-13T11:00:00Z')],
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])],
      qualifiedUserIdsByPosition: { pos1: ['u1', 'u2'] },
      profiles: [profile('u1'), profile('u2')],
      existingAssignments: [{ userId: 'u1', positionId: 'pos1', planId: 'past', date: '2026-11-01' }],
      // u2 n'a jamais servi → doit être choisi en priorité sur u1
    }))
    expect(proposals[0].userId).toBe('u2')
    expect(proposals[0].alternatives.map(a => a.id)).toEqual(['u1'])
  })

  it('ignore un bénévole en indisponibilité déclarée ce jour-là', () => {
    const { proposals, skipped } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-06T11:00:00Z')],
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])],
      qualifiedUserIdsByPosition: { pos1: ['u1'] },
      profiles: [profile('u1')],
      blockouts: [{ userId: 'u1', startDate: '2026-12-05', endDate: '2026-12-08' }],
    }))
    expect(proposals).toEqual([])
    expect(skipped[0].reason).toBe('none_within_frequency')
  })

  it('ne propose pas un poste déjà pourvu (sans allow_multiple)', () => {
    const { proposals, skipped } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-06T11:00:00Z')],
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])],
      qualifiedUserIdsByPosition: { pos1: ['u1'] },
      profiles: [profile('u1')],
      existingAssignments: [{ userId: 'u2', positionId: 'pos1', planId: 'p1', date: '2026-12-06' }],
    }))
    expect(proposals).toEqual([])
    expect(skipped).toEqual([])
  })

  it('propose un occupant supplémentaire (plafonné à +1) pour un poste allow_multiple déjà pourvu', () => {
    const { proposals } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-06T11:00:00Z')],
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Chorale', allow_multiple: true }])],
      qualifiedUserIdsByPosition: { pos1: ['u1', 'u2'] },
      profiles: [profile('u1'), profile('u2')],
      existingAssignments: [{ userId: 'u3', positionId: 'pos1', planId: 'p1', date: '2026-12-06' }],
    }))
    expect(proposals).toHaveLength(1)
  })

  it('exclut un poste marqué comme masqué (excluded_position_ids) pour ce plan', () => {
    const { proposals, skipped } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-06T11:00:00Z', { excluded_position_ids: ['pos1'] })],
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])],
      qualifiedUserIdsByPosition: { pos1: ['u1'] },
      profiles: [profile('u1')],
    }))
    expect(proposals).toEqual([])
    expect(skipped).toEqual([])
  })

  it("ignore une équipe qui n'est pas dans team_ids du plan", () => {
    const { proposals, skipped } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-06T11:00:00Z', { team_ids: ['t2'] })],
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])],
      qualifiedUserIdsByPosition: { pos1: ['u1'] },
      profiles: [profile('u1')],
    }))
    expect(proposals).toEqual([])
    expect(skipped).toEqual([])
  })

  it('ne cumule pas la même personne sur deux postes différents du même plan', () => {
    const { proposals } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-06T11:00:00Z')],
      teams: [team('t1', 'Louange', [
        { id: 'pos1', name: 'Guitare', allow_multiple: false },
        { id: 'pos2', name: 'Basse', allow_multiple: false },
      ])],
      qualifiedUserIdsByPosition: { pos1: ['u1'], pos2: ['u1'] },
      profiles: [profile('u1')],
    }))
    // u1 déjà pris sur pos1 → pos2 n'a plus personne d'éligible restant
    expect(proposals).toHaveLength(1)
    expect(proposals[0].positionId).toBe('pos1')
  })

  it('traite plusieurs plans en cascade, en tenant compte des propositions déjà faites', () => {
    const { proposals } = buildAutoFillProposal(baseInput({
      plans: [
        plan('p1', '2026-12-06T11:00:00Z'),
        plan('p2', '2026-12-13T11:00:00Z'),
      ],
      teams: [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])],
      qualifiedUserIdsByPosition: { pos1: ['u1', 'u2'] },
      profiles: [profile('u1', 'weekly'), profile('u2', 'weekly')],
    }))
    expect(proposals).toHaveLength(2)
    // u1 (jamais servi, ordre d'entrée) est choisi pour p1. Pour p2, u1 respecte toujours
    // son rythme (7j pile), mais u2 — qui lui n'a jamais servi — reste prioritaire : le
    // « jamais servi » l'emporte sur qui a servi il y a exactement le gap minimum.
    expect(proposals[0].planId).toBe('p1')
    expect(proposals[1].planId).toBe('p2')
    expect(proposals[1].userId).not.toBe(proposals[0].userId)
  })
})

describe('buildAutoFillProposal — indisponibilités déclarées (aucun contournement possible)', () => {
  const GUITARE = [team('t1', 'Louange', [{ id: 'pos1', name: 'Guitare', allow_multiple: false }])]
  const run = (serviceDate: string, blockouts: BuildAutoFillInput['blockouts'], users = ['u1']) =>
    buildAutoFillProposal(baseInput({
      plans: [plan('p1', serviceDate)],
      teams: GUITARE,
      qualifiedUserIdsByPosition: { pos1: users },
      profiles: users.map(u => profile(u)),
      blockouts,
    }))

  it.each([
    ['indispo la veille seulement', '2026-12-04', '2026-12-05', true],
    ['indispo qui se termine le jour du service', '2026-12-01', '2026-12-06', false],
    ['indispo qui commence le jour du service', '2026-12-06', '2026-12-20', false],
    ['indispo d’un seul jour = jour du service', '2026-12-06', '2026-12-06', false],
    ['indispo qui commence le lendemain', '2026-12-07', '2026-12-09', true],
  ])('%s', (_label, start, end, proposed) => {
    const { proposals } = run('2026-12-06T10:00:00Z', [{ userId: 'u1', startDate: start, endDate: end }])
    expect(proposals.length).toBe(proposed ? 1 : 0)
  })

  it('un culte à 00h30 heure de Paris (stocké 23h30 UTC la veille) est rattaché au jour de Paris', () => {
    // 2026-12-05T23:30Z = dimanche 6 décembre 00h30 à Paris
    const { proposals } = run('2026-12-05T23:30:00Z', [{ userId: 'u1', startDate: '2026-12-06', endDate: '2026-12-06' }])
    expect(proposals).toEqual([])
  })

  it('…et ne l’est pas à la veille : une indispo du 5 ne bloque pas un culte du 6 à 00h30', () => {
    const { proposals } = run('2026-12-05T23:30:00Z', [{ userId: 'u1', startDate: '2026-12-05', endDate: '2026-12-05' }])
    expect(proposals).toHaveLength(1)
  })

  it('un culte à 23h30 heure de Paris reste sur SON jour (pas décalé au lendemain)', () => {
    // 2026-12-05T22:30Z = samedi 5 décembre 23h30 à Paris
    const { proposals } = run('2026-12-05T22:30:00Z', [{ userId: 'u1', startDate: '2026-12-06', endDate: '2026-12-06' }])
    expect(proposals).toHaveLength(1)
  })

  it("l'indisponible n'apparaît NI en titulaire NI dans les alternatives proposées", () => {
    const { proposals } = run('2026-12-06T10:00:00Z', [{ userId: 'u2', startDate: '2026-12-06', endDate: '2026-12-06' }], ['u1', 'u2', 'u3'])
    expect(proposals).toHaveLength(1)
    const everyone = [proposals[0].userId, ...proposals[0].alternatives.map(a => a.id)]
    expect(everyone).not.toContain('u2')
    expect(everyone.sort()).toEqual(['u1', 'u3'])
  })

  it("seule l'indispo du bon bénévole compte : celle d'un autre ne l'exclut pas", () => {
    const { proposals } = run('2026-12-06T10:00:00Z', [{ userId: 'autre', startDate: '2026-12-06', endDate: '2026-12-06' }])
    expect(proposals).toHaveLength(1)
  })

  it('une indispo couvrant UN seul des deux services n’exclut que celui-là', () => {
    const { proposals } = buildAutoFillProposal(baseInput({
      plans: [plan('p1', '2026-12-06T10:00:00Z'), plan('p2', '2026-12-13T10:00:00Z')],
      teams: GUITARE,
      qualifiedUserIdsByPosition: { pos1: ['u1'] },
      profiles: [profile('u1')],
      blockouts: [{ userId: 'u1', startDate: '2026-12-13', endDate: '2026-12-13' }],
    }))
    expect(proposals.map(p => p.planId)).toEqual(['p1'])
  })

  it('un poste dont TOUS les qualifiés sont indisponibles reste vide (listé comme non pourvu, pas forcé)', () => {
    const { proposals, skipped } = run(
      '2026-12-06T10:00:00Z',
      [{ userId: 'u1', startDate: '2026-12-06', endDate: '2026-12-06' }, { userId: 'u2', startDate: '2026-12-01', endDate: '2026-12-31' }],
      ['u1', 'u2'],
    )
    expect(proposals).toEqual([])
    expect(skipped).toHaveLength(1)
  })
})
