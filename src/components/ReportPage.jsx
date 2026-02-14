import { ScoreDashboard } from './report/ScoreDashboard'
import { FeedbackPanel } from './report/FeedbackPanel'
import { EvidencePanel } from './report/EvidencePanel'
import { ExportButtons } from './report/ExportButtons'
import { buildReportMarkdown, downloadFile } from '../utils/export'

export function ReportPage({ bundle, onBack }) {
  const report = bundle?.report

  const exportJson = () => {
    downloadFile(
      `interview-session-${bundle?.session?.id || 'report'}.json`,
      JSON.stringify(bundle, null, 2),
      'application/json',
    )
  }

  const exportMarkdown = () => {
    const md = buildReportMarkdown({
      session: bundle?.session,
      report,
      questions: bundle?.questions || [],
      answers: bundle?.answers || [],
    })

    downloadFile(`interview-report-${bundle?.session?.id || 'report'}.md`, md, 'text/markdown')
  }

  return (
    <main className="page page-report">
      <header className="session-header">
        <h2>Final Evaluation Report</h2>
        <button className="btn btn-ghost" type="button" onClick={onBack}>Back to Landing</button>
      </header>

      {!report ? (
        <section className="panel">
          <p>No report generated yet.</p>
        </section>
      ) : (
        <>
          <ScoreDashboard report={report} />
          <FeedbackPanel report={report} />
          <EvidencePanel report={report} />
          <ExportButtons onExportJson={exportJson} onExportMarkdown={exportMarkdown} />
        </>
      )}
    </main>
  )
}
