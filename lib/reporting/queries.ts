import { createClient } from '@/lib/supabase/server'
import type {
  LandingDashboardData,
  StatusCounts,
  LabelValue,
  ClientsListData,
  ClientSummary,
  ClientDetailData,
  SiteSummary,
  SiteDetailData,
  ZoneRow,
  ReportsListData,
  ReportListItem,
  ReportStatus,
  ReportScope,
  ScopeContext,
  ReportDetail,
} from './types'

const TOP_N = 8

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = (r[key] as string | null) ?? 'unknown'
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

function topN(counts: Record<string, number>, n = TOP_N): LabelValue[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }))
}

export async function getLandingDashboardData(): Promise<LandingDashboardData> {
  const supabase = await createClient()

  const [
    inspectionsRes,
    sitesRes,
    mediaRes,
    tasksRes,
    weedsRes,
    personnelRes,
  ] = await Promise.all([
    supabase
      .from('inspections')
      .select('processing_status')
      .order('date', { ascending: false, nullsFirst: false })
      .limit(2000),
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('inspection_media')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('inspection_tasks')
      .select('task_type')
      .limit(5000),
    supabase
      .from('inspection_weeds')
      .select('species_name_raw')
      .limit(5000),
    supabase
      .from('inspection_personnel')
      .select('hours_worked, staff(name)')
      .limit(5000),
  ])

  for (const r of [inspectionsRes, tasksRes, weedsRes, personnelRes]) {
    if (r.error) throw new Error(`Supabase query failed: ${r.error.message}`)
  }
  if (sitesRes.error) throw new Error(`sites count failed: ${sitesRes.error.message}`)
  if (mediaRes.error) throw new Error(`media count failed: ${mediaRes.error.message}`)

  const inspections = inspectionsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const weeds = weedsRes.data ?? []
  const personnel = personnelRes.data ?? []

  const statusCounts = countBy(inspections, 'processing_status') as StatusCounts

  const topTasks = topN(countBy(tasks, 'task_type'))
  const topWeeds = topN(countBy(weeds, 'species_name_raw'))

  const hoursByStaff: Record<string, number> = {}
  for (const p of personnel as { hours_worked: number | string | null; staff: { name?: string } | { name?: string }[] | null }[]) {
    const staffRow = Array.isArray(p.staff) ? p.staff[0] : p.staff
    const name = staffRow?.name ?? 'Unknown'
    const h = typeof p.hours_worked === 'number'
      ? p.hours_worked
      : parseFloat(p.hours_worked ?? '') || 0
    hoursByStaff[name] = (hoursByStaff[name] ?? 0) + h
  }
  const topStaffHours: LabelValue[] = Object.entries(hoursByStaff)
    .filter(([, h]) => h > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([label, value]) => ({ label, value: Math.round(value) }))

  return {
    totalInspections: inspections.length,
    statusCounts,
    sitesTracked: sitesRes.count ?? 0,
    photosCount: mediaRes.count ?? 0,
    topTasks,
    topWeeds,
    topStaffHours,
    generatedAt: new Date().toISOString(),
  }
}

// ─── E9: Clients / Sites / Zones queries ────────────────────────────

type RawClient = {
  id: string
  name: string
  long_name: string | null
  contact_name: string | null
  council_or_body: string | null
  contact_email: string | null
  contact_phone: string | null
  report_frequency: string | null
}

type RawSite = {
  id: string
  client_id: string | null
  parent_site_id: string | null
  name: string
  long_name: string | null
  canonical_name: string | null
  site_type: string | null
  project_code: string | null
}

function compareByDisplayName(a: { longName: string | null; name: string }, b: { longName: string | null; name: string }): number {
  const an = (a.longName || a.name).toLocaleLowerCase()
  const bn = (b.longName || b.name).toLocaleLowerCase()
  return an < bn ? -1 : an > bn ? 1 : 0
}

