export type EmploymentType = 'full-time' | 'part-time' | 'casual' | 'contractor'
export type Priority = 'high' | 'medium' | 'low'
export type WorkUnit = 'days' | 'hours'
export type VehicleStatus = 'ok' | 'warn' | 'danger'
export type AllocationStrategy = 'even' | 'custom'
export type CrewSizeType = 'fixed' | 'range' | 'any'
export type ActivityStatus = 'active' | 'complete' | 'on_hold'
export type CarryoverStatus = 'pending' | 'approved' | 'skipped'
export type CostEntryType = 'material' | 'equipment' | 'subcontractor' | 'other'

export type Availability = {
  mon: boolean
  tue: boolean
  wed: boolean
  thu: boolean
  fri: boolean
  sat: boolean
}

export type Employee = {
  id: string
  name: string
  role: string
  type: EmploymentType
  payRate: number
  availability: Availability
  skills: string[]
  email: string
  phone: string
}

// Top-level project container. Scheduling, crew, and rates live on Activities.
export type Project = {
  id: string
  name: string
  client: string
  start: string
  end: string
  priority: Priority
  contractValue: number
  projectNumber?: string
  archived?: boolean
}

// Physical location in the organisation's location library.
export type Site = {
  id: string
  name: string
  notes?: string
  active: boolean
  sortOrder: number
}

// Links an org site to a specific project contract (many-to-many).
export type ProjectSiteLink = {
  projectId: string
  siteId: string
  sortOrder: number
}

// Org-scoped category/label for activities (e.g. "Bush Regeneration", "Survey").
export type ActivityType = {
  id: string
  name: string
  description?: string
}

// A work package within a project, optionally scoped to a site.
export type Activity = {
  id: string
  projectId: string
  siteId?: string
  activityTypeId?: string
  name: string
  allocationStrategy: AllocationStrategy
  unit: WorkUnit
  totalAllocation: number
  unitsCompleted: number   // populated when initialising an already-started activity
  crewSizeType: CrewSizeType
  minCrew: number
  maxCrew?: number         // only used when crewSizeType === 'range'
  chargeOutRate: number
  overtimeFlag: boolean
  overtimeRate: number
  skills: string[]
  priority: Priority
  status: ActivityStatus
  start: string
  end: string
  notes?: string
  sortOrder: number
}

// Custom per-period allocation bucket (for allocationStrategy === 'custom').
// period: 'YYYY-MM' for monthly, 'YYYY-MM-DD' for a specific date.
export type ActivityAllocation = {
  id: string
  activityId: string
  period: string
  allocation: number
}

// Catch-up queue entry created when a rostered day is understaffed.
export type ActivityCarryover = {
  id: string
  activityId: string
  originalDateKey: string
  unitsMissed: number
  status: CarryoverStatus
  reviewDate?: string
  createdAt: string
}

// Non-labour cost entry for margin tracking on an activity.
export type CostEntry = {
  id: string
  activityId: string
  date: string
  amount: number
  description: string
  type: CostEntryType
}

export type Task = {
  id: string
  text: string
  done: boolean
  added: string
}

export type RosterAssignment = {
  employeeId: string
  projectId: string
  activityId?: string
  siteId?: string
  overtimeHours?: number
}

export type Roster = Record<string, RosterAssignment[]>

export type CCState = {
  projects: Project[]
  sites: Site[]
  projectSiteLinks: ProjectSiteLink[]
  activityTypes: ActivityType[]
  activities: Activity[]
  carryovers: ActivityCarryover[]
  employees: Employee[]
  archivedEmployees: Employee[]
  skills: string[]
  roles: string[]
  tasks: Task[]
  roster: Roster
  rosterMonth: string
}

export type Vehicle = {
  id: string
  registration: string
  make: string
  model: string
  type: string
  status: VehicleStatus
  odometerKm: number
  lastServiceDate: string | null
  nextServiceDueKm: number | null
  gpsLat: number | null
  gpsLon: number | null
  driverName: string | null
  active: boolean
}

export type Invoice = {
  id: string
  invoiceNumber: string | null
  client: string
  amount: number
  issueDate: string
  dueDate: string | null
  paidDate: string | null
  status: string
  description: string | null
}

export type InventoryItem = {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  minStock: number
  location: string | null
  notes: string | null
  active: boolean
}

export type Tender = {
  id: string
  name: string
  client: string
  value: number
  stage: string
  dueDate: string | null
  submittedDate: string | null
  awardedDate: string | null
  notes: string | null
}
