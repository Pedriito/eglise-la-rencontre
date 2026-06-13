'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireEditor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (!['admin', 'editor', 'super_admin'].includes(me?.permission ?? '')) redirect('/benevoles/dashboard')
  return createAdminClient()
}

export async function deleteSermon(id: string, planId: string, storagePath: string) {
  const admin = await requireEditor()
  await Promise.all([
    admin.storage.from('media').remove([storagePath]),
    admin.from('plan_sermons').delete().eq('id', id),
  ])
  revalidatePath(`/benevoles/admin/plans/${planId}`)
}
