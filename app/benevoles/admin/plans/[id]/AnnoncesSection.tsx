'use client'

import { useState, useTransition, useRef } from 'react'
import { addAnnouncement, updateAnnouncement, deleteAnnouncement, moveAnnouncement, uploadAnnouncementImage } from './annonces-actions'
import { getEmbedUrl, getPlatformLabel } from '@/lib/videoEmbed'

export type Announcement = {
  id: string
  title: string | null
  body: string
  order_index: number
  image_url: string | null
  video_url: string | null
}

type Props = { planId: string; initial: Announcement[]; canManage: boolean }

/** Petit composant de sélection/prévisualisation d'image */
function ImagePicker({
  value,
  onChange,
  disabled,
}: {
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1 * 1024 * 1024) {
      alert(`Image trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 1 Mo.\nCompresse l'image avant de l'envoyer (ex : squoosh.app).`)
      e.target.value = ''
      return
    }
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const url = await uploadAnnouncementImage(fd)
    setUploading(false)
    if (url) onChange(url)
    else alert('Échec de l\'envoi. Réessaie avec une image plus légère.')
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-20 rounded-lg object-cover border border-teal/20" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 leading-none"
              title="Supprimer l'image"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || disabled}
          className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-teal/30 rounded-lg font-sans text-xs text-dark/50 hover:text-teal hover:border-teal/60 transition-colors disabled:opacity-40"
        >
          {uploading ? '⏳ Envoi…' : '🖼 Ajouter une image (max 1 Mo)'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}

