import { useMemo, useState } from 'react'

export function TranscriptPanel({ segments }) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return segments
    return segments.filter((item) => item.source === filter)
  }, [filter, segments])

  return (
    <section className="panel">
      <header className="panel-header panel-header-inline">
        <h3>Transcript</h3>
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All</option>
          <option value="presenter">Presenter</option>
          <option value="answer">Answer</option>
        </select>
      </header>
      <div className="scroll-area">
        {filtered.map((segment) => (
          <article key={segment.id} className="feed-item">
            <div className="feed-meta">
              <span>{segment.source}</span>
              <span>{segment.t0}s-{segment.t1}s</span>
            </div>
            <p>{segment.text}</p>
          </article>
        ))}
        {!filtered.length && <p className="muted">No transcript yet.</p>}
      </div>
    </section>
  )
}
