'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { sendPlanAssignmentEmail, sendCancellationNotificationEmail, sendExternalGuestInvitationEmail } from '@/lib/email'
import { sendPushToUser } from '@/lib/pushNotifications'

const INVITE_EXT_ID = '00000000-0000-0000-0000-000000000001'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: profile } = await supabase.from('profiles').select('permission, church_id').eq('id', user.id).single()
  if (!profile || !['admin', 'editor', 'super_admin'].includes(profile.permission)) redirect('/benevoles/dashboard')
  return { admin: createAdminClient(), church_id: profile.church_id as string }
}

export async function createPlan(formData: FormData) {
  const { admin, church_id } = await requireAdmin()
  const title = formData.get('title') as string
  const serviceDate = formData.get('service_date') as string
  const teamId = formData.get('team_id') as string || null
  const notes = formData.get('notes') as string || null
  const planType = (formData.get('plan_type') as string) || 'sunday_service'

  const { data, error } = await admin
    .from('plans')
    .insert({ title, service_date: serviceDate, team_id: teamId, notes, plan_type: planType, church_id })
    .select('id')
    .single()

  if (error) redirect(`/benevoles/admin/plans/nouveau?error=${encodeURIComponent(error.message)}`)
  redirect(`/benevoles/admin/plans/${data.id}`)
}

export async function deletePlan(formData: FormData) {
  const { admin } = await requireAdmin()
  const planId = formData.get('plan_id') as string
  await admin.from('plans').delete().eq('id', planId)
  redirect('/benevoles/admin/plans')
}

export async function addAssignment(formData: FormData) {
  const { admin } = await requireAdmin()
  const planId = formData.get('plan_id') as string
  const userId = formData.get('user_id') as string
  const positionId = formData.get('position_id') as string || null
  const teamId = formData.get('team_id') as string || null

  if (!userId || userId === '') redirect(`/benevoles/admin/plans/${planId}`)

  if (userId === INVITE_EXT_ID) {
    const externalName = (formData.get('external_name') as string)?.trim() || null
    const externalEmail = (formData.get('external_email') as string)?.trim() || null
    await admin.from('plan_assignments').insert({
      plan_id: planId,
      user_id: userId,
      position_id: positionId,
      team_id: teamId,
      status: 'pending',
      external_name: externalName,
      external_email: externalEmail,
    })
  } else {
    await admin.from('plan_assignments').insert({
      plan_id: planId,
      user_id: userId,
      position_id: positionId,
      team_id: teamId,
      status: 'pending',
    })
  }

  redirect(`/benevoles/admin/plans/${planId}`)
}

export async function removeAssignment(formData: FormData) {
  const { admin } = await requireAdmin()
  const planId = formData.get('plan_id') as string
  const assignmentId = formData.get('assignment_id') as string
  await admin.from('plan_assignments').delete().eq('id', assignmentId)
  redirect(`/benevoles/admin/plans/${planId}`)
}

