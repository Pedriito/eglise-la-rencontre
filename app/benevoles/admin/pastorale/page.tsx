import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PrayerRequestForm } from './PrayerRequestForm'
import { IconHome, IconPhone, IconChat, IconDocument } from '@/app/benevoles/_components/Icons'
import { SheetSync } from './SheetSync'

export default async function PastoralePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')
  const { data: me } = await supabase.from('profiles').select('permission').eq('id', user.id).single()
  if (!['admin', 'super_admin'].includes(me?.permission ?? '')) redirect('/benevoles/dashboard')

  const admin = createAdminClient()

  const [
    { data: prayerRequests },
    { data: recentNotes },
    { data: profiles },
  ] = await Promise.all([
    admin
      .from('prayer_requests')
      .select('id, subject, notes, status, person_name, created_at, profile_id, profiles!prayer_requests_profile_id_fkey(first_name, last_name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false }),
    admin
      .from('pastoral_notes')
      .select('id, note_date, type, notes, profile_id, profiles!pastoral_notes_profile_id_fkey(first_name, last_name)')
      .order('note_date', { ascending: false })
      .limit(10),
    admin
      .from('profiles')
      .select('id, first_name, last_name')
      .order('first_name'),
  ])

  const typeInfo: Record<string, { Icon: React.ComponentType<{ className?: string }>; label: string }> = {
    visit:   { Icon: IconHome,     label: 'Visite' },
    call:    { Icon: IconPhone,    label: 'Appel' },
    message: { Icon: IconChat,     label: 'Message' },
    other:   { Icon: IconDocument, label: 'Autre' },
  }

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-4 md:px-6 py-4 flex items-center gap-4">
        <h1 className="font-display text-2xl text-dark font-light">Pastorale</h1>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-6">

        <div className="grid md:grid-cols-2 gap-6">

          {/* ── Sujets de prière ── */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-dark font-light flex items-center gap-2">
                Sujets de prière
                {prayerRequests && prayerRequests.length > 0 && (
                  <span className="ml-2 text-sm bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-sans">{prayerRequests.length}</span>
                )}
              </h2>
            </div>

            {/* Sync Google Forms + ajout manuel */}
            <div className="flex gap-2 flex-wrap">
              <SheetSync />
            </div>
            <PrayerRequestForm profiles={(profiles ?? []) as any} />

            {/* Liste */}
            <div className="space-y-2">
              {prayerRequests?.map(pr => {
                const profile = pr.profiles as any
                const name = profile ? `${profile.first_name} ${profile.last_name}` : (pr.person_name ?? 'Anonyme')
                return (
                  <div key={pr.id} className="bg-white rounded-xl border border-teal/20 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-sans text-xs text-teal/60 uppercase tracking-wide mb-0.5">{name}</p>
                        <p className="font-sans text-sm text-dark font-medium">{pr.subject}</p>
                        {pr.notes && <p className="font-sans text-xs text-dark/50 mt-1">{pr.notes}</p>}
                        <p className="font-sans text-[10px] text-dark/30 mt-1">
                          {new Date(pr.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <form action={async () => {
                          'use server'
                          const { resolvePrayerRequest } = await import('./actions')
                          await resolvePrayerRequest(pr.id)
                        }}>
                          <button type="submit" aria-label="Marquer exaucé" title="Marquer exaucé" className="text-xs text-green-500 hover:text-green-600 font-sans px-2 py-1 rounded hover:bg-green-50 transition-colors">✓</button>
                        </form>
                        <form action={async () => {
                          'use server'
                          const { deletePrayerRequest } = await import('./actions')
                          await deletePrayerRequest(pr.id)
                        }}>
                          <button type="submit" aria-label="Supprimer" className="text-xs text-dark/25 hover:text-red-400 font-sans px-2 py-1 rounded hover:bg-red-50 transition-colors">×</button>
                        </form>
                      </div>
                    </div>
                    {pr.profile_id && (
                      <Link href={`/benevoles/admin/pastorale/${pr.profile_id}`} className="font-sans text-[10px] text-teal/50 hover:text-teal mt-1 inline-block">
                        Voir la fiche →
                      </Link>
                    )}
                  </div>
                )
              })}
              {prayerRequests?.length === 0 && (
                <p className="font-sans text-xs text-dark/30 italic px-1">Aucun sujet de prière actif.</p>
              )}
            </div>
          </section>

          {/* ── Activité pastorale récente ── */}
          <section className="space-y-4">
            <h2 className="font-display text-lg text-dark font-light">Activité récente</h2>
            <div className="space-y-2">
              {recentNotes?.map(n => {
                const profile = n.profiles as any
                const name = profile ? `${profile.first_name} ${profile.last_name}` : '—'
                return (
                  <Link
                    key={n.id}
                    href={`/benevoles/admin/pastorale/${n.profile_id}`}
                    className="block bg-white rounded-xl border border-teal/20 px-4 py-3 hover:border-teal/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-teal/50 shrink-0 mt-0.5">
                        {(() => { const t = typeInfo[n.type]; return t ? <t.Icon className="w-4 h-4" /> : null })()}
                      </span>
                      <div className="min-w-0">
                        <p className="font-sans text-xs text-teal/60 uppercase tracking-wide mb-0.5">{name}</p>
                        <p className="font-sans text-sm text-dark leading-snug line-clamp-2">{n.notes}</p>
                        <p className="font-sans text-[10px] text-dark/50 mt-1">
                          {typeInfo[n.type]?.label ?? n.type} · {new Date(n.note_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
              {recentNotes?.length === 0 && (
                <p className="font-sans text-xs text-dark/30 italic px-1">Aucune activité récente.</p>
              )}
            </div>
          </section>
        </div>

        {/* ── Liste des membres ── */}
        <section className="bg-white rounded-2xl border border-teal/20 overflow-hidden">
          <div className="px-5 py-3 border-b border-teal/10 bg-teal-50/50">
            <p className="font-sans text-xs text-dark/50 uppercase tracking-widest font-medium">Fiches membres</p>
          </div>
          <div className="divide-y divide-teal/10">
            {profiles?.map(p => (
              <Link
                key={p.id}
                href={`/benevoles/admin/pastorale/${p.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-teal/5 transition-colors group"
              >
                <p className="font-sans text-sm text-dark">{p.first_name} {p.last_name}</p>
                <span className="font-sans text-xs text-teal/40 group-hover:text-teal transition-colors">Fiche →</span>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </div>
  )
}
