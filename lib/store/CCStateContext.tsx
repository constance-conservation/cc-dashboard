'use client'

import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import type { CCState, Project, Employee, Task, Roster } from '@/lib/types'

const STORAGE_KEY = 'cc_shared_state_v1'

const DEFAULT_SKILLS = [
  'Chainsaw Operation', 'Brushcutting', 'Mulching', 'Planting',
  'Bush Regeneration', 'Ecological Surveying', 'Weed Control',
  'Erosion Control', 'Tree Climbing', 'Revegetation',
  'Flora & Fauna Identification', 'Site Supervision',
]

const DEFAULT_ROLES = [
  'Bush Regenerator', 'Field Supervisor', 'Field Crew',
  'Ecologist', 'Director', 'CEO',
]

const DEFAULT_PROJECTS: Project[] = [
  { id: 'p1', name: 'Harrington Grove — Stage 4', client: 'Harrington Grove', start: '2026-04-01', end: '2026-06-30', unit: 'days', monthlyAllocation: 22, visitsPerMonth: 10, crewSize: 4, chargeOutRate: 1200, overtimeFlag: false, overtimeRate: 1.5, priority: 'high', budget: 26400, spent: 18480, skills: ['Bush Regeneration', 'Weed Control', 'Planting'] },
  { id: 'p2', name: 'Liverpool Council — VMP', client: 'Liverpool Council', start: '2026-03-15', end: '2026-07-15', unit: 'hours', monthlyAllocation: 160, visitsPerMonth: 12, crewSize: 3, chargeOutRate: 145, overtimeFlag: true, overtimeRate: 1.5, priority: 'high', budget: 23200, spent: 10150, skills: ['Site Supervision', 'Ecological Surveying'] },
  { id: 'p3', name: 'Camden — Weed slashing program', client: 'Camden Council', start: '2026-01-01', end: '2026-12-31', unit: 'days', monthlyAllocation: 16, visitsPerMonth: 8, crewSize: 3, chargeOutRate: 980, overtimeFlag: false, overtimeRate: 1.5, priority: 'medium', budget: 15680, spent: 7056, skills: ['Brushcutting', 'Weed Control', 'Mulching'] },
  { id: 'p4', name: 'Wollondilly — Biodiversity survey', client: 'Wollondilly Shire', start: '2026-04-01', end: '2026-05-24', unit: 'days', monthlyAllocation: 10, visitsPerMonth: 5, crewSize: 2, chargeOutRate: 1400, overtimeFlag: false, overtimeRate: 1.5, priority: 'medium', budget: 14000, spent: 3920, skills: ['Ecological Surveying', 'Flora & Fauna Identification'] },
  { id: 'p5', name: 'AWP Wildlife corridor', client: 'AWP', start: '2026-02-01', end: '2026-05-02', unit: 'hours', monthlyAllocation: 140, visitsPerMonth: 10, crewSize: 4, chargeOutRate: 160, overtimeFlag: true, overtimeRate: 1.75, priority: 'high', budget: 22400, spent: 20384, skills: ['Revegetation', 'Planting', 'Erosion Control'] },
]

const DEFAULT_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Cameron Ellis', role: 'Director', type: 'full-time', payRate: 68, availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false }, skills: ['Bush Regeneration', 'Site Supervision', 'Flora & Fauna Identification', 'Ecological Surveying'], email: 'cameron@constance.org', phone: '0491 667 540' },
  { id: 'e2', name: 'Priya Nair', role: 'Field Supervisor', type: 'full-time', payRate: 52, availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true }, skills: ['Site Supervision', 'Weed Control', 'Brushcutting', 'Chainsaw Operation'], email: 'priya@constance.org', phone: '0400 112 334' },
  { id: 'e3', name: "James O'Brien", role: 'Bush Regenerator', type: 'full-time', payRate: 42, availability: { mon: true, tue: true, wed: true, thu: false, fri: true, sat: true }, skills: ['Bush Regeneration', 'Planting', 'Mulching', 'Weed Control'], email: 'james@constance.org', phone: '0422 887 101' },
  { id: 'e4', name: 'Marika Tawhai', role: 'Ecologist', type: 'full-time', payRate: 58, availability: { mon: true, tue: false, wed: true, thu: true, fri: true, sat: false }, skills: ['Ecological Surveying', 'Flora & Fauna Identification', 'Revegetation'], email: 'marika@constance.org', phone: '0414 220 902' },
  { id: 'e5', name: 'Daniel Krauss', role: 'Field Supervisor', type: 'full-time', payRate: 54, availability: { mon: false, tue: true, wed: true, thu: true, fri: true, sat: true }, skills: ['Site Supervision', 'Chainsaw Operation', 'Erosion Control', 'Bush Regeneration'], email: 'daniel@constance.org', phone: '0433 005 221' },
  { id: 'e6', name: 'Lena Park', role: 'Field Crew', type: 'part-time', payRate: 38, availability: { mon: true, tue: true, wed: false, thu: true, fri: true, sat: false }, skills: ['Planting', 'Revegetation', 'Mulching'], email: 'lena@constance.org', phone: '0466 412 887' },
  { id: 'e7', name: 'Tom Fitzgerald', role: 'Field Crew', type: 'full-time', payRate: 40, availability: { mon: true, tue: true, wed: true, thu: false, fri: false, sat: true }, skills: ['Brushcutting', 'Chainsaw Operation', 'Mulching'], email: 'tom@constance.org', phone: '0477 338 019' },
  { id: 'e8', name: 'Amelia Chen', role: 'Field Crew', type: 'full-time', payRate: 40, availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false }, skills: ['Weed Control', 'Planting', 'Bush Regeneration'], email: 'amelia@constance.org', phone: '0488 904 761' },
  { id: 'e9', name: 'Riley Nakamura', role: 'Bush Regenerator', type: 'full-time', payRate: 44, availability: { mon: true, tue: true, wed: true, thu: true, fri: false, sat: true }, skills: ['Bush Regeneration', 'Tree Climbing', 'Chainsaw Operation'], email: 'riley@constance.org', phone: '0401 667 302' },
]

