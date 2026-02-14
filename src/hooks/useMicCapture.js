import { useCallback, useMemo, useState } from 'react'

export function useMicCapture() {
  const [micStream, setMicStream] = useState(null)
  const [error, setError] = useState('')

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicStream(stream)
      setError('')
      return stream
    } catch (err) {
      const message = err?.message || 'Microphone permission denied.'
      setError(message)
      throw err
    }
  }, [])

  const stopMic = useCallback(() => {
    setMicStream((current) => {
      current?.getTracks().forEach((track) => track.stop())
      return null
    })
  }, [])

  const micEnabled = useMemo(() => Boolean(micStream), [micStream])

  return {
    micStream,
    micEnabled,
    micError: error,
    startMic,
    stopMic,
  }
}
