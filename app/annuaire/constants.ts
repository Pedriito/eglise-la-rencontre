export const LINK_TYPES = [
  { value: 'website',   label: 'Site web',    color: '#5A9EA6', abbr: 'Web' },
  { value: 'instagram', label: 'Instagram',   color: '#E1306C', abbr: 'IG'  },
  { value: 'facebook',  label: 'Facebook',    color: '#1877F2', abbr: 'FB'  },
  { value: 'linkedin',  label: 'LinkedIn',    color: '#0A66C2', abbr: 'in'  },
  { value: 'tiktok',    label: 'TikTok',      color: '#010101', abbr: 'TT'  },
  { value: 'youtube',   label: 'YouTube',     color: '#FF0000', abbr: 'YT'  },
  { value: 'x',         label: 'X',           color: '#000000', abbr: 'X'   },
  { value: 'other',     label: 'Autre lien',  color: '#6B7280', abbr: '↗'  },
] as const

export const SECTORS = [
  'Tech & numérique',
  'Santé & bien-être',
  'Bâtiment & travaux',
  'Immobilier',
  'Finance & comptabilité',
  'Coaching & formation',
  'Alimentation & restauration',
  'Commerce & vente',
  'Communication & marketing',
  'Juridique & conseil',
  'Art & créativité',
  'Éducation',
  'Autre',
]

export function parseSectors(sector: string | null): string[] {
  if (!sector) return []
  try {
    const arr = JSON.parse(sector)
    if (Array.isArray(arr)) return arr
  } catch {}
  return [sector]
}

export function displaySectors(sector: string | null): string {
  return parseSectors(sector).join(', ')
}

export const TARGET_LABELS: Record<string, string> = {
  b2b:  'B2B',
  b2c:  'B2C',
  both: 'B2B & B2C',
}

export const GEO_LABELS: Record<string, string> = {
  local:         'Local',
  national:      'National',
  international: 'International',
}

export const STATUS_LABELS: Record<string, string> = {
  active:    'En activité',
  launching: 'En cours de création',
  project:   'Projet / réflexion',
}

export const STATUS_COLORS: Record<string, string> = {
  active:    'bg-teal/10 text-teal',
  launching: 'bg-coral/10 text-coral',
  project:   'bg-dark/8 text-dark/50',
}

export type EntrepreneurLink = { type: string; url: string }

export type Entrepreneur = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  photo_url: string | null
  contact_email: string | null
  contact_phone: string | null
  company_name: string
  description: string | null
  sector: string | null
  target: 'b2b' | 'b2c' | 'both' | null
  geo: 'local' | 'national' | 'international' | null
  languages: string[]
  links: EntrepreneurLink[]
  status: 'active' | 'launching' | 'project' | null
  visible: boolean
}
