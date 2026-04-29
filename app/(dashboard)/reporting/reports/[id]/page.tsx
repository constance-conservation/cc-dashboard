import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Icon } from '@/components/icons/Icon'
import { getReportDetail } from '@/lib/reporting/queries'
import { ReportEditor } from './ReportEditor'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const report = await getReportDetail(id)
  if (!report) notFound()

  const displayClient = report.clientLongName || report.clientName

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/reporting/reports" className="back-btn">
          <Icon name="back" size={16} /> Reports
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">
          {displayClient ? displayClient : 'Report'}
          {report.siteName ? ` · ${report.siteName}` : ''}
        </span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">{report.title || 'Untitled report'}</h2>
      </div>

      <div className="subpage-body">
        <ReportEditor report={report} />
      </div>
    </div>
  )
}
