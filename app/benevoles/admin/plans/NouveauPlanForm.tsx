'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createPlan } from './actions'

type Team = { id: string; name: string }

function nextWeekday(dow: number) {
  const today = new Date()
  const diff = ((dow - today.getDay() + 7) % 7) || 7
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  return d
}

function toDatetimeLocal(date: Date, h: number, m: number) {
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

const TYPES = {
  sunday_service: {
    label: 'Culte du dimanche',
    defaultTitle: 'Culte du dimanche',
    defaultDate: () => toDatetimeLocal(nextWeekday(0), 10, 0),
  },
  prayer_meeting: {
    label: 'Réunion de prière',
    defaultTitle: 'Réunion de prière',
    defaultDate: () => toDatetimeLocal(nextWeekday(2), 20, 30),
  },
} as const

type PlanType = keyof typeof TYPES

export function NouveauPlanForm({ teams, error }: { teams: Team[]; error?: string }) {
  const [planType, setPlanType] = useState<PlanType>('sunday_service')
  const [title, setTitle] = useState<string>(TYPES.sunday_service.defaultTitle)
  const [date, setDate] = useState<string>(TYPES.sunday_service.defaultDate())

  function handleTypeChange(t: PlanType) {
    setPlanType(t)
    setTitle(TYPES[t].defaultTitle)
    setDate(TYPES[t].defaultDate())
  }

  return (
    <div className="min-h-screen bg-teal-50">
      <header className="bg-white border-b border-teal/20 px-6 py-4 flex items-center gap-4">
        <Link href="/benevoles/admin/plans" className="text-dark/40 hover:text-dark transition-colors font-sans text-sm">
          ← Planification
        </Link>
        <h1 className="font-display text-2xl text-dark font-light">Nouveau service</h1>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        <div className="bg-white rounded-2xl border border-teal/20 p-8">
          {/* Sélecteur de type */}
          <div className="flex gap-2 mb-6 p-1 bg-teal-50 rounded-xl">
            {(Object.keys(TYPES) as PlanType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`flex-1 py-2 rounded-lg font-sans text-sm font-medium transition-colors ${
                  planType === t
                    ? 'bg-white text-dark shadow-sm'
                    : 'text-dark/50 hover:text-dark'
                }`}
              >
                {TYPES[t].label}
              </button>
            ))}
          </div>

          <form action={createPlan} className="space-y-5">
            <input type="hidden" name="plan_type" value={planType} />

            <div>
              <label className="block text-sm font-sans text-dark/70 mb-1.5">Titre</label>
              <input
                name="title"
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-sans text-dark/70 mb-1.5">Date et heure</label>
              <input
                name="service_date"
                type="datetime-local"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
              />
            </div>

            {planType === 'sunday_service' && (
              <div>
                <label className="block text-sm font-sans text-dark/70 mb-1.5">
                  Équipe <span className="text-dark/30">(optionnel)</span>
                </label>
                <select
                  name="team_id"
                  className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm"
                >
                  <option value="">Toutes les équipes</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-sans text-dark/70 mb-1.5">
                Notes <span className="text-dark/30">(optionnel)</span>
              </label>
              <textarea
                name="notes"
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-teal/30 bg-teal-50 text-dark placeholder:text-dark/30 focus:outline-none focus:ring-2 focus:ring-teal/40 font-sans text-sm resize-none"
                placeholder="Thème, instructions particulières…"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 font-sans">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-teal text-white rounded-lg font-sans text-sm font-medium hover:bg-teal-dark transition-colors"
            >
              Créer le service
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
