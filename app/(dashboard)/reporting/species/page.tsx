import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { getSpeciesData } from '@/lib/reporting/queries'
import { KpiTile } from '@/components/reporting/KpiTile'
import { BarList } from '@/components/reporting/BarList'

export const dynamic = 'force-dynamic'

const FREQ_BAR_COLORS = [
  'sage', 'sage', 'sage', 'sage', 'sage',
  'steel', 'steel', 'steel', 'steel', 'steel',
  'stone', 'stone', 'stone', 'stone', 'stone',
]

export default async function ReportingSpeciesPage() {
  const d = await getSpeciesData()
  const mostCommonSub = d.mostCommonName ? `${d.mostCommonSightings} sightings` : ''

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/reporting" className="back-btn">
          <Icon name="back" size={16} /> Reporting
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Species targeted across all site inspections</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Weed Species</h2>
      </div>

      <div className="subpage-body">
        <div className="kpi-row">
          <KpiTile
            label="Total Sightings"
            value={d.totalSightings}
            sub="across all inspections"
          />
          <KpiTile
            label="Unique Species"
            value={d.uniqueSpecies}
            sub={`${d.referenceCount} in reference DB`}
          />
          <KpiTile
            label="Most Common"
            value={d.mostCommonName ?? '—'}
            sub={mostCommonSub}
            accent="var(--ok)"
          />
        </div>

        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="panel-head"><div className="panel-title">Species Frequency</div></div>
          <BarList data={d.frequencyBars} colors={FREQ_BAR_COLORS} />
        </div>

        {d.cards.length > 0 && (
          <div className="three-col">
            {d.cards.map(s => {
              const sci = s.scientificName || s.category || s.speciesType || ''
              return (
                <div key={s.canonicalName} className="species-card">
                  <div className="species-info">
                    <div className="species-name">{s.canonicalName}</div>
                    <div className="species-sci">{sci}</div>
                  </div>
                  <div>
                    <div className="species-count">{s.sightings}</div>
                    <div className="species-count-label">sightings</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
