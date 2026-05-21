import { isChordLine, isSectionHeader, transposeChart } from './transpose'

export type Slide = {
  songIdx: number
  slideIdx: number
  section: string
  lines: string[]
  isBlank?: boolean
}

export type SongSlides = {
  title: string
  slides: Slide[]
}

type SongInput = {
  song: { title: string }
  keySelected: string | null
  arrangement: {
    chord_chart: string | null
    chord_chart_key: string | null
  } | null
}

function parseSongSlides(chart: string, fromKey: string | null, toKey: string | null, songIdx: number): Slide[] {
  const text = fromKey && toKey && fromKey !== toKey
    ? transposeChart(chart, fromKey, toKey)
    : chart

  const slides: Slide[] = []
  let currentSection = ''
  let lyricBuffer: string[] = []
  let localSlideIdx = 0

  function flushBuffer() {
    for (let i = 0; i < lyricBuffer.length; i += 2) {
      const pair = lyricBuffer.slice(i, i + 2)
      slides.push({ songIdx, slideIdx: localSlideIdx++, section: currentSection, lines: pair })
    }
    lyricBuffer = []
  }

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    if (line.trim() === '') { flushBuffer(); continue }
    if (isChordLine(line)) continue
    if (isSectionHeader(line)) {
      flushBuffer()
      currentSection = line.trim().replace(/^\[|\]$/g, '').trim()
      continue
    }
    lyricBuffer.push(line.trim())
  }
  flushBuffer()

  return slides.filter(s => s.lines.length > 0)
}

export function buildAllSlides(songs: SongInput[]): SongSlides[] {
  return songs.map((s, songIdx) => {
    const chart = s.arrangement?.chord_chart ?? ''
    const fromKey = s.arrangement?.chord_chart_key ?? null
    const toKey = s.keySelected ?? fromKey
    const slides = chart ? parseSongSlides(chart, fromKey, toKey, songIdx) : []
    // Diapo noire de transition au début de chaque chant
    const blankSlide: Slide = { songIdx, slideIdx: 0, section: '', lines: [], isBlank: true }
    const numbered = [blankSlide, ...slides].map((sl, i) => ({ ...sl, slideIdx: i }))
    return { title: s.song.title, slides: numbered }
  })
}