export async function sendSingleInvitation(formData: FormData) {
  const { admin } = await requireAdmin()
  const assignmentId = formData.get('assignment_id') as string
  const planId = formData.get('plan_id') as string

  const { data: a, error } = await admin
    .from('plan_assignments')
    .select('id, user_id, team_id, external_name, external_email, plans(title, service_date), positions(name), teams(name)')
    .eq('id', assignmentId)
    .single()

  if (error || !a) redirect(`/benevoles/admin/plans/${planId}?error=Assignment+introuvable`)

  const plan = a.plans as any
  const position = a.positions as any
  const team = a.teams as any

  // Invité externe
  if (a.user_id === INVITE_EXT_ID) {
    if (!a.external_email) redirect(`/benevoles/admin/plans/${planId}?error=Email+invité+manquant`)
    try {
      console.log('[sendSingleInvitation] external guest email to', a.external_email, 'plan:', plan.title)
      await sendExternalGuestInvitationEmail({
        to: a.external_email as string,
        guestName: a.external_name ?? 'Invité',
        planTitle: plan.title,
        serviceDate: plan.service_date,
        positionName: position?.name ?? null,
        teamName: team?.name ?? null,
        assignmentId,
      })
      console.log('[sendSingleInvitation] external guest email sent OK to', a.external_email)
      await admin.from('plan_assignments').update({ invitation_sent_at: new Date().toISOString() }).eq('id', assignmentId)
    } catch (err: any) {
      console.error('[sendSingleInvitation] Resend error (external):', err?.message, { email: a.external_email, assignmentId })
      redirect(`/benevoles/admin/plans/${planId}?error=${encodeURIComponent(err?.message ?? 'Erreur envoi email')}`)
    }
    redirect(`/benevoles/admin/plans/${planId}?sent=1`)
  }

  // Bénévole interne
  const [{ data: profile }, { data: authData }] = await Promise.all([
    admin.from('profiles').select('first_name').eq('id', a.user_id).single(),
    admin.auth.admin.getUserById(a.user_id),
  ])

  const email = authData?.user?.email

  console.log('[sendSingleInvitation] assignmentId:', assignmentId, 'userId:', a.user_id, 'email:', email ?? 'INTROUVABLE')

  if (!email || !plan || !profile) {
    console.error('[sendSingleInvitation] données manquantes', { email, plan: !!plan, profile: !!profile })
    redirect(`/benevoles/admin/plans/${planId}?error=Données+manquantes`)
  }

  try {
    console.log('[sendSingleInvitation] sending plan email to', email, 'plan:', plan.title)
    await sendPlanAssignmentEmail({
      to: email,
      firstName: profile.first_name,
      planTitle: plan.title,
      serviceDate: plan.service_date,
      positionName: position?.name ?? null,
      teamName: team?.name ?? null,
      assignmentId,
    })
    console.log('[sendSingleInvitation] email sent OK to', email)
    await admin.from('plan_assignments').update({ invitation_sent_at: new Date().toISOString() }).eq('id', assignmentId)

    // Notification push en complément de l'email (non-bloquant)
    const dateStr = new Date(plan.service_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    sendPushToUser(a.user_id, {
      title: `📅 ${plan.title}`,
      body:  `Tu es planifié(e) le ${dateStr}${team?.name ? ` · ${team.name}` : ''}`,
      url:   '/benevoles/dashboard',
      tag:   `assignment-${assignmentId}`,
    }).catch(() => {})
  } catch (err: any) {
    console.error('[sendSingleInvitation] Resend error:', err?.message, { email, assignmentId })
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

export async function cancelAssignment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const assignmentId = formData.get('assignment_id') as string

  // Récupère l'affectation + plan + poste + équipe
  const { data: assignment } = await supabase
    .from('plan_assignments')
    .select('id, user_id, plans(id, title, service_date), positions(name), teams(name)')
    .eq('id', assignmentId)
    .eq('user_id', user.id)
    .single()

  if (!assignment) redirect('/benevoles/dashboard')

  const plan = assignment.plans as unknown as { id: string; title: string; service_date: string } | null
  if (!plan || new Date(plan.service_date) <= new Date()) redirect('/benevoles/dashboard')

  // Met à jour le statut
  await supabase
    .from('plan_assignments')
    .update({ status: 'declined' })
    .eq('id', assignmentId)
    .eq('user_id', user.id)

  // Récupère le prénom/nom de l'utilisateur
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const volunteerName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
  const position = assignment.positions as unknown as { name: string } | null
  const team = assignment.teams as unknown as { name: string } | null

  // Notifie les admins/éditeurs par email (via leur email dans profiles)
  const adminClient = createAdminClient()
  const { data: responsibles } = await adminClient
    .from('profiles')
    .select('email')
    .in('permission', ['admin', 'editor'])
    .not('email', 'is', null)

  console.log('[cancelAssignment] assignmentId:', assignmentId, 'volunteer:', volunteerName, 'plan:', plan.title)
  console.log('[cancelAssignment] notifying', responsibles?.length ?? 0, 'responsibles')

  for (const r of responsibles ?? []) {
    if (!r.email) continue
    try {
      await sendCancellationNotificationEmail({
        to: r.email,
        volunteerName,
        planTitle: plan.title,
        serviceDate: plan.service_date,
        positionName: position?.name ?? null,
        teamName: team?.name ?? null,
      })
      console.log('[cancelAssignment] notification sent to', r.email)
    } catch (err: any) {
      console.error('[cancelAssignment] Resend error for', r.email, ':', err?.message)
    }
  }

  redirect('/benevoles/dashboard')
}

// ── CHANTS DU PLAN ─────────────────────────────────────────────────────────

export async function addPlanSong(formData: FormData) {
  const { admin } = await requireAdmin()
  const planId     = formData.get('plan_id') as string
  const songId     = parseInt(formData.get('song_id') as string, 10)
  const arrId      = (formData.get('arrangement_id') as string) || null
  const keySelected = (formData.get('key_selected') as string) || null

  // Dernier order_index existant
  const { data: existing } = await admin
    .from('plan_songs')
    .select('order_index')
    .eq('plan_id', planId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single()

  const nextIndex = (existing?.order_index ?? -1) + 1

  // Toujours préférer un arrangement avec grille d'accords
  let finalArrId = arrId
  if (!finalArrId) {
    // Aucun arrangement spécifié → prendre le premier avec grille, sinon le premier dispo
    const { data: arrangements } = await admin
      .from('arrangements')
      .select('id, chord_chart')
      .eq('song_id', songId)
      .order('created_at')
    if (arrangements && arrangements.length > 0) {
      const withChart = arrangements.find(a => a.chord_chart)
      finalArrId = (withChart ?? arrangements[0]).id
    }
  } else {
    // Arrangement spécifié sans grille → vérifier s'il en existe un meilleur
    const { data: specifiedArr } = await admin
      .from('arrangements')
      .select('chord_chart')
      .eq('id', finalArrId)
      .single()
    if (!specifiedArr?.chord_chart) {
      const { data: better } = await admin
        .from('arrangements')
        .select('id')
        .eq('song_id', songId)
        .not('chord_chart', 'is', null)
        .order('created_at')
        .limit(1)
        .maybeSingle()
      if (better) finalArrId = better.id
    }
  }

  await admin.from('plan_songs').insert({
    plan_id:        planId,
    song_id:        songId,
    arrangement_id: finalArrId,
    key_selected:   keySelected,
    order_index:    nextIndex,
  })

  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/benevoles/admin/plans/${planId}`)
}

export async function removePlanSong(formData: FormData) {
  const { admin } = await requireAdmin()
  const planSongId = formData.get('plan_song_id') as string
  const planId     = formData.get('plan_id') as string

  await admin.from('plan_songs').delete().eq('id', planSongId)

  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/benevoles/admin/plans/${planId}`)
}

export async function movePlanSong(formData: FormData) {
  const { admin } = await requireAdmin()
  const planSongId = formData.get('plan_song_id') as string
  const planId     = formData.get('plan_id') as string
  const direction  = formData.get('direction') as 'up' | 'down'

  const { data: songs } = await admin
    .from('plan_songs')
    .select('id, order_index')
    .eq('plan_id', planId)
    .order('order_index')

  if (!songs || songs.length < 2) return

  const idx = songs.findIndex(s => s.id === planSongId)
  if (idx === -1) return
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= songs.length) return

  const a = songs[idx]
  const b = songs[swapIdx]

  await Promise.all([
    admin.from('plan_songs').update({ order_index: b.order_index }).eq('id', a.id),
    admin.from('plan_songs').update({ order_index: a.order_index }).eq('id', b.id),
  ])

  const { revalidatePath } = await import('next/cache')
  revalidatePath(`/benevoles/admin/plans/${planId}`)
}

/** Change l'arrangement sélectionné pour un chant dans un plan. */
export async function updatePlanSongArrangement(
  planSongId: string,
  arrangementId: string,
  planId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { admin } = await requireAdmin()
  const { error } = await admin
    .from('plan_songs')
    .update({ arrangement_id: arrangementId })
    .eq('id', planSongId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/benevoles/admin/plans/${planId}/setlist`)
  return { ok: true }
}

/**
 * Sauvegarde permanente d'une modification de paroles en live.
 * Remplace les lignes identifiées par chartLineNums dans le chord_chart de l'arrangement.
 */
export async function updateSlideLyrics(
  arrangementId: string,
  chartLineNums: number[],   // indices des lignes à remplacer dans le chord_chart
  newLines: string[],        // nouvelles paroles
  planId: string,            // pour revalider la page setlist
): Promise<{ ok: boolean; error?: string }> {
  const { admin } = await requireAdmin()

  const { data: arr, error: fetchErr } = await admin
    .from('arrangements')
    .select('chord_chart')
    .eq('id', arrangementId)
    .single()

  if (fetchErr || !arr?.chord_chart) {
    return { ok: false, error: fetchErr?.message ?? 'Arrangement introuvable' }
  }

  const lines = arr.chord_chart.split('\n')

  // Remplace les lignes ciblées par les nouvelles paroles
  const startIdx = chartLineNums[0]
  const endIdx   = chartLineNums[chartLineNums.length - 1]
  const updated  = [
    ...lines.slice(0, startIdx),
    ...newLines,
    ...lines.slice(endIdx + 1),
  ].join('\n')

  const { error: saveErr } = await admin
    .from('arrangements')
    .update({ chord_chart: updated })
    .eq('id', arrangementId)

  if (saveErr) return { ok: false, error: saveErr.message }

  revalidatePath(`/benevoles/admin/plans/${planId}/setlist`)
  return { ok: true }
}

// ── RECHERCHE DE CHANTS POUR LA PROJECTION ────────────────────────────────

export type SongSearchResult = {
  songId: number
  title: string
  matchedInLyrics: boolean
  arrangement: {
    id: string
    name: string
    chord_chart: string | null
    chord_chart_key: string | null
  } | null
}

export async function searchSongsForProjection(query: string): Promise<SongSearchResult[]> {
  const { admin } = await requireAdmin()
  const q = query.trim()
  if (!q) return []

  // Recherche 1 : par titre
  const { data: byTitle } = await admin
    .from('songs')
    .select('id, title, arrangements(id, name, chord_chart, chord_chart_key)')
    .ilike('title', `%${q}%`)
    .order('title')
    .limit(8)

  // Recherche 2 : dans les paroles (chord_chart)
  const { data: byLyrics } = await admin
    .from('arrangements')
    .select('id, name, chord_chart, chord_chart_key, song_id, songs(id, title)')
    .ilike('chord_chart', `%${q}%`)
    .limit(8)

  const seen = new Set<number>()
  const results: SongSearchResult[] = []

  for (const s of (byTitle ?? [])) {
    seen.add(s.id)
    const arrs = s.arrangements as { id: string; name: string; chord_chart: string | null; chord_chart_key: string | null }[]
    results.push({
      songId: s.id,
      title: s.title,
      matchedInLyrics: false,
      arrangement: arrs.find(a => a.chord_chart) ?? arrs[0] ?? null,
    })
  }

  for (const arr of (byLyrics ?? [])) {
    const song = arr.songs as unknown as { id: number; title: string }
    if (!song || seen.has(song.id)) continue
    seen.add(song.id)
    results.push({
      songId: song.id,
      title: song.title,
      matchedInLyrics: true,
      arrangement: { id: arr.id, name: arr.name, chord_chart: arr.chord_chart, chord_chart_key: arr.chord_chart_key },
    })
  }

  return results.slice(0, 10)
}
