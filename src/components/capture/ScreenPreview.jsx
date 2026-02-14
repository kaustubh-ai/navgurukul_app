export function ScreenPreview({ videoRef, isCapturing }) {
  return (
    <section className="panel preview-panel">
      <header className="panel-header">
        <h3>Screen Preview</h3>
        <div className="badge-row">
          <span className={`badge ${isCapturing ? 'badge-live' : 'badge-idle'}`}>{isCapturing ? 'Recording' : 'Idle'}</span>
          <span className="badge">OCR Sampling</span>
          <span className="badge">STT Chunking</span>
        </div>
      </header>
      <video ref={videoRef} autoPlay playsInline muted className="preview-video" />
    </section>
  )
}
