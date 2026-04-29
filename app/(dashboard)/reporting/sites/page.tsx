import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { getSitesGlobalData } from '@/lib/reporting/queries'
import { KpiTile } from '@/components/reporting/KpiTile'
import { SiteCard } from '@/components/reporting/SiteCard'

export const dynamic = 'force-dynamic'

export default async function ReportingSitesPage() {
  const data = await getSitesGlobalData()

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/reporting" className="back-btn">
          <Icon name="back" size={16} /> Reporting
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Every site across all clients</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Sites</h2>
      </div>

      <div className="subpage-body">
        <div className="kpi-row">
          <KpiTile
            label="Total Sites"
            value={data.totalSites}
            sub={`${data.sitesWithInspections} with inspections`}
          />
          <KpiTile
            label="Most Active"
            value={data.mostActiveName ?? '—'}
            sub={data.mostActiveName ? `${data.mostActiveCount} inspections` : ''}
          />
          <KpiTile
            label="Total Site Hours"
            value={`${data.totalHours.toLocaleString()}h`}
            sub="across all sites"
          />
        </div>

        {data.sites.length === 0 ? (
          <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>No sites yet.</div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
            }}
          >
            {data.sites.map((s) => (
              <SiteCard key={s.id} site={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
