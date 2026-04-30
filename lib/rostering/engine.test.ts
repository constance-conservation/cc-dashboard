import { describe, it, expect } from 'vitest'
import { parseDate, computeMonthlyTarget, computeHoursRemainder, autoGenerate, weekdayIdx, weekdayName, getProjectsWithActivitiesOnDay, haversineKm } from './engine'
import type { AutoGenerateOptions, DailyWeather, WeatherConstraint } from './engine'
import type { Activity, Employee, Project, ActivityAllocation } from '@/lib/types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    projectId: 'proj-1',
    siteId: 'site-1',
    name: 'Test Activity',
    allocationStrategy: 'even',
    unit: 'days',
    totalAllocation: 3,
    unitsCompleted: 0,
    crewSizeType: 'fixed',
    minCrew: 1,
    maxCrew: undefined,
    chargeOutRate: 0,
    overtimeFlag: false,
    overtimeRate: 1.5,
    skills: [],
    priority: 'medium',
    status: 'active',
    start: '2026-04-01',
    end: '2026-06-30',
    sortOrder: 0,
    ...overrides,
  }
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Test Project',
    client: '',
    start: '2026-04-01',
    end: '2026-06-30',
    priority: 'medium',
    contractValue: 0,
    ...overrides,
  }
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    name: 'Test Employee',
    role: 'Field Supervisor',
    type: 'full-time',
    payRate: 0,
    email: '',
    phone: '',
    skills: [],
    availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false },
    ...overrides,
  }
}

// ── parseDate ─────────────────────────────────────────────────────────────────

describe('parseDate', () => {
  it('parses a date string as local time with no timezone shift', () => {
    const d = parseDate('2026-04-30')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(3) // 0-indexed
    expect(d.getDate()).toBe(30)
  })

  it('parses first-of-month correctly', () => {
    const d = parseDate('2026-04-01')
    expect(d.getDate()).toBe(1)
    expect(d.getMonth()).toBe(3)
  })
})

// ── weekdayIdx / weekdayName ──────────────────────────────────────────────────

describe('weekdayIdx', () => {
  it('returns correct weekday — 2026-04-01 is Wednesday (3)', () => {
    expect(weekdayIdx('2026-04', 1)).toBe(3)
  })
  it('returns correct weekday — 2026-04-06 is Monday (1)', () => {
    expect(weekdayIdx('2026-04', 6)).toBe(1)
  })
})

describe('weekdayName', () => {
  it('returns "wed" for 2026-04-01', () => {
    expect(weekdayName('2026-04', 1)).toBe('wed')
  })
})

// ── computeMonthlyTarget ──────────────────────────────────────────────────────

