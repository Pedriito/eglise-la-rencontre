'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireEditorOrAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: profile } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (profile?.permission !== 'admin' && profile?.permission !== 'editor') redirect('/benevoles/dashboard')
  return createAdminClient()
}

export async function deleteMediaFile(id: string, storagePath: string): Promise<void> {
  const admin = await requireEditorOrAdmin()
  await Promise.all([
    admin.storage.from('media').remove([storagePath]),
    admin.from('media_files').delete().eq('id', id),
  ])
  revalidatePath('/benevoles/admin/mediatheque')
}
