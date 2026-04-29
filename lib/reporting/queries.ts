import { createClient } from '@/lib/supabase/server'
import type { LandingDashboardData, StatusCounts, LabelValue } from './types'

const TOP_N = 8

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = (r[key] as string | null) ?? 'unknown'
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

function topN(counts: Record<string, number>, n = TOP_N): LabelValue[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, value]) => ({ label, value }))
}

export async function getLandingDashboardData(): Promise<LandingDashboardData> {
  const supabase = await createClient()

  const [
    inspectionsRes,
    sitesRes,
    mediaRes,
    tasksRes,
    weedsRes,
    personnelRes,
  ] = await Promise.all([
    supabase
      .from('inspections')
      .select('processing_status')
      .order('date', { ascending: false, nullsFirst: false })
      .limit(2000),
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('inspection_media')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('inspection_tasks')
      .select('task_type')
      .limit(5000),
    supabase
      .from('inspection_weeds')
      .select('species_name_raw')
      .limit(5000),
    supabase
      .from('inspection_personnel')
      .select('hours_worked, staff(name)')
      .limit(5000),
  ])

  for (const r of [inspectionsRes, tasksRes, weedsRes, personnelRes]) {
    if (r.error) throw new Error(`Supabase query failed: ${r.error.message}`)
  }
  if (sitesRes.error) throw new Error(`sites count failed: ${sitesRes.error.message}`)
  if (mediaRes.error) throw new Error(`media count failed: ${mediaRes.error.message}`)

  const inspections = inspectionsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const weeds = weedsRes.data ?? []
  const personnel = personnelRes.data ?? []

  const statusCounts = countBy(inspections, 'processing_status') as StatusCounts

  const topTasks = topN(countBy(tasks, 'task_type'))
  const topWeeds = topN(countBy(weeds, 'species_name_raw'))

  const hoursByStaff: Record<string, number> = {}
  for (const p of personnel as { hours_worked: number | string | null; staff: { name?: string } | { name?: string }[] | null }[]) {
    const staffRow = Array.isArray(p.staff) ? p.staff[0] : p.staff
    const name = staffRow?.name ?? 'Unknown'
    const h = typeof p.hours_worked === 'number'
      ? p.hours_worked
      : parseFloat(p.hours_worked ?? '') || 0
    hoursByStaff[name] = (hoursByStaff[name] ?? 0) + h
  }
  const topStaffHours: LabelValue[] = Object.entries(hoursByStaff)
    .filter(([, h]) => h > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([label, value]) => ({ label, value: Math.round(value) }))

  return {
    totalInspections: inspections.length,
    statusCounts,
    sitesTracked: sitesRes.count ?? 0,
    photosCount: mediaRes.count ?? 0,
    topTasks,
    topWeeds,
    topStaffHours,
    generatedAt: new Date().toISOString(),
  }
}
