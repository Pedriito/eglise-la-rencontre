import { describe, it, expect } from 'vitest'
import { ok, makeFakeSupabase } from '@/test/helpers/fakeSupabase'
import { resolveAutoFillScope } from './scope'

const adminWith = (team_members: ReturnType<typeof ok>[] | { data: null; error: { message: string } }[]) =>
  makeFakeSupabase({ team_members: team_members as never }) as never

describe('resolveAutoFillScope', () => {
  it.each(['admin', 'super_admin'])('un %s planifie toutes les équipes (aucune lecture de team_members)', async permission => {
    const admin = adminWith([])
    const scope = await resolveAutoFillScope(admin, 'u1', permission)
    expect(scope).toEqual({ ok: true, teamIds: null })
    expect((admin as unknown as { calls: string[] }).calls).toEqual([])
  })

  it('un éditeur est limité aux équipes dont il est responsable (dédoublonnées)', async () => {
    const scope = await resolveAutoFillScope(
      adminWith([ok([{ team_id: 'louange' }, { team_id: 'accueil' }, { team_id: 'louange' }])]), 'u1', 'editor')
    expect(scope).toEqual({ ok: true, teamIds: ['louange', 'accueil'] })
  })

  it("un éditeur qui n'est responsable d'aucune équipe ne peut rien planifier", async () => {
    const scope = await resolveAutoFillScope(adminWith([ok([])]), 'u1', 'editor')
    expect(scope.ok).toBe(false)
    if (!scope.ok) expect(scope.error).toMatch(/responsable d'aucune équipe/)
  })

  it('fail-closed : si la lecture échoue, on refuse (jamais de repli sur « toutes les équipes »)', async () => {
    const scope = await resolveAutoFillScope(adminWith([{ data: null, error: { message: 'timeout' } }]), 'u1', 'editor')
    expect(scope.ok).toBe(false)
    if (!scope.ok) expect(scope.error).toMatch(/timeout.*refusé par précaution/)
  })

  it('tout profil non administrateur (même inattendu) passe par la restriction', async () => {
    for (const permission of ['viewer', 'member', '', 'Admin']) {
      const scope = await resolveAutoFillScope(adminWith([ok([{ team_id: 'louange' }])]), 'u1', permission)
      expect(scope).toEqual({ ok: true, teamIds: ['louange'] })
    }
  })
})
