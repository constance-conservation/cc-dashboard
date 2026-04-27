'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useCCState } from '@/lib/store/CCStateContext'
import { Icon } from '@/components/icons/Icon'
import { Drawer } from '@/components/dashboard/Drawer'
import { Select } from '@/components/dashboard/Select'
import type { RosterAssignment, Project, Employee } from '@/lib/types'

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
type DayKey = typeof DAY_KEYS[number]
const DAY_HOURS = 8

function daysInMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
function dateKey(ym: string, d: number) { return `${ym}-${String(d).padStart(2, '0')}` }
function weekdayIdx(ym: string, d: number) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}
function weekdayName(ym: string, d: number): DayKey { return DAY_KEYS[weekdayIdx(ym, d)] }

function autoGenerate(state: ReturnType<typeof useCCState>) {
  const { projects, employees, rosterMonth } = state
  const n = daysInMonth(rosterMonth)
  const hasSat = employees.some(e => e.availability.sat)
  const projectUsage: Record<string, { used: number; visits: number; budgetSpent: number }> = {}
  projects.forEach(p => { projectUsage[p.id] = { used: 0, visits: 0, budgetSpent: 0 } })
  const newRoster: Record<string, RosterAssignment[]> = {}
  const priorityScore: Record<string, number> = { high: 3, medium: 2, low: 1 }

  const days: number[] = []
  for (let d = 1; d <= n; d++) {
    const wd = weekdayIdx(rosterMonth, d)
    if (wd === 0) continue
    if (wd === 6 && !hasSat) continue
    days.push(d)
  }

  const sortedProjects = [...projects].sort((a, b) => (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0))

  days.forEach((d, dayIdx) => {
    const dKey = dateKey(rosterMonth, d)
    const wdName = weekdayName(rosterMonth, d)
    const assignments: RosterAssignment[] = []
    const usedEmployees = new Set<string>()

    sortedProjects.forEach(p => {
      const usage = projectUsage[p.id]
      const expected = Math.ceil((dayIdx + 1) / days.length * p.visitsPerMonth)
      if (usage.visits >= p.visitsPerMonth) return
      if (usage.visits >= expected) return

      const eligible = employees.filter(e => e.availability[wdName as keyof typeof e.availability] && !usedEmployees.has(e.id))
      if (eligible.length === 0) return

      const scored = eligible.map(e => {
        const match = (p.skills || []).filter(s => e.skills.includes(s)).length
        return { e, score: match + (e.role === 'Field Supervisor' ? 0.5 : 0) }
      }).sort((a, b) => b.score - a.score)

      const crewSize = p.crewSize || 3
      const chosen: Employee[] = []
      let hasSupervisor = false

      for (const { e } of scored) {
        if (chosen.length >= crewSize) break
        if (e.role === 'Field Supervisor') {
          if (hasSupervisor) continue
          hasSupervisor = true
        }
        chosen.push(e)
      }

      if (chosen.length < crewSize) return
      const unitAdd = p.unit === 'days' ? 1 : DAY_HOURS
      if (usage.used + unitAdd > p.monthlyAllocation) return
      const cost = p.chargeOutRate * unitAdd
      if (usage.budgetSpent + cost > p.budget - p.spent) return

      chosen.forEach(e => {
        usedEmployees.add(e.id)
        assignments.push({ employeeId: e.id, projectId: p.id })
      })
      usage.visits += 1
      usage.used += unitAdd
      usage.budgetSpent += cost
    })

    if (assignments.length > 0) newRoster[dKey] = assignments
  })

  return newRoster
}