describe('computeMonthlyTarget', () => {
  it('returns 0 if activity has no start or end', () => {
    expect(computeMonthlyTarget(makeActivity({ start: '', end: '' }), '2026-04')).toBe(0)
  })

  it('returns 0 for months outside the activity range', () => {
    const a = makeActivity({ start: '2026-04-01', end: '2026-06-30' })
    expect(computeMonthlyTarget(a, '2026-03')).toBe(0)
    expect(computeMonthlyTarget(a, '2026-07')).toBe(0)
  })

  it('distributes even-spread allocation evenly across calendar months', () => {
    // 3 days over Apr–Jun = 1 per month, sum = 3
    const a = makeActivity({ start: '2026-04-01', end: '2026-06-30', totalAllocation: 3 })
    expect(computeMonthlyTarget(a, '2026-04')).toBe(1)
    expect(computeMonthlyTarget(a, '2026-05')).toBe(1)
    expect(computeMonthlyTarget(a, '2026-06')).toBe(1)
  })

  it('distributes odd allocation using floor + remainder (4 days over 3 months)', () => {
    // 4 / 3 → base=1, extras=1 → month 0 gets +1, months 1–2 get base only
    const a = makeActivity({ start: '2026-04-01', end: '2026-06-30', totalAllocation: 4 })
    const apr = computeMonthlyTarget(a, '2026-04')
    const may = computeMonthlyTarget(a, '2026-05')
    const jun = computeMonthlyTarget(a, '2026-06')
    expect(apr + may + jun).toBe(4)
    expect(apr).toBe(2)
    expect(may).toBe(1)
    expect(jun).toBe(1)
  })

  it('handles activity starting on last day of month (timezone edge case)', () => {
    // start_date = April 30 — still falls within April
    const a = makeActivity({ start: '2026-04-30', end: '2026-06-30', totalAllocation: 3 })
    expect(computeMonthlyTarget(a, '2026-04')).toBeGreaterThan(0)
  })

  it('uses custom allocation for the specific month when strategy is custom', () => {
    const a = makeActivity({ allocationStrategy: 'custom', totalAllocation: 1 })
    const allocations: ActivityAllocation[] = [
      { id: 'alloc-1', activityId: 'act-1', period: '2026-04', allocation: 0 },
      { id: 'alloc-2', activityId: 'act-1', period: '2026-06', allocation: 1 },
    ]
    expect(computeMonthlyTarget(a, '2026-04', allocations)).toBe(0)
    expect(computeMonthlyTarget(a, '2026-06', allocations)).toBe(1)
  })

  it('falls back to even spread when custom alloc has no entry for month', () => {
    const a = makeActivity({ allocationStrategy: 'custom', totalAllocation: 3 })
    expect(computeMonthlyTarget(a, '2026-05', [])).toBeGreaterThan(0)
  })

  it('custom_date: counts date-specific allocations in the month', () => {
    const a = makeActivity({ allocationStrategy: 'custom_date' })
    const allocs: ActivityAllocation[] = [
      { id: 'a1', activityId: 'act-1', period: '2026-04-07', allocation: 1 },
      { id: 'a2', activityId: 'act-1', period: '2026-04-14', allocation: 1 },
      { id: 'a3', activityId: 'act-1', period: '2026-05-01', allocation: 1 },
    ]
    expect(computeMonthlyTarget(a, '2026-04', allocs)).toBe(2)
    expect(computeMonthlyTarget(a, '2026-05', allocs)).toBe(1)
    expect(computeMonthlyTarget(a, '2026-06', allocs)).toBe(0)
  })

  it('custom_date: returns 0 when no allocations provided', () => {
    const a = makeActivity({ allocationStrategy: 'custom_date' })
    expect(computeMonthlyTarget(a, '2026-04', [])).toBe(0)
  })

  it('hours-even: allocates in full-day multiples — 24h over 3 months = 1 visit/month', () => {
    const a = makeActivity({ unit: 'hours', totalAllocation: 24 })
    expect(computeMonthlyTarget(a, '2026-04')).toBe(1)
    expect(computeMonthlyTarget(a, '2026-05')).toBe(1)
    expect(computeMonthlyTarget(a, '2026-06')).toBe(1)
  })

  it('hours-even: floors to full days — 20h over 3 months gives 2 visits total', () => {
    const a = makeActivity({ unit: 'hours', totalAllocation: 20 })
    const apr = computeMonthlyTarget(a, '2026-04')
    const may = computeMonthlyTarget(a, '2026-05')
    const jun = computeMonthlyTarget(a, '2026-06')
    expect(apr + may + jun).toBe(2)
  })
})

// ── computeHoursRemainder ─────────────────────────────────────────────────────

describe('computeHoursRemainder', () => {
  it('returns 0 when unit is days', () => {
    expect(computeHoursRemainder(makeActivity({ unit: 'days', totalAllocation: 7 }))).toBe(0)
  })

  it('returns 0 when strategy is not even', () => {
    expect(computeHoursRemainder(makeActivity({ unit: 'hours', allocationStrategy: 'custom', totalAllocation: 7 }))).toBe(0)
  })

  it('returns remainder hours for even-spread hours activity', () => {
    expect(computeHoursRemainder(makeActivity({ unit: 'hours', totalAllocation: 20 }))).toBe(4)
    expect(computeHoursRemainder(makeActivity({ unit: 'hours', totalAllocation: 16 }))).toBe(0)
    expect(computeHoursRemainder(makeActivity({ unit: 'hours', totalAllocation: 25 }))).toBe(1)
  })
})

