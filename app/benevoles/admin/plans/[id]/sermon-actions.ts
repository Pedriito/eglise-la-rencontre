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

export async function uploadSermon(
  planId: string,
  title: string,
  storagePath: string,
  fileBytes: number[],
  mimeType: string,
): Promise<{ ok: true; sermon: { id: string; title: string; url: string; storage_path: string; created_at: string } } | { ok: false; error: string }> {
  const admin = await requireEditor()

  const { error: storageError } = await admin.storage
    .from('media')
    .upload(storagePath, new Uint8Array(fileBytes), { contentType: mimeType, upsert: false })
  if (storageError) return { ok: false, error: storageError.message }

  const { data: urlData } = admin.storage.from('media').getPublicUrl(storagePath)

  const { data: inserted, error: dbError } = await admin
    .from('plan_sermons')
    .insert({ plan_id: planId, title: title || 'Prédication', storage_path: storagePath, url: urlData.publicUrl })
    .select('id, title, url, storage_path, created_at')
    .single()
  if (dbError) return { ok: false, error: dbError.message }

  revalidatePath(`/benevoles/admin/plans/${planId}`)
  return { ok: true, sermon: inserted as { id: string; title: string; url: string; storage_path: string; created_at: string } }
}

export async function deleteSermon(id: string, planId: string, storagePath: string) {
  const admin = await requireEditor()
  await Promise.all([
    admin.storage.from('media').remove([storagePath]),
    admin.from('plan_sermons').delete().eq('id', id),
  ])
  revalidatePath(`/benevoles/admin/plans/${planId}`)
}
