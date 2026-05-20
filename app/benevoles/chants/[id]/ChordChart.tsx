'use client'

import { useState, useMemo } from 'react'
import { transposeChart, getSemitones, isSectionHeader, isChordLine, ALL_KEYS } from '@/lib/transpose'

type Props = {
  chart: string
  originalKey: string | null
}

// Tonalités courantes affichées en priorité dans le sélecteur
const COMMON_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'Bb', 'Eb', 'Ab', 'Db', 'F#', 'B']

export function ChordChart({ chart, originalKey }: Props) {
  const defaultKey = originalKey ?? 'C'
  const [selectedKey, setSelectedKey] = useState(defaultKey)

  const transposed = useMemo(
    () => transposeChart(chart, defaultKey, selectedKey),
    [chart, defaultKey, selectedKey]
  )

  const semitones = getSemitones(defaultKey, selectedKey)

  return (
    <div className="space-y-4">
      {/* Sélecteur de tonalité */}
      <div className="bg-white rounded-2xl border border-teal/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-sans text-xs text-dark/40 uppercase tracking-wide">Tonalité</span>
          {semitones !== 0 && (
            <span className="font-sans text-xs text-teal bg-teal/10 px-2 py-0.5 rounded-full">
              {semitones > 6 ? `−${12 - semitones}` : `+${semitones}`} demi-tons
            </span>
          )}
          {semitones !== 0 && (
            <button
              onClick={() => setSelectedKey(defaultKey)}
              className="font-sans text-xs text-dark/30 hover:text-dark ml-auto"
            >
              Réinitialiser
            </button>
          )}
        </div>
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
