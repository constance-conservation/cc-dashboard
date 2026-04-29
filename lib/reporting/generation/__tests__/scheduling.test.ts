import { describe, it, expect } from 'vitest'
import {
  cadenceFromFrequency,
  reportCadenceFromExtended,
  isClientDueForGeneration,
  defaultPeriodForCadence,
} from '../scheduling'

describe('cadenceFromFrequency', () => {
  it('maps known frequencies', () => {
    expect(cadenceFromFrequency('weekly')).toBe('weekly')
    expect(cadenceFromFrequency('Monthly')).toBe('monthly')
    expect(cadenceFromFrequency('QUARTERLY')).toBe('quarterly')
    expect(cadenceFromFrequency('fortnightly')).toBe('fortnightly')
    expect(cadenceFromFrequency('annually')).toBe('annually')
  })

  it('returns null for off / null / unknown', () => {
    expect(cadenceFromFrequency(null)).toBeNull()
    expect(cadenceFromFrequency('')).toBeNull()
    expect(cadenceFromFrequency('off')).toBeNull()
    expect(cadenceFromFrequency('none')).toBeNull()
    expect(cadenceFromFrequency('biennial')).toBeNull()
  })
})

describe('reportCadenceFromExtended', () => {
  it('collapses to standalone Cadence type', () => {
    expect(reportCadenceFromExtended('weekly')).toBe('weekly')
    expect(reportCadenceFromExtended('fortnightly')).toBe('weekly')
    expect(reportCadenceFromExtended('monthly')).toBe('monthly')
    expect(reportCadenceFromExtended('quarterly')).toBe('quarterly')
    expect(reportCadenceFromExtended('annually')).toBe('quarterly')
  })
})

describe('isClientDueForGeneration', () => {
  const now = new Date('2026-04-29T06:00:00Z')

  it('is due when never generated', () => {
    expect(isClientDueForGeneration({ cadence: 'monthly', lastGeneratedAt: null, now })).toBe(true)
  })

  it('is due exactly at the cadence interval', () => {
    const last = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    expect(isClientDueForGeneration({ cadence: 'monthly', lastGeneratedAt: last, now })).toBe(true)
  })

  it('is NOT due 1 second before the cadence interval', () => {
    const last = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000 - 1000)).toISOString()
    expect(isClientDueForGeneration({ cadence: 'monthly', lastGeneratedAt: last, now })).toBe(false)
  })

  it('is due 1 second past the cadence interval', () => {
    const last = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000 + 1000)).toISOString()
    expect(isClientDueForGeneration({ cadence: 'monthly', lastGeneratedAt: last, now })).toBe(true)
  })

  it('weekly: not due 6 days back, due 7 days back', () => {
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()
    expect(isClientDueForGeneration({ cadence: 'weekly', lastGeneratedAt: sixDaysAgo, now })).toBe(false)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    expect(isClientDueForGeneration({ cadence: 'weekly', lastGeneratedAt: sevenDaysAgo, now })).toBe(true)
  })

  it('handles malformed timestamps as due', () => {
    expect(isClientDueForGeneration({ cadence: 'weekly', lastGeneratedAt: 'not-a-date', now })).toBe(true)
  })
})

describe('defaultPeriodForCadence', () => {
  it('monthly: previous full calendar month', () => {
    const now = new Date(Date.UTC(2026, 4, 15)) // May 15 2026
    const p = defaultPeriodForCadence('monthly', now)
    expect(p).toEqual({ periodStart: '2026-04-01', periodEnd: '2026-04-30', reportCadence: 'monthly' })
  })

  it('monthly: January wraps to previous December', () => {
    const now = new Date(Date.UTC(2026, 0, 5))
    const p = defaultPeriodForCadence('monthly', now)
    expect(p).toEqual({ periodStart: '2025-12-01', periodEnd: '2025-12-31', reportCadence: 'monthly' })
  })

  it('weekly: previous Monday → Sunday', () => {
    // 2026-04-29 is a Wednesday. Previous full week: Apr 20 (Mon) → Apr 26 (Sun).
    const now = new Date(Date.UTC(2026, 3, 29))
    const p = defaultPeriodForCadence('weekly', now)
    expect(p).toEqual({ periodStart: '2026-04-20', periodEnd: '2026-04-26', reportCadence: 'weekly' })
  })

  it('fortnightly maps to weekly cadence', () => {
    const now = new Date(Date.UTC(2026, 3, 29))
    const p = defaultPeriodForCadence('fortnightly', now)
    expect(p.reportCadence).toBe('weekly')
  })

  it('quarterly: previous calendar quarter', () => {
    // April 15 2026 is in Q2 (Apr-Jun). Previous Q is Q1 = Jan-Mar 2026.
    const now = new Date(Date.UTC(2026, 3, 15))
    const p = defaultPeriodForCadence('quarterly', now)
    expect(p).toEqual({ periodStart: '2026-01-01', periodEnd: '2026-03-31', reportCadence: 'quarterly' })
  })

  it('quarterly: Q1 wraps to previous-year Q4', () => {
    const now = new Date(Date.UTC(2026, 1, 5)) // Feb 2026 → Q1 → previous = 2025 Q4
    const p = defaultPeriodForCadence('quarterly', now)
    expect(p).toEqual({ periodStart: '2025-10-01', periodEnd: '2025-12-31', reportCadence: 'quarterly' })
  })

  it('annually maps to quarterly cadence', () => {
    const now = new Date(Date.UTC(2026, 3, 29))
    const p = defaultPeriodForCadence('annually', now)
    expect(p.reportCadence).toBe('quarterly')
  })
})