function CalDay({ day, ym, state, onOpen }: { day: number | null; ym: string; state: ReturnType<typeof useCCState>; onOpen: () => void }) {
  if (!day) return <div className="cal-cell cal-cell-empty" />
  const dKey = dateKey(ym, day)
  const assignments = state.roster[dKey] || []
  const byProject: Record<string, string[]> = {}
  assignments.forEach(a => {
    if (!byProject[a.projectId]) byProject[a.projectId] = []
    byProject[a.projectId].push(a.employeeId)
  })

  return (
    <div className="cal-cell" onClick={onOpen}>
      <div className="cal-date">{day}</div>
      {Object.keys(byProject).length === 0 && <div className="cal-empty-label">— no assignments —</div>}
      {Object.entries(byProject).map(([pid, empIds]) => {
        const p = state.projects.find(x => x.id === pid)
        if (!p) return null
        return (
          <div key={pid} className="cal-shift">
            <div className="cal-shift-name">{p.name.split(' — ')[0]}</div>
            <div className="cal-shift-crew">
              <div className="cal-shift-avatars">
                {empIds.slice(0, 4).map((eid, i) => {
                  const e = state.employees.find(x => x.id === eid)
                  if (!e) return null
                  const isSup = e.role === 'Field Supervisor'
                  return (
                    <div key={eid} className={`cal-avatar${isSup ? ' sup' : ''}`} style={{ marginLeft: i === 0 ? 0 : -5 }} title={`${e.name} · ${e.role}`}>
                      {e.name.split(' ').map(x => x[0]).join('').slice(0, 2)}
                    </div>
                  )
                })}
                {empIds.length > 4 && <div className="cal-avatar more" style={{ marginLeft: -5 }}>+{empIds.length - 4}</div>}
              </div>
              <span className="cal-shift-count">{empIds.length}/{p.crewSize}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayEditor({ day, ym, state, onClose }: { day: number; ym: string; state: ReturnType<typeof useCCState>; onClose: () => void }) {
  const dKey = dateKey(ym, day)
  const wdName = weekdayName(ym, day)
  const assignments = state.roster[dKey] || []
  const date = new Date(`${ym}-${String(day).padStart(2, '0')}`)
  const dateLabel = date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  const available = state.employees.filter(e => e.availability[wdName as keyof typeof e.availability])
  const assignedIds = new Set(assignments.map(a => a.employeeId))
  const unassignedAvailable = available.filter(e => !assignedIds.has(e.id))
  const unavailable = state.employees.filter(e => !e.availability[wdName as keyof typeof e.availability])

  const activeProjects = state.projects.filter(p => {
    const s = new Date(p.start), en = new Date(p.end)
    return date >= s && date <= en
  })

  const update = (newAssignments: RosterAssignment[]) => state.updateDay(dKey, newAssignments)
  const removeAssignment = (empId: string) => update(assignments.filter(a => a.employeeId !== empId))
  const changeProject = (empId: string, projectId: string) => update(assignments.map(a => a.employeeId === empId ? { ...a, projectId } : a))
  const addTo = (empId: string, projectId: string) => update([...assignments, { employeeId: empId, projectId }])
  const toggleOvertime = (empId: string, hours: number) => update(assignments.map(a => a.employeeId === empId ? { ...a, overtimeHours: hours } : a))

  const subtitle = `${assignments.length} assigned · ${unassignedAvailable.length} available · ${unavailable.length} unavailable`

  return (
    <Drawer title={dateLabel} subtitle={subtitle} onClose={onClose} saveLabel="Done" onSave={onClose}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 10 }}>Assigned ({assignments.length})</div>
        {assignments.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: 12, background: 'var(--bg-sunken)', borderRadius: 6 }}>No one assigned to this day yet.</div>}
        {assignments.map(a => {
          const emp = state.employees.find(x => x.id === a.employeeId)
          if (!emp) return null
          const proj = state.projects.find(x => x.id === a.projectId)
          const canOT = proj?.overtimeFlag
          return (
            <div key={a.employeeId} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, background: 'var(--bg-sunken)', borderRadius: 6, marginBottom: 6 }}>
              <div className="staff-avatar" style={{ width: 30, height: 30, fontSize: 10 }}>{emp.name.split(' ').map(x => x[0]).join('')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{emp.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{emp.role}</div>
              </div>
              <Select value={a.projectId} onChange={v => changeProject(a.employeeId, v)} options={activeProjects.map(p => ({ value: p.id, label: p.name }))} style={{ fontSize: 12, maxWidth: 180 }} />
              {canOT && (
                <input className="input" placeholder="OT hrs" type="number" value={a.overtimeHours || ''} onChange={e => toggleOvertime(a.employeeId, Number(e.target.value) || 0)} style={{ width: 70, fontSize: 12 }} />
              )}
              <button className="iconbtn" onClick={() => removeAssignment(a.employeeId)} style={{ color: 'var(--ink-3)' }}><Icon name="close" size={14} /></button>
            </div>
          )
        })}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 10 }}>Available ({unassignedAvailable.length})</div>
        {unassignedAvailable.map(emp => (
          <div key={emp.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 10, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 6, marginBottom: 6 }}>
            <div className="staff-avatar" style={{ width: 30, height: 30, fontSize: 10 }}>{emp.name.split(' ').map(x => x[0]).join('')}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{emp.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{emp.role} · {emp.skills.slice(0, 2).join(', ')}</div>
            </div>
            <Select value="" placeholder="+ Add to project…" onChange={v => { if (v) addTo(emp.id, v) }} options={activeProjects.map(p => ({ value: p.id, label: p.name }))} style={{ fontSize: 12, maxWidth: 200 }} />
          </div>
        ))}
        {unassignedAvailable.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>All available staff are assigned.</div>}
      </div>

      {unavailable.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', marginBottom: 10 }}>Unavailable ({unavailable.length}) — visibility only</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {unavailable.map(e => (
              <span key={e.id} style={{ padding: '4px 8px', background: 'var(--bg-sunken)', borderRadius: 4, fontSize: 11, color: 'var(--ink-3)' }}>{e.name}</span>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  )
}

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <Drawer title="Auto-generate rules" subtitle="Hard rules the scheduler never breaks" onClose={onClose} saveLabel="Got it" onSave={onClose}>
      <ol style={{ paddingLeft: 20, fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)' }}>
        <li>Never exceed a project&apos;s monthly allocated hours / days.</li>
        <li>Never exceed a project&apos;s visits-per-month cap.</li>
        <li>Fixed crew size is always respected — never partial-fill.</li>
        <li>Employees are never scheduled on days outside their availability.</li>
        <li>No two Field Supervisors on the same project on the same day.</li>
        <li>Never exceed a project&apos;s budget (charge-out × allocated).</li>
        <li>Equal-priority projects get visits distributed evenly across the month.</li>
      </ol>
      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
        After auto-generate you can click any day to freely edit — manual overrides are never blocked.
      </div>
    </Drawer>
  )
}

