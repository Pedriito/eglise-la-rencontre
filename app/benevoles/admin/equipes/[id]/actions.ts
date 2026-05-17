'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: profile } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (profile?.permission !== 'admin') redirect('/benevoles/dashboard')
  // Retourne le client admin (service role) pour bypasser RLS sur les écritures
  return createAdminClient()
}

export async function addTeamMember(formData: FormData) {
  const admin = await requireAdmin()
  const teamId = formData.get('team_id') as string
  const userId = formData.get('user_id') as string
  const role = formData.get('role') as string
  const frequency = formData.get('frequency') as string

  const { error } = await admin.from('team_members').upsert({ user_id: userId, team_id: teamId, role, frequency })
  if (error) redirect(`/benevoles/admin/equipes/${teamId}?error=${encodeURIComponent(error.message)}`)
  redirect(`/benevoles/admin/equipes/${teamId}?success=added`)
}

export async function removeTeamMember(formData: FormData) {
  const admin = await requireAdmin()
  const teamId = formData.get('team_id') as string
  const userId = formData.get('user_id') as string

  await admin.from('team_members').delete().eq('user_id', userId).eq('team_id', teamId)

  const { data: positions } = await admin.from('positions').select('id').eq('team_id', teamId)
  if (positions?.length) {
    await admin.from('member_positions').delete().eq('user_id', userId).in('position_id', positions.map(p => p.id))
  }
  redirect(`/benevoles/admin/equipes/${teamId}`)
}

export async function toggleMemberPosition(formData: FormData) {
  const admin = await requireAdmin()
  const teamId = formData.get('team_id') as string
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
