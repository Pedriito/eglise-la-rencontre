'use client'

import { useState, useTransition } from 'react'
import { saveChurchSettings } from './actions'
import type { ChurchSettings } from '@/lib/churchSettings'

export default function SiteSettingsForm({ initial }: { initial: ChurchSettings }) {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const res = await saveChurchSettings(fd)
      if (res.ok) setSaved(true)
      else setError(res.error ?? 'Erreur inconnue')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Infos générales */}
      <div className="bg-white rounded-2xl border border-teal/20 p-6 space-y-4">
        <p className="font-sans text-xs text-dark/40 uppercase tracking-widest">Infos générales</p>
        <Field label="Nom de l'église" name="church_name" defaultValue={initial.church_name} />
        <Field label="Phrase d'accroche (tagline)" name="tagline" defaultValue={initial.tagline} />
        <Field label="Noms des pasteurs" name="pastors_names" defaultValue={initial.pastors_names} />
      </div>

      {/* Adresse */}
      <div className="bg-white rounded-2xl border border-teal/20 p-6 space-y-4">
        <p className="font-sans text-xs text-dark/40 uppercase tracking-widest">Adresse</p>
        <Field label="Rue" name="address_street" defaultValue={initial.address_street} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Code postal" name="address_zip" defaultValue={initial.address_zip} />
          <Field label="Ville" name="address_city" defaultValue={initial.address_city} />
        </div>
        <Field label="Département" name="address_dept" defaultValue={initial.address_dept} />
        <Field label="Lien Google Maps" name="maps_url" defaultValue={initial.maps_url} type="url" />
      </div>

      {/* Contact & réseaux */}
      <div className="bg-white rounded-2xl border border-teal/20 p-6 space-y-4">
        <p className="font-sans text-xs text-dark/40 uppercase tracking-widest">Contact & réseaux</p>
        <Field label="Email de contact" name="email" defaultValue={initial.email} type="email" />
        <Field label="URL YouTube" name="youtube_url" defaultValue={initial.youtube_url} type="url" />
      </div>

      {/* Dons */}
      <div className="bg-white rounded-2xl border border-teal/20 p-6 space-y-4">
        <p className="font-sans text-xs text-dark/40 uppercase tracking-widest">Dons</p>
        <Field
          label="URL widget HelloAsso"
          name="helloasso_widget_url"
          defaultValue={initial.helloasso_widget_url}
          type="url"
          hint="Terminer par /widget (ex: …/formulaires/5/widget)"
        />
        <Field
          label="Taux de déduction fiscale (%)"
          name="tax_deduction_pct"
          defaultValue={String(initial.tax_deduction_pct)}
          type="number"
        />
      </div>

      {/* Enregistrer */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-xl bg-teal text-white font-sans text-sm font-medium hover:bg-teal/90 disabled:opacity-40 transition-colors"
        >
          {isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {saved && <p className="font-sans text-sm text-green-600">✓ Modifications enregistrées</p>}
        {error && <p className="font-sans text-sm text-red-500">{error}</p>}
      </div>
    </form>
  )
}

function Field({
  label, name, defaultValue, type = 'text', hint,
}: {
  label: string; name: string; defaultValue: string; type?: string; hint?: string
}) {
  return (
    <div className="space-y-1">
      <label className="font-sans text-xs text-dark/50">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete="off"
        className="w-full border border-teal/20 rounded-lg px-3 py-2 text-sm font-sans text-dark placeholder:text-dark/30 focus:outline-none focus:border-teal/50"
      />
      {hint && <p className="font-sans text-[11px] text-dark/35">{hint}</p>}
    </div>
  )
}
