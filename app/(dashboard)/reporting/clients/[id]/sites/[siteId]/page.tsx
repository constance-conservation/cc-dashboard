import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Icon } from '@/components/icons/Icon'
import { getSiteDetailData } from '@/lib/reporting/queries'
import { RowCard } from '@/components/reporting/RowCard'
import { GenerateReportButton } from '@/components/reporting/GenerateReportButton'

export const dynamic = 'force-dynamic'

const fieldLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--ink-3)',
  marginBottom: 4,
}

const fieldValue: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--ink)',
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      <div style={fieldValue}>{value || '—'}</div>
    </div>
  )
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string; siteId: string }>
}) {
  const { id, siteId } = await params
  const data = await getSiteDetailData(siteId)
  if (!data) notFound()

  const { site, clientName, clientLongName, zones } = data

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href={`/reporting/clients/${id}`} className="back-btn">
          <Icon name="back" size={16} /> {clientName}
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Part of {clientLongName || clientName}</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">{site.longName || site.name}</h2>
      </div>

      <div className="subpage-body">
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Site</div></div>
          <div
            style={{
              padding: 16,
              display: 'grid',
              gap: 14,
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            }}
          >
            <Field label="Name" value={site.name} />
            <Field label="Long name" value={site.longName} />
            <Field label="Site type" value={site.siteType} />
            <Field label="Project code" value={site.projectCode} />
          </div>
        </div>

        <div className="panel" style={{ marginTop: 14 }}>
          <div
            className="panel-head"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div className="panel-title">Zones</div>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {zones.length} zone{zones.length === 1 ? '' : 's'}
            </span>
          </div>
          {zones.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No zones yet.</div>
            </div>
          ) : (
            <div>
              {zones.map((z) => (
                <RowCard
                  key={z.id}
                  title={z.name}
                  meta={z.longName || z.canonicalName || '—'}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: 11,
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span>{z.inspectionCount} insp.</span>
                    <span>Last: {formatDate(z.lastInspectionDate)}</span>
                  </span>
                  <GenerateReportButton scope="zone" id={z.id} />
                </RowCard>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <GenerateReportButton scope="site" id={site.id} label="Generate site report" />
        </div>
      </div>
    </div>
  )
}
