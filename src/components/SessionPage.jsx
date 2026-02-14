import { useEffect, useMemo, useState } from 'react'
import { ScreenShareButton } from './capture/ScreenShareButton'
import { MicToggle } from './capture/MicToggle'
import { AudioMixToggle } from './capture/AudioMixToggle'
import { ScreenPreview } from './capture/ScreenPreview'
import { CaptureStatusBar } from './capture/CaptureStatusBar'
import { TranscriptPanel } from './panels/TranscriptPanel'
import { OCRPanel } from './panels/OCRPanel'
import { ArtifactsTimeline } from './panels/ArtifactsTimeline'
import { QuestionCard } from './interview/QuestionCard'
import { AnswerInput } from './interview/AnswerInput'
import { FollowUpQueue } from './interview/FollowUpQueue'
import { elapsedSeconds, formatElapsed } from '../utils/time'

function toArtifacts({ transcriptSegments, ocrResults, questions, answers, startedAt }) {
  const startMs = startedAt ? new Date(startedAt).getTime() : Date.now()
  const transcriptItems = transcriptSegments.map((item) => ({
    id: item.id,
    timestamp: new Date(startMs + (item.t1 || 0) * 1000).toISOString(),
    text: item.text,
    type: 'transcript',
  }))

  const ocrItems = ocrResults.map((item) => ({
    id: item.id,
    timestamp: item.timestamp,
    text: item.text,
    type: 'ocr',
  }))

  const questionItems = questions.map((item) => ({
    id: item.id,
    timestamp: item.timestamp,
    text: item.text,
    type: 'question',
  }))

  const answerItems = answers.map((item) => ({
    id: item.id,
    timestamp: item.timestamp,
    text: item.text,
    type: 'answer',
  }))

  return [...transcriptItems, ...ocrItems, ...questionItems, ...answerItems].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
}

export function SessionPage({
  controller,
  settings,
  onUpdateSettings,
  onBack,
}) {
  const [_tick, setTick] = useState(0)
  const [importantIds, setImportantIds] = useState(() => new Set())
  const [repeatPulse, setRepeatPulse] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const elapsed = controller.session ? formatElapsed(elapsedSeconds(controller.session.startedAt)) : '00:00'
  const artifacts = useMemo(
    () =>
      toArtifacts({
        transcriptSegments: controller.transcriptSegments,
        ocrResults: controller.ocrResults,
        questions: controller.questions,
        answers: controller.answers,
        startedAt: controller.session?.startedAt,
      }),
    [controller.answers, controller.ocrResults, controller.questions, controller.session?.startedAt, controller.transcriptSegments],
  )

  const compatibilityHint = navigator.userAgent.includes('Chrome')
    ? 'Browser: Chromium-compatible'
    : 'Recommended browser: Chromium for better screen-audio support'

  return (
    <main className="page page-session">
      <header className="session-header">
        <h2>Interview Session</h2>
        <div className="row-actions">
          <button className="btn btn-ghost" type="button" onClick={onBack}>Back</button>
        </div>
      </header>

      <p className="banner">{compatibilityHint}</p>
      <CaptureStatusBar
        status={controller.sessionStatus}
        elapsed={elapsed}
        mode={controller.session?.mode || 'n/a'}
        onStop={controller.stopSession}
      />

      <section className="panel control-strip">
        <ScreenShareButton active={Boolean(controller.displayStream)} onStart={controller.beginCapture} />
        <MicToggle enabled={controller.micEnabled} onToggle={controller.toggleMic} />
        <AudioMixToggle enabled={settings.useAudioMix} onToggle={() => onUpdateSettings({ ...settings, useAudioMix: !settings.useAudioMix })} />
        <button className="btn btn-secondary" type="button" onClick={() => controller.askNextQuestion()}>
          Ask Question Now
        </button>
      </section>

      {!!controller.error && <div className="warning-box">{controller.error}</div>}
      {!controller.hasDisplayAudio && controller.displayStream && !controller.micEnabled && (
        <div className="warning-box">No display audio detected. Enable microphone to capture speech.</div>
      )}

      <div className="grid-2">
        <ScreenPreview videoRef={controller.videoRef} isCapturing={Boolean(controller.displayStream)} />
        <QuestionCard
          question={controller.currentQuestion}
          onRepeat={() => setRepeatPulse((value) => value + 1)}
          onSkip={controller.skipQuestion}
          onFollowup={controller.askFollowupNow}
        />
      </div>

      <div className={`panel repeat-badge ${repeatPulse % 2 ? 'flash' : ''}`}>
        Repeat count: {repeatPulse}
      </div>

      <AnswerInput disabled={!controller.currentQuestion} onSubmit={(text) => controller.submitAnswer({ text, source: 'typed' })} />

      <div className="grid-3">
        <TranscriptPanel segments={controller.transcriptSegments} />
        <OCRPanel
          items={controller.ocrResults}
          importantIds={importantIds}
          onToggleImportant={(id) => {
            setImportantIds((prev) => {
              const next = new Set(prev)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })
          }}
        />
        <ArtifactsTimeline artifacts={artifacts} />
      </div>

      <FollowUpQueue queue={controller.followupQueue || []} />

      {controller.modelPayloadPreview && (
        <section className="panel">
          <header className="panel-header">
            <h3>Model Payload Transparency</h3>
          </header>
          <pre className="payload-preview">{JSON.stringify(controller.modelPayloadPreview, null, 2)}</pre>
        </section>
      )}
    </main>
  )
}
