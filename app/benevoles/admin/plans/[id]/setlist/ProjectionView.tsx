'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { buildAllSlides, type Slide } from '@/lib/parseSlides'

type Song = {
  planSongId: string
  orderIndex: number
  keySelected: string | null
  song: { id: number; title: string }
  arrangement: {
    id: string; name: string
    chord_chart: string | null; chord_chart_key: string | null
  } | null
}

type Props = {
  planId: string
  songs: Song[]
  initialSongIdx: number
  onClose: () => void
}

export function ProjectionView({ planId, songs, initialSongIdx, onClose }: Props) {
  const [current, setCurrent] = useState({ songIdx: initialSongIdx, slideIdx: 0 })
  const [projectorReady, setProjectorReady] = useState(false)
  const [projectorWindow, setProjectorWindow] = useState<Window | null>(null)
  const [freeMessage, setFreeMessage] = useState('')
  const [isShowingMessage, setIsShowingMessage] = useState(false)
  const channelRef = useRef<BroadcastChannel | null>(null)

  const songSlides = buildAllSlides(songs)

  // Toutes les diapos à plat avec leur position
  const allSlides: { songIdx: number; slideIdx: number; slide: Slide; songTitle: string }[] = []
  songSlides.forEach((ss, si) => {
    ss.slides.forEach((slide, di) => {
      allSlides.push({ songIdx: si, slideIdx: di, slide, songTitle: ss.title })
    })
  })

  const currentSong  = songSlides[current.songIdx]
  const currentSlide = currentSong?.slides[current.slideIdx] ?? null
  const nextSlide    = (() => {
    const nextInSong = currentSong?.slides[current.slideIdx + 1]
    if (nextInSong) return nextInSong
    const nextSong = songSlides[current.songIdx + 1]
    return nextSong?.slides[0] ?? null
  })()

  // Ouvrir / fermer le BroadcastChannel
  useEffect(() => {
    const ch = new BroadcastChannel(`projection-${planId}`)
    channelRef.current = ch
    ch.onmessage = (e) => {
      if (e.data?.type === 'READY') setProjectorReady(true)
    }
    return () => ch.close()
  }, [planId])

  // Ouvrir la fenêtre projecteur
  useEffect(() => {
    const url = `/benevoles/admin/plans/${planId}/setlist/projector`
    const win = window.open(url, `projector-${planId}`, 'noopener')
    if (win) setProjectorWindow(win)
    return () => { win?.close() }
  }, [planId])

  // Envoyer la commande au projecteur
  const goto = useCallback((songIdx: number, slideIdx: number) => {
    setCurrent({ songIdx, slideIdx })
    setIsShowingMessage(false)
    channelRef.current?.postMessage({ type: 'GOTO', songIdx, slideIdx })
  }, [])

  function projectMessage() {
    if (!freeMessage.trim()) return
    setIsShowingMessage(true)
    channelRef.current?.postMessage({ type: 'MESSAGE', text: freeMessage.trim() })
  }

  function clearMessage() {
    setIsShowingMessage(false)
    channelRef.current?.postMessage({ type: 'CLEAR_MESSAGE' })
  }

  // Navigation clavier
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        const nextInSong = currentSong?.slides[current.slideIdx + 1]
        if (nextInSong) {
          goto(current.songIdx, current.slideIdx + 1)
        } else if (current.songIdx < songs.length - 1) {
          goto(current.songIdx + 1, 0)
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (current.slideIdx > 0) {
          goto(current.songIdx, current.slideIdx - 1)
        } else if (current.songIdx > 0) {
          const prevSong = songSlides[current.songIdx - 1]
          goto(current.songIdx - 1, Math.max(0, prevSong.slides.length - 1))
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, currentSong, goto, onClose, songs.length, songSlides])

  // Scroll automatique vers la diapo active dans la grille
  const activeRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [current])

  const isFirst = current.songIdx === 0 && current.slideIdx === 0
  const isLast  = current.songIdx === songs.length - 1 &&
                  current.slideIdx === (currentSong?.slides.length ?? 1) - 1

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col text-white">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
        <div>
          <p className="font-sans text-xs text-white/40 uppercase tracking-widest">Tableau de bord opérateur</p>
          <p className="font-display text-base font-light text-white/80">
            {songSlides[current.songIdx]?.title}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Statut projecteur */}
          <div className="flex items-center gap-1.5">
            <span className={`block w-2 h-2 rounded-full ${projectorReady ? 'bg-green-400' : 'bg-amber-400 animate-pulse'}`} />
            <span className="font-sans text-xs text-white/40">
              {projectorReady ? 'Projecteur connecté' : 'En attente du projecteur…'}
            </span>
          </div>
          {projectorWindow && (
            <button
              onClick={() => projectorWindow.focus()}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg font-sans text-xs transition-colors"
            >
              ↗ Basculer sur l'écran
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white/10 hover:bg-red-500/40 rounded-lg font-sans text-xs transition-colors"
          >
            ✕ Quitter
          </button>
        </div>
      </div>

      {/* ── Corps : prévisualisation + grille ── */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* Prévisualisation courante + suivante */}
        <div className="w-80 shrink-0 flex flex-col gap-3 p-4 border-r border-white/10">
          {/* Diapo courante */}
          <div>
            <p className="font-sans text-[10px] uppercase tracking-widest text-white/30 mb-2">En cours</p>
            <SlidePreview slide={currentSlide} size="lg" />
          </div>
          {/* Diapo suivante */}
          <div>
            <p className="font-sans text-[10px] uppercase tracking-widest text-white/30 mb-2">Suivante</p>
            <SlidePreview slide={nextSlide} size="sm" dim />
          </div>

          {/* Message libre */}
          <div className="border border-white/10 rounded-xl p-3 space-y-2">
            <p className="font-sans text-[10px] uppercase tracking-widest text-white/30">Message libre</p>
            <textarea
              value={freeMessage}
              onChange={e => setFreeMessage(e.target.value)}
              placeholder="Voiture à déplacer, sujet de prière…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 font-sans text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none"
            />
            {isShowingMessage ? (
              <button
                onClick={clearMessage}
                className="w-full py-2 bg-amber-500/80 hover:bg-amber-500 rounded-lg font-sans text-xs font-semibold text-white transition-colors"
              >
                ✕ Effacer le message
              </button>
            ) : (
              <button
                onClick={projectMessage}
                disabled={!freeMessage.trim()}
                className="w-full py-2 bg-white/10 hover:bg-white/20 disabled:opacity-25 rounded-lg font-sans text-xs font-semibold text-white transition-colors"
              >
                ↑ Projeter ce message
              </button>
            )}
          </div>

          {/* Boutons prev / next */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (current.slideIdx > 0) goto(current.songIdx, current.slideIdx - 1)
                else if (current.songIdx > 0) {
                  const prev = songSlides[current.songIdx - 1]
                  goto(current.songIdx - 1, Math.max(0, prev.slides.length - 1))
                }
              }}
              disabled={isFirst}
              className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-25 rounded-xl font-sans text-sm transition-colors"
            >
              ← Précédente
            </button>
            <button
              onClick={() => {
                const nextInSong = currentSong?.slides[current.slideIdx + 1]
                if (nextInSong) goto(current.songIdx, current.slideIdx + 1)
                else if (current.songIdx < songs.length - 1) goto(current.songIdx + 1, 0)
              }}
              disabled={isLast}
              className="flex-1 py-2.5 bg-teal hover:bg-teal/80 disabled:opacity-25 rounded-xl font-sans text-sm font-semibold transition-colors"
            >
              Suivante →
            </button>
          </div>
        </div>

        {/* Grille de toutes les diapos */}
        <div className="flex-1 overflow-y-auto p-4">
          {songSlides.map((ss, si) => {
            if (ss.slides.length === 0) return null
            return (
              <div key={si} className="mb-6">
                {/* Titre du chant */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-sans text-xs text-white/30 tabular-nums w-4">{si + 1}</span>
                  <p className="font-display text-sm text-white/60 font-light">{ss.title}</p>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Diapos du chant */}
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 pl-7">
                  {ss.slides.map((slide, di) => {
                    const isActive = current.songIdx === si && current.slideIdx === di
                    return (
                      <button
                        key={di}
                        ref={isActive ? activeRef : null}
                        onClick={() => goto(si, di)}
                        className={`relative rounded-lg border-2 transition-all text-left overflow-hidden aspect-video flex flex-col items-center justify-center px-2 py-1.5 ${
                          isActive
                            ? 'border-teal bg-teal/10 ring-1 ring-teal/50'
                            : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                        }`}
                      >
                        {slide.isBlank ? (
                          <span className="text-white/20 text-base">⬛</span>
                        ) : (
                          <>
                            {slide.section && (
                              <p className="text-white/30 text-[8px] uppercase tracking-wider leading-none mb-1 text-center truncate w-full">
                                {slide.section}
                              </p>
                            )}
                            {slide.lines.map((line, li) => (
                              <p key={li} className="text-white text-[9px] leading-tight text-center truncate w-full">
                                {line}
                              </p>
                            ))}
                          </>
                        )}
                        {isActive && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-teal" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Composant prévisualisation ── */
function SlidePreview({ slide, size, dim }: { slide: Slide | null; size: 'lg' | 'sm'; dim?: boolean }) {
  const padding = size === 'lg' ? 'px-4 py-5' : 'px-3 py-3'
  const textSize = size === 'lg' ? 'text-sm' : 'text-xs'
  const labelSize = size === 'lg' ? 'text-[9px]' : 'text-[8px]'

  return (
    <div className={`bg-black rounded-xl border border-white/10 aspect-video flex flex-col items-center justify-center ${padding} ${dim ? 'opacity-50' : ''}`}>
      {slide ? (
        <>
          {slide.section && (
            <p className={`text-white/30 ${labelSize} uppercase tracking-wider mb-2 text-center`}>
              {slide.section}
            </p>
          )}
          {slide.lines.map((line, i) => (
            <p key={i} className={`text-white ${textSize} leading-snug text-center font-sans font-semibold`}>
              {line}
            </p>
          ))}
        </>
      ) : (
        <p className="text-white/20 text-xs font-sans">—</p>
      )}
    </div>
  )
}
