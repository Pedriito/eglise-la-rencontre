'use client'

import { useEffect, useState, useRef } from 'react'
import { buildAllSlides, type Slide } from '@/lib/parseSlides'

type Song = {
  planSongId: string
  keySelected: string | null
  song: { id: number; title: string }
  arrangement: {
    id: string; name: string
    chord_chart: string | null; chord_chart_key: string | null
  } | null
}

type Props = { planId: string; songs: Song[] }

export function ProjectorScreen({ planId, songs }: Props) {
  const [current, setCurrent] = useState<{ songIdx: number; slideIdx: number }>({ songIdx: 0, slideIdx: 0 })
  const channelRef = useRef<BroadcastChannel | null>(null)

  // Construire toutes les diapos
  const songSlides = buildAllSlides(songs)

  // Diapo courante
  const currentSong = songSlides[current.songIdx]
  const currentSlide: Slide | null = currentSong?.slides[current.slideIdx] ?? null

  // Écouter les commandes de l'opérateur
  useEffect(() => {
    const ch = new BroadcastChannel(`projection-${planId}`)
    channelRef.current = ch
    ch.onmessage = (e) => {
      if (e.data?.type === 'GOTO') {
        setCurrent({ songIdx: e.data.songIdx, slideIdx: e.data.slideIdx })
      }
      if (e.data?.type === 'BLANK') {
        setCurrent(c => ({ ...c })) // re-render pour afficher le blanc
      }
    }
    // Signaler qu'on est prêt
    ch.postMessage({ type: 'READY' })
    return () => ch.close()
  }, [planId])

  // Plein écran automatique
  useEffect(() => {
    const el = document.documentElement
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    }
    return () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center select-none">
      {currentSlide ? (
        <div className="text-center px-16 max-w-5xl w-full">
          {currentSlide.section && (
            <p className="text-white/20 text-sm uppercase tracking-[0.35em] mb-10 font-sans">
              {currentSlide.section}
            </p>
          )}
          <div className="space-y-5">
            {currentSlide.lines.map((line, i) => (
              <p
                key={i}
                className="text-white font-display font-light leading-tight"
                style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <div /> // écran noir vide (transition / début)
      )}

      {/* Titre du chant en très discret en bas */}
      {currentSong && (
        <p className="absolute bottom-6 right-8 text-white/10 text-xs font-sans">
          {currentSong.title}
        </p>
      )}
    </div>
  )
}
