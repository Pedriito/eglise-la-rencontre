import { describe, it, expect } from 'vitest'
import { ok, makeFakeSupabase } from '@/test/helpers/fakeSupabase'
import {
  parisDay, isBlocked, fetchBlockouts, findBlockedEntries, describeBlocked, refusalIfUnavailable,
  type Blockout,
} from './availability'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asAdmin = (fake: unknown) => fake as any

describe('parisDay — jour calendaire en heure de Paris', () => {
  it('renvoie le même jour pour un service en journée', () => {
    expect(parisDay('2026-11-08T09:00:00.000Z')).toBe('2026-11-08')
  })

  it("passe au jour SUIVANT dès 23h UTC en hiver (CET = UTC+1) : 23h30 UTC = 00h30 à Paris", () => {
    expect(parisDay('2026-11-21T23:30:00.000Z')).toBe('2026-11-22')
    expect(parisDay('2026-11-21T22:59:59.000Z')).toBe('2026-11-21')
    expect(parisDay('2026-11-21T23:00:00.000Z')).toBe('2026-11-22')
  })

  it("passe au jour SUIVANT dès 22h UTC en été (CEST = UTC+2) : 22h30 UTC = 00h30 à Paris", () => {
    expect(parisDay('2027-06-12T22:30:00.000Z')).toBe('2027-06-13')
    expect(parisDay('2027-06-12T21:59:59.000Z')).toBe('2027-06-12')
    expect(parisDay('2027-06-12T22:00:00.000Z')).toBe('2027-06-13')
  })

  it("gère la nuit du changement d'heure d'automne (dim. 25 oct. 2026) sans sauter ni doubler de jour", () => {
    expect(parisDay('2026-10-24T21:59:59.000Z')).toBe('2026-10-24') // 23h59 CEST
    expect(parisDay('2026-10-24T22:00:00.000Z')).toBe('2026-10-25') // 00h00 CEST
    expect(parisDay('2026-10-25T22:59:59.000Z')).toBe('2026-10-25') // 23h59 CET
    expect(parisDay('2026-10-25T23:00:00.000Z')).toBe('2026-10-26') // 00h00 CET
  })

  it("gère la nuit du changement d'heure de printemps (dim. 29 mars 2026)", () => {
    expect(parisDay('2026-03-28T22:59:59.000Z')).toBe('2026-03-28') // 23h59 CET
    expect(parisDay('2026-03-28T23:00:00.000Z')).toBe('2026-03-29') // 00h00 CET
    expect(parisDay('2026-03-29T21:59:59.000Z')).toBe('2026-03-29') // 23h59 CEST
    expect(parisDay('2026-03-29T22:00:00.000Z')).toBe('2026-03-30') // 00h00 CEST
  })

  it('franchit les fins de mois et d’année', () => {
    expect(parisDay('2026-12-31T23:30:00.000Z')).toBe('2027-01-01')
    expect(parisDay('2028-02-28T23:30:00.000Z')).toBe('2028-02-29') // année bissextile
  })

  it('accepte aussi un objet Date', () => {
    expect(parisDay(new Date('2026-11-21T23:30:00.000Z'))).toBe('2026-11-22')
  })

  it('ne dépend PAS du fuseau de la machine (Vercel tourne en UTC)', () => {
    const original = process.env.TZ
    try {
      for (const tz of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Europe/Paris']) {
        process.env.TZ = tz
        expect(parisDay('2026-11-21T23:30:00.000Z')).toBe('2026-11-22')
      }
    } finally {
      if (original === undefined) delete process.env.TZ
      else process.env.TZ = original
    }
  })
})

describe('isBlocked — bornes inclusives', () => {
  const rows: Blockout[] = [{ user_id: 'u1', start_date: '2026-11-10', end_date: '2026-11-12' }]

  it.each([
    ['la veille du début', '2026-11-09', false],
    ['le premier jour', '2026-11-10', true],
    ['au milieu', '2026-11-11', true],
    ['le dernier jour', '2026-11-12', true],
    ['le lendemain de la fin', '2026-11-13', false],
  ])('%s → %s', (_label, day, expected) => {
    expect(isBlocked(rows, 'u1', day)).toBe(expected)
  })

  it("ne s'applique qu'au bénévole concerné", () => {
    expect(isBlocked(rows, 'u2', '2026-11-11')).toBe(false)
  })

  it('une indispo d’un seul jour (début = fin) couvre ce jour et lui seul', () => {
    const one: Blockout[] = [{ user_id: 'u1', start_date: '2026-11-08', end_date: '2026-11-08' }]
    expect(isBlocked(one, 'u1', '2026-11-07')).toBe(false)
    expect(isBlocked(one, 'u1', '2026-11-08')).toBe(true)
    expect(isBlocked(one, 'u1', '2026-11-09')).toBe(false)
  })

  it('compare des dates "YYYY-MM-DD" correctement à travers les mois et années', () => {
    const long: Blockout[] = [{ user_id: 'u1', start_date: '2026-12-20', end_date: '2027-01-05' }]
    expect(isBlocked(long, 'u1', '2026-12-31')).toBe(true)
    expect(isBlocked(long, 'u1', '2027-01-01')).toBe(true)
    expect(isBlocked(long, 'u1', '2027-01-06')).toBe(false)
  })
})

