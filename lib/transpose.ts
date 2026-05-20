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

// Regex qui capture une note (A-G, optionnel #/b) suivie éventuellement d'un suffixe d'accord
// Exclut les lettres isolées dans un mot (ex "Am" = note + suffix, pas un mot)
const CHORD_RE = /\b([A-G][#b]?)((?:maj|min|m|M|sus|add|aug|dim|[0-9\/])*)\b/g

/** Transpose toutes les notes d'un token d'accord */
function transposeChord(chord: string, delta: number, useFlats: boolean): string {
  return chord.replace(CHORD_RE, (_, note, suffix) => {
    return transposeNote(note, delta, useFlats) + suffix
  })
}

/**
 * Détecte si une ligne est une ligne d'accords.
 * Heuristique : ≥ 50 % des tokens non-vides commencent par [A-G][#b]?
 * et la ligne ne ressemble pas à du texte normal (peu de petits mots).
 */
export function isChordLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false

  const tokens = trimmed.split(/\s+/)
  if (tokens.length === 0) return false

  const chordCount = tokens.filter(t => /^[A-G][#b]?(maj|min|m|M|sus|add|aug|dim|[0-9\/])*$/.test(t)).length
  const ratio = chordCount / tokens.length

  // Une ligne d'accords a majoritairement des tokens qui ressemblent à des accords
  return ratio >= 0.5 && chordCount >= 1
}

/**
 * Détecte si une ligne est un en-tête de section (ex: [Verse 1], CHORUS, Intro)
 * Heuristique : ligne courte, entre crochets ou tout en majuscules ou mot clé connu.
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
 * Les lignes détectées comme "lignes d'accords" sont transposées token par token.
 * Les autres lignes sont laissées intactes.
 */
export function transposeChart(chart: string, fromKey: string, toKey: string): string {
  if (fromKey === toKey) return chart
  const delta = getSemitones(fromKey, toKey)
  const useFlats = !SHARP_KEYS.has(toKey)

  return chart
    .split('\n')
    .map(line => {
      if (!isChordLine(line)) return line
      // Transpose token par token pour préserver l'espacement
      return line.replace(/[A-G][#b]?(?:maj|min|m|M|sus|add|aug|dim|[0-9\/])*/g, chord => {
        return transposeChord(chord, delta, useFlats)
      })
    })
    .join('\n')
}
