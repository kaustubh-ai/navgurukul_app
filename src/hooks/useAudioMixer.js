import { useEffect, useMemo } from 'react'

export function useAudioMixer({ displayStream, micStream, enabled }) {
  const mixedStream = useMemo(() => {
    if (!enabled || !displayStream || !micStream) return null

    const displayAudioTracks = displayStream.getAudioTracks()
    const micAudioTracks = micStream.getAudioTracks()

    if (!displayAudioTracks.length || !micAudioTracks.length) return null

    const context = new AudioContext()
    const destination = context.createMediaStreamDestination()
    const systemSource = context.createMediaStreamSource(new MediaStream([displayAudioTracks[0]]))
    const micSource = context.createMediaStreamSource(new MediaStream([micAudioTracks[0]]))

    systemSource.connect(destination)
    micSource.connect(destination)

    const stream = destination.stream
    stream.__cleanup = () => {
      systemSource.disconnect()
      micSource.disconnect()
      destination.stream.getTracks().forEach((track) => track.stop())
      context.close()
    }

    return stream
  }, [displayStream, micStream, enabled])

  useEffect(
    () => () => {
      mixedStream?.__cleanup?.()
    },
    [mixedStream],
  )

  return mixedStream
}
