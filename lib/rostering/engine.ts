import type { Activity, Employee, Project, RosterAssignment, ActivityCarryover, ActivityAllocation, WeatherMetric, WeatherConstraint, DailyWeather } from '@/lib/types'

export { type WeatherMetric, type WeatherConstraint, type DailyWeather }

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export type DayKey = typeof DAY_KEYS[number]
export const DAY_HOURS = 8
const LEADERSHIP_ROLES = new Set(['Field Supervisor', 'Team Leader'])
// Passed to autoGenerate for intelligent scheduling
export type AutoGenerateOptions = {
  projects?: Array<{ id: string; lat?: number; lng?: number }>
  activityTypes?: Array<{ id?: string; requiredEquipmentIds?: string[]; weatherConstraints?: WeatherConstraint[] }>
  // projectId -> dateKey ('YYYY-MM-DD') -> weather
  weather?: Record<string, Record<string, DailyWeather>>
  equipmentTravelBufferDays?: number   // default 1 — days of buffer required when same equipment moves between far sites
  equipmentNearbyThresholdKm?: number  // default 50 — km within which sites are considered "nearby" (no buffer needed)
}

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

// Haversine distance between two lat/lng points in km
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Count distinct calendar months an activity spans (inclusive of partial months).
function calendarMonthsSpanned(actStart: Date, actEnd: Date): number {
  return (actEnd.getFullYear() - actStart.getFullYear()) * 12
    + (actEnd.getMonth() - actStart.getMonth()) + 1
}

// Returns a priority bonus based on how close an activity is to its deadline.
export function deadlinePriorityBonus(a: Activity, rosterMonth: string): number {
  if (!a.end) return 0
  const [ry, rm] = rosterMonth.split('-').map(Number)
  const rosterEnd = new Date(ry, rm, 0) // last day of roster month
  const actEnd = parseDate(a.end)
  const daysRemaining = Math.floor((actEnd.getTime() - rosterEnd.getTime()) / (1000 * 60 * 60 * 24))
  const remaining = Math.max(0, a.totalAllocation - a.unitsCompleted)
  if (remaining <= 0) return 0
  if (daysRemaining <= 0)  return 4  // ends this month or overdue
  if (daysRemaining <= 30) return 2  // ends next month
  if (daysRemaining <= 60) return 1  // 2 months out
  if (daysRemaining <= 90) return 0.5
  return 0
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

// Count how many days each activity was rostered in a given month.
export function computeActivityMonthVisits(
  roster: Record<string, RosterAssignment[]>,
  rosterMonth: string,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const [dKey, assignments] of Object.entries(roster)) {
    if (!dKey.startsWith(rosterMonth)) continue
    const seen = new Set<string>()
    for (const a of assignments) {
      if (a.activityId && !seen.has(a.activityId)) {
        seen.add(a.activityId)
        counts[a.activityId] = (counts[a.activityId] ?? 0) + 1
      }
    }
  }
  return counts
}

