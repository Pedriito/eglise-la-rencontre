'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

async function requireAdminOrLeader(teamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: profile } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (profile?.permission === 'admin') return createAdminClient()
  if (profile?.permission === 'editor') {
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('team_id', teamId)
      .single()
    if (membership?.role === 'leader') return createAdminClient()
  }
  redirect('/benevoles/dashboard')
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: profile } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (profile?.permission !== 'admin') redirect('/benevoles/dashboard')
  return createAdminClient()
}

export async function addTeamMember(formData: FormData) {
  const teamId = formData.get('team_id') as string
  const admin = await requireAdminOrLeader(teamId)
  const userId = formData.get('user_id') as string
  const role = formData.get('role') as string
  const frequency = formData.get('frequency') as string

  const { error } = await admin.from('team_members').upsert({ user_id: userId, team_id: teamId, role, frequency })
  if (error) redirect(`/benevoles/admin/equipes/${teamId}?error=${encodeURIComponent(error.message)}`)
  redirect(`/benevoles/admin/equipes/${teamId}?success=added`)
}

export async function removeTeamMember(formData: FormData) {
  const teamId = formData.get('team_id') as string
  const admin = await requireAdminOrLeader(teamId)
  const userId = formData.get('user_id') as string

  await admin.from('team_members').delete().eq('user_id', userId).eq('team_id', teamId)

  const { data: positions } = await admin.from('positions').select('id').eq('team_id', teamId)
  if (positions?.length) {
    await admin.from('member_positions').delete().eq('user_id', userId).in('position_id', positions.map(p => p.id))
  }
  redirect(`/benevoles/admin/equipes/${teamId}`)
}

export async function updateMemberRole(formData: FormData) {
  const teamId = formData.get('team_id') as string
  const admin = await requireAdmin()
  const userId = formData.get('user_id') as string
  const role = formData.get('role') as string

  await admin
    .from('team_members')
    .update({ role })
    .eq('user_id', userId)
    .eq('team_id', teamId)

  redirect(`/benevoles/admin/equipes/${teamId}`)
}

export async function toggleMemberPosition(formData: FormData) {
  const teamId = formData.get('team_id') as string
  const admin = await requireAdminOrLeader(teamId)
  const userId = formData.get('user_id') as string
  const positionId = formData.get('position_id') as string
  const action = formData.get('action') as string

  if (action === 'add') {
    await admin.from('member_positions').upsert({ user_id: userId, position_id: positionId })
  } else {
    await admin.from('member_positions').delete().eq('user_id', userId).eq('position_id', positionId)
  }
  redirect(`/benevoles/admin/equipes/${teamId}`)
}
