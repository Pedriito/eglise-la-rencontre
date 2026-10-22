'use client'

import { useActionState, useRef, useState } from 'react'
import { submitEntrepreneur } from '../actions'
import { LINK_TYPES, SECTORS } from '../constants'
import { PhotoCropModal } from '../components/PhotoCropModal'

type Link = { type: string; url: string }

const LANGUAGE_OPTIONS = ['Français', 'English', 'Español', 'Português', 'Arabe', 'Autre']

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export function EntrepreneurForm() {
  const [state, action, isPending] = useActionState(submitEntrepreneur, null)

  // Photo
  const [preview, setPreview]   = useState<string | null>(null)
  const [cropSrc, setCropSrc]   = useState<string | null>(null)
  const [origName, setOrigName] = useState('photo.jpg')
  const fileRef = useRef<HTMLInputElement>(null)

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOrigName(file.name)
    const reader = new FileReader()
    reader.onload = ev => setCropSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleCropConfirm(blob: Blob, dataUrl: string) {
    setPreview(dataUrl)
    setCropSrc(null)
    if (!fileRef.current) return
    const croppedFile = new File([blob], origName, { type: 'image/jpeg' })
    const dt = new DataTransfer()
    dt.items.add(croppedFile)
    fileRef.current.files = dt.files
  }

  // Prénom/Nom pour les initiales d'aperçu
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')

  // Secteur
  const [multiSector, setMultiSector]       = useState(false)
  const [selectedSectors, setSelectedSectors] = useState<string[]>([])
  function toggleSector(s: string) {
    setSelectedSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  // Liens dynamiques
  const [links, setLinks] = useState<Link[]>([{ type: 'website', url: '' }])
  function addLink()    { setLinks(prev => [...prev, { type: 'website', url: '' }]) }
  function removeLink(i: number) { setLinks(prev => prev.filter((_, idx) => idx !== i)) }
  function updateLink(i: number, field: 'type' | 'url', value: string) {
    setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  if (state?.success) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-teal/15 flex items-center justify-center mx-auto text-3xl">✓</div>
          <h1 className="font-display text-3xl text-dark font-light">Merci !</h1>
          <p className="font-sans text-base text-dark/60">
            Ta fiche a bien été reçue. Elle sera publiée dans l'annuaire après validation.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block font-sans text-sm text-teal underline underline-offset-2"
          >
            Soumettre une autre fiche
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Modal de recadrage */}
      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <div className="min-h-screen bg-sand">

        {/* Hero */}
        <div className="bg-gradient-to-br from-teal to-teal-dark px-4 pt-14 pb-12 text-white text-center">
          <p className="font-sans text-xs uppercase tracking-widest text-white/60 mb-3">Église La Rencontre</p>
          <h1 className="font-display text-4xl font-light leading-tight">Annuaire des entrepreneurs</h1>
          <p className="font-sans text-sm text-white/70 mt-3 max-w-sm mx-auto">
            Remplis ce formulaire pour rejoindre l'annuaire et te faire connaître auprès des membres de l'église.
          </p>
        </div>

        {/* Formulaire */}
        <div className="max-w-xl mx-auto px-4 py-8">
          <form action={action} className="space-y-5">

            <input type="hidden" name="links" value={JSON.stringify(links)} />

            {/* Card : Vous */}
            <div className="bg-white rounded-2xl border border-dark/8 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-teal/5 border-b border-dark/6">
                <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Vous</p>
              </div>
              <div className="p-5 space-y-4">

                {/* Photo */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="relative w-20 h-20 rounded-full bg-teal/10 flex items-center justify-center shrink-0 overflow-hidden border-2 border-dashed border-teal/30 hover:border-teal/60 transition-colors group"
                  >
                    {preview ? (
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        {firstName || lastName
                          ? <span className="font-sans text-xl font-bold text-teal">{initials(firstName, lastName)}</span>
                          : <span className="font-sans text-2xl text-teal/40">+</span>
                        }
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-sans font-medium">Changer</span>
                    </div>
                  </button>
                  <div>
                    <p className="font-sans text-sm font-medium text-dark">Photo de profil</p>
                    <p className="font-sans text-xs text-dark/40 mt-0.5">Optionnel · JPG, PNG, max 5 Mo</p>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="mt-1.5 font-sans text-xs text-teal underline underline-offset-2"
                    >
                      Choisir une photo
                    </button>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    name="photo"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhoto}
                  />
                </div>

                {/* Prénom + Nom */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">
                      Prénom <span className="text-coral">*</span>
                    </label>
                    <input name="first_name" required value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                  </div>
                  <div>
                    <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">
                      Nom <span className="text-coral">*</span>
                    </label>
                    <input name="last_name" required value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                  </div>
                </div>

                {/* Email + Téléphone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">
                      Email de contact <span className="text-coral">*</span>
                    </label>
                    <input name="contact_email" type="email" required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20"
                      placeholder="nom@exemple.fr" />
                  </div>
                  <div>
                    <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">
                      Téléphone <span className="text-coral">*</span>
                    </label>
                    <input name="contact_phone" type="tel" required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20"
                      placeholder="06 xx xx xx xx" />
                  </div>
                </div>

                {/* Langues */}
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">Langues parlées</label>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGE_OPTIONS.map(lang => (
                      <label key={lang} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" name="languages" value={lang} className="w-3.5 h-3.5 rounded accent-teal" />
                        <span className="font-sans text-sm text-dark">{lang}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card : Votre entreprise */}
            <div className="bg-white rounded-2xl border border-dark/8 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-teal/5 border-b border-dark/6">
                <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Votre entreprise</p>
              </div>
              <div className="p-5 space-y-4">

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">
                    Nom de l'entreprise / micro-entreprise <span className="text-coral">*</span>
                  </label>
                  <input name="company_name" required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20"
                    placeholder="Ex : Studio Créatif, Plomberie Dupont…" />
                </div>

                {/* Statut */}
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">
                    Statut <span className="text-coral">*</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'active',    label: 'En activité',          desc: 'Mon entreprise existe et fonctionne' },
                      { value: 'launching', label: 'En cours de création', desc: 'Je suis en train de lancer mon activité' },
                      { value: 'project',   label: 'Projet / réflexion',   desc: 'Je travaille sur un projet d\'entreprise' },
                    ].map(opt => (
                      <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-dark/10 hover:border-dark/20 transition-colors has-[:checked]:border-teal has-[:checked]:bg-teal/5">
                        <input type="radio" name="status" value={opt.value} required className="w-4 h-4 accent-teal shrink-0" />
                        <div>
                          <p className="font-sans text-sm font-semibold text-dark">{opt.label}</p>
                          <p className="font-sans text-[10px] text-dark/40">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Secteur */}
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">
                    Secteur d'activité <span className="text-coral">*</span>
                  </label>

                  {/* Toggle multi-activités */}
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-dark/10 hover:border-dark/20 transition-colors has-[:checked]:border-teal has-[:checked]:bg-teal/5 mb-3">
                    <input type="checkbox" checked={multiSector}
                      onChange={e => { setMultiSector(e.target.checked); setSelectedSectors([]) }}
                      className="w-4 h-4 accent-teal shrink-0" />
                    <div>
                      <p className="font-sans text-sm font-semibold text-dark">Multi-activités</p>
                      <p className="font-sans text-[10px] text-dark/40">Mon activité couvre plusieurs secteurs</p>
                    </div>
                  </label>

                  {multiSector ? (
                    <>
                      <input type="hidden" name="sector" value={JSON.stringify(selectedSectors)} />
                      <div className="flex flex-wrap gap-2">
                        {SECTORS.map(s => (
                          <label key={s} className="flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-full border border-dark/10 has-[:checked]:border-teal has-[:checked]:bg-teal/5 transition-colors">
                            <input type="checkbox" checked={selectedSectors.includes(s)}
                              onChange={() => toggleSector(s)}
                              className="w-3.5 h-3.5 accent-teal" />
                            <span className="font-sans text-sm text-dark">{s}</span>
                          </label>
                        ))}
                      </div>
                      {selectedSectors.length === 0 && (
                        <p className="font-sans text-xs text-coral mt-2">Sélectionne au moins un secteur</p>
                      )}
                    </>
                  ) : (
                    <select name="sector" required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20">
                      <option value="">— Choisir —</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">
                    Présentation <span className="text-coral">*</span>
                  </label>
                  <textarea name="description" required rows={4}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20 resize-none"
                    placeholder="Décris ton activité, les services proposés, ce qui te différencie…" />
                </div>

                {/* Cible */}
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">
                    Clientèle <span className="text-coral">*</span>
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'b2b',  label: 'B2B',       desc: 'Professionnels' },
                      { value: 'b2c',  label: 'B2C',       desc: 'Particuliers'  },
                      { value: 'both', label: 'B2B & B2C', desc: 'Les deux'      },
                    ].map(opt => (
                      <label key={opt.value} className="flex-1 cursor-pointer">
                        <input type="radio" name="target" value={opt.value} className="sr-only peer" />
                        <div className="border-2 border-dark/10 rounded-xl px-3 py-2.5 text-center transition-colors peer-checked:border-teal peer-checked:bg-teal/5">
                          <p className="font-sans text-sm font-semibold text-dark">{opt.label}</p>
                          <p className="font-sans text-[10px] text-dark/40">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Zone géographique */}
                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">
                    Zone géographique <span className="text-coral">*</span>
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: 'local',         label: 'Local',         desc: 'Région / dép.' },
                      { value: 'national',      label: 'National',      desc: 'France entière' },
                      { value: 'international', label: 'International', desc: 'Monde entier'  },
                    ].map(opt => (
                      <label key={opt.value} className="flex-1 cursor-pointer">
                        <input type="radio" name="geo" value={opt.value} className="sr-only peer" />
                        <div className="border-2 border-dark/10 rounded-xl px-3 py-2.5 text-center transition-colors peer-checked:border-teal peer-checked:bg-teal/5">
                          <p className="font-sans text-xs font-semibold text-dark">{opt.label}</p>
                          <p className="font-sans text-[10px] text-dark/40">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Card : Liens */}
            <div className="bg-white rounded-2xl border border-dark/8 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-teal/5 border-b border-dark/6 flex items-center justify-between">
                <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Liens</p>
                <p className="font-sans text-[10px] text-dark/30">Optionnel</p>
              </div>
              <div className="p-5 space-y-3">
                {links.map((link, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select value={link.type} onChange={e => updateLink(i, 'type', e.target.value)}
                      className="shrink-0 px-2.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20">
                      {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input type="url" value={link.url} onChange={e => updateLink(i, 'url', e.target.value)}
                      placeholder="https://…"
                      className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                    {links.length > 1 && (
                      <button type="button" onClick={() => removeLink(i)}
                        className="shrink-0 w-9 h-9 rounded-full border border-dark/10 text-dark/30 hover:text-red-400 hover:border-red-200 flex items-center justify-center text-lg transition-colors">×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addLink}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-dark/15 text-dark/40 hover:text-dark/60 hover:border-dark/30 font-sans text-sm transition-colors">
                  + Ajouter un lien
                </button>
              </div>
            </div>

            {/* RGPD */}
            <div className="bg-white rounded-2xl border border-dark/8 shadow-sm p-5 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="rgpd_consent" required
                  className="mt-0.5 w-4 h-4 rounded accent-teal shrink-0" />
                <span className="font-sans text-sm text-dark/70 leading-relaxed">
                  J'accepte que mes informations soient publiées dans l'annuaire de l'Église La Rencontre,
                  accessible à toute personne disposant du lien direct. <span className="text-coral font-medium">*</span>
                </span>
              </label>
              <p className="font-sans text-[11px] text-dark/40 leading-relaxed pl-7">
                Conformément au RGPD, vos données sont utilisées uniquement pour l'annuaire de l'église
                et ne sont pas transmises à des tiers. Vous pouvez demander la modification ou la suppression
                de votre fiche à tout moment en contactant{' '}
                <a href="mailto:contact@egliselarencontre.fr" className="underline underline-offset-2">
                  contact@egliselarencontre.fr
                </a>.
              </p>
            </div>

            {state?.error && (
              <p className="font-sans text-sm text-red-500 text-center bg-red-50 rounded-xl px-4 py-3">
                {state.error}
              </p>
            )}

            <button type="submit" disabled={isPending}
              className="w-full py-4 rounded-2xl bg-teal text-white font-sans text-sm font-semibold shadow-lg shadow-teal/20 disabled:opacity-60 transition-opacity">
              {isPending ? 'Envoi en cours…' : 'Envoyer ma fiche →'}
            </button>

            <p className="font-sans text-[11px] text-dark/30 text-center pb-8">
              <span className="text-coral">*</span> Champs obligatoires · Ta fiche sera vérifiée avant publication
            </p>
          </form>
        </div>
      </div>
    </>
  )
}
