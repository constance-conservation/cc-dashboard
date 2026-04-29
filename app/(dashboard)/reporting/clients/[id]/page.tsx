import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Icon } from '@/components/icons/Icon'
import { getClientDetailData } from '@/lib/reporting/queries'
import { RowCard } from '@/components/reporting/RowCard'
import { GenerateReportButton } from '@/components/reporting/GenerateReportButton'
import { CadenceSelector } from '@/components/reporting/CadenceSelector'

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

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getClientDetailData(id)
  if (!data) notFound()

  const { client, sites } = data

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/reporting/clients" className="back-btn">
          <Icon name="back" size={16} /> Clients
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">{client.name}</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">{client.longName || client.name}</h2>
      </div>

      <div className="subpage-body">
        <div className="panel">
          <div className="panel-head"><div className="panel-title">Client</div></div>
          <div
            style={{
              padding: 16,
              display: 'grid',
              gap: 14,
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            }}
          >
            <Field label="Short name" value={client.name} />
            <Field label="Long name" value={client.longName} />
            <Field label="Contact" value={client.contactName} />
            <Field label="Council/body" value={client.councilOrBody} />
            <Field label="Email" value={client.contactEmail} />
            <Field label="Phone" value={client.contactPhone} />
          </div>
          <div style={{ borderTop: '1px solid var(--line)', padding: '14px 16px' }}>
            <CadenceSelector clientId={client.id} currentValue={client.reportFrequency} />
          </div>
        </div>

        <div className="panel" style={{ marginTop: 14 }}>
          <div
            className="panel-head"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <div className="panel-title">Sites</div>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              {sites.length} site{sites.length === 1 ? '' : 's'}
            </span>
          </div>
          {sites.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No sites yet.</div>
            </div>
          ) : (
            <div>
              {sites.map((s) => (
                <RowCard
                  key={s.id}
                  title={s.name}
                  meta={s.longName || '—'}
                  href={`/reporting/clients/${client.id}/sites/${s.id}`}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      background: 'var(--bg-sunken)',
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {s.zoneCount} zone{s.zoneCount === 1 ? '' : 's'}
                  </span>
                  <GenerateReportButton scope="site" id={s.id} />
                </RowCard>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <GenerateReportButton scope="client" id={client.id} label="Generate client report" />
        </div>
      </div>
    </div>
  )
}
