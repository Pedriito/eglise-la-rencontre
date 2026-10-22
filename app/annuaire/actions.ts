'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendEntrepreneurSubmissionNotification, sendEntrepreneurApprovalEmail } from '@/lib/email'
import { parseSectors } from './constants'
import type { EntrepreneurLink } from './constants'

function normalizeSector(raw: string | null): string | null {
  if (!raw) return null
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      if (arr.length === 0) return null
      if (arr.length === 1) return arr[0]
      return raw // stocker le JSON pour multi-secteurs
    }
  } catch {}
  return raw
}

/* ── Soumission publique ─────────────────────────────────── */

export async function submitEntrepreneur(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()

  // Champs obligatoires
  const firstName   = (formData.get('first_name')   as string)?.trim()
  const lastName    = (formData.get('last_name')    as string)?.trim()
  const companyName = (formData.get('company_name') as string)?.trim()
  const email       = (formData.get('contact_email') as string)?.trim()
  const status      = (formData.get('status')       as string)
  if (!firstName || !lastName || !companyName || !email || !status) {
    return { success: false, error: 'Merci de remplir tous les champs obligatoires.' }
  }

  // Photo upload vers Supabase Storage
  const photo = formData.get('photo') as File | null
  let photoUrl: string | null = null

  if (photo && photo.size > 0) {
    // Crée le bucket s'il n'existe pas encore (idempotent)
    await admin.storage.createBucket('entrepreneurs', { public: true }).catch(() => {})

    const ext      = photo.name.split('.').pop()?.toLowerCase().replace(/[^a-z]/g, '') || 'jpg'
    const filename = `${crypto.randomUUID()}.${ext}`
    const buffer   = Buffer.from(await photo.arrayBuffer())

    const { error: uploadError } = await admin.storage
      .from('entrepreneurs')
      .upload(filename, buffer, { contentType: photo.type, upsert: false })

    if (!uploadError) {
      photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/entrepreneurs/${filename}`
    }
  }

  // Liens sociaux (envoyés en JSON par le client)
  let links: EntrepreneurLink[] = []
  try {
    const raw = formData.get('links') as string
    if (raw) links = JSON.parse(raw)
  } catch { /* ignore */ }
  // Filtrer les urls vides
  links = links.filter(l => l.url?.trim())

  // Langues (checkbox multiple → getAll)
  const languages = (formData.getAll('languages') as string[]).filter(Boolean)

  const { error } = await admin.from('entrepreneurs').insert({
    first_name:    firstName,
    last_name:     lastName,
    contact_email: (formData.get('contact_email') as string)?.trim() || null,
    contact_phone: (formData.get('contact_phone') as string)?.trim() || null,
    photo_url:     photoUrl,
    company_name:  companyName,
    description:   (formData.get('description')   as string)?.trim() || null,
    sector:        normalizeSector(formData.get('sector') as string | null),
    target:        (formData.get('target')        as string)         || null,
    geo:           (formData.get('geo')           as string)         || null,
    languages,
    links,
    status,
    visible: false,
  })

  if (error) {
    console.error('submitEntrepreneur:', error)
    return { success: false, error: 'Une erreur est survenue, veuillez réessayer.' }
  }

  // Notification email à l'admin (fire-and-forget — ne bloque pas la réponse)
  sendEntrepreneurSubmissionNotification({
    first_name:    firstName,
    last_name:     lastName,
    company_name:  companyName,
    sector:        (formData.get('sector') as string) || null,
    status,
    contact_email: (formData.get('contact_email') as string)?.trim() || null,
  }).catch(err => console.error('[annuaire] notification email failed:', err))

  return { success: true }
}

/* ── Actions admin ───────────────────────────────────────── */

async function requireAdminPermission() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('permission')
    .eq('id', user.id)
    .single()
  if (!['admin', 'super_admin'].includes(profile?.permission ?? '')) return null
  return createAdminClient()
}

export async function approveEntrepreneur(formData: FormData) {
  const admin = await requireAdminPermission()
  if (!admin) return
  const id = formData.get('id') as string

  // Récupérer les infos de base (toujours disponibles)
  const { data: entrepreneur } = await admin
    .from('entrepreneurs')
    .select('id, first_name, last_name, company_name, contact_email')
    .eq('id', id)
    .single()

  // edit_token : colonne ajoutée en migration 018, on tente séparément
  let editToken: string | null = null
  try {
    const { data: tokenRow } = await admin
      .from('entrepreneurs')
      .select('edit_token')
      .eq('id', id)
      .single()
    editToken = (tokenRow as any)?.edit_token ?? null
  } catch { /* migration 018 pas encore appliquée */ }

  await admin.from('entrepreneurs').update({ visible: true }).eq('id', id)
  revalidatePath('/annuaire')
  revalidatePath('/annuaire/admin')

  // Email de confirmation à l'entrepreneur (fire-and-forget)
  if (entrepreneur?.contact_email) {
    sendEntrepreneurApprovalEmail({
      id:            entrepreneur.id,
      first_name:    entrepreneur.first_name,
      last_name:     entrepreneur.last_name,
      company_name:  entrepreneur.company_name,
      contact_email: entrepreneur.contact_email,
      edit_token:    editToken,
    }).catch(err => console.error('[annuaire] approval email failed:', err))
  }
}

export async function hideEntrepreneur(formData: FormData) {
  const admin = await requireAdminPermission()
  if (!admin) return
  const id = formData.get('id') as string
  await admin.from('entrepreneurs').update({ visible: false }).eq('id', id)
  revalidatePath('/annuaire')
  revalidatePath('/annuaire/admin')
}

export async function deleteEntrepreneur(formData: FormData) {
  const admin = await requireAdminPermission()
  if (!admin) return
  const id = formData.get('id') as string
  await admin.from('entrepreneurs').delete().eq('id', id)
  revalidatePath('/annuaire')
  revalidatePath('/annuaire/admin')
}

/* ── Actions self-service (par token) ───────────────────── */

export async function updateEntrepreneurByToken(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const admin = createAdminClient()
  const token = formData.get('edit_token') as string
  if (!token) return { success: false, error: 'Token manquant.' }

  // Vérifier que le token existe
  const { data: existing } = await admin
    .from('entrepreneurs')
    .select('id, photo_url')
    .eq('edit_token', token)
    .single()
  if (!existing) return { success: false, error: 'Lien invalide ou expiré.' }

  // Photo upload (optionnel — si nouveau fichier fourni)
  const photo = formData.get('photo') as File | null
  let photoUrl: string | null = existing.photo_url ?? null

  if (photo && photo.size > 0) {
    await admin.storage.createBucket('entrepreneurs', { public: true }).catch(() => {})
    const ext      = photo.name.split('.').pop()?.toLowerCase().replace(/[^a-z]/g, '') || 'jpg'
    const filename = `${crypto.randomUUID()}.${ext}`
    const buffer   = Buffer.from(await photo.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from('entrepreneurs')
      .upload(filename, buffer, { contentType: photo.type, upsert: false })
    if (!uploadError) {
      photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/entrepreneurs/${filename}`
    }
  }

  // Liens
  let links: EntrepreneurLink[] = []
  try {
    const raw = formData.get('links') as string
    if (raw) links = JSON.parse(raw)
  } catch { /* ignore */ }
  links = links.filter(l => l.url?.trim())

  const languages = (formData.getAll('languages') as string[]).filter(Boolean)

  const { error } = await admin
    .from('entrepreneurs')
    .update({
      first_name:    (formData.get('first_name')    as string)?.trim(),
      last_name:     (formData.get('last_name')     as string)?.trim(),
      contact_email: (formData.get('contact_email') as string)?.trim() || null,
      contact_phone: (formData.get('contact_phone') as string)?.trim() || null,
      photo_url:     photoUrl,
      company_name:  (formData.get('company_name')  as string)?.trim(),
      description:   (formData.get('description')   as string)?.trim() || null,
      sector:        normalizeSector(formData.get('sector') as string | null),
      target:        (formData.get('target')        as string)         || null,
      geo:           (formData.get('geo')           as string)         || null,
      languages,
      links,
      status:        (formData.get('status')        as string)         || null,
    })
    .eq('edit_token', token)

  if (error) {
    console.error('updateEntrepreneurByToken:', error)
    return { success: false, error: 'Une erreur est survenue, veuillez réessayer.' }
  }

  revalidatePath('/annuaire')
  return { success: true }
}

