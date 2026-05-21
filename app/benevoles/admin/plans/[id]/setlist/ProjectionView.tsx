'use client'

import { useState, useEffect, useCallback } from 'react'
import { isChordLine, isSectionHeader, transposeChart } from '@/lib/transpose'

type Song = {
  planSongId: string
  orderIndex: number
  keySelected: string | null
  song: { id: number; title: string }
  arrangement: {
    id: string
    name: string
    chord_chart: string | null
    chord_chart_key: string | null
  } | null
}

type Slide = {
  section: string
  lines: string[]
}

type Props = {
  songs: Song[]
  initialSongIdx: number
  onClose: () => void
}

function parseSlides(chart: string, fromKey: string | null, toKey: string | null): Slide[] {
  // Transposer si nécessaire
  const text = fromKey && toKey && fromKey !== toKey
    ? transposeChart(chart, fromKey, toKey)
    : chart

  const rawLines = text.split('\n')
  const slides: Slide[] = []
  let currentSection = ''
  let lyricBuffer: string[] = []

  function flushBuffer() {
    // Regroupe les lignes de paroles par 2 (max 2 lignes/diapo)
    for (let i = 0; i < lyricBuffer.length; i += 2) {
      const pair = lyricBuffer.slice(i, i + 2)
      slides.push({ section: currentSection, lines: pair })
    }
    lyricBuffer = []
  }

  for (const raw of rawLines) {
    const line = raw.trimEnd()

    // Ligne vide → coupe naturelle : flush par 2 mais garde la section
    if (line.trim() === '') {
      flushBuffer()
      continue
    }

    // Ligne d'accords → ignorée
    if (isChordLine(line)) continue

    // En-tête de section (COUPLET 1, REFRAIN…)
    if (isSectionHeader(line)) {
      flushBuffer()
      currentSection = line.trim().replace(/^\[|\]$/g, '').trim()
      continue
    }

    // Ligne de paroles
    lyricBuffer.push(line.trim())
  }

  flushBuffer()

  // Filtrer les diapos vides
  return slides.filter(s => s.lines.length > 0)
}

export function ProjectionView({ songs, initialSongIdx, onClose }: Props) {
  const [songIdx, setSongIdx] = useState(initialSongIdx)
  const [slideIdx, setSlideIdx] = useState(0)
  const [showControls, setShowControls] = useState(true)

  const song = songs[songIdx]
  const chart = song?.arrangement?.chord_chart ?? ''
  const fromKey = song?.arrangement?.chord_chart_key ?? null
  const toKey = song?.keySelected ?? fromKey

  const slides = chart ? parseSlides(chart, fromKey, toKey) : []
  const totalSlides = slides.length
  const currentSlide = slides[slideIdx] ?? null

  // Auto-hide controls après 3 secondes
  useEffect(() => {
    setShowControls(true)
    const t = setTimeout(() => setShowControls(false), 3000)
    return () => clearTimeout(t)
  }, [slideIdx, songIdx])

  const goNext = useCallback(() => {
    if (slideIdx < totalSlides - 1) {
      setSlideIdx(s => s + 1)
    } else if (songIdx < songs.length - 1) {
      setSongIdx(s => s + 1)
      setSlideIdx(0)
    }
  }, [slideIdx, totalSlides, songIdx, songs.length])

  const goPrev = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx(s => s - 1)
    } else if (songIdx > 0) {
      const prevSong = songs[songIdx - 1]
      const prevChart = prevSong?.arrangement?.chord_chart ?? ''
      const prevFrom = prevSong?.arrangement?.chord_chart_key ?? null
      const prevTo = prevSong?.keySelected ?? prevFrom
      const prevSlides = prevChart ? parseSlides(prevChart, prevFrom, prevTo) : []
      setSongIdx(s => s - 1)
      setSlideIdx(Math.max(0, prevSlides.length - 1))
    }
  }, [slideIdx, songIdx, songs])

  // Navigation clavier
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, onClose])

  const isFirst = songIdx === 0 && slideIdx === 0
  const isLast  = songIdx === songs.length - 1 && slideIdx === totalSlides - 1

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none">

      {/* Zone de clic : moitié gauche = précédent, moitié droite = suivant */}
      <div className="absolute inset-0 flex">
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="flex-1 h-full cursor-pointer disabled:cursor-default"
          aria-label="Diapo précédente"
        />
        <button
          onClick={goNext}
          disabled={isLast}
          className="flex-1 h-full cursor-pointer disabled:cursor-default"
          aria-label="Diapo suivante"
        />
      </div>

      {/* Contenu central */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 pointer-events-none">
        {currentSlide ? (
          <>
            {currentSlide.section && (
              <p className="text-white/25 text-xs uppercase tracking-[0.3em] mb-8 font-sans">
                {currentSlide.section}
              </p>
            )}
            <div className="text-center space-y-4">
              {currentSlide.lines.map((line, i) => (
                <p
                  key={i}
                  className="text-white font-display font-light leading-tight"
                  style={{ fontSize: 'clamp(1.8rem, 4.5vw, 3.5rem)' }}
                >
                  {line}
                </p>
              ))}
            </div>
          </>
        ) : (
          <p className="text-white/30 font-sans text-lg">Pas de paroles pour ce chant.</p>
        )}
      </div>

      {/* Barre de contrôles (auto-hide) */}
      <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onMouseMove={() => setShowControls(true)}
      >
        <div className="bg-gradient-to-t from-black/80 to-transparent px-6 pb-6 pt-10">
          <div className="flex items-end justify-between">

            {/* Info chant + diapo */}
            <div className="min-w-0">
              <p className="text-white/50 text-xs font-sans uppercase tracking-widest mb-0.5">
                {songIdx + 1} / {songs.length}
              </p>
              <p className="text-white font-display text-lg font-light truncate">
                {song?.song.title}
              </p>
              {totalSlides > 0 && (
                <p className="text-white/40 text-xs font-sans mt-0.5">
                  Diapo {slideIdx + 1} / {totalSlides}
                </p>
              )}
            </div>

            {/* Boutons navigation + fermer */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={goPrev}
                disabled={isFirst}
                className="text-white/50 hover:text-white disabled:opacity-20 transition-colors font-sans text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 pointer-events-auto"
              >
                ←
              </button>
              <button
                onClick={goNext}
                disabled={isLast}
                className="text-white/50 hover:text-white disabled:opacity-20 transition-colors font-sans text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 pointer-events-auto"
              >
                →
              </button>

              {/* Sélecteur de chant */}
              <select
                value={songIdx}
                onChange={e => { setSongIdx(Number(e.target.value)); setSlideIdx(0) }}
                className="bg-white/10 text-white text-sm font-sans rounded-lg px-3 py-1.5 border border-white/20 focus:outline-none pointer-events-auto"
              >
                {songs.map((s, i) => (
                  <option key={s.planSongId} value={i} className="bg-black">
                    {i + 1}. {s.song.title}
                  </option>
                ))}
              </select>

              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors font-sans text-sm px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 pointer-events-auto"
                title="Quitter (Échap)"
              >
                ✕ Quitter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Indicateur de progression (traits en bas) */}
      {totalSlides > 1 && (
        <div className="absolute bottom-0 left-0 right-0 flex gap-0.5 px-2 pb-1 pointer-events-none opacity-30">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full transition-colors ${i === slideIdx ? 'bg-white' : 'bg-white/30'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
