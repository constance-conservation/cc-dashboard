import { describe, it, expect } from 'vitest'
import { parseDate, computeMonthlyTarget, autoGenerate, weekdayIdx, weekdayName } from './engine'
import type { Activity, Employee, ActivityAllocation } from '@/lib/types'

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

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'emp-1',
    name: 'Test Employee',
    role: 'Field Worker',
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
    const employees = [makeEmployee({ id: 'emp-1' }), makeEmployee({ id: 'emp-2' }), makeEmployee({ id: 'emp-3' })]
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
})
