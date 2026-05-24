'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deleteMediaFile } from './actions'

type MediaFile = { id: string; name: string; url: string; created_at: string }
type Props = { initial: MediaFile[] }

export default function MediaLibrary({ initial }: Props) {
  const [files, setFiles] = useState<MediaFile[]>(initial)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length === 0) return

    const images = selected.filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) {
      setUploadError('Seules les images (JPEG, PNG, WebP, GIF) sont acceptées.')
      return
    }

    setUploadError(null)
    setUploading(true)

    const supabase = createClient()

    for (const file of images) {
      const safeName = file.name.replace(/\s+/g, '_')
      const path = `${Date.now()}-${safeName}`

      const { error: storageError } = await supabase.storage
        .from('media')
        .upload(path, file)

      if (storageError) {
        setUploadError(`Erreur lors de l'upload de ${file.name} : ${storageError.message}`)
        continue
      }

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
      const publicUrl = urlData.publicUrl

      const { data: inserted, error: dbError } = await supabase
        .from('media_files')
        .insert({ name: file.name, type: 'image', storage_path: path, url: publicUrl })
        .select('id, name, url, created_at')
        .single()

      if (dbError) {
        setUploadError(`Fichier uploadé mais erreur en base : ${dbError.message}`)
        continue
      }

      if (inserted) {
        setFiles((prev) => [inserted as MediaFile, ...prev])
      }
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleCopy(file: MediaFile) {
    try {
      await navigator.clipboard.writeText(file.url)
      setCopiedId(file.id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // ignore clipboard errors
    }
  }

  async function handleDelete(file: MediaFile) {
    await deleteMediaFile(file.id, file.url)
    setFiles((prev) => prev.filter((f) => f.id !== file.id))
  }

  return (
    <div className="font-sans space-y-6">
      {/* Upload area */}
      <div className="flex flex-col items-center gap-3">
        <label className="flex flex-col items-center justify-center w-full max-w-md h-36 border-2 border-dashed border-teal-400 rounded-xl bg-teal-50 hover:bg-teal-100 transition-colors cursor-pointer">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center gap-2 text-teal-700">
              <svg
                className="animate-spin h-8 w-8 text-teal-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span className="text-sm font-medium">Upload en cours…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-teal-700">
              <svg
                className="h-8 w-8 text-teal-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4"
                />
              </svg>
              <span className="text-sm font-semibold">Cliquez pour importer des images</span>
              <span className="text-xs text-teal-500">JPEG, PNG, WebP, GIF</span>
            </div>
          )}
        </label>

        {uploadError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 max-w-md w-full">
            {uploadError}
          </p>
        )}
      </div>

      {/* Grid */}
      {files.length === 0 ? (
        <p className="text-center text-gray-400 py-12 text-sm">
          Aucune image pour l'instant. Importez votre première image.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              {/* Thumbnail */}
              <button
                type="button"
                onClick={() => handleCopy(file)}
                className="block w-full aspect-square focus:outline-none"
                title="Cliquer pour copier l'URL"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                {/* Copy overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-semibold bg-black/50 rounded px-2 py-1">
                    {copiedId === file.id ? '✓ Copié' : 'Copier l\'URL'}
                  </span>
                </div>
                {copiedId === file.id && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-white text-sm font-bold bg-teal-600/80 rounded-lg px-3 py-1">
                      ✓ Copié
                    </span>
                  </div>
                )}
              </button>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(file)}
                className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Supprimer"
              >
                ×
              </button>

              {/* File name */}
              <div className="px-2 py-1.5">
                <p className="text-xs text-gray-600 truncate" title={file.name}>
                  {file.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