export async function getClientsListData(): Promise<ClientsListData> {
  const supabase = await createClient()

  const [clientsRes, sitesRes] = await Promise.all([
    supabase
      .from('clients')
      .select('id,name,long_name,contact_name,council_or_body,contact_email,contact_phone,report_frequency'),
    supabase
      .from('sites')
      .select('id,client_id,parent_site_id'),
  ])

  if (clientsRes.error) throw new Error(`clients query failed: ${clientsRes.error.message}`)
  if (sitesRes.error) throw new Error(`sites query failed: ${sitesRes.error.message}`)

  const rawClients = (clientsRes.data ?? []) as RawClient[]
  const rawSites = (sitesRes.data ?? []) as Pick<RawSite, 'id' | 'client_id' | 'parent_site_id'>[]

  const topLevelSitesByClient = new Map<string, string[]>()
  const childCountByParent = new Map<string, number>()
  for (const s of rawSites) {
    if (s.parent_site_id) {
      childCountByParent.set(s.parent_site_id, (childCountByParent.get(s.parent_site_id) ?? 0) + 1)
    } else if (s.client_id) {
      const arr = topLevelSitesByClient.get(s.client_id) ?? []
      arr.push(s.id)
      topLevelSitesByClient.set(s.client_id, arr)
    }
  }

  const clients: ClientSummary[] = rawClients.map(c => {
    const topLevelSiteIds = topLevelSitesByClient.get(c.id) ?? []
    const zoneCount = topLevelSiteIds.reduce((acc, sid) => acc + (childCountByParent.get(sid) ?? 0), 0)
    return {
      id: c.id,
      name: c.name,
      longName: c.long_name,
      contactName: c.contact_name,
      councilOrBody: c.council_or_body,
      reportFrequency: c.report_frequency,
      siteCount: topLevelSiteIds.length,
      zoneCount,
    }
  }).sort(compareByDisplayName)

  return {
    clients,
    generatedAt: new Date().toISOString(),
  }
}

export async function getClientDetailData(clientId: string): Promise<ClientDetailData | null> {
  const supabase = await createClient()

  const [clientRes, sitesRes] = await Promise.all([
    supabase
      .from('clients')
      .select('id,name,long_name,contact_name,council_or_body,contact_email,contact_phone,report_frequency')
      .eq('id', clientId)
      .maybeSingle(),
    supabase
      .from('sites')
      .select('id,client_id,parent_site_id,name,long_name')
      .eq('client_id', clientId),
  ])

  if (clientRes.error) throw new Error(`client query failed: ${clientRes.error.message}`)
  if (sitesRes.error) throw new Error(`sites query failed: ${sitesRes.error.message}`)
  if (!clientRes.data) return null

  const c = clientRes.data as RawClient
  const allSites = (sitesRes.data ?? []) as Pick<RawSite, 'id' | 'parent_site_id' | 'name' | 'long_name'>[]

  const childCountByParent = new Map<string, number>()
  for (const s of allSites) {
    if (s.parent_site_id) {
      childCountByParent.set(s.parent_site_id, (childCountByParent.get(s.parent_site_id) ?? 0) + 1)
    }
  }

  const sites: SiteSummary[] = allSites
    .filter(s => !s.parent_site_id)
    .map(s => ({
      id: s.id,
      name: s.name,
      longName: s.long_name,
      zoneCount: childCountByParent.get(s.id) ?? 0,
    }))
    .sort(compareByDisplayName)

  return {
    client: {
      id: c.id,
      name: c.name,
      longName: c.long_name,
      contactName: c.contact_name,
      councilOrBody: c.council_or_body,
      contactEmail: c.contact_email,
      contactPhone: c.contact_phone,
      reportFrequency: c.report_frequency,
    },
    sites,
    generatedAt: new Date().toISOString(),
  }
}

