import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MemberSearch } from './MemberSearch'
import { MemberList } from './MemberList'
import { FlashMessage } from '../../../_components/FlashMessage'

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  const isAdmin = me?.permission === 'admin'
  const isEditor = me?.permission === 'editor'

  // Tous les membres de l'équipe peuvent voir la page en lecture seule
  const { data: myMembership } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('team_id', id)
    .single()

  const isMember = !!myMembership
  const isLeader = myMembership?.role === 'leader'
  const canEdit = isAdmin || (isEditor && isLeader)

  if (!isAdmin && !isEditor && !isMember) redirect('/benevoles/dashboard')

  const [{ data: team }, { data: positions }, { data: members }, { data: allProfiles }] = await Promise.all([
    supabase.from('teams').select('id, name').eq('id', id).single(),
    supabase.from('positions').select('id, name').eq('team_id', id).order('name'),
    supabase
      .from('team_members')
      .select('user_id, role, frequency, profiles(id, first_name, last_name)')
      .eq('team_id', id)
      .order('role'),
    supabase.from('profiles').select('id, first_name, last_name').order('last_name'),
  ])

  if (!team) redirect('/benevoles/admin/equipes')

  const memberIds = new Set(members?.map(m => m.user_id))
  const nonMembers = allProfiles?.filter(p => !memberIds.has(p.id)) ?? []

  // Positions par membre
  const memberPositions: Record<string, Set<string>> = {}
  if (members?.length) {
    const { data: mp } = await supabase
      .from('member_positions')
      .select('user_id, position_id')
      .in('user_id', members.map(m => m.user_id))
    mp?.forEach(p => {
      if (!memberPositions[p.user_id]) memberPositions[p.user_id] = new Set()
      memberPositions[p.user_id].add(p.position_id)
    })
  }

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-6 py-4 flex items-center gap-4">
        <Link
          href={canEdit ? '/benevoles/admin/equipes' : '/benevoles/dashboard'}
          className="text-dark/40 hover:text-dark transition-colors font-sans text-sm"
        >
          ←
        </Link>
        <h1 className="font-display text-2xl text-dark font-light">{team.name}</h1>
        <span className="text-dark/40 font-sans text-sm">{members?.length ?? 0} membre{(members?.length ?? 0) > 1 ? 's' : ''}</span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {sp.success === 'added' && (
          <FlashMessage message="Membre ajouté à l'équipe." type="success" />
        )}

        {/* Membres actuels */}
        <section>
          <h2 className="font-display text-xl text-dark font-light mb-3">Membres</h2>
          <MemberList
            teamId={id}
            members={(members ?? []) as any}
            positions={positions ?? []}
            memberPositions={memberPositions}
            readOnly={!canEdit}
          />
        </section>

        {/* Ajouter un membre — uniquement pour les éditeurs/admins */}
        {canEdit && nonMembers.length > 0 && (
          <section>
            <h2 className="font-display text-xl text-dark font-light mb-3">Ajouter un membre</h2>
            <MemberSearch teamId={id} profiles={nonMembers} />
          </section>
        )}
      </main>
    </div>
  )
}
