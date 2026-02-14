import { useCallback, useMemo, useState } from 'react'

export function useScreenCapture() {
  const [displayStream, setDisplayStream] = useState(null)
  const [error, setError] = useState('')

  const startScreenCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setDisplayStream(null)
        }
      })

      setDisplayStream(stream)
      setError('')
      return stream
    } catch (err) {
      const message = err?.message || 'Screen sharing was cancelled or blocked.'
      setError(message)
      throw err
    }
  }, [])

  const stopScreenCapture = useCallback(() => {
    setDisplayStream((current) => {
      current?.getTracks().forEach((track) => track.stop())
      return null
    })
  }, [])

  const hasDisplayAudio = useMemo(() => {
    if (!displayStream) return false
    return displayStream.getAudioTracks().length > 0
  }, [displayStream])

  return {
    displayStream,
    hasDisplayAudio,
    screenError: error,
    startScreenCapture,
    stopScreenCapture,
  }
}
