import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FlashMessage } from '../../_components/FlashMessage'

export default async function AdminChantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; deleted?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (!['admin', 'editor', 'super_admin'].includes(me?.permission ?? '')) redirect('/benevoles/dashboard')

  const { q, deleted } = await searchParams
  const search = q?.trim() ?? ''

  let query = supabase
    .from('songs')
    .select('id, title, arrangements(id, chord_chart_key)')
    .order('title')

  if (search) query = query.ilike('title', `%${search}%`)

  const { data: songs } = await query

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-8 py-4 flex items-center gap-4">
        <Link href="/benevoles/admin" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm">←</Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl text-dark font-light">Chants</h1>
          <p className="text-xs text-dark/40 font-sans mt-0.5">{songs?.length ?? 0} chant{(songs?.length ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/benevoles/admin/chants/nouveau"
          className="px-4 py-2 bg-teal text-white rounded-xl font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
        >
          + Nouveau chant
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-4">

        {deleted && (
          <FlashMessage type="success" message="Chant supprimé." />
        )}

        {/* Recherche */}
        <form method="GET" className="relative">
          <input
            name="q"
            defaultValue={search}
            placeholder="Rechercher un chant…"
            autoComplete="off"
            className="w-full bg-white border border-teal/20 rounded-2xl px-4 py-3 pr-10 font-sans text-sm text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
          {search && (
            <Link href="/benevoles/admin/chants" className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30 hover:text-dark text-lg">×</Link>
          )}
        </form>

        {/* Liste */}
        <div className="space-y-2">
          {(songs ?? []).map(song => {
            const keys = (song.arrangements as { id: string; chord_chart_key: string | null }[])
              .map(a => a.chord_chart_key).filter(Boolean).join(', ')

            return (
              <div
                key={song.id}
                className="flex items-center justify-between bg-white rounded-2xl border border-teal/20 px-5 py-4 hover:border-teal/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm text-dark font-medium truncate">{song.title}</p>
                  <p className="font-sans text-xs text-dark/40 mt-0.5">{keys || 'aucune tonalité'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Link
                    href={`/benevoles/chants/${song.id}`}
                    className="px-3 py-1.5 font-sans text-xs text-dark/50 hover:text-dark hover:bg-teal/5 rounded-lg transition-colors"
                  >
                    Voir
                  </Link>
                  <Link
                    href={`/benevoles/admin/chants/${song.id}/modifier`}
                    className="px-3 py-1.5 bg-teal/10 text-teal font-sans text-xs rounded-lg hover:bg-teal/20 transition-colors"
                  >
                    Modifier
                  </Link>
                </div>
              </div>
            )
          })}

          {(songs ?? []).length === 0 && (
            <div className="text-center py-12">
              <p className="font-sans text-sm text-dark/40">
                {search ? `Aucun résultat pour "${search}"` : 'Aucun chant.'}
              </p>
              {!search && (
                <Link href="/benevoles/admin/chants/nouveau" className="mt-3 inline-block text-teal font-sans text-sm hover:underline">
                  Créer le premier chant →
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
