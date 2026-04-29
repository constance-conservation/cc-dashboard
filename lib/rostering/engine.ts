import type { Activity, Employee, Project, RosterAssignment, ActivityCarryover, ActivityAllocation } from '@/lib/types'

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export type DayKey = typeof DAY_KEYS[number]
export const DAY_HOURS = 8

// Parse a YYYY-MM-DD string as a local date (avoids UTC timezone shift).
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function dateKey(ym: string, d: number) {
  return `${ym}-${String(d).padStart(2, '0')}`
}

export function weekdayIdx(ym: string, d: number) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export function weekdayName(ym: string, d: number): DayKey {
  return DAY_KEYS[weekdayIdx(ym, d)]
}

// Count distinct calendar months an activity spans (inclusive of partial months).
function calendarMonthsSpanned(actStart: Date, actEnd: Date): number {
  return (actEnd.getFullYear() - actStart.getFullYear()) * 12
    + (actEnd.getMonth() - actStart.getMonth()) + 1
}

// Returns unschedulable remainder hours when unit=hours and strategy=even.
export function computeHoursRemainder(a: Activity): number {
  if (a.unit !== 'hours' || a.allocationStrategy !== 'even') return 0
  const remaining = Math.max(0, a.totalAllocation - a.unitsCompleted)
  return remaining % DAY_HOURS
}

// Monthly visit target for a single activity in a given month.
export function computeMonthlyTarget(
  a: Activity,
  rosterMonth: string,
  allocations: ActivityAllocation[] = [],
): number {
  if (!a.start || !a.end) return 0
  const [y, m] = rosterMonth.split('-').map(Number)
  const monthStart = new Date(y, m - 1, 1)
  const monthEnd   = new Date(y, m, 0)
  const actStart   = parseDate(a.start)
  const actEnd     = parseDate(a.end)
  if (actStart > monthEnd || actEnd < monthStart) return 0

  const remaining = Math.max(0, a.totalAllocation - a.unitsCompleted)

  if (a.allocationStrategy === 'custom_date') {
    return allocations.filter(al => al.activityId === a.id && al.period.length === 10 && al.period.startsWith(rosterMonth)).length
  }

  if (a.allocationStrategy === 'custom') {
    const monthAlloc = allocations.find(al => al.activityId === a.id && al.period === rosterMonth)
    if (monthAlloc) {
      return a.unit === 'days' ? monthAlloc.allocation : Math.ceil(monthAlloc.allocation / DAY_HOURS)
    }
    // Fall back to even spread if no custom alloc for this month
  }

  const totalMonths = Math.max(1, calendarMonthsSpanned(actStart, actEnd))
  const monthIndex  = (y - actStart.getFullYear()) * 12 + (m - 1 - actStart.getMonth())

  if (a.unit === 'hours') {
    // Distribute only full days (multiples of DAY_HOURS) to avoid partial-day allocations.
    const fullDays = Math.floor(remaining / DAY_HOURS)
    const dBase    = Math.floor(fullDays / totalMonths)
    const dExtras  = fullDays % totalMonths
    return dBase + (monthIndex < dExtras ? 1 : 0)
  }

  const base   = Math.floor(remaining / totalMonths)
  const extras = remaining % totalMonths
  return Math.max(0, base + (monthIndex < extras ? 1 : 0))
}

// Returns projects that have at least one active activity spanning the given day.
export function getProjectsWithActivitiesOnDay(
  projects: Project[],
  activities: Activity[],
  dayDate: Date,
): Project[] {
  const active = new Set(
    activities
      .filter(a => a.status === 'active' && !!a.start && !!a.end
        && parseDate(a.start) <= dayDate && parseDate(a.end) >= dayDate)
      .map(a => a.projectId)
  )
  return projects.filter(p => active.has(p.id))
}

// Detect days in a month where an activity was understaffed.
export function detectUnderstaffing(
  roster: Record<string, RosterAssignment[]>,
  month: string,
  activities: Activity[],
  existingKeys: Set<string>,
): Omit<ActivityCarryover, 'id' | 'createdAt'>[] {
  const result: Omit<ActivityCarryover, 'id' | 'createdAt'>[] = []
  const today = new Date().toISOString().slice(0, 10)

  for (const [dKey, assignments] of Object.entries(roster)) {
    if (!dKey.startsWith(month)) continue
    const byActivity: Record<string, number> = {}
    for (const a of assignments) {
      if (a.activityId) byActivity[a.activityId] = (byActivity[a.activityId] ?? 0) + 1
    }
    for (const [actId, count] of Object.entries(byActivity)) {
      const act = activities.find(a => a.id === actId)
      if (!act || act.crewSizeType === 'any') continue
      if (count < act.minCrew) {
        const key = `${actId}:${dKey}`
        if (!existingKeys.has(key)) {
          result.push({
            activityId: actId,
            originalDateKey: dKey,
            unitsMissed: 1,
            status: 'pending',
            reviewDate: today,
          })
        }
      }
    }
  }
  return result
}

