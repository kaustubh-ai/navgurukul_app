export function ScreenShareButton({ active, onStart }) {
  return (
    <button className={`btn ${active ? 'btn-muted' : 'btn-primary'}`} onClick={onStart} type="button" disabled={active}>
      {active ? 'Screen Shared' : 'Start Screen Share'}
    </button>
  )
}
