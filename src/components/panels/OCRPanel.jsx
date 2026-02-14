import { formatClock } from '../../utils/time'

export function OCRPanel({ items, importantIds, onToggleImportant }) {
  const copyText = async (text) => {
    await navigator.clipboard.writeText(text)
  }

  return (
    <section className="panel">
      <header className="panel-header">
        <h3>OCR Feed</h3>
      </header>
      <div className="scroll-area">
        {items.map((item) => (
          <article key={item.id} className="feed-item">
            <div className="feed-meta">
              <span>{formatClock(item.timestamp)}</span>
              <span>conf: {item.confidence?.toFixed?.(2) || item.confidence}</span>
            </div>
            <p>{item.text}</p>
            <div className="row-actions">
              <button type="button" className="btn btn-ghost" onClick={() => copyText(item.text)}>Copy text</button>
              <button
                type="button"
                className={`btn ${importantIds.has(item.id) ? 'btn-warning' : 'btn-ghost'}`}
                onClick={() => onToggleImportant(item.id)}
              >
                {importantIds.has(item.id) ? 'Important' : 'Mark important'}
              </button>
            </div>
          </article>
        ))}
        {!items.length && <p className="muted">No OCR artifacts yet.</p>}
      </div>
    </section>
  )
}