const DEFAULT_TASKS: Task[] = [
  { id: 't1', text: 'Create Supervisor and Staff dashboards (variants of this one)', done: false, added: '2026-04-20' },
]

const DEFAULT_STATE: CCState = {
  projects: DEFAULT_PROJECTS,
  employees: DEFAULT_EMPLOYEES,
  skills: DEFAULT_SKILLS,
  roles: DEFAULT_ROLES,
  tasks: DEFAULT_TASKS,
  roster: {},
  rosterMonth: '2026-04',
}

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
}

type CCContext = CCState & CCActions

const StateContext = createContext<CCContext | null>(null)

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CCState>(() => {
    if (typeof window === 'undefined') return DEFAULT_STATE
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return { ...DEFAULT_STATE, ...JSON.parse(saved) }
    } catch {}
    return DEFAULT_STATE
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  const actions = useMemo<CCActions>(() => ({
    updateProject: (id, patch) => setState(s => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, ...patch } : p) })),
    addProject: (p) => setState(s => ({ ...s, projects: [...s.projects, { id: 'p' + Date.now(), ...p }] })),
    deleteProject: (id) => setState(s => ({ ...s, projects: s.projects.filter(p => p.id !== id) })),
    updateEmployee: (id, patch) => setState(s => ({ ...s, employees: s.employees.map(e => e.id === id ? { ...e, ...patch } : e) })),
    addEmployee: (e) => setState(s => ({ ...s, employees: [...s.employees, { id: 'e' + Date.now(), ...e }] })),
    deleteEmployee: (id) => setState(s => ({ ...s, employees: s.employees.filter(e => e.id !== id) })),
    addSkill: (skill) => setState(s => s.skills.includes(skill) ? s : { ...s, skills: [...s.skills, skill] }),
    removeSkill: (skill) => setState(s => ({ ...s, skills: s.skills.filter(x => x !== skill) })),
    renameSkill: (oldName, newName) => setState(s => {
      if (!newName.trim() || oldName === newName) return s
      return { ...s, skills: s.skills.map(x => x === oldName ? newName : x), employees: s.employees.map(e => ({ ...e, skills: e.skills.map(x => x === oldName ? newName : x) })), projects: s.projects.map(p => ({ ...p, skills: (p.skills || []).map(x => x === oldName ? newName : x) })) }
    }),
    addRole: (role) => setState(s => s.roles.includes(role) ? s : { ...s, roles: [...s.roles, role] }),
    removeRole: (role) => setState(s => ({ ...s, roles: s.roles.filter(x => x !== role) })),
    renameRole: (oldName, newName) => setState(s => {
      if (!newName.trim() || oldName === newName) return s
      return { ...s, roles: s.roles.map(x => x === oldName ? newName : x), employees: s.employees.map(e => e.role === oldName ? { ...e, role: newName } : e) }
    }),
    addTask: (text) => setState(s => ({ ...s, tasks: [{ id: 't' + Date.now(), text, done: false, added: new Date().toISOString().slice(0, 10) }, ...s.tasks] })),
    toggleTask: (id) => setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) })),
    deleteTask: (id) => setState(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) })),
    setRoster: (roster) => setState(s => ({ ...s, roster })),
    updateDay: (dateKey, assignments) => setState(s => ({ ...s, roster: { ...s.roster, [dateKey]: assignments } })),
    setRosterMonth: (ym) => setState(s => ({ ...s, rosterMonth: ym })),
    resetAll: () => setState(DEFAULT_STATE),
  }), [])

  return <StateContext.Provider value={{ ...state, ...actions }}>{children}</StateContext.Provider>
}

export function useCCState() {
  const ctx = useContext(StateContext)
  if (!ctx) throw new Error('useCCState must be used within StateProvider')
  return ctx
}
