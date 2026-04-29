import type { InspectionRow, InspectionTemplateType, ProcessingStatus } from '@/lib/reporting/types'

const statusClass: Record<ProcessingStatus, string> = {
  completed: 'pill ok',
  needs_review: 'pill warn',
  failed: 'pill danger',
  processing: 'pill',
  pending: 'pill',
  unknown: 'pill',
}

const statusLabel: Record<ProcessingStatus, string> = {
  completed: 'Completed',
  needs_review: 'Needs review',
  failed: 'Failed',
  processing: 'Processing',
  pending: 'Pending',
  unknown: 'Unknown',
}

function templateLabel(t: InspectionTemplateType): string {
  if (t === 'daily_work_report') return 'Daily Work Report'
  if (t === 'chemical_application_record') return 'Chemical Application'
  return t
}

const muted: React.CSSProperties = { color: 'var(--ink-3)' }

export function InspectionsTable({ rows }: { rows: InspectionRow[] }) {
  if (rows.length === 0) {
    return (
      <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: 'var(--ink-3)' }}>
        No inspections ingested yet.
      </div>
    )
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Site</th>
            <th>Template</th>
            <th>Supervisor</th>
            <th style={{ textAlign: 'right' }}>Tasks</th>
            <th style={{ textAlign: 'right' }}>Weeds</th>
            <th style={{ textAlign: 'right' }}>Photos</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="mono">{r.date ?? <span style={muted}>—</span>}</td>
              <td>{r.siteName ?? <span style={muted}>—</span>}</td>
              <td>{templateLabel(r.templateType)}</td>
              <td>{r.supervisorName ?? <span style={muted}>—</span>}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{r.taskCount}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{r.weedCount}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{r.photoCount}</td>
              <td>
                <span className={statusClass[r.status]}>
                  <span className="dot" />
                  {statusLabel[r.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
