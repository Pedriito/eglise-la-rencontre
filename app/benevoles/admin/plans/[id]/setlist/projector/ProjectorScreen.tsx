'use client'

import { useEffect, useState, useRef } from 'react'
import { buildAllSlides, type Slide } from '@/lib/parseSlides'
import { CountdownDisplay, COUNTDOWN_SECONDS } from '@/app/_components/CountdownDisplay'
import { type ProjectionSettings, DEFAULT_SETTINGS, getBgStyle, getTextStyle, loadGoogleFont } from '@/lib/projectionSettings'

type Song = {
  planSongId: string
  keySelected: string | null
  song: { id: number; title: string }
  arrangement: {
    id: string; name: string
    chord_chart: string | null; chord_chart_key: string | null
  } | null
}

type Props = { planId: string; songs: Song[]; settings?: ProjectionSettings }

export function ProjectorScreen({ planId, songs, settings: settingsProp }: Props) {
  const settings = settingsProp ?? DEFAULT_SETTINGS
  const [current, setCurrent]         = useState<{ songIdx: number; slideIdx: number }>({ songIdx: 0, slideIdx: 0 })
  const [projectedImageUrl, setProjectedImageUrl] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPrompt, setShowPrompt]   = useState(true)
  const [freeMessage, setFreeMessage] = useState<string | null>(null)
  const [slideOverrides, setSlideOverrides] = useState<Map<string, string[]>>(new Map())

  // Countdown
  const [countdown, setCountdown]     = useState<number | null>(null) // secondes restantes, null = inactif
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [verse, setVerse]               = useState<{ text: string; display: string; versionName: string } | null>(null)
  const [audioError, setAudioError]     = useState<string | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const audioRef   = useRef<HTMLAudioElement | null>(null)

  function tryPlayAudio() {
    const audio = audioRef.current
    if (!audio) { setAudioError('audio element introuvable'); return }
    audio.currentTime = 0
    const promise = audio.play()
    if (promise !== undefined) {
      promise
        .then(() => setAudioError(null))
        .catch((err: Error) => setAudioError(err.name + ': ' + err.message))
    }
  }

  function stopAudio() {
    setAudioError(null)
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
  }

  // Charger la Google Font si nécessaire
  useEffect(() => { loadGoogleFont(settings.font_family) }, [settings.font_family])

  const songSlides   = buildAllSlides(songs)
  const currentSong  = songSlides[current.songIdx]
  const currentSlide: Slide | null = currentSong?.slides[current.slideIdx] ?? null
  const slideKey     = `${current.songIdx}-${current.slideIdx}`
  const displayLines = slideOverrides.get(slideKey) ?? currentSlide?.lines ?? []

  // Police cohérente : basée sur la ligne la plus longue de tout le chant actif,
  // pas seulement de la diapo courante — évite les sauts de taille entre diapos.
  const allSongLines = currentSong?.slides
    .filter(s => !s.isBlank && s.lines.length > 0)
    .flatMap(s => s.lines) ?? []
  const songMaxLen = Math.max(...allSongLines.map(l => l.length), displayLines.reduce((m, l) => Math.max(m, l.length), 1), 1)
  // clamp : min 2.5rem, max 7rem — plus généreux qu'avant pour remplir l'écran
  const slideFs = `clamp(2.5rem, ${Math.min(95 / songMaxLen, 8).toFixed(2)}vw, 7rem)`

  // Gestion du countdown (tick)
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      setCountdown(null)
      stopAudio()
      return
    }
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownRef.current!)
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(countdownRef.current!)
  }, [countdown === null ? null : 'running']) // redémarre seulement au start/stop

  // Écouter les commandes de l'opérateur
  useEffect(() => {
    const ch = new BroadcastChannel(`projection-${planId}`)
    channelRef.current = ch
    ch.onmessage = (e) => {
      if (e.data?.type === 'GOTO') {
        setCurrent({ songIdx: e.data.songIdx, slideIdx: e.data.slideIdx })
        setFreeMessage(null)
        setCountdown(null)
        setShowPrompt(false)
      }
      if (e.data?.type === 'MESSAGE') {
        setFreeMessage(e.data.text)
        setVerse(null)
        setCountdown(null)
        setShowPrompt(false)
      }
      if (e.data?.type === 'CLEAR_MESSAGE') {
        setFreeMessage(null)
      }
      if (e.data?.type === 'VERSE') {
        setVerse({ text: e.data.text, display: e.data.display, versionName: e.data.versionName })
        setFreeMessage(null)
        setCountdown(null)
        setShowPrompt(false)
      }
      if (e.data?.type === 'CLEAR_VERSE') {
        setVerse(null)
      }
      if (e.data?.type === 'EDIT_SLIDE') {
        const key = `${e.data.songIdx}-${e.data.slideIdx}`
        setSlideOverrides(prev => {
          const next = new Map(prev)
          next.set(key, e.data.lines)
          return next
        })
      }
      if (e.data?.type === 'COUNTDOWN_START') {
        setFreeMessage(null)
        setShowPrompt(false)
        setCountdown(COUNTDOWN_SECONDS)
        tryPlayAudio()
      }
      if (e.data?.type === 'COUNTDOWN_STOP') {
        clearInterval(countdownRef.current!)
        setCountdown(null)
        stopAudio()
      }
      if (e.data?.type === 'IMAGE') {
        setProjectedImageUrl(e.data.url)
        setFreeMessage(null)
        setVerse(null)
        setCountdown(null)
        setShowPrompt(false)
      }
      if (e.data?.type === 'CLEAR_IMAGE') {
        setProjectedImageUrl(null)
      }
    }
    ch.postMessage({ type: 'READY' })
    return () => ch.close()
  }, [planId])

  // Suivre l'état plein écran
  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function enterFullscreen() {
    document.documentElement.requestFullscreen().catch(() => {})
    setShowPrompt(false)
    // Déverrouille l'audio dès le premier geste utilisateur :
    // play() immédiatement suivi de pause() "autorise" les play() ultérieurs
    // déclenchés programmatiquement (ex. depuis BroadcastChannel).
    const audio = audioRef.current
    if (audio) {
      audio.play().then(() => { audio.pause(); audio.currentTime = 0 }).catch(() => {})
    }
  }

  const bgStyle = getBgStyle(settings)
  const txtStyle = getTextStyle(settings)

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-none overflow-hidden"
      style={bgStyle}
      onClick={!isFullscreen ? enterFullscreen : undefined}
    >
      {/* Overlay sombre pour les fonds image */}
      {settings.bg_type === 'image' && settings.overlay_opacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: `rgba(0,0,0,${settings.overlay_opacity})` }}
        />
      )}
      {/* Élément audio géré par le DOM — preload automatique */}
      <audio
        ref={audioRef}
        loop
        preload="auto"
        style={{ display: 'none' }}
        onError={(e) => console.error('[audio] load error:', (e.target as HTMLAudioElement).error?.message, (e.target as HTMLAudioElement).src)}
        onCanPlayThrough={() => console.log('[audio] ready to play')}
      >
        <source src="/countdown-music.mp3" type="audio/mpeg" />
      </audio>
      {/* Invite plein écran */}
      {showPrompt && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <p className="text-white/50 font-sans text-sm mb-2">Cliquez pour passer en plein écran</p>
            <p className="text-white/20 font-sans text-xs">F11 fonctionne aussi</p>
          </div>
        </div>
      )}

      {/* Bouton plein écran discret */}
      {!isFullscreen && !showPrompt && (
        <button
          onClick={enterFullscreen}
          className="absolute top-3 right-3 z-10 text-white/20 hover:text-white/60 font-sans text-xs px-2 py-1 rounded transition-colors cursor-pointer"
        >
          ⛶ Plein écran
        </button>
      )}

      {/* ── COUNTDOWN ── */}
      {!showPrompt && countdown !== null && (
        <CountdownDisplay seconds={countdown} />
      )}

      {/* Image projetée */}
      {!showPrompt && projectedImageUrl && (
        <div
          className="absolute inset-0"
          style={{ backgroundImage: `url(${projectedImageUrl})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
        />
      )}

      {/* Message libre */}
      {!showPrompt && countdown === null && !projectedImageUrl && freeMessage && !verse && (
        <div className="text-center px-16 max-w-4xl w-full relative">
          {freeMessage.split('\n').map((line, i) => {
            const maxLen = Math.max(...freeMessage.split('\n').map(l => l.length), 1)
            const fs = `clamp(1.8rem, ${Math.min(85 / maxLen, 6).toFixed(2)}vw, 5rem)`
            return (
              <p key={i} className="font-semibold leading-tight uppercase" style={{ ...txtStyle, fontSize: fs }}>
                {line}
              </p>
            )
          })}
        </div>
      )}

      {/* Verset biblique */}
      {!showPrompt && countdown === null && !projectedImageUrl && verse && (
        <div className="text-center px-12 max-w-6xl w-full relative">
          <p className="text-xl uppercase tracking-[0.3em] mb-10 font-sans" style={{ color: settings.text_color + '66' }}>
            {verse.display}
          </p>
          <div className="space-y-6">
            {verse.text.split('\n').map((line, i) => {
              const verseLines = verse.text.split('\n')
              const maxLen = Math.max(...verseLines.map(l => l.length), 1)
              const fs = `clamp(2.2rem, ${Math.min(90 / maxLen, 6.5).toFixed(2)}vw, 5.5rem)`
              return (
                <p key={i} className="font-light leading-snug italic" style={{ ...txtStyle, fontSize: fs }}>
                  {line}
                </p>
              )
            })}
          </div>
          <p className="text-base font-sans mt-12 uppercase tracking-widest" style={{ color: settings.text_color + '33' }}>
            {verse.versionName}
          </p>
        </div>
      )}

      {/* Contenu de la diapo */}
      {!showPrompt && countdown === null && !projectedImageUrl && !freeMessage && !verse && currentSlide && !currentSlide.isBlank && (
        <div className="text-center px-12 max-w-6xl w-full relative">
          {currentSlide.section && (
            <p className="text-base uppercase tracking-[0.4em] mb-10 font-sans" style={{ color: settings.text_color + '40' }}>
              {currentSlide.section}
            </p>
          )}
          <div className="space-y-6">
            {displayLines.map((line, i) => (
              <p key={i} className="font-semibold leading-tight uppercase" style={{ ...txtStyle, fontSize: slideFs }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Erreur audio — affiche le message réel pour diagnostic */}
      {audioError && (
        <button
          onClick={tryPlayAudio}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[10000]"
          style={{ cursor: 'pointer' }}
        >
          <div className="bg-white/15 backdrop-blur-sm border border-white/30 rounded-2xl px-8 py-4 text-center space-y-1">
            <p className="text-white font-sans text-base font-semibold">🔇 Cliquez ici pour activer le son</p>
            <p className="text-white/50 font-sans text-xs">{audioError}</p>
          </div>
        </button>
      )}

      {/* Titre discret en bas */}
      {currentSong && !showPrompt && countdown === null && (
        <p className="absolute bottom-6 right-8 text-white/10 text-xs font-sans">
          {currentSong.title}
        </p>
      )}
    </div>
  )
}

