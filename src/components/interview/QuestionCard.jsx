export function QuestionCard({ question, onRepeat, onSkip, onFollowup }) {
  return (
    <section className="panel question-card">
      <header className="panel-header">
        <h3>Current Question</h3>
      </header>
      {question ? (
        <>
          <p className="question-text">{question.text}</p>
          <div className="row-meta">
            <span className="badge">intent: {question.intent}</span>
            <span className="badge">difficulty: {question.difficulty}</span>
          </div>
          <div className="row-actions">
            <button className="btn btn-ghost" type="button" onClick={onRepeat}>Repeat</button>
            <button className="btn btn-secondary" type="button" onClick={onSkip}>Skip</button>
            <button className="btn btn-accent" type="button" onClick={onFollowup}>Ask follow-up now</button>
          </div>
        </>
      ) : (
        <p className="muted">Waiting for enough context to ask the first question.</p>
      )}
    </section>
  )
}
