'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { adminUpdateEntrepreneur } from '../../actions'
import { LINK_TYPES, SECTORS, type Entrepreneur } from '../../constants'

type Link_ = { type: string; url: string }
const LANGUAGE_OPTIONS = ['Français', 'English', 'Español', 'Português', 'Arabe', 'Autre']

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export function AdminEditForm({ entrepreneur: e }: { entrepreneur: Entrepreneur }) {
  const [state, action, isPending] = useActionState(adminUpdateEntrepreneur, null)

  const [preview, setPreview] = useState<string | null>(e.photo_url ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handlePhoto(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = r => {
      const src = r.target?.result as string
      setPreview(src)
      if (file.size > 500_000) {
        const img = new Image()
        img.onload = () => {
          const maxW = 800
          const scale = Math.min(1, maxW / img.width)
          const canvas = document.createElement('canvas')
          canvas.width  = img.width  * scale
          canvas.height = img.height * scale
          canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(blob => {
            if (!blob || !fileRef.current) return
            const compressed = new File([blob], file.name, { type: 'image/jpeg' })
            const dt = new DataTransfer()
            dt.items.add(compressed)
            fileRef.current.files = dt.files
          }, 'image/jpeg', 0.82)
        }
        img.src = src
      }
    }
    reader.readAsDataURL(file)
  }

  const [firstName, setFirstName] = useState(e.first_name)
  const [lastName,  setLastName]  = useState(e.last_name)

  const initialLinks: Link_[] = Array.isArray(e.links) && e.links.length > 0
    ? (e.links as Link_[])
    : [{ type: 'website', url: '' }]
  const [links, setLinks] = useState<Link_[]>(initialLinks)

  function addLink()    { setLinks(p => [...p, { type: 'website', url: '' }]) }
  function removeLink(i: number) { setLinks(p => p.filter((_, idx) => idx !== i)) }
  function updateLink(i: number, field: 'type' | 'url', val: string) {
    setLinks(p => p.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
  }

  if (state?.success) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-teal/15 flex items-center justify-center mx-auto text-3xl">✓</div>
          <h1 className="font-display text-3xl text-dark font-light">Fiche mise à jour</h1>
          <Link href="/annuaire/admin"
            className="inline-block font-sans text-sm text-teal underline underline-offset-2">
            ← Retour à l'admin
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="bg-gradient-to-br from-dark to-dark/80 px-4 pt-12 pb-8 text-white">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <Link href="/annuaire/admin"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-sans text-sm">
            ←
          </Link>
          <div>
            <p className="font-sans text-[10px] uppercase tracking-widest text-white/50">Admin · Annuaire</p>
            <h1 className="font-display text-2xl font-light">Modifier la fiche</h1>
            <p className="font-sans text-xs text-white/50 mt-0.5">{e.first_name} {e.last_name} · {e.company_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <form action={action} className="space-y-5">
          <input type="hidden" name="id" value={e.id} />
          <input type="hidden" name="links" value={JSON.stringify(links)} />

          {/* Card : Identité */}
          <div className="bg-white rounded-2xl border border-dark/8 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-dark/4 border-b border-dark/6">
              <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Identité</p>
            </div>
            <div className="p-5 space-y-4">

              {/* Photo */}
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="relative w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center shrink-0 overflow-hidden border-2 border-dashed border-teal/30 hover:border-teal/60 transition-colors group">
                  {preview
                    ? <img src={preview} alt="" className="w-full h-full object-cover" />
                    : <span className="font-sans text-base font-bold text-teal">{initials(firstName, lastName)}</span>
                  }
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-[10px] font-sans">Changer</span>
                  </div>
                </button>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="font-sans text-xs text-teal underline underline-offset-2">
                  Changer la photo
                </button>
                <input ref={fileRef} type="file" name="photo" accept="image/*" className="hidden" onChange={handlePhoto} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Prénom *</label>
                  <input name="first_name" required value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                </div>
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Nom *</label>
                  <input name="last_name" required value={lastName} onChange={e => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Email *</label>
                  <input name="contact_email" type="email" required defaultValue={e.contact_email ?? ''}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                </div>
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Téléphone</label>
                  <input name="contact_phone" type="tel" defaultValue={e.contact_phone ?? ''}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                </div>
              </div>

              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">Langues</label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map(lang => (
                    <label key={lang} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" name="languages" value={lang}
                        defaultChecked={e.languages?.includes(lang)}
                        className="w-3.5 h-3.5 rounded accent-teal" />
                      <span className="font-sans text-sm text-dark">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card : Entreprise */}
          <div className="bg-white rounded-2xl border border-dark/8 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-dark/4 border-b border-dark/6">
              <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Entreprise</p>
            </div>
            <div className="p-5 space-y-4">

              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Nom *</label>
                <input name="company_name" required defaultValue={e.company_name}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
              </div>

              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">Statut *</label>
                <div className="space-y-2">
                  {[
                    { value: 'active',    label: 'En activité' },
                    { value: 'launching', label: 'En cours de création' },
                    { value: 'project',   label: 'Projet / réflexion' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-dark/10 hover:border-dark/20 has-[:checked]:border-teal has-[:checked]:bg-teal/5">
                      <input type="radio" name="status" value={opt.value} required
                        defaultChecked={e.status === opt.value}
                        className="w-4 h-4 accent-teal shrink-0" />
                      <span className="font-sans text-sm font-semibold text-dark">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Secteur *</label>
                <select name="sector" required defaultValue={e.sector ?? ''}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20">
                  <option value="">— Choisir —</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Présentation *</label>
                <textarea name="description" required rows={4} defaultValue={e.description ?? ''}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20 resize-none" />
              </div>

              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">Clientèle *</label>
                <div className="flex gap-2">
                  {[
                    { value: 'b2b', label: 'B2B' }, { value: 'b2c', label: 'B2C' }, { value: 'both', label: 'B2B & B2C' },
                  ].map(opt => (
                    <label key={opt.value} className="flex-1 cursor-pointer">
                      <input type="radio" name="target" value={opt.value} className="sr-only peer" defaultChecked={e.target === opt.value} />
                      <div className="border-2 border-dark/10 rounded-xl px-3 py-2.5 text-center transition-colors peer-checked:border-teal peer-checked:bg-teal/5">
                        <p className="font-sans text-sm font-semibold text-dark">{opt.label}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">Zone géo *</label>
                <div className="flex gap-2">
                  {[
                    { value: 'local', label: 'Local' }, { value: 'national', label: 'National' }, { value: 'international', label: 'International' },
                  ].map(opt => (
                    <label key={opt.value} className="flex-1 cursor-pointer">
                      <input type="radio" name="geo" value={opt.value} className="sr-only peer" defaultChecked={e.geo === opt.value} />
                      <div className="border-2 border-dark/10 rounded-xl px-3 py-2.5 text-center transition-colors peer-checked:border-teal peer-checked:bg-teal/5">
                        <p className="font-sans text-xs font-semibold text-dark">{opt.label}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Liens */}
          <div className="bg-white rounded-2xl border border-dark/8 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-dark/4 border-b border-dark/6 flex items-center justify-between">
              <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Liens</p>
              <p className="font-sans text-[10px] text-dark/30">Optionnel</p>
            </div>
            <div className="p-5 space-y-3">
              {links.map((link, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={link.type} onChange={ev => updateLink(i, 'type', ev.target.value)}
                    className="shrink-0 px-2.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20">
                    {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <input type="url" value={link.url} onChange={ev => updateLink(i, 'url', ev.target.value)}
                    placeholder="https://…"
                    className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                  <button type="button" onClick={() => removeLink(i)}
                    className="shrink-0 w-9 h-9 rounded-full border border-dark/10 text-dark/30 hover:text-red-400 hover:border-red-200 flex items-center justify-center text-lg transition-colors">
                    ×
                  </button>
                </div>
              ))}
              <button type="button" onClick={addLink}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-dark/15 text-dark/40 hover:text-dark/60 font-sans text-sm transition-colors">
                + Ajouter un lien
              </button>
            </div>
          </div>

          {state?.error && (
            <p className="font-sans text-sm text-red-500 text-center bg-red-50 rounded-xl px-4 py-3">{state.error}</p>
          )}

          <button type="submit" disabled={isPending}
            className="w-full py-4 rounded-2xl bg-teal text-white font-sans text-sm font-semibold shadow-lg shadow-teal/20 disabled:opacity-60 transition-opacity">
            {isPending ? 'Enregistrement…' : 'Enregistrer les modifications →'}
          </button>
        </form>
      </div>
    </div>
  )
}
