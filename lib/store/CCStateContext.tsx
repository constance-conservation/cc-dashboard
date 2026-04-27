'use client'

import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react'
import type { CCState, Project, Employee, Task, Roster } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

// ── DB row mappers ────────────────────────────────────────────

function rowToProject(r: Record<string, unknown>): Project {
  return {
    id: r.id as string,
    name: r.name as string,
    client: r.client as string,
    start: r.start_date as string,
    end: r.end_date as string,
    unit: r.unit as Project['unit'],
    monthlyAllocation: r.monthly_allocation as number,
    visitsPerMonth: r.visits_per_month as number,
    crewSize: r.crew_size as number,
    chargeOutRate: r.charge_out_rate as number,
    overtimeFlag: r.overtime_flag as boolean,
    overtimeRate: r.overtime_rate as number,
    priority: r.priority as Project['priority'],
    budget: r.budget as number,
    spent: r.spent as number,
    skills: (r.skills as string[]) ?? [],
  }
}

function projectToRow(p: Partial<Project>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (p.name !== undefined) row.name = p.name
  if (p.client !== undefined) row.client = p.client
  if (p.start !== undefined) row.start_date = p.start
  if (p.end !== undefined) row.end_date = p.end
  if (p.unit !== undefined) row.unit = p.unit
  if (p.monthlyAllocation !== undefined) row.monthly_allocation = p.monthlyAllocation
  if (p.visitsPerMonth !== undefined) row.visits_per_month = p.visitsPerMonth
  if (p.crewSize !== undefined) row.crew_size = p.crewSize
  if (p.chargeOutRate !== undefined) row.charge_out_rate = p.chargeOutRate
  if (p.overtimeFlag !== undefined) row.overtime_flag = p.overtimeFlag
  if (p.overtimeRate !== undefined) row.overtime_rate = p.overtimeRate
  if (p.priority !== undefined) row.priority = p.priority
  if (p.budget !== undefined) row.budget = p.budget
  if (p.spent !== undefined) row.spent = p.spent
  if (p.skills !== undefined) row.skills = p.skills
  return row
}

function rowToEmployee(r: Record<string, unknown>): Employee {
  return {
    id: r.id as string,
    name: r.name as string,
    role: r.role as string,
    type: r.type as Employee['type'],
    payRate: r.pay_rate as number,
    availability: r.availability as Employee['availability'],
    skills: (r.skills as string[]) ?? [],
    email: r.email as string,
    phone: r.phone as string,
  }
}

function employeeToRow(e: Partial<Employee>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (e.name !== undefined) row.name = e.name
  if (e.role !== undefined) row.role = e.role
  if (e.type !== undefined) row.type = e.type
  if (e.payRate !== undefined) row.pay_rate = e.payRate
  if (e.availability !== undefined) row.availability = e.availability
  if (e.skills !== undefined) row.skills = e.skills
  if (e.email !== undefined) row.email = e.email
  if (e.phone !== undefined) row.phone = e.phone
  return row
}

// ── Types ─────────────────────────────────────────────────────

type CCActions = {
  updateProject: (id: string, patch: Partial<Project>) => void
  addProject: (p: Omit<Project, 'id'>) => void
  deleteProject: (id: string) => void
  updateEmployee: (id: string, patch: Partial<Employee>) => void
  addEmployee: (e: Omit<Employee, 'id'>) => void
  deleteEmployee: (id: string) => void
  addSkill: (skill: string) => void
  removeSkill: (skill: string) => void
  renameSkill: (oldName: string, newName: string) => void
  addRole: (role: string) => void
  removeRole: (role: string) => void
  renameRole: (oldName: string, newName: string) => void
  addTask: (text: string) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  setRoster: (roster: Roster) => void
  updateDay: (dateKey: string, assignments: Roster[string]) => void
  setRosterMonth: (ym: string) => void
  resetAll: () => void
  loading: boolean
}

type CCContext = CCState & CCActions

const StateContext = createContext<CCContext | null>(null)

const EMPTY_STATE: CCState = {
  projects: [], employees: [], skills: [], roles: [],
  tasks: [], roster: {}, rosterMonth: '2026-04',
}

