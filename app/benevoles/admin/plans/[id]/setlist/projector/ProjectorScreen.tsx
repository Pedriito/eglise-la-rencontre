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

const COUNTDOWN_SECONDS = 5 * 60

export function ProjectorScreen({ planId, songs }: Props) {
  const [current, setCurrent]         = useState<{ songIdx: number; slideIdx: number }>({ songIdx: 0, slideIdx: 0 })
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

  const songSlides   = buildAllSlides(songs)
  const currentSong  = songSlides[current.songIdx]
  const currentSlide: Slide | null = currentSong?.slides[current.slideIdx] ?? null
  const slideKey     = `${current.songIdx}-${current.slideIdx}`
  const displayLines = slideOverrides.get(slideKey) ?? currentSlide?.lines ?? []

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

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center select-none cursor-none"
      onClick={!isFullscreen ? enterFullscreen : undefined}
    >
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

      {/* Message libre */}
      {!showPrompt && countdown === null && freeMessage && !verse && (
        <div className="text-center px-16 max-w-4xl w-full">
          {freeMessage.split('\n').map((line, i) => {
            const maxLen = Math.max(...freeMessage.split('\n').map(l => l.length), 1)
            const fs = `clamp(1.8rem, ${Math.min(85 / maxLen, 6).toFixed(2)}vw, 5rem)`
            return (
              <p key={i} className="text-white font-sans font-semibold leading-tight uppercase" style={{ fontSize: fs }}>
                {line}
              </p>
            )
          })}
        </div>
      )}

      {/* Verset biblique */}
      {!showPrompt && countdown === null && verse && (
        <div className="text-center px-16 max-w-5xl w-full">
          <p className="text-white/40 text-lg uppercase tracking-[0.3em] mb-10 font-sans">
            {verse.display}
          </p>
          <div className="space-y-5">
            {verse.text.split('\n').map((line, i) => {
              const maxLen = Math.max(...verse.text.split('\n').map(l => l.length), 1)
              const fs = `clamp(1.5rem, ${Math.min(80 / maxLen, 5).toFixed(2)}vw, 4rem)`
              return (
                <p key={i} className="text-white font-sans font-light leading-snug italic" style={{ fontSize: fs }}>
                  {line}
                </p>
              )
            })}
          </div>
          <p className="text-white/20 text-sm font-sans mt-10 uppercase tracking-widest">
            {verse.versionName}
          </p>
        </div>
      )}

      {/* Contenu de la diapo */}
      {!showPrompt && countdown === null && !freeMessage && !verse && currentSlide && !currentSlide.isBlank && (
        <div className="text-center px-16 max-w-5xl w-full">
          {currentSlide.section && (
            <p className="text-white/25 text-base uppercase tracking-[0.4em] mb-12 font-sans">
              {currentSlide.section}
            </p>
          )}
          <div className="space-y-5">
            {(() => {
              const maxLen = Math.max(...displayLines.map(l => l.length), 1)
              const fs = `clamp(1.8rem, ${Math.min(85 / maxLen, 6).toFixed(2)}vw, 5rem)`
              return displayLines.map((line, i) => (
                <p key={i} className="text-white font-sans font-semibold leading-tight uppercase" style={{ fontSize: fs }}>
                  {line}
                </p>
              ))
            })()}
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

/* ── Composant Countdown ── */
// 115 BPM = 60 000 / 115 ≈ 521 ms par temps
const BPM_BEAT = Math.round(60_000 / 115) // 521 ms

function CountdownDisplay({ seconds }: { seconds: number }) {
  const total    = COUNTDOWN_SECONDS
  const mins     = Math.floor(seconds / 60)
  const secs     = seconds % 60
  const timeStr  = `${mins}:${secs.toString().padStart(2, '0')}`
  const progress = seconds / total

  const size   = 260
  const stroke = 10
  const radius = (size - stroke) / 2
  const circ   = 2 * Math.PI * radius
  const dash   = circ * progress

  // Blanc → orange → rouge selon le temps restant
  const ringColor    = seconds < 45  ? '#ef4444'
                     : seconds < 120 ? '#f97316'
                     : '#ffffff'
  // Couleurs du halo (avec transparence pour box-shadow)
  const haloStrong   = seconds < 45  ? 'rgba(239,68,68,0.55)'
                     : seconds < 120 ? 'rgba(249,115,22,0.55)'
                     : 'rgba(255,255,255,0.45)'
  const haloSoft     = seconds < 45  ? 'rgba(239,68,68,0.18)'
                     : seconds < 120 ? 'rgba(249,115,22,0.18)'
                     : 'rgba(255,255,255,0.12)'

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(160deg, #2a626a 0%, #3D7D85 45%, #5A9EA6 100%)' }}
    >
      <style>{`
        @keyframes cdHaloPulse {
          0%, 100% { transform: scale(1);    opacity: 0.55; }
          8%       { transform: scale(1.18); opacity: 1;    }
          25%      { transform: scale(1.08); opacity: 0.65; }
        }
        @keyframes cdFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      <div
        className="flex flex-col items-center"
        style={{ gap: 'clamp(0.9rem, 2vh, 1.8rem)', animation: 'cdFadeIn 0.7s ease-out both' }}
      >
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Église La Rencontre"
          style={{ height: 'clamp(2.5rem, 6vh, 4.5rem)', width: 'auto', objectFit: 'contain', opacity: 0.92 }}
        />

        {/* Sous-titre */}
        <p
          className="font-sans uppercase tracking-[0.35em] text-white/60"
          style={{ fontSize: 'clamp(0.6rem, 1.1vw, 0.78rem)' }}
        >
          Le culte commence dans
        </p>

        {/* Anneau + halo pulsant + nombre statique */}
        {/* overflow:visible sur le wrapper ET le SVG pour que le glow ne soit pas coupé */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size, overflow: 'visible' }}
        >
          {/* Halo circulaire — div séparé avec border-radius:50% pour éviter le clipping carré */}
          <div
            style={{
              position:     'absolute',
              width:        size,
              height:       size,
              borderRadius: '50%',
              boxShadow:    `0 0 35px 18px ${haloStrong}, 0 0 80px 40px ${haloSoft}`,
              animation:    `cdHaloPulse ${BPM_BEAT}ms ease-out infinite`,
              pointerEvents: 'none',
            }}
          />

          {/* SVG anneau — overflow:visible pour que le glow ne soit pas rogné */}
          <svg
            width={size} height={size}
            className="rotate-[-90deg] absolute inset-0"
            style={{ overflow: 'visible' }}
          >
            {/* Piste */}
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke="rgba(255,255,255,0.15)"
              strokeWidth={stroke}
            />
            {/* Progression */}
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={ringColor}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dasharray 0.9s linear, stroke 1.5s linear',
              }}
            />
          </svg>

          {/* Nombre — statique */}
          <span
            className="font-sans font-light tabular-nums text-white"
            style={{
              fontSize:      'clamp(3rem, 8vw, 5.5rem)',
              letterSpacing: '0.04em',
              textShadow:    '0 0 30px rgba(255,255,255,0.25)',
            }}
          >
            {timeStr}
          </span>
        </div>

        {/* Nom de l'église */}
        <p
          className="font-display text-white font-light tracking-widest text-center"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3.2rem)' }}
        >
          Église La Rencontre
        </p>

        {/* URL */}
        <p
          className="font-sans text-white/35 uppercase tracking-[0.22em]"
          style={{ fontSize: 'clamp(0.55rem, 0.9vw, 0.7rem)' }}
        >
          egliselarencontre.fr
        </p>
      </div>
    </div>
  )
}
