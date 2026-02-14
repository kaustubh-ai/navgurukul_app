export function FollowUpQueue({ queue }) {
  return (
    <section className="panel">
      <header className="panel-header">
        <h3>Follow-up Queue</h3>
      </header>
      {queue.length ? (
        <ul className="simple-list">
          {queue.slice(0, 5).map((item, idx) => (
            <li key={`${item.ask || item.followup || 'follow'}-${idx}`}>{item.ask || item.followup}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">No queued follow-ups.</p>
      )}
    </section>
  )
}
