import { useEffect, useRef } from 'react'

export function useOcrSampler({ videoRef, enabled, intervalMs, onSample, onError }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined

    const timer = setInterval(() => {
      try {
        const video = videoRef.current
        if (!video || video.readyState < 2) return

        const width = video.videoWidth
        const height = video.videoHeight
        if (!width || !height) return

        const canvas = canvasRef.current
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        onSample?.({
          dataUrl,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        onError?.(error)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [enabled, intervalMs, onSample, onError, videoRef])
}
