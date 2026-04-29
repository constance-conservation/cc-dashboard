'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const VALID_FREQUENCIES = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'annually'] as const
export type ClientReportFrequency = typeof VALID_FREQUENCIES[number]

export type SetCadenceResult =
  | { ok: true }
  | { ok: false; error: string }

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
