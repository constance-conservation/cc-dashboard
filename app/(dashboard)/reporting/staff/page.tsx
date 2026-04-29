import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { getStaffData } from '@/lib/reporting/queries'
import { KpiTile } from '@/components/reporting/KpiTile'
import { BarList } from '@/components/reporting/BarList'

export const dynamic = 'force-dynamic'

const HOURS_BAR_COLORS = ['clay', 'amber', 'caramel', 'sage', 'steel', 'stone']

export default async function ReportingStaffPage() {
  const d = await getStaffData()
  const hours = d.totalHours.toLocaleString() + 'h'
  const topPerformerSub = d.topPerformerName ? `${d.topPerformerHours}h` : ''

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/reporting" className="back-btn">
          <Icon name="back" size={16} /> Reporting
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Crew activity across all inspections</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Staff &amp; Hours</h2>
      </div>

      <div className="subpage-body">
        <div className="kpi-row">
          <KpiTile label="Total Staff" value={d.totalStaff} sub={`${d.activeStaff} active`} />
          <KpiTile label="Total Hours" value={hours} sub="all staff combined" />
          <KpiTile label="Top Performer" value={d.topPerformerName ?? '—'} sub={topPerformerSub} />
        </div>

        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="panel-head"><div className="panel-title">Hours by Staff Member</div></div>
          <BarList data={d.hoursByStaff} colors={HOURS_BAR_COLORS} />
        </div>

        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="panel-head" style={{ padding: '18px 22px 0' }}>
            <div className="panel-title">Staff Roster</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ border: 'none', borderRadius: 0 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Inspections</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {d.roster.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td>{r.role ?? '—'}</td>
                    <td className="mono">{r.inspectionCount}</td>
                    <td className="mono">{r.totalHours}h</td>
                    <td>
                      <span className={`pill ${r.active ? 'ok' : 'danger'}`}>
                        <span className="dot" />
                        {r.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
