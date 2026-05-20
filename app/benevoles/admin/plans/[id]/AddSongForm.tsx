'use client'

import { useState, useTransition, useMemo } from 'react'
import { addPlanSong } from '../actions'

type Song = {
  id: number
  title: string
  arrangements: { id: string; name: string; chord_chart_key: string | null; keys_available: string[] }[]
}

export function AddSongForm({ planId, songs }: { planId: string; songs: Song[] }) {
  const [query, setQuery] = useState('')
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [selectedArrId, setSelectedArrId] = useState('')
  const [selectedKey, setSelectedKey] = useState('')
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    if (!query.trim()) return songs.slice(0, 8)
    const q = query.toLowerCase()
    return songs.filter(s => s.title.toLowerCase().includes(q)).slice(0, 8)
  }, [query, songs])

  function pickSong(song: Song) {
    setSelectedSong(song)
    setQuery(song.title)
    setOpen(false)
    // Auto-sélectionne le premier arrangement et sa tonalité
    const arr = song.arrangements[0]
    setSelectedArrId(arr?.id ?? '')
    setSelectedKey(arr?.chord_chart_key ?? '')
  }

  function handleAdd() {
    if (!selectedSong) return
    const fd = new FormData()
    fd.set('plan_id', planId)
    fd.set('song_id', String(selectedSong.id))
    fd.set('arrangement_id', selectedArrId)
    fd.set('key_selected', selectedKey)
    startTransition(async () => {
      await addPlanSong(fd)
      setQuery('')
      setSelectedSong(null)
      setSelectedArrId('')
      setSelectedKey('')
    })
  }

  const currentArr = selectedSong?.arrangements.find(a => a.id === selectedArrId)
  const availableKeys = currentArr?.keys_available?.length
    ? currentArr.keys_available
    : currentArr?.chord_chart_key
      ? [currentArr.chord_chart_key]
      : []

  return (
    <div className="space-y-2">
      {/* Recherche chant */}
      <div className="relative">
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setSelectedSong(null) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Rechercher un chant…"
          className="w-full bg-white border border-teal/20 rounded-xl px-3 py-2 font-sans text-sm text-dark placeholder:text-dark/30 focus:outline-none focus:ring-1 focus:ring-teal/30"
        />
        {open && query.length >= 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-teal/20 rounded-xl shadow-lg overflow-hidden">
            {filtered.length === 0 && (
              <p className="px-3 py-2 font-sans text-xs text-dark/40">Aucun résultat</p>
            )}
            {filtered.map(song => (
              <button
                key={song.id}
                type="button"
                onMouseDown={() => pickSong(song)}
                className="w-full text-left px-3 py-2 font-sans text-sm text-dark hover:bg-teal/5 transition-colors"
              >
                {song.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Arrangement + tonalité */}
      {selectedSong && (
        <div className="flex gap-2">
          {selectedSong.arrangements.length > 1 && (
            <select
              value={selectedArrId}
              onChange={e => {
                setSelectedArrId(e.target.value)
                const arr = selectedSong.arrangements.find(a => a.id === e.target.value)
                setSelectedKey(arr?.chord_chart_key ?? '')
              }}
              className="flex-1 bg-white border border-teal/20 rounded-xl px-3 py-2 font-sans text-xs text-dark focus:outline-none focus:ring-1 focus:ring-teal/30"
            >
              {selectedSong.arrangements.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}

          {availableKeys.length > 1 ? (
            <select
              value={selectedKey}
              onChange={e => setSelectedKey(e.target.value)}
              className="w-24 bg-white border border-teal/20 rounded-xl px-3 py-2 font-sans text-xs text-dark focus:outline-none focus:ring-1 focus:ring-teal/30"
            >
              {availableKeys.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          ) : (
            <input
              value={selectedKey}
              onChange={e => setSelectedKey(e.target.value)}
              placeholder="Ton."
              className="w-20 bg-white border border-teal/20 rounded-xl px-3 py-2 font-sans text-xs text-dark placeholder:text-dark/30 focus:outline-none focus:ring-1 focus:ring-teal/30"
            />
          )}

          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="shrink-0 px-4 py-2 bg-teal hover:bg-teal-dark disabled:opacity-40 text-white rounded-xl font-sans text-xs font-semibold transition-colors"
          >
            {isPending ? '…' : '+ Ajouter'}
          </button>
        </div>
      )}
    </div>
  )
}
