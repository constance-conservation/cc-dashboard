import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Icon } from '@/components/icons/Icon'
import { getSiteDetailData } from '@/lib/reporting/queries'
import { createClient } from '@/lib/supabase/server'
import { RowCard } from '@/components/reporting/RowCard'
import { GenerateReportButton } from '@/components/reporting/GenerateReportButton'
import { EditableField } from '@/components/reporting/EditableField'
import { ScheduleSelector } from '@/components/reporting/ScheduleSelector'
import { updateSiteField, type ScheduleConfig } from '@/app/(dashboard)/reporting/clients/[id]/sites/actions'

export const dynamic = 'force-dynamic'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function coerceScheduleConfig(raw: unknown): ScheduleConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const cadence = (raw as { cadence?: unknown }).cadence
  if (typeof cadence !== 'string') return null
  return { cadence: cadence as ScheduleConfig['cadence'] }
}

async function loadScheduleConfigs(siteId: string, zoneIds: string[]): Promise<{
  site: ScheduleConfig | null
  byZone: Record<string, ScheduleConfig | null>
}> {
  const supabase = await createClient()
  const ids = [siteId, ...zoneIds]
  const res = await supabase
    .from('sites')
    .select('id,schedule_config')
    .in('id', ids)
  const byZone: Record<string, ScheduleConfig | null> = {}
  let site: ScheduleConfig | null = null
  for (const row of (res.data ?? []) as { id: string; schedule_config: unknown }[]) {
    const sc = coerceScheduleConfig(row.schedule_config)
    if (row.id === siteId) site = sc
    else byZone[row.id] = sc
  }
  return { site, byZone }
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
  const schedules = await loadScheduleConfigs(
    site.id,
    zones.map((z) => z.id),
  )

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
            <EditableField
              label="Name"
              value={site.name}
              onSave={updateSiteField.bind(null, site.id, 'name')}
            />
            <EditableField
              label="Long name"
              value={site.longName}
              onSave={updateSiteField.bind(null, site.id, 'long_name')}
            />
            <EditableField
              label="Site type"
              value={site.siteType}
              onSave={updateSiteField.bind(null, site.id, 'site_type')}
            />
            <EditableField
              label="Project code"
              value={site.projectCode}
              onSave={updateSiteField.bind(null, site.id, 'project_code')}
            />
          </div>
          <div style={{ borderTop: '1px solid var(--line)', padding: '14px 16px' }}>
            <ScheduleSelector
              siteId={site.id}
              current={schedules.site}
              variant="full"
              label="Site schedule"
            />
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
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      alignItems: 'flex-end',
                    }}
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
                    <ScheduleSelector
                      siteId={z.id}
                      current={schedules.byZone[z.id] ?? null}
                      variant="compact"
                      label="Schedule"
                    />
                    <GenerateReportButton scope="zone" id={z.id} />
                  </div>
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