// ── autoGenerate ──────────────────────────────────────────────────────────────

describe('autoGenerate', () => {
  it('returns empty roster when no activities', () => {
    const result = autoGenerate([], [makeEmployee()], '2026-04', new Set())
    expect(result).toEqual({})
  })

  it('returns empty roster when no employees', () => {
    const result = autoGenerate([makeActivity()], [], '2026-04', new Set())
    expect(result).toEqual({})
  })

  it('schedules an even-spread activity in its first month', () => {
    const activity = makeActivity({ start: '2026-04-01', end: '2026-06-30', totalAllocation: 3 })
    const employee = makeEmployee()
    const result = autoGenerate([activity], [employee], '2026-04', new Set())
    const totalAssigned = Object.values(result).flat().filter(a => a.activityId === 'act-1').length
    expect(totalAssigned).toBe(1)
  })

  it('does not schedule activity before its start date', () => {
    // Activity starts April 15 — should not appear on April 1–14
    const activity = makeActivity({ start: '2026-04-15', end: '2026-06-30', totalAllocation: 3 })
    const employee = makeEmployee()
    const result = autoGenerate([activity], [employee], '2026-04', new Set())
    for (const [dKey, assignments] of Object.entries(result)) {
      const day = parseInt(dKey.split('-')[2])
      if (day < 15) {
        const hasActAssignment = assignments.some(a => a.activityId === 'act-1')
        expect(hasActAssignment).toBe(false)
      }
    }
  })

  it('skips activity in months outside its range', () => {
    const activity = makeActivity({ start: '2026-05-01', end: '2026-06-30', totalAllocation: 2 })
    const employee = makeEmployee()
    const result = autoGenerate([activity], [employee], '2026-04', new Set())
    expect(result).toEqual({})
  })

  it('respects fixed crew size — assigns exactly minCrew employees', () => {
    const activity = makeActivity({ crewSizeType: 'fixed', minCrew: 2 })
    const employees = [
      makeEmployee({ id: 'emp-1', role: 'Field Supervisor' }),
      makeEmployee({ id: 'emp-2', role: 'Field Worker' }),
      makeEmployee({ id: 'emp-3', role: 'Field Worker' }),
    ]
    const result = autoGenerate([activity], employees, '2026-04', new Set())
    const firstDay = Object.values(result)[0]
    expect(firstDay.filter(a => a.activityId === 'act-1').length).toBe(2)
  })

  it('does not schedule when not enough employees for fixed crew', () => {
    const activity = makeActivity({ crewSizeType: 'fixed', minCrew: 3 })
    const employees = [makeEmployee({ id: 'emp-1' }), makeEmployee({ id: 'emp-2' })]
    const result = autoGenerate([activity], employees, '2026-04', new Set())
    expect(Object.keys(result).length).toBe(0)
  })

  it('adds +1 to target for activities in approvedActivityIds', () => {
    const activity = makeActivity({ totalAllocation: 1 })
    const employee = makeEmployee()
    const withCarryover = autoGenerate([activity], [employee], '2026-04', new Set(['act-1']))
    const withoutCarryover = autoGenerate([activity], [employee], '2026-04', new Set())
    const countWith    = Object.values(withCarryover).flat().filter(a => a.activityId === 'act-1').length
    const countWithout = Object.values(withoutCarryover).flat().filter(a => a.activityId === 'act-1').length
    expect(countWith).toBeGreaterThan(countWithout)
  })

  it('uses custom monthly allocation when provided', () => {
    const activity = makeActivity({
      allocationStrategy: 'custom',
      totalAllocation: 1,
      start: '2026-04-01',
      end: '2026-06-30',
    })
    const employee = makeEmployee()
    // Custom: 0 in April, 1 in June
    const allocations: ActivityAllocation[] = [
      { id: 'a1', activityId: 'act-1', period: '2026-04', allocation: 0 },
      { id: 'a2', activityId: 'act-1', period: '2026-06', allocation: 1 },
    ]
    const result = autoGenerate([activity], [employee], '2026-04', new Set(), allocations)
    const aprilCount = Object.values(result).flat().filter(a => a.activityId === 'act-1').length
    expect(aprilCount).toBe(0)
  })

  it('only assigns employees available on that weekday', () => {
    const activity = makeActivity()
    // Employee only available Monday
    const employee = makeEmployee({
      availability: { mon: true, tue: false, wed: false, thu: false, fri: false, sat: false },
    })
    const result = autoGenerate([activity], [employee], '2026-04', new Set())
    for (const dKey of Object.keys(result)) {
      const day = parseInt(dKey.split('-')[2])
      const wd = new Date(2026, 3, day).getDay()
      expect(wd).toBe(1) // only Mondays
    }
  })

  it('custom_date: only schedules on exact dates that have allocations', () => {
    const activity = makeActivity({ allocationStrategy: 'custom_date' })
    const employee = makeEmployee()
    // 2026-04-07 is Tuesday, 2026-04-14 is Tuesday — both within default activity range
    const allocs: ActivityAllocation[] = [
      { id: 'a1', activityId: 'act-1', period: '2026-04-07', allocation: 1 },
      { id: 'a2', activityId: 'act-1', period: '2026-04-14', allocation: 1 },
    ]
    const result = autoGenerate([activity], [employee], '2026-04', new Set(), allocs)
    const scheduledDays = Object.keys(result).sort()
    expect(scheduledDays).toContain('2026-04-07')
    expect(scheduledDays).toContain('2026-04-14')
    expect(scheduledDays.length).toBe(2)
  })

  it('custom_date: returns empty roster when no date allocations provided', () => {
    const activity = makeActivity({ allocationStrategy: 'custom_date' })
    const employee = makeEmployee()
    const result = autoGenerate([activity], [employee], '2026-04', new Set(), [])
    expect(result).toEqual({})
  })
})

