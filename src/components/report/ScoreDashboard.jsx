export function ScoreDashboard({ report }) {
  const scores = report?.scores || {}

  return (
    <section className="panel">
      <header className="panel-header">
        <h3>Score Dashboard</h3>
      </header>
      <div className="score-grid">
        <article>
          <h4>Technical Depth</h4>
          <p>{scores.technicalDepth}/10</p>
        </article>
        <article>
          <h4>Clarity</h4>
          <p>{scores.clarity}/10</p>
        </article>
        <article>
          <h4>Originality</h4>
          <p>{scores.originality}/10</p>
        </article>
        <article>
          <h4>Implementation Understanding</h4>
          <p>{scores.implementationUnderstanding}/10</p>
        </article>
      </div>
      <div className="overall">Overall: {report?.overall}/10</div>
    </section>
  )
}
