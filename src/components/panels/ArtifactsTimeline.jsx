import { formatClock } from '../../utils/time'

function itemLabel(type) {
  if (type === 'transcript') return 'Transcript'
  if (type === 'ocr') return 'OCR'
  if (type === 'question') return 'Question'
  if (type === 'answer') return 'Answer'
  return type
}

export function ArtifactsTimeline({ artifacts }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h3>Artifacts Timeline</h3>
      </header>
      <div className="scroll-area timeline">
        {artifacts.map((item) => (
          <article key={item.id} className="timeline-item">
            <div className="timeline-label">{itemLabel(item.type)}</div>
            <div className="timeline-body">
              <div className="feed-meta">
                <span>{formatClock(item.timestamp)}</span>
              </div>
              <p>{item.text}</p>
            </div>
          </article>
        ))}
        {!artifacts.length && <p className="muted">Timeline will appear after capture starts.</p>}
      </div>
    </section>
  )
}
