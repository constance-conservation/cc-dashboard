import type { Cadence } from './types'

export type ExtendedCadence = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually'

export function cadenceFromFrequency(freq: string | null | undefined): ExtendedCadence | null {
  if (!freq) return null
  const f = freq.toLowerCase().trim()
  if (f === 'off' || f === 'none' || f === '') return null
  if (f === 'weekly' || f === 'fortnightly' || f === 'monthly' || f === 'quarterly' || f === 'annually') return f
  return null
}

export function reportCadenceFromExtended(c: ExtendedCadence): Cadence {
  if (c === 'weekly' || c === 'fortnightly') return 'weekly'
  if (c === 'monthly') return 'monthly'
  return 'quarterly'
}

const DAY_MS = 24 * 60 * 60 * 1000
const CADENCE_INTERVAL_MS: Record<ExtendedCadence, number> = {
  weekly: 7 * DAY_MS,
  fortnightly: 14 * DAY_MS,
  monthly: 30 * DAY_MS,
  quarterly: 91 * DAY_MS,
  annually: 365 * DAY_MS,
}

export function isClientDueForGeneration(args: {
  cadence: ExtendedCadence
  lastGeneratedAt: string | null
  now: Date
}): boolean {
  const { cadence, lastGeneratedAt, now } = args
  if (!lastGeneratedAt) return true
  const last = new Date(lastGeneratedAt).getTime()
  if (Number.isNaN(last)) return true
  const interval = CADENCE_INTERVAL_MS[cadence]
  return now.getTime() - last >= interval
}

export function defaultPeriodForCadence(cadence: ExtendedCadence, now: Date): {
  periodStart: string
  periodEnd: string
  reportCadence: Cadence
} {
  const reportCadence = reportCadenceFromExtended(cadence)
  if (reportCadence === 'monthly') {
    const y = now.getUTCFullYear()
    const m = now.getUTCMonth()
    const prevYear = m === 0 ? y - 1 : y
    const prevMonth = m === 0 ? 12 : m
    const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate()
    const mm = String(prevMonth).padStart(2, '0')
    return {
      periodStart: `${prevYear}-${mm}-01`,
      periodEnd: `${prevYear}-${mm}-${String(lastDay).padStart(2, '0')}`,
      reportCadence,
    }
  }
  if (reportCadence === 'weekly') {
    const day = now.getUTCDay()
    const diffToMonday = (day + 6) % 7
    const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday))
    const prevMonday = new Date(thisMonday.getTime() - 7 * DAY_MS)
    const prevSunday = new Date(thisMonday.getTime() - 1 * DAY_MS)
    return {
      periodStart: prevMonday.toISOString().slice(0, 10),
      periodEnd: prevSunday.toISOString().slice(0, 10),
      reportCadence,
    }
  }
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const currentQ = Math.floor(m / 3)
  const prevQ = currentQ === 0 ? 3 : currentQ - 1
  const prevQYear = currentQ === 0 ? y - 1 : y
  const startMonth = prevQ * 3
  const endMonth = startMonth + 2
  const startMm = String(startMonth + 1).padStart(2, '0')
  const endLastDay = new Date(Date.UTC(prevQYear, endMonth + 1, 0)).getUTCDate()
  const endMm = String(endMonth + 1).padStart(2, '0')
  return {
    periodStart: `${prevQYear}-${startMm}-01`,
    periodEnd: `${prevQYear}-${endMm}-${String(endLastDay).padStart(2, '0')}`,
    reportCadence,
  }
}
