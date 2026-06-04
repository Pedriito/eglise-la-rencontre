'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1jtuTE4joQOh1TNB1NI5AjvOhwgzMymOx3CJ26Gws4Io/export?format=csv&gid=0'

export type SheetRow = {
  prenom:       string
  sujet:        string
  traite:       boolean
  confidentiel: boolean
  exaucement:   string
  rowIndex:     number   // pour détecter les doublons
}

/** Parse un CSV simple (gère les champs entre guillemets) */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split('\n')
  for (const line of lines) {
    if (!line.trim()) continue
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i+1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    fields.push(current.trim())
    rows.push(fields)
  }
  return rows
}

/** Récupère et parse les lignes du Google Sheet */
export async function fetchSheetRows(): Promise<{ rows: SheetRow[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin') return { rows: [], error: 'Non autorisé' }

  try {
    const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' })
    if (!res.ok) return { rows: [], error: `Erreur HTTP ${res.status}` }
    const text = await res.text()
    const rows = parseCSV(text)
    if (rows.length < 2) return { rows: [] }

    // Ignorer la ligne de headers (row 0)
    const data: SheetRow[] = []
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]
      const prenom = r[0]?.trim() ?? ''
      const sujet  = r[1]?.trim() ?? ''
      if (!prenom && !sujet) continue
      data.push({
        prenom,
        sujet,
        traite:       (r[2]?.trim().toLowerCase() === 'oui'),
        confidentiel: !!(r[3]?.trim()),
        exaucement:   r[4]?.trim() ?? '',
        rowIndex:     i,
      })
    }
    return { rows: data }
  } catch (e: unknown) {
    return { rows: [], error: (e as Error).message }
  }
}

/** Importe les lignes sélectionnées comme sujets de prière */
export async function importSheetRows(rowIndexes: number[]): Promise<{ ok: boolean; imported: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin') return { ok: false, imported: 0, error: 'Non autorisé' }

  const admin = createAdminClient()

  // Récupérer les lignes du sheet
  const { rows, error } = await fetchSheetRows()
  if (error) return { ok: false, imported: 0, error }

  // Charger les sujets existants pour éviter les doublons (même prénom + sujet)
  const { data: existing } = await admin
    .from('prayer_requests')
    .select('person_name, subject')
  const existingSet = new Set(
    (existing ?? []).map(e => `${e.person_name?.trim().toLowerCase()}|${e.subject?.trim().toLowerCase()}`)
  )

  const toInsert = rows
    .filter(r => rowIndexes.includes(r.rowIndex))
    .filter(r => {
      const key = `${r.prenom.toLowerCase()}|${r.sujet.toLowerCase()}`
      return !existingSet.has(key)
    })
    .map(r => {
      const notes: string[] = []
      if (r.confidentiel) notes.push('🔒 Confidentiel – Conseil de gouvernance uniquement')
      if (r.exaucement)   notes.push(`Exaucement : ${r.exaucement}`)
      if (r.traite)       notes.push('Présenté en réunion de prière')

      return {
        person_name: r.prenom,
        subject:     r.sujet,
        notes:       notes.length ? notes.join('\n') : null,
        status:      r.exaucement ? 'resolved' : 'active',
        created_by:  user.id,
      }
    })

  if (toInsert.length === 0) return { ok: true, imported: 0 }

  const { error: insertError } = await admin.from('prayer_requests').insert(toInsert)
  if (insertError) return { ok: false, imported: 0, error: insertError.message }

  return { ok: true, imported: toInsert.length }
}
