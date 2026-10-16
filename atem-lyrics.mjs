/**
 * Paroles → ATEM (incrustation DSK)
 *
 * Écoute le canal Supabase Realtime `obs-live` (le même contenu que l'overlay
 * OBS), dessine chaque diapo en PNG 1920×1080 avec transparence, l'envoie dans
 * la mémoire d'images de l'ATEM puis l'affiche via le Media Player 1 + DSK 1.
 *
 * Config : fichier `.env.atem` à la racine du projet (non versionné) :
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY=eyJ...
 */

import { createClient } from '@supabase/supabase-js'
import { createCanvas } from 'canvas'
import { Enums } from 'atem-connection'

const WIDTH = 1920
const HEIGHT = 1080
const VW = WIDTH / 100
const REM = 16

// Deux emplacements en alternance : on prépare le suivant pendant que l'autre est à l'antenne.
// Indices 0-based → emplacements 19 et 20 dans ATEM Software Control.
const STILL_SLOTS = [18, 19]
const DSK = 0
const MEDIA_PLAYER = 0

const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif'
const ACCENT = ['#3D7D85', '#5A9EA6']

// ── Rendu ─────────────────────────────────────────────────────────────────────

function formatSection(raw) {
  const s = raw.replace(/\s*:\s*$/, '').trim()
  const lower = s.toLowerCase()
  if (/^verse|^couplet|^strophe/.test(lower)) return s.replace(/verse/gi, 'Couplet').replace(/couplet/gi, 'Couplet').replace(/strophe/gi, 'Couplet')
  if (/^chorus|^refrain/.test(lower))          return s.replace(/chorus/gi, 'Refrain').replace(/refrain/gi, 'Refrain')
  if (/^bridge|^pont/.test(lower))             return s.replace(/bridge/gi, 'Pont').replace(/pont/gi, 'Pont')
  if (/^pre.?chorus|^pré.?refrain/.test(lower)) return 'Pré-refrain'
  if (/^intro/.test(lower))                    return 'Intro'
  if (/^outro/.test(lower))                    return 'Outro'
  if (/^tag/.test(lower))                      return 'Tag'
  if (/^interlude/.test(lower))                return 'Interlude'
  return s
}

// Même calcul que l'overlay OBS : clamp(min, k/maxLen vw, max)
function fontSize(lines, k, maxVw, minRem, maxRem) {
  const maxLen = Math.max(...lines.map(l => l.length), 1)
  return Math.min(Math.max(Math.min(k / maxLen, maxVw) * VW, minRem * REM), maxRem * REM)
}

function wrap(g, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean)
  const out = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (line && g.measureText(test).width > maxWidth) { out.push(line); line = w }
    else line = test
  }
  if (line) out.push(line)
  return out.length ? out : ['']
}

function drawSpaced(g, text, x, y, spacingPx) {
  for (const ch of text) {
    g.fillText(ch, x, y)
    x += g.measureText(ch).width + spacingPx
  }
}

/** Convertit un événement du canal OBS en blocs de texte à dessiner, ou null si rien à afficher. */
function toBlocks(event, payload) {
  const split = (t) => (t ?? '').split('\n')
  switch (event) {
    case 'slide': {
      const lines = (payload.lines ?? []).map(l => l.toUpperCase())
      if (!lines.length) return null
      return {
        label: payload.section ? formatSection(payload.section).toUpperCase() : null,
        lines, size: fontSize(lines, 72, 4.5, 1.8, 3.8), weight: 'bold', italic: false,
      }
    }
    case 'message': {
      const lines = split(payload.text?.trim()).map(l => l.toUpperCase())
      if (!lines.join('').trim()) return null
      return { label: null, lines, size: fontSize(lines, 72, 4.5, 1.8, 3.8), weight: 'bold', italic: false }
    }
    case 'announcement': {
      const lines = split(payload.body).map(l => l.toUpperCase())
      return {
        label: payload.title ? payload.title.toUpperCase() : null,
        lines, size: fontSize(lines, 72, 4.5, 1.8, 3.8), weight: 'bold', italic: false,
      }
    }
    case 'verse': {
      const lines = split(payload.text)
      return {
        label: (payload.display ?? '').toUpperCase() || null,
        lines, size: fontSize(lines, 68, 4, 1.4, 3.2), weight: '300', italic: true,
        footer: (payload.versionName ?? '').toUpperCase() || null,
      }
    }
    default:
      return null
  }
}

