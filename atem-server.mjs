/**
 * Serveur local de contrôle ATEM
 * Usage: node atem-server.mjs [IP_ATEM]
 * Défaut USB: node atem-server.mjs 172.26.179.41
 */

import { createServer } from 'http'
import { exec } from 'child_process'
import { promisify } from 'util'
import { unlinkSync } from 'fs'
import { Atem } from 'atem-connection'
import * as faceapi from '@vladmandic/face-api'
import * as tf from '@tensorflow/tfjs-node'
import { createCanvas, loadImage } from 'canvas'

const execAsync = promisify(exec)

const ATEM_IP = process.argv[2] || '172.26.179.41'
const PORT = 3001

// Index du device de capture (0 = UGREEN par défaut)
const CAPTURE_DEVICE = process.argv[3] || '0'

// Modèles face-api
const MODELS_PATH = './node_modules/@vladmandic/face-api/model'

// ── Layout Multiview ATEM Mini Pro ISO ────────────────────────────────────────
// Positions relatives (0–1) de chaque caméra dans le frame Multiview.
// Défaut : inputs 1-4 sur la rangée du bas (Preview+Program en haut sur 50%)
// Ajustable si la disposition est différente.
const MULTIVIEW_LAYOUT = {
  1: { x: 0,     y: 0.5, w: 0.25, h: 0.5 },
  2: { x: 0.25,  y: 0.5, w: 0.25, h: 0.5 },
  3: { x: 0.5,   y: 0.5, w: 0.25, h: 0.5 },
  4: { x: 0.75,  y: 0.5, w: 0.25, h: 0.5 },
}

// ── État global ───────────────────────────────────────────────────────────────

const atem = new Atem()
let connected = false

// Détection faciale
let faceDetectionReady = false
let faceDetectionEnabled = false
let faceStatus = { 1: true, 2: true, 3: true, 4: true } // true = visage détecté

// ── ATEM ──────────────────────────────────────────────────────────────────────

atem.on('error', (err) => console.error('[ATEM ERROR]', err.message))
atem.on('connected', () => { connected = true; console.log(`✅ ATEM connecté (${ATEM_IP})`) })
atem.on('disconnected', () => { connected = false; console.log('⚠️  ATEM déconnecté') })

console.log(`Connexion à l'ATEM (${ATEM_IP})...`)
atem.connect(ATEM_IP)

// ── Détection faciale ─────────────────────────────────────────────────────────

async function initFaceDetection() {
  try {
    console.log('🧠 Chargement des modèles de détection faciale...')
    await faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_PATH)
    faceDetectionReady = true
    console.log('✅ Détection faciale prête')
  } catch (e) {
    console.error('⚠️  Détection faciale indisponible :', e.message)
  }
}

async function captureFrame() {
  const tmpPath = `/tmp/atem-frame-${Date.now()}.jpg`
  await execAsync(
    `ffmpeg -f avfoundation -framerate 5 -i "${CAPTURE_DEVICE}" -vframes 1 -y ${tmpPath} 2>/dev/null`,
    { timeout: 5000 }
  )
  return tmpPath
}

async function runFaceDetection() {
  if (!faceDetectionReady || !faceDetectionEnabled) return

  let framePath
  try {
    framePath = await captureFrame()
    const img = await loadImage(framePath)
    const W = img.width, H = img.height
    const canvas = createCanvas(W, H)
    canvas.getContext('2d').drawImage(img, 0, 0)

    const opts = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3, inputSize: 160 })
    const newStatus = {}

    for (const [camId, region] of Object.entries(MULTIVIEW_LAYOUT)) {
      const x = Math.floor(region.x * W)
      const y = Math.floor(region.y * H)
      const w = Math.floor(region.w * W)
      const h = Math.floor(region.h * H)

      const quadrant = createCanvas(w, h)
      quadrant.getContext('2d').drawImage(canvas, x, y, w, h, 0, 0, w, h)

      const detections = await faceapi.detectAllFaces(quadrant, opts)
      newStatus[parseInt(camId)] = detections.length > 0
    }

    faceStatus = newStatus

    const detected = Object.entries(newStatus)
      .filter(([, v]) => v).map(([k]) => `CAM${k}`).join(', ')
    const absent = Object.entries(newStatus)
      .filter(([, v]) => !v).map(([k]) => `CAM${k}`).join(', ')
    if (detected || absent)
      console.log(`👁  Visages: ✅ ${detected || '—'}  |  ❌ ${absent || '—'}`)

  } catch {
    // échec silencieux (device absent, frame corrompue…)
  } finally {
    if (framePath) try { unlinkSync(framePath) } catch {}
  }
}

// ── Autopilote ────────────────────────────────────────────────────────────────

const auto = {
  running: false,
  config: { minTime: 10, maxTime: 25, cameras: [1, 2, 3], transition: 'auto', useFaceDetection: false },
  nextSwitchAt: null,
  nextCamera: null,
  timer: null,
}

