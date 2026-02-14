export function EvidencePanel({ report }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h3>Evidence</h3>
      </header>
      <div className="scroll-area">
        {(report?.evidence || []).map((item, idx) => (
          <article key={`evidence-${idx}`} className="feed-item">
            <div className="feed-meta">
              <span>{item.source}</span>
            </div>
            <p><strong>{item.claim}</strong></p>
            <blockquote>{item.quote}</blockquote>
          </article>
        ))}
      </div>
    </section>
  )
}
