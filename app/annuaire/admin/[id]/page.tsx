import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Entrepreneur } from '../../constants'
import { AdminEditForm } from './AdminEditForm'

export const metadata = { title: 'Modifier la fiche — Admin Annuaire' }

export default async function AdminEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: profile } = await supabase
    .from('profiles').select('permission').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(profile?.permission ?? '')) {
    redirect('/benevoles/dashboard')
  }

  const { id } = await params
  const admin = createAdminClient()
  const { data } = await admin
    .from('entrepreneurs')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) notFound()

  return <AdminEditForm entrepreneur={data as Entrepreneur} />
}
