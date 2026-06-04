'use client'

import { useState, useTransition } from 'react'
import { fetchSheetRows, importSheetRows, type SheetRow } from './sheet-sync-action'

export function SheetSync() {
  const [open, setOpen]           = useState(false)
  const [rows, setRows]           = useState<SheetRow[]>([])
  const [selected, setSelected]   = useState<Set<number>>(new Set())
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [result, setResult]       = useState<string | null>(null)
  const [isPending, start]        = useTransition()

  function handleOpen() {
    setOpen(true)
    setResult(null)
    setFetchError(null)
    start(async () => {
      const res = await fetchSheetRows()
      if (res.error) { setFetchError(res.error); return }
      setRows(res.rows)
      // Pré-sélectionner toutes les lignes non encore importées
      setSelected(new Set(res.rows.map(r => r.rowIndex)))
    })
  }

  function toggleRow(idx: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set())
    else setSelected(new Set(rows.map(r => r.rowIndex)))
  }

  function handleImport() {
    start(async () => {
      const res = await importSheetRows([...selected])
      if (!res.ok) { setFetchError(res.error ?? 'Erreur'); return }
      setResult(
        res.imported === 0
          ? 'Aucun nouveau sujet (déjà importés).'
          : `✓ ${res.imported} sujet${res.imported > 1 ? 's' : ''} importé${res.imported > 1 ? 's' : ''} avec succès.`
      )
      setTimeout(() => { setOpen(false); window.location.reload() }, 1500)
    })
  }

  const activeRows   = rows.filter(r => !r.exaucement && !r.traite)
  const treatedRows  = rows.filter(r => r.traite && !r.exaucement)
  const resolvedRows = rows.filter(r => !!r.exaucement)

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-teal/30 bg-white hover:bg-teal/5 font-sans text-xs text-dark/60 hover:text-teal transition-colors"
        title="Importer les sujets de prière depuis Google Forms"
      >
        📋 Sync Google Forms
        <span className="text-[10px] text-dark/30">({rows.length > 0 ? `${rows.length} lignes` : '…'})</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-teal/10">
              <div>
                <h2 className="font-display text-lg text-dark font-light">Sujets depuis Google Forms</h2>
                <p className="font-sans text-xs text-dark/40 mt-0.5">
                  {isPending && rows.length === 0 ? 'Chargement…' : `${rows.length} réponse${rows.length > 1 ? 's' : ''} dans la feuille`}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-dark/30 hover:text-dark text-xl">×</button>
            </div>

            {/* Contenu */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {fetchError && (
                <p className="font-sans text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{fetchError}</p>
              )}
              {result && (
                <p className="font-sans text-sm text-teal bg-teal/10 border border-teal/20 rounded-xl px-4 py-3">{result}</p>
              )}

              {rows.length > 0 && !result && (
                <>
                  {/* Sélection globale */}
                  <div className="flex items-center justify-between">
                    <button onClick={toggleAll} className="font-sans text-xs text-teal hover:underline">
                      {selected.size === rows.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                    <span className="font-sans text-xs text-dark/40">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
                  </div>

                  {/* Actifs */}
                  {activeRows.length > 0 && (
                    <div>
                      <p className="font-sans text-[10px] uppercase tracking-widest text-dark/30 mb-2">En attente de prière</p>
                      {activeRows.map(r => <RowItem key={r.rowIndex} row={r} checked={selected.has(r.rowIndex)} onToggle={toggleRow} />)}
                    </div>
                  )}

                  {/* Traités */}
                  {treatedRows.length > 0 && (
                    <div>
                      <p className="font-sans text-[10px] uppercase tracking-widest text-dark/30 mb-2">Présentés en réunion</p>
                      {treatedRows.map(r => <RowItem key={r.rowIndex} row={r} checked={selected.has(r.rowIndex)} onToggle={toggleRow} />)}
                    </div>
                  )}

                  {/* Exaucés */}
                  {resolvedRows.length > 0 && (
                    <div>
                      <p className="font-sans text-[10px] uppercase tracking-widest text-dark/30 mb-2">Exaucés ✓</p>
                      {resolvedRows.map(r => <RowItem key={r.rowIndex} row={r} checked={selected.has(r.rowIndex)} onToggle={toggleRow} />)}
                    </div>
                  )}
                </>
              )}

              {!isPending && rows.length === 0 && !fetchError && (
                <p className="font-sans text-sm text-dark/40 text-center py-8">Aucune réponse dans la feuille.</p>
              )}
            </div>

            {/* Footer */}
            {rows.length > 0 && !result && (
              <div className="px-5 py-4 border-t border-teal/10 flex gap-3">
                <button onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-teal/20 font-sans text-sm text-dark/60 hover:bg-teal/5">
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={isPending || selected.size === 0}
                  className="flex-1 py-2.5 rounded-xl bg-teal text-white font-sans text-sm font-medium hover:bg-teal/90 disabled:opacity-40"
                >
                  {isPending ? 'Import…' : `Importer ${selected.size} sujet${selected.size > 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function RowItem({ row, checked, onToggle }: { row: SheetRow; checked: boolean; onToggle: (i: number) => void }) {
  return (
    <label className={`flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${checked ? 'bg-teal/5 border border-teal/20' : 'bg-dark/3 border border-transparent hover:bg-dark/5'}`}>
      <input type="checkbox" checked={checked} onChange={() => onToggle(row.rowIndex)}
        className="mt-0.5 accent-teal shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-sans text-sm text-dark font-medium">{row.prenom || '—'}</span>
          {row.confidentiel && <span className="font-sans text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">🔒 Confidentiel</span>}
          {row.exaucement   && <span className="font-sans text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">✓ Exaucé</span>}
          {row.traite       && <span className="font-sans text-[10px] text-teal/60 bg-teal/10 px-1.5 py-0.5 rounded">Traité</span>}
        </div>
        <p className="font-sans text-xs text-dark/60 mt-0.5 leading-snug">{row.sujet}</p>
        {row.exaucement && <p className="font-sans text-[10px] text-green-600 mt-0.5">{row.exaucement}</p>}
      </div>
    </label>
  )
}
