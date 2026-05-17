'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { sendPlanAssignmentEmail } from '@/lib/email'

const INVITE_EXT_ID = '00000000-0000-0000-0000-000000000001'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: profile } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (profile?.permission !== 'admin' && profile?.permission !== 'editor') redirect('/benevoles/dashboard')
  return createAdminClient()
}

export async function createPlan(formData: FormData) {
  const admin = await requireAdmin()
  const title = formData.get('title') as string
  const serviceDate = formData.get('service_date') as string
  const teamId = formData.get('team_id') as string || null
  const notes = formData.get('notes') as string || null

  const { data, error } = await admin
    .from('plans')
    .insert({ title, service_date: serviceDate, team_id: teamId, notes })
    .select('id')
    .single()

  if (error) redirect(`/benevoles/admin/plans/nouveau?error=${encodeURIComponent(error.message)}`)
  redirect(`/benevoles/admin/plans/${data.id}`)
}

export async function deletePlan(formData: FormData) {
  const admin = await requireAdmin()
  const planId = formData.get('plan_id') as string
  await admin.from('plans').delete().eq('id', planId)
  redirect('/benevoles/admin/plans')
}

export async function addAssignment(formData: FormData) {
  const admin = await requireAdmin()
  const planId = formData.get('plan_id') as string
  const userId = formData.get('user_id') as string
  const positionId = formData.get('position_id') as string || null
  const teamId = formData.get('team_id') as string || null

  if (!userId || userId === '') redirect(`/benevoles/admin/plans/${planId}`)

  await admin.from('plan_assignments').upsert({
    plan_id: planId,
    user_id: userId,
    position_id: positionId,
    team_id: teamId,
    status: 'pending',
  })

  redirect(`/benevoles/admin/plans/${planId}`)
}

export async function removeAssignment(formData: FormData) {
  const admin = await requireAdmin()
  const planId = formData.get('plan_id') as string
  const assignmentId = formData.get('assignment_id') as string
  await admin.from('plan_assignments').delete().eq('id', assignmentId)
  redirect(`/benevoles/admin/plans/${planId}`)
}

export async function sendSingleInvitation(formData: FormData) {
  const admin = await requireAdmin()
  const assignmentId = formData.get('assignment_id') as string
  const planId = formData.get('plan_id') as string

  const { data: a, error } = await admin
    .from('plan_assignments')
    .select('id, user_id, plans(title, service_date), positions(name)')
    .eq('id', assignmentId)
    .single()

  if (error || !a) redirect(`/benevoles/admin/plans/${planId}?error=Assignment+introuvable`)
  if (a.user_id === INVITE_EXT_ID) redirect(`/benevoles/admin/plans/${planId}`)

  const [{ data: profile }, { data: authData }] = await Promise.all([
    admin.from('profiles').select('first_name').eq('id', a.user_id).single(),
    admin.auth.admin.getUserById(a.user_id),
  ])

  const email = authData?.user?.email
  const plan = a.plans as any
  const position = a.positions as any

  if (!email || !plan || !profile) {
    redirect(`/benevoles/admin/plans/${planId}?error=Données+manquantes`)
  }

  try {
    await sendPlanAssignmentEmail({
      to: email,
      firstName: profile.first_name,
      planTitle: plan.title,
      serviceDate: plan.service_date,
      positionName: position?.name ?? null,
    })
  } catch (err: any) {
    redirect(`/benevoles/admin/plans/${planId}?error=${encodeURIComponent(err?.message ?? 'Erreur envoi email')}`)
  }

  redirect(`/benevoles/admin/plans/${planId}?sent=1`)
}

export async function respondAssignment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const assignmentId = formData.get('assignment_id') as string
  const status = formData.get('status') as string

  await supabase
    .from('plan_assignments')
    .update({ status })
    .eq('id', assignmentId)
    .eq('user_id', user.id)

  redirect('/benevoles/dashboard')
}