// Activity-aware auto-generate roster for a month.
export function autoGenerate(
  activities: Activity[],
  employees: Employee[],
  rosterMonth: string,
  approvedActivityIds: Set<string>,
  allocations: ActivityAllocation[] = [],
): Record<string, RosterAssignment[]> {
  const [y, m] = rosterMonth.split('-').map(Number)
  const monthStart = new Date(y, m - 1, 1)
  const monthEnd   = new Date(y, m, 0)
  const n          = monthEnd.getDate()

  const eligible = activities.filter(a => {
    if (a.status !== 'active' || !a.start || !a.end) return false
    const actStart = parseDate(a.start)
    const actEnd   = parseDate(a.end)
    return actStart <= monthEnd && actEnd >= monthStart
  })
  if (eligible.length === 0) return {}

  const visitTargets: Record<string, number> = {}
  eligible.forEach(a => {
    const base = computeMonthlyTarget(a, rosterMonth, allocations)
    visitTargets[a.id] = base + (approvedActivityIds.has(a.id) ? 1 : 0)
  })

  const hasSat = employees.some(e => e.availability.sat)
  const days: number[] = []
  for (let d = 1; d <= n; d++) {
    const wd = weekdayIdx(rosterMonth, d)
    if (wd === 0) continue
    if (wd === 6 && !hasSat) continue
    days.push(d)
  }

  const priorityScore: Record<string, number> = { high: 3, medium: 2, low: 1 }
  const sorted = [...eligible].sort((a, b) =>
    (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0)
  )
  const visitCount: Record<string, number> = {}
  eligible.forEach(a => { visitCount[a.id] = 0 })

  const newRoster: Record<string, RosterAssignment[]> = {}

  days.forEach((d, dayIdx) => {
    const dKey    = dateKey(rosterMonth, d)
    const dayDate = new Date(y, m - 1, d)
    const wdName  = weekdayName(rosterMonth, d)
    const assignments: RosterAssignment[] = []
    const usedIds = new Set<string>()

    sorted.forEach(act => {
      // Only schedule on days within the activity's own date range.
      if (parseDate(act.start) > dayDate || parseDate(act.end) < dayDate) return

      if (act.allocationStrategy === 'custom_date') {
        const dateAlloc = allocations.find(al => al.activityId === act.id && al.period === dKey)
        if (!dateAlloc || dateAlloc.allocation <= 0) return
      } else {
        const target   = visitTargets[act.id] ?? 0
        const current  = visitCount[act.id] ?? 0
        const expected = Math.ceil((dayIdx + 1) / days.length * target)
        if (current >= target || current >= expected) return
      }

      const avail = employees.filter(
        e => e.availability[wdName as keyof typeof e.availability] && !usedIds.has(e.id)
      )
      if (avail.length === 0) return

      const scored = avail.map(e => ({
        e,
        score: act.skills.filter(s => e.skills.includes(s)).length
          + (e.role === 'Field Supervisor' ? 0.5 : 0),
      })).sort((a, b) => b.score - a.score)

      const minNeeded  = act.crewSizeType === 'any' ? 1 : act.minCrew
      const maxAllowed = act.crewSizeType === 'range' && act.maxCrew
        ? act.maxCrew
        : act.crewSizeType === 'any' ? avail.length : act.minCrew

      if (scored.length < minNeeded) return

      let hasSup = false
      const chosen: Employee[] = []
      for (const { e } of scored) {
        if (chosen.length >= maxAllowed) break
        if (e.role === 'Field Supervisor') { if (hasSup) continue; hasSup = true }
        chosen.push(e)
      }
      if (chosen.length < minNeeded) return

      chosen.forEach(e => {
        usedIds.add(e.id)
        assignments.push({
          employeeId: e.id,
          projectId:  act.projectId,
          activityId: act.id,
          siteId:     act.siteId,
        })
      })
      visitCount[act.id] = (visitCount[act.id] ?? 0) + 1
    })

    if (assignments.length > 0) newRoster[dKey] = assignments
  })

  return newRoster
}
