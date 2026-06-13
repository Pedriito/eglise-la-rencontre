import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import { BenevoleList } from './BenevoleList'
import { FlashMessage } from '../_components/FlashMessage'
import InviteTokenPanel from './InviteTokenPanel'
import { createAdminClient } from '@/lib/supabase/admin'


export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: me } = await supabase
    .from('profiles')
    .select('permission')
    .eq('id', user.id)
    .single()

  if (!['admin', 'super_admin'].includes(me?.permission ?? '')) redirect('/benevoles/dashboard')

  const INVITE_EXT_ID = '00000000-0000-0000-0000-000000000001'
  const { data: benevoles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, permission, status, created_at')
    .neq('id', INVITE_EXT_ID)
    .order('first_name')

  const adminClient = createAdminClient()
  const { data: inviteTokens } = await adminClient
    .from('invite_tokens')
    .select('id, token, label, expires_at, max_uses, uses_count, created_at, revoked_at')
    .order('created_at', { ascending: false })

  const params = await searchParams
  const total = benevoles?.length ?? 0
  const actifs = benevoles?.filter(b => b.status === 'active').length ?? 0
  const invites = benevoles?.filter(b => b.status === 'invited').length ?? 0

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-xl md:text-2xl text-dark font-light">Bénévoles</h1>
        <Link
          href="/benevoles/admin/inviter"
          className="shrink-0 px-3 md:px-4 py-2 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
        >
          + Inviter
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {params.success === 'invited' && (
          <FlashMessage message="Invitation envoyée avec succès." type="success" />
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: total },
            { label: 'Actifs', value: actifs },
            { label: 'En attente', value: invites },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-teal/20 p-5 text-center">
              <p className="font-display text-4xl text-dark font-light">{stat.value}</p>
              <p className="text-xs text-dark/50 font-sans mt-1 uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Liens d'inscription */}
        <section className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50">
            <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Liens d'inscription</p>
            <p className="font-sans text-xs text-dark/30 mt-0.5">Partage un lien pour que les bénévoles s'inscrivent eux-mêmes</p>
          </div>
          <div className="p-4">
            <InviteTokenPanel initial={(inviteTokens ?? []) as any} />
          </div>
        </section>

        <BenevoleList benevoles={benevoles ?? []} />
      </main>
    </div>
  )
}