export default function AnnoncesSection({ planId, initial, canManage }: Props) {
  const [items, setItems]           = useState<Announcement[]>(initial)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editTitle, setEditTitle]     = useState('')
  const [editBody, setEditBody]       = useState('')
  const [editImageUrl, setEditImageUrl]   = useState<string | null>(null)
  const [editVideoUrl, setEditVideoUrl]   = useState('')
  const [editVideoError, setEditVideoError] = useState<string | null>(null)
  const [adding, setAdding]           = useState(false)
  const [newTitle, setNewTitle]       = useState('')
  const [newBody, setNewBody]         = useState('')
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null)
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [newVideoError, setNewVideoError] = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()

  function startEdit(item: Announcement) {
    setEditingId(item.id)
    setEditTitle(item.title ?? '')
    setEditBody(item.body)
    setEditImageUrl(item.image_url)
    setEditVideoUrl(item.video_url ?? '')
    setEditVideoError(null)
    setAdding(false)
  }

  function handleSaveEdit() {
    if (!editingId || !editBody.trim()) return
    const trimmedVideo = editVideoUrl.trim()
    if (trimmedVideo && !getEmbedUrl(trimmedVideo)) {
      setEditVideoError('URL non reconnue — colle un lien YouTube ou Vimeo')
      return
    }
    startTransition(async () => {
      await updateAnnouncement(editingId, planId, editTitle, editBody.trim(), editImageUrl, trimmedVideo || null)
      setItems(prev => prev.map(a =>
        a.id === editingId
          ? { ...a, title: editTitle.trim() || null, body: editBody.trim(), image_url: editImageUrl, video_url: trimmedVideo || null }
          : a
      ))
      setEditingId(null)
    })
  }

  function handleAdd() {
    if (!newBody.trim()) return
    const trimmedVideo = newVideoUrl.trim()
    if (trimmedVideo && !getEmbedUrl(trimmedVideo)) {
      setNewVideoError('URL non reconnue — colle un lien YouTube ou Vimeo')
      return
    }
    startTransition(async () => {
      const created = await addAnnouncement(planId, newTitle, newBody.trim(), newImageUrl, trimmedVideo || null)
      if (created) setItems(prev => [...prev, created])
      setAdding(false)
      setNewTitle('')
      setNewBody('')
      setNewImageUrl(null)
      setNewVideoUrl('')
      setNewVideoError(null)
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAnnouncement(id, planId)
      setItems(prev => prev.filter(a => a.id !== id))
    })
  }

  function handleMove(id: string, dir: 'up' | 'down') {
    startTransition(async () => {
      await moveAnnouncement(id, planId, dir)
    })
  }

  return (
    <div className="space-y-3">
      <p className="font-sans text-xs text-dark/40 text-right -mt-1 mb-1">
        {items.length} diapo{items.length !== 1 ? 's' : ''}
      </p>
      {items.length === 0 && !adding && (
        <p className="font-sans text-xs text-dark/30 italic px-1">Aucune annonce pour ce culte.</p>
      )}

      {items.map((item, idx) => (
        <div key={item.id} className="bg-white rounded-xl border border-teal/20 overflow-hidden">
          {editingId === item.id ? (
            <div className="p-4 space-y-2">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Titre (optionnel)"
                className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/50"
              />
              <textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                rows={3}
                placeholder="Texte de l'annonce…"
                className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/50 resize-none"
              />
              <ImagePicker value={editImageUrl} onChange={setEditImageUrl} disabled={isPending} />
              <input
                value={editVideoUrl}
                onChange={e => { setEditVideoUrl(e.target.value); setEditVideoError(null) }}
                placeholder="Lien vidéo YouTube / Vimeo (optionnel)"
                className="w-full border border-teal/20 rounded-lg px-3 py-2 text-xs font-mono text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/50"
              />
              {editVideoError && <p className="font-sans text-xs text-red-500">{editVideoError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 py-1.5 rounded-lg border border-teal/20 font-sans text-xs text-dark/60 hover:bg-teal/5"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editBody.trim() || isPending}
                  className="flex-1 py-1.5 rounded-lg bg-teal text-white font-sans text-xs font-medium hover:bg-teal/90 disabled:opacity-40"
                >
                  ✓ Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 px-4 py-3">
              {/* Miniature si image */}
              {item.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt=""
                  className="w-14 h-10 object-cover rounded-lg shrink-0 border border-teal/10"
                />
              )}
              <div className="min-w-0 flex-1">
                {item.title && (
                  <p className="font-sans text-xs text-teal/70 uppercase tracking-wide mb-0.5">{item.title}</p>
                )}
                <p className="font-sans text-sm text-dark leading-snug whitespace-pre-wrap">{item.body}</p>
                {item.video_url && (
                  <p className="font-sans text-[10px] text-blue-500/70 mt-1 flex items-center gap-1">
                    <span>▶</span>
                    <span>{getPlatformLabel(item.video_url) ?? 'Vidéo'}</span>
                  </p>
                )}
              </div>
              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleMove(item.id, 'up')}
                    disabled={idx === 0 || isPending}
                    className="w-6 h-6 flex items-center justify-center text-dark/25 hover:text-dark/60 disabled:opacity-20 transition-colors"
                    title="Monter"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMove(item.id, 'down')}
                    disabled={idx === items.length - 1 || isPending}
                    className="w-6 h-6 flex items-center justify-center text-dark/25 hover:text-dark/60 disabled:opacity-20 transition-colors"
                    title="Descendre"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => startEdit(item)}
                    className="w-6 h-6 flex items-center justify-center text-dark/25 hover:text-teal transition-colors"
                    title="Modifier"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending}
                    className="w-6 h-6 flex items-center justify-center text-dark/25 hover:text-red-400 transition-colors"
                    title="Supprimer"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {canManage && (
        adding ? (
          <div className="bg-white rounded-xl border border-teal/30 p-4 space-y-2">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Titre (optionnel)"
              className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/50"
            />
            <textarea
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd() }}
              rows={3}
              placeholder="Texte de l'annonce…"
              className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/50 resize-none"
            />
            <ImagePicker value={newImageUrl} onChange={setNewImageUrl} disabled={isPending} />
            <input
              value={newVideoUrl}
              onChange={e => { setNewVideoUrl(e.target.value); setNewVideoError(null) }}
              placeholder="Lien vidéo YouTube / Vimeo (optionnel)"
              className="w-full border border-teal/20 rounded-lg px-3 py-2 text-xs font-mono text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/50"
            />
            {newVideoError && <p className="font-sans text-xs text-red-500">{newVideoError}</p>}
            <p className="text-xs text-dark/30 font-sans">⌘↵ pour valider</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setAdding(false); setNewTitle(''); setNewBody(''); setNewImageUrl(null); setNewVideoUrl(''); setNewVideoError(null) }}
                className="flex-1 py-1.5 rounded-lg border border-teal/20 font-sans text-xs text-dark/60 hover:bg-teal/5"
              >
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={!newBody.trim() || isPending}
                className="flex-1 py-1.5 rounded-lg bg-teal text-white font-sans text-xs font-medium hover:bg-teal/90 disabled:opacity-40"
              >
                + Ajouter
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setAdding(true); setEditingId(null) }}
            className="w-full py-2.5 rounded-xl border border-dashed border-teal/30 font-sans text-xs text-dark/40 hover:text-teal hover:border-teal/60 transition-colors"
          >
            + Ajouter une annonce
          </button>
        )
      )}
    </div>
  )
}
