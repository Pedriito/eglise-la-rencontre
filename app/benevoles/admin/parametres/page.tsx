import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ParametresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (me?.permission !== 'admin' && me?.permission !== 'editor') redirect('/benevoles/dashboard')

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4 flex items-center gap-3">
        <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm shrink-0">←</Link>
        <h1 className="font-display text-xl md:text-2xl text-dark font-light">Paramètres</h1>
      </header>
      <main className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-3">
        <Link
          href="/benevoles/admin/parametres/projection"
          className="flex items-center gap-4 bg-white rounded-2xl border border-teal/20 px-6 py-5 hover:border-teal/50 hover:bg-teal/5 transition-colors group"
        >
          <span className="text-2xl">🎨</span>
          <div>
            <p className="font-sans text-sm font-medium text-dark group-hover:text-teal transition-colors">Apparence de la projection</p>
            <p className="font-sans text-xs text-dark/40 mt-0.5">Fond d'écran, police, couleur du texte</p>
          </div>
          <span className="ml-auto text-dark/25 group-hover:text-teal transition-colors">→</span>
        </Link>
        <Link
          href="/benevoles/admin/mediatheque"
          className="flex items-center gap-4 bg-white rounded-2xl border border-teal/20 px-6 py-5 hover:border-teal/50 hover:bg-teal/5 transition-colors group"
        >
          <span className="text-2xl">🖼️</span>
          <div>
            <p className="font-sans text-sm font-medium text-dark group-hover:text-teal transition-colors">Médiathèque</p>
            <p className="font-sans text-xs text-dark/40 mt-0.5">Importer et gérer les images pour la projection</p>
          </div>
          <span className="ml-auto text-dark/25 group-hover:text-teal transition-colors">→</span>
        </Link>
      </main>
    </div>
  )
}
