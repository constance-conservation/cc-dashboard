/**
 * Scheduled sync — polls GET /feed/inspections for new or modified inspections.
 *
 * Always incremental: reads the high-water mark from `sync_state` and passes
 * it as `modified_after`. Backfill paths from the standalone are intentionally
 * stripped — historical data is already in Supabase from the standalone's run
 * since project inception. If a one-shot full re-backfill is ever needed, run
 * the standalone's `npm run sync:backfill` from the local clone.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { ScApiClient, type FeedInspectionEntry } from './sc_api_client'
import { parseInspection } from './parser'
import { writeInspection, type WriteResult } from './writer'
import { getDefaultOrganizationId } from './process_inspection'

interface SyncState {
  id: string
  last_sync_at: string | null
  high_water_mark: string | null
  last_cursor: string | null
  total_synced: number
  last_error: string | null
}

export interface SyncRunResult {
  processed: number
  skipped: number
  failed: number
  errors: { auditId: string; error: string }[]
}

// ── Sync state persistence ────────────────────────────────────────────

async function getSyncState(db: SupabaseClient): Promise<SyncState> {
  const { data, error } = await db
    .from('sync_state')
    .select('*')
    .eq('sync_type', 'scheduled_feed')
    .single()

  if (error) {
    throw new Error(`Failed to read sync_state: ${error.message}`)
  }

  return data as SyncState
}

async function updateSyncState(
  db: SupabaseClient,
  id: string,
  updates: Partial<Pick<SyncState, 'high_water_mark' | 'last_sync_at' | 'total_synced' | 'last_error' | 'last_cursor'>>
): Promise<void> {
  const { error } = await db
    .from('sync_state')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error(`[scheduled-sync] failed to update sync_state: ${error.message}`)
  }
}

// ── Dedup check ───────────────────────────────────────────────────────

async function isUnchanged(
  db: SupabaseClient,
  scAuditId: string,
  scModifiedAt: string
): Promise<boolean> {
  const { data, error } = await db
    .from('inspections')
    .select('sc_modified_at')
    .eq('sc_audit_id', scAuditId)
    .maybeSingle()

  if (error) {
    console.warn(`[scheduled-sync] dedup check failed for ${scAuditId}, will reprocess: ${error.message}`)
    return false
  }

  if (!data) {
    return false
  }

  return data.sc_modified_at === scModifiedAt
}

// ── Process a single inspection ───────────────────────────────────────

async function processFeedEntry(
  db: SupabaseClient,
  client: ScApiClient,
  entry: FeedInspectionEntry,
  organizationId: string
): Promise<WriteResult | null> {
  const { id: audit_id, modified_at } = entry

  if (entry.archived) {
    return null
  }

  if (await isUnchanged(db, audit_id, modified_at)) {
    return null
  }

  console.log(`[scheduled-sync] processing inspection ${audit_id} (modified_at=${modified_at})`)

  const auditJson = await client.fetchAudit(audit_id)
  const extraction = parseInspection(auditJson)
  const result = await writeInspection(extraction, organizationId, db)

  console.log(`[scheduled-sync] processed ${audit_id}: status=${result.status} inspectionId=${result.inspectionId}`)

  return result
}

// ── markFailed helper ─────────────────────────────────────────────────

async function markFailed(
  db: SupabaseClient,
  scAuditId: string,
  organizationId: string
): Promise<void> {
  await db
    .from('inspections')
    .upsert(
      {
        sc_audit_id: scAuditId,
        sc_template_type: 'daily_work_report',
        organization_id: organizationId,
        processing_status: 'failed',
      },
      { onConflict: 'sc_audit_id' }
    )
}

// ── Main sync loop ────────────────────────────────────────────────────

/**
 * Run one incremental sync pass.
 *
 * Reads the high-water mark from `sync_state`, fetches feed pages newer than
 * that timestamp, and processes each entry (skipping archived/unchanged).
 * Updates `sync_state.high_water_mark` to the latest `modified_at` seen.
 *
 * @param db - Optional Supabase client (defaults to createAdminClient())
 * @param scClient - Optional SC API client (defaults to one built from env)
 */
export async function runSync(
  db?: SupabaseClient,
  scClient?: ScApiClient,
): Promise<SyncRunResult> {
  const supabase = db ?? createAdminClient()
  const result: SyncRunResult = {
    processed: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  const syncState = await getSyncState(supabase)
  console.log(
    `[scheduled-sync] starting: highWaterMark=${syncState.high_water_mark ?? '<none>'} totalSynced=${syncState.total_synced}`
  )

  const modifiedAfter = syncState.high_water_mark ?? undefined

  const client = scClient ?? (() => {
    const apiToken = process.env.SAFETY_CULTURE_API_TOKEN
    if (!apiToken) {
      throw new Error('SAFETY_CULTURE_API_TOKEN is not set')
    }
    return new ScApiClient({
      apiToken,
      baseUrl: process.env.SC_API_BASE_URL,
    })
  })()

  const organizationId = await getDefaultOrganizationId(supabase)

  let newHighWaterMark = syncState.high_water_mark

  try {
    for await (const entries of client.fetchAllFeedPages(modifiedAfter)) {
      for (const entry of entries) {
        try {
          const writeResult = await processFeedEntry(supabase, client, entry, organizationId)

          if (writeResult === null) {
            result.skipped++
          } else if (writeResult.status === 'failed') {
            result.failed++
            result.errors.push({
              auditId: entry.id,
              error: writeResult.error ?? 'Unknown error',
            })
          } else {
            result.processed++
          }

          if (!newHighWaterMark || entry.modified_at > newHighWaterMark) {
            newHighWaterMark = entry.modified_at
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err)
          console.error(`[scheduled-sync] failed to process ${entry.id}: ${errorMessage}`)
          result.failed++
          result.errors.push({
            auditId: entry.id,
            error: errorMessage,
          })

          try {
            await markFailed(supabase, entry.id, organizationId)
          } catch {
            // Best-effort
          }
        }
      }
    }

    await updateSyncState(supabase, syncState.id, {
      high_water_mark: newHighWaterMark,
      last_sync_at: new Date().toISOString(),
      total_synced: syncState.total_synced + result.processed,
      last_error: null,
    })

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`[scheduled-sync] sync run failed: ${errorMessage}`)

    await updateSyncState(supabase, syncState.id, {
      high_water_mark: newHighWaterMark,
      last_error: errorMessage,
    })

    throw err
  }

  console.log(
    `[scheduled-sync] complete: processed=${result.processed} skipped=${result.skipped} failed=${result.failed}`
  )

  return result
}
