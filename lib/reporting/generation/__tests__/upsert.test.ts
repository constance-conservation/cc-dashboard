import { describe, it, expect } from 'vitest'
import { upsertClientReport } from '../index'
import type { ReportData, NarrativeSections } from '../types'

interface ClientReportRow {
  id: string
  client_id: string
  site_id: string | null
  report_period_start: string
  report_period_end: string
  [k: string]: any
}

function makeMockDb(initial: ClientReportRow[] = []) {
  const rows: ClientReportRow[] = initial.slice()
  let nextId = initial.length + 1

  function table() {
    const filters: Array<{ col: string; op: 'eq' | 'is'; val: any }> = []
    let pendingInsert: any = null
    let pendingUpdate: any = null
    let pendingUpdateId: string | null = null

    const find = () =>
      rows.find(r =>
        filters.every(f =>
          f.op === 'eq' ? (r as any)[f.col] === f.val : (r as any)[f.col] === null,
        ),
      )

    const api: any = {
      select(_cols: string) { return api },
      eq(col: string, val: any) { filters.push({ col, op: 'eq', val }); return api },
      is(col: string, _v: null) { filters.push({ col, op: 'is', val: null }); return api },
      async maybeSingle() {
        const found = find()
        return { data: found ?? null, error: null }
      },
      async single() {
        if (pendingInsert) {
          const id = `cr-${nextId++}`
          rows.push({ id, ...pendingInsert })
          return { data: { id }, error: null }
        }
        const found = find()
        return found ? { data: found, error: null } : { data: null, error: { message: 'not found' } }
      },
      insert(payload: any) { pendingInsert = payload; return api },
      update(payload: any) { pendingUpdate = payload; return api },
      then(resolve: any) {
        if (pendingUpdate && pendingUpdateId) {
          const idx = rows.findIndex(r => r.id === pendingUpdateId)
          if (idx >= 0) rows[idx] = { ...rows[idx], ...pendingUpdate }
          resolve({ data: null, error: null })
          return
        }
        resolve({ data: rows.slice(), error: null })
      },
    }

    const origEq = api.eq
    api.eq = (col: string, val: any) => {
      if (pendingUpdate && col === 'id') {
        pendingUpdateId = val
        const idx = rows.findIndex(r => r.id === pendingUpdateId)
        if (idx >= 0) rows[idx] = { ...rows[idx], ...pendingUpdate }
        return Promise.resolve({ error: null }) as any
      }
      return origEq(col, val)
    }
    return api
  }

  return {
    from(_t: string) { return table() },
    _rows: rows,
  } as any
}

const baseData = (overrides: Partial<ReportData> = {}): ReportData => ({
  client: {
    id: 'client-x',
    organization_id: 'org-1',
    name: 'Camden Council',
    long_name: null,
    contact_name: null,
    council_or_body: null,
    report_template_variant: null,
    location_maps: null,
    active_roster_staff_ids: null,
  },
  organization: { id: 'org-1', name: 'Constance Conservation', address: null, phone: null, email: null, logo_url: null },
  sites: [{ id: 'site-x', organization_id: 'org-1', client_id: 'client-x', parent_site_id: null, name: 'EBSF', canonical_name: null, sc_label: null }],
  supervisor: null,
  inspections: [],
  staffHoursByZone: [],
  weedWorks: [],
  herbicideTotals: [],
  observations: [],
  detailsOfTasksByZone: {},
  scopeKind: 'site',
  scopeSiteId: 'site-x',
  periodStart: '2025-06-01',
  periodEnd: '2025-06-30',
  cadence: 'monthly',
  zonesIncluded: ['Zone B'],
  zonesLabel: 'Zone B',
  periodLabel: 'June 2025',
  periodFilenameLabel: 'June_2025',
  titleLine: 'EBSF Zone B June 2025 Monthly Report',
  addressedTo: 'Camden Council',
  authorLine: 'Constance Conservation',
  publicationDate: '30/06/2025',
  ...overrides,
})

const baseNarratives = (): NarrativeSections => ({
  outlineOfWorks: {},
  birdSightings: 'No birds were sighted this month.',
  incidents: 'No incidents.',
  faunaSightings: 'No new sightings.',
})

describe('upsertClientReport', () => {
  it('inserts a new row when none exists for (client, site, period)', async () => {
    const db = makeMockDb()
    const id = await upsertClientReport(db, baseData(), baseNarratives(), '<html>x</html>', 'https://signed/url1')
    expect(id).toMatch(/^cr-/)
    expect(db._rows).toHaveLength(1)
    expect(db._rows[0].docx_url).toBe('https://signed/url1')
  })

  it('updates existing row instead of inserting (idempotency)', async () => {
    const db = makeMockDb([
      {
        id: 'cr-existing',
        client_id: 'client-x',
        site_id: 'site-x',
        report_period_start: '2025-06-01',
        report_period_end: '2025-06-30',
        docx_url: 'https://signed/old',
      },
    ])
    const id = await upsertClientReport(db, baseData(), baseNarratives(), '<html>updated</html>', 'https://signed/new')
    expect(id).toBe('cr-existing')
    expect(db._rows).toHaveLength(1)
    expect(db._rows[0].docx_url).toBe('https://signed/new')
    expect(db._rows[0].html_content).toBe('<html>updated</html>')
  })

  it('site-null scope is treated independently from same-period site-scoped rows', async () => {
    const db = makeMockDb([
      {
        id: 'cr-site',
        client_id: 'client-x',
        site_id: 'site-x',
        report_period_start: '2025-06-01',
        report_period_end: '2025-06-30',
      },
    ])
    const data = baseData({ scopeKind: 'client', scopeSiteId: null, sites: [] })
    const id = await upsertClientReport(db, data, baseNarratives(), '<html/>', 'https://signed/url2')
    expect(id).not.toBe('cr-site')
    expect(db._rows).toHaveLength(2)
    const newRow = db._rows.find((r: ClientReportRow) => r.id !== 'cr-site')!
    expect(newRow.site_id).toBeNull()
  })
})