export async function getSiteDetailData(siteId: string): Promise<SiteDetailData | null> {
  const supabase = await createClient()

  const siteRes = await supabase
    .from('sites')
    .select('id,client_id,parent_site_id,name,long_name,canonical_name,site_type,project_code')
    .eq('id', siteId)
    .maybeSingle()

  if (siteRes.error) throw new Error(`site query failed: ${siteRes.error.message}`)
  if (!siteRes.data) return null

  const s = siteRes.data as RawSite
  if (!s.client_id) return null

  const [clientRes, zonesRes] = await Promise.all([
    supabase
      .from('clients')
      .select('id,name,long_name')
      .eq('id', s.client_id)
      .maybeSingle(),
    supabase
      .from('sites')
      .select('id,name,long_name,canonical_name')
      .eq('parent_site_id', siteId),
  ])

  if (clientRes.error) throw new Error(`client query failed: ${clientRes.error.message}`)
  if (zonesRes.error) throw new Error(`zones query failed: ${zonesRes.error.message}`)

  const zoneRows = (zonesRes.data ?? []) as Pick<RawSite, 'id' | 'name' | 'long_name' | 'canonical_name'>[]
  const zoneIds = zoneRows.map(z => z.id)

  let zones: ZoneRow[] = zoneRows.map(z => ({
    id: z.id,
    name: z.name,
    longName: z.long_name,
    canonicalName: z.canonical_name,
    inspectionCount: 0,
    lastInspectionDate: null,
  }))

  if (zoneIds.length > 0) {
    const inspRes = await supabase
      .from('inspections')
      .select('site_id,date')
      .in('site_id', zoneIds)
    if (inspRes.error) throw new Error(`inspections query failed: ${inspRes.error.message}`)
    const inspections = (inspRes.data ?? []) as { site_id: string; date: string | null }[]
    const countByZone = new Map<string, number>()
    const latestByZone = new Map<string, string>()
    for (const i of inspections) {
      countByZone.set(i.site_id, (countByZone.get(i.site_id) ?? 0) + 1)
      if (i.date) {
        const prev = latestByZone.get(i.site_id)
        if (!prev || i.date > prev) latestByZone.set(i.site_id, i.date)
      }
    }
    zones = zones.map(z => ({
      ...z,
      inspectionCount: countByZone.get(z.id) ?? 0,
      lastInspectionDate: latestByZone.get(z.id) ?? null,
    }))
  }

  zones.sort(compareByDisplayName)

  const clientRow = clientRes.data as Pick<RawClient, 'id' | 'name' | 'long_name'> | null

  return {
    site: {
      id: s.id,
      clientId: s.client_id,
      name: s.name,
      longName: s.long_name,
      siteType: s.site_type,
      projectCode: s.project_code,
    },
    clientName: clientRow?.name ?? 'Unknown client',
    clientLongName: clientRow?.long_name ?? null,
    zones,
    generatedAt: new Date().toISOString(),
  }
}

// ─── E10: Reports list + viewer ─────────────────────────────────────

type RawReport = {
  id: string
  title: string | null
  status: ReportStatus
  report_period_start: string | null
  report_period_end: string | null
  pdf_url: string | null
  docx_url: string | null
  created_at: string
  client_id: string | null
  site_id: string | null
  clients: { name?: string | null; long_name?: string | null } | { name?: string | null; long_name?: string | null }[] | null
  sites: { name?: string | null } | { name?: string | null }[] | null
}

