'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChordChart } from '@/app/benevoles/chants/[id]/ChordChart'

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

type Props = {
  planId: string
  planTitle: string
  songs: Song[]
}

export function SetlistView({ planId, planTitle, songs }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  // Mobile : affiche la liste ou la partition
  const [mobileView, setMobileView] = useState<'list' | 'chart'>('list')

  const active = songs[activeIdx] ?? null

  function selectSong(idx: number) {
    setActiveIdx(idx)
    setMobileView('chart')
  }

  return (
    <div className="flex h-screen bg-teal-50 overflow-hidden">

      {/* ── Liste (gauche) ─────────────────────────────────────────── */}
      <aside className={`
        flex flex-col bg-white border-r border-teal/20 shrink-0
        w-full md:w-72 lg:w-80
        ${mobileView === 'chart' ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-teal/10 flex items-center gap-3">
          <Link
            href={`/benevoles/admin/plans/${planId}`}
            className="text-dark/40 hover:text-dark transition-colors text-sm"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-display text-base text-dark font-light truncate">{planTitle}</p>
            <p className="font-sans text-xs text-dark/40">{songs.length} chant{songs.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Songs list */}
        <nav className="flex-1 overflow-y-auto py-2">
          {songs.length === 0 && (
            <p className="px-4 py-8 text-center font-sans text-xs text-dark/30">
              Aucun chant dans ce plan.
            </p>
          )}
          {songs.map((s, idx) => {
            const isActive = idx === activeIdx
            return (
              <button
                key={s.planSongId}
                onClick={() => selectSong(idx)}
                className={`
                  w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-l-2
                  ${isActive
                    ? 'bg-teal/8 border-teal'
                    : 'border-transparent hover:bg-teal/5'}
                `}
              >
                <span className={`font-sans text-xs tabular-nums shrink-0 w-5 ${isActive ? 'text-teal font-semibold' : 'text-dark/25'}`}>
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-sans text-sm truncate ${isActive ? 'text-dark font-semibold' : 'text-dark/80 font-medium'}`}>
                    {s.song.title}
                  </p>
                  <p className="font-sans text-xs text-dark/35 mt-0.5">
                    {s.arrangement?.name && <span className="mr-2">{s.arrangement.name}</span>}
                    {s.keySelected && <span className="text-teal font-medium">{s.keySelected}</span>}
                  </p>
                </div>
                {isActive && (
                  <span className="text-teal text-xs shrink-0">♩</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Navigation prev/next en bas */}
        {songs.length > 0 && (
          <div className="border-t border-teal/10 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => activeIdx > 0 && selectSong(activeIdx - 1)}
              disabled={activeIdx === 0}
              className="font-sans text-xs text-dark/40 hover:text-dark disabled:opacity-25 transition-colors px-2 py-1"
            >
              ← Précédent
            </button>
            <span className="font-sans text-xs text-dark/30 tabular-nums">
              {activeIdx + 1} / {songs.length}
            </span>
            <button
              onClick={() => activeIdx < songs.length - 1 && selectSong(activeIdx + 1)}
              disabled={activeIdx === songs.length - 1}
              className="font-sans text-xs text-dark/40 hover:text-dark disabled:opacity-25 transition-colors px-2 py-1"
            >
              Suivant →
            </button>
          </div>
        )}
      </aside>

      {/* ── Partition (droite) ─────────────────────────────────────── */}
      <main className={`
        flex-1 overflow-y-auto
        ${mobileView === 'list' ? 'hidden md:block' : 'block'}
      `}>
        {/* Barre mobile : retour + titre */}
        <div className="md:hidden sticky top-0 z-10 bg-white border-b border-teal/20 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileView('list')}
            className="text-dark/40 hover:text-dark font-sans text-sm"
          >
            ← Liste
          </button>
          <p className="font-sans text-sm text-dark font-medium truncate flex-1">
            {active?.song.title}
          </p>
        </div>

        {active ? (
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
            {/* Titre du chant */}
            <div className="mb-4 hidden md:block">
              <h2 className="font-display text-2xl text-dark font-light">{active.song.title}</h2>
              {active.arrangement?.name && (
                <p className="font-sans text-xs text-dark/40 mt-0.5">{active.arrangement.name}</p>
              )}
            </div>

            {/* Navigation desktop entre chants */}
            <div className="hidden md:flex items-center justify-between mb-4">
              <button
                onClick={() => activeIdx > 0 && setActiveIdx(activeIdx - 1)}
                disabled={activeIdx === 0}
                className="font-sans text-xs text-dark/40 hover:text-dark disabled:opacity-25 transition-colors"
              >
                ← {songs[activeIdx - 1]?.song.title ?? ''}
              </button>
              <button
                onClick={() => activeIdx < songs.length - 1 && setActiveIdx(activeIdx + 1)}
                disabled={activeIdx === songs.length - 1}
                className="font-sans text-xs text-dark/40 hover:text-dark disabled:opacity-25 transition-colors"
              >
                {songs[activeIdx + 1]?.song.title ?? ''} →
              </button>
            </div>

            {active.arrangement?.chord_chart ? (
              <ChordChart
                chart={active.arrangement.chord_chart}
                originalKey={active.arrangement.chord_chart_key}
                initialKey={active.keySelected ?? active.arrangement.chord_chart_key ?? undefined}
                songId={active.song.id}
                arrangementId={active.arrangement.id}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-teal/20 px-5 py-12 text-center">
                <p className="font-sans text-sm text-dark/40">Pas de grille d'accords pour ce chant.</p>
                <a
                  href={`/benevoles/chants/${active.song.id}`}
                  target="_blank"
                  className="mt-3 inline-block font-sans text-xs text-teal hover:underline"
                >
                  Voir le chant →
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="font-sans text-sm text-dark/30">Sélectionne un chant dans la liste.</p>
          </div>
        )}
      </main>
    </div>
  )
}