// ── Provider ──────────────────────────────────────────────────

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CCState>(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  const stateRef = useRef<CCState>(EMPTY_STATE)
  stateRef.current = state

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const [
        { data: projects, error: pe },
        { data: employees, error: ee },
        { data: skills },
        { data: roles },
        { data: tasks },
        { data: rosterRows },
      ] = await Promise.all([
        supabase.from('projects').select('*'),
        supabase.from('employees').select('*'),
        supabase.from('skills').select('name'),
        supabase.from('roles').select('name'),
        supabase.from('tasks').select('*').order('added', { ascending: false }),
        supabase.from('roster_assignments').select('*'),
      ])

      if (pe) console.error('load projects:', pe)
      if (ee) console.error('load employees:', ee)

      const roster: Roster = {}
      for (const row of rosterRows ?? []) {
        const r = row as Record<string, unknown>
        const dk = r.date_key as string
        if (!roster[dk]) roster[dk] = []
        roster[dk].push({
          employeeId: r.employee_id as string,
          projectId: r.project_id as string,
          overtimeHours: r.overtime_hours != null ? (r.overtime_hours as number) : undefined,
        })
      }

      setState({
        projects: (projects ?? []).map(r => rowToProject(r as Record<string, unknown>)),
        employees: (employees ?? []).map(r => rowToEmployee(r as Record<string, unknown>)),
        skills: (skills ?? []).map(r => (r as Record<string, unknown>).name as string),
        roles: (roles ?? []).map(r => (r as Record<string, unknown>).name as string),
        tasks: (tasks ?? []) as Task[],
        roster,
        rosterMonth: '2026-04',
      })
      setLoading(false)
    }

    load().catch(err => {
      console.error('Failed to load from Supabase:', err)
      setLoading(false)
    })
  }, [])

  const actions = useMemo<CCActions>(() => {
    const db = createClient()
    const s = () => stateRef.current

    return {
      loading,

      updateProject: (id, patch) => {
        setState(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? { ...p, ...patch } : p) }))
        db.from('projects').update(projectToRow(patch)).eq('id', id)
          .then(({ error }) => { if (error) console.error('updateProject:', error) })
      },

      addProject: (p) => {
        const id = 'p' + Date.now()
        const project = { id, ...p }
        setState(prev => ({ ...prev, projects: [...prev.projects, project] }))
        db.from('projects').insert({ id, ...projectToRow(p) })
          .then(({ error }) => { if (error) console.error('addProject:', error) })
      },

      deleteProject: (id) => {
        setState(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }))
        db.from('projects').delete().eq('id', id)
          .then(({ error }) => { if (error) console.error('deleteProject:', error) })
      },

      updateEmployee: (id, patch) => {
        setState(prev => ({ ...prev, employees: prev.employees.map(e => e.id === id ? { ...e, ...patch } : e) }))
        db.from('employees').update(employeeToRow(patch)).eq('id', id)
          .then(({ error }) => { if (error) console.error('updateEmployee:', error) })
      },

      addEmployee: (e) => {
        const id = 'e' + Date.now()
        const employee = { id, ...e }
        setState(prev => ({ ...prev, employees: [...prev.employees, employee] }))
        db.from('employees').insert({ id, ...employeeToRow(e) })
          .then(({ error }) => { if (error) console.error('addEmployee:', error) })
      },

      deleteEmployee: (id) => {
        setState(prev => ({ ...prev, employees: prev.employees.filter(e => e.id !== id) }))
        db.from('employees').delete().eq('id', id)
          .then(({ error }) => { if (error) console.error('deleteEmployee:', error) })
      },

      addSkill: (skill) => {
        if (s().skills.includes(skill)) return
        setState(prev => ({ ...prev, skills: [...prev.skills, skill] }))
        db.from('skills').insert({ name: skill })
          .then(({ error }) => { if (error) console.error('addSkill:', error) })
      },

      removeSkill: (skill) => {
        setState(prev => ({ ...prev, skills: prev.skills.filter(x => x !== skill) }))
        db.from('skills').delete().eq('name', skill)
          .then(({ error }) => { if (error) console.error('removeSkill:', error) })
      },

      renameSkill: (oldName, newName) => {
        if (!newName.trim() || oldName === newName) return
        setState(prev => ({
          ...prev,
          skills: prev.skills.map(x => x === oldName ? newName : x),
          employees: prev.employees.map(e => ({ ...e, skills: e.skills.map(x => x === oldName ? newName : x) })),
          projects: prev.projects.map(p => ({ ...p, skills: (p.skills || []).map(x => x === oldName ? newName : x) })),
        }))
        // Update skills table
        db.from('skills').delete().eq('name', oldName).then(() =>
          db.from('skills').insert({ name: newName })
        )
        // Update employee skill arrays
        const affectedEmployees = s().employees.filter(e => e.skills.includes(oldName))
        affectedEmployees.forEach(e => {
          db.from('employees').update({ skills: e.skills.map(x => x === oldName ? newName : x) }).eq('id', e.id)
            .then(({ error }) => { if (error) console.error('renameSkill employee:', error) })
        })
        // Update project skill arrays
        const affectedProjects = s().projects.filter(p => (p.skills || []).includes(oldName))
        affectedProjects.forEach(p => {
          db.from('projects').update({ skills: (p.skills || []).map(x => x === oldName ? newName : x) }).eq('id', p.id)
            .then(({ error }) => { if (error) console.error('renameSkill project:', error) })
        })
      },

      addRole: (role) => {
        if (s().roles.includes(role)) return
        setState(prev => ({ ...prev, roles: [...prev.roles, role] }))
        db.from('roles').insert({ name: role })
          .then(({ error }) => { if (error) console.error('addRole:', error) })
      },

      removeRole: (role) => {
        setState(prev => ({ ...prev, roles: prev.roles.filter(x => x !== role) }))
        db.from('roles').delete().eq('name', role)
          .then(({ error }) => { if (error) console.error('removeRole:', error) })
      },

      renameRole: (oldName, newName) => {
        if (!newName.trim() || oldName === newName) return
        setState(prev => ({
          ...prev,
          roles: prev.roles.map(x => x === oldName ? newName : x),
          employees: prev.employees.map(e => e.role === oldName ? { ...e, role: newName } : e),
        }))
        db.from('roles').delete().eq('name', oldName).then(() =>
          db.from('roles').insert({ name: newName })
        )
        const affectedEmployees = s().employees.filter(e => e.role === oldName)
        affectedEmployees.forEach(e => {
          db.from('employees').update({ role: newName }).eq('id', e.id)
            .then(({ error }) => { if (error) console.error('renameRole employee:', error) })
        })
      },

      addTask: (text) => {
        const id = 't' + Date.now()
        const task: Task = { id, text, done: false, added: new Date().toISOString().slice(0, 10) }
        setState(prev => ({ ...prev, tasks: [task, ...prev.tasks] }))
        db.from('tasks').insert(task)
          .then(({ error }) => { if (error) console.error('addTask:', error) })
      },

      toggleTask: (id) => {
        const task = s().tasks.find(t => t.id === id)
        if (!task) return
        const done = !task.done
        setState(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === id ? { ...t, done } : t) }))
        db.from('tasks').update({ done }).eq('id', id)
          .then(({ error }) => { if (error) console.error('toggleTask:', error) })
      },

      deleteTask: (id) => {
        setState(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }))
        db.from('tasks').delete().eq('id', id)
          .then(({ error }) => { if (error) console.error('deleteTask:', error) })
      },

      setRoster: (roster) => {
        const month = s().rosterMonth
        setState(prev => ({ ...prev, roster }))
        // Replace all assignments for this month in DB
        db.from('roster_assignments').delete().like('date_key', `${month}-%`)
          .then(({ error }) => {
            if (error) { console.error('setRoster delete:', error); return }
            const rows: Record<string, unknown>[] = []
            Object.entries(roster).forEach(([dateKey, assignments]) => {
              if (!dateKey.startsWith(month)) return
              assignments.forEach(a => rows.push({
                date_key: dateKey,
                employee_id: a.employeeId,
                project_id: a.projectId,
                overtime_hours: a.overtimeHours ?? null,
              }))
            })
            if (rows.length > 0) {
              db.from('roster_assignments').insert(rows)
                .then(({ error: ie }) => { if (ie) console.error('setRoster insert:', ie) })
            }
          })
      },

      updateDay: (dateKey, assignments) => {
        setState(prev => ({ ...prev, roster: { ...prev.roster, [dateKey]: assignments } }))
        db.from('roster_assignments').delete().eq('date_key', dateKey)
          .then(({ error }) => {
            if (error) { console.error('updateDay delete:', error); return }
            if (assignments.length === 0) return
            const rows = assignments.map(a => ({
              date_key: dateKey,
              employee_id: a.employeeId,
              project_id: a.projectId,
              overtime_hours: a.overtimeHours ?? null,
            }))
            db.from('roster_assignments').insert(rows)
              .then(({ error: ie }) => { if (ie) console.error('updateDay insert:', ie) })
          })
      },

      setRosterMonth: (ym) => setState(prev => ({ ...prev, rosterMonth: ym })),

      resetAll: () => {
        // Hard reset: delete all data and reload defaults
        Promise.all([
          db.from('roster_assignments').delete().neq('date_key', ''),
          db.from('tasks').delete().neq('id', ''),
          db.from('projects').delete().neq('id', ''),
          db.from('employees').delete().neq('id', ''),
          db.from('skills').delete().neq('name', ''),
          db.from('roles').delete().neq('name', ''),
        ]).then(() => window.location.reload())
      },
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  return <StateContext.Provider value={{ ...state, ...actions }}>{children}</StateContext.Provider>
}

export function useCCState() {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useCCState must be used within StateProvider')
  return ctx
}