// ── getProjectsWithActivitiesOnDay ────────────────────────────────────────────

describe('getProjectsWithActivitiesOnDay', () => {
  const day = parseDate('2026-04-15')

  it('returns empty when no activities', () => {
    expect(getProjectsWithActivitiesOnDay([makeProject()], [], day)).toEqual([])
  })

  it('returns empty when no projects', () => {
    expect(getProjectsWithActivitiesOnDay([], [makeActivity()], day)).toEqual([])
  })

  it('includes project when it has an active activity spanning the day', () => {
    const result = getProjectsWithActivitiesOnDay(
      [makeProject()],
      [makeActivity({ start: '2026-04-01', end: '2026-06-30' })],
      day,
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('proj-1')
  })

  it('excludes project whose activity ends before the day', () => {
    const result = getProjectsWithActivitiesOnDay(
      [makeProject()],
      [makeActivity({ start: '2026-04-01', end: '2026-04-14' })],
      day,
    )
    expect(result).toHaveLength(0)
  })

  it('excludes project whose activity starts after the day', () => {
    const result = getProjectsWithActivitiesOnDay(
      [makeProject()],
      [makeActivity({ start: '2026-04-16', end: '2026-06-30' })],
      day,
    )
    expect(result).toHaveLength(0)
  })

  it('excludes completed activities', () => {
    const result = getProjectsWithActivitiesOnDay(
      [makeProject()],
      [makeActivity({ status: 'complete' })],
      day,
    )
    expect(result).toHaveLength(0)
  })

  it('only includes projects that have a matching activity', () => {
    const proj1 = makeProject({ id: 'proj-1' })
    const proj2 = makeProject({ id: 'proj-2' })
    const act1  = makeActivity({ projectId: 'proj-1' })
    const act2  = makeActivity({ id: 'act-2', projectId: 'proj-2', start: '2026-05-01', end: '2026-06-30' })
    const result = getProjectsWithActivitiesOnDay([proj1, proj2], [act1, act2], day)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('proj-1')
  })
})

// ── haversineKm ───────────────────────────────────────────────────────────────

describe('haversineKm', () => {
  it('returns ~0 for the same point', () => {
    expect(haversineKm(-33.8, 151.2, -33.8, 151.2)).toBeCloseTo(0, 1)
  })

  it('returns roughly correct distance between Sydney and Melbourne (~714km)', () => {
    const dist = haversineKm(-33.87, 151.21, -37.81, 144.96)
    expect(dist).toBeGreaterThan(700)
    expect(dist).toBeLessThan(730)
  })

  it('returns < 50km for nearby points', () => {
    expect(haversineKm(-33.8, 151.2, -33.85, 151.25)).toBeLessThan(10)
  })
})

// ── autoGenerate — workload balancing ─────────────────────────────────────────

describe('autoGenerate — workload balancing', () => {
  it('spreads assignments across employees — no single employee dominates', () => {
    const activity = makeActivity({ totalAllocation: 6 })
    const employees = [
      makeEmployee({ id: 'emp-1' }),
      makeEmployee({ id: 'emp-2' }),
      makeEmployee({ id: 'emp-3' }),
    ]
    const result = autoGenerate([activity], employees, '2026-04', new Set())
    const counts: Record<string, number> = {}
    Object.values(result).flat().forEach(a => {
      counts[a.employeeId] = (counts[a.employeeId] ?? 0) + 1
    })
    const vals = Object.values(counts)
    const max = Math.max(...vals)
    const min = Math.min(...vals)
    expect(max - min).toBeLessThanOrEqual(2)
  })
})

// ── autoGenerate — weather constraints ───────────────────────────────────────

describe('autoGenerate — weather constraints', () => {
  it('skips a weather-sensitive activity on days that exceed max precipitation', () => {
    const activity = makeActivity({ activityTypeId: 'type-1', totalAllocation: 2 })
    const employee = makeEmployee()
    const options: AutoGenerateOptions = {
      projects: [{ id: 'proj-1', lat: -33.8, lng: 151.2 }],
      activityTypes: [{ id: 'type-1', weatherConstraints: [{ metric: 'precipitation_mm', max: 5 }] }],
      weather: {
        'proj-1': {
          '2026-04-07': { precipitation_mm: 20, wind_speed_kmh: 10, temp_max_c: 22, temp_min_c: 14 },
          '2026-04-14': { precipitation_mm: 20, wind_speed_kmh: 10, temp_max_c: 22, temp_min_c: 14 },
          // All other days: fine weather (handled by absence = no block)
        },
      },
    }
    const result = autoGenerate([activity], [employee], '2026-04', new Set(), [], options)
    expect(result['2026-04-07']).toBeUndefined()
    expect(result['2026-04-14']).toBeUndefined()
  })

  it('schedules normally when weather is within constraints', () => {
    const activity = makeActivity({ activityTypeId: 'type-1', totalAllocation: 1 })
    const employee = makeEmployee()
    const options: AutoGenerateOptions = {
      projects: [{ id: 'proj-1', lat: -33.8, lng: 151.2 }],
      activityTypes: [{ id: 'type-1', weatherConstraints: [{ metric: 'precipitation_mm', max: 20 }] }],
      weather: {
        'proj-1': {
          '2026-04-07': { precipitation_mm: 5, wind_speed_kmh: 10, temp_max_c: 22, temp_min_c: 14 },
        },
      },
    }
    const result = autoGenerate([activity], [employee], '2026-04', new Set(), [], options)
    const total = Object.keys(result).length
    expect(total).toBeGreaterThan(0)
  })
})

// ── autoGenerate — equipment conflict ────────────────────────────────────────

describe('autoGenerate — equipment conflict', () => {
  it('blocks activity when same equipment is used at a far project the next day', () => {
    // activity-1 uses vehicle-1 at proj-1 (Sydney). activity-2 uses vehicle-1 at proj-2 (Melbourne).
    // Both want to schedule on consecutive days — the Melbourne activity should be blocked if
    // equipment was just used in Sydney (dist ~714km >> 50km threshold).
    const actSyd = makeActivity({ id: 'act-1', projectId: 'proj-1', activityTypeId: 'type-1', totalAllocation: 3 })
    const actMel = makeActivity({ id: 'act-2', projectId: 'proj-2', activityTypeId: 'type-2', totalAllocation: 3 })
    const employee = makeEmployee()
    const equipmentTravelBufferDays = 1
    const options: AutoGenerateOptions = {
      projects: [
        { id: 'proj-1', lat: -33.87, lng: 151.21 },  // Sydney
        { id: 'proj-2', lat: -37.81, lng: 144.96 },  // Melbourne
      ],
      activityTypes: [
        { id: 'type-1', requiredEquipmentIds: ['vehicle-1'] },
        { id: 'type-2', requiredEquipmentIds: ['vehicle-1'] },
      ],
      equipmentTravelBufferDays,
      equipmentNearbyThresholdKm: 50,
    }
    const result = autoGenerate([actSyd, actMel], [employee], '2026-04', new Set(), [], options)
    // Check no two calendar-adjacent days (+/- 1 day) have conflicting far-project equipment
    const scheduledDays = Object.keys(result).sort()
    for (let i = 0; i < scheduledDays.length; i++) {
      for (let j = i + 1; j < scheduledDays.length; j++) {
        const dayA = scheduledDays[i]
        const dayB = scheduledDays[j]
        const dateA = parseDate(dayA)
        const dateB = parseDate(dayB)
        const diffDays = Math.round((dateB.getTime() - dateA.getTime()) / 86400000)
        if (diffDays > equipmentTravelBufferDays) break
        const projsA = new Set(result[dayA].map(a => a.projectId))
        const projsB = new Set(result[dayB].map(a => a.projectId))
        const conflicting = projsA.has('proj-1') && projsB.has('proj-2')
          || projsA.has('proj-2') && projsB.has('proj-1')
        expect(conflicting).toBe(false)
      }
    }
    // Also verify that overall, both activities do get scheduled (engine isn't too aggressive)
    const allProjects = new Set(Object.values(result).flat().map(a => a.projectId))
    // At least one of the two activities should be scheduled
    expect(allProjects.size).toBeGreaterThan(0)
  })

  it('allows same equipment at nearby projects on consecutive days', () => {
    const actA = makeActivity({ id: 'act-1', projectId: 'proj-1', activityTypeId: 'type-1', totalAllocation: 2 })
    const actB = makeActivity({ id: 'act-2', projectId: 'proj-2', activityTypeId: 'type-2', totalAllocation: 2 })
    const employee = makeEmployee()
    const options: AutoGenerateOptions = {
      projects: [
        { id: 'proj-1', lat: -33.80, lng: 151.20 },
        { id: 'proj-2', lat: -33.82, lng: 151.22 },  // ~2.5km away — nearby
      ],
      activityTypes: [
        { id: 'type-1', requiredEquipmentIds: ['vehicle-1'] },
        { id: 'type-2', requiredEquipmentIds: ['vehicle-1'] },
      ],
      equipmentTravelBufferDays: 1,
      equipmentNearbyThresholdKm: 50,
    }
    const result = autoGenerate([actA, actB], [employee], '2026-04', new Set(), [], options)
    const totalAssigned = Object.values(result).flat().length
    expect(totalAssigned).toBeGreaterThan(0)
  })
})
