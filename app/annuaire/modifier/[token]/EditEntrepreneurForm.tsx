'use client'

import { useActionState, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateEntrepreneurByToken, deleteEntrepreneurByToken } from '../../actions'
import { LINK_TYPES, SECTORS, parseSectors, type Entrepreneur } from '../../constants'
import { PhotoCropModal } from '../../components/PhotoCropModal'

type Link = { type: string; url: string }
const LANGUAGE_OPTIONS = ['Français', 'English', 'Español', 'Português', 'Arabe', 'Autre']
function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

export function EditEntrepreneurForm({
  entrepreneur: e,
  token,
}: {
  entrepreneur: Entrepreneur & { edit_token: string }
  token: string
}) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(updateEntrepreneurByToken, null)

  // Photo
  const [preview, setPreview]   = useState<string | null>(e.photo_url ?? null)
  const [cropSrc, setCropSrc]   = useState<string | null>(null)
  const [origName, setOrigName] = useState('photo.jpg')
  const fileRef = useRef<HTMLInputElement>(null)

  function handlePhoto(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    setOrigName(file.name)
    const reader = new FileReader()
    reader.onload = r => setCropSrc(r.target?.result as string)
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

  const [firstName, setFirstName] = useState(e.first_name)
  const [lastName,  setLastName]  = useState(e.last_name)

  // Secteur (simple ou multi)
  const initParsed = parseSectors(e.sector ?? null)
  const [multiSector, setMultiSector]         = useState(initParsed.length > 1)
  const [selectedSectors, setSelectedSectors] = useState<string[]>(initParsed)
  function toggleSector(s: string) {
    setSelectedSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const initialLinks: Link[] = Array.isArray(e.links) && e.links.length > 0
    ? (e.links as Link[]) : [{ type: 'website', url: '' }]
  const [links, setLinks] = useState<Link[]>(initialLinks)
  function addLink()    { setLinks(p => [...p, { type: 'website', url: '' }]) }
  function removeLink(i: number) { setLinks(p => p.filter((_, idx) => idx !== i)) }
  function updateLink(i: number, field: 'type' | 'url', value: string) {
    setLinks(p => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
  }

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting, setIsDeleting]       = useState(false)
  async function handleDelete() {
    setIsDeleting(true)
    const fd = new FormData()
    fd.set('edit_token', token)
    await deleteEntrepreneurByToken(fd)
    router.push('/annuaire')
  }

  if (state?.success) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-teal/15 flex items-center justify-center mx-auto text-3xl">✓</div>
          <h1 className="font-display text-3xl text-dark font-light">Modifications enregistrées !</h1>
          <p className="font-sans text-base text-dark/60">
            Ta fiche a été mise à jour. Les modifications sont visibles immédiatement.
          </p>
          <a href="/annuaire" className="inline-block font-sans text-sm text-teal underline underline-offset-2">
            Voir l'annuaire
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}

      <div className="min-h-screen bg-sand">
        <div className="bg-gradient-to-br from-teal to-teal-dark px-4 pt-14 pb-12 text-white text-center">
          <p className="font-sans text-xs uppercase tracking-widest text-white/60 mb-3">Annuaire des entrepreneurs</p>
          <h1 className="font-display text-4xl font-light leading-tight">Modifier ma fiche</h1>
          <p className="font-sans text-sm text-white/70 mt-3 max-w-sm mx-auto">
            Les modifications sont appliquées immédiatement sur l'annuaire.
          </p>
        </div>

        <div className="max-w-xl mx-auto px-4 py-8">
          <form action={action} className="space-y-5">
            <input type="hidden" name="edit_token" value={token} />
            <input type="hidden" name="links" value={JSON.stringify(links)} />

            {/* Card : Vous */}
            <div className="bg-white rounded-2xl border border-dark/8 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-teal/5 border-b border-dark/6">
                <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Vous</p>
              </div>
              <div className="p-5 space-y-4">

                {/* Photo */}
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="relative w-20 h-20 rounded-full bg-teal/10 flex items-center justify-center shrink-0 overflow-hidden border-2 border-dashed border-teal/30 hover:border-teal/60 transition-colors group">
                    {preview
                      ? <img src={preview} alt="" className="w-full h-full object-cover" />
                      : <span className="font-sans text-xl font-bold text-teal">{initials(firstName, lastName)}</span>
                    }
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-sans font-medium">Changer</span>
                    </div>
                  </button>
                  <div>
                    <p className="font-sans text-sm font-medium text-dark">Photo de profil</p>
                    <p className="font-sans text-xs text-dark/40 mt-0.5">Optionnel · JPG, PNG, max 5 Mo</p>
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="mt-1.5 font-sans text-xs text-teal underline underline-offset-2">
                      Changer la photo
                    </button>
                  </div>
                  <input ref={fileRef} type="file" name="photo" accept="image/*" className="hidden" onChange={handlePhoto} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Prénom <span className="text-coral">*</span></label>
                    <input name="first_name" required value={firstName} onChange={e => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                  </div>
                  <div>
                    <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Nom <span className="text-coral">*</span></label>
                    <input name="last_name" required value={lastName} onChange={e => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Email <span className="text-coral">*</span></label>
                    <input name="contact_email" type="email" required defaultValue={e.contact_email ?? ''}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                  </div>
                  <div>
                    <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Téléphone <span className="text-coral">*</span></label>
                    <input name="contact_phone" type="tel" required defaultValue={e.contact_phone ?? ''}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                  </div>
                </div>

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">Langues parlées</label>
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

            {/* Card : Votre entreprise */}
            <div className="bg-white rounded-2xl border border-dark/8 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-teal/5 border-b border-dark/6">
                <p className="font-sans text-[10px] uppercase tracking-widest text-dark/40 font-semibold">Votre entreprise</p>
              </div>
              <div className="p-5 space-y-4">

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Nom de l'entreprise / micro-entreprise <span className="text-coral">*</span></label>
                  <input name="company_name" required defaultValue={e.company_name}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20" />
                </div>

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">Statut <span className="text-coral">*</span></label>
                  <div className="space-y-2">
                    {[
                      { value: 'active',    label: 'En activité',          desc: 'Mon entreprise existe et fonctionne' },
                      { value: 'launching', label: 'En cours de création', desc: 'Je suis en train de lancer mon activité' },
                      { value: 'project',   label: 'Projet / réflexion',   desc: 'Je travaille sur un projet d\'entreprise' },
                    ].map(opt => (
                      <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-dark/10 hover:border-dark/20 transition-colors has-[:checked]:border-teal has-[:checked]:bg-teal/5">
                        <input type="radio" name="status" value={opt.value} required defaultChecked={e.status === opt.value} className="w-4 h-4 accent-teal shrink-0" />
                        <div>
                          <p className="font-sans text-sm font-semibold text-dark">{opt.label}</p>
                          <p className="font-sans text-[10px] text-dark/40">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">Secteur d'activité <span className="text-coral">*</span></label>

                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 border-dark/10 hover:border-dark/20 transition-colors has-[:checked]:border-teal has-[:checked]:bg-teal/5 mb-3">
                    <input type="checkbox" checked={multiSector}
                      onChange={ev => { setMultiSector(ev.target.checked); setSelectedSectors([]) }}
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
                    <select name="sector" required defaultValue={initParsed[0] ?? ''}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20">
                      <option value="">— Choisir —</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-1.5">Présentation <span className="text-coral">*</span></label>
                  <textarea name="description" required rows={4} defaultValue={e.description ?? ''}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-dark/10 bg-sand text-dark font-sans text-sm focus:outline-none focus:ring-2 focus:ring-teal/20 resize-none" />
                </div>

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">Clientèle <span className="text-coral">*</span></label>
                  <div className="flex gap-2">
                    {[
                      { value: 'b2b', label: 'B2B', desc: 'Professionnels' },
                      { value: 'b2c', label: 'B2C', desc: 'Particuliers' },
                      { value: 'both', label: 'B2B & B2C', desc: 'Les deux' },
                    ].map(opt => (
                      <label key={opt.value} className="flex-1 cursor-pointer">
                        <input type="radio" name="target" value={opt.value} className="sr-only peer" defaultChecked={e.target === opt.value} />
                        <div className="border-2 border-dark/10 rounded-xl px-3 py-2.5 text-center transition-colors peer-checked:border-teal peer-checked:bg-teal/5">
                          <p className="font-sans text-sm font-semibold text-dark">{opt.label}</p>
                          <p className="font-sans text-[10px] text-dark/40">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-sans text-[10px] uppercase tracking-widest text-dark/40 mb-2">Zone géographique <span className="text-coral">*</span></label>
                  <div className="flex gap-2">
                    {[
                      { value: 'local', label: 'Local', desc: 'Région / dép.' },
                      { value: 'national', label: 'National', desc: 'France entière' },
                      { value: 'international', label: 'International', desc: 'Monde entier' },
                    ].map(opt => (
                      <label key={opt.value} className="flex-1 cursor-pointer">
                        <input type="radio" name="geo" value={opt.value} className="sr-only peer" defaultChecked={e.geo === opt.value} />
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

            {/* Liens */}
            <div className="bg-white rounded-2xl border border-dark/8 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-teal/5 border-b border-dark/6 flex items-center justify-between">
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
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-dark/15 text-dark/40 hover:text-dark/60 hover:border-dark/30 font-sans text-sm transition-colors">
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

            <p className="font-sans text-[11px] text-dark/30 text-center">
              <span className="text-coral">*</span> Champs obligatoires
            </p>
          </form>

          {/* Zone de danger */}
          <div className="mt-10 mb-8 border-t border-dark/8 pt-8">
            <h2 className="font-sans text-sm font-semibold text-dark/40 uppercase tracking-widest mb-4">Zone de danger</h2>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="w-full py-3 rounded-2xl border-2 border-red-200 text-red-400 font-sans text-sm font-semibold hover:bg-red-50 transition-colors">
                Supprimer ma fiche
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
                <p className="font-sans text-sm text-red-700 font-medium">
                  Es-tu sûr(e) de vouloir supprimer ta fiche ? Cette action est irréversible.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl border border-dark/15 font-sans text-sm text-dark/60 hover:bg-white transition-colors">
                    Annuler
                  </button>
                  <button onClick={handleDelete} disabled={isDeleting}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-sans text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors">
                    {isDeleting ? 'Suppression…' : 'Oui, supprimer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
