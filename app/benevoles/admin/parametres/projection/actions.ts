'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { ProjectionSettings } from '@/lib/projectionSettings'
import { SETTINGS_ID } from '@/lib/projectionSettings'

async function requireEditorOrAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: profile } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (profile?.permission !== 'admin' && profile?.permission !== 'editor') redirect('/benevoles/dashboard')
  return supabase
}

export async function saveProjectionSettings(
  s: Omit<ProjectionSettings, 'id'>
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await requireEditorOrAdmin()
  const { error } = await supabase
    .from('projection_settings')
    .upsert({
      id: SETTINGS_ID,
      bg_type: s.bg_type,
      bg_color: s.bg_color,
      bg_gradient: s.bg_gradient,
      bg_image_url: s.bg_image_url,
      bg_blur: s.bg_blur,
      overlay_opacity: s.overlay_opacity,
      font_family: s.font_family,
      text_color: s.text_color,
      text_shadow: s.text_shadow,
      updated_at: new Date().toISOString(),
    })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/benevoles/admin/parametres/projection')
  return { ok: true }
}
