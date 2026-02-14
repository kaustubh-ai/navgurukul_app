import { createWorker } from 'tesseract.js'

let workerPromise = null

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        return await createWorker('eng', 1)
      } catch (error) {
        workerPromise = null
        throw error
      }
    })()
  }

  return workerPromise
}

export async function recognizeLocalText(imageDataUrl) {
  const worker = await getWorker()
  const result = await worker.recognize(imageDataUrl)

  const rawConfidence = Number(result?.data?.confidence)
  const normalizedConfidence = Number.isFinite(rawConfidence)
    ? Math.max(0, Math.min(1, rawConfidence / 100))
    : 0.5

  return {
    text: (result?.data?.text || '').trim(),
    confidence: normalizedConfidence,
  }
}

export async function terminateLocalOcr() {
  if (!workerPromise) return

  const worker = await workerPromise
  await worker.terminate()
  workerPromise = null
}
