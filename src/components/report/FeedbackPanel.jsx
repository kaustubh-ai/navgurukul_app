export function FeedbackPanel({ report }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h3>Feedback</h3>
      </header>
      <div className="two-col">
        <div>
          <h4>Strengths</h4>
          <ul className="simple-list">
            {(report?.strengths || []).map((item, idx) => (
              <li key={`strength-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Improvements</h4>
          <ul className="simple-list">
            {(report?.improvements || []).map((item, idx) => (
              <li key={`improve-${idx}`}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
