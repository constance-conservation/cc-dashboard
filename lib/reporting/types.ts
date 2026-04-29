export type ProcessingStatus =
  | 'completed'
  | 'needs_review'
  | 'failed'
  | 'processing'
  | 'pending'
  | 'unknown'

export type StatusCounts = Partial<Record<ProcessingStatus, number>>

export type LabelValue = { label: string; value: number }

export type LandingDashboardData = {
  totalInspections: number
  statusCounts: StatusCounts
  sitesTracked: number
  photosCount: number
  topTasks: LabelValue[]
  topWeeds: LabelValue[]
  topStaffHours: LabelValue[]
  generatedAt: string
}

export const BACKFILL_TARGET = 1683

// ─── E9: Clients / Sites / Zones hierarchy ──────────────────────────

export type ClientSummary = {
  id: string
  name: string
  longName: string | null
  contactName: string | null
  councilOrBody: string | null
  reportFrequency: string | null
  siteCount: number
  zoneCount: number
}

export type ClientsListData = {
  clients: ClientSummary[]
  generatedAt: string
}

export type ClientDetail = {
  id: string
  name: string
  longName: string | null
  contactName: string | null
  councilOrBody: string | null
  contactEmail: string | null
  contactPhone: string | null
  reportFrequency: string | null
}

export type SiteSummary = {
  id: string
  name: string
  longName: string | null
  zoneCount: number
}

export type ClientDetailData = {
  client: ClientDetail
  sites: SiteSummary[]
  generatedAt: string
}

export type SiteDetail = {
  id: string
  clientId: string
  name: string
  longName: string | null
  siteType: string | null
  projectCode: string | null
}

export type ZoneRow = {
  id: string
  name: string
  longName: string | null
  canonicalName: string | null
  inspectionCount: number
  lastInspectionDate: string | null
}

export type SiteDetailData = {
  site: SiteDetail
  clientName: string
  clientLongName: string | null
  zones: ZoneRow[]
  generatedAt: string
}

export type ReportScope = 'client' | 'site' | 'zone'
