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

// ─── E10: Reports list + viewer ─────────────────────────────────────

export type ReportStatus = 'draft' | 'review' | 'approved' | 'sent'

export type ReportListItem = {
  id: string
  title: string | null
  clientName: string | null
  siteName: string | null
  status: ReportStatus
  reportPeriodStart: string | null
  reportPeriodEnd: string | null
  pdfUrl: string | null
  docxUrl: string | null
  createdAt: string
}

export type ScopeContext = {
  scope: ReportScope | null
  id: string | null
  displayName: string | null
}

export type ReportsListData = {
  reports: ReportListItem[]
  scopeContext: ScopeContext
  totals: {
    total: number
    drafts: number
    review: number
    approved: number
  }
  generatedAt: string
}

// ─── E13: Operations — Staff & Hours ────────────────────────────────

export type StaffRosterRow = {
  id: string
  name: string
  role: string | null
  active: boolean
  inspectionCount: number
  totalHours: number
}

export type StaffData = {
  totalStaff: number
  activeStaff: number
  totalHours: number
  topPerformerName: string | null
  topPerformerHours: number
  hoursByStaff: LabelValue[]
  roster: StaffRosterRow[]
  generatedAt: string
}

// ─── E13: Operations — Chemicals ────────────────────────────────────

export type ChemicalApplicationRecordRow = {
  id: string
  date: string | null
  siteName: string | null
  applicationMethod: string | null
  weatherGeneral: string | null
}

export type ChemicalLookupCard = {
  canonicalName: string
  type: string | null
  activeIngredient: string | null
  mentions: number
}

export type ChemicalsData = {
  chemicalRecords: number
  uniqueChemicals: number
  applicationRecords: number
  mostUsedName: string | null
  mostUsedMentions: number
  usageBars: LabelValue[]
  recentApplications: ChemicalApplicationRecordRow[]
  reference: ChemicalLookupCard[]
  generatedAt: string
}

// ─── E13: Operations — Species ──────────────────────────────────────

export type SpeciesLookupCard = {
  canonicalName: string
  scientificName: string | null
  speciesType: string | null
  category: string | null
  sightings: number
}

export type SpeciesData = {
  totalSightings: number
  uniqueSpecies: number
  referenceCount: number
  mostCommonName: string | null
  mostCommonSightings: number
  frequencyBars: LabelValue[]
  cards: SpeciesLookupCard[]
  generatedAt: string
}
