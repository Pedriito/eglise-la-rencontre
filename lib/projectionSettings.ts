export type ProjectionSettings = {
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

export const SETTINGS_ID = '00000000-0000-0000-0000-000000000002'

export const DEFAULT_SETTINGS: ProjectionSettings = {
  id: SETTINGS_ID,
  bg_type: 'color',
  bg_color: '#000000',
  bg_gradient: null,
  bg_image_url: null,
  bg_blur: 0,
  overlay_opacity: 0,
  font_family: 'Inter',
  text_color: '#ffffff',
  text_shadow: false,
}

export const PROJECTION_FONTS = [
  'Inter',
  'Montserrat',
  'Oswald',
  'Raleway',
  'Playfair Display',
  'Bebas Neue',
  'Poppins',
  'Lato',
  'Cinzel',
] as const

export const PRESET_GRADIENTS: { name: string; value: string }[] = [
  { name: 'Nuit profonde',  value: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  { name: 'Aube marine',    value: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)' },
  { name: 'Forêt sombre',   value: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' },
  { name: 'Bordeaux',       value: 'linear-gradient(135deg, #1a0a0a, #3d0000, #200000)' },
  { name: 'Violet profond', value: 'linear-gradient(135deg, #1a0033, #2d0057, #1a0033)' },
]

/** Retourne le style CSS de fond selon les paramètres */
export function getBgStyle(s: ProjectionSettings): React.CSSProperties {
  if (s.bg_type === 'gradient' && s.bg_gradient) {
    return { background: s.bg_gradient }
  }
  if (s.bg_type === 'image' && s.bg_image_url) {
    return {
      backgroundImage: `url(${s.bg_image_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      filter: s.bg_blur > 0 ? `blur(${s.bg_blur}px)` : undefined,
    }
  }
  return { backgroundColor: s.bg_color }
}

/** Retourne le style CSS du texte selon les paramètres */
export function getTextStyle(s: ProjectionSettings): React.CSSProperties {
  return {
    color: s.text_color,
    fontFamily: `'${s.font_family}', sans-serif`,
    textShadow: s.text_shadow
      ? '0 2px 12px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)'
      : undefined,
  }
}

/** Charge dynamiquement une Google Font */
export function loadGoogleFont(fontFamily: string) {
  if (typeof document === 'undefined') return
  if (fontFamily === 'Inter') return // déjà chargée
  const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:ital,wght@0,400;0,600;0,700;1,400&display=swap`
  document.head.appendChild(link)
}
