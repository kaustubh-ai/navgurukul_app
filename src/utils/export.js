export function downloadFile(filename, content, contentType) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function buildReportMarkdown({ session, report, questions, answers }) {
  const lines = []
  lines.push(`# Interview Report: ${session?.id || 'session'}`)
  lines.push('')
  lines.push(`- Started: ${session?.startedAt || 'n/a'}`)
  lines.push(`- Ended: ${session?.endedAt || 'n/a'}`)
  lines.push(`- Overall: ${report?.overall ?? 'n/a'}/10`)
  lines.push('')
  lines.push('## Scores')
  lines.push(`- Technical Depth: ${report?.scores?.technicalDepth ?? 'n/a'}/10`)
  lines.push(`- Clarity: ${report?.scores?.clarity ?? 'n/a'}/10`)
  lines.push(`- Originality: ${report?.scores?.originality ?? 'n/a'}/10`)
  lines.push(`- Implementation Understanding: ${report?.scores?.implementationUnderstanding ?? 'n/a'}/10`)
  lines.push('')
  lines.push('## Strengths')
  for (const item of report?.strengths || []) lines.push(`- ${item}`)
  lines.push('')
  lines.push('## Improvements')
  for (const item of report?.improvements || []) lines.push(`- ${item}`)
  lines.push('')
  lines.push('## Evidence')
  for (const ev of report?.evidence || []) {
    lines.push(`- **${ev.claim}** (${ev.source}): "${ev.quote}"`)
  }
  lines.push('')
  lines.push('## Q/A')
  for (const q of questions || []) {
    lines.push(`- Q (${q.intent}, d${q.difficulty}): ${q.text}`)
    const answer = (answers || []).find((a) => a.questionId === q.id)
    if (answer) lines.push(`  - A: ${answer.text}`)
  }

  return lines.join('\n')
}
