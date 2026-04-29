import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { getChemicalsData } from '@/lib/reporting/queries'
import { KpiTile } from '@/components/reporting/KpiTile'
import { BarList } from '@/components/reporting/BarList'

export const dynamic = 'force-dynamic'

const USAGE_BAR_COLORS = ['clay', 'clay', 'amber', 'amber', 'caramel', 'caramel', 'sage', 'sage', 'stone', 'stone']

export default async function ReportingChemicalsPage() {
  const d = await getChemicalsData()
  const mostUsedSub = d.mostUsedName ? `${d.mostUsedMentions} mentions` : ''

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/reporting" className="back-btn">
          <Icon name="back" size={16} /> Reporting
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Herbicide usage across all inspections</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Chemicals</h2>
      </div>

      <div className="subpage-body">
        <div className="kpi-row">
          <KpiTile label="Chemical Records" value={d.chemicalRecords} sub="from inspections" />
          <KpiTile label="Unique Chemicals" value={d.uniqueChemicals} sub="identified" />
          <KpiTile label="Application Records" value={d.applicationRecords} sub="compliance docs" />
          <KpiTile
            label="Most Used"
            value={d.mostUsedName ?? '—'}
            sub={mostUsedSub}
            accent="var(--accent)"
          />
        </div>

        <div className="two-col" style={{ marginBottom: 14 }}>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Usage Frequency</div></div>
            <BarList data={d.usageBars} colors={USAGE_BAR_COLORS} />
          </div>
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Application Records</div></div>
            {d.recentApplications.length === 0 ? (
              <div className="empty-state">
                <div className="icon" aria-hidden>⚗</div>
                <div className="msg">No application records yet</div>
              </div>
            ) : (
              d.recentApplications.map(r => (
                <div key={r.id} className="car-record">
                  <div className="car-record-site">{r.siteName ?? 'Unknown site'}</div>
                  <div className="car-record-meta">
                    {r.date ?? '—'} · {r.applicationMethod ?? '—'}
                    {r.weatherGeneral ? ` · ${r.weatherGeneral}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><div className="panel-title">Chemical Reference</div></div>
          {d.reference.length === 0 ? (
            <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No chemicals in reference DB.</div>
          ) : (
            <div className="three-col">
              {d.reference.map(c => (
                <div key={c.canonicalName} className="chem-card">
                  <div className="chem-name">{c.canonicalName}</div>
                  <div className="chem-type">
                    {c.type ?? '—'}{c.activeIngredient ? ` · ${c.activeIngredient}` : ''}
                  </div>
                  <div className="chem-stat-row">
                    <div>
                      <div className="chem-stat-val">{c.mentions}</div>
                      <div className="chem-stat-lbl">Mentions</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
