'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CountdownDisplay } from '@/app/_components/CountdownDisplay'

type DisplayState =
  | { kind: 'blank' }
  | { kind: 'slide';     lines: string[]; section: string | null }
  | { kind: 'message';   text: string }
  | { kind: 'verse';     text: string; display: string; versionName: string }
  | { kind: 'countdown'; seconds: number }

function formatSection(raw: string): string {
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

export function ObsOverlay({ planId }: { planId: string }) {
  const [display, setDisplay]   = useState<DisplayState>({ kind: 'blank' })
  const [visible, setVisible]   = useState(false)
  const [connected, setConnected] = useState(false)
  // intervalId stocké dans un ref pour que la closure du useEffect y accède toujours
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Fond transparent pour OBS
  useLayoutEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.background            = 'transparent'
  }, [])

  // Abonnement Supabase Realtime — tout le logique est à l'intérieur pour éviter les stale closures
  useEffect(() => {
    const supabase = createClient()
    const channel  = supabase.channel(`obs-${planId}`)

    function stopTimer() {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }

    function startCountdown(totalSeconds: number) {
      stopTimer()
      let remaining = Math.max(1, Math.round(totalSeconds))
      setDisplay({ kind: 'countdown', seconds: remaining })
      setVisible(true)
      timerRef.current = setInterval(() => {
        remaining -= 1
        if (remaining <= 0) {
          stopTimer()
          setVisible(false)
          setDisplay({ kind: 'blank' })
        } else {
          setDisplay({ kind: 'countdown', seconds: remaining })
        }
      }, 1000)
    }

    channel
      .on('broadcast', { event: 'slide' }, ({ payload }) => {
        stopTimer()
        setDisplay({ kind: 'slide', lines: payload.lines ?? [], section: payload.section ?? null })
        setVisible(true)
      })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        stopTimer()
        setDisplay({ kind: 'message', text: payload.text ?? '' })
        setVisible(true)
      })
      .on('broadcast', { event: 'verse' }, ({ payload }) => {
        stopTimer()
        setDisplay({ kind: 'verse', text: payload.text ?? '', display: payload.display ?? '', versionName: payload.versionName ?? '' })
        setVisible(true)
      })
      .on('broadcast', { event: 'blank' }, () => {
        stopTimer()
        setVisible(false)
      })
      .on('broadcast', { event: 'countdown_start' }, ({ payload }) => {
        startCountdown(payload.seconds ?? 300)
      })
      .on('broadcast', { event: 'countdown_stop' }, () => {
        stopTimer()
        setVisible(false)
        setDisplay({ kind: 'blank' })
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    return () => {
      stopTimer()
      supabase.removeChannel(channel)
    }
  }, [planId])

  return (
    <div className="fixed inset-0 pointer-events-none">

      {/* ── Countdown plein écran ── */}
      {display.kind === 'countdown' && (
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: visible ? 1 : 0 }}
        >
          <CountdownDisplay seconds={display.seconds} />
        </div>
      )}

      {/* ── Lower-third (paroles / message / verset) ── */}
      <div className="absolute inset-0 flex flex-col justify-end items-center">
        <div
          className="w-full max-w-[1700px] mx-auto px-16 pb-14 transition-all duration-500 ease-out"
          style={{
            opacity:   visible && display.kind !== 'countdown' ? 1 : 0,
            transform: visible && display.kind !== 'countdown' ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          {display.kind !== 'blank' && display.kind !== 'countdown' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}>
              <div className="px-12 py-7">

                {/* ── Diapo de chant ── */}
                {display.kind === 'slide' && (
                  <>
                    {display.section && (
                      <p className="text-white/40 text-sm uppercase tracking-[0.35em] mb-3 font-sans">
                        {formatSection(display.section)}
                      </p>
                    )}
                    <div className="space-y-2">
                      {(() => {
                        const maxLen = Math.max(...display.lines.map(l => l.length), 1)
                        const fs = `clamp(1.8rem, ${Math.min(72 / maxLen, 4.5).toFixed(2)}vw, 3.8rem)`
                        return display.lines.map((line, i) => (
                          <p key={i} className="text-white font-sans font-bold leading-tight uppercase" style={{ fontSize: fs }}>
                            {line}
                          </p>
                        ))
                      })()}
                    </div>
                  </>
                )}

                {/* ── Message libre ── */}
                {display.kind === 'message' && (
                  <div className="space-y-2">
                    {display.text.split('\n').map((line, i) => {
                      const maxLen = Math.max(...display.text.split('\n').map(l => l.length), 1)
                      const fs = `clamp(1.8rem, ${Math.min(72 / maxLen, 4.5).toFixed(2)}vw, 3.8rem)`
                      return (
                        <p key={i} className="text-white font-sans font-bold leading-tight uppercase" style={{ fontSize: fs }}>
                          {line}
                        </p>
                      )
                    })}
                  </div>
                )}

                {/* ── Verset biblique ── */}
                {display.kind === 'verse' && (
                  <>
                    <p className="text-white/50 text-sm uppercase tracking-[0.3em] mb-3 font-sans">
                      {display.display}
                    </p>
                    <div className="space-y-2">
                      {display.text.split('\n').map((line, i) => {
                        const maxLen = Math.max(...display.text.split('\n').map(l => l.length), 1)
                        const fs = `clamp(1.4rem, ${Math.min(68 / maxLen, 4).toFixed(2)}vw, 3.2rem)`
                        return (
                          <p key={i} className="text-white font-sans font-light leading-snug italic" style={{ fontSize: fs }}>
                            {line}
                          </p>
                        )
                      })}
                    </div>
                    <p className="text-white/30 text-xs font-sans mt-3 uppercase tracking-widest">
                      {display.versionName}
                    </p>
                  </>
                )}

              </div>
              {/* Barre colorée en bas */}
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #3D7D85, #5A9EA6)' }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Indicateur de connexion (visible quand rien n'est affiché) ── */}
      {!visible && (
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
          <span
            className={`block w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-white/30 animate-pulse'}`}
          />
          <span className="text-white/25 text-[10px] font-sans uppercase tracking-widest">
            {connected ? 'connecté' : 'connexion…'}
          </span>
        </div>
      )}
    </div>
  )
}
