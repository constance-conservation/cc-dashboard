'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useCCState } from '@/lib/store/CCStateContext'
import { Icon } from '@/components/icons/Icon'
import { Drawer } from '@/components/dashboard/Drawer'
import { Select } from '@/components/dashboard/Select'
import { NumericInput } from '@/components/dashboard/NumericInput'
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog'
import type { RosterAssignment, Activity, Employee, ActivityCarryover, CarryoverStatus } from '@/lib/types'
import { DAY_KEYS, type DayKey, dateKey, weekdayIdx, weekdayName, parseDate, computeMonthlyTarget, detectUnderstaffing, autoGenerate } from '@/lib/rostering/engine'

function daysInMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

function prevMonthKey(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── Carryover review ──────────────────────────────────────────────────────────

type ReviewEntry = {
  activityId: string
  originalDateKey: string
  unitsMissed: number
  approved: boolean
  existingId?: string
}

function CarryoverReviewModal({ entries, activities, projects, onChange, onConfirm, onCancel }: {
  entries: ReviewEntry[]
  activities: Activity[]
  projects: ReturnType<typeof useCCState>['projects']
  onChange: (idx: number, approved: boolean) => void
  onConfirm: () => void
  onCancel: () => void
}) {
  const approvedCount = entries.filter(e => e.approved).length
  const subtitle = `${entries.length} understaffed day${entries.length !== 1 ? 's' : ''} · ${approvedCount} set to catch up`

  return (
    <Drawer
      title="Review understaffed days"
      subtitle={subtitle}
      onClose={onCancel}
      onSave={onConfirm}
      saveLabel="Generate roster"
    >
      <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        These days had fewer staff than the activity required. Mark items to add a catch-up visit to the new month, or skip them.
      </div>
      {entries.map((entry, idx) => {
        const act     = activities.find(a => a.id === entry.activityId)
        const project = act ? projects.find(p => p.id === act.projectId) : undefined
        const date    = new Date(entry.originalDateKey)
        const label   = date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
        return (
          <div key={idx} style={{
            display: 'flex', gap: 10, alignItems: 'center',
            padding: '10px 12px', background: 'var(--bg-sunken)',
            borderRadius: 6, marginBottom: 6,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{act?.name ?? 'Unknown activity'}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                {project?.name} · {label} · {entry.unitsMissed} {entry.unitsMissed === 1 ? 'day' : 'days'} short
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn${entry.approved ? ' primary' : ''}`}
                style={{ fontSize: 11, padding: '3px 10px', height: 26 }}
                onClick={() => onChange(idx, true)}
              >
                Catch up
              </button>
              <button
                className="btn"
                style={{ fontSize: 11, padding: '3px 10px', height: 26, color: !entry.approved ? 'var(--ink-1)' : 'var(--ink-3)' }}
                onClick={() => onChange(idx, false)}
              >
                Skip
              </button>
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: 8 }}>
        <button
          className="btn"
          style={{ fontSize: 11, color: 'var(--ink-3)' }}
          onClick={() => entries.forEach((_, i) => onChange(i, false))}
        >
          Skip all
        </button>
      </div>
    </Drawer>
  )
}

// ── CalDay ────────────────────────────────────────────────────────────────────

const TODAY_KEY = new Date().toISOString().slice(0, 10)

function CalDay({ day, ym, state, onOpen }: {
  day: number | null
  ym: string
  state: ReturnType<typeof useCCState>
  onOpen: () => void
}) {
  if (!day) return <div className="cal-cell cal-cell-empty" />
  const dKey        = dateKey(ym, day)
  const assignments = state.roster[dKey] || []
  const isPast      = dKey < TODAY_KEY

  // Group by project (show primary activity label if all assignments share one activity)
  const byProject: Record<string, { empIds: string[]; activityId?: string }> = {}
  assignments.forEach(a => {
    if (!byProject[a.projectId]) byProject[a.projectId] = { empIds: [], activityId: a.activityId }
    byProject[a.projectId].empIds.push(a.employeeId)
    if (byProject[a.projectId].activityId !== a.activityId) byProject[a.projectId].activityId = undefined
  })

  return (
    <div className={`cal-cell${isPast ? ' cal-cell-past' : ''}`} onClick={onOpen}>
      <div className="cal-date">
        {day}
      </div>
      {Object.keys(byProject).length === 0 && (
        <div className="cal-empty-label">— no assignments —</div>
      )}
      {Object.entries(byProject).map(([pid, { empIds, activityId }]) => {
        const p   = state.projects.find(x => x.id === pid)
        if (!p) return null
        const act = activityId
          ? state.activities.find(a => a.id === activityId)
          : state.activities.find(a => a.projectId === pid && a.status === 'active')
        const crewSize = act?.crewSizeType !== 'any' ? (act?.minCrew ?? null) : null
        return (
          <div key={pid} className="cal-shift">
            <div className="cal-shift-name">{p.name.split(' — ')[0]}</div>
            {activityId && act && (
              <div style={{ fontSize: 9, color: 'var(--ink-3)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {act.name}
              </div>
            )}
            <div className="cal-shift-crew">
              <div className="cal-shift-avatars">
                {empIds.slice(0, 4).map((eid, i) => {
                  const e     = state.employees.find(x => x.id === eid)
                  if (!e) return null
                  const isSup = e.role === 'Field Supervisor'
                  return (
                    <div key={eid}
                      className={`cal-avatar${isSup ? ' sup' : ''}`}
                      style={{ marginLeft: i === 0 ? 0 : -5 }}
                      title={`${e.name} · ${e.role}`}>
                      {e.name.split(' ').map(x => x[0]).join('').slice(0, 2)}
                    </div>
                  )
                })}
                {empIds.length > 4 && (
                  <div className="cal-avatar more" style={{ marginLeft: -5 }}>+{empIds.length - 4}</div>
                )}
              </div>
              <span className="cal-shift-count">
                {empIds.length}{crewSize !== null ? `/${crewSize}` : ''}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── DayEditor ─────────────────────────────────────────────────────────────────

function DayEditor({ day, ym, state, onClose }: {
  day: number
  ym: string
  state: ReturnType<typeof useCCState>
  onClose: () => void
}) {
  const dKey        = dateKey(ym, day)
  const wdName      = weekdayName(ym, day)
  const assignments = state.roster[dKey] || []
  const date        = new Date(`${ym}-${String(day).padStart(2, '0')}`)
  const dateLabel   = date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  const isPast      = dKey < TODAY_KEY

  const available           = state.employees.filter(e => e.availability[wdName as keyof typeof e.availability])
  const assignedIds         = new Set(assignments.map(a => a.employeeId))
  const unassignedAvailable = available.filter(e => !assignedIds.has(e.id))
  const unavailable         = state.employees.filter(e => !e.availability[wdName as keyof typeof e.availability])

  const activeProjects = state.projects.filter(p => {
    const s = new Date(p.start), en = new Date(p.end)
    return date >= s && date <= en
  })

  const update           = (next: RosterAssignment[]) => state.updateDay(dKey, next)
  const removeAssignment = (empId: string) => update(assignments.filter(a => a.employeeId !== empId))
  const changeProject    = (empId: string, projectId: string) =>
    update(assignments.map(a =>
      a.employeeId === empId ? { ...a, projectId, activityId: undefined, siteId: undefined } : a
    ))
  const changeActivity = (empId: string, activityId: string) => {
    const act = activityId ? state.activities.find(a => a.id === activityId) : undefined
    update(assignments.map(a =>
      a.employeeId === empId ? { ...a, activityId: activityId || undefined, siteId: act?.siteId } : a
    ))
  }
  const addTo = (empId: string, projectId: string) =>
    update([...assignments, { employeeId: empId, projectId }])
  const toggleOvertime = (empId: string, hours: number) =>
    update(assignments.map(a => a.employeeId === empId ? { ...a, overtimeHours: hours } : a))

  const subtitle = `${assignments.length} assigned · ${unassignedAvailable.length} available · ${unavailable.length} unavailable`

  return (
    <Drawer title={dateLabel} subtitle={subtitle} onClose={onClose} saveLabel="Done" onSave={onClose}>
      {isPast && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 12px', background: 'var(--bg-sunken)',
          borderRadius: 6, marginBottom: 14, fontSize: 12, color: 'var(--ink-3)',
        }}>
          <Icon name="lock" size={12} /> Past day — edits are still saved
        </div>
      )}

      {/* Assigned */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 10 }}>
          Assigned ({assignments.length})
        </div>
        {assignments.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--ink-3)', padding: 12, background: 'var(--bg-sunken)', borderRadius: 6 }}>
            No one assigned to this day yet.
          </div>
        )}
        {assignments.map(a => {
          const emp     = state.employees.find(x => x.id === a.employeeId)
          if (!emp) return null
          const canOT   = state.activities.some(act => act.projectId === a.projectId && act.status === 'active' && act.overtimeFlag)
          const actOpts = state.activities
            .filter(act => act.projectId === a.projectId && act.status === 'active')
            .map(act => ({ value: act.id, label: act.name }))
          return (
            <div key={a.employeeId} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: 10, background: 'var(--bg-sunken)', borderRadius: 6, marginBottom: 6,
            }}>
              <div className="staff-avatar" style={{ width: 30, height: 30, fontSize: 10, flexShrink: 0, marginTop: 2 }}>
                {emp.name.split(' ').map(x => x[0]).join('')}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{emp.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {emp.role}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'stretch' }}>
                <Select
                  value={a.projectId}
                  onChange={v => changeProject(a.employeeId, v)}
                  options={activeProjects.map(p => ({ value: p.id, label: p.name }))}
                  style={{ fontSize: 12, width: 180 }}
                />
                {actOpts.length > 0 && (
                  <Select
                    value={a.activityId ?? ''}
                    placeholder="No activity…"
                    onChange={v => changeActivity(a.employeeId, v)}
                    options={actOpts}
                    style={{ fontSize: 11, width: 180 }}
                  />
                )}
                {canOT && (
                  <NumericInput
                    className="input"
                    placeholder="OT hrs"
                    value={a.overtimeHours ?? 0}
                    onChange={v => toggleOvertime(a.employeeId, v)}
                    style={{ width: 180, fontSize: 12 }}
                  />
                )}
              </div>
              <button className="iconbtn" onClick={() => removeAssignment(a.employeeId)} style={{ color: 'var(--ink-3)', flexShrink: 0 }}>
                <Icon name="close" size={14} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Available */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 10 }}>
          Available ({unassignedAvailable.length})
        </div>
        {unassignedAvailable.map(emp => (
          <div key={emp.id} style={{
            display: 'flex', gap: 10, alignItems: 'center',
            padding: 10, background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 6, marginBottom: 6,
          }}>
            <div className="staff-avatar" style={{ width: 30, height: 30, fontSize: 10 }}>
              {emp.name.split(' ').map(x => x[0]).join('')}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{emp.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {emp.role} · {emp.skills.slice(0, 2).join(', ')}
              </div>
            </div>
            <Select
              value=""
              placeholder="+ Add to project…"
              onChange={v => { if (v) addTo(emp.id, v) }}
              options={activeProjects.map(p => ({ value: p.id, label: p.name }))}
              style={{ fontSize: 12, maxWidth: 200 }}
            />
          </div>
        ))}
        {unassignedAvailable.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>All available staff are assigned.</div>
        )}
      </div>

      {/* Unavailable */}
      {unavailable.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-4)', marginBottom: 10 }}>
            Unavailable ({unavailable.length}) — visibility only
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {unavailable.map(e => (
              <span key={e.id} style={{ padding: '4px 8px', background: 'var(--bg-sunken)', borderRadius: 4, fontSize: 11, color: 'var(--ink-3)' }}>
                {e.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </Drawer>
  )
}

// ── Rules modal ───────────────────────────────────────────────────────────────

function RulesModal({ onClose }: { onClose: () => void }) {
  return (
    <Drawer title="Auto-generate rules" subtitle="Hard rules the scheduler never breaks" onClose={onClose} saveLabel="Got it" onSave={onClose}>
      <ol style={{ paddingLeft: 20, fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)' }}>
        <li>Only active activities within their date range are scheduled.</li>
        <li>Monthly visit target is derived from each activity&apos;s remaining allocation and date span.</li>
        <li>Fixed crew size is always respected — never partial-fill.</li>
        <li>Employees are never scheduled on days outside their availability.</li>
        <li>No two Field Supervisors on the same project on the same day.</li>
        <li>Higher-priority activities are filled first each day.</li>
        <li>Equal-priority activities get visits distributed evenly across the month.</li>
        <li>Approved carryovers add one extra visit for the affected activity.</li>
      </ol>
      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--ink-3)' }}>
        After auto-generate you can click any day to freely edit — manual overrides are never blocked.
      </div>
    </Drawer>
  )
}

// ── Projects drawer ───────────────────────────────────────────────────────────

function ProjectsDrawer({ state, rosterMonth, activityVisits, onClose }: {
  state: ReturnType<typeof useCCState>
  rosterMonth: string
  activityVisits: Record<string, number>
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [y, m] = rosterMonth.split('-').map(Number)
  const monthStart = new Date(y, m - 1, 1)
  const monthEnd   = new Date(y, m, 0)

  const activeProjects = useMemo(() =>
    state.projects.filter(p => {
      if (!p.start || !p.end) return false
      return parseDate(p.start) <= monthEnd && parseDate(p.end) >= monthStart
    }),
    [state.projects, rosterMonth]
  )

  const projectActivities = useMemo(() => {
    const map = new Map<string, Array<{ activity: Activity; target: number }>>()
    for (const p of activeProjects) {
      const items = state.activities
        .filter(a => a.projectId === p.id && a.status === 'active')
        .map(a => ({ activity: a, target: computeMonthlyTarget(a, rosterMonth, state.allocations) }))
        .filter(x => x.target > 0)
      map.set(p.id, items)
    }
    return map
  }, [activeProjects, state.activities, state.allocations, rosterMonth])

  const toggle = (pid: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(pid) ? next.delete(pid) : next.add(pid)
      return next
    })

  const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  return (
    <Drawer
      title="Projects"
      subtitle={`${activeProjects.length} active in ${monthName}`}
      onClose={onClose}
      saveLabel="Done"
      onSave={onClose}
    >
      {activeProjects.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>No active projects this month.</div>
      )}
      {activeProjects.map(project => {
        const items      = projectActivities.get(project.id) ?? []
        const isExpanded = expanded.has(project.id)
        return (
          <div key={project.id} style={{ marginBottom: 8 }}>
            <button
              onClick={() => toggle(project.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '10px 12px', background: 'var(--bg-sunken)',
                border: '1px solid var(--line)',
                borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{
                fontSize: 9, color: 'var(--ink-3)',
                display: 'inline-block', transition: 'transform 0.15s',
                transform: isExpanded ? 'rotate(90deg)' : 'none',
              }}>▶</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{project.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                  {items.length > 0
                    ? `${items.length} activit${items.length !== 1 ? 'ies' : 'y'} scheduled`
                    : 'No activities allocated this month'}
                </div>
              </div>
            </button>
            {isExpanded && (
              <div style={{ border: '1px solid var(--line)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                {items.length === 0 ? (
                  <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink-3)', background: 'var(--bg-elev)' }}>
                    No activities with allocation this month.
                  </div>
                ) : (
                  items.map(({ activity: act, target }, i) => {
                    const monthVisits  = activityVisits[act.id] || 0
                    const monthPct     = target > 0 ? Math.min(100, Math.round(monthVisits / target * 100)) : 0
                    const overallPct   = act.totalAllocation > 0
                      ? Math.min(100, Math.round(act.unitsCompleted / act.totalAllocation * 100))
                      : 0
                    return (
                      <div key={act.id} style={{
                        padding: '12px 14px', background: 'var(--bg-elev)',
                        borderTop: i > 0 ? '1px solid var(--line)' : 'none',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>{act.name}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {/* This month */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>This month</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-2)' }}>{monthVisits}/{target} visits</span>
                            </div>
                            <div style={{ height: 3, background: 'var(--bg-sunken)', borderRadius: 2 }}>
                              <div style={{ height: '100%', width: monthPct + '%', background: monthPct >= 100 ? 'var(--ok)' : 'var(--accent)', borderRadius: 2 }} />
                            </div>
                          </div>
                          {/* Overall */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overall</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-2)' }}>{act.unitsCompleted}/{act.totalAllocation} {act.unit}</span>
                            </div>
                            <div style={{ height: 3, background: 'var(--bg-sunken)', borderRadius: 2 }}>
                              <div style={{ height: '100%', width: overallPct + '%', background: overallPct >= 100 ? 'var(--ok)' : 'var(--ink-3)', borderRadius: 2 }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )
      })}
    </Drawer>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RosteringPage() {
  const state = useCCState()
  const [selectedDay, setSelectedDay]                 = useState<number | null>(null)
  const [showHelp, setShowHelp]                       = useState(false)
  const [showProjects, setShowProjects]               = useState(false)
  const [confirmAction, setConfirmAction]             = useState<'autogen' | 'clear' | null>(null)
  const [showCarryoverReview, setShowCarryoverReview] = useState(false)
  const [reviewEntries, setReviewEntries]             = useState<ReviewEntry[]>([])

  const n = daysInMonth(state.rosterMonth)
  const hasSat = state.employees.some(e => e.availability.sat)
  const [y, m] = state.rosterMonth.split('-').map(Number)
  const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalShifts = 0
    const uniqueStaff    = new Set<string>()
    const activityVisits: Record<string, number> = {}

    for (const dKey in state.roster) {
      if (!dKey.startsWith(state.rosterMonth)) continue
      const a = state.roster[dKey] || []
      totalShifts += a.length
      const seenActs = new Set<string>()
      a.forEach(x => {
        uniqueStaff.add(x.employeeId)
        if (x.activityId && !seenActs.has(x.activityId)) {
          activityVisits[x.activityId] = (activityVisits[x.activityId] || 0) + 1
          seenActs.add(x.activityId)
        }
      })
    }
    return { totalShifts, uniqueStaff: uniqueStaff.size, activityVisits }
  }, [state.roster, state.rosterMonth])

  // ── Auto-generate helpers ──────────────────────────────────────────────────

  function runAutoGenerate(approvedActivityIds: Set<string>) {
    const generated = autoGenerate(state.activities, state.employees, state.rosterMonth, approvedActivityIds, state.allocations)
    const newRoster = { ...state.roster }
    Object.keys(newRoster).forEach(k => { if (k.startsWith(state.rosterMonth)) delete newRoster[k] })
    Object.assign(newRoster, generated)
    state.setRoster(newRoster)
  }

  const handleAutoGen = () => {
    const prevMonth    = prevMonthKey(state.rosterMonth)
    const existingKeys = new Set(state.carryovers.map(c => `${c.activityId}:${c.originalDateKey}`))
    const newCarryovers = detectUnderstaffing(state.roster, prevMonth, state.activities, existingKeys)

    const existingPending = state.carryovers.filter(c => c.status === 'pending')

    const entries: ReviewEntry[] = []
    const seen = new Set<string>()

    existingPending.forEach(c => {
      const key = `${c.activityId}:${c.originalDateKey}`
      if (!seen.has(key)) {
        seen.add(key)
        entries.push({ activityId: c.activityId, originalDateKey: c.originalDateKey, unitsMissed: c.unitsMissed, approved: true, existingId: c.id })
      }
    })
    newCarryovers.forEach(c => {
      const key = `${c.activityId}:${c.originalDateKey}`
      if (!seen.has(key)) {
        seen.add(key)
        entries.push({ activityId: c.activityId, originalDateKey: c.originalDateKey, unitsMissed: c.unitsMissed, approved: true })
      }
    })

    if (entries.length > 0) {
      setReviewEntries(entries)
      setShowCarryoverReview(true)
    } else {
      setConfirmAction('autogen')
    }
  }

  const handleGenerateAfterReview = () => {
    setShowCarryoverReview(false)

    const newItems = reviewEntries
      .filter(e => !e.existingId)
      .map(e => ({
        activityId:      e.activityId,
        originalDateKey: e.originalDateKey,
        unitsMissed:     e.unitsMissed,
        status:          (e.approved ? 'approved' : 'skipped') as CarryoverStatus,
      }))
    if (newItems.length > 0) state.addCarryovers(newItems)

    reviewEntries.filter(e => e.existingId).forEach(e => {
      state.updateCarryover(e.existingId!, e.approved ? 'approved' : 'skipped')
    })

    const approvedActivityIds = new Set(
      reviewEntries.filter(e => e.approved).map(e => e.activityId)
    )
    runAutoGenerate(approvedActivityIds)
  }

  const handleConfirmAutoGen = () => {
    setConfirmAction(null)
    runAutoGenerate(new Set())
  }

  const handleConfirmClear = () => {
    setConfirmAction(null)
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

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const cols      = hasSat ? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] : ['mon', 'tue', 'wed', 'thu', 'fri']
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
          <button className="btn" onClick={() => setConfirmAction('clear')}>Clear month</button>
          <button className="btn" onClick={() => setShowHelp(true)}>Rules</button>
          <button className="btn" onClick={() => setShowProjects(true)}>Projects</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={prevMonth}>←</button>
          <div className="chip" style={{ fontFamily: 'var(--font-display)', fontSize: 16, height: 32, padding: '0 14px', textTransform: 'none', letterSpacing: '-0.01em' }}>
            {monthName}
          </div>
          <button className="btn" onClick={nextMonth}>→</button>
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

      {selectedDay && (
        <DayEditor day={selectedDay} ym={state.rosterMonth} state={state} onClose={() => setSelectedDay(null)} />
      )}
      {showHelp && <RulesModal onClose={() => setShowHelp(false)} />}
      {showProjects && (
        <ProjectsDrawer
          state={state}
          rosterMonth={state.rosterMonth}
          activityVisits={stats.activityVisits}
          onClose={() => setShowProjects(false)}
        />
      )}

      {showCarryoverReview && (
        <CarryoverReviewModal
          entries={reviewEntries}
          activities={state.activities}
          projects={state.projects}
          onChange={(idx, approved) =>
            setReviewEntries(prev => prev.map((e, i) => i === idx ? { ...e, approved } : e))
          }
          onConfirm={handleGenerateAfterReview}
          onCancel={() => setShowCarryoverReview(false)}
        />
      )}

      {confirmAction === 'autogen' && (
        <ConfirmDialog
          title={`Auto-generate ${monthName}?`}
          message="This will replace all existing assignments for this month with an automatically generated roster. Any manual changes will be lost."
          confirmLabel="Auto-generate"
          onConfirm={handleConfirmAutoGen}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'clear' && (
        <ConfirmDialog
          title={`Clear ${monthName}?`}
          message="All roster assignments for this month will be permanently removed. This cannot be undone."
          confirmLabel="Clear month"
          danger
          onConfirm={handleConfirmClear}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}
