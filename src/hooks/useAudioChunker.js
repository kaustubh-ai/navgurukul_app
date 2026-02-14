import { useEffect, useRef } from 'react'

function chooseMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
}

export function useAudioChunker({ stream, chunkMs, enabled, onChunk, onError }) {
  const onChunkRef = useRef(onChunk)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onChunkRef.current = onChunk
    onErrorRef.current = onError
  }, [onChunk, onError])

  useEffect(() => {
    if (!enabled || !stream || stream.getAudioTracks().length === 0) {
      return undefined
    }

    let recorder
    try {
      recorder = new MediaRecorder(stream, { mimeType: chooseMimeType() || undefined })
    } catch (error) {
      onErrorRef.current?.(error)
      return undefined
    }

    recorder.ondataavailable = async (event) => {
      if (!event.data || event.data.size < 1024) return
      try {
        await onChunkRef.current?.(event.data)
      } catch (error) {
        onErrorRef.current?.(error)
      }
    }

    recorder.onerror = (event) => {
      onErrorRef.current?.(event.error || new Error('Audio recorder failed'))
    }

    recorder.start(chunkMs)

    return () => {
      if (recorder.state !== 'inactive') recorder.stop()
    }
  }, [stream, chunkMs, enabled])
}
