import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { approveEntrepreneur, hideEntrepreneur } from '../actions'
import { DeleteButton } from './DeleteButton'
import { ResendButton } from './ResendButton'
import { LINK_TYPES, TARGET_LABELS, GEO_LABELS, STATUS_LABELS, STATUS_COLORS, type Entrepreneur } from '../constants'

export const metadata: Metadata = {
  title: 'Admin Annuaire — Église La Rencontre',
  robots: { index: false, follow: false },
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: 'green' | 'orange' | 'gray' }) {
  const cls = {
    green:  'bg-teal/10 text-teal',
    orange: 'bg-coral/10 text-coral',
    gray:   'bg-dark/8 text-dark/50',
  }[color]
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full font-sans text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  )
}

function EntrepreneurRow({ e, pending }: { e: Entrepreneur; pending: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border p-5 space-y-3 ${pending ? 'border-coral/30 shadow-sm shadow-coral/10' : 'border-dark/8'}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        {e.photo_url ? (
          <img src={e.photo_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0 border border-dark/8" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center shrink-0 font-sans text-base font-bold text-teal">
            {e.first_name[0]}{e.last_name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-sans text-base font-semibold text-dark">
              {e.first_name} {e.last_name}
            </p>
            {pending
              ? <Badge color="orange">En attente</Badge>
              : <Badge color="green">Publié</Badge>
            }
          </div>
          <p className="font-sans text-sm text-teal font-medium">{e.company_name}</p>
          <p className="font-sans text-xs text-dark/40 mt-0.5">
            Soumis le {new Date(e.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Détails */}
      <div className="flex flex-wrap gap-1.5">
        {e.status && (
          <span className={`inline-block px-2 py-0.5 rounded-full font-sans text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[e.status]}`}>
            {STATUS_LABELS[e.status]}
          </span>
        )}
        {e.sector && <Badge>{e.sector}</Badge>}
        {e.target && <Badge>{TARGET_LABELS[e.target]}</Badge>}
        {e.geo    && <Badge>{GEO_LABELS[e.geo]}</Badge>}
        {e.languages?.map(l => <Badge key={l}>{l}</Badge>)}
      </div>

      {e.description && (
        <p className="font-sans text-sm text-dark/60 leading-relaxed line-clamp-3 bg-sand rounded-xl px-3 py-2">
          {e.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-xs font-sans text-dark/40">
        {e.contact_email && <span>✉ {e.contact_email}</span>}
        {e.contact_phone && <span>📞 {e.contact_phone}</span>}
        {(e.links as { type: string; url: string }[])?.map((l, i) => {
          const meta = LINK_TYPES.find(t => t.value === l.type)
          return (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="text-teal underline">
              {meta?.label ?? l.type}
            </a>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-dark/6">
        {pending ? (
          <form action={approveEntrepreneur}>
            <input type="hidden" name="id" value={e.id} />
            <button type="submit" className="px-4 py-2 rounded-xl bg-teal text-white font-sans text-xs font-semibold hover:bg-teal-dark transition-colors">
              ✓ Publier
            </button>
          </form>
        ) : (
          <form action={hideEntrepreneur}>
            <input type="hidden" name="id" value={e.id} />
            <button type="submit" className="px-4 py-2 rounded-xl border border-dark/15 text-dark/50 font-sans text-xs font-medium hover:text-dark transition-colors">
              Masquer
            </button>
          </form>
        )}
        <Link
          href={`/annuaire/admin/${e.id}`}
          className="px-3 py-2 rounded-xl border border-dark/15 text-dark/50 font-sans text-xs font-medium hover:text-dark hover:border-dark/30 transition-colors"
        >
          ✏️ Modifier
        </Link>
        {!pending && <ResendButton id={e.id} />}
        <DeleteButton id={e.id} />
      </div>
    </div>
  )
}

export default async function AnnuaireAdminPage() {
  // Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/benevoles/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('permission')
    .eq('id', user.id)
    .single()

  if (!['admin', 'super_admin'].includes(profile?.permission ?? '')) {
    redirect('/benevoles/dashboard')
  }

  // Data
  const admin = createAdminClient()
  const { data: all } = await admin
    .from('entrepreneurs')
    .select('*')
    .order('created_at', { ascending: false })

  const pending   = (all ?? []).filter(e => !e.visible) as Entrepreneur[]
  const published = (all ?? []).filter(e => e.visible)  as Entrepreneur[]

  return (
    <div className="min-h-screen bg-sand">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal to-teal-dark px-4 pt-12 pb-8 text-white">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-sans text-[10px] uppercase tracking-widest text-white/60">Admin</p>
              <h1 className="font-display text-3xl font-light mt-0.5">Annuaire entrepreneurs</h1>
            </div>
            <Link
              href="/annuaire"
              className="px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl font-sans text-xs font-semibold text-white transition-colors"
            >
              Voir l'annuaire →
            </Link>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="font-display text-2xl font-light">{pending.length}</p>
              <p className="font-sans text-[10px] text-white/60">En attente</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="font-display text-2xl font-light">{published.length}</p>
              <p className="font-sans text-[10px] text-white/60">Publiés</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* En attente */}
        {pending.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-sans text-xs uppercase tracking-widest font-semibold text-dark/40">
              En attente de validation ({pending.length})
            </h2>
            {pending.map(e => <EntrepreneurRow key={e.id} e={e} pending />)}
          </section>
        )}

        {pending.length === 0 && (
          <div className="text-center py-8 bg-white rounded-2xl border border-dark/8">
            <p className="font-sans text-dark/30 text-sm">Aucune fiche en attente</p>
          </div>
        )}

        {/* Publiés */}
        {published.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-sans text-xs uppercase tracking-widest font-semibold text-dark/40">
              Publiés ({published.length})
            </h2>
            {published.map(e => <EntrepreneurRow key={e.id} e={e} pending={false} />)}
          </section>
        )}
      </div>
    </div>
  )
}
