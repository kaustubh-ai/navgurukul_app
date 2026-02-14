const RETRY_BASE_MS = 800

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout(timeoutMs = 45000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, cleanup: () => clearTimeout(timeout) }
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text
  }

  const chunks = []
  for (const out of payload?.output || []) {
    for (const content of out?.content || []) {
      if (typeof content?.text === 'string') chunks.push(content.text)
    }
  }

  return chunks.join('\n').trim()
}

function parseJsonMaybe(text) {
  if (!text) return null
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  return JSON.parse(cleaned)
}

async function fetchWithRetry(fn, retries = 2) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await delay(RETRY_BASE_MS * (attempt + 1))
      }
    }
  }
  throw lastError
}

function createJsonPrompt(system, user) {
  return {
    input: [
      {
        role: 'system',
        content: [{ type: 'input_text', text: system }],
      },
      {
        role: 'user',
        content: [{ type: 'input_text', text: user }],
      },
    ],
  }
}

export function createOpenAiClient({ apiKey, baseUrl = 'https://api.openai.com/v1', models }) {
  async function responsesJson({ system, user, model, maxOutputTokens = 500, temperature = 0.2, timeoutMs = 45000 }) {
    if (!apiKey) throw new Error('Missing OpenAI API key')

    return fetchWithRetry(async () => {
      const { signal, cleanup } = withTimeout(timeoutMs)
      try {
        const response = await fetch(`${baseUrl}/responses`, {
          method: 'POST',
          signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            ...createJsonPrompt(system, user),
            max_output_tokens: maxOutputTokens,
            temperature,
            text: { format: { type: 'json_object' } },
          }),
        })

        if (!response.ok) {
          const detail = await response.text()
          throw new Error(`OpenAI responses failed (${response.status}): ${detail}`)
        }

        const payload = await response.json()
        const text = extractOutputText(payload)
        return parseJsonMaybe(text)
      } finally {
        cleanup()
      }
    })
  }

  async function transcribeAudio(blob) {
    if (!apiKey) throw new Error('Missing OpenAI API key')

    return fetchWithRetry(async () => {
      const { signal, cleanup } = withTimeout(60000)
      try {
        const formData = new FormData()
        formData.append('model', models.stt)
        formData.append('file', blob, `chunk-${Date.now()}.webm`)

        const response = await fetch(`${baseUrl}/audio/transcriptions`, {
          method: 'POST',
          signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const detail = await response.text()
          throw new Error(`STT failed (${response.status}): ${detail}`)
        }

        const payload = await response.json()
        return (payload?.text || '').trim()
      } finally {
        cleanup()
      }
    })
  }

  async function ocrFromImageDataUrl(imageDataUrl) {
    if (!apiKey) throw new Error('Missing OpenAI API key')

    return fetchWithRetry(async () => {
      const { signal, cleanup } = withTimeout(45000)
      try {
        const response = await fetch(`${baseUrl}/responses`, {
          method: 'POST',
          signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: models.vision,
            input: [
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: 'Extract visible on-screen text. Return strict JSON: {"text":"...","confidence":0..1}. Keep it concise and useful for interview grounding.',
                  },
                  {
                    type: 'input_image',
                    image_url: imageDataUrl,
                  },
                ],
              },
            ],
            max_output_tokens: 500,
            text: { format: { type: 'json_object' } },
          }),
        })

        if (!response.ok) {
          const detail = await response.text()
          throw new Error(`OCR failed (${response.status}): ${detail}`)
        }

        const payload = await response.json()
        const text = extractOutputText(payload)
        const json = parseJsonMaybe(text)
        return {
          text: json?.text || '',
          confidence: typeof json?.confidence === 'number' ? json.confidence : 0.5,
        }
      } finally {
        cleanup()
      }
    })
  }

  async function updateRollingSummary(input) {
    const system = 'You are an interview context summarizer. Output strict JSON with keys summary, key_points, open_threads, terminology.'
    const user = JSON.stringify(input)
    return responsesJson({
      system,
      user,
      model: models.reasoning,
      maxOutputTokens: 700,
      temperature: 0.1,
    })
  }

  async function generateNextQuestion(input) {
    const system = 'Generate one grounded interview question. Output strict JSON with keys question, intent, difficulty, grounding{from_transcript,from_ocr}, followup_triggers.'
    const user = JSON.stringify(input)
    return responsesJson({
      system,
      user,
      model: models.reasoning,
      maxOutputTokens: 500,
      temperature: 0.3,
    })
  }

  async function generateFollowup(input) {
    const system = 'Generate one concise follow-up question grounded in evidence. Output strict JSON with keys followup, reason, grounding{from_transcript,from_ocr}.'
    const user = JSON.stringify(input)
    return responsesJson({
      system,
      user,
      model: models.reasoning,
      maxOutputTokens: 350,
      temperature: 0.2,
    })
  }

  async function generateFinalEvaluation(input) {
    const system = 'Evaluate an interview. Output strict JSON with keys scores{technicalDepth,clarity,originality,implementationUnderstanding}, overall, strengths[], improvements[], evidence[{claim,quote,source}]. Keep scores 0-10.'
    const user = JSON.stringify(input)
    return responsesJson({
      system,
      user,
      model: models.reasoning,
      maxOutputTokens: 900,
      temperature: 0.2,
    })
  }

  return {
    transcribeAudio,
    ocrFromImageDataUrl,
    updateRollingSummary,
    generateNextQuestion,
    generateFollowup,
    generateFinalEvaluation,
  }
}
