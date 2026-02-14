import { detectScreenHint } from '../utils/heuristics'
import { nowIso } from '../utils/time'

export function compressOcrText(rawText) {
  if (!rawText) return ''
  const text = rawText.trim()
  if (text.length <= 1200) return text

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const filenames = lines.filter((line) => /\.(js|jsx|ts|tsx|py|java|go|rs|md|json|yaml|yml)/i.test(line)).slice(0, 8)
  const symbols = lines.filter((line) => /(class|function|def|const|let|interface|type)\s+/i.test(line)).slice(0, 12)
  const flagged = lines.filter((line) => /(todo|bug|error|fail|warning)/i.test(line)).slice(0, 10)
  const head = lines.slice(0, 8)
  const tail = lines.slice(-8)

  return [
    'COMPRESSED_OCR',
    ...new Set([...filenames, ...symbols, ...flagged, ...head, ...tail]),
  ].join('\n').slice(0, 2400)
}

export function buildContextPacket({ transcriptDelta, ocrDelta, activeQuestionId, lastAnswerDelta }) {
  return {
    id: crypto.randomUUID(),
    timestamp: nowIso(),
    transcriptDelta: transcriptDelta || '',
    ocrDelta: ocrDelta || '',
    screenHint: detectScreenHint(ocrDelta || ''),
    activeQuestionId: activeQuestionId || null,
    lastAnswerDelta: lastAnswerDelta || null,
  }
}

export function dedupeDelta(nextText, seenSet) {
  const text = (nextText || '').trim()
  if (!text || seenSet.has(text)) return ''
  seenSet.add(text)
  return text
}

export function selectRecentEvidence(items, limit = 5, pickText = (x) => x.text) {
  return [...items]
    .slice(-limit)
    .map((item) => pickText(item))
    .filter(Boolean)
}

export function buildSummaryInput({ rollingSummary, transcript, ocr, qa }) {
  return {
    rollingSummary,
    transcriptSnippets: selectRecentEvidence(transcript, 5),
    ocrSnippets: selectRecentEvidence(ocr, 5),
    qaSnippets: selectRecentEvidence(qa, 4, (item) => `${item.kind}: ${item.text}`),
  }
}
