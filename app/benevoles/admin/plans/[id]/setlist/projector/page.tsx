import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { ProjectorScreen } from './ProjectorScreen'

export default async function ProjectorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

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
    keySelected: ps.key_selected,
    song:        (ps as any).songs as { id: number; title: string },
    arrangement: (ps as any).arrangements as {
      id: string; name: string
      chord_chart: string | null; chord_chart_key: string | null
    } | null,
  }))

  return <ProjectorScreen planId={plan.id} songs={songs} />
}
