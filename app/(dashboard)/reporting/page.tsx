import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { getLandingDashboardData } from '@/lib/reporting/queries'
import { KpiTile } from '@/components/reporting/KpiTile'
import { Donut } from '@/components/reporting/Donut'
import { BarList } from '@/components/reporting/BarList'
import { BackfillAlert } from '@/components/reporting/BackfillAlert'

export const dynamic = 'force-dynamic'

export default async function ReportingPage() {
  const d = await getLandingDashboardData()
  const completed = d.statusCounts.completed ?? 0
  const review = d.statusCounts.needs_review ?? 0
  const failed = d.statusCounts.failed ?? 0
  const processing = (d.statusCounts.processing ?? 0) + (d.statusCounts.pending ?? 0)
  const pctCompleted = d.totalInspections > 0
    ? Math.round((completed / d.totalInspections) * 100)
    : 0
  const statusTypeCount = Object.keys(d.statusCounts).length
  const lastUpdated = new Date(d.generatedAt).toLocaleTimeString()

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn">
          <Icon name="back" size={16} /> Dashboard
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Live data from Safety Culture ingestion · {lastUpdated}</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Pipeline Dashboard</h2>
      </div>

      <div className="subpage-body">
        <BackfillAlert total={d.totalInspections} />

        <div className="kpi-row">
          <KpiTile label="Total Inspections" value={d.totalInspections} sub={`${statusTypeCount} status types`} />
          <KpiTile label="Completed" value={completed} sub={`${pctCompleted}% of total`} accent="var(--ok)" />
          <KpiTile label="Needs Review" value={review} sub="non-DWR templates" accent="var(--warn)" />
          <KpiTile label="Sites Tracked" value={d.sitesTracked} sub="across all clients" />
          <KpiTile label="Photos" value={d.photosCount} sub="from field inspections" />
        </div>

        <div className="two-col">
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Processing Status</div></div>
            <Donut segments={[
              { value: completed,  color: 'var(--ok)',     label: 'Completed' },
              { value: review,     color: 'var(--accent)', label: 'Needs Review' },
              { value: failed,     color: 'var(--danger)', label: 'Failed' },
              { value: processing, color: 'var(--ink-3)',  label: 'Processing' },
            ]} />
          </div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Tasks Undertaken</div></div>
            <BarList data={d.topTasks} colors={['clay','clay','amber','amber','caramel','caramel','stone','stone']} />
          </div>
        </div>

        <div className="two-col" style={{ marginTop: 14 }}>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Top Weed Species</div></div>
            <BarList data={d.topWeeds} colors={['sage','sage','sage','sage','steel','steel','steel','steel']} />
          </div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Staff Hours</div></div>
            <BarList data={d.topStaffHours} colors={['amber','amber','caramel','caramel','clay','clay','stone','stone']} />
          </div>
        </div>
      </div>
    </div>
  )
}
