'use client'

import { useEffect, useState, useTransition } from 'react'
import { saveProjectionSettings } from './actions'

type ProjectionSettings = {
  id: string
  bg_type: 'color' | 'gradient' | 'image'
  bg_color: string
  bg_gradient: string | null
  bg_image_url: string | null
  bg_blur: number
  overlay_opacity: number
  font_family: string
  text_color: string
  text_shadow: boolean
}

type MediaFile = { id: string; name: string; url: string }

type Props = {
  initial: ProjectionSettings
  mediaFiles: MediaFile[]
}

const GRADIENTS: { label: string; value: string }[] = [
  { label: 'Nuit profonde', value: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  { label: 'Aube marine', value: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)' },
  { label: 'Forêt sombre', value: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' },
  { label: 'Bordeaux', value: 'linear-gradient(135deg, #1a0a0a, #3d0000, #200000)' },
  { label: 'Violet profond', value: 'linear-gradient(135deg, #1a0033, #2d0057, #1a0033)' },
]

const FONTS: string[] = [
  'Inter',
  'Montserrat',
  'Oswald',
  'Raleway',
  'Playfair Display',
  'Bebas Neue',
  'Poppins',
  'Lato',
  'Cinzel',
]

export default function ProjectionSettingsForm({ initial, mediaFiles }: Props) {
  const [settings, setSettings] = useState<ProjectionSettings>({ ...initial })
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  // Load Google Font when font_family changes
  useEffect(() => {
    if (settings.font_family === 'Inter') return
    const font = settings.font_family
    const id = `gfont-${font.replace(/\s+/g, '-').toLowerCase()}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:ital,wght@0,400;0,600;0,700;1,400&display=swap`
    document.head.appendChild(link)
  }, [settings.font_family])

  // Also preload all font options on mount for the selector preview
  useEffect(() => {
    FONTS.forEach((font) => {
      if (font === 'Inter') return
      const id = `gfont-${font.replace(/\s+/g, '-').toLowerCase()}`
      if (document.getElementById(id)) return
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:ital,wght@0,400;0,600;0,700;1,400&display=swap`
      document.head.appendChild(link)
    })
  }, [])

  function update<K extends keyof ProjectionSettings>(key: K, value: ProjectionSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveProjectionSettings(settings)
      if (result.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  // --- Preview background style ---
  function previewBgStyle(): React.CSSProperties {
    if (settings.bg_type === 'color') {
      return { background: settings.bg_color }
    }
    if (settings.bg_type === 'gradient') {
      return { background: settings.bg_gradient ?? '#000' }
    }
    // image — we use a pseudo-layer approach via inline styles
    return { background: '#000', position: 'relative', overflow: 'hidden' }
  }

  const textShadowStyle = settings.text_shadow
    ? '0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)'
    : undefined

  return (
    <div className="space-y-6">
      {/* ── Live Preview ── */}
      <div className="bg-white rounded-2xl border border-teal-200 p-6 space-y-4">
        <p className="font-sans text-xs text-gray-400 uppercase tracking-widest">Aperçu</p>
        <div
          className="relative w-full rounded-xl overflow-hidden"
          style={{ aspectRatio: '16 / 9', ...previewBgStyle() }}
        >
          {/* Background image layer */}
          {settings.bg_type === 'image' && settings.bg_image_url && (
            <>
              <div
                className="absolute inset-0 bg-center bg-cover"
                style={{
                  backgroundImage: `url(${settings.bg_image_url})`,
                  filter: `blur(${settings.bg_blur}px)`,
                  transform: 'scale(1.1)', // prevents blur edge artifacts
                }}
              />
              <div
                className="absolute inset-0"
                style={{ background: `rgba(0,0,0,${settings.overlay_opacity})` }}
              />
            </>
          )}

          {/* Lyrics text */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8"
            style={{
              fontFamily: `'${settings.font_family}', sans-serif`,
              color: settings.text_color,
              textShadow: textShadowStyle,
            }}
          >
            <span className="text-3xl font-semibold text-center leading-tight">
              Gloire à toi Seigneur
            </span>
            <span className="text-3xl font-semibold text-center leading-tight">
              Tu règnes pour toujours
            </span>
          </div>
        </div>
      </div>

      {/* ── Background ── */}
      <div className="bg-white rounded-2xl border border-teal-200 p-6 space-y-4">
        <p className="font-sans text-xs text-gray-400 uppercase tracking-widest">Fond</p>

        {/* bg_type selector */}
        <div className="flex gap-2">
          {(['color', 'gradient', 'image'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => update('bg_type', type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                settings.bg_type === type
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300'
              }`}
            >
              {type === 'color' ? 'Couleur' : type === 'gradient' ? 'Dégradé' : 'Image'}
            </button>
          ))}
        </div>

        {/* Color picker */}
        {settings.bg_type === 'color' && (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.bg_color}
              onChange={(e) => update('bg_color', e.target.value)}
              className="h-10 w-14 rounded cursor-pointer border border-gray-200"
            />
            <input
              type="text"
              value={settings.bg_color}
              onChange={(e) => update('bg_color', e.target.value)}
              maxLength={7}
              className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}

        {/* Gradient presets */}
        {settings.bg_type === 'gradient' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GRADIENTS.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => update('bg_gradient', g.value)}
                  className={`relative h-14 rounded-lg overflow-hidden border-2 transition-all ${
                    settings.bg_gradient === g.value
                      ? 'ring-2 ring-teal-500 ring-offset-1 border-teal-500'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  style={{ background: g.value }}
                >
                  <span className="absolute bottom-1 left-2 text-white text-xs font-medium drop-shadow">
                    {g.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="space-y-1">
              <label className="font-sans text-xs text-gray-400 uppercase tracking-widest">
                Dégradé personnalisé (CSS)
              </label>
              <input
                type="text"
                value={settings.bg_gradient ?? ''}
                onChange={(e) => update('bg_gradient', e.target.value || null)}
                placeholder="linear-gradient(135deg, #000, #333)"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        )}

        {/* Image selector */}
        {settings.bg_type === 'image' && (
          <div className="space-y-4">
            {mediaFiles.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                Ajoutez des images dans la médiathèque d'abord.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {mediaFiles.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => update('bg_image_url', file.url)}
                    className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                      settings.bg_image_url === file.url
                        ? 'ring-2 ring-teal-500 ring-offset-1 border-teal-500'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.url}
                      alt={file.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Overlay slider */}
            <div className="space-y-1">
              <label className="font-sans text-xs text-gray-400 uppercase tracking-widest flex justify-between">
                <span>Overlay (obscurcissement)</span>
                <span>{Math.round(settings.overlay_opacity * 100)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={85}
                step={1}
                value={Math.round(settings.overlay_opacity * 100)}
                onChange={(e) => update('overlay_opacity', Number(e.target.value) / 100)}
                className="w-full accent-teal-600"
              />
            </div>

            {/* Blur slider */}
            <div className="space-y-1">
              <label className="font-sans text-xs text-gray-400 uppercase tracking-widest flex justify-between">
                <span>Flou</span>
                <span>{settings.bg_blur}px</span>
              </label>
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={settings.bg_blur}
                onChange={(e) => update('bg_blur', Number(e.target.value))}
                className="w-full accent-teal-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Font ── */}
      <div className="bg-white rounded-2xl border border-teal-200 p-6 space-y-4">
        <p className="font-sans text-xs text-gray-400 uppercase tracking-widest">Police</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FONTS.map((font) => (
            <button
              key={font}
              type="button"
              onClick={() => update('font_family', font)}
              className={`px-3 py-3 rounded-lg border text-sm transition-colors text-left ${
                settings.font_family === font
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300'
              }`}
              style={{ fontFamily: `'${font}', sans-serif` }}
            >
              {font}
            </button>
          ))}
        </div>
      </div>

      {/* ── Text ── */}
      <div className="bg-white rounded-2xl border border-teal-200 p-6 space-y-4">
        <p className="font-sans text-xs text-gray-400 uppercase tracking-widest">Texte</p>

        {/* Text color */}
        <div className="space-y-1">
          <label className="font-sans text-xs text-gray-400 uppercase tracking-widest">
            Couleur du texte
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.text_color}
              onChange={(e) => update('text_color', e.target.value)}
              className="h-10 w-14 rounded cursor-pointer border border-gray-200"
            />
            <span className="text-sm font-mono text-gray-600">{settings.text_color}</span>
          </div>
        </div>

        {/* Text shadow toggle */}
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs text-gray-400 uppercase tracking-widest">
            Ombre portée
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.text_shadow}
            onClick={() => update('text_shadow', !settings.text_shadow)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${
              settings.text_shadow ? 'bg-teal-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                settings.text_shadow ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ── Save button ── */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-teal-600 font-medium">✓ Sauvegardé</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-6 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
