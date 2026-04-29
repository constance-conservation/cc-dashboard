'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SITE_EDITABLE_FIELDS = ['name', 'long_name', 'site_type', 'project_code'] as const
export type SiteField = typeof SITE_EDITABLE_FIELDS[number]

const SCHEDULE_CADENCES = [
  'off',
  'weekly',
  'fortnightly',
  'monthly',
  'quarterly',
  'annually',
] as const
export type ScheduleCadence = typeof SCHEDULE_CADENCES[number]

export type ScheduleConfig = {
  cadence: ScheduleCadence
}

export type ActionResult = { ok: true } | { ok: false; error: string }

function normalize(value: string | null): string | null {
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

function isAuthRlsError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('row-level security') ||
    m.includes('row level security') ||
    m.includes('permission denied') ||
    m.includes('not authorized') ||
    m.includes('jwt') ||
    m.includes('rls')
  )
}

async function updateSiteWithFallback(
  siteId: string,
  patch: Record<string, unknown>,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error, data } = await supabase
    .from('sites')
    .update(patch)
    .eq('id', siteId)
    .select('id')
  if (!error && data && data.length > 0) return { ok: true }
  if (!error && (!data || data.length === 0)) {
    try {
      const admin = createAdminClient()
      const adminRes = await admin
        .from('sites')
        .update(patch)
        .eq('id', siteId)
        .select('id')
      if (adminRes.error) return { ok: false, error: adminRes.error.message }
      if (!adminRes.data || adminRes.data.length === 0) {
        return { ok: false, error: 'Site not found' }
      }
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error'
      return { ok: false, error: `Update blocked by RLS; admin fallback unavailable: ${msg}` }
    }
  }
  if (error && isAuthRlsError(error.message)) {
    try {
      const admin = createAdminClient()
      const adminRes = await admin
        .from('sites')
        .update(patch)
        .eq('id', siteId)
        .select('id')
      if (adminRes.error) return { ok: false, error: adminRes.error.message }
      if (!adminRes.data || adminRes.data.length === 0) {
        return { ok: false, error: 'Site not found' }
      }
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error'
      return { ok: false, error: `RLS blocked update; admin fallback unavailable: ${msg}` }
    }
  }
  return { ok: false, error: error!.message }
}

async function loadSiteContext(siteId: string): Promise<{ clientId: string | null; parentSiteId: string | null }> {
  const supabase = await createClient()
  const res = await supabase
    .from('sites')
    .select('client_id,parent_site_id')
    .eq('id', siteId)
    .maybeSingle()
  if (res.error || !res.data) return { clientId: null, parentSiteId: null }
  const row = res.data as { client_id: string | null; parent_site_id: string | null }
  return { clientId: row.client_id, parentSiteId: row.parent_site_id }
}

async function revalidateSitePaths(siteId: string): Promise<void> {
  const { clientId, parentSiteId } = await loadSiteContext(siteId)
  if (clientId) {
    revalidatePath(`/reporting/clients/${clientId}`)
    if (parentSiteId) {
      revalidatePath(`/reporting/clients/${clientId}/sites/${parentSiteId}`)
    } else {
      revalidatePath(`/reporting/clients/${clientId}/sites/${siteId}`)
    }
  }
  revalidatePath('/reporting/sites')
}

export async function updateSiteField(
  siteId: string,
  field: SiteField,
  value: string | null,
): Promise<ActionResult> {
  if (!SITE_EDITABLE_FIELDS.includes(field)) {
    return { ok: false, error: `Field "${field}" is not editable` }
  }
  if (typeof siteId !== 'string' || siteId.length === 0) {
    return { ok: false, error: 'Missing site id' }
  }
  const next = normalize(value)
  if (field === 'name' && next === null) {
    return { ok: false, error: 'Name cannot be empty' }
  }
  const res = await updateSiteWithFallback(siteId, { [field]: next })
  if (!res.ok) return res
  await revalidateSitePaths(siteId)
  return { ok: true }
}

export async function updateSiteSchedule(
  siteId: string,
  schedule: ScheduleConfig,
): Promise<ActionResult> {
  if (typeof siteId !== 'string' || siteId.length === 0) {
    return { ok: false, error: 'Missing site id' }
  }
  if (!SCHEDULE_CADENCES.includes(schedule.cadence)) {
    return { ok: false, error: `Invalid cadence: ${schedule.cadence}` }
  }
  const res = await updateSiteWithFallback(siteId, {
    schedule_config: { cadence: schedule.cadence },
  })
  if (!res.ok) return res
  await revalidateSitePaths(siteId)
  return { ok: true }
}
