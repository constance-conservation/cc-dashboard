/**
 * Shared processing pipeline — fetch, parse, write.
 *
 * Used by both the scheduled sync (`scheduled_sync.ts`) and the webhook
 * route (`/api/webhooks/sc`). Never throws — returns error in ProcessResult.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { ScApiClient } from './sc_api_client'
import { parseInspection } from './parser'
import { writeInspection, type WriteResult } from './writer'

let _scClient: ScApiClient | null = null
let _cachedOrgId: string | null = null

function getScClient(): ScApiClient {
  if (!_scClient) {
    const apiToken = process.env.SAFETY_CULTURE_API_TOKEN
    if (!apiToken) {
      throw new Error('SAFETY_CULTURE_API_TOKEN is not set')
    }
    _scClient = new ScApiClient({
      apiToken,
      baseUrl: process.env.SC_API_BASE_URL,
    })
  }
  return _scClient
}

/**
 * Resolve the organization id from the `organizations` table.
 * Single-tenant: returns the first row. Cached for the lifetime of the
 * function instance (Fluid Compute may keep us warm across invocations).
 */
export async function getDefaultOrganizationId(db?: SupabaseClient): Promise<string> {
  if (_cachedOrgId) return _cachedOrgId
  const client = db ?? createAdminClient()
  const { data, error } = await client
    .from('organizations')
    .select('id')
    .limit(1)
    .single()
  if (error || !data) {
    throw new Error(
      `No organization found in database: ${error?.message ?? 'no row'}`
    )
  }
  _cachedOrgId = data.id as string
  return _cachedOrgId
}

export interface ProcessResult {
  auditId: string
  writeResult: WriteResult | null
  error: string | null
}

/**
 * Process a single inspection end-to-end:
 *   1. Fetch full audit JSON from SC API
 *   2. Parse with the parser
 *   3. Write to Supabase via the writer
 *
 * Never throws — returns error in ProcessResult.
 */
export async function processInspection(
  auditId: string,
  organizationId?: string,
  scClient?: ScApiClient,
  db?: SupabaseClient,
): Promise<ProcessResult> {
  try {
    const client = scClient ?? getScClient()
    const orgId = organizationId ?? (await getDefaultOrganizationId(db))

    console.log(`[pipeline] processing inspection ${auditId}`)
    const json = await client.fetchAudit(auditId)

    const extraction = parseInspection(json)
    console.log(
      `[pipeline] parsed inspection ${auditId}: template=${extraction.templateType} warnings=${extraction.parsingWarnings.length}`
    )

    const writeResult = await writeInspection(extraction, orgId, db)
    console.log(
      `[pipeline] wrote inspection ${auditId}: status=${writeResult.status} inspectionId=${writeResult.inspectionId}`
    )

    return { auditId, writeResult, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[pipeline] failed to process inspection ${auditId}: ${message}`)
    return { auditId, writeResult: null, error: message }
  }
}