function pickNext(currentProgram) {
  let pool = auto.config.cameras.filter(c => c !== currentProgram)

  // Filtrer par détection faciale si activée
  if (auto.config.useFaceDetection && faceDetectionReady) {
    const poolWithFace = pool.filter(c => faceStatus[c])
    if (poolWithFace.length > 0) pool = poolWithFace
    // sinon on garde toutes les caméras (fallback)
  }

  return pool[Math.floor(Math.random() * pool.length)]
}

async function autoStep() {
  if (!auto.running || !connected) return

  const me = atem.state?.video?.mixEffects?.[0]
  const currentProgram = me?.programInput
  const next = pickNext(currentProgram)
  auto.nextCamera = next

  await atem.changePreviewInput(next)

  const { minTime, maxTime } = auto.config
  const duration = minTime + Math.random() * (maxTime - minTime)
  auto.nextSwitchAt = Date.now() + duration * 1000

  const faceInfo = auto.config.useFaceDetection
    ? (faceStatus[next] ? ' 👤' : ' (fallback)')
    : ''
  console.log(`🤖 Auto → CAM${next}${faceInfo} dans ${duration.toFixed(1)}s`)

  auto.timer = setTimeout(async () => {
    if (!auto.running) return
    if (auto.config.transition === 'auto') {
      await atem.autoTransition()
      await new Promise(r => setTimeout(r, 1500))
    } else {
      await atem.cut()
    }
    console.log(`🎬 Switch → CAM${next} (${auto.config.transition.toUpperCase()})`)
    autoStep()
  }, duration * 1000)
}

function startAuto(config) {
  if (auto.timer) clearTimeout(auto.timer)
  auto.config = { ...auto.config, ...config }

  // Activer la détection faciale si demandée
  if (auto.config.useFaceDetection && !faceDetectionEnabled) {
    faceDetectionEnabled = true
    console.log('👁  Détection faciale activée')
    setInterval(runFaceDetection, 1500)
  }

  auto.running = true
  console.log(`▶️  Autopilote démarré`)
  autoStep()
}

function stopAuto() {
  auto.running = false
  auto.nextSwitchAt = null
  auto.nextCamera = null
  if (auto.timer) { clearTimeout(auto.timer); auto.timer = null }
  console.log('⏹️  Autopilote arrêté')
}

// ── Serveur HTTP ──────────────────────────────────────────────────────────────

function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve({}) } })
  })
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { json(res, 200, {}); return }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname

  // GET /status
  if (req.method === 'GET' && path === '/status') {
    const me = atem.state?.video?.mixEffects?.[0]
    return json(res, 200, {
      connected,
      program: me?.programInput ?? null,
      preview: me?.previewInput ?? null,
      auto: {
        running: auto.running,
        config: auto.config,
        nextCamera: auto.nextCamera,
        nextSwitchIn: auto.nextSwitchAt ? Math.max(0, (auto.nextSwitchAt - Date.now()) / 1000) : null,
      },
      face: {
        ready: faceDetectionReady,
        enabled: faceDetectionEnabled,
        status: faceStatus,
      },
    })
  }

  // POST /program/:input
  const programMatch = path.match(/^\/program\/(\d+)$/)
  if (req.method === 'POST' && programMatch) {
    if (!connected) return json(res, 503, { error: 'ATEM non connecté' })
    stopAuto()
    await atem.changeProgramInput(parseInt(programMatch[1]))
    console.log(`Program → CAM${programMatch[1]}`)
    return json(res, 200, { ok: true })
  }

  // POST /preview/:input
  const previewMatch = path.match(/^\/preview\/(\d+)$/)
  if (req.method === 'POST' && previewMatch) {
    if (!connected) return json(res, 503, { error: 'ATEM non connecté' })
    await atem.changePreviewInput(parseInt(previewMatch[1]))
    console.log(`Preview → CAM${previewMatch[1]}`)
    return json(res, 200, { ok: true })
  }

  // POST /cut
  if (req.method === 'POST' && path === '/cut') {
    if (!connected) return json(res, 503, { error: 'ATEM non connecté' })
    stopAuto()
    await atem.cut()
    console.log('CUT')
    return json(res, 200, { ok: true })
  }

  // POST /auto
  if (req.method === 'POST' && path === '/auto') {
    if (!connected) return json(res, 503, { error: 'ATEM non connecté' })
    stopAuto()
    await atem.autoTransition()
    console.log('AUTO')
    return json(res, 200, { ok: true })
  }

  // POST /autopilote/start
  if (req.method === 'POST' && path === '/autopilote/start') {
    if (!connected) return json(res, 503, { error: 'ATEM non connecté' })
    const body = await readBody(req)
    startAuto(body)
    return json(res, 200, { ok: true, config: auto.config })
  }

  // POST /autopilote/stop
  if (req.method === 'POST' && path === '/autopilote/stop') {
    stopAuto()
    return json(res, 200, { ok: true })
  }

  json(res, 404, { error: 'Not found' })
})

// ── Démarrage ─────────────────────────────────────────────────────────────────

server.listen(PORT, async () => {
  console.log(`\n🎬 Serveur ATEM démarré sur http://localhost:${PORT}`)
  console.log(`   Régie : http://localhost:3000/benevoles/admin/regie\n`)
  await initFaceDetection()
})
