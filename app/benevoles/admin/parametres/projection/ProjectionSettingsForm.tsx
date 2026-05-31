'use client'

import { useEffect, useState, useTransition } from 'react'
import { saveProjectionSettings } from './actions'

type BgType = 'color' | 'gradient' | 'image'
type TextTransform = 'uppercase' | 'capitalize' | 'small-caps' | 'none'

type ProjectionSettings = {
  id: string
  // Fond chants
  bg_type: BgType
  bg_color: string
  bg_gradient: string | null
  bg_image_url: string | null
  bg_blur: number
  overlay_opacity: number
  // Police & texte
  font_family: string
  text_color: string
  text_shadow: boolean
  text_transform: TextTransform
  // Fond + casse annonces
  ann_bg_type: BgType
  ann_bg_color: string
  ann_bg_gradient: string | null
  ann_bg_image_url: string | null
  ann_bg_blur: number
  ann_bg_overlay_opacity: number
  ann_text_transform: TextTransform
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
  'Inter', 'Montserrat', 'Oswald', 'Raleway',
  'Playfair Display', 'Bebas Neue', 'Poppins', 'Lato', 'Cinzel',
]

// ── Composant réutilisable pour la casse ─────────────────────────────────────
function CassePicker({ value, fontFamily, onChange }: { value: TextTransform; fontFamily: string; onChange: (v: TextTransform) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {([
        { value: 'uppercase',  label: 'MAJUSCULES',   preview: 'GLOIRE À TOI' },
        { value: 'capitalize', label: 'Initiales',    preview: 'Gloire À Toi' },
        { value: 'small-caps', label: 'Petites maj.', preview: 'Gloire à toi' },
        { value: 'none',       label: 'Normal',       preview: 'Gloire à toi' },
      ] as const).map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-center transition-colors ${
            value === opt.value
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300'
          }`}
        >
          <span className="text-sm font-semibold leading-tight" style={{
            textTransform: opt.value === 'small-caps' || opt.value === 'none' ? 'none' : opt.value,
            fontVariant: opt.value === 'small-caps' ? 'small-caps' : undefined,
            fontFamily: `'${fontFamily}', sans-serif`,
          }}>
            {opt.preview}
          </span>
          <span className="text-[10px] opacity-70 font-normal">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Composant réutilisable pour les options de fond ──────────────────────────
type BgPickerProps = {
  bgType: BgType
  bgColor: string
  bgGradient: string | null
  bgImageUrl: string | null
  bgBlur: number
  overlayOpacity: number
  mediaFiles: MediaFile[]
  onBgType: (v: BgType) => void
  onBgColor: (v: string) => void
  onBgGradient: (v: string | null) => void
  onBgImageUrl: (v: string | null) => void
  onBgBlur: (v: number) => void
  onOverlayOpacity: (v: number) => void
}

function BackgroundPicker({
  bgType, bgColor, bgGradient, bgImageUrl, bgBlur, overlayOpacity,
  mediaFiles,
  onBgType, onBgColor, onBgGradient, onBgImageUrl, onBgBlur, onOverlayOpacity,
}: BgPickerProps) {
  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="flex gap-2">
        {(['color', 'gradient', 'image'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onBgType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              bgType === type
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-gray-700 border-gray-200 hover:border-teal-300'
            }`}
          >
            {type === 'color' ? 'Couleur' : type === 'gradient' ? 'Dégradé' : 'Image'}
          </button>
        ))}
      </div>

      {/* Color */}
      {bgType === 'color' && (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={bgColor}
            onChange={(e) => onBgColor(e.target.value)}
            className="h-10 w-14 rounded cursor-pointer border border-gray-200"
          />
          <input
            type="text"
            value={bgColor}
            onChange={(e) => onBgColor(e.target.value)}
            maxLength={7}
            className="w-28 px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      )}

      {/* Gradient */}
      {bgType === 'gradient' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GRADIENTS.map((g) => (
              <button
                key={g.label}
                type="button"
                onClick={() => onBgGradient(g.value)}
                className={`relative h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  bgGradient === g.value
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
              value={bgGradient ?? ''}
              onChange={(e) => onBgGradient(e.target.value || null)}
              placeholder="linear-gradient(135deg, #000, #333)"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      )}

      {/* Image */}
      {bgType === 'image' && (
        <div className="space-y-4">
          {mediaFiles.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Ajoutez des images dans la médiathèque d'abord.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {mediaFiles.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => onBgImageUrl(file.url)}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    bgImageUrl === file.url
                      ? 'ring-2 ring-teal-500 ring-offset-1 border-teal-500'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file.url} alt={file.name} className="absolute inset-0 w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="space-y-1">
            <label className="font-sans text-xs text-gray-400 uppercase tracking-widest flex justify-between">
              <span>Overlay (obscurcissement)</span>
              <span>{Math.round(overlayOpacity * 100)}%</span>
            </label>
            <input
              type="range" min={0} max={85} step={1}
              value={Math.round(overlayOpacity * 100)}
              onChange={(e) => onOverlayOpacity(Number(e.target.value) / 100)}
              className="w-full accent-teal-600"
            />
          </div>
          <div className="space-y-1">
            <label className="font-sans text-xs text-gray-400 uppercase tracking-widest flex justify-between">
              <span>Flou</span>
              <span>{bgBlur}px</span>
            </label>
            <input
              type="range" min={0} max={20} step={1}
              value={bgBlur}
              onChange={(e) => onBgBlur(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
          </div>
        </div>
      )}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectionSettingsForm({ initial, mediaFiles }: Props) {
  const [settings, setSettings] = useState<ProjectionSettings>({
    ...initial,
    text_transform:         (initial.text_transform         ?? 'uppercase') as TextTransform,
    ann_text_transform:     (initial.ann_text_transform     ?? 'none')      as TextTransform,
    ann_bg_type:            initial.ann_bg_type            ?? 'color',
    ann_bg_color:           initial.ann_bg_color           ?? '#1e293b',
    ann_bg_gradient:        initial.ann_bg_gradient        ?? null,
    ann_bg_image_url:       initial.ann_bg_image_url       ?? null,
    ann_bg_blur:            initial.ann_bg_blur            ?? 0,
    ann_bg_overlay_opacity: initial.ann_bg_overlay_opacity ?? 0,
  })
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Load Google Font when font_family changes
  useEffect(() => {
    if (settings.font_family === 'Inter') return
    const font = settings.font_family
    const id = `gfont-${font.replace(/\s+/g, '-').toLowerCase()}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id; link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:ital,wght@0,400;0,600;0,700;1,400&display=swap`
    document.head.appendChild(link)
  }, [settings.font_family])

  // Preload all fonts for selector preview
  useEffect(() => {
    FONTS.forEach((font) => {
      if (font === 'Inter') return
      const id = `gfont-${font.replace(/\s+/g, '-').toLowerCase()}`
      if (document.getElementById(id)) return
      const link = document.createElement('link')
      link.id = id; link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:ital,wght@0,400;0,600;0,700;1,400&display=swap`
      document.head.appendChild(link)
    })
  }, [])

  function update<K extends keyof ProjectionSettings>(key: K, value: ProjectionSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    setSaveError(null)
    startTransition(async () => {
      const result = await saveProjectionSettings(settings)
      if (result.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setSaveError(result.error ?? 'Erreur inconnue')
      }
    })
  }

  // Styles de prévisualisation
  function previewBgStyle(): React.CSSProperties {
    if (settings.bg_type === 'gradient') return { background: settings.bg_gradient ?? '#000' }
    if (settings.bg_type === 'image') return { background: '#000', position: 'relative', overflow: 'hidden' }
    return { background: settings.bg_color }
  }

  function annPreviewBgStyle(): React.CSSProperties {
    if (settings.ann_bg_type === 'gradient') return { background: settings.ann_bg_gradient ?? '#1e293b' }
    if (settings.ann_bg_type === 'image') return { background: '#1e293b', position: 'relative', overflow: 'hidden' }
    return { background: settings.ann_bg_color }
  }

  const textShadowStyle = settings.text_shadow
    ? '0 2px 12px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)'
    : undefined

  return (
    <div className="space-y-6">

      {/* ── Aperçu chants ── */}
      <div className="bg-white rounded-2xl border border-teal-200 p-6 space-y-4">
        <p className="font-sans text-xs text-gray-400 uppercase tracking-widest">Aperçu — Chants</p>
        <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 9', ...previewBgStyle() }}>
          {settings.bg_type === 'image' && settings.bg_image_url && (
            <>
              <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${settings.bg_image_url})`, filter: `blur(${settings.bg_blur}px)`, transform: 'scale(1.1)' }} />
              <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${settings.overlay_opacity})` }} />
            </>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8" style={{ fontFamily: `'${settings.font_family}', sans-serif`, color: settings.text_color, textShadow: textShadowStyle }}>
            <span className="text-3xl font-semibold text-center leading-tight">Gloire à toi Seigneur</span>
            <span className="text-3xl font-semibold text-center leading-tight">Tu règnes pour toujours</span>
          </div>
        </div>
      </div>

      {/* ── Fond chants ── */}
      <div className="bg-white rounded-2xl border border-teal-200 p-6 space-y-4">
        <p className="font-sans text-xs text-gray-400 uppercase tracking-widest">Fond — Chants</p>
        <BackgroundPicker
          bgType={settings.bg_type}
          bgColor={settings.bg_color}
          bgGradient={settings.bg_gradient}
          bgImageUrl={settings.bg_image_url}
          bgBlur={settings.bg_blur}
          overlayOpacity={settings.overlay_opacity}
          mediaFiles={mediaFiles}
          onBgType={v => update('bg_type', v)}
          onBgColor={v => update('bg_color', v)}
          onBgGradient={v => update('bg_gradient', v)}
          onBgImageUrl={v => update('bg_image_url', v)}
          onBgBlur={v => update('bg_blur', v)}
          onOverlayOpacity={v => update('overlay_opacity', v)}
        />
      </div>

      {/* ── Aperçu annonces ── */}
      <div className="bg-white rounded-2xl border border-teal-200 p-6 space-y-4">
        <p className="font-sans text-xs text-gray-400 uppercase tracking-widest">Aperçu — Annonces</p>
        <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16 / 9', ...annPreviewBgStyle() }}>
          {settings.ann_bg_type === 'image' && settings.ann_bg_image_url && (
            <>
              <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${settings.ann_bg_image_url})`, filter: `blur(${settings.ann_bg_blur}px)`, transform: 'scale(1.1)' }} />
              <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${settings.ann_bg_overlay_opacity})` }} />
            </>
          )}
          <div className="absolute inset-0 flex flex-col justify-center px-[8%]" style={{ fontFamily: `'${settings.font_family}', sans-serif`, color: settings.text_color, textShadow: textShadowStyle }}>
            <p className="text-xs uppercase tracking-[0.3em] opacity-50 mb-2">Programme</p>
            <p className="text-2xl font-semibold leading-tight">Assemblée générale</p>
            <p className="text-2xl font-semibold leading-tight">Dimanche 7 juin</p>
          </div>
        </div>
      </div>

      {/* ── Fond + casse annonces ── */}
      <div className="bg-white rounded-2xl border border-teal-200 p-6 space-y-4">
        <div>
          <p className="font-sans text-xs text-gray-400 uppercase tracking-widest">Fond — Annonces</p>
          <p className="font-sans text-xs text-gray-300 mt-0.5">Fond indépendant affiché pendant les diapos d'annonces</p>
        </div>
        <BackgroundPicker
          bgType={settings.ann_bg_type}
          bgColor={settings.ann_bg_color}
          bgGradient={settings.ann_bg_gradient}
          bgImageUrl={settings.ann_bg_image_url}
          bgBlur={settings.ann_bg_blur}
          overlayOpacity={settings.ann_bg_overlay_opacity}
          mediaFiles={mediaFiles}
          onBgType={v => update('ann_bg_type', v)}
          onBgColor={v => update('ann_bg_color', v)}
          onBgGradient={v => update('ann_bg_gradient', v)}
          onBgImageUrl={v => update('ann_bg_image_url', v)}
          onBgBlur={v => update('ann_bg_blur', v)}
          onOverlayOpacity={v => update('ann_bg_overlay_opacity', v)}
        />
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="font-sans text-xs text-gray-400 uppercase tracking-widest">Casse — Annonces</label>
          <CassePicker value={settings.ann_text_transform} fontFamily={settings.font_family} onChange={v => update('ann_text_transform', v)} />
        </div>
      </div>

      {/* ── Police ── */}
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

      {/* ── Texte ── */}
      <div className="bg-white rounded-2xl border border-teal-200 p-6 space-y-4">
        <p className="font-sans text-xs text-gray-400 uppercase tracking-widest">Texte</p>
        <div className="space-y-1">
          <label className="font-sans text-xs text-gray-400 uppercase tracking-widest">Couleur du texte</label>
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
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs text-gray-400 uppercase tracking-widest">Ombre portée</span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.text_shadow}
            onClick={() => update('text_shadow', !settings.text_shadow)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${settings.text_shadow ? 'bg-teal-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${settings.text_shadow ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Casse chants */}
        <div className="space-y-2">
          <label className="font-sans text-xs text-gray-400 uppercase tracking-widest">Casse — Chants</label>
          <CassePicker value={settings.text_transform} fontFamily={settings.font_family} onChange={v => update('text_transform', v)} />
        </div>
      </div>

      {/* ── Sauvegarder ── */}
      <div className="flex items-center justify-end gap-3">
        {saveError && <span className="text-sm text-red-500 font-medium">✗ {saveError}</span>}
        {saved && <span className="text-sm text-teal-600 font-medium">✓ Sauvegardé</span>}
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
