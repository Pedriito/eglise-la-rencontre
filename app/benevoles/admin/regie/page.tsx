import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RegieClient from './RegieClient'

export default async function Regie() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (!['admin', 'editor', 'super_admin'].includes(me?.permission ?? '')) redirect('/benevoles/dashboard')

  return <RegieClient />
}