export async function getReportsListData(
  params: { scope: ReportScope | null; id: string | null },
): Promise<ReportsListData> {
  const supabase = await createClient()
  const { scope, id } = params

  let query = supabase
    .from('client_reports')
    .select(
      'id,title,status,report_period_start,report_period_end,pdf_url,docx_url,created_at,client_id,site_id,clients(name,long_name),sites(name)',
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (scope === 'client' && id) {
    query = query.eq('client_id', id)
  } else if ((scope === 'site' || scope === 'zone') && id) {
    query = query.eq('site_id', id)
  }

  const reportsRes = await query
  if (reportsRes.error) throw new Error(`reports query failed: ${reportsRes.error.message}`)

  const rows = (reportsRes.data ?? []) as RawReport[]

  const reports: ReportListItem[] = rows.map(r => {
    const client = Array.isArray(r.clients) ? r.clients[0] : r.clients
    const site = Array.isArray(r.sites) ? r.sites[0] : r.sites
    return {
      id: r.id,
      title: r.title,
      clientName: client?.long_name || client?.name || null,
      siteName: site?.name ?? null,
      status: r.status,
      reportPeriodStart: r.report_period_start,
      reportPeriodEnd: r.report_period_end,
      pdfUrl: r.pdf_url,
      docxUrl: r.docx_url,
      createdAt: r.created_at,
    }
  })

  let scopeContext: ScopeContext = { scope: null, id: null, displayName: null }
  if (scope && id) {
    if (scope === 'client') {
      const c = await supabase
        .from('clients')
        .select('name,long_name')
        .eq('id', id)
        .maybeSingle()
      const row = c.data as { name?: string | null; long_name?: string | null } | null
      scopeContext = {
        scope,
        id,
        displayName: row?.long_name || row?.name || 'Unknown client',
      }
    } else {
      const s = await supabase
        .from('sites')
        .select('name,long_name')
        .eq('id', id)
        .maybeSingle()
      const row = s.data as { name?: string | null; long_name?: string | null } | null
      scopeContext = {
        scope,
        id,
        displayName: row?.long_name || row?.name || `Unknown ${scope}`,
      }
    }
  }

  const totals = {
    total: reports.length,
    drafts: reports.filter(r => r.status === 'draft').length,
    review: reports.filter(r => r.status === 'review').length,
    approved: reports.filter(r => r.status === 'approved' || r.status === 'sent').length,
  }

  return {
    reports,
    scopeContext,
    totals,
    generatedAt: new Date().toISOString(),
  }
}

// ─── E10b: Report detail (preview + edit) ──────────────────────────

type RawReportDetail = {
  id: string
  client_id: string | null
  title: string | null
  status: ReportStatus
  report_period_start: string | null
  report_period_end: string | null
  pdf_url: string | null
  docx_url: string | null
  html_content: string | null
  period_map_images: string[] | null
  created_at: string
  clients: { name?: string | null; long_name?: string | null; location_maps?: string[] | null } | { name?: string | null; long_name?: string | null; location_maps?: string[] | null }[] | null
  sites: { name?: string | null } | { name?: string | null }[] | null
}

export async function getReportDetail(id: string): Promise<ReportDetail | null> {
  const supabase = await createClient()
  const res = await supabase
    .from('client_reports')
    .select(
      'id,client_id,title,status,report_period_start,report_period_end,pdf_url,docx_url,html_content,period_map_images,created_at,clients(name,long_name,location_maps),sites(name)',
    )
    .eq('id', id)
    .maybeSingle()

  if (res.error) throw new Error(`report detail query failed: ${res.error.message}`)
  if (!res.data) return null

  const r = res.data as RawReportDetail
  const client = Array.isArray(r.clients) ? r.clients[0] : r.clients
  const site = Array.isArray(r.sites) ? r.sites[0] : r.sites

  return {
    id: r.id,
    clientId: r.client_id,
    title: r.title,
    status: r.status,
    reportPeriodStart: r.report_period_start,
    reportPeriodEnd: r.report_period_end,
    pdfUrl: r.pdf_url,
    docxUrl: r.docx_url,
    htmlContent: r.html_content,
    periodMapImages: Array.isArray(r.period_map_images) ? r.period_map_images : null,
    clientName: client?.name ?? null,
    clientLongName: client?.long_name ?? null,
    siteName: site?.name ?? null,
    locationMaps: Array.isArray(client?.location_maps) ? client?.location_maps ?? null : null,
    createdAt: r.created_at,
  }
}
