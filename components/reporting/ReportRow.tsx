import Link from 'next/link'
import type { ReportListItem, ReportStatus } from '@/lib/reporting/types'

const statusClass: Record<ReportStatus, string> = {
  draft: 'pill',
  review: 'pill warn',
  approved: 'pill ok',
  sent: 'pill accent',
}

const statusLabel: Record<ReportStatus, string> = {
  draft: 'Draft',
  review: 'In review',
  approved: 'Approved',
  sent: 'Sent',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return '—'
  const s = fmtDate(start)
  const e = fmtDate(end)
  return s === e ? s : `${s} – ${e}`
}

const buttonStyleBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '5px 10px',
  fontSize: 11,
  fontWeight: 500,
  border: '1px solid var(--line)',
  borderRadius: 6,
  background: 'var(--bg-elev)',
  color: 'var(--ink)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

const buttonStyleDisabled: React.CSSProperties = {
  ...buttonStyleBase,
  color: 'var(--ink-3)',
  cursor: 'not-allowed',
  opacity: 0.5,
  background: 'var(--bg-sunken)',
}

export function ReportRow({ report }: { report: ReportListItem }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        padding: '12px 14px',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <Link
          href={`/reporting/reports/${report.id}`}
          style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', textDecoration: 'none' }}
        >
          {report.title || 'Untitled report'}
        </Link>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
          {fmtPeriod(report.reportPeriodStart, report.reportPeriodEnd)}
          {report.clientName ? ` · ${report.clientName}` : ''}
          {report.siteName ? ` · ${report.siteName}` : ''}
          {' · created ' + fmtDate(report.createdAt)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span className={statusClass[report.status]}>
          <span className="dot" />
          {statusLabel[report.status]}
        </span>
        {report.pdfUrl ? (
          <a href={report.pdfUrl} target="_blank" rel="noopener noreferrer" style={buttonStyleBase}>
            Open PDF
          </a>
        ) : (
          <span style={buttonStyleDisabled} title="PDF not yet generated">Open PDF</span>
        )}
        {report.docxUrl ? (
          <a href={report.docxUrl} download style={buttonStyleBase}>
            Download DOCX
          </a>
        ) : (
          <span style={buttonStyleDisabled} title="DOCX not yet generated">Download DOCX</span>
        )}
      </div>
    </div>
  )
}