describe('fetchBlockouts — lecture paginée (plafond de 1000 lignes de l’API)', () => {
  /** Faux client qui sert `total` lignes par pages, selon `.range(from, to)`, comme PostgREST. */
  function pagedClient(total: number, opts: { failOnPage?: number } = {}) {
    const all: Blockout[] = Array.from({ length: total }, (_, i) => ({
      user_id: `u${i}`, start_date: '2026-11-08', end_date: '2026-11-08',
    }))
    const ranges: [number, number][] = []
    const filters: { method: string; args: unknown[] }[] = []
    function from() {
      let range: [number, number] = [0, 999]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b: any = {}
      for (const m of ['select', 'lte', 'gte', 'in', 'order']) b[m] = (...args: unknown[]) => { filters.push({ method: m, args }); return b }
      b.range = (a: number, z: number) => { range = [a, z]; ranges.push(range); return b }
      b.then = (resolve: (v: unknown) => unknown) => {
        const page = ranges.length
        if (opts.failOnPage === page) return Promise.resolve({ data: null, error: { message: 'timeout' } }).then(resolve)
        return Promise.resolve({ data: all.slice(range[0], range[1] + 1), error: null }).then(resolve)
      }
      return b
    }
    return { from, ranges, filters }
  }

  it('lit TOUTES les pages : 2 350 indispos en base → 2 350 lignes (et non 1 000)', async () => {
    const c = pagedClient(2350)
    const res = await fetchBlockouts(asAdmin(c), { from: '2026-11-08', to: '2026-11-08' })

    expect(res.error).toBeNull()
    expect(res.data).toHaveLength(2350)
    expect(c.ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('une page exactement pleine déclenche une page suivante (qui peut être vide)', async () => {
    const c = pagedClient(1000)
    const res = await fetchBlockouts(asAdmin(c), { from: '2026-11-08', to: '2026-11-08' })

    expect(res.data).toHaveLength(1000)
    expect(c.ranges).toEqual([[0, 999], [1000, 1999]])
  })

  it('ne lit qu’une page quand il y en a moins de 1 000', async () => {
    const c = pagedClient(42)
    await fetchBlockouts(asAdmin(c), { from: '2026-11-08', to: '2026-11-08' })

    expect(c.ranges).toEqual([[0, 999]])
  })

  it('filtre côté base sur le chevauchement avec [from, to] et, si demandé, sur les bénévoles', async () => {
    const c = pagedClient(1)
    await fetchBlockouts(asAdmin(c), { from: '2026-11-01', to: '2026-11-30', userIds: ['a', 'b'] })

    expect(c.filters).toContainEqual({ method: 'lte', args: ['start_date', '2026-11-30'] })
    expect(c.filters).toContainEqual({ method: 'gte', args: ['end_date', '2026-11-01'] })
    expect(c.filters).toContainEqual({ method: 'in', args: ['user_id', ['a', 'b']] })
    expect(c.filters).toContainEqual({ method: 'order', args: ['id'] }) // ordre stable entre les pages
  })

  it('renvoie une erreur (jamais une lecture partielle silencieuse) si une page échoue', async () => {
    const c = pagedClient(2350, { failOnPage: 2 })
    const res = await fetchBlockouts(asAdmin(c), { from: '2026-11-08', to: '2026-11-08' })

    expect(res).toEqual({ data: null, error: 'timeout' })
  })

  it('court-circuite sans requête quand la liste de bénévoles est vide', async () => {
    const fake = makeFakeSupabase({})
    const res = await fetchBlockouts(asAdmin(fake), { from: '2026-11-08', to: '2026-11-08', userIds: [] })

    expect(res).toEqual({ data: [], error: null })
    expect(fake.calls).toEqual([])
  })
})

describe('findBlockedEntries', () => {
  const rows = (...b: Blockout[]) => makeFakeSupabase({ blockout_dates: [ok(b)] })

  it('renvoie uniquement les couples bénévole × jour réellement indisponibles', async () => {
    const fake = rows(
      { user_id: 'u1', start_date: '2026-11-08', end_date: '2026-11-08' },
      { user_id: 'u2', start_date: '2026-11-15', end_date: '2026-11-22' },
    )
    const res = await findBlockedEntries(asAdmin(fake), [
      { userId: 'u1', day: '2026-11-08' }, // bloqué
      { userId: 'u1', day: '2026-11-15' }, // u1 libre ce jour-là
      { userId: 'u2', day: '2026-11-08' }, // u2 libre ce jour-là
      { userId: 'u2', day: '2026-11-22' }, // bloqué (dernier jour)
    ])

    expect(res).toEqual({
      ok: true,
      blocked: [{ userId: 'u1', day: '2026-11-08' }, { userId: 'u2', day: '2026-11-22' }],
    })
  })

  it('ne fait aucune requête pour une liste vide', async () => {
    const fake = rows()
    expect(await findBlockedEntries(asAdmin(fake), [])).toEqual({ ok: true, blocked: [] })
    expect(fake.calls).toEqual([])
  })

  it('échoue FERMÉ : une erreur de lecture ne se traduit jamais par « personne n’est bloqué »', async () => {
    const fake = makeFakeSupabase({ blockout_dates: [{ data: null, error: { message: 'boom' } }] })
    const res = await findBlockedEntries(asAdmin(fake), [{ userId: 'u1', day: '2026-11-08' }])

    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('boom')
  })
})

describe('describeBlocked — message pour l’admin', () => {
  it('nomme la personne et le jour (un seul cas)', async () => {
    const fake = makeFakeSupabase({ profiles: [ok([{ id: 'u1', first_name: 'Paul', last_name: 'Piano' }])] })
    const msg = await describeBlocked(asAdmin(fake), [{ userId: 'u1', day: '2026-11-08' }])

    expect(msg).toBe('Paul Piano a déclaré une indisponibilité le dimanche 8 novembre : affectation refusée.')
  })

  it('liste toutes les personnes concernées (plusieurs cas)', async () => {
    const fake = makeFakeSupabase({ profiles: [ok([
      { id: 'u1', first_name: 'Paul', last_name: 'Piano' },
      { id: 'u2', first_name: 'Béa', last_name: 'Basse' },
    ])] })
    const msg = await describeBlocked(asAdmin(fake), [
      { userId: 'u1', day: '2026-11-08' }, { userId: 'u2', day: '2026-11-15' },
    ])

    expect(msg).toContain('Paul Piano (dimanche 8 novembre)')
    expect(msg).toContain('Béa Basse (dimanche 15 novembre)')
  })

  it('reste lisible si le profil est introuvable', async () => {
    const fake = makeFakeSupabase({ profiles: [ok([])] })
    expect(await describeBlocked(asAdmin(fake), [{ userId: 'x', day: '2026-11-08' }])).toContain('Un·e bénévole')
  })
})

describe('refusalIfUnavailable', () => {
  it('renvoie null quand personne n’est bloqué', async () => {
    const fake = makeFakeSupabase({ plans: [ok({ service_date: '2026-11-08T09:00:00.000Z' })], blockout_dates: [ok([])] })
    expect(await refusalIfUnavailable(asAdmin(fake), 'p1', ['u1'])).toBeNull()
  })

  it('ne fait aucune requête sans bénévole à contrôler', async () => {
    const fake = makeFakeSupabase({})
    expect(await refusalIfUnavailable(asAdmin(fake), 'p1', [])).toBeNull()
    expect(fake.calls).toEqual([])
  })

  it('relit le jour du service en base, en heure de Paris', async () => {
    const fake = makeFakeSupabase({
      plans: [ok({ service_date: '2026-11-21T23:30:00.000Z' })], // dimanche 22 nov. 00h30 à Paris
      blockout_dates: [ok([{ user_id: 'u1', start_date: '2026-11-22', end_date: '2026-11-22' }])],
      profiles: [ok([{ id: 'u1', first_name: 'Paul', last_name: 'Piano' }])],
    })
    expect(await refusalIfUnavailable(asAdmin(fake), 'p1', ['u1'])).toContain('dimanche 22 novembre')
  })
})