export async function adminUpdateEntrepreneur(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminPermission()
  if (!admin) return { success: false, error: 'Non autorisé.' }

  const id = formData.get('id') as string
  if (!id) return { success: false, error: 'ID manquant.' }

  const { data: existing } = await admin
    .from('entrepreneurs')
    .select('id, photo_url')
    .eq('id', id)
    .single()
  if (!existing) return { success: false, error: 'Fiche introuvable.' }

  // Photo upload (optionnel)
  const photo = formData.get('photo') as File | null
  let photoUrl: string | null = existing.photo_url ?? null
  if (photo && photo.size > 0) {
    await admin.storage.createBucket('entrepreneurs', { public: true }).catch(() => {})
    const ext      = photo.name.split('.').pop()?.toLowerCase().replace(/[^a-z]/g, '') || 'jpg'
    const filename = `${crypto.randomUUID()}.${ext}`
    const buffer   = Buffer.from(await photo.arrayBuffer())
    const { error: uploadError } = await admin.storage
      .from('entrepreneurs')
      .upload(filename, buffer, { contentType: photo.type, upsert: false })
    if (!uploadError) {
      photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/entrepreneurs/${filename}`
    }
  }

  let links: EntrepreneurLink[] = []
  try {
    const raw = formData.get('links') as string
    if (raw) links = JSON.parse(raw)
  } catch { /* ignore */ }
  links = links.filter(l => l.url?.trim())

  const languages = (formData.getAll('languages') as string[]).filter(Boolean)

  const { error } = await admin
    .from('entrepreneurs')
    .update({
      first_name:    (formData.get('first_name')    as string)?.trim(),
      last_name:     (formData.get('last_name')     as string)?.trim(),
      contact_email: (formData.get('contact_email') as string)?.trim() || null,
      contact_phone: (formData.get('contact_phone') as string)?.trim() || null,
      photo_url:     photoUrl,
      company_name:  (formData.get('company_name')  as string)?.trim(),
      description:   (formData.get('description')   as string)?.trim() || null,
      sector:        normalizeSector(formData.get('sector') as string | null),
      target:        (formData.get('target')        as string)         || null,
      geo:           (formData.get('geo')           as string)         || null,
      languages,
      links,
      status:        (formData.get('status')        as string)         || null,
    })
    .eq('id', id)

  if (error) {
    console.error('adminUpdateEntrepreneur:', error)
    return { success: false, error: 'Une erreur est survenue.' }
  }

  revalidatePath('/annuaire')
  revalidatePath('/annuaire/admin')
  return { success: true }
}

export async function resendApprovalEmail(formData: FormData) {
  const admin = await requireAdminPermission()
  if (!admin) return

  const id = formData.get('id') as string
  const { data } = await admin
    .from('entrepreneurs')
    .select('id, first_name, last_name, company_name, contact_email, edit_token')
    .eq('id', id)
    .single()

  if (data?.contact_email) {
    await sendEntrepreneurApprovalEmail({
      id:            data.id,
      first_name:    data.first_name,
      last_name:     data.last_name,
      company_name:  data.company_name,
      contact_email: data.contact_email,
      edit_token:    data.edit_token ?? null,
    })
  }
}

export async function deleteEntrepreneurByToken(formData: FormData) {
  const admin = createAdminClient()
  const token = formData.get('edit_token') as string
  if (!token) return

  const { data: existing } = await admin
    .from('entrepreneurs')
    .select('id')
    .eq('edit_token', token)
    .single()
  if (!existing) return

  await admin.from('entrepreneurs').delete().eq('edit_token', token)
  revalidatePath('/annuaire')
}
