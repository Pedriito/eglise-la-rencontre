'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { transposeChart, getSemitones, isSectionHeader, isChordLine } from '@/lib/transpose'

type Props = {
  chart: string
  originalKey: string | null
  arrangementId: string
}

// Tonalités courantes affichées dans le sélecteur
const COMMON_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B']

export function ChordChart({ chart, originalKey, arrangementId }: Props) {
  const params = useParams()
  const songId = params?.id as string

  const defaultKey = originalKey ?? 'C'
  const [selectedKey, setSelectedKey] = useState(defaultKey)
  const [showChords, setShowChords] = useState(true)

  const transposed = useMemo(
    () => transposeChart(chart, defaultKey, selectedKey),
    [chart, defaultKey, selectedKey]
  )

  const semitones = getSemitones(defaultKey, selectedKey)

  function openPrint() {
    const url = `/benevoles/chants/${songId}/print?key=${selectedKey}&arr=${arrangementId}&chords=${showChords}`
    window.open(url, '_blank', 'width=900,height=700')
  }

  return (
    <div className="space-y-3">
      {/* Barre d'outils */}
      <div className="bg-white rounded-2xl border border-teal/20 p-4 space-y-3">
        {/* Ligne : tonalité + actions */}
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-dark/40 uppercase tracking-wide">Tonalité</span>
          {semitones !== 0 && (
            <span className="font-sans text-xs text-teal bg-teal/10 px-2 py-0.5 rounded-full">
              {semitones > 6 ? `−${12 - semitones}` : `+${semitones}`} demi-tons
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Masquer accords */}
            <button
              onClick={() => setShowChords(v => !v)}
              className={`
                font-sans text-xs px-3 py-1.5 rounded-lg border transition-colors
                ${showChords
                  ? 'border-teal/20 text-dark/50 hover:border-teal/40 hover:text-dark'
                  : 'border-teal bg-teal/10 text-teal font-medium'}
              `}
            >
              {showChords ? '♩ Accords visibles' : '♩ Accords masqués'}
            </button>

            {/* PDF */}
            <button
              onClick={openPrint}
              className="font-sans text-xs px-3 py-1.5 rounded-lg border border-teal/20 text-dark/50 hover:border-teal/40 hover:text-dark transition-colors"
            >
              PDF
            </button>

            {/* Réinitialiser tonalité */}
            {semitones !== 0 && (
              <button
                onClick={() => setSelectedKey(defaultKey)}
                className="font-sans text-xs text-dark/30 hover:text-dark transition-colors"
              >
                ↺
              </button>
            )}
          </div>
        </div>

        {/* Boutons de tonalité */}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_KEYS.map(key => (
            <button
              key={key}
              onClick={() => setSelectedKey(key)}
              className={`
                w-9 h-9 rounded-xl font-sans text-sm font-medium transition-colors
                ${selectedKey === key
                  ? 'bg-teal text-white'
                  : 'bg-teal/5 text-dark/60 hover:bg-teal/15'}
              `}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Grille d'accords */}
      <div className="bg-white rounded-2xl border border-teal/20 p-5 overflow-x-auto">
        <pre className="font-mono text-sm leading-relaxed whitespace-pre">
          {transposed.split('\n').map((line, i) => {
            if (!line.trim()) return <span key={i}>{'\n'}</span>

            if (isSectionHeader(line)) {
              return (
                <span key={i} className="block text-xs font-sans font-semibold uppercase tracking-widest text-dark/30 mt-3 mb-1">
                  {line}
                </span>
              )
            }

            if (isChordLine(line)) {
              if (!showChords) return null
              return (
                <span key={i} className="block text-teal font-semibold">
                  {line}
                </span>
              )
            }

            // Ligne de paroles
            return (
              <span key={i} className="block text-dark/80">
                {line}
              </span>
            )
          })}
        </pre>
      </div>
    </div>
  )
}
