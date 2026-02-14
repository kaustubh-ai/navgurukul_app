export function AudioMixToggle({ enabled, onToggle }) {
  return (
    <button className={`btn ${enabled ? 'btn-accent' : 'btn-secondary'}`} onClick={onToggle} type="button">
      {enabled ? 'Audio Mix On' : 'Audio Mix Off'}
    </button>
  )
}
