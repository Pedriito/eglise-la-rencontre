import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export const CHURCH_SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export type ChurchSettings = {
  church_name: string
  tagline: string
  address_street: string
  address_city: string
  address_zip: string
  address_dept: string
  email: string
  youtube_url: string
  maps_url: string
  helloasso_widget_url: string
  tax_deduction_pct: number
  pastors_names: string
  pastors_photo_url: string
}

export type ChurchSchedule = {
  id: string
  sort_order: number
  day_of_week: string
  event_name: string
  start_time: string
  end_time: string | null
  subtitle: string | null
  active: boolean
}

export const DEFAULT_CHURCH_SETTINGS: ChurchSettings = {
  church_name: 'Église La Rencontre',
  tagline: 'Un lieu où tout commence par une rencontre.',
  address_street: '441, avenue Marguerite Perrey',
  address_city: 'Lieusaint',
  address_zip: '77127',
  address_dept: 'Seine-et-Marne',
  email: 'contact@egliselarencontre.fr',
  youtube_url: 'https://www.youtube.com/@eglise.larencontre',
  maps_url: 'https://maps.google.com/?q=441+avenue+Marguerite+Perrey+77127+Lieusaint',
  helloasso_widget_url: 'https://www.helloasso.com/associations/eglise-la-rencontre/formulaires/5/widget',
  tax_deduction_pct: 66,
  pastors_names: 'Audrey et Nicolas Salafranque',
  pastors_photo_url: '/audrey_nico.png',
}

export const getChurchSettings = cache(async (): Promise<ChurchSettings> => {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('church_settings')
      .select('*')
      .eq('id', CHURCH_SETTINGS_ID)
      .single()
    return data ?? DEFAULT_CHURCH_SETTINGS
  } catch {
    return DEFAULT_CHURCH_SETTINGS
  }
})

export const getChurchSchedules = cache(async (): Promise<ChurchSchedule[]> => {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('church_schedules')
      .select('*')
      .eq('active', true)
      .order('sort_order')
    return data ?? []
  } catch {
    return []
  }
})
