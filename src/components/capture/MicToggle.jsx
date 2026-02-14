export function MicToggle({ enabled, onToggle }) {
  return (
    <button className={`btn ${enabled ? 'btn-warning' : 'btn-secondary'}`} onClick={onToggle} type="button">
      {enabled ? 'Disable Mic' : 'Enable Mic'}
    </button>
  )
}
