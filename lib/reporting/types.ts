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
