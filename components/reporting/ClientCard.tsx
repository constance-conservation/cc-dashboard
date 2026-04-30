import Link from 'next/link'
import { GenerateReportButton } from './GenerateReportButton'
import type { ClientSummary } from '@/lib/reporting/types'

function titleCase(s: string | null): string {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

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

export function ClientCard({ client }: { client: ClientSummary }) {
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
      <Link
        href={`/reporting/clients/${client.id}`}
        style={{ textDecoration: 'none', color: 'inherit' }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
          {client.longName || client.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {client.contactName || '—'}
          {client.councilOrBody ? ` · ${client.councilOrBody}` : ''}
        </div>
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={statBlock}>
          <span style={statValue}>{client.siteCount}</span>
          <span style={statLabel}>Sites</span>
        </div>
        <div style={statBlock}>
          <span style={statValue}>{client.zoneCount}</span>
          <span style={statLabel}>Zones</span>
        </div>
        <div style={statBlock}>
          <span style={{ ...statValue, fontSize: 14 }}>{titleCase(client.reportFrequency)}</span>
          <span style={statLabel}>Frequency</span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <GenerateReportButton scope="client" id={client.id} />
      </div>
    </div>
  )
}
