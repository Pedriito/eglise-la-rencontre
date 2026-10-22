'use client'

import { useState, useRef, useCallback } from 'react'
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

interface Props {
  src: string          // data URL de l'image originale
  onConfirm: (blob: Blob, dataUrl: string) => void
  onCancel: () => void
}

function centerSquareCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
    width, height,
  )
}

async function getCroppedBlob(
  image: HTMLImageElement,
  crop: PixelCrop,
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = document.createElement('canvas')
  const size = 400 // taille de sortie fixe
  canvas.width  = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const scaleX = image.naturalWidth  / image.width
  const scaleY = image.naturalHeight / image.height

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width  * scaleX,
    crop.height * scaleY,
    0, 0, size, size,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('Canvas empty')); return }
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
      resolve({ blob, dataUrl })
    }, 'image/jpeg', 0.88)
  })
}

export function PhotoCropModal({ src, onConfirm, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isProcessing, setIsProcessing] = useState(false)

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerSquareCrop(width, height))
  }, [])

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop) return
    setIsProcessing(true)
    try {
      const { blob, dataUrl } = await getCroppedBlob(imgRef.current, completedCrop)
      onConfirm(blob, dataUrl)
    } catch (err) {
      console.error('crop error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-dark/8 flex items-center justify-between">
          <div>
            <p className="font-sans text-sm font-semibold text-dark">Recadrer la photo</p>
            <p className="font-sans text-xs text-dark/40 mt-0.5">Déplace et redimensionne le cadre</p>
          </div>
          <button onClick={onCancel}
            className="w-8 h-8 rounded-full border border-dark/10 flex items-center justify-center text-dark/40 hover:text-dark text-lg transition-colors">
            ×
          </button>
        </div>

        {/* Zone de crop */}
        <div className="p-4 bg-dark/5 flex justify-center">
          <ReactCrop
            crop={crop}
            onChange={(_, pct) => setCrop(pct)}
            onComplete={c => setCompletedCrop(c)}
            aspect={1}
            circularCrop
            minWidth={50}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Photo à recadrer"
              onLoad={onImageLoad}
              style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
            />
          </ReactCrop>
        </div>

        {/* Prévisualisation + boutons */}
        <div className="px-5 py-4 flex items-center gap-4">
          {completedCrop && (
            <div className="shrink-0">
              <PreviewCanvas imgRef={imgRef} crop={completedCrop} />
            </div>
          )}
          <div className="flex-1 flex flex-col gap-2">
            <button
              onClick={handleConfirm}
              disabled={!completedCrop || isProcessing}
              className="w-full py-3 rounded-xl bg-teal text-white font-sans text-sm font-semibold disabled:opacity-50 transition-opacity hover:bg-teal-dark"
            >
              {isProcessing ? 'Traitement…' : 'Confirmer →'}
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl border border-dark/15 text-dark/50 font-sans text-sm transition-colors hover:text-dark"
            >
              Annuler
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

/* Petit aperçu circulaire en temps réel */
function PreviewCanvas({
  imgRef,
  crop,
}: {
  imgRef: React.RefObject<HTMLImageElement | null>
  crop: PixelCrop
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Dessin synchrone à chaque render
  if (canvasRef.current && imgRef.current && crop.width && crop.height) {
    const canvas = canvasRef.current
    const img    = imgRef.current
    const size   = 64
    canvas.width  = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const scaleX = img.naturalWidth  / img.width
    const scaleY = img.naturalHeight / img.height
    ctx.clearRect(0, 0, size, size)
    // clip circulaire
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, crop.x * scaleX, crop.y * scaleY, crop.width * scaleX, crop.height * scaleY, 0, 0, size, size)
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas ref={canvasRef} className="w-16 h-16 rounded-full border-2 border-teal/20" />
      <p className="font-sans text-[10px] text-dark/40">Aperçu</p>
    </div>
  )
}