export default function RosteringPage() {
  const state = useCCState()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.getAttribute('data-mode') === 'dark')
  }, [])

  const toggleDark = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.setAttribute('data-mode', next ? 'dark' : '')
  }

  const n = daysInMonth(state.rosterMonth)
  const hasSat = state.employees.some(e => e.availability.sat)
  const [y, m] = state.rosterMonth.split('-').map(Number)
  const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  const stats = useMemo(() => {
    let totalShifts = 0
    const uniqueStaff = new Set<string>()
    for (const dKey in state.roster) {
      if (!dKey.startsWith(state.rosterMonth)) continue
      const a = state.roster[dKey] || []
      totalShifts += a.length
      a.forEach(x => uniqueStaff.add(x.employeeId))
    }
    const projectVisits: Record<string, number> = {}
    state.projects.forEach(p => { projectVisits[p.id] = 0 })
    for (const dKey in state.roster) {
      if (!dKey.startsWith(state.rosterMonth)) continue
      const seen = new Set<string>()
      ;(state.roster[dKey] || []).forEach(a => {
        if (!seen.has(a.projectId)) { projectVisits[a.projectId] = (projectVisits[a.projectId] || 0) + 1; seen.add(a.projectId) }
      })
    }
    return { totalShifts, uniqueStaff: uniqueStaff.size, projectVisits }
  }, [state.roster, state.rosterMonth, state.projects])

  const handleAutoGen = () => {
    if (!confirm(`Auto-generate roster for ${monthName}? This will replace any existing assignments for this month.`)) return
    const generated = autoGenerate(state)
    const newRoster = { ...state.roster }
    Object.keys(newRoster).forEach(k => { if (k.startsWith(state.rosterMonth)) delete newRoster[k] })
    Object.assign(newRoster, generated)
    state.setRoster(newRoster)
  }

  const handleClear = () => {
    if (!confirm(`Clear all assignments for ${monthName}?`)) return
    const newRoster = { ...state.roster }
    Object.keys(newRoster).forEach(k => { if (k.startsWith(state.rosterMonth)) delete newRoster[k] })
    state.setRoster(newRoster)
  }

  const prevMonth = () => {
    const [yr, mo] = state.rosterMonth.split('-').map(Number)
    const d = new Date(yr, mo - 2, 1)
    state.setRosterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const [yr, mo] = state.rosterMonth.split('-').map(Number)
    const d = new Date(yr, mo, 1)
    state.setRosterMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const cols = hasSat ? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] : ['mon', 'tue', 'wed', 'thu', 'fri']
  const colLabels = hasSat ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

  const weeks: (number | null)[][] = []
  let curWeek: (number | null)[] = new Array(cols.length).fill(null)
  for (let d = 1; d <= n; d++) {
    const wd = weekdayIdx(state.rosterMonth, d)
    if (wd === 0) continue
    if (wd === 6 && !hasSat) continue
    const colIdx = cols.indexOf(DAY_KEYS[wd])
    if (colIdx < 0) continue
    if (d > 1 && colIdx === 0) { weeks.push(curWeek); curWeek = new Array(cols.length).fill(null) }
    curWeek[colIdx] = d
  }
  if (curWeek.some(x => x !== null)) weeks.push(curWeek)

  const crumbText = `${monthName} · ${stats.totalShifts} shifts · ${stats.uniqueStaff} staff scheduled`

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">{crumbText}</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Rostering</h2>
      </div>

      <div className="subpage-body">
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={handleAutoGen}><Icon name="cloud" size={14} /> Auto-generate</button>
          <button className="btn" onClick={handleClear}>Clear month</button>
          <button className="btn" onClick={() => setShowHelp(true)}>Rules</button>
          <button className="btn" onClick={toggleDark} title="Toggle dark mode" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isDark
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            }
            {isDark ? 'Light' : 'Dark'}
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={prevMonth}>←</button>
          <div className="chip" style={{ fontFamily: 'var(--font-display)', fontSize: 16, height: 32, padding: '0 14px', textTransform: 'none', letterSpacing: '-0.01em' }}>{monthName}</div>
          <button className="btn" onClick={nextMonth}>→</button>
        </div>

        {/* Project KPI mini-cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 18 }}>
          {state.projects.map(p => {
            const visits = stats.projectVisits[p.id] || 0
            const pct = Math.min(100, Math.round(visits / p.visitsPerMonth * 100))
            return (
              <div key={p.id} style={{ padding: 14, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 500, letterSpacing: '-0.005em', marginBottom: 2 }}>{p.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {visits}/{p.visitsPerMonth} visits · {p.unit}
                </div>
                <div style={{ height: 4, background: 'var(--bg-sunken)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: pct + '%', background: pct >= 100 ? 'var(--ok)' : 'var(--accent)', borderRadius: 2 }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Calendar */}
        <div className="cal">
          <div className="cal-head" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
            {colLabels.map(l => <div key={l} className="cal-head-cell">{l}</div>)}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="cal-week" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
              {week.map((d, ci) => (
                <CalDay key={ci} day={d} ym={state.rosterMonth} state={state} onOpen={() => d && setSelectedDay(d)} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {selectedDay && <DayEditor day={selectedDay} ym={state.rosterMonth} state={state} onClose={() => setSelectedDay(null)} />}
      {showHelp && <RulesModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}
