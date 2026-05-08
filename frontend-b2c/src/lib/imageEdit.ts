/** Pixel-space crop area returned by react-easy-crop's onCropComplete. */
export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

const MAX_OUTPUT_SIZE = 1024

async function fileToImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = (e) => reject(e)
      img.src = url
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height }
  const ratio = width / height
  return ratio >= 1
    ? { width: max, height: Math.round(max / ratio) }
    : { width: Math.round(max * ratio), height: max }
}

/**
 * Apply rotation, crop and downscale to ≤1024px. Returns a PNG File.
 */
export async function applyCropAndResize(
  source: File | Blob,
  crop: PixelCrop,
  rotationDeg: number,
  outputName = "edited.png",
): Promise<File> {
  const img = await fileToImage(source)
  const radians = (rotationDeg * Math.PI) / 180

  // Rotate the source onto an offscreen canvas first to keep crop math sane.
  const rotated = document.createElement("canvas")
  if (rotationDeg % 180 === 0) {
    rotated.width = img.naturalWidth
    rotated.height = img.naturalHeight
  } else {
    rotated.width = img.naturalHeight
    rotated.height = img.naturalWidth
  }
  const rctx = rotated.getContext("2d")
  if (!rctx) throw new Error("Canvas 2D not available")
  rctx.translate(rotated.width / 2, rotated.height / 2)
  rctx.rotate(radians)
  rctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

  // Apply crop
  const cropCanvas = document.createElement("canvas")
  cropCanvas.width = Math.round(crop.width)
  cropCanvas.height = Math.round(crop.height)
  const cctx = cropCanvas.getContext("2d")
  if (!cctx) throw new Error("Canvas 2D not available")
  cctx.drawImage(
    rotated,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height,
  )

  // Downscale to MAX_OUTPUT_SIZE (preserve aspect)
  const target = fitWithin(cropCanvas.width, cropCanvas.height, MAX_OUTPUT_SIZE)
  let finalCanvas: HTMLCanvasElement = cropCanvas
  if (target.width !== cropCanvas.width) {
    const out = document.createElement("canvas")
    out.width = target.width
    out.height = target.height
    const octx = out.getContext("2d")
    if (!octx) throw new Error("Canvas 2D not available")
    octx.imageSmoothingQuality = "high"
    octx.drawImage(cropCanvas, 0, 0, out.width, out.height)
    finalCanvas = out
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
      0.92,
    )
  })

  return new File([blob], outputName, { type: "image/png" })
}

/**
 * Run client-side background removal. The model lazily downloads on first call
 * and is cached by the browser. Returns a PNG File with transparency.
 */
export async function removeBackground(
  source: File | Blob,
  outputName = "no-bg.png",
): Promise<File> {
  // Dynamic import keeps the heavy model out of the main bundle.
  const { removeBackground: imglyRemoveBg } = await import(
    "@imgly/background-removal"
  )
  const blob = await imglyRemoveBg(source)
  return new File([blob], outputName, { type: "image/png" })
}
