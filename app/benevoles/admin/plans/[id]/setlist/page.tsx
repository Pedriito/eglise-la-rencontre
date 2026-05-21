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

  const songs = (rawSongs ?? []).map(ps => ({
    planSongId:  ps.id,
    orderIndex:  ps.order_index,
    keySelected: ps.key_selected,
    song:        (ps as any).songs as { id: number; title: string },
    arrangement: (ps as any).arrangements as {
      id: string; name: string
      chord_chart: string | null; chord_chart_key: string | null
    } | null,
  }))

  return (
    <SetlistView
      planId={plan.id}
      planTitle={plan.title}
      songs={songs}
    />
  )
}
