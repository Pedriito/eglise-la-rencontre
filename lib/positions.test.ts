import { describe, it, expect } from 'vitest'
import { isMultiPositionName, withAllowMultiple, MULTI_POSITION_NAMES } from './positions'

describe('positions multi-bénévoles', () => {
  it('Chorale et Choriste (règle de la migration 012) — et eux seuls — sont multi par nom', () => {
    expect(MULTI_POSITION_NAMES).toEqual(['Chorale', 'Choriste'])
    expect(isMultiPositionName('Chorale')).toBe(true)
    expect(isMultiPositionName('Choriste')).toBe(true)
    for (const name of ['Piano', 'Basse', 'DM', 'choriste', 'Choristes', '']) expect(isMultiPositionName(name)).toBe(false)
  })

  it('colonne absente (undefined/null) : le drapeau est reconstitué par nom', () => {
    const input: { name: string; allow_multiple?: boolean | null }[] = [
      { name: 'Choriste' }, { name: 'Piano' }, { name: 'Chorale', allow_multiple: null },
    ]
    const out = withAllowMultiple(input)
    expect(out.map(p => p.allow_multiple)).toEqual([true, false, true])
  })

  it('colonne présente : la valeur de la base fait foi, dans les deux sens', () => {
    const out = withAllowMultiple([
      { name: 'Choriste', allow_multiple: false }, { name: 'Piano', allow_multiple: true },
    ])
    expect(out.map(p => p.allow_multiple)).toEqual([false, true])
  })

  it('conserve les autres champs et ne modifie pas l’entrée', () => {
    const input = [{ id: 'p1', name: 'Choriste', archived: false }]
    const out = withAllowMultiple(input)
    expect(out[0]).toEqual({ id: 'p1', name: 'Choriste', archived: false, allow_multiple: true })
    expect(input[0]).toEqual({ id: 'p1', name: 'Choriste', archived: false })
  })
})
