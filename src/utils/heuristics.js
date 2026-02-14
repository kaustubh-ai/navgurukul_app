const CODE_TOKENS = ['import ', 'class ', 'def ', 'function ', '=>', '{}', 'const ', 'let ', 'var ', ';']
const DIAGRAM_TOKENS = ['api', 'db', 'database', 'service', 'queue', 'cache', 'pipeline', '->', '=>', 'diagram', 'flow']
const BROWSER_TOKENS = ['address bar', 'new tab', 'bookmark', 'history', 'search']
const TERMINAL_TOKENS = ['$ ', 'npm ', 'pnpm ', 'yarn ', 'error:', 'warning:', 'stack trace', 'bash', 'zsh']

function countMatches(text, tokens) {
  const lower = text.toLowerCase()
  return tokens.reduce((sum, token) => sum + (lower.includes(token) ? 1 : 0), 0)
}

export function detectScreenHint(text) {
  if (!text || !text.trim()) {
    return { type: 'unknown', confidence: 0 }
  }

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  const shortLineRatio = lines.length ? lines.filter((line) => line.length < 60).length / lines.length : 0
  const bulletCount = lines.filter((line) => /^[-*\d.)]/.test(line)).length

  const codeScore = countMatches(text, CODE_TOKENS) + (text.match(/[{};]/g)?.length || 0) / 10
  const diagramScore = countMatches(text, DIAGRAM_TOKENS)
  const browserScore = countMatches(text, BROWSER_TOKENS)
  const terminalScore = countMatches(text, TERMINAL_TOKENS)
  const slideScore = shortLineRatio * 2 + (bulletCount > 2 ? 1.5 : 0)

  const scored = [
    ['code', codeScore],
    ['slides', slideScore],
    ['diagram', diagramScore],
    ['browser', browserScore],
    ['terminal', terminalScore],
  ]

  scored.sort((a, b) => b[1] - a[1])
  const [bestType, bestScore] = scored[0]
  const total = scored.reduce((sum, [, score]) => sum + score, 0)

  if (bestScore < 1) {
    return { type: 'unknown', confidence: 0.25 }
  }

  const confidence = Math.min(0.95, Math.max(0.35, total ? bestScore / total : 0.4))
  return { type: bestType, confidence: Number(confidence.toFixed(2)) }
}

export function isMeaningfulOcr(text) {
  if (!text) return false
  const trimmed = text.trim()
  if (trimmed.length < 20) return false
  const alpha = trimmed.replace(/[^a-zA-Z]/g, '')
  return alpha.length > 12
}
