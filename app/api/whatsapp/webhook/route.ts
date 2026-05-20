import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? ''
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ?? ''
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? ''

// ── Vérification webhook (Meta l'appelle une fois à la configuration) ──────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[whatsapp] Webhook vérifié ✓')
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// ── Réception des messages ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  const messages = body?.entry?.[0]?.changes?.[0]?.value?.messages
  if (!messages?.length) return Response.json({ ok: true })

  const message = messages[0]
  if (message.type !== 'text') return Response.json({ ok: true })

  const from: string = message.from
  const rawText: string = message.text?.body?.trim() ?? ''
  if (!rawText) return Response.json({ ok: true })

  console.log('[whatsapp] message reçu de', from, ':', rawText.slice(0, 80))

  const admin = createAdminClient()
  const { data: teams } = await admin.from('teams').select('id, name')

  // Tente d'extraire "NomÉquipe: question" ou "NomÉquipe - question"
  let teamId: string | null = null
  let title = rawText

  for (const team of teams ?? []) {
    const re = new RegExp(`^${escapeRegex(team.name)}\\s*[:\\-–]\\s*`, 'i')
    if (re.test(title)) {
      teamId = team.id
      title = title.replace(re, '').trim()
      break
    }
  }

  // Tronque si trop long
  if (title.length > 200) title = title.slice(0, 197) + '…'

  const { error } = await admin.from('decisions').insert({
    title,
    team_id: teamId,
    source: 'WhatsApp',
    status: 'pending',
    // created_by null — message externe
  })

  if (error) {
    console.error('[whatsapp] insert error:', error.message)
    await sendReply(from, '❌ Une erreur est survenue, la question n\'a pas été enregistrée.')
    return Response.json({ ok: false })
  }

  const confirmation = teamId
    ? `✅ Question ajoutée dans Gestion → ${teams?.find(t => t.id === teamId)?.name}.\n\n"${title.slice(0, 80)}${title.length > 80 ? '…' : ''}"`
    : `✅ Question reçue dans l'inbox !\n\nAstuce : commence par le nom de l'équipe pour l'assigner directement.\nEx: "Louange: ta question ici"`

  await sendReply(from, confirmation)
  console.log('[whatsapp] décision créée, teamId:', teamId ?? 'inbox')

  return Response.json({ ok: true })
}

// ── Helpers ────────────────────────────────────────────────────────────────
async function sendReply(to: string, text: string) {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('[whatsapp] WHATSAPP_TOKEN ou PHONE_NUMBER_ID manquant')
    return
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text },
        }),
      }
    )
    if (!res.ok) console.error('[whatsapp] sendReply error:', await res.text())
  } catch (e: any) {
    console.error('[whatsapp] sendReply exception:', e?.message)
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
