'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChordChart } from '@/app/benevoles/chants/[id]/ChordChart'
import { ProjectionView } from './ProjectionView'
import { updatePlanSongArrangement } from '@/app/benevoles/admin/plans/actions'

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
  allArrangements: { id: string; name: string; chord_chart_key: string | null; hasChart: boolean }[]
}

type Props = {
  planId: string
  planTitle: string
  songs: Song[]
}

export function SetlistView({ planId, planTitle, songs }: Props) {
  const router = useRouter()
  const [activeIdx, setActiveIdx] = useState(0)
  const [mobileView, setMobileView] = useState<'list' | 'chart'>('list')
  const [projecting, setProjecting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [switchError, setSwitchError] = useState<string | null>(null)

  async function switchArrangement(arrangementId: string) {
    setSwitchError(null)
    startTransition(async () => {
      const res = await updatePlanSongArrangement(active!.planSongId, arrangementId, planId)
      if (!res.ok) { setSwitchError(res.error ?? 'Erreur'); return }
      router.refresh()
    })
  }

  const active = songs[activeIdx] ?? null

  function selectSong(idx: number) {
    setActiveIdx(idx)
    setMobileView('chart')
  }

  return (
    <div className="flex h-screen bg-teal-50 overflow-hidden">
      {projecting && (
        <ProjectionView
          planId={planId}
          songs={songs}
          initialSongIdx={activeIdx}
          onClose={() => setProjecting(false)}
        />
      )}

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
          {songs.length > 0 && (
            <button
              onClick={() => setProjecting(true)}
              title="Mode vidéoprojecteur"
              className="shrink-0 px-2.5 py-1.5 bg-dark hover:bg-dark/80 text-white rounded-lg font-sans text-xs font-medium transition-colors"
            >
              ⬛ Projection
            </button>
          )}
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
              <div className="bg-white rounded-2xl border border-teal/20 px-5 py-10 text-center space-y-5">
                <p className="font-sans text-sm text-dark/40">
                  L'arrangement &laquo;&nbsp;{active.arrangement?.name ?? 'sélectionné'}&nbsp;&raquo; n'a pas de grille d'accords.
                </p>

                {/* Autres arrangements disponibles */}
                {active.allArrangements.filter(a => a.id !== active.arrangement?.id).length > 0 && (
                  <div className="space-y-2">
                    <p className="font-sans text-xs text-dark/50">Autres arrangements disponibles :</p>
                    <div className="flex flex-col gap-2 items-center">
                      {active.allArrangements
                        .filter(a => a.id !== active.arrangement?.id)
                        .map(a => (
                          <button
                            key={a.id}
                            onClick={() => switchArrangement(a.id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal/10 hover:bg-teal/20 disabled:opacity-50 border border-teal/20 rounded-lg font-sans text-sm text-teal transition-colors"
                          >
                            {a.hasChart ? '♩' : '○'}
                            <span>{a.name}</span>
                            {a.chord_chart_key && <span className="text-teal/60 text-xs">{a.chord_chart_key}</span>}
                            {a.hasChart && <span className="text-xs text-teal/50">· grille dispo</span>}
                          </button>
                        ))
                      }
                    </div>
                    {switchError && <p className="font-sans text-xs text-red-500">{switchError}</p>}
                    {isPending && <p className="font-sans text-xs text-dark/40">Changement en cours…</p>}
                  </div>
                )}

                <a
                  href={`/benevoles/chants/${active.song.id}`}
                  target="_blank"
                  className="inline-block font-sans text-xs text-teal/60 hover:text-teal hover:underline"
                >
                  Gérer les arrangements →
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
