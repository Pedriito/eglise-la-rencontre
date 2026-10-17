'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const DEFAULT_ATEM_URL = 'http://localhost:3001'

const SOURCES = [
  { id: 1, label: 'CAM 1' },
  { id: 2, label: 'CAM 2' },
  { id: 3, label: 'CAM 3' },
  { id: 4, label: 'CAM 4' },
]

type AutoStatus = {
  running: boolean
  config: { minTime: number; maxTime: number; cameras: number[]; transition: string; useFaceDetection: boolean }
  nextCamera: number | null
  nextSwitchIn: number | null
}

type FaceStatus = {
  ready: boolean
  enabled: boolean
  status: Record<number, boolean>
}

type Status = {
  connected: boolean
  program: number | null
  preview: number | null
  auto: AutoStatus
  face: FaceStatus
}

export default function RegieClient() {
  const [atemUrl, setAtemUrl] = useState(DEFAULT_ATEM_URL)
  const [urlInput, setUrlInput] = useState(DEFAULT_ATEM_URL)
  const [showUrlEdit, setShowUrlEdit] = useState(false)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Chargement de l'URL sauvegardée
  useEffect(() => {
    const saved = localStorage.getItem('atemUrl')
    if (saved) { setAtemUrl(saved); setUrlInput(saved) }
  }, [])

  const [status, setStatus] = useState<Status>({
    connected: false,
    program: null,
    preview: null,
    auto: { running: false, config: { minTime: 10, maxTime: 25, cameras: [1, 2, 3], transition: 'auto', useFaceDetection: false }, nextCamera: null, nextSwitchIn: null },
    face: { ready: false, enabled: false, status: { 1: true, 2: true, 3: true, 4: true } },
  })
  const [serverOnline, setServerOnline] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  // Config autopilote (local, envoyée au démarrage)
  const [minTime, setMinTime] = useState(10)
  const [maxTime, setMaxTime] = useState(25)
  const [activeCams, setActiveCams] = useState<number[]>([1, 2, 3])
  const [transition, setTransition] = useState<'auto' | 'cut'>('auto')
  const [useFaceDetection, setUseFaceDetection] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${atemUrl}/status`, { signal: AbortSignal.timeout(1500) })
      if (res.ok) { setStatus(await res.json()); setServerOnline(true) }
    } catch {
      setServerOnline(false)
      setStatus(s => ({ ...s, connected: false }))
    }
  }, [atemUrl])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 500)
    return () => clearInterval(id)
  }, [fetchStatus])

  async function send(path: string, key: string, body?: object) {
    setLoading(key)
    try {
      await fetch(`${atemUrl}${path}`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(2000),
      })
    } catch {}
    await fetchStatus()
    setLoading(null)
  }

  function toggleCam(id: number) {
    setActiveCams(prev =>
      prev.includes(id)
        ? prev.length > 2 ? prev.filter(c => c !== id) : prev // minimum 2 caméras
        : [...prev, id].sort()
    )
  }

  const disabled = !serverOnline || !status.connected
  const autoRunning = status.auto?.running

  // Countdown formaté
  const countdown = status.auto?.nextSwitchIn
  const countdownStr = countdown != null ? `${Math.ceil(countdown)}s` : '—'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6 font-sans">

      {/* Header */}
      <div className="w-full max-w-2xl mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-3">Régie ATEM</h1>
        <div className="flex gap-3 items-center">
          {/* Voyant serveur */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
            serverOnline
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${serverOnline ? 'bg-green-400' : 'bg-red-500'}`} />
            Serveur
          </div>
          {/* Voyant ATEM */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${
            status.connected
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${status.connected ? 'bg-green-400' : 'bg-red-500 animate-pulse'}`} />
            ATEM
          </div>
        </div>

        {/* Bouton URL serveur — ligne dédiée */}
        <button
          onClick={() => { setShowUrlEdit(v => !v); setTimeout(() => urlInputRef.current?.select(), 50) }}
          className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 transition-colors w-full"
        >
          <span>⚙</span>
          <span>Adresse du serveur :</span>
          <span className="font-mono">{atemUrl.replace('http://', '')}</span>
        </button>

        {/* Champ édition URL */}
        {showUrlEdit && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={e => {
              e.preventDefault()
              const url = urlInput.trim().replace(/\/$/, '')
              setAtemUrl(url)
              localStorage.setItem('atemUrl', url)
              setShowUrlEdit(false)
            }}
          >
            <input
              ref={urlInputRef}
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="http://10.0.0.x:3001"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500"
            />
            <button type="submit" className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-semibold">OK</button>
            <button type="button" onClick={() => setShowUrlEdit(false)} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">✕</button>
          </form>
        )}

        {!serverOnline && (
          <p className="text-xs text-gray-500 mt-2">
            Serveur introuvable sur <code className="text-gray-400">{atemUrl}</code> — vérifie l&apos;IP du Mac mini via ⚙
          </p>
        )}
      </div>

      <div className="w-full max-w-2xl space-y-5">

        {/* ── Autopilote ── */}
        <div className={`rounded-2xl border p-5 space-y-4 transition-colors ${autoRunning ? 'border-amber-500/50 bg-amber-500/5' : 'border-gray-800 bg-gray-900/50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-base flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${autoRunning ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'}`} />
                Autopilote
              </h2>
              {autoRunning && countdown != null && (
                <p className="text-xs text-amber-400 mt-0.5">
                  Prochain switch vers CAM {status.auto.nextCamera} dans <span className="font-bold">{countdownStr}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => autoRunning
                ? send('/autopilote/stop', 'auto-stop')
                : send('/autopilote/start', 'auto-start', { minTime, maxTime, cameras: activeCams, transition, useFaceDetection })
              }
              disabled={disabled || loading !== null}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                autoRunning
                  ? 'bg-red-500 hover:bg-red-400 text-white'
                  : 'bg-amber-400 hover:bg-amber-300 text-gray-950'
              }`}
            >
              {loading === 'auto-start' || loading === 'auto-stop' ? '…' : autoRunning ? '⏹ Arrêter' : '▶ Lancer'}
            </button>
          </div>

          {/* Config */}
          <div className={`space-y-3 ${autoRunning ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Durées */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Durée min (sec)</label>
                <input
                  type="number" min={3} max={maxTime - 1} value={minTime}
                  onChange={e => setMinTime(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Durée max (sec)</label>
                <input
                  type="number" min={minTime + 1} max={120} value={maxTime}
                  onChange={e => setMaxTime(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            {/* Caméras actives */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Caméras utilisées</label>
              <div className="flex gap-2">
                {SOURCES.map(src => (
                  <button
                    key={src.id}
                    onClick={() => toggleCam(src.id)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeCams.includes(src.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {src.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transition */}
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Type de transition</label>
              <div className="flex gap-2">
                {(['auto', 'cut'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTransition(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                      transition === t
                        ? 'bg-gray-100 text-gray-950'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {t === 'auto' ? 'Mix / Fondu' : 'Cut'}
                  </button>
                ))}
              </div>
            </div>

            {/* Détection faciale */}
            <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 border transition-colors ${
              useFaceDetection ? 'border-purple-500/40 bg-purple-500/5' : 'border-gray-700 bg-gray-800/50'
            }`}>
              <div>
                <p className="text-sm font-medium text-white">
                  Détection faciale
                  {!status.face.ready && (
                    <span className="ml-2 text-xs text-gray-500 font-normal">(modèle non chargé)</span>
                  )}
                  {status.face.ready && status.face.enabled && (
                    <span className="ml-2 text-xs text-purple-400 font-normal">● actif</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Évite les caméras sans visage visible</p>
              </div>
              <button
                onClick={() => setUseFaceDetection(v => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  useFaceDetection ? 'bg-purple-500' : 'bg-gray-600'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  useFaceDetection ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Indicateur visages par caméra */}
            {status.face.enabled && (
              <div>
                <label className="text-xs text-gray-400 block mb-1.5">Visages détectés</label>
                <div className="flex gap-2">
                  {SOURCES.map(src => {
                    const hasFace = status.face.status[src.id]
                    return (
                      <div
                        key={src.id}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold text-center transition-all ${
                          hasFace
                            ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {src.label}
                        <br />
                        <span className="text-base">{hasFace ? '👤' : '—'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Contrôle manuel ── */}
        <div className="space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Contrôle manuel</p>

          {/* Preview row */}
          <div>
            <p className="text-xs font-semibold text-green-400 mb-2">Preview</p>
            <div className="grid grid-cols-4 gap-3">
              {SOURCES.map(src => (
                <button
                  key={src.id}
                  onClick={() => send(`/preview/${src.id}`, `prev-${src.id}`)}
                  disabled={disabled || loading !== null || autoRunning}
                  className={`py-4 rounded-xl font-bold text-base transition-all ${
                    status.preview === src.id
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/40 scale-105'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {src.label}
                </button>
              ))}
            </div>
          </div>

          {/* Program row */}
          <div>
            <p className="text-xs font-semibold text-red-400 mb-2">Program</p>
            <div className="grid grid-cols-4 gap-3">
              {SOURCES.map(src => (
                <button
                  key={src.id}
                  onClick={() => send(`/program/${src.id}`, `prog-${src.id}`)}
                  disabled={disabled || loading !== null || autoRunning}
                  className={`py-4 rounded-xl font-bold text-base transition-all ${
                    status.program === src.id
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 scale-105'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {src.label}
                </button>
              ))}
            </div>
          </div>

          {/* CUT / AUTO */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <button
              onClick={() => send('/cut', 'cut')}
              disabled={disabled || loading !== null || autoRunning}
              className="py-5 rounded-xl font-black text-xl tracking-widest bg-white text-gray-950 hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              {loading === 'cut' ? '…' : 'CUT'}
            </button>
            <button
              onClick={() => send('/auto', 'auto')}
              disabled={disabled || loading !== null || autoRunning}
              className="py-5 rounded-xl font-black text-xl tracking-widest bg-amber-400 text-gray-950 hover:bg-amber-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              {loading === 'auto' ? '…' : 'AUTO'}
            </button>
          </div>

          {autoRunning && (
            <p className="text-center text-xs text-gray-600 pt-1">Contrôle manuel désactivé pendant l'autopilote</p>
          )}
        </div>

        {/* Indicateur bas */}
        {status.connected && (
          <div className="flex justify-around pt-1 text-sm text-gray-500 border-t border-gray-800">
            <span className="pt-3">PGM : <span className="text-red-400 font-semibold">CAM {status.program}</span></span>
            <span className="pt-3">PVW : <span className="text-green-400 font-semibold">CAM {status.preview}</span></span>
          </div>
        )}
      </div>
    </div>
  )
}
