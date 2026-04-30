import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { getInspectionsListData } from '@/lib/reporting/queries'
import { KpiTile } from '@/components/reporting/KpiTile'
import { InspectionsTable } from '@/components/reporting/InspectionsTable'

export const dynamic = 'force-dynamic'

export default async function InspectionsPage() {
  const data = await getInspectionsListData()

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/reporting" className="back-btn">
          <Icon name="back" size={16} /> Reporting
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">All ingested Safety Culture inspections</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Inspections</h2>
      </div>

      <div className="subpage-body">
        <div className="kpi-row">
          <KpiTile label="Total" value={data.totals.total} sub="all templates" />
          <KpiTile
            label="Daily Work Reports"
            value={data.totals.dailyWorkReports}
            sub="primary template"
            accent="var(--accent)"
          />
          <KpiTile
            label="Chemical Records"
            value={data.totals.chemicalRecords}
            sub="compliance data"
          />
          <KpiTile
            label="Failed"
            value={data.totals.failed}
            sub="need investigation"
            accent="var(--danger)"
          />
        </div>

        <div className="panel">
          <div
            className="panel-head"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div className="panel-title">Inspection Feed</div>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {data.shown === data.totals.total
                ? `${data.totals.total} inspection${data.totals.total === 1 ? '' : 's'}`
                : `Showing ${data.shown} of ${data.totals.total}`}
            </span>
          </div>
          <InspectionsTable rows={data.rows} />
        </div>
      </div>
    </div>
  )
}
