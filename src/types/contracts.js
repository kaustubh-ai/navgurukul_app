// Runtime helpers aligned to the spec's TypeScript-style contracts.

import { nowIso } from '../utils/time'

export function makeSession(mode, settingsSnapshot) {
  return {
    id: crypto.randomUUID(),
    mode,
    startedAt: nowIso(),
    endedAt: null,
    settingsSnapshot,
    rollingSummary: '',
    status: 'idle',
  }
}

export function makeTranscriptSegment({ t0, t1, text, source }) {
  return {
    id: crypto.randomUUID(),
    t0,
    t1,
    text,
    source,
  }
}

export function makeOcrResult({ text, confidence, imageDataUrl }) {
  const base = {
    id: crypto.randomUUID(),
    timestamp: nowIso(),
    text,
    confidence,
  }
  if (imageDataUrl) base.imageDataUrl = imageDataUrl
  return base
}

export function makeQuestion(payload) {
  return {
    id: crypto.randomUUID(),
    timestamp: nowIso(),
    text: payload.text,
    intent: payload.intent,
    difficulty: payload.difficulty,
    grounding: payload.grounding,
  }
}

export function makeAnswer(payload) {
  return {
    id: crypto.randomUUID(),
    questionId: payload.questionId,
    timestamp: nowIso(),
    text: payload.text,
    source: payload.source,
  }
}

export function emptyReport() {
  return {
    scores: {
      technicalDepth: 0,
      clarity: 0,
      originality: 0,
      implementationUnderstanding: 0,
    },
    overall: 0,
    strengths: [],
    improvements: [],
    evidence: [],
  }
}
