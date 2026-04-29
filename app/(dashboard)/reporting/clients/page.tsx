import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { getClientsListData } from '@/lib/reporting/queries'
import { KpiTile } from '@/components/reporting/KpiTile'
import { ClientCard } from '@/components/reporting/ClientCard'

export const dynamic = 'force-dynamic'

export default async function ReportingClientsPage() {
  const data = await getClientsListData()
  const totalSites = data.clients.reduce((s, c) => s + c.siteCount, 0)
  const totalZones = data.clients.reduce((s, c) => s + c.zoneCount, 0)

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/reporting" className="back-btn">
          <Icon name="back" size={16} /> Reporting
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Reporting clients with sites and zones</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Clients</h2>
      </div>

      <div className="subpage-body">
        <div className="kpi-row">
          <KpiTile label="Clients" value={data.clients.length} sub="paying entities" />
          <KpiTile label="Active sites" value={totalSites} sub="across all clients" />
          <KpiTile label="Active zones" value={totalZones} sub="billing units" />
        </div>

        {data.clients.length === 0 ? (
          <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>No clients yet.</div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 14,
            }}
          >
            {data.clients.map((c) => (
              <ClientCard key={c.id} client={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