// Returns project IDs that have at least one activity under its monthly visit target.
export function computeProjectShortfalls(
  roster: Record<string, RosterAssignment[]>,
  activities: Activity[],
  allocations: ActivityAllocation[],
  rosterMonth: string,
): Set<string> {
  const visits = computeActivityMonthVisits(roster, rosterMonth)
  const result = new Set<string>()
  for (const a of activities) {
    if (a.status !== 'active') continue
    const target = computeMonthlyTarget(a, rosterMonth, allocations)
    if (target <= 0) continue
    if ((visits[a.id] ?? 0) < target) result.add(a.projectId)
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
  options: AutoGenerateOptions = {},
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
  const sorted = [...eligible].sort((a, b) => {
    const sa = (priorityScore[a.priority] || 0) + deadlinePriorityBonus(a, rosterMonth)
    const sb = (priorityScore[b.priority] || 0) + deadlinePriorityBonus(b, rosterMonth)
    return sb - sa
  })
  const visitCount: Record<string, number> = {}
  eligible.forEach(a => { visitCount[a.id] = 0 })

  const {
    projects: optProjects = [],
    activityTypes: optActTypes = [],
    weather: optWeather = {},
    equipmentTravelBufferDays = 1,
    equipmentNearbyThresholdKm = 50,
  } = options

  // Total expected daily crew load for soft day-balancing
  const totalTargetVisits = Object.values(visitTargets).reduce((s, v) => s + v, 0)
  const avgDailyLoad = totalTargetVisits > 0 ? totalTargetVisits / days.length : 0

  // Track assignments per employee (for load balancing)
  const empLoad: Record<string, number> = {}
  employees.forEach(e => { empLoad[e.id] = 0 })

  // Track total crew scheduled per day (for day load balancing)
  const dayLoad: Record<string, number> = {}

  // Track which equipment is scheduled on which day at which project
  // equipmentSchedule[vehicleId][dateKey] = projectId
  const equipmentSchedule: Record<string, Record<string, string>> = {}

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

        // Soft day-load cap: skip this activity if day is significantly overloaded,
        // UNLESS the activity is behind its own pacing (current < expected - 1).
        if (avgDailyLoad > 0 && (dayLoad[dKey] ?? 0) > avgDailyLoad * 1.8 && current >= expected - 1) return
      }

      // ── Weather check ──────────────────────────────────────────────────────
      const actType = optActTypes.find(t => t.id === act.activityTypeId)
      if (actType?.weatherConstraints?.length) {
        const proj = optProjects.find(p => p.id === act.projectId)
        const dayWeather = proj ? optWeather[proj.id]?.[dKey] : undefined
        if (dayWeather) {
          const blocked = actType.weatherConstraints.some(c => {
            const v = dayWeather[c.metric as keyof DailyWeather]
            if (c.max !== undefined && v > c.max) return true
            if (c.min !== undefined && v < c.min) return true
            return false
          })
          if (blocked) return
        }
      }

      // ── Equipment conflict check ───────────────────────────────────────────
      if (actType?.requiredEquipmentIds?.length && optProjects.length) {
        const thisProj = optProjects.find(p => p.id === act.projectId)
        if (thisProj) {
          for (const vehicleId of actType.requiredEquipmentIds) {
            for (let offset = -equipmentTravelBufferDays; offset <= equipmentTravelBufferDays; offset++) {
              if (offset === 0) continue
              const checkDate = new Date(y, m - 1, d + offset)
              const checkKey = dateKey(
                `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}`,
                checkDate.getDate()
              )
              const otherProjId = equipmentSchedule[vehicleId]?.[checkKey]
              if (!otherProjId || otherProjId === act.projectId) continue
              const otherProj = optProjects.find(p => p.id === otherProjId)
              if (otherProj?.lat != null && otherProj.lng != null && thisProj.lat != null && thisProj.lng != null) {
                const dist = haversineKm(thisProj.lat, thisProj.lng, otherProj.lat, otherProj.lng)
                if (dist > equipmentNearbyThresholdKm) return // equipment conflict — skip this day
              }
            }
          }
        }
      }

      // ── Employee selection (existing logic, modified for load balancing) ───
      const avail = employees.filter(
        e => e.availability[wdName as keyof typeof e.availability] && !usedIds.has(e.id)
      )
      if (avail.length === 0) return

      const scored = avail.map(e => ({
        e,
        score: act.skills.filter(s => e.skills.includes(s)).length
          + (LEADERSHIP_ROLES.has(e.role) ? 2.0 : 0)
          - (empLoad[e.id] ?? 0) * 0.1,
      })).sort((a, b) => b.score - a.score)

      const minNeeded  = act.crewSizeType === 'any' ? 1 : act.minCrew
      const maxAllowed = act.crewSizeType === 'range' && act.maxCrew
        ? act.maxCrew
        : act.crewSizeType === 'any' ? avail.length : act.minCrew

      if (scored.length < minNeeded) return

      let hasSup = false
      let hasLeader = false
      const chosen: Employee[] = []
      for (const { e } of scored) {
        if (chosen.length >= maxAllowed) break
        if (e.role === 'Field Supervisor') {
          if (hasSup) continue  // at most one supervisor per project per day
          hasSup = true; hasLeader = true
        } else if (e.role === 'Team Leader') {
          hasLeader = true
        }
        chosen.push(e)
      }
      // If no leadership included and there's room, inject one
      if (!hasLeader && chosen.length < maxAllowed) {
        const leaderEntry = scored.find(({ e }) =>
          !chosen.includes(e) && LEADERSHIP_ROLES.has(e.role) && !(e.role === 'Field Supervisor' && hasSup)
        )
        if (leaderEntry) { chosen.push(leaderEntry.e); hasLeader = true }
      }
      if (chosen.length < minNeeded) return

      chosen.forEach(e => {
        usedIds.add(e.id)
        empLoad[e.id] = (empLoad[e.id] ?? 0) + 1
        assignments.push({
          employeeId: e.id,
          projectId:  act.projectId,
          activityId: act.id,
          siteId:     act.siteId,
        })
      })
      visitCount[act.id] = (visitCount[act.id] ?? 0) + 1

      // Register equipment usage for conflict tracking
      if (actType?.requiredEquipmentIds?.length) {
        for (const vehicleId of actType.requiredEquipmentIds) {
          if (!equipmentSchedule[vehicleId]) equipmentSchedule[vehicleId] = {}
          equipmentSchedule[vehicleId][dKey] = act.projectId
        }
      }
    })

    // Update day load after all activities processed for this day
    dayLoad[dKey] = (dayLoad[dKey] ?? 0) + assignments.length

    if (assignments.length > 0) newRoster[dKey] = assignments
  })

  return newRoster
}
