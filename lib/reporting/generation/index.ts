/**
 * Top-level report generation entrypoint.
 *
 * Required env vars at runtime:
 *   - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Supabase admin client)
 *   - ANTHROPIC_API_KEY (optional — when missing, narratives module returns
 *     placeholder bullets, matching the standalone's --skip-llm behaviour)
 *
 * Storage:
 *   - DOCX files are uploaded to the `reports` bucket (private). The bucket is
 *     created on first generation if missing. `client_reports.docx_url` stores
 *     a 1-year signed URL so the existing E10/E10b UI can render it as a
 *     direct <a href download> link without needing query-layer changes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ReportOptions, GeneratedReport, ReportData, NarrativeSections } from './types'
import { aggregate, type AggregateScope } from './aggregate'
import { generateNarratives } from './narratives'
import { renderHtml } from './render_html'
import { renderDocx } from './render_docx'
import { inferPeriodLabels } from './period'
import { extractZoneLetters } from './zones'
import { createAdminClient } from '@/lib/supabase/admin'

const STORAGE_BUCKET = 'reports'
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365

export function resolveScopeFromOptions(opts: ReportOptions): AggregateScope {
  const provided = [
    opts.zoneId ? 'zoneId' : null,
    opts.siteId ? 'siteId' : null,
    opts.clientId ? 'clientId' : null,
  ].filter(Boolean) as string[]
  if (provided.length === 0) {
    throw new Error('Report scope required: provide one of clientId, siteId, or zoneId.')
  }
  if (provided.length > 1) {
    throw new Error(`Report scope must be exactly one of clientId|siteId|zoneId (got ${provided.join(', ')}).`)
  }
  if (opts.zoneId) return { kind: 'zone', zoneId: opts.zoneId }
  if (opts.siteId) return { kind: 'site', siteId: opts.siteId }
  return { kind: 'client', clientId: opts.clientId! }
}

export async function generateReport(
  opts: ReportOptions,
  db?: SupabaseClient,
): Promise<GeneratedReport> {
  const client = db ?? createAdminClient()

  const scope = resolveScopeFromOptions(opts)
  const { label: periodLabel, filenameLabel: periodFilenameLabel } = inferPeriodLabels(opts.periodStart, opts.periodEnd, opts.cadence)

  const data = await aggregate(client, {
    scope,
    periodStart: opts.periodStart,
    periodEnd: opts.periodEnd,
    cadence: opts.cadence,
    periodLabel,
    periodFilenameLabel,
  })

  const narratives = await generateNarratives(data, { skipLLM: opts.skipLLM })

  const html = renderHtml(data, narratives)
  const docxBuffer = await renderDocx(data, narratives)

  const baseName = reportFilenameBase(data)
  const objectPath = `${data.client.id}/${baseName}.docx`
  const docxUrl = await uploadDocx(client, objectPath, docxBuffer)

  let clientReportId: string | null = null
  if (opts.writeDb !== false) {
    clientReportId = await upsertClientReport(client, data, narratives, html, docxUrl)
  }

  return {
    clientReportId,
    html,
    docxBuffer,
    docxUrl,
    data,
    narratives,
  }
}

function reportFilenameBase(data: ReportData): string {
  const longName: string = data.client.long_name || data.client.name
  const clientPart = longName.replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_') || 'Client'
  const zonesPart = (data.zonesLabel || '').replace(/\s+/g, '_')
  const cadencePretty = data.cadence === 'monthly' ? 'Monthly' : data.cadence === 'weekly' ? 'Weekly' : 'Quarterly'
  const parts = [clientPart]
  if (zonesPart) parts.push(zonesPart)
  parts.push(data.periodFilenameLabel, `${cadencePretty}_Report`)
  return parts.join('_')
}

async function uploadDocx(db: SupabaseClient, objectPath: string, buffer: Buffer): Promise<string> {
  await ensureBucket(db)
  const { error: upErr } = await db.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    })
  if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`)
  const { data: signed, error: sErr } = await db.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS)
  if (sErr || !signed?.signedUrl) {
    throw new Error(`Signed URL creation failed: ${sErr?.message || 'no url returned'}`)
  }
  return signed.signedUrl
}

async function ensureBucket(db: SupabaseClient): Promise<void> {
  const { data: bucket } = await db.storage.getBucket(STORAGE_BUCKET)
  if (bucket) return
  const { error } = await db.storage.createBucket(STORAGE_BUCKET, { public: false })
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Storage bucket create failed: ${error.message}`)
  }
}

async function upsertClientReport(
  db: SupabaseClient,
  data: ReportData,
  narratives: NarrativeSections,
  html: string,
  docxUrl: string,
): Promise<string> {
  const payload = {
    organization_id: data.organization.id,
    client_id: data.client.id,
    site_id: data.scopeSiteId ?? data.sites[0]?.id ?? null,
    report_period_start: data.periodStart,
    report_period_end: data.periodEnd,
    title: data.titleLine,
    author_name: data.supervisor?.name || null,
    addressed_to: data.addressedTo,
    status: 'draft',
    cadence: data.cadence,
    html_content: html,
    narrative_sections: {
      outline_of_works: narratives.outlineOfWorks,
      bird_sightings: narratives.birdSightings,
      incidents: narratives.incidents,
      fauna_sightings: narratives.faunaSightings,
    },
    zones_included: data.zonesIncluded.flatMap(z => extractZoneLetters(z)),
    docx_url: docxUrl,
    generated_at: new Date().toISOString(),
  }

  const existingQuery = db
    .from('client_reports')
    .select('id')
    .eq('client_id', data.client.id)
    .eq('report_period_start', data.periodStart)
    .eq('report_period_end', data.periodEnd)
  const { data: existing } = payload.site_id
    ? await existingQuery.eq('site_id', payload.site_id).maybeSingle()
    : await existingQuery.is('site_id', null).maybeSingle()

  if (existing?.id) {
    const { error } = await db.from('client_reports').update(payload).eq('id', existing.id)
    if (error) throw new Error(`client_reports update failed: ${error.message}`)
    return existing.id
  }
  const { data: inserted, error } = await db.from('client_reports').insert(payload).select('id').single()
  if (error || !inserted) throw new Error(`client_reports insert failed: ${error?.message}`)
  return inserted.id
}

export type { ReportOptions, GeneratedReport, ReportData, NarrativeSections } from './types'
export { upsertClientReport }
