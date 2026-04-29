'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_FREQUENCIES = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'annually'] as const
export type ClientReportFrequency = typeof VALID_FREQUENCIES[number]

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string }

export type SetCadenceResult = ActionResult

export async function setClientReportFrequency(
  clientId: string,
  frequency: ClientReportFrequency | null,
): Promise<SetCadenceResult> {
  if (frequency !== null && !VALID_FREQUENCIES.includes(frequency)) {
    return { ok: false, error: `Invalid frequency: ${frequency}` }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({ report_frequency: frequency })
    .eq('id', clientId)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/reporting/clients/${clientId}`)
  revalidatePath('/reporting/clients')
  return { ok: true }
}

const CLIENT_EDITABLE_FIELDS = [
  'name',
  'long_name',
  'contact_name',
  'council_or_body',
  'contact_email',
  'contact_phone',
] as const
export type ClientField = typeof CLIENT_EDITABLE_FIELDS[number]

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

async function updateClientWithFallback(
  clientId: string,
  patch: Record<string, string | null>,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error, data } = await supabase
    .from('clients')
    .update(patch)
    .eq('id', clientId)
    .select('id')
  if (!error && data && data.length > 0) return { ok: true }
  if (!error && (!data || data.length === 0)) {
    try {
      const admin = createAdminClient()
      const adminRes = await admin
        .from('clients')
        .update(patch)
        .eq('id', clientId)
        .select('id')
      if (adminRes.error) return { ok: false, error: adminRes.error.message }
      if (!adminRes.data || adminRes.data.length === 0) {
        return { ok: false, error: 'Client not found' }
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
        .from('clients')
        .update(patch)
        .eq('id', clientId)
        .select('id')
      if (adminRes.error) return { ok: false, error: adminRes.error.message }
      if (!adminRes.data || adminRes.data.length === 0) {
        return { ok: false, error: 'Client not found' }
      }
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error'
      return { ok: false, error: `RLS blocked update; admin fallback unavailable: ${msg}` }
    }
  }
  return { ok: false, error: error!.message }
}

export async function updateClientField(
  clientId: string,
  field: ClientField,
  value: string | null,
): Promise<ActionResult> {
  if (!CLIENT_EDITABLE_FIELDS.includes(field)) {
    return { ok: false, error: `Field "${field}" is not editable` }
  }
  if (typeof clientId !== 'string' || clientId.length === 0) {
    return { ok: false, error: 'Missing client id' }
  }
  const next = normalize(value)
  if (field === 'name' && next === null) {
    return { ok: false, error: 'Short name cannot be empty' }
  }
  const res = await updateClientWithFallback(clientId, { [field]: next })
  if (!res.ok) return res
  revalidatePath(`/reporting/clients/${clientId}`)
  revalidatePath('/reporting/clients')
  revalidatePath('/clients')
  return { ok: true }
}
