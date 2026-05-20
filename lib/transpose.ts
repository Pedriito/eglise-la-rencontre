// ── Transposition d'accords ────────────────────────────────────────────────

export const ALL_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
]

// Préférences d'enharmonie par tonalité (# ou b)
const SHARP_KEYS = new Set(['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'])

// Chromatique avec #
const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
// Chromatique avec b
const CHROMATIC_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

// Normalise les enharmoniques vers leur index 0-11
const NOTE_INDEX: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
}

/** Nombre de demi-tons pour passer de fromKey à toKey */
export function getSemitones(fromKey: string, toKey: string): number {
  const from = NOTE_INDEX[fromKey] ?? 0
  const to   = NOTE_INDEX[toKey]   ?? 0
  return ((to - from) + 12) % 12
}

/** Transpose une note brute (ex "C#", "Bb", "G") selon un delta de demi-tons */
function transposeNote(note: string, delta: number, useFlats: boolean): string {
  const idx = NOTE_INDEX[note]
  if (idx === undefined) return note
  const newIdx = (idx + delta + 12) % 12
  return useFlats ? CHROMATIC_FLAT[newIdx] : CHROMATIC_SHARP[newIdx]
}

// ── Détection des accords ─────────────────────────────────────────────────
//
// Qualité d'accord reconnue :
//   maj7, Maj7, min7, Min7, m7, M7, sus4, sus2, add9, aug, dim7...
//   Accords de basse : C/E, G/B, D/F#, Am/G
//
// Patterns intentionnellement EXCLUS des paroles :
//   Les tokens contenant des lettres autres que la note + qualité
//   (ex: "Gloire", "Dieu", "majesté" ne passent pas le test)

const QUALITY = '(?:maj|Maj|min|Min|sus|add|aug|dim|[mM])?[0-9]*'
const NOTE    = '[A-G][#b]?'
const SLASH   = `(?:\\/${NOTE}${QUALITY})?`

// Pattern complet pour un token d'accord (avec ancres ^ et $)
const CHORD_TOKEN_RE = new RegExp(`^${NOTE}${QUALITY}${SLASH}$`)

/** Détecte si un token isolé ressemble à un accord musical */
function isChordToken(token: string): boolean {
  return CHORD_TOKEN_RE.test(token)
}

/**
 * Détecte si une ligne est une ligne d'accords.
 * Heuristique : ≥ 50 % des tokens non-vides sont des accords reconnus.
 */
export function isChordLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false

  const tokens = trimmed.split(/\s+/)
  if (tokens.length === 0) return false

  const chordCount = tokens.filter(isChordToken).length
  return chordCount / tokens.length >= 0.5 && chordCount >= 1
}

/**
 * Détecte si une ligne est un en-tête de section (ex: [Verse 1], CHORUS, Intro)
 */
export function isSectionHeader(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  if (/^\[.+\]$/.test(t)) return true
  const KNOWN = /^(intro|verse|chorus|pre-chorus|bridge|outro|tag|coda|refrain|couplet|pont|verset)/i
  if (KNOWN.test(t) && t.length < 40) return true
  if (t === t.toUpperCase() && t.length < 30 && /[A-Z]/.test(t)) return true
  return false
}

/**
 * Transpose toute une grille d'accords.
 *
 * Pour chaque ligne d'accords, on remplace chaque accord (racine + qualité + basse)
 * en un seul passage regex, ce qui gère correctement les accords slash :
 *   C/E  →  D/F#   (les deux notes sont transposées)
 */
export function transposeChart(chart: string, fromKey: string, toKey: string): string {
  if (fromKey === toKey) return chart
  const delta = getSemitones(fromKey, toKey)
  const useFlats = !SHARP_KEYS.has(toKey)

  // Capture : (note_racine)(qualité)[/(note_basse)]
  // Le lookahead négatif (?![a-zA-Z]) évite les faux positifs dans les mots
  const TRANSPOSE_RE = new RegExp(
    `\\b(${NOTE})((?:maj|Maj|min|Min|sus|add|aug|dim|[mM])?[0-9]*)` +
    `(?:\\/(${NOTE}))?(?![a-zA-Z])`,
    'g'
  )

  return chart
    .split('\n')
    .map(line => {
      if (!isChordLine(line)) return line

      return line.replace(TRANSPOSE_RE, (_, root, quality, bass) => {
        const newRoot = transposeNote(root, delta, useFlats)
        const newBass = bass !== undefined ? '/' + transposeNote(bass, delta, useFlats) : ''
        return newRoot + quality + newBass
      })
    })
    .join('\n')
}