/** Dessine le bandeau (même mise en page que l'overlay OBS) et renvoie les pixels RGBA bruts. */
export function renderLowerThird(blocks) {
  const c = createCanvas(WIDTH, HEIGHT)
  const g = c.getContext('2d')

  const boxW = 1700 - 2 * 64
  const boxX = (WIDTH - boxW) / 2
  const padX = 48, padY = 28
  const textW = boxW - 2 * padX
  const lineH = blocks.italic ? 1.375 : 1.25

  g.font = `${blocks.italic ? 'italic ' : ''}${blocks.weight} ${blocks.size}px ${FONT}`
  const lines = blocks.lines.flatMap(l => wrap(g, l, textW))

  const labelH = blocks.label ? 14 * 1.5 + 12 : 0
  const footerH = blocks.footer ? 12 + 12 * 1.5 : 0
  const textH = lines.length * blocks.size * lineH + (lines.length - 1) * 8
  const barH = 6
  const boxH = padY * 2 + labelH + textH + footerH + barH
  const boxY = HEIGHT - 56 - boxH

  // Bandeau sombre + barre colorée (clip sur les coins arrondis)
  g.save()
  g.beginPath()
  g.roundRect(boxX, boxY, boxW, boxH, 16)
  g.clip()
  g.fillStyle = 'rgba(0,0,0,0.72)'
  g.fillRect(boxX, boxY, boxW, boxH)
  const grad = g.createLinearGradient(boxX, 0, boxX + boxW, 0)
  grad.addColorStop(0, ACCENT[0]); grad.addColorStop(1, ACCENT[1])
  g.fillStyle = grad
  g.fillRect(boxX, boxY + boxH - barH, boxW, barH)
  g.restore()

  const x = boxX + padX
  let y = boxY + padY
  g.textBaseline = 'top'

  if (blocks.label) {
    g.font = `14px ${FONT}`
    g.fillStyle = 'rgba(255,255,255,0.45)'
    drawSpaced(g, blocks.label, x, y + 3, 14 * 0.35)
    y += labelH
  }

  g.font = `${blocks.italic ? 'italic ' : ''}${blocks.weight} ${blocks.size}px ${FONT}`
  g.fillStyle = '#ffffff'
  for (const line of lines) {
    g.fillText(line, x, y + (blocks.size * (lineH - 1)) / 2)
    y += blocks.size * lineH + 8
  }

  if (blocks.footer) {
    g.font = `12px ${FONT}`
    g.fillStyle = 'rgba(255,255,255,0.3)'
    drawSpaced(g, blocks.footer, x, y + 4, 12 * 0.1)
  }

  // Le DSK est réglé en « pré-multiplié » : on prémultiplie la couleur par l'alpha.
  const data = g.getImageData(0, 0, WIDTH, HEIGHT).data
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a === 255) continue
    data[i]     = (data[i]     * a + 127) / 255
    data[i + 1] = (data[i + 1] * a + 127) / 255
    data[i + 2] = (data[i + 2] * a + 127) / 255
  }
  return Buffer.from(data.buffer)
}

// ── Pilotage ATEM ─────────────────────────────────────────────────────────────

export function startLyrics(atem, { isConnected }) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const state = {
    enabled: process.env.ATEM_LYRICS !== '0',
    realtime: url && key ? 'connexion' : 'non configuré (.env.atem manquant)',
    onAir: false,
    lastEvent: null,
    lastError: null,
  }

  let slotIdx = 0
  let pending = null   // dernier événement reçu pendant un envoi en cours (les intermédiaires sont ignorés)
  let busy = false

  function dskOnAir() {
    return !!atem.state?.video?.downstreamKeyers?.[DSK]?.onAir
  }

  async function show(blocks) {
    const slot = STILL_SLOTS[slotIdx]
    slotIdx = (slotIdx + 1) % STILL_SLOTS.length
    await atem.uploadStill(slot, renderLowerThird(blocks), 'Paroles', 'Généré par atem-lyrics')
    await atem.setMediaPlayerSource({ sourceType: Enums.MediaSourceType.Still, stillIndex: slot }, MEDIA_PLAYER)
    if (!dskOnAir()) await atem.autoDownstreamKey(DSK, true)
    state.onAir = true
  }

  async function hide() {
    if (dskOnAir()) await atem.autoDownstreamKey(DSK, false)
    state.onAir = false
  }

  async function handle(event, payload) {
    state.lastEvent = event
    if (!state.enabled || !isConnected()) return
    const blocks = toBlocks(event, payload)
    if (blocks) await show(blocks)
    else await hide()   // blank, countdown, image, ou diapo vide
  }

  async function enqueue(event, payload) {
    pending = { event, payload }
    if (busy) return
    busy = true
    try {
      while (pending) {
        const job = pending
        pending = null
        try {
          await handle(job.event, job.payload)
          state.lastError = null
        } catch (e) {
          state.lastError = e.message
          console.error('⚠️  Paroles ATEM :', e.message)
        }
      }
    } finally {
      busy = false
    }
  }

  if (url && key) {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    supabase
      .channel('obs-live')
      .on('broadcast', { event: '*' }, ({ event, payload }) => enqueue(event, payload ?? {}))
      .subscribe((status) => {
        state.realtime = status === 'SUBSCRIBED' ? 'connecté' : status.toLowerCase()
        if (status === 'SUBSCRIBED') console.log('🎤 Paroles : canal obs-live connecté')
      })
  } else {
    console.log('🎤 Paroles : désactivées (SUPABASE_URL / SUPABASE_ANON_KEY absents de .env.atem)')
  }

  return {
    state,
    async setEnabled(on) {
      state.enabled = on
      if (!on && isConnected()) await hide()
    },
  }
}
