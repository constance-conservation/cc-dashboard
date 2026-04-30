import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { getPipelineHealthData } from '@/lib/reporting/queries'
import { KpiTile } from '@/components/reporting/KpiTile'
import { Donut } from '@/components/reporting/Donut'
import { BarList } from '@/components/reporting/BarList'
import { PipelineIssuesTable } from '@/components/reporting/PipelineIssuesTable'
import { SyncStateInfo } from '@/components/reporting/SyncStateInfo'

export const dynamic = 'force-dynamic'

const TEMPLATE_BAR_COLORS = ['clay', 'steel', 'amber', 'stone', 'caramel', 'sage']

export default async function PipelineHealthPage() {
  const d = await getPipelineHealthData()

  const completed = d.statusCounts.completed ?? 0
  const review = d.statusCounts.needs_review ?? 0
  const failed = d.statusCounts.failed ?? 0
  const processing = (d.statusCounts.processing ?? 0) + (d.statusCounts.pending ?? 0)
  const total = d.totalInspections

  const successRate = total > 0
    ? `${((completed / total) * 100).toFixed(1)}%`
    : '—'

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/reporting" className="back-btn">
          <Icon name="back" size={16} /> Reporting
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Ingestion pipeline status and diagnostics</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Pipeline Health</h2>
      </div>

      <div className="subpage-body">
        <div className="kpi-row">
          <KpiTile label="Processed" value={total} sub="total inspections" />
          <KpiTile
            label="Success Rate"
            value={successRate}
            sub={`${completed.toLocaleString()} completed`}
            accent="var(--ok)"
          />
          <KpiTile
            label="Review Queue"
            value={review}
            sub="need manual check"
            accent="var(--warn)"
          />
          <KpiTile
            label="Failures"
            value={failed}
            sub="need investigation"
            accent="var(--danger)"
          />
        </div>

        <div className="two-col">
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Status Breakdown</div></div>
            <Donut segments={[
              { value: completed,  color: 'var(--ok)',     label: 'Completed' },
              { value: review,     color: 'var(--accent)', label: 'Needs Review' },
              { value: failed,     color: 'var(--danger)', label: 'Failed' },
              { value: processing, color: 'var(--ink-3)',  label: 'Processing' },
            ]} />
          </div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Template Types Processed</div></div>
            <BarList data={d.templateBars} colors={TEMPLATE_BAR_COLORS} />
          </div>
        </div>

        <div className="panel" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '18px 22px 0' }}>
            <div className="panel-title">Recent Failures &amp; Review Items</div>
          </div>
          <PipelineIssuesTable rows={d.issues} />
        </div>

        <div className="panel" style={{ marginTop: 14 }}>
          <div className="panel-head"><div className="panel-title">Sync State</div></div>
          <SyncStateInfo state={d.syncState} />
        </div>
      </div>
    </div>
  )
}
