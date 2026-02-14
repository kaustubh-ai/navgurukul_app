export function CaptureStatusBar({ status, elapsed, mode, onStop }) {
  return (
    <div className="status-bar panel">
      <div>
        <strong>Status:</strong> {status}
      </div>
      <div>
        <strong>Mode:</strong> {mode}
      </div>
      <div>
        <strong>Timer:</strong> {elapsed}
      </div>
      <button className="btn btn-danger" onClick={onStop} type="button" disabled={status === 'done' || status === 'idle'}>
        Stop Session
      </button>
    </div>
  )
}
