import type { SiteWithStats } from '@/lib/reporting/types'

const statBlock: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
}

const statValue: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--ink)',
  letterSpacing: '-0.02em',
}

const statLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--ink-3)',
}

export function SiteCard({ site }: { site: SiteWithStats }) {
  const meta = [site.siteType || '—', site.projectCode].filter(Boolean).join(' · ')
  return (
    <div
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
          {site.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{meta}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <div style={statBlock}>
          <span style={statValue}>{site.inspectionCount}</span>
          <span style={statLabel}>Inspections</span>
        </div>
        <div style={statBlock}>
          <span style={statValue}>{site.hours.toLocaleString()}</span>
          <span style={statLabel}>Hours</span>
        </div>
      </div>
    </div>
  )
}
