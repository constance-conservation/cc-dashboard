'use client'

import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react'
import type {
  CCState, Project, Site, ProjectZoneLink, ActivityType, Activity, ActivityAllocation, ActivityCarryover,
  Employee, Task, Roster, RosterAssignment,
  EmploymentType, Priority, WorkUnit, AllocationStrategy, CrewSizeType, ActivityStatus, CarryoverStatus,
  Client, ClientStatus, ClientType,
  Vehicle, VehicleStatus, WeatherConstraint,
} from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

// ── Default availability (mon–fri true, sat false) ────────────────────────────

const DEFAULT_AVAILABILITY = { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false }

// ── DB row mappers ────────────────────────────────────────────────────────────

function rowToEmployee(r: Record<string, unknown>): Employee {
  return {
    id: r.id as string,
    name: r.name as string,
    role: (r.role as string) ?? '',
    type: ((r.employment_type as string) ?? 'full-time') as EmploymentType,
    payRate: (r.pay_rate as number) ?? 0,
    availability: (r.availability as Employee['availability']) ?? { ...DEFAULT_AVAILABILITY },
    skills: Array.isArray(r.capability_tags) ? (r.capability_tags as string[]) : [],
    email: (r.email as string) ?? '',
    phone: (r.phone as string) ?? '',
    address: (r.address as string) || undefined,
    homeLat: (r.home_lat as number) ?? undefined,
    homeLng: (r.home_lng as number) ?? undefined,
  }
}

function rowToProject(r: Record<string, unknown>): Project {
  return {
    id: r.id as string,
    name: (r.contract_name as string) ?? '',
    client: ((r.clients as Record<string, unknown> | null)?.name as string) ?? '',
    start: (r.contract_start_date as string) ?? '',
    end: (r.contract_end_date as string) ?? '',
    priority: ((r.priority as string) ?? 'medium') as Priority,
    contractValue: (r.contract_value as number) ?? 0,
    projectNumber: (r.project_number as string) || undefined,
    archived: (r.archived as boolean) ?? false,
    lat: (r.lat as number) ?? undefined,
    lng: (r.lng as number) ?? undefined,
  }
}

function rowToVehicle(r: Record<string, unknown>): Vehicle {
  return {
    id: r.id as string,
    registration: (r.registration as string) ?? '',
    make: (r.make as string) ?? '',
    model: (r.model as string) ?? '',
    type: (r.type as string) ?? '',
    status: ((r.status as string) ?? 'ok') as VehicleStatus,
    odometerKm: (r.odometer_km as number) ?? 0,
    lastServiceDate: (r.last_service_date as string) ?? null,
    nextServiceDueKm: (r.next_service_due_km as number) ?? null,
    gpsLat: (r.gps_lat as number) ?? null,
    gpsLon: (r.gps_lon as number) ?? null,
    driverName: (r.driver_name as string) ?? null,
    active: (r.active as boolean) ?? true,
  }
}

function rowToSite(r: Record<string, unknown>): Site {
  return {
    id: r.id as string,
    name: (r.name as string) ?? '',
    notes: (r.notes as string) || undefined,
    active: (r.active as boolean) ?? true,
    sortOrder: (r.sort_order as number) ?? 0,
    clientId: (r.client_id as string) || undefined,
  }
}

function rowToProjectZoneLink(r: Record<string, unknown>): ProjectZoneLink {
  return {
    projectId: r.project_id as string,
    siteId: r.site_id as string,
    sortOrder: (r.sort_order as number) ?? 0,
  }
}

function rowToActivityType(r: Record<string, unknown>): ActivityType {
  return {
    id: r.id as string,
    name: (r.name as string) ?? '',
    description: (r.description as string) || undefined,
    requiredEquipmentIds: Array.isArray(r.required_equipment_ids) ? (r.required_equipment_ids as string[]) : [],
    weatherConstraints: Array.isArray(r.weather_constraints) ? (r.weather_constraints as WeatherConstraint[]) : [],
  }
}

function rowToCarryover(r: Record<string, unknown>): ActivityCarryover {
  return {
    id: r.id as string,
    activityId: r.activity_id as string,
    originalDateKey: r.original_date_key as string,
    unitsMissed: (r.units_missed as number) ?? 1,
    status: ((r.status as string) ?? 'pending') as CarryoverStatus,
    reviewDate: (r.review_date as string) || undefined,
    createdAt: r.created_at as string,
  }
}

function rowToActivity(r: Record<string, unknown>): Activity {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    siteId: (r.site_id as string) || undefined,
    activityTypeId: (r.activity_type_id as string) || undefined,
    name: (r.name as string) ?? '',
    allocationStrategy: ((r.allocation_strategy as string) ?? 'even') as AllocationStrategy,
    unit: ((r.unit as string) ?? 'days') as WorkUnit,
    totalAllocation: (r.total_allocation as number) ?? 0,
    unitsCompleted: (r.units_completed as number) ?? 0,
    crewSizeType: ((r.crew_size_type as string) ?? 'fixed') as CrewSizeType,
    minCrew: (r.min_crew as number) ?? 1,
    maxCrew: (r.max_crew as number) || undefined,
    chargeOutRate: (r.charge_out_rate as number) ?? 0,
    overtimeFlag: (r.overtime_flag as boolean) ?? false,
    overtimeRate: (r.overtime_rate as number) ?? 1.5,
    skills: Array.isArray(r.required_skills) ? (r.required_skills as string[]) : [],
    priority: ((r.priority as string) ?? 'medium') as Priority,
    status: ((r.status as string) ?? 'active') as ActivityStatus,
    start: (r.start_date as string) ?? '',
    end: (r.end_date as string) ?? '',
    notes: (r.notes as string) || undefined,
    sortOrder: (r.sort_order as number) ?? 0,
  }
}

function rowToClient(r: Record<string, unknown>): Client {
  return {
    id: r.id as string,
    name: (r.name as string) ?? '',
    status: ((r.status as string) ?? 'active') as ClientStatus,
    clientType: (r.client_type as ClientType) || undefined,
    contactName: (r.contact_name as string) || undefined,
    email: (r.email as string) || undefined,
    phone: (r.phone as string) || undefined,
    notes: (r.notes as string) || undefined,
    abn: (r.abn as string) || undefined,
  }
}

// ── DB patch builders ─────────────────────────────────────────────────────────

