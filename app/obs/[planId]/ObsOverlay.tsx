'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type DisplayState =
  | { kind: 'blank' }
  | { kind: 'slide';   lines: string[]; section: string | null }
  | { kind: 'message'; text: string }
  | { kind: 'verse';   text: string; display: string; versionName: string }

export function ObsOverlay({ planId }: { planId: string }) {
  const [display, setDisplay] = useState<DisplayState>({ kind: 'blank' })
  const [visible, setVisible]  = useState(false)

  // Fond transparent pour OBS
  useLayoutEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.background            = 'transparent'
  }, [])

  // Abonnement Supabase Realtime
  useEffect(() => {
    const supabase = createClient()
    const channel  = supabase.channel(`obs-${planId}`)

    channel
      .on('broadcast', { event: 'slide' }, ({ payload }) => {
        setDisplay({ kind: 'slide', lines: payload.lines ?? [], section: payload.section ?? null })
        setVisible(true)
      })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setDisplay({ kind: 'message', text: payload.text ?? '' })
        setVisible(true)
      })
      .on('broadcast', { event: 'verse' }, ({ payload }) => {
        setDisplay({ kind: 'verse', text: payload.text ?? '', display: payload.display ?? '', versionName: payload.versionName ?? '' })
        setVisible(true)
      })
      .on('broadcast', { event: 'blank' }, () => {
        setVisible(false)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [planId])

  return (
    <div className="fixed inset-0 flex flex-col justify-end items-center pointer-events-none">
      <div
        className="w-full max-w-[1700px] mx-auto px-16 pb-14 transition-all duration-500 ease-out"
        style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'translateY(0)' : 'translateY(24px)',
        }}
      >
        {display.kind !== 'blank' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}>
            <div className="px-12 py-7">

              {/* ── Diapo de chant ── */}
              {display.kind === 'slide' && (
                <>
                  {display.section && (
                    <p className="text-white/40 text-sm uppercase tracking-[0.35em] mb-3 font-sans">
                      {display.section}
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
  )
}
