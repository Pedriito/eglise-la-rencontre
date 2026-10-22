import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LINK_TYPES, TARGET_LABELS, GEO_LABELS, STATUS_LABELS, STATUS_COLORS, parseSectors, type Entrepreneur } from './constants'

export const metadata: Metadata = {
  title: 'Annuaire des entrepreneurs — Église La Rencontre',
  robots: { index: false, follow: false },
}

function Avatar({ entrepreneur }: { entrepreneur: Entrepreneur }) {
  const { first_name, last_name, photo_url } = entrepreneur
  const ini = `${first_name[0] ?? ''}${last_name[0] ?? ''}`.toUpperCase()
  if (photo_url) {
    return (
      <img
        src={photo_url}
        alt={`${first_name} ${last_name}`}
        className="w-14 h-14 rounded-full object-cover shrink-0 border border-dark/8"
      />
    )
  }
  // Couleur déterministe basée sur le nom
  const hue = (first_name.charCodeAt(0) + last_name.charCodeAt(0)) % 360
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 font-sans text-lg font-bold text-white"
      style={{ background: `hsl(${hue}, 45%, 55%)` }}
    >
      {ini}
    </div>
  )
}

function LinkButton({ link }: { link: { type: string; url: string } }) {
  const meta = LINK_TYPES.find(t => t.value === link.type) ?? LINK_TYPES[LINK_TYPES.length - 1]
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={meta.label}
      className="w-7 h-7 rounded-full flex items-center justify-center font-sans text-[10px] font-bold text-white shrink-0 transition-opacity hover:opacity-80"
      style={{ backgroundColor: meta.color }}
    >
      {meta.abbr}
    </a>
  )
}

function EntrepreneurCard({ e }: { e: Entrepreneur }) {
  return (
    <div id={e.id} className="bg-white rounded-2xl border border-dark/8 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar entrepreneur={e} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-dark font-medium leading-tight truncate">
            {e.first_name} {e.last_name}
          </p>
          <p className="font-sans text-sm text-teal font-semibold truncate mt-0.5">{e.company_name}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {e.status && e.status !== 'active' && (
              <span className={`px-2 py-0.5 rounded-full font-sans text-[10px] font-semibold ${STATUS_COLORS[e.status]}`}>
                {STATUS_LABELS[e.status]}
              </span>
            )}
            {e.sector && parseSectors(e.sector).map(s => (
              <span key={s} className="px-2 py-0.5 rounded-full bg-teal/10 text-teal font-sans text-[10px] font-semibold uppercase tracking-wide">
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {e.target && (
          <span className="px-2.5 py-1 rounded-full border border-dark/10 font-sans text-[10px] text-dark/60 font-medium">
            {TARGET_LABELS[e.target]}
          </span>
        )}
        {e.geo && (
          <span className="px-2.5 py-1 rounded-full border border-dark/10 font-sans text-[10px] text-dark/60 font-medium">
            {GEO_LABELS[e.geo]}
          </span>
        )}
        {e.languages?.map(lang => (
          <span key={lang} className="px-2.5 py-1 rounded-full border border-dark/10 font-sans text-[10px] text-dark/60">
            {lang}
          </span>
        ))}
      </div>

      {/* Description */}
      {e.description && (
        <p className="font-sans text-sm text-dark/65 leading-relaxed line-clamp-3">{e.description}</p>
      )}

      {/* Footer : liens + contact */}
      <div className="flex items-center justify-between gap-3 mt-auto pt-2 border-t border-dark/6">
        <div className="flex gap-1.5 flex-wrap">
          {(e.links as { type: string; url: string }[])?.map((link, i) => (
            <LinkButton key={i} link={link} />
          ))}
        </div>
        {e.contact_email && (
          <a
            href={`mailto:${e.contact_email}`}
            className="shrink-0 font-sans text-xs font-medium text-teal hover:text-teal-dark transition-colors"
          >
            Contacter →
          </a>
        )}
      </div>
    </div>
  )
}

export default async function AnnuairePage({
  searchParams,
}: {
  searchParams: Promise<{ secteur?: string; cible?: string }>
}) {
  const { secteur, cible } = await searchParams

  const supabase = await createClient()

  let query = supabase
    .from('entrepreneurs')
    .select('*')
    .eq('visible', true)
    .order('created_at', { ascending: false })

  if (secteur) query = query.eq('sector', secteur)
  if (cible)   query = query.eq('target', cible)

  const { data: entrepreneurs } = await query
  const list = (entrepreneurs ?? []) as Entrepreneur[]

  // Secteurs présents dans la liste complète (pour les filtres)
  const { data: allForFilters } = await supabase
    .from('entrepreneurs')
    .select('sector, target')
    .eq('visible', true)
  const sectors = [...new Set(
    (allForFilters ?? []).flatMap(e => parseSectors(e.sector ?? null))
  )].sort() as string[]

  return (
    <div className="min-h-screen bg-sand">

      {/* Hero */}
      <div className="bg-gradient-to-br from-teal to-teal-dark px-4 pt-14 pb-10 text-white text-center">
        <p className="font-sans text-xs uppercase tracking-widest text-white/60 mb-3">Église La Rencontre</p>
        <h1 className="font-display text-4xl font-light">Annuaire des entrepreneurs</h1>
        <p className="font-sans text-sm text-white/70 mt-2">
          {list.length} entreprise{list.length !== 1 ? 's' : ''} référencée{list.length !== 1 ? 's' : ''}
        </p>
        <Link
          href="/annuaire/rejoindre"
          className="inline-block mt-5 px-5 py-2.5 bg-white/15 hover:bg-white/25 rounded-full font-sans text-sm font-semibold text-white transition-colors"
        >
          + Rejoindre l'annuaire
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Filtres */}
        {sectors.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <Link
              href="/annuaire"
              className={`px-3.5 py-1.5 rounded-full font-sans text-sm font-medium transition-colors ${
                !secteur && !cible ? 'bg-dark text-white' : 'bg-white text-dark/60 border border-dark/10 hover:border-dark/30'
              }`}
            >
              Tous
            </Link>
            {[
              { label: 'B2B',       href: '/annuaire?cible=b2b'  },
              { label: 'B2C',       href: '/annuaire?cible=b2c'  },
              { label: 'B2B & B2C', href: '/annuaire?cible=both' },
            ].map(f => (
              <Link
                key={f.href}
                href={f.href}
                className={`px-3.5 py-1.5 rounded-full font-sans text-sm font-medium transition-colors ${
                  cible && f.href.includes(cible) ? 'bg-dark text-white' : 'bg-white text-dark/60 border border-dark/10 hover:border-dark/30'
                }`}
              >
                {f.label}
              </Link>
            ))}
            {sectors.map(s => (
              <Link
                key={s}
                href={`/annuaire?secteur=${encodeURIComponent(s)}`}
                className={`px-3.5 py-1.5 rounded-full font-sans text-sm font-medium transition-colors ${
                  secteur === s ? 'bg-teal text-white' : 'bg-white text-dark/60 border border-dark/10 hover:border-dark/30'
                }`}
              >
                {s}
              </Link>
            ))}
          </div>
        )}

        {/* Grille */}
        {list.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-sans text-dark/30 text-sm">Aucun entrepreneur pour ces critères.</p>
            <Link href="/annuaire" className="mt-2 inline-block font-sans text-xs text-teal underline">
              Voir tous
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map(e => <EntrepreneurCard key={e.id} e={e} />)}
          </div>
        )}

      </div>
    </div>
  )
}
