export function LandingPage({ onStartLive, onStartRecord, hasApiKey, onOpenSettings }) {
  return (
    <main className="page page-landing">
      <section className="hero panel">
        <p className="eyebrow">AI-Driven Automated Interviewer</p>
        <h1>Live Project Interview, Fully Client-side</h1>
        <p>
          This app captures screen share + audio, extracts transcript and OCR evidence,
          then runs an adaptive technical interview and generates a rubric-based report.
        </p>
        <div className="row-actions">
          <button className="btn btn-primary" type="button" onClick={onStartLive} disabled={!hasApiKey}>
            Start Live Interview
          </button>
          <button className="btn btn-secondary" type="button" onClick={onStartRecord} disabled={!hasApiKey}>
            Start Record-Then-Interview
          </button>
          <button className="btn btn-ghost" type="button" onClick={onOpenSettings}>
            Open Settings
          </button>
        </div>
        {!hasApiKey && <p className="muted">Add an OpenAI key in Settings to begin.</p>}
      </section>
    </main>
  )
}
