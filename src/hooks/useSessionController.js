import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useScreenCapture } from './useScreenCapture'
import { useMicCapture } from './useMicCapture'
import { useAudioMixer } from './useAudioMixer'
import { useAudioChunker } from './useAudioChunker'
import { useOcrSampler } from './useOcrSampler'
import { useInterviewEngine } from './useInterviewEngine'
import { createOpenAiClient } from '../services/openaiClient'
import { recognizeLocalText, terminateLocalOcr } from '../services/localOcr'
import { buildContextPacket, buildSummaryInput, compressOcrText, dedupeDelta, selectRecentEvidence } from '../services/contextBuilder'
import { storage } from '../services/storage'
import { makeAnswer, makeOcrResult, makeQuestion, makeSession, makeTranscriptSegment, emptyReport } from '../types/contracts'
import { elapsedSeconds, nowIso } from '../utils/time'
import { isMeaningfulOcr } from '../utils/heuristics'

function snapshotSettings(settings) {
  return {
    sttChunkSec: settings.sttChunkSec,
    ocrIntervalSec: settings.ocrIntervalSec,
    summaryIntervalSec: settings.summaryIntervalSec,
    maxQuestions: settings.maxQuestions,
    useAudioMix: settings.useAudioMix,
    storeScreenshotsLocally: settings.storeScreenshotsLocally,
    ocrMode: settings.ocrMode,
    models: settings.models,
  }
}

function normalizeReport(maybeReport) {
  const fallback = emptyReport()
  if (!maybeReport) return fallback

  const score = (v) => Math.max(0, Math.min(10, Number(v) || 0))

  return {
    scores: {
      technicalDepth: score(maybeReport?.scores?.technicalDepth),
      clarity: score(maybeReport?.scores?.clarity),
      originality: score(maybeReport?.scores?.originality),
      implementationUnderstanding: score(maybeReport?.scores?.implementationUnderstanding),
    },
    overall: score(maybeReport?.overall),
    strengths: Array.isArray(maybeReport?.strengths) ? maybeReport.strengths.slice(0, 8) : [],
    improvements: Array.isArray(maybeReport?.improvements) ? maybeReport.improvements.slice(0, 8) : [],
    evidence: Array.isArray(maybeReport?.evidence)
      ? maybeReport.evidence
          .filter((e) => e?.claim && e?.quote && e?.source)
          .slice(0, 16)
          .map((item) => ({
            claim: String(item.claim),
            quote: String(item.quote),
            source: ['transcript', 'ocr', 'answer'].includes(item.source) ? item.source : 'transcript',
          }))
      : [],
  }
}

function computeFallbackReport({ transcriptSegments, ocrResults, answers }) {
  const fallback = emptyReport()
  const transcriptChars = transcriptSegments.reduce((sum, item) => sum + (item.text?.length || 0), 0)
  const answerChars = answers.reduce((sum, item) => sum + (item.text?.length || 0), 0)
  const ocrChars = ocrResults.reduce((sum, item) => sum + (item.text?.length || 0), 0)

  const technicalDepth = Math.min(10, 2 + Math.floor((answerChars + ocrChars) / 450))
  const clarity = Math.min(10, 2 + Math.floor(answerChars / 300))
  const originality = Math.min(10, 2 + Math.floor(ocrChars / 600))
  const implementationUnderstanding = Math.min(10, 2 + Math.floor(transcriptChars / 450))
  const overall = Number(((technicalDepth + clarity + originality + implementationUnderstanding) / 4).toFixed(1))

  fallback.scores = { technicalDepth, clarity, originality, implementationUnderstanding }
  fallback.overall = overall
  fallback.strengths = ['Presented enough artifacts to support an interview baseline.']
  fallback.improvements = ['Connect richer implementation evidence to each answer.']
  fallback.evidence = [
    {
      claim: 'Fallback scoring based on captured evidence volume',
      quote: `transcript=${transcriptChars} chars, ocr=${ocrChars} chars, answers=${answerChars} chars`,
      source: 'transcript',
    },
  ]

  return fallback
}

