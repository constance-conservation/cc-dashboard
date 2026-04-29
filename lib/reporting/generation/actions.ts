'use server'

import { revalidatePath } from 'next/cache'
import { generateReport } from './index'
import { defaultPeriodForCadence, cadenceFromFrequency, type ExtendedCadence } from './scheduling'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Cadence } from './types'

export type GenerateResult =
  | { ok: true; clientReportId: string; htmlSize: number; docxBytes: number }
  | { ok: false; error: string }

type Period = { start: string; end: string; cadence: Cadence }

async function resolveDefaultPeriod(clientId: string): Promise<Period> {
  const db = createAdminClient()
  const { data } = await db
    .from('clients')
    .select('report_frequency')
    .eq('id', clientId)
    .maybeSingle()
  const ext: ExtendedCadence = cadenceFromFrequency(data?.report_frequency) ?? 'monthly'
  const p = defaultPeriodForCadence(ext, new Date())
  return { start: p.periodStart, end: p.periodEnd, cadence: p.reportCadence }
}

async function clientIdForSite(siteId: string): Promise<string> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('sites')
    .select('id, client_id, parent_site_id')
    .eq('id', siteId)
    .single()
  if (error || !data) throw new Error(`Site ${siteId} not found`)
  if (data.client_id) return data.client_id
  if (data.parent_site_id) {
    const { data: parent } = await db
      .from('sites')
      .select('client_id')
      .eq('id', data.parent_site_id)
      .single()
    if (parent?.client_id) return parent.client_id
  }
  throw new Error(`Site ${siteId} has no associated client`)
}

async function runGenerate(scope: 'client' | 'site' | 'zone', id: string, period: Period): Promise<GenerateResult> {
  try {
    const result = await generateReport({
      ...(scope === 'client' ? { clientId: id } : scope === 'site' ? { siteId: id } : { zoneId: id }),
      periodStart: period.start,
      periodEnd: period.end,
      cadence: period.cadence,
      writeDb: true,
    })
    if (!result.clientReportId) {
      return { ok: false, error: 'Report generated but client_reports row was not written' }
    }
    revalidatePath('/reporting/reports')
    revalidatePath(`/reporting/reports/${result.clientReportId}`)
    return {
      ok: true,
      clientReportId: result.clientReportId,
      htmlSize: result.html.length,
      docxBytes: result.docxBuffer.length,
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { ok: false, error }
  }
}

export async function generateClientReport(clientId: string, period?: Period): Promise<GenerateResult> {
  const p = period ?? await resolveDefaultPeriod(clientId)
  return runGenerate('client', clientId, p)
}

export async function generateSiteReport(siteId: string, period?: Period): Promise<GenerateResult> {
  const p = period ?? await resolveDefaultPeriod(await clientIdForSite(siteId))
  return runGenerate('site', siteId, p)
}

export async function generateZoneReport(zoneId: string, period?: Period): Promise<GenerateResult> {
  const p = period ?? await resolveDefaultPeriod(await clientIdForSite(zoneId))
  return runGenerate('zone', zoneId, p)
}
