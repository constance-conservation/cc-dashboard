import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { getReportsListData } from '@/lib/reporting/queries'
import { KpiTile } from '@/components/reporting/KpiTile'
import { ReportRow } from '@/components/reporting/ReportRow'
import { ScopeChip } from '@/components/reporting/ScopeChip'
import type { ReportScope } from '@/lib/reporting/types'

export const dynamic = 'force-dynamic'

const VALID_SCOPES = new Set<ReportScope>(['client', 'site', 'zone'])

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const rawScope = typeof sp.scope === 'string' ? sp.scope : null
  const rawId = typeof sp.id === 'string' ? sp.id : null

  const scope: ReportScope | null =
    rawScope && VALID_SCOPES.has(rawScope as ReportScope) ? (rawScope as ReportScope) : null
  const id = scope && rawId ? rawId : null

  const data = await getReportsListData({ scope, id })

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/reporting" className="back-btn">
          <Icon name="back" size={16} /> Reporting
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Auto-generated client reports</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Reports</h2>
      </div>

      <div className="subpage-body">
        {data.scopeContext.scope && (
          <div style={{ marginBottom: 18 }}>
            <ScopeChip context={data.scopeContext} />
          </div>
        )}

        <div className="kpi-row">
          <KpiTile label="Total" value={data.totals.total} sub={scope ? 'in this scope' : 'all reports'} />
          <KpiTile label="Drafts" value={data.totals.drafts} sub="awaiting review" />
          <KpiTile label="In Review" value={data.totals.review} sub="" accent="var(--warn)" />
          <KpiTile label="Approved / Sent" value={data.totals.approved} sub="" accent="var(--ok)" />
        </div>

        <div className="panel">
          <div
            className="panel-head"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div className="panel-title">Reports</div>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {data.totals.total} report{data.totals.total === 1 ? '' : 's'}
            </span>
          </div>
          {data.reports.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>
                No reports for this scope yet.
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>
                Once generation lands (E16), reports configured by the cadence selector will appear here.
              </div>
            </div>
          ) : (
            <div>
              {data.reports.map((r) => (
                <ReportRow key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
