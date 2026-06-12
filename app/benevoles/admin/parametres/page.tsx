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
        <h1 className="font-display text-xl md:text-2xl text-dark font-light">Paramètres projection</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">

        {/* Site web */}
        <section>
          <p className="font-sans text-xs text-dark/40 uppercase tracking-widest mb-3 px-1">Site web</p>
          <div className="space-y-2">
            <Link
              href="/benevoles/admin/site"
              className="flex items-center gap-4 bg-white rounded-2xl border border-teal/20 px-5 py-4 hover:border-teal/40 transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center shrink-0 group-hover:bg-teal/20 transition-colors">
                <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-sans text-sm font-medium text-dark">Contenu du site</p>
                <p className="font-sans text-xs text-dark/40 mt-0.5">Horaires, adresse, liens, textes</p>
              </div>
              <svg className="w-4 h-4 text-dark/25 group-hover:text-teal transition-colors ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* Projection */}
        <section>
          <p className="font-sans text-xs text-dark/40 uppercase tracking-widest mb-3 px-1">Projection</p>
          <div className="space-y-2">
            <Link
              href="/benevoles/admin/parametres/projection"
              className="flex items-center gap-4 bg-white rounded-2xl border border-teal/20 px-5 py-4 hover:border-teal/40 transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center shrink-0 group-hover:bg-teal/20 transition-colors">
                <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-sans text-sm font-medium text-dark">Apparence des diapos</p>
                <p className="font-sans text-xs text-dark/40 mt-0.5">Fond d'écran, police, couleur du texte</p>
              </div>
              <svg className="w-4 h-4 text-dark/25 group-hover:text-teal transition-colors ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href="/benevoles/admin/mediatheque"
              className="flex items-center gap-4 bg-white rounded-2xl border border-teal/20 px-5 py-4 hover:border-teal/40 transition-colors group"
            >
              <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center shrink-0 group-hover:bg-teal/20 transition-colors">
                <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="font-sans text-sm font-medium text-dark">Médiathèque</p>
                <p className="font-sans text-xs text-dark/40 mt-0.5">Images à projeter pendant le culte</p>
              </div>
              <svg className="w-4 h-4 text-dark/25 group-hover:text-teal transition-colors ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

      </main>
    </div>
  )
}
