import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getChurchSettings, getChurchSchedules } from '@/lib/churchSettings'
import SiteSettingsForm from './SiteSettingsForm'
import SchedulesManager from './SchedulesManager'

export default async function SitePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin') redirect('/benevoles/dashboard')

  const [settings, schedules] = await Promise.all([
    getChurchSettings(),
    getChurchSchedules(),
  ])

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4 flex items-center gap-3">
        <Link href="/benevoles/admin/parametres" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm shrink-0">←</Link>
        <h1 className="font-display text-xl md:text-2xl text-dark font-light">Site web</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">

        <section>
          <p className="font-sans text-xs text-dark/40 uppercase tracking-widest mb-3 px-1">Contenu du site</p>
          <SiteSettingsForm initial={settings} />
        </section>

        <section>
          <p className="font-sans text-xs text-dark/40 uppercase tracking-widest mb-3 px-1">Horaires</p>
          <SchedulesManager initial={schedules} />
        </section>

      </main>
    </div>
  )
}
