import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { SetlistView } from './SetlistView'

export default async function SetlistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('permission')
    .eq('id', user.id)
    .single()
  if (me?.permission !== 'admin' && me?.permission !== 'editor') redirect('/benevoles/dashboard')

  const [{ data: plan }, { data: rawSongs }] = await Promise.all([
    supabase.from('plans').select('id, title').eq('id', id).single(),
    supabase
      .from('plan_songs')
      .select('id, order_index, key_selected, songs(id, title), arrangements(id, name, chord_chart, chord_chart_key)')
      .eq('plan_id', id)
      .order('order_index'),
  ])

  if (!plan) notFound()

  // Fetch tous les arrangements disponibles pour chaque chant du plan
  const songIds = [...new Set((rawSongs ?? []).map(ps => (ps as any).songs?.id as number).filter(Boolean))]
  const { data: allArrangementsRaw } = songIds.length > 0
    ? await supabase
        .from('arrangements')
        .select('id, name, song_id, chord_chart_key, chord_chart')
        .in('song_id', songIds)
    : { data: [] as { id: string; name: string; song_id: number; chord_chart_key: string | null; chord_chart: string | null }[] }

  // Index par song_id
  const arrsBySong: Record<number, { id: string; name: string; chord_chart_key: string | null; hasChart: boolean }[]> = {}
  for (const a of (allArrangementsRaw ?? [])) {
    const sid = (a as any).song_id as number
    if (!arrsBySong[sid]) arrsBySong[sid] = []
    arrsBySong[sid].push({ id: a.id, name: a.name, chord_chart_key: a.chord_chart_key, hasChart: !!a.chord_chart })
  }

  const songs = (rawSongs ?? []).map(ps => ({
    planSongId:      ps.id,
    orderIndex:      ps.order_index,
    keySelected:     ps.key_selected,
    song:            (ps as any).songs as { id: number; title: string },
    arrangement:     (ps as any).arrangements as {
      id: string; name: string
      chord_chart: string | null; chord_chart_key: string | null
    } | null,
    allArrangements: arrsBySong[(ps as any).songs?.id as number] ?? [],
  }))

  return (
    <SetlistView
      planId={plan.id}
      planTitle={plan.title}
      songs={songs}
    />
  )
}
