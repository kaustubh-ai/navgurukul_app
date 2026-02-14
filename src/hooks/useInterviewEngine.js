import { useMemo, useRef, useState } from 'react'

const INTENTS = ['architecture', 'implementation', 'tradeoff', 'debugging', 'testing', 'security', 'performance']

const FALLBACK_QUESTIONS = {
  architecture: 'Can you describe the end-to-end architecture and identify the most critical component?',
  implementation: 'Walk me through one core function or module and explain exact implementation steps.',
  tradeoff: 'What tradeoff did you make intentionally, and what alternative did you reject?',
  debugging: 'Tell me about a bug you hit and how you diagnosed and fixed it.',
  testing: 'How did you validate correctness and reliability for this project?',
  security: 'What are the main security/privacy risks here, and what mitigations did you implement?',
  performance: 'Where are the main latency or cost bottlenecks, and how would you optimize them?',
}

export function useInterviewEngine({ summaryIntervalSec }) {
  const [questionCount, setQuestionCount] = useState(0)
  const [followups, setFollowups] = useState([])
  const [intentCounts, setIntentCounts] = useState(() =>
    INTENTS.reduce((acc, intent) => {
      acc[intent] = 0
      return acc
    }, {}),
  )

  const lastSummaryAtRef = useRef(0)

  const shouldAskFirstQuestion = ({ elapsedSec, transcriptChars, hasMeaningfulOcr }) => {
    if (elapsedSec < 10) return false
    if (transcriptChars >= 180) return true
    return hasMeaningfulOcr
  }

  const shouldRefreshSummary = ({ elapsedSec }) => {
    if (!elapsedSec) return false
    if (elapsedSec - lastSummaryAtRef.current >= summaryIntervalSec) {
      lastSummaryAtRef.current = elapsedSec
      return true
    }
    return false
  }

  const nextIntent = useMemo(() => {
    return () => {
      const sorted = [...INTENTS].sort((a, b) => intentCounts[a] - intentCounts[b])
      return sorted[0]
    }
  }, [intentCounts])

  const registerAskedIntent = (intent) => {
    setQuestionCount((count) => count + 1)
    setIntentCounts((counts) => ({
      ...counts,
      [intent]: (counts[intent] || 0) + 1,
    }))
  }

  const enqueueFollowups = (items) => {
    if (!items?.length) return
    setFollowups((curr) => [...curr, ...items])
  }

  const dequeueFollowup = () => {
    if (!followups.length) return null
    const [first, ...rest] = followups
    setFollowups(rest)
    return first
  }

  const buildFallbackQuestion = ({ intent, transcriptSnippets, ocrSnippets }) => {
    return {
      question: FALLBACK_QUESTIONS[intent] || FALLBACK_QUESTIONS.implementation,
      intent,
      difficulty: Math.min(3, Math.max(1, 1 + Math.floor(questionCount / 4))),
      grounding: {
        from_transcript: transcriptSnippets?.slice(0, 2) || [],
        from_ocr: ocrSnippets?.slice(0, 2) || [],
      },
      followup_triggers: [],
    }
  }

  const reset = () => {
    setQuestionCount(0)
    setFollowups([])
    setIntentCounts(
      INTENTS.reduce((acc, intent) => {
        acc[intent] = 0
        return acc
      }, {}),
    )
    lastSummaryAtRef.current = 0
  }

  return {
    questionCount,
    followups,
    shouldAskFirstQuestion,
    shouldRefreshSummary,
    nextIntent,
    registerAskedIntent,
    enqueueFollowups,
    dequeueFollowup,
    buildFallbackQuestion,
    reset,
  }
}
