import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Périmètre de l'auto-remplissage pour l'utilisateur connecté.
 *  `teamIds: null` = toutes les équipes (admin) ; sinon uniquement ces équipes. */
export type AutoFillScope =
  | { ok: true; teamIds: string[] | null }
  | { ok: false; error: string }

/** Un administrateur planifie toutes les équipes ; tout autre profil autorisé (éditeur) ne planifie
 *  que celles dont il est responsable (`team_members.role = 'leader'`) — même règle que la page
 *  « Équipes ». Fail-closed : si la lecture échoue ou si aucune équipe n'est dirigée, rien n'est
 *  planifiable plutôt que de retomber sur « tout ». */
export async function resolveAutoFillScope(admin: AdminClient, userId: string, permission: string): Promise<AutoFillScope> {
  if (permission === 'admin' || permission === 'super_admin') return { ok: true, teamIds: null }

  const { data, error } = await admin
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('role', 'leader')
  if (error) {
    return { ok: false, error: `Vérification de vos équipes impossible (${error.message}) : auto-remplissage refusé par précaution.` }
  }
  const teamIds = [...new Set((data ?? []).map(r => r.team_id as string))]
  if (teamIds.length === 0) {
    return { ok: false, error: "Vous n'êtes responsable d'aucune équipe : l'auto-remplissage ne planifie que les équipes dont vous êtes responsable." }
  }
  return { ok: true, teamIds }
}
