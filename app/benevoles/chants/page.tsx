import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type Song = {
  id: number
  title: string
  ccli: string | null
  themes: string | null
  last_scheduled_date: string | null
  arrangements: { id: string; chord_chart_key: string | null }[]
}

export default async function ChantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { q } = await searchParams
  const search = q?.trim() ?? ''

  let query = supabase
    .from('songs')
    .select('id, title, ccli, themes, last_scheduled_date, arrangements(id, chord_chart_key)')
    .order('title')

  if (search) {
    query = query.ilike('title', `%${search}%`)
  }

  const { data: songs } = await query

  return (
    <div className="min-h-screen bg-sand">
      <header className="bg-white border-b border-dark/8 px-4 md:px-6 py-4 flex items-center gap-3">
        <Link href="/benevoles/dashboard" className="text-dark/40 hover:text-dark transition-colors font-sans text-lg shrink-0">‹</Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl md:text-2xl text-dark font-light truncate">Chants</h1>
          <p className="font-sans text-xs text-dark/40 mt-0.5">{songs?.length ?? 0} chants</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-4">

        {/* Recherche */}
        <form method="GET" className="relative">
          <input
            name="q"
            defaultValue={search}
            placeholder="Rechercher un chant…"
            className="w-full bg-white border border-dark/8 rounded-2xl px-4 py-3 pr-10 font-sans text-sm text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/30 shadow-sm"
          />
          {search && (
            <Link
              href="/benevoles/chants"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30 hover:text-dark text-lg"
            >
              ×
            </Link>
          )}
        </form>

        {/* Liste */}
        <div className="bg-white rounded-2xl border border-dark/8 shadow-sm overflow-hidden">
          {(songs ?? []).map(song => {
            const keys = song.arrangements
              .map(a => a.chord_chart_key)
              .filter(Boolean)
              .join(', ')

            return (
              <Link
                key={song.id}
                href={`/benevoles/chants/${song.id}`}
                className="flex items-center justify-between border-b border-dark/6 last:border-0 px-5 py-4 hover:bg-sand/50 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm text-dark font-medium truncate">{song.title}</p>
                  <p className="font-sans text-xs text-dark/40 mt-0.5">
                    {keys || 'aucune tonalité'}
                    {song.ccli && (
                      <span className="ml-2 text-dark/25">CCLI {song.ccli}</span>
                    )}
                  </p>
                </div>
                <span className="text-dark/25 font-sans text-sm group-hover:translate-x-0.5 transition-transform shrink-0 ml-3">→</span>
              </Link>
            )
          })}

          {(songs ?? []).length === 0 && (
            <div className="text-center py-12">
              <p className="font-sans text-sm text-dark/40">
                {search ? `Aucun chant pour "${search}"` : 'Aucun chant importé.'}
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