function staffPatch(e: Partial<Employee>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (e.name !== undefined)         row.name            = e.name
  if (e.role !== undefined)         row.role            = e.role
  if (e.type !== undefined)         row.employment_type = e.type
  if (e.payRate !== undefined)      row.pay_rate        = e.payRate
  if (e.availability !== undefined) row.availability    = e.availability
  if (e.skills !== undefined)       row.capability_tags = e.skills
  if (e.email !== undefined)        row.email           = e.email
  if (e.phone !== undefined)        row.phone           = e.phone
  if (e.address  !== undefined) row.address  = e.address  ?? null
  if (e.homeLat  !== undefined) row.home_lat = e.homeLat  ?? null
  if (e.homeLng  !== undefined) row.home_lng = e.homeLng  ?? null
  return row
}

function contractPatch(p: Partial<Project>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (p.name !== undefined)          row.contract_name       = p.name
  if (p.start !== undefined)         row.contract_start_date = p.start
  if (p.end !== undefined)           row.contract_end_date   = p.end
  if (p.priority !== undefined)      row.priority            = p.priority
  if (p.contractValue !== undefined) row.contract_value      = p.contractValue
  if (p.projectNumber !== undefined) row.project_number      = p.projectNumber
  if (p.archived !== undefined)      row.archived            = p.archived
  if (p.lat !== undefined)           row.lat                 = p.lat ?? null
  if (p.lng !== undefined)           row.lng                 = p.lng ?? null
  return row
}

function sitePatch(s: Partial<Site>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (s.name !== undefined)     row.name      = s.name
  if (s.notes !== undefined)    row.notes     = s.notes
  if (s.active !== undefined)   row.active    = s.active
  if (s.sortOrder !== undefined) row.sort_order = s.sortOrder
  if (s.clientId !== undefined) row.client_id = s.clientId ?? null
  return row
}

function activityPatch(a: Partial<Activity>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (a.siteId !== undefined)             row.site_id             = a.siteId ?? null
  if (a.activityTypeId !== undefined)     row.activity_type_id    = a.activityTypeId ?? null
  if (a.name !== undefined)               row.name                = a.name
  if (a.allocationStrategy !== undefined) row.allocation_strategy = a.allocationStrategy
  if (a.unit !== undefined)               row.unit                = a.unit
  if (a.totalAllocation !== undefined)    row.total_allocation    = a.totalAllocation
  if (a.unitsCompleted !== undefined)     row.units_completed     = a.unitsCompleted
  if (a.crewSizeType !== undefined)       row.crew_size_type      = a.crewSizeType
  if (a.minCrew !== undefined)            row.min_crew            = a.minCrew
  if (a.maxCrew !== undefined)            row.max_crew            = a.maxCrew ?? null
  if (a.chargeOutRate !== undefined)      row.charge_out_rate     = a.chargeOutRate
  if (a.overtimeFlag !== undefined)       row.overtime_flag       = a.overtimeFlag
  if (a.overtimeRate !== undefined)       row.overtime_rate       = a.overtimeRate
  if (a.skills !== undefined)             row.required_skills     = a.skills
  if (a.priority !== undefined)           row.priority            = a.priority
  if (a.status !== undefined)             row.status              = a.status
  if (a.start !== undefined)              row.start_date          = a.start
  if (a.end !== undefined)                row.end_date            = a.end
  if (a.notes !== undefined)              row.notes               = a.notes ?? null
  if (a.sortOrder !== undefined)          row.sort_order          = a.sortOrder
  return row
}

function clientPatch(c: Partial<Client>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (c.name !== undefined)        row.name         = c.name
  if (c.status !== undefined)      row.status       = c.status
  if (c.clientType !== undefined)  row.client_type  = c.clientType ?? null
  if (c.contactName !== undefined) row.contact_name = c.contactName ?? null
  if (c.email !== undefined)       row.email        = c.email ?? null
  if (c.phone !== undefined)       row.phone        = c.phone ?? null
  if (c.notes !== undefined)       row.notes        = c.notes ?? null
  if (c.abn !== undefined)         row.abn          = c.abn ?? null
  return row
}

// ── Types ─────────────────────────────────────────────────────────────────────

type CCActions = {
  // Projects
  updateProject:    (id: string, patch: Partial<Project>) => void
  addProject:       (p: Omit<Project, 'id'>) => Promise<{ id: string } | string>
  deleteProject:    (id: string) => void
  archiveProject:   (id: string) => void
  restoreProject:   (id: string) => void
  // Sites
  createSiteForClient: (clientId: string, name: string, notes?: string) => Promise<string | null>
  createAndLinkSite: (projectId: string, name: string, notes?: string, clientId?: string) => Promise<string | null>
  linkSite:          (projectId: string, siteId: string) => Promise<void>
  unlinkSite:        (projectId: string, siteId: string) => void
  updateSite:        (id: string, patch: Partial<Site>) => void
  deleteSite:        (siteId: string) => void
  // Activity Types
  addActivityType:    (name: string, description?: string) => void
  updateActivityType: (id: string, patch: Partial<Pick<ActivityType, 'name' | 'description' | 'requiredEquipmentIds' | 'weatherConstraints'>>) => void
  deleteActivityType: (id: string) => void
  // Activities
  addActivity:      (a: Omit<Activity, 'id'>) => Promise<string>
  updateActivity:   (id: string, patch: Partial<Activity>) => void
  deleteActivity:   (id: string) => void
  // Carryovers
  addCarryovers:    (items: Omit<ActivityCarryover, 'id' | 'createdAt'>[]) => Promise<void>
  updateCarryover:  (id: string, status: CarryoverStatus) => void
  // Allocations
  setActivityAllocations: (activityId: string, periods: { period: string; allocation: number }[]) => Promise<void>
  // Employees
  updateEmployee:   (id: string, patch: Partial<Employee>) => void
  addEmployee:      (e: Omit<Employee, 'id'>) => void
  deleteEmployee:   (id: string) => void
  archiveEmployee:  (id: string) => void
  unarchiveEmployee:(id: string) => void
  // Skills
  addSkill:         (skill: string) => void
  removeSkill:      (skill: string) => void
  renameSkill:      (oldName: string, newName: string) => void
  // Roles
  addRole:          (role: string) => void
  removeRole:       (role: string) => void
  renameRole:       (oldName: string, newName: string) => void
  // Tasks
  addTask:          (text: string) => void
  toggleTask:       (id: string) => void
  deleteTask:       (id: string) => void
  // Roster
  setRoster:        (roster: Roster) => void
  updateDay:        (dateKey: string, assignments: RosterAssignment[]) => void
  setRosterMonth:   (ym: string) => void
  resetAll:         () => void
  loading:          boolean
  currentUserName:  string | null
  // Clients
  addClient:     (c: Omit<Client, 'id'>) => Promise<string | null>
  updateClient:  (id: string, patch: Partial<Client>) => void
  archiveClient: (id: string) => void
  restoreClient: (id: string) => void
  deleteClient:  (id: string) => void
}

