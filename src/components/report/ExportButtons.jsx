export function ExportButtons({ onExportJson, onExportMarkdown }) {
  return (
    <section className="panel export-buttons">
      <button className="btn btn-primary" type="button" onClick={onExportJson}>Export JSON</button>
      <button className="btn btn-secondary" type="button" onClick={onExportMarkdown}>Export Markdown</button>
    </section>
  )
}
