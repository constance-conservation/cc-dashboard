/**
 * Reporting ingestion barrel.
 *
 * Required env vars at runtime:
 *   - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Supabase admin client)
 *   - SAFETY_CULTURE_API_TOKEN (sync + webhook async processing — must be set
 *     in the Vercel project for preview/production deploys)
 *   - SC_API_BASE_URL (optional — defaults to https://api.safetyculture.io)
 *   - CRON_SECRET (existing from E16; required by the sync cron route only)
 *
 * The organization id is resolved at runtime from the `organizations` table
 * (single-tenant). No DEFAULT_ORGANIZATION_ID env var is needed.
 *
 * Backfill is intentionally NOT supported. Historical data is already in
 * Supabase from the standalone's run since project inception. If a one-shot
 * full re-backfill is ever needed, run the standalone's `npm run sync:backfill`
 * from the local clone at ~/Desktop/constance-reporting/.
 */

export { runSync, type SyncRunResult } from './scheduled_sync'
export { processInspection, getDefaultOrganizationId, type ProcessResult } from './process_inspection'
export {
  handleWebhookPayload,
  type ScWebhookPayload,
  type WebhookHandlerResult,
  type WebhookActionBody,
} from './webhook_handler'
export { ScApiClient, ScApiError, type FeedInspectionEntry, type FeedResponse } from './sc_api_client'
export { writeInspection, type WriteResult } from './writer'
export { parseInspection } from './parser'
export type { ExtractionResult } from './parser/types'