type CCContext = CCState & CCActions

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_STATE: CCState = {
  projects: [], sites: [], projectZoneLinks: [], activityTypes: [], activities: [], carryovers: [], allocations: [],
  employees: [], archivedEmployees: [], skills: [], roles: [],
  tasks: [], roster: {}, rosterMonth: new Date().toISOString().slice(0, 7),
  clients: [], archivedClients: [], vehicles: [],
}

const StateContext = createContext<CCContext | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [orgId, setOrgId] = useState('')
  const [state, setState] = useState<CCState>(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)

  // stateRef is kept in sync on every render so async callbacks always have
  // access to the latest state without stale closure issues.
  const stateRef = useRef<CCState & { orgId: string }>({ ...EMPTY_STATE, orgId: '' })
  stateRef.current = { ...state, orgId }

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      // Step 1: resolve organisation id
      const { data: orgRow, error: orgErr } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single()

      if (orgErr || !orgRow) {
        console.error('Failed to load organization:', orgErr)
        setLoading(false)
        return
      }

      const oid = orgRow.id as string
      setOrgId(oid)

      // Step 1b: resolve logged-in user's name
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: userStaffRow } = await supabase
          .from('staff')
          .select('name')
          .eq('organization_id', oid)
          .ilike('email', user.email)
          .eq('active', true)
          .limit(1)
          .maybeSingle()
        if (userStaffRow) {
          setCurrentUserName((userStaffRow as Record<string, unknown>).name as string)
        }
      }

      // Step 2: load all dashboard data in parallel
      const [
        { data: staffRows,            error: staffErr },
        { data: contractRows,         error: contractErr },
        { data: siteRows },
        { data: projectZoneLinkRows },
        { data: activityTypeRows },
        { data: activityRows },
        { data: carryoverRows },
        { data: skillRows },
        { data: roleRows },
        { data: taskRows },
        { data: rosterRows },
        { data: clientRows },
        { data: allocationRows },
        { data: vehicleRows },
      ] = await Promise.all([
        supabase
          .from('staff')
          .select('*')
          .eq('organization_id', oid)
          .order('name'),
        supabase
          .from('client_contracts')
          .select('*, clients(name)')
          .eq('clients.organization_id', oid),
        supabase
          .from('sites')
          .select('id, name, notes, active, sort_order, client_id')
          .eq('organization_id', oid)
          .order('name'),
        supabase
          .from('project_zone_links')
          .select('project_id, site_id, sort_order')
          .eq('organization_id', oid),
        supabase
          .from('activity_types')
          .select('*')
          .eq('organization_id', oid)
          .order('name'),
        supabase
          .from('activities')
          .select('*')
          .eq('organization_id', oid)
          .order('sort_order'),
        supabase
          .from('activity_carryovers')
          .select('*')
          .eq('organization_id', oid)
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('skills')
          .select('name')
          .eq('organization_id', oid)
          .order('name'),
        supabase
          .from('roles')
          .select('name')
          .eq('organization_id', oid)
          .order('name'),
        supabase
          .from('dashboard_tasks')
          .select('*')
          .eq('organization_id', oid)
          .order('created_at', { ascending: false }),
        supabase
          .from('roster_assignments')
          .select('*')
          .eq('organization_id', oid),
        supabase.from('clients').select('*').eq('organization_id', oid).order('name'),
        supabase
          .from('activity_allocations')
          .select('id, activity_id, period, allocation')
          .order('period'),
        supabase
          .from('vehicles')
          .select('*')
          .eq('organization_id', oid)
          .eq('active', true)
          .order('registration'),
      ])

      if (staffErr)    console.error('load staff:',     staffErr)
      if (contractErr) console.error('load contracts:', contractErr)

      // Build roster map keyed by date_key
      const roster: Roster = {}
      for (const row of rosterRows ?? []) {
        const r = row as Record<string, unknown>
        const dk = r.date_key as string
        if (!roster[dk]) roster[dk] = []
        roster[dk].push({
          employeeId:    r.staff_id as string,
          projectId:     r.contract_id as string,
          activityId:    r.activity_id != null ? (r.activity_id as string) : undefined,
          siteId:        r.site_id     != null ? (r.site_id     as string) : undefined,
          overtimeHours: r.overtime_hours != null ? (r.overtime_hours as number) : undefined,
        })
      }

      const allStaff = (staffRows ?? []).map(r => r as Record<string, unknown>)
      setState({
        employees:         allStaff.filter(r => r.active !== false && r.deleted !== true).map(rowToEmployee),
        archivedEmployees: allStaff.filter(r => r.active === false && r.deleted !== true).map(rowToEmployee),
        projects:          (contractRows         ?? []).map(r => rowToProject(r         as Record<string, unknown>)),
        sites:             (siteRows             ?? []).map(r => rowToSite(r            as Record<string, unknown>)),
        projectZoneLinks:  (projectZoneLinkRows  ?? []).map(r => rowToProjectZoneLink(r as Record<string, unknown>)),
        activityTypes:     (activityTypeRows     ?? []).map(r => rowToActivityType(r    as Record<string, unknown>)),
        activities:        (activityRows     ?? []).map(r => rowToActivity(r    as Record<string, unknown>)),
        carryovers:        (carryoverRows    ?? []).map(r => rowToCarryover(r   as Record<string, unknown>)),
        allocations: (allocationRows ?? []).map(r => {
          const row = r as Record<string, unknown>
          return {
            id: row.id as string,
            activityId: row.activity_id as string,
            period: row.period as string,
            allocation: row.allocation as number,
          } satisfies ActivityAllocation
        }),
        skills:            (skillRows        ?? []).map(r => (r as Record<string, unknown>).name as string),
        roles:             (roleRows         ?? []).map(r => (r as Record<string, unknown>).name as string),
        tasks:             (taskRows         ?? []).map(r => {
          const t = r as Record<string, unknown>
          return {
            id:    t.id    as string,
            text:  t.text  as string,
            done:  t.done  as boolean,
            added: t.added as string,
          } satisfies Task
        }),
        roster,
        rosterMonth: stateRef.current.rosterMonth,
        clients:         (clientRows ?? []).filter(r => (r as Record<string, unknown>).status !== 'archived').map(r => rowToClient(r as Record<string, unknown>)),
        archivedClients: (clientRows ?? []).filter(r => (r as Record<string, unknown>).status === 'archived').map(r => rowToClient(r as Record<string, unknown>)),
        vehicles:        (vehicleRows ?? []).map(r => rowToVehicle(r as Record<string, unknown>)),
      })
      setLoading(false)
    }

    load().catch(err => {
      console.error('Failed to load from Supabase:', err)
      setLoading(false)
    })
  }, [])

  const actions = useMemo<CCActions>(() => {
    const db  = createClient()
    const ref = () => stateRef.current

    // ── Projects ───────────────────────────────────────────────

    function updateProject(id: string, patch: Partial<Project>) {
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === id ? { ...p, ...patch } : p),
      }))
      db.from('client_contracts')
        .update(contractPatch(patch))
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('updateProject:', error) })
    }

    async function addProject(p: Omit<Project, 'id'>): Promise<{ id: string } | string> {
      const { orgId: oid } = ref()

      // Find or create client by name
      let clientId: string | null = null
      if (p.client.trim()) {
        const { data: existingClients, error: lookupErr } = await db
          .from('clients')
          .select('id')
          .eq('organization_id', oid)
          .ilike('name', p.client)
          .limit(1)

        if (lookupErr) console.warn('addProject — client lookup:', lookupErr)

        if (existingClients && existingClients.length > 0) {
          clientId = (existingClients[0] as Record<string, unknown>).id as string
        } else {
          const { data: newClient, error: clientErr } = await db
            .from('clients')
            .insert({ organization_id: oid, name: p.client.trim() })
            .select('id')
            .single()
          if (clientErr) {
            console.error('addProject — create client:', clientErr.code, clientErr.message)
            return `Client error [${clientErr.code}]: ${clientErr.message}`
          }
          clientId = (newClient as Record<string, unknown>).id as string
        }
      }

      const { data: inserted, error } = await db
        .from('client_contracts')
        .insert({
          client_id:           clientId,
          contract_name:       p.name,
          contract_start_date: p.start || null,
          contract_end_date:   p.end   || null,
          priority:            p.priority,
          contract_value:      p.contractValue,
          project_number:      p.projectNumber ?? null,
        })
        .select('id')
        .single()

      if (error || !inserted) {
        console.error('addProject:', error?.code, error?.message, error?.details, error?.hint)
        return `[${error?.code ?? '?'}] ${error?.message ?? 'Unknown error'}`
      }

      const realId = (inserted as Record<string, unknown>).id as string
      setState(prev => ({ ...prev, projects: [...prev.projects, { id: realId, ...p }] }))
      return { id: realId }
    }

    function deleteProject(id: string) {
      setState(prev => ({
        ...prev,
        projects:         prev.projects.filter(p => p.id !== id),
        projectZoneLinks: prev.projectZoneLinks.filter(l => l.projectId !== id),
        activities:       prev.activities.filter(a => a.projectId !== id),
      }))
      db.from('client_contracts')
        .delete()
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('deleteProject:', error) })
    }

    function archiveProject(id: string) {
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === id ? { ...p, archived: true } : p),
      }))
      db.from('client_contracts')
        .update({ archived: true })
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('archiveProject:', error) })
    }

    function restoreProject(id: string) {
      setState(prev => ({
        ...prev,
        projects: prev.projects.map(p => p.id === id ? { ...p, archived: false } : p),
      }))
      db.from('client_contracts')
        .update({ archived: false })
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('restoreProject:', error) })
    }

    // ── Sites ──────────────────────────────────────────────────

    async function createSiteForClient(clientId: string, name: string, notes?: string): Promise<string | null> {
      const { orgId: oid } = ref()
      const { data: inserted, error } = await db
        .from('sites')
        .insert({ organization_id: oid, client_id: clientId, name, notes: notes ?? null, active: true, sort_order: 0 })
        .select('id')
        .single()
      if (error || !inserted) {
        console.error('createSiteForClient:', error)
        return error?.message ?? 'Unknown error'
      }
      const realId = (inserted as Record<string, unknown>).id as string
      setState(prev => ({
        ...prev,
        sites: [...prev.sites, { id: realId, name, notes, active: true, sortOrder: 0, clientId }]
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      return null
    }

    async function createAndLinkSite(projectId: string, name: string, notes?: string, clientId?: string): Promise<string | null> {
      const { orgId: oid } = ref()
      const tempSiteId = 'temp-' + Date.now()
      const optimisticSite: Site = { id: tempSiteId, name, notes, active: true, sortOrder: 0, clientId }
      const optimisticLink: ProjectZoneLink = { projectId, siteId: tempSiteId, sortOrder: 0 }
      setState(prev => ({
        ...prev,
        sites: [...prev.sites, optimisticSite].sort((a, b) => a.name.localeCompare(b.name)),
        projectZoneLinks: [...prev.projectZoneLinks, optimisticLink],
      }))

      const { data: inserted, error } = await db
        .from('sites')
        .insert({ organization_id: oid, client_id: clientId ?? null, name, notes: notes ?? null, active: true, sort_order: 0 })
        .select('id')
        .single()

      if (error || !inserted) {
        console.error('createAndLinkSite:', error)
        setState(prev => ({
          ...prev,
          sites: prev.sites.filter(s => s.id !== tempSiteId),
          projectZoneLinks: prev.projectZoneLinks.filter(l => l.siteId !== tempSiteId),
        }))
        return null
      }

      const realSiteId = (inserted as Record<string, unknown>).id as string
      setState(prev => ({
        ...prev,
        sites: prev.sites.map(s => s.id === tempSiteId ? { ...s, id: realSiteId } : s),
        projectZoneLinks: prev.projectZoneLinks.map(l =>
          l.siteId === tempSiteId ? { ...l, siteId: realSiteId } : l
        ),
      }))

      const { error: le } = await db.from('project_zone_links')
        .upsert({ organization_id: oid, project_id: projectId, site_id: realSiteId, sort_order: 0 }, { ignoreDuplicates: true })
      if (le) {
        console.error('createAndLinkSite (link):', le)
        setState(prev => ({
          ...prev,
          projectZoneLinks: prev.projectZoneLinks.filter(l => l.siteId !== realSiteId || l.projectId !== projectId),
        }))
      }

      return realSiteId
    }

    async function linkSite(projectId: string, siteId: string) {
      const { orgId: oid } = ref()
      setState(prev => ({
        ...prev,
        projectZoneLinks: [...prev.projectZoneLinks, { projectId, siteId, sortOrder: 0 }],
      }))
      const { error } = await db.from('project_zone_links')
        .upsert({ organization_id: oid, project_id: projectId, site_id: siteId, sort_order: 0 }, { ignoreDuplicates: true })
      if (error) {
        console.error('linkSite:', error)
        setState(prev => ({
          ...prev,
          projectZoneLinks: prev.projectZoneLinks.filter(l => !(l.projectId === projectId && l.siteId === siteId)),
        }))
      }
    }

    function unlinkSite(projectId: string, siteId: string) {
      setState(prev => ({
        ...prev,
        projectZoneLinks: prev.projectZoneLinks.filter(
          l => !(l.projectId === projectId && l.siteId === siteId)
        ),
        activities: prev.activities.map(a =>
          a.projectId === projectId && a.siteId === siteId ? { ...a, siteId: undefined } : a
        ),
      }))
      db.from('project_zone_links')
        .delete()
        .eq('project_id', projectId)
        .eq('site_id', siteId)
        .then(({ error }) => { if (error) console.error('unlinkSite:', error) })
    }

    function updateSite(id: string, patch: Partial<Site>) {
      setState(prev => ({
        ...prev,
        sites: prev.sites.map(s => s.id === id ? { ...s, ...patch } : s),
      }))
      db.from('sites')
        .update(sitePatch(patch))
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('updateSite:', error) })
    }

    function deleteSite(siteId: string) {
      setState(prev => ({
        ...prev,
        sites: prev.sites.filter(s => s.id !== siteId),
        projectZoneLinks: prev.projectZoneLinks.filter(l => l.siteId !== siteId),
      }))
      db.from('sites')
        .delete()
        .eq('id', siteId)
        .then(({ error }) => { if (error) console.error('deleteSite:', error) })
    }

    // ── Activity Types ─────────────────────────────────────────

    async function addActivityType(name: string, description?: string) {
      const { orgId: oid } = ref()
      const tempId = 'temp-' + Date.now()
      const optimistic: ActivityType = { id: tempId, name, description }
      setState(prev => ({ ...prev, activityTypes: [...prev.activityTypes, optimistic].sort((a, b) => a.name.localeCompare(b.name)) }))
      const { data: inserted, error } = await db
        .from('activity_types')
        .insert({ organization_id: oid, name, description: description ?? null })
        .select('id')
        .single()
      if (error || !inserted) {
        console.error('addActivityType:', error)
        setState(prev => ({ ...prev, activityTypes: prev.activityTypes.filter(t => t.id !== tempId) }))
        return
      }
      const realId = (inserted as Record<string, unknown>).id as string
      setState(prev => ({
        ...prev,
        activityTypes: prev.activityTypes.map(t => t.id === tempId ? { ...t, id: realId } : t),
      }))
    }

    function updateActivityType(id: string, patch: Partial<Pick<ActivityType, 'name' | 'description' | 'requiredEquipmentIds' | 'weatherConstraints'>>) {
      setState(prev => ({
        ...prev,
        activityTypes: prev.activityTypes.map(t => t.id === id ? { ...t, ...patch } : t),
      }))
      const row: Record<string, unknown> = {}
      if (patch.name !== undefined)                 row.name                   = patch.name
      if (patch.description !== undefined)          row.description            = patch.description ?? null
      if (patch.requiredEquipmentIds !== undefined) row.required_equipment_ids = patch.requiredEquipmentIds
      if (patch.weatherConstraints !== undefined)   row.weather_constraints    = patch.weatherConstraints
      db.from('activity_types')
        .update(row)
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('updateActivityType:', error) })
    }

    function deleteActivityType(id: string) {
      setState(prev => ({
        ...prev,
        activityTypes: prev.activityTypes.filter(t => t.id !== id),
      }))
      db.from('activity_types')
        .delete()
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('deleteActivityType:', error) })
    }

    // ── Activities ─────────────────────────────────────────────

    async function addActivity(a: Omit<Activity, 'id'>): Promise<string> {
      const tempId = 'temp-' + Date.now()
      const optimistic: Activity = { id: tempId, ...a }
      setState(prev => ({ ...prev, activities: [...prev.activities, optimistic] }))

      const { orgId: oid } = ref()
      const { data: inserted, error } = await db
        .from('activities')
        .insert({
          organization_id:     oid,
          project_id:          a.projectId,
          site_id:             a.siteId ?? null,
          activity_type_id:    a.activityTypeId ?? null,
          name:                a.name,
          allocation_strategy: a.allocationStrategy,
          unit:                a.unit,
          total_allocation:    a.totalAllocation,
          units_completed:     a.unitsCompleted,
          crew_size_type:      a.crewSizeType,
          min_crew:            a.minCrew,
          max_crew:            a.maxCrew ?? null,
          charge_out_rate:     a.chargeOutRate,
          overtime_flag:       a.overtimeFlag,
          overtime_rate:       a.overtimeRate,
          required_skills:     a.skills,
          priority:            a.priority,
          status:              a.status,
          start_date:          a.start,
          end_date:            a.end,
          notes:               a.notes ?? null,
          sort_order:          a.sortOrder,
        })
        .select('id')
        .single()

      if (error || !inserted) {
        console.error('addActivity:', error)
        setState(prev => ({ ...prev, activities: prev.activities.filter(x => x.id !== tempId) }))
        return ''
      }

      const realId = (inserted as Record<string, unknown>).id as string
      setState(prev => ({
        ...prev,
        activities: prev.activities.map(x => x.id === tempId ? { ...x, id: realId } : x),
      }))
      return realId
    }

    function updateActivity(id: string, patch: Partial<Activity>) {
      setState(prev => ({
        ...prev,
        activities: prev.activities.map(a => a.id === id ? { ...a, ...patch } : a),
      }))
      db.from('activities')
        .update(activityPatch(patch))
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('updateActivity:', error) })
    }

    function deleteActivity(id: string) {
      setState(prev => ({
        ...prev,
        activities:  prev.activities.filter(a => a.id !== id),
        allocations: prev.allocations.filter(a => a.activityId !== id),
      }))
      db.from('activities')
        .delete()
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('deleteActivity:', error) })
      db.from('activity_allocations')
        .delete()
        .eq('activity_id', id)
        .then(({ error }) => { if (error) console.error('deleteActivity (allocations):', error) })
    }

    // ── Carryovers ─────────────────────────────────────────────

    async function addCarryovers(items: Omit<ActivityCarryover, 'id' | 'createdAt'>[]) {
      if (items.length === 0) return
      const { orgId: oid } = ref()
      const now = new Date().toISOString()
      const tempItems: ActivityCarryover[] = items.map((item, i) => ({
        ...item,
        id: `temp-${Date.now()}-${i}`,
        createdAt: now,
      }))
      setState(prev => ({ ...prev, carryovers: [...prev.carryovers, ...tempItems] }))

      const rows = items.map(item => ({
        organization_id:   oid,
        activity_id:       item.activityId,
        original_date_key: item.originalDateKey,
        units_missed:      item.unitsMissed,
        status:            item.status,
        review_date:       item.reviewDate ?? null,
      }))
      const { data: inserted, error } = await db
        .from('activity_carryovers')
        .insert(rows)
        .select('id')

      if (error || !inserted) {
        console.error('addCarryovers:', error)
        const tempIds = new Set(tempItems.map(t => t.id))
        setState(prev => ({ ...prev, carryovers: prev.carryovers.filter(c => !tempIds.has(c.id)) }))
        return
      }

      const realIds = (inserted as Record<string, unknown>[]).map(r => r.id as string)
      setState(prev => ({
        ...prev,
        carryovers: prev.carryovers.map(c => {
          const i = tempItems.findIndex(t => t.id === c.id)
          return i >= 0 ? { ...c, id: realIds[i] } : c
        }),
      }))
    }

    function updateCarryover(id: string, status: CarryoverStatus) {
      setState(prev => ({
        ...prev,
        carryovers: prev.carryovers.map(c => c.id === id ? { ...c, status } : c),
      }))
      db.from('activity_carryovers')
        .update({ status })
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('updateCarryover:', error) })
    }

    async function setActivityAllocations(activityId: string, periods: { period: string; allocation: number }[]) {
      const { orgId: oid } = ref()
      // Optimistic update: replace all allocations for this activity
      setState(prev => ({
        ...prev,
        allocations: [
          ...prev.allocations.filter(a => a.activityId !== activityId),
          ...periods.map((p, i) => ({ id: `temp-${activityId}-${i}`, activityId, period: p.period, allocation: p.allocation })),
        ],
      }))
      // Delete existing rows for this activity
      const { error: delErr } = await db
        .from('activity_allocations')
        .delete()
        .eq('activity_id', activityId)
      if (delErr) { console.error('setActivityAllocations delete:', delErr); return }
      if (periods.length === 0) return
      // Insert new rows
      const rows = periods.map(p => ({
        activity_id: activityId,
        period: p.period,
        allocation: p.allocation,
      }))
      const { data: inserted, error: insErr } = await db
        .from('activity_allocations')
        .insert(rows)
        .select('id, activity_id, period, allocation')
      if (insErr) { console.error('setActivityAllocations insert:', insErr); return }
      // Replace temp IDs with real IDs
      const real = (inserted ?? []) as Record<string, unknown>[]
      setState(prev => ({
        ...prev,
        allocations: [
          ...prev.allocations.filter(a => a.activityId !== activityId),
          ...real.map(r => ({
            id: r.id as string,
            activityId: r.activity_id as string,
            period: r.period as string,
            allocation: r.allocation as number,
          })),
        ],
      }))
    }

    // ── Employees ──────────────────────────────────────────────

    function updateEmployee(id: string, patch: Partial<Employee>) {
      setState(prev => ({
        ...prev,
        employees:         prev.employees.map(e => e.id === id ? { ...e, ...patch } : e),
        archivedEmployees: prev.archivedEmployees.map(e => e.id === id ? { ...e, ...patch } : e),
      }))
      db.from('staff')
        .update(staffPatch(patch))
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('updateEmployee:', error) })
    }

    async function addEmployee(e: Omit<Employee, 'id'>) {
      const tempId = 'temp-' + Date.now()
      const optimistic: Employee = { id: tempId, ...e }
      setState(prev => ({ ...prev, employees: [...prev.employees, optimistic] }))

      const { orgId: oid } = ref()
      const { data: inserted, error } = await db
        .from('staff')
        .insert({
          organization_id: oid,
          name:            e.name,
          role:            e.role,
          employment_type: e.type,
          pay_rate:        e.payRate,
          availability:    e.availability,
          capability_tags: e.skills,
          email:           e.email,
          phone:           e.phone,
          address:         e.address  ?? null,
          home_lat:        e.homeLat  ?? null,
          home_lng:        e.homeLng  ?? null,
          active:          true,
        })
        .select('id')
        .single()

      if (error || !inserted) {
        console.error('addEmployee:', error)
        setState(prev => ({ ...prev, employees: prev.employees.filter(x => x.id !== tempId) }))
        return
      }

      const realId = (inserted as Record<string, unknown>).id as string
      setState(prev => ({
        ...prev,
        employees: prev.employees.map(x => x.id === tempId ? { ...x, id: realId } : x),
      }))
    }

    function deleteEmployee(id: string) {
      setState(prev => ({
        ...prev,
        employees:         prev.employees.filter(e => e.id !== id),
        archivedEmployees: prev.archivedEmployees.filter(e => e.id !== id),
      }))
      db.from('staff')
        .update({ active: false, deleted: true })
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('deleteEmployee:', error) })
    }

    const CLEARED_AVAIL = { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false }

    function archiveEmployee(id: string) {
      setState(prev => {
        const emp = prev.employees.find(e => e.id === id)
        if (!emp) return prev
        return {
          ...prev,
          employees:         prev.employees.filter(e => e.id !== id),
          archivedEmployees: [...prev.archivedEmployees, { ...emp, availability: CLEARED_AVAIL }],
        }
      })
      db.from('staff')
        .update({ active: false, availability: CLEARED_AVAIL })
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('archiveEmployee:', error) })
    }

    function unarchiveEmployee(id: string) {
      setState(prev => {
        const emp = prev.archivedEmployees.find(e => e.id === id)
        if (!emp) return prev
        return {
          ...prev,
          archivedEmployees: prev.archivedEmployees.filter(e => e.id !== id),
          employees:         [...prev.employees, emp],
        }
      })
      db.from('staff')
        .update({ active: true })
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('unarchiveEmployee:', error) })
    }

    // ── Skills ─────────────────────────────────────────────────

    function addSkill(skill: string) {
      if (ref().skills.includes(skill)) return
      setState(prev => ({ ...prev, skills: [...prev.skills, skill] }))
      db.from('skills')
        .insert({ organization_id: ref().orgId, name: skill })
        .then(({ error }) => { if (error) console.error('addSkill:', error) })
    }

    function removeSkill(skill: string) {
      const oid = ref().orgId
      setState(prev => ({ ...prev, skills: prev.skills.filter(x => x !== skill) }))
      db.from('skills')
        .delete()
        .eq('organization_id', oid)
        .eq('name', skill)
        .then(({ error }) => { if (error) console.error('removeSkill:', error) })
    }

    function renameSkill(oldName: string, newName: string) {
      if (!newName.trim() || oldName === newName) return
      const oid = ref().orgId

      setState(prev => ({
        ...prev,
        skills:     prev.skills.map(x => x === oldName ? newName : x),
        employees:  prev.employees.map(e => ({
          ...e,
          skills: e.skills.map(x => x === oldName ? newName : x),
        })),
        activities: prev.activities.map(a => ({
          ...a,
          skills: a.skills.map(x => x === oldName ? newName : x),
        })),
      }))

      db.from('skills')
        .update({ name: newName })
        .eq('organization_id', oid)
        .eq('name', oldName)
        .then(({ error }) => { if (error) console.error('renameSkill skills table:', error) })

      const affectedStaff = ref().employees.filter(e => e.skills.includes(oldName))
      affectedStaff.forEach(e => {
        db.from('staff')
          .update({ capability_tags: e.skills.map(x => x === oldName ? newName : x) })
          .eq('id', e.id)
          .then(({ error }) => { if (error) console.error('renameSkill staff:', error) })
      })

      const affectedActivities = ref().activities.filter(a => a.skills.includes(oldName))
      affectedActivities.forEach(a => {
        db.from('activities')
          .update({ required_skills: a.skills.map(x => x === oldName ? newName : x) })
          .eq('id', a.id)
          .then(({ error }) => { if (error) console.error('renameSkill activities:', error) })
      })
    }

    // ── Roles ──────────────────────────────────────────────────

    function addRole(role: string) {
      if (ref().roles.includes(role)) return
      setState(prev => ({ ...prev, roles: [...prev.roles, role] }))
      db.from('roles')
        .insert({ organization_id: ref().orgId, name: role })
        .then(({ error }) => { if (error) console.error('addRole:', error) })
    }

    function removeRole(role: string) {
      const oid = ref().orgId
      setState(prev => ({ ...prev, roles: prev.roles.filter(x => x !== role) }))
      db.from('roles')
        .delete()
        .eq('organization_id', oid)
        .eq('name', role)
        .then(({ error }) => { if (error) console.error('removeRole:', error) })
    }

    function renameRole(oldName: string, newName: string) {
      if (!newName.trim() || oldName === newName) return
      const oid = ref().orgId

      setState(prev => ({
        ...prev,
        roles:     prev.roles.map(x => x === oldName ? newName : x),
        employees: prev.employees.map(e => e.role === oldName ? { ...e, role: newName } : e),
      }))

      db.from('roles')
        .update({ name: newName })
        .eq('organization_id', oid)
        .eq('name', oldName)
        .then(({ error }) => { if (error) console.error('renameRole roles table:', error) })

      const affectedStaff = ref().employees.filter(e => e.role === oldName)
      affectedStaff.forEach(e => {
        db.from('staff')
          .update({ role: newName })
          .eq('id', e.id)
          .then(({ error }) => { if (error) console.error('renameRole staff:', error) })
      })
    }

    // ── Tasks ──────────────────────────────────────────────────

    async function addTask(text: string) {
      const today = new Date().toISOString().slice(0, 10)
      const tempId = 'temp-' + Date.now()
      const optimistic: Task = { id: tempId, text, done: false, added: today }
      setState(prev => ({ ...prev, tasks: [optimistic, ...prev.tasks] }))

      const { orgId: oid } = ref()
      const { data: inserted, error } = await db
        .from('dashboard_tasks')
        .insert({ organization_id: oid, text, done: false, added: today })
        .select('id')
        .single()

      if (error || !inserted) {
        console.error('addTask:', error)
        setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== tempId) }))
        return
      }

      const realId = (inserted as Record<string, unknown>).id as string
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === tempId ? { ...t, id: realId } : t),
      }))
    }

    function toggleTask(id: string) {
      const task = ref().tasks.find(t => t.id === id)
      if (!task) return
      const done = !task.done
      setState(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === id ? { ...t, done } : t),
      }))
      db.from('dashboard_tasks')
        .update({ done })
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('toggleTask:', error) })
    }

    function deleteTask(id: string) {
      setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }))
      db.from('dashboard_tasks')
        .delete()
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('deleteTask:', error) })
    }

    // ── Roster ─────────────────────────────────────────────────

    function setRoster(roster: Roster) {
      const { rosterMonth: month, orgId: oid } = ref()
      setState(prev => ({ ...prev, roster }))

      db.from('roster_assignments')
        .delete()
        .eq('organization_id', oid)
        .like('date_key', `${month}-%`)
        .then(({ error }) => {
          if (error) { console.error('setRoster delete:', error); return }

          const rows: Record<string, unknown>[] = []
          Object.entries(roster).forEach(([dateKey, assignments]) => {
            if (!dateKey.startsWith(month)) return
            assignments.forEach(a => rows.push({
              organization_id: oid,
              date_key:        dateKey,
              staff_id:        a.employeeId,
              contract_id:     a.projectId,
              activity_id:     a.activityId ?? null,
              site_id:         a.siteId     ?? null,
              overtime_hours:  a.overtimeHours ?? null,
            }))
          })

          if (rows.length > 0) {
            db.from('roster_assignments')
              .insert(rows)
              .then(({ error: ie }) => { if (ie) console.error('setRoster insert:', ie) })
          }
        })
    }

    function updateDay(dateKey: string, assignments: RosterAssignment[]) {
      const { orgId: oid } = ref()
      setState(prev => ({ ...prev, roster: { ...prev.roster, [dateKey]: assignments } }))

      db.from('roster_assignments')
        .delete()
        .eq('organization_id', oid)
        .eq('date_key', dateKey)
        .then(({ error }) => {
          if (error) { console.error('updateDay delete:', error); return }
          if (assignments.length === 0) return

          const rows = assignments.map(a => ({
            organization_id: oid,
            date_key:        dateKey,
            staff_id:        a.employeeId,
            contract_id:     a.projectId,
            activity_id:     a.activityId ?? null,
            site_id:         a.siteId     ?? null,
            overtime_hours:  a.overtimeHours ?? null,
          }))
          db.from('roster_assignments')
            .insert(rows)
            .then(({ error: ie }) => { if (ie) console.error('updateDay insert:', ie) })
        })
    }

    function setRosterMonth(ym: string) {
      setState(prev => ({ ...prev, rosterMonth: ym }))
    }

    function resetAll() {
      console.warn('resetAll disabled in production mode — data lives in Supabase and must not be deleted here.')
    }

    // ── Clients ────────────────────────────────────────────────────────────────

    async function addClient(c: Omit<Client, 'id'>): Promise<string | null> {
      const { orgId: oid } = ref()
      const { data: inserted, error } = await db
        .from('clients')
        .insert({
          organization_id: oid,
          name:            c.name,
          status:          c.status,
          client_type:     c.clientType ?? null,
          contact_name:    c.contactName ?? null,
          email:           c.email ?? null,
          phone:           c.phone ?? null,
          notes:           c.notes ?? null,
          abn:             c.abn ?? null,
        })
        .select('id')
        .single()
      if (error || !inserted) {
        console.error('addClient:', error?.code, error?.message)
        return `[${error?.code ?? '?'}] ${error?.message ?? 'Unknown error'}`
      }
      const realId = (inserted as Record<string, unknown>).id as string
      setState(prev => ({
        ...prev,
        clients: [...prev.clients, { id: realId, ...c }].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      return null
    }

    function updateClient(id: string, patch: Partial<Client>) {
      setState(prev => ({
        ...prev,
        clients:         prev.clients.map(c => c.id === id ? { ...c, ...patch } : c),
        archivedClients: prev.archivedClients.map(c => c.id === id ? { ...c, ...patch } : c),
      }))
      db.from('clients')
        .update(clientPatch(patch))
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('updateClient:', error) })
    }

    function archiveClient(id: string) {
      setState(prev => {
        const client = prev.clients.find(c => c.id === id)
        if (!client) return prev
        return {
          ...prev,
          clients:         prev.clients.filter(c => c.id !== id),
          archivedClients: [...prev.archivedClients, { ...client, status: 'archived' as ClientStatus }],
        }
      })
      db.from('clients')
        .update({ status: 'archived' })
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('archiveClient:', error) })
    }

    function restoreClient(id: string) {
      setState(prev => {
        const client = prev.archivedClients.find(c => c.id === id)
        if (!client) return prev
        return {
          ...prev,
          archivedClients: prev.archivedClients.filter(c => c.id !== id),
          clients: [...prev.clients, { ...client, status: 'active' as ClientStatus }].sort((a, b) => a.name.localeCompare(b.name)),
        }
      })
      db.from('clients')
        .update({ status: 'active' })
        .eq('id', id)
        .then(({ error }) => { if (error) console.error('restoreClient:', error) })
    }

    async function deleteClient(id: string) {
      const { clients, archivedClients } = ref()
      const client = [...clients, ...archivedClients].find(c => c.id === id)
      const clientName = client?.name ?? ''
      const linkedProjectIds = ref().projects.filter(p => p.client === clientName).map(p => p.id)
      setState(prev => ({
        ...prev,
        clients:          prev.clients.filter(c => c.id !== id),
        archivedClients:  prev.archivedClients.filter(c => c.id !== id),
        projects:         prev.projects.filter(p => p.client !== clientName),
        projectZoneLinks: prev.projectZoneLinks.filter(l => !linkedProjectIds.includes(l.projectId)),
        activities:       prev.activities.filter(a => !linkedProjectIds.includes(a.projectId)),
        sites:            prev.sites.filter(s => s.clientId !== id),
      }))
      if (linkedProjectIds.length > 0) {
        const { error: raErr } = await db
          .from('roster_assignments')
          .delete()
          .in('contract_id', linkedProjectIds)
        if (raErr) console.error('deleteClient (roster_assignments):', raErr)
        const { error: actErr } = await db
          .from('activities')
          .delete()
          .in('project_id', linkedProjectIds)
        if (actErr) console.error('deleteClient (activities):', actErr)
        const { error: pslErr } = await db
          .from('project_zone_links')
          .delete()
          .in('project_id', linkedProjectIds)
        if (pslErr) console.error('deleteClient (project_zone_links):', pslErr)
        const { error: ccErr } = await db
          .from('client_contracts')
          .delete()
          .in('id', linkedProjectIds)
        if (ccErr) console.error('deleteClient (client_contracts):', ccErr)
      }
      const { error: sitesErr } = await db
        .from('sites')
        .delete()
        .eq('client_id', id)
      if (sitesErr) console.error('deleteClient (sites):', sitesErr)
      const { error } = await db
        .from('clients')
        .delete()
        .eq('id', id)
      if (error) console.error('deleteClient:', error)
    }

    return {
      loading,
      currentUserName: null as string | null,
      updateProject,
      addProject,
      deleteProject,
      archiveProject,
      restoreProject,
      createSiteForClient,
      createAndLinkSite,
      linkSite,
      unlinkSite,
      updateSite,
      deleteSite,
      addActivityType,
      updateActivityType,
      deleteActivityType,
      addActivity,
      updateActivity,
      deleteActivity,
      addCarryovers,
      updateCarryover,
      setActivityAllocations,
      updateEmployee,
      addEmployee,
      deleteEmployee,
      archiveEmployee,
      unarchiveEmployee,
      addSkill,
      removeSkill,
      renameSkill,
      addRole,
      removeRole,
      renameRole,
      addTask,
      toggleTask,
      deleteTask,
      setRoster,
      updateDay,
      setRosterMonth,
      resetAll,
      addClient,
      updateClient,
      archiveClient,
      restoreClient,
      deleteClient,
    }
  // loading changes after initial fetch completes, which triggers actions to
  // re-bind with the resolved orgId available via stateRef.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  return (
    <StateContext.Provider value={{ ...state, ...actions, currentUserName }}>
      {children}
    </StateContext.Provider>
  )
}

export function useCCState() {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useCCState must be used within StateProvider')
  return ctx
}
