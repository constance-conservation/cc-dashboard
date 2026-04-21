export type EmploymentType = 'full-time' | 'part-time' | 'casual' | 'contractor'
export type Priority = 'high' | 'medium' | 'low'
export type WorkUnit = 'days' | 'hours'
export type VehicleStatus = 'ok' | 'warn' | 'danger'

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

export type Project = {
  id: string
  name: string
  client: string
  start: string
  end: string
  unit: WorkUnit
  monthlyAllocation: number
  visitsPerMonth: number
  crewSize: number
  chargeOutRate: number
  overtimeFlag: boolean
  overtimeRate: number
  priority: Priority
  budget: number
  spent: number
  skills: string[]
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
  overtimeHours?: number
}

export type Roster = Record<string, RosterAssignment[]>

export type CCState = {
  projects: Project[]
  employees: Employee[]
  skills: string[]
  roles: string[]
  tasks: Task[]
  roster: Roster
  rosterMonth: string
}

export type Vehicle = {
  reg: string
  make: string
  type: string
  driver: string
  loc: string
  status: VehicleStatus
  km: number
  service: string
  lat: number
  lng: number
  speed: number
}