export function useSessionController({ settings, onSessionDone }) {
  const videoRef = useRef(null)
  const seenTranscriptSetRef = useRef(new Set())
  const seenOcrSetRef = useRef(new Set())
  const questionInFlightRef = useRef(false)

  const [session, setSession] = useState(null)
  const [transcriptSegments, setTranscriptSegments] = useState([])
  const [ocrResults, setOcrResults] = useState([])
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState([])
  const [contextPackets, setContextPackets] = useState([])
  const [rollingSummary, setRollingSummary] = useState('')
  const [summaryMeta, setSummaryMeta] = useState({ key_points: [], open_threads: [], terminology: [] })
  const [currentQuestionId, setCurrentQuestionId] = useState(null)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [lastModelPayload, setLastModelPayload] = useState(null)
  const [isAwaitingAnswer, setIsAwaitingAnswer] = useState(false)

  const {
    displayStream,
    hasDisplayAudio,
    screenError,
    startScreenCapture,
    stopScreenCapture,
  } = useScreenCapture()

  const {
    micStream,
    micEnabled,
    micError,
    startMic,
    stopMic,
  } = useMicCapture()

  const mixedAudioStream = useAudioMixer({
    displayStream,
    micStream,
    enabled: settings.useAudioMix,
  })

  const interviewEngine = useInterviewEngine({
    summaryIntervalSec: settings.summaryIntervalSec,
  })

  const activeAudioStream = useMemo(() => {
    const hasDisplay = displayStream?.getAudioTracks().length
    const hasMic = micStream?.getAudioTracks().length

    if (settings.useAudioMix && mixedAudioStream) {
      return mixedAudioStream
    }

    if (hasDisplay) {
      return new MediaStream([displayStream.getAudioTracks()[0]])
    }

    if (hasMic) {
      return new MediaStream([micStream.getAudioTracks()[0]])
    }

    return null
  }, [displayStream, micStream, mixedAudioStream, settings.useAudioMix])

  const openai = useMemo(() => {
    if (!settings.apiKey) return null
    return createOpenAiClient({
      apiKey: settings.apiKey,
      models: settings.models,
    })
  }, [settings.apiKey, settings.models])

  const currentQuestion = useMemo(() => {
    if (!currentQuestionId) return null
    return questions.find((question) => question.id === currentQuestionId) || null
  }, [currentQuestionId, questions])

  const sessionStatus = session?.status || 'idle'
  const captureEnabled = sessionStatus === 'capturing' || sessionStatus === 'interviewing'

  useEffect(() => {
    if (!videoRef.current) return
    const node = videoRef.current
    node.srcObject = displayStream || null
  }, [displayStream])

  const persistSession = useCallback(
    async (nextSession) => {
      if (!nextSession) return
      await storage.put('sessions', nextSession)
    },
    [],
  )

  const updateSessionStatus = useCallback(
    async (status, extra = {}) => {
      setSession((prev) => {
        if (!prev) return prev
        const next = {
          ...prev,
          ...extra,
          status,
        }
        void persistSession(next)
        return next
      })
    },
    [persistSession],
  )

  const appendContext = useCallback(
    async ({ transcriptDelta = '', ocrDelta = '', lastAnswerDelta = null }) => {
      const packet = buildContextPacket({
        transcriptDelta,
        ocrDelta,
        activeQuestionId: currentQuestionId,
        lastAnswerDelta,
      })
      setContextPackets((prev) => [...prev, packet])
    },
    [currentQuestionId],
  )

  const maybeRefreshSummary = useCallback(
    async (force = false) => {
      if (!session || !openai) return
      const elapsedSec = elapsedSeconds(session.startedAt)
      if (!force && !interviewEngine.shouldRefreshSummary({ elapsedSec })) {
        return
      }

      const qaSnippets = [
        ...questions.slice(-2).map((item) => ({ kind: 'question', text: item.text })),
        ...answers.slice(-2).map((item) => ({ kind: 'answer', text: item.text })),
      ]

      const summaryInput = buildSummaryInput({
        rollingSummary,
        transcript: transcriptSegments,
        ocr: ocrResults,
        qa: qaSnippets,
      })

      setLastModelPayload({ kind: 'rolling_summary', payload: summaryInput })
      const response = await openai.updateRollingSummary(summaryInput)
      if (!response?.summary) return

      setRollingSummary(response.summary)
      setSummaryMeta({
        key_points: Array.isArray(response.key_points) ? response.key_points : [],
        open_threads: Array.isArray(response.open_threads) ? response.open_threads : [],
        terminology: Array.isArray(response.terminology) ? response.terminology : [],
      })

      const nextSession = {
        ...session,
        rollingSummary: response.summary,
      }
      setSession(nextSession)
      await persistSession(nextSession)
    },
    [answers, interviewEngine, ocrResults, openai, persistSession, questions, rollingSummary, session, transcriptSegments],
  )

  const pushQuestion = useCallback(async (rawQuestion) => {
    const normalizedIntent = rawQuestion.intent || 'implementation'
    const normalizedDifficulty = [1, 2, 3].includes(rawQuestion.difficulty) ? rawQuestion.difficulty : 1
    const nextQuestion = makeQuestion({
      text: rawQuestion.question,
      intent: normalizedIntent,
      difficulty: normalizedDifficulty,
      grounding: {
        fromTranscript: rawQuestion.grounding?.from_transcript || [],
        fromOcr: rawQuestion.grounding?.from_ocr || [],
      },
    })

    setQuestions((prev) => [...prev, nextQuestion])
    setCurrentQuestionId(nextQuestion.id)
    setIsAwaitingAnswer(true)
    interviewEngine.registerAskedIntent(normalizedIntent)
    await storage.put('questions', nextQuestion)
    await updateSessionStatus('interviewing')

    return nextQuestion
  }, [interviewEngine, updateSessionStatus])

  const askNextQuestion = useCallback(
    async ({ forceFollowup = false } = {}) => {
      if (!session || questionInFlightRef.current) return
      if (!forceFollowup && isAwaitingAnswer) return
      if (interviewEngine.questionCount >= settings.maxQuestions) return

      questionInFlightRef.current = true
      try {
        await maybeRefreshSummary(false)

        const transcriptSnippets = selectRecentEvidence(transcriptSegments, 5)
        const ocrSnippets = selectRecentEvidence(ocrResults, 5)
        const lastQuestion = questions[questions.length - 1] || null
        const lastAnswer = answers[answers.length - 1] || null
        const desiredIntent = interviewEngine.nextIntent()

        let candidateQuestion = null

        if (openai && forceFollowup && lastQuestion && lastAnswer) {
          const followupInput = {
            current_question: lastQuestion.text,
            answer: lastAnswer.text,
            evidence_deltas: {
              transcript: transcriptSnippets,
              ocr: ocrSnippets,
            },
          }
          setLastModelPayload({ kind: 'generate_followup', payload: followupInput })
          const followup = await openai.generateFollowup(followupInput)
          if (followup?.followup) {
            candidateQuestion = {
              question: followup.followup,
              intent: desiredIntent,
              difficulty: Math.min(3, (lastQuestion.difficulty || 1) + 1),
              grounding: followup.grounding || {
                from_transcript: transcriptSnippets.slice(0, 2),
                from_ocr: ocrSnippets.slice(0, 2),
              },
            }
          }
        }

        if (openai && !candidateQuestion) {
          const questionInput = {
            rolling_summary: rollingSummary,
            top_evidence: {
              transcript: transcriptSnippets,
              ocr: ocrSnippets,
            },
            last_question: lastQuestion?.text || null,
            last_answer: lastAnswer?.text || null,
            desired_intent: desiredIntent,
            difficulty_hint: Math.min(3, 1 + Math.floor(interviewEngine.questionCount / 4)),
          }

          setLastModelPayload({ kind: 'generate_question', payload: questionInput })
          const generated = await openai.generateNextQuestion(questionInput)

          if (generated?.question) {
            candidateQuestion = generated
            if (Array.isArray(generated.followup_triggers)) {
              interviewEngine.enqueueFollowups(generated.followup_triggers)
            }
          }
        }

        if (!candidateQuestion) {
          candidateQuestion = interviewEngine.buildFallbackQuestion({
            intent: desiredIntent,
            transcriptSnippets,
            ocrSnippets,
          })
        }

        await pushQuestion(candidateQuestion)
      } catch {
        const fallbackIntent = interviewEngine.nextIntent()
        const fallback = interviewEngine.buildFallbackQuestion({
          intent: fallbackIntent,
          transcriptSnippets: selectRecentEvidence(transcriptSegments, 3),
          ocrSnippets: selectRecentEvidence(ocrResults, 3),
        })
        await pushQuestion(fallback)
      } finally {
        questionInFlightRef.current = false
      }
    },
    [
      answers,
      interviewEngine,
      isAwaitingAnswer,
      maybeRefreshSummary,
      ocrResults,
      openai,
      pushQuestion,
      questions,
      rollingSummary,
      session,
      settings.maxQuestions,
      transcriptSegments,
    ],
  )

  const transcribeChunk = useCallback(
    async (blob) => {
      if (!session || !openai) return
      const text = await openai.transcribeAudio(blob)
      const delta = dedupeDelta(text, seenTranscriptSetRef.current)
      if (!delta) return

      const t1 = elapsedSeconds(session.startedAt)
      const t0 = Math.max(0, t1 - settings.sttChunkSec)
      const segment = makeTranscriptSegment({
        t0,
        t1,
        text: delta,
        source: isAwaitingAnswer ? 'answer' : 'presenter',
      })

      setTranscriptSegments((prev) => [...prev, segment])
      await storage.put('transcriptSegments', segment)
      await appendContext({ transcriptDelta: delta })
    },
    [appendContext, isAwaitingAnswer, openai, session, settings.sttChunkSec],
  )

  const processOcrFrame = useCallback(
    async ({ dataUrl }) => {
      if (!session || settings.ocrMode === 'disabled') return

      try {
        let ocr = null

        if (settings.ocrMode === 'local') {
          ocr = await recognizeLocalText(dataUrl)
        } else if (settings.ocrMode === 'model' && openai) {
          ocr = await openai.ocrFromImageDataUrl(dataUrl)
        } else {
          return
        }

        const compressed = compressOcrText(ocr?.text || '')
        const delta = dedupeDelta(compressed, seenOcrSetRef.current)
        if (!delta) return

        const result = makeOcrResult({
          text: delta,
          confidence: ocr?.confidence || 0.5,
          imageDataUrl: settings.storeScreenshotsLocally ? dataUrl : undefined,
        })

        setOcrResults((prev) => [...prev, result])
        await storage.put('ocrResults', result)
        await appendContext({ ocrDelta: delta })
      } catch (err) {
        setError(`OCR warning: ${err.message}`)
      }
    },
    [appendContext, openai, session, settings.ocrMode, settings.storeScreenshotsLocally],
  )

  useAudioChunker({
    stream: activeAudioStream,
    chunkMs: settings.sttChunkSec * 1000,
    enabled: captureEnabled,
    onChunk: transcribeChunk,
    onError: (err) => setError(`STT warning: ${err.message}`),
  })

  useOcrSampler({
    videoRef,
    enabled: captureEnabled,
    intervalMs: settings.ocrIntervalSec * 1000,
    onSample: processOcrFrame,
    onError: (err) => setError(`OCR sampler warning: ${err.message}`),
  })

  const startSession = useCallback(
    async (mode = 'live') => {
      interviewEngine.reset()
      seenTranscriptSetRef.current = new Set()
      seenOcrSetRef.current = new Set()

      setTranscriptSegments([])
      setOcrResults([])
      setQuestions([])
      setAnswers([])
      setContextPackets([])
      setRollingSummary('')
      setSummaryMeta({ key_points: [], open_threads: [], terminology: [] })
      setCurrentQuestionId(null)
      setReport(null)
      setError('')
      setLastModelPayload(null)
      setIsAwaitingAnswer(false)

      const created = makeSession(mode, snapshotSettings(settings))
      setSession(created)
      await storage.put('sessions', created)
    },
    [interviewEngine, settings],
  )

  const beginCapture = useCallback(async () => {
    if (!session) return

    try {
      const stream = await startScreenCapture()
      await updateSessionStatus('capturing')
      setError('')

      if (!stream?.getAudioTracks().length) {
        setError('No system/tab audio detected. Enable microphone for reliable transcription.')
      }
    } catch (err) {
      setError(`Capture failed: ${err?.message || 'unknown error'}`)
    }
  }, [session, startScreenCapture, updateSessionStatus])

  const stopSession = useCallback(async () => {
    if (!session) return

    stopScreenCapture()
    stopMic()
    await updateSessionStatus('generating_report')

    let finalReport
    try {
      await maybeRefreshSummary(true)

      if (openai) {
        const input = {
          rolling_summary: rollingSummary,
          transcript: selectRecentEvidence(transcriptSegments, 12),
          ocr: selectRecentEvidence(ocrResults, 12),
          qa: {
            questions: questions.map((item) => item.text),
            answers: answers.map((item) => item.text),
          },
        }
        setLastModelPayload({ kind: 'final_evaluation', payload: input })
        const generated = await openai.generateFinalEvaluation(input)
        finalReport = normalizeReport(generated)
      } else {
        finalReport = computeFallbackReport({ transcriptSegments, ocrResults, answers })
      }
    } catch {
      finalReport = computeFallbackReport({ transcriptSegments, ocrResults, answers })
    }

    setReport(finalReport)

    const endedSession = {
      ...session,
      endedAt: nowIso(),
      rollingSummary,
      status: 'done',
    }
    setSession(endedSession)
    await storage.saveSessionBundle({
      session: endedSession,
      transcriptSegments,
      ocrResults,
      questions,
      answers,
      report: finalReport,
    })

    onSessionDone?.({
      session: endedSession,
      report: finalReport,
      transcriptSegments,
      ocrResults,
      questions,
      answers,
      contextPackets,
      summaryMeta,
    })
  }, [
    answers,
    contextPackets,
    maybeRefreshSummary,
    ocrResults,
    onSessionDone,
    openai,
    questions,
    rollingSummary,
    session,
    stopMic,
    stopScreenCapture,
    summaryMeta,
    transcriptSegments,
    updateSessionStatus,
  ])

  const submitAnswer = useCallback(
    async ({ text, source = 'typed' }) => {
      if (!session || !currentQuestion || !text?.trim()) return
      const answer = makeAnswer({
        questionId: currentQuestion.id,
        text: text.trim(),
        source,
      })

      setAnswers((prev) => [...prev, answer])
      setIsAwaitingAnswer(false)
      await storage.put('answers', answer)
      await appendContext({ lastAnswerDelta: answer.text })

      const shortAnswer = answer.text.split(/\s+/).length < 18
      await askNextQuestion({ forceFollowup: shortAnswer })
    },
    [appendContext, askNextQuestion, currentQuestion, session],
  )

  const askFollowupNow = useCallback(async () => {
    await askNextQuestion({ forceFollowup: true })
  }, [askNextQuestion])

  const skipQuestion = useCallback(async () => {
    setIsAwaitingAnswer(false)
    await askNextQuestion({ forceFollowup: false })
  }, [askNextQuestion])

  const toggleMic = useCallback(async () => {
    try {
      if (micEnabled) {
        stopMic()
      } else {
        await startMic()
      }
    } catch (err) {
      setError(`Mic failed: ${err.message}`)
    }
  }, [micEnabled, startMic, stopMic])

  useEffect(() => {
    if (!session) return
    if (!captureEnabled) return
    if (questionInFlightRef.current || currentQuestionId || isAwaitingAnswer) return

    const transcriptChars = transcriptSegments.reduce((sum, item) => sum + item.text.length, 0)
    const hasMeaningful = ocrResults.some((item) => isMeaningfulOcr(item.text))
    const elapsedSec = elapsedSeconds(session.startedAt)

    if (interviewEngine.questionCount === 0) {
      if (interviewEngine.shouldAskFirstQuestion({
        elapsedSec,
        transcriptChars,
        hasMeaningfulOcr: hasMeaningful,
      })) {
        void askNextQuestion()
      }
    }
  }, [
    askNextQuestion,
    captureEnabled,
    currentQuestionId,
    interviewEngine,
    isAwaitingAnswer,
    ocrResults,
    session,
    transcriptSegments,
  ])

  useEffect(() => {
    if (screenError) setError(`Screen warning: ${screenError}`)
  }, [screenError])

  useEffect(() => {
    if (micError) setError(`Mic warning: ${micError}`)
  }, [micError])

  useEffect(
    () => () => {
      void terminateLocalOcr()
    },
    [],
  )

  const modelPayloadPreview = useMemo(() => {
    if (!settings.showModelPayload) return null
    return lastModelPayload
  }, [lastModelPayload, settings.showModelPayload])

  const sessionBundle = useMemo(() => {
    return {
      session,
      transcriptSegments,
      ocrResults,
      questions,
      answers,
      contextPackets,
      report,
      rollingSummary,
      summaryMeta,
    }
  }, [answers, contextPackets, ocrResults, questions, report, rollingSummary, session, summaryMeta, transcriptSegments])

  return {
    session,
    sessionStatus,
    displayStream,
    hasDisplayAudio,
    micEnabled,
    currentQuestion,
    isAwaitingAnswer,
    transcriptSegments,
    ocrResults,
    questions,
    answers,
    contextPackets,
    rollingSummary,
    summaryMeta,
    report,
    error,
    modelPayloadPreview,
    followupQueue: interviewEngine.followups,
    videoRef,
    sessionBundle,
    startSession,
    beginCapture,
    stopSession,
    toggleMic,
    submitAnswer,
    askFollowupNow,
    skipQuestion,
    askNextQuestion,
  }
}
