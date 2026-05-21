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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPrompt, setShowPrompt] = useState(true)
  const channelRef = useRef<BroadcastChannel | null>(null)

  const songSlides = buildAllSlides(songs)
  const currentSong  = songSlides[current.songIdx]
  const currentSlide: Slide | null = currentSong?.slides[current.slideIdx] ?? null

  // Écouter les commandes de l'opérateur
  useEffect(() => {
    const ch = new BroadcastChannel(`projection-${planId}`)
    channelRef.current = ch
    ch.onmessage = (e) => {
      if (e.data?.type === 'GOTO') {
        setCurrent({ songIdx: e.data.songIdx, slideIdx: e.data.slideIdx })
        setShowPrompt(false)
      }
    }
    ch.postMessage({ type: 'READY' })
    return () => ch.close()
  }, [planId])

  // Suivre l'état plein écran
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function enterFullscreen() {
    document.documentElement.requestFullscreen().catch(() => {})
    setShowPrompt(false)
  }

  return (
    // z-[9999] pour passer par-dessus la sidebar et tout le layout
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center select-none cursor-none"
      onClick={!isFullscreen ? enterFullscreen : undefined}
    >

      {/* Invite plein écran — disparaît dès le premier clic */}
      {showPrompt && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <p className="text-white/50 font-sans text-sm mb-2">Cliquez pour passer en plein écran</p>
            <p className="text-white/20 font-sans text-xs">F11 fonctionne aussi</p>
          </div>
        </div>
      )}

      {/* Bouton plein écran discret si pas encore en plein écran et prompt masqué */}
      {!isFullscreen && !showPrompt && (
        <button
          onClick={enterFullscreen}
          className="absolute top-3 right-3 z-10 text-white/20 hover:text-white/60 font-sans text-xs px-2 py-1 rounded transition-colors cursor-pointer"
        >
          ⛶ Plein écran
        </button>
      )}

      {/* Contenu de la diapo */}
      {!showPrompt && (
        currentSlide ? (
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
                  className="text-white font-sans font-semibold leading-tight"
                  style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div /> // écran noir (entre deux diapos)
        )
      )}

      {/* Titre discret en bas */}
      {currentSong && !showPrompt && (
        <p className="absolute bottom-6 right-8 text-white/10 text-xs font-sans">
          {currentSong.title}
        </p>
      )}
    </div>
  )
}
