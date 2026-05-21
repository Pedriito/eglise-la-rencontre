'use client'

import { useState, useTransition } from 'react'
import { ChordChart } from '@/app/benevoles/chants/[id]/ChordChart'
import { AddSongForm } from './AddSongForm'
import { removePlanSong, movePlanSong } from '../actions'

type Arrangement = {
  id: string
  name: string
  chord_chart: string | null
  chord_chart_key: string | null
}

type PlanSong = {
  id: string
  order_index: number
  key_selected: string | null
  songs: { id: number; title: string } | null
  arrangements: Arrangement | null
}

type SongForAdd = {
  id: number
  title: string
  arrangements: { id: string; name: string; chord_chart_key: string | null; keys_available: string[] }[]
}

type Props = {
  planId: string
  planSongs: PlanSong[]
  allSongs: SongForAdd[]
}

export function SongsSection({ planId, planSongs, allSongs }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const active = planSongs.find(ps => ps.id === activeId) ?? null
  const isOpen = active !== null

  function handleRemove(planSongId: string) {
    const fd = new FormData()
    fd.set('plan_song_id', planSongId)
    fd.set('plan_id', planId)
    startTransition(() => removePlanSong(fd))
    if (activeId === planSongId) setActiveId(null)
  }

  function handleMove(planSongId: string, direction: 'up' | 'down') {
    const fd = new FormData()
    fd.set('plan_song_id', planSongId)
    fd.set('plan_id', planId)
    fd.set('direction', direction)
    startTransition(() => movePlanSong(fd))
  }

  return (
    <div className="bg-white rounded-2xl border border-teal/20 flex min-h-0">

      {/* ── Liste ─────────────────────────────────────────────────── */}
      {/* Mobile : cachée quand une partition est ouverte */}
      <div className={`flex flex-col min-w-0 transition-all duration-200
        ${isOpen ? 'hidden md:flex md:w-64 md:shrink-0 md:border-r md:border-teal/10' : 'flex-1'}
      `}>

        {/* En-tête */}
        <div className="px-4 py-3 border-b border-teal/10 bg-teal-50/50 flex items-center justify-between rounded-tl-2xl">
          <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Chants</p>
          <div className="flex items-center gap-2">
            {planSongs.length > 0 && (
              <span className="text-xs text-dark/30 font-sans tabular-nums">{planSongs.length}</span>
            )}
            {isOpen && (
              <button
                onClick={() => setActiveId(null)}
                className="text-dark/30 hover:text-dark text-base leading-none transition-colors"
                title="Fermer la partition"
              >×</button>
            )}
          </div>
        </div>

        {/* Songs */}
        <div className="flex-1 divide-y divide-teal/10 overflow-y-auto">
          {planSongs.length === 0 && (
            <p className="px-4 py-6 text-center font-sans text-xs text-dark/25 italic">Aucun chant ajouté</p>
          )}

          {planSongs.map((ps, i) => {
            const song = ps.songs
            const arr  = ps.arrangements
            const isActive  = ps.id === activeId
            const isFirst   = i === 0
            const isLast    = i === planSongs.length - 1

            return (
              <div
                key={ps.id}
                className={`flex items-center gap-2 px-3 py-2.5 transition-colors ${isActive ? 'bg-teal/8' : 'hover:bg-teal/4'}`}
              >
                {/* Numéro */}
                <span className={`font-sans text-xs tabular-nums shrink-0 w-4 ${isActive ? 'text-teal font-semibold' : 'text-dark/25'}`}>
                  {i + 1}
                </span>

                {/* Titre cliquable */}
                <button
                  onClick={() => setActiveId(isActive ? null : ps.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className={`font-sans text-sm truncate ${isActive ? 'text-dark font-semibold' : 'text-dark/80 font-medium'}`}>
                    {song?.title ?? '—'}
                  </p>
                  {!isOpen && (
                    <p className="font-sans text-xs text-dark/35 truncate">
                      {arr?.name && <span className="mr-1.5">{arr.name}</span>}
                      {ps.key_selected && <span className="text-teal font-medium">{ps.key_selected}</span>}
                    </p>
                  )}
                  {isOpen && ps.key_selected && (
                    <p className="font-sans text-xs text-teal font-medium">{ps.key_selected}</p>
                  )}
                </button>

                {/* Actions — masquées en vue compacte sauf la suppression */}
                {!isOpen && (
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      onClick={() => handleMove(ps.id, 'up')}
                      disabled={isFirst || isPending}
                      className="text-dark/20 hover:text-teal disabled:opacity-0 text-xs leading-none transition-colors"
                    >▲</button>
                    <button
                      onClick={() => handleMove(ps.id, 'down')}
                      disabled={isLast || isPending}
                      className="text-dark/20 hover:text-teal disabled:opacity-0 text-xs leading-none transition-colors"
                    >▼</button>
                  </div>
                )}

                <button
                  onClick={() => handleRemove(ps.id)}
                  disabled={isPending}
                  className="text-dark/15 hover:text-red-400 transition-colors text-base leading-none shrink-0"
                >×</button>
              </div>
            )
          })}
        </div>

        {/* Formulaire d'ajout — compact quand partition ouverte */}
        <div className={`border-t border-teal/10 bg-teal-50/20 ${isOpen ? 'px-3 py-2' : 'px-4 py-3'}`}>
          <AddSongForm planId={planId} songs={allSongs} compact={isOpen} />
        </div>
      </div>

      {/* ── Partition ─────────────────────────────────────────────── */}
      {isOpen && active && (
        <div className="flex-1 overflow-y-auto px-4 py-4 min-w-0">
          {/* Bouton retour mobile uniquement */}
          <button
            onClick={() => setActiveId(null)}
            className="md:hidden mb-3 font-sans text-xs text-dark/40 hover:text-dark transition-colors"
          >
            ← {active.songs?.title ?? 'Retour'}
          </button>
          {active.arrangements?.chord_chart ? (
            <ChordChart
              chart={active.arrangements.chord_chart}
              originalKey={active.arrangements.chord_chart_key}
              initialKey={active.key_selected ?? active.arrangements.chord_chart_key ?? undefined}
              songId={active.songs?.id ?? 0}
              arrangementId={active.arrangements.id}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <p className="font-sans text-sm text-dark/40">Pas de grille pour ce chant.</p>
              {active.songs && (
                <a
                  href={`/benevoles/chants/${active.songs.id}`}
                  target="_blank"
                  className="font-sans text-xs text-teal hover:underline"
                >
                  Voir le chant →
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
