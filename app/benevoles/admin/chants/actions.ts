'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: profile } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (profile?.permission !== 'admin' && profile?.permission !== 'editor') redirect('/benevoles/dashboard')
  return createAdminClient()
}

export async function createSong(formData: FormData) {
  const admin = await requireAdmin()

  const title      = (formData.get('title') as string).trim()
  const chartKey   = (formData.get('chord_chart_key') as string).trim() || null
  const chart      = (formData.get('chord_chart') as string).trim() || null
  const arrName    = (formData.get('arrangement_name') as string).trim() || 'Principal'

  if (!title) redirect('/benevoles/admin/chants/nouveau?error=titre_manquant')

  // 1. Créer le chant
  const { data: song, error: songErr } = await admin
    .from('songs')
    .insert({ title })
    .select('id')
    .single()

  if (songErr || !song) redirect(`/benevoles/admin/chants/nouveau?error=${encodeURIComponent(songErr?.message ?? 'erreur')}`)

  // 2. Créer l'arrangement
  await admin.from('arrangements').insert({
    song_id:        song.id,
    name:           arrName,
    chord_chart:    chart,
    chord_chart_key: chartKey,
  })

  revalidatePath('/benevoles/admin/chants')
  revalidatePath('/benevoles/chants')
  redirect(`/benevoles/admin/chants/${song.id}/modifier?created=1`)
}

export async function updateSong(formData: FormData) {
  const admin = await requireAdmin()

  const songId       = parseInt(formData.get('song_id') as string, 10)
  const arrangementId = formData.get('arrangement_id') as string
  const title        = (formData.get('title') as string).trim()
  const chartKey     = (formData.get('chord_chart_key') as string).trim() || null
  const chart        = (formData.get('chord_chart') as string).trim() || null
  const arrName      = (formData.get('arrangement_name') as string).trim() || 'Principal'

  if (!title) redirect(`/benevoles/admin/chants/${songId}/modifier?error=titre_manquant`)

  await Promise.all([
    admin.from('songs').update({ title }).eq('id', songId),
    admin.from('arrangements').update({
      name:            arrName,
      chord_chart:     chart,
      chord_chart_key: chartKey,
    }).eq('id', arrangementId),
  ])

  revalidatePath('/benevoles/admin/chants')
  revalidatePath('/benevoles/chants')
  revalidatePath(`/benevoles/chants/${songId}`)
  redirect(`/benevoles/admin/chants/${songId}/modifier?saved=1`)
}

export async function deleteSong(formData: FormData) {
  const admin = await requireAdmin()
  const songId = parseInt(formData.get('song_id') as string, 10)

  // Les arrangements sont supprimés en cascade (FK)
  await admin.from('songs').delete().eq('id', songId)

  revalidatePath('/benevoles/admin/chants')
  revalidatePath('/benevoles/chants')
  redirect('/benevoles/admin/chants?deleted=1')
}
