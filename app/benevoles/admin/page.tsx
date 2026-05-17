import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import { BenevoleList } from './BenevoleList'


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

  if (me?.permission !== 'admin') redirect('/benevoles/dashboard')

  const { data: benevoles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, permission, status, created_at')
    .order('last_name')

  const params = await searchParams
  const total = benevoles?.length ?? 0
  const actifs = benevoles?.filter(b => b.status === 'active').length ?? 0
  const invites = benevoles?.filter(b => b.status === 'invited').length ?? 0

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/benevoles/dashboard"
            className="text-dark/40 hover:text-dark transition-colors font-sans text-sm"
          >
            ← Tableau de bord
          </Link>
          <h1 className="font-display text-2xl text-dark font-light">
            Gestion des bénévoles
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/benevoles/admin/plans"
            className="px-4 py-2 border border-teal text-teal rounded-lg font-sans text-sm font-medium hover:bg-teal-50 transition-colors"
          >
            Planification
          </Link>
          <Link
            href="/benevoles/admin/equipes"
            className="px-4 py-2 border border-teal text-teal rounded-lg font-sans text-sm font-medium hover:bg-teal-50 transition-colors"
          >
            Équipes
          </Link>
          <Link
            href="/benevoles/admin/inviter"
            className="px-4 py-2 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
          >
            + Inviter
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {params.success === 'invited' && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 font-sans text-sm">
            Invitation envoyée avec succès.
          </div>
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

        <BenevoleList benevoles={benevoles ?? []} />
      </main>
    </div>
  )
}
