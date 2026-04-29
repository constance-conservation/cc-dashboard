/**
 * Webhook handler core for Safety Culture events.
 *
 * Pure router — given a parsed payload, returns the HTTP status + body
 * that the route handler should respond with, plus an indication of whether
 * the route should fire async processing for this audit_id. The route
 * handler is responsible for invoking processInspection via after()/waitUntil
 * (the standalone called processInspection itself; the Vercel route does it
 * outside this module so the response can return promptly).
 */

// ── SC webhook payload shape ─────────────────────────────────────────

export interface ScWebhookPayload {
  /** Event type, e.g. "inspection.completed", "inspection.updated" */
  event?: string
  /** Alternative: event in a header object */
  header?: { event?: string }
  /** The audit ID — may appear as audit_id or inspection_id */
  audit_id?: string
  inspection_id?: string
  /** Organization */
  organisation_id?: string
  organization_id?: string
  /** When the event was triggered */
  triggered_at?: string
}

// ── Event filtering ──────────────────────────────────────────────────

/** Events we process. Everything else is acknowledged but ignored. */
const PROCESSABLE_EVENTS = new Set([
  'inspection.completed',
  'inspection.updated',
  // SC API may also use underscore-delimited event names
  'inspection_completed',
  'inspection_modified',
])

function normalizeEventName(raw: string): string {
  return raw.trim().toLowerCase()
}

function isProcessableEvent(event: string): boolean {
  return PROCESSABLE_EVENTS.has(normalizeEventName(event))
}

function extractEventType(payload: ScWebhookPayload): string | null {
  return payload.event ?? payload.header?.event ?? null
}

function extractAuditId(payload: ScWebhookPayload): string | null {
  return payload.audit_id ?? payload.inspection_id ?? null
}

// ── Result shape ─────────────────────────────────────────────────────

export type WebhookActionBody =
  | { ok: true; action: 'processing'; auditId: string }
  | { ok: true; action: 'ignored'; reason: 'missing_event_type' | 'missing_audit_id' }
  | { ok: true; action: 'ignored'; reason: 'event_type_not_handled'; event: string }

export interface WebhookHandlerResult {
  statusCode: number
  body: WebhookActionBody
}

/**
 * Route a parsed webhook payload to its action.
 * Pure function — no side effects. The caller is responsible for invoking
 * processInspection (via after()/waitUntil) when the action is 'processing'.
 */
export function handleWebhookPayload(payload: ScWebhookPayload): WebhookHandlerResult {
  const eventType = extractEventType(payload)
  const auditId = extractAuditId(payload)

  console.log(`[webhook] received event=${eventType ?? '<none>'} auditId=${auditId ?? '<none>'}`)

  if (!eventType) {
    console.warn('[webhook] missing event type')
    return {
      statusCode: 200,
      body: { ok: true, action: 'ignored', reason: 'missing_event_type' },
    }
  }

  if (!isProcessableEvent(eventType)) {
    console.log(`[webhook] ignoring non-processable event: ${eventType}`)
    return {
      statusCode: 200,
      body: { ok: true, action: 'ignored', reason: 'event_type_not_handled', event: eventType },
    }
  }

  if (!auditId) {
    console.warn(`[webhook] processable event ${eventType} missing audit_id`)
    return {
      statusCode: 200,
      body: { ok: true, action: 'ignored', reason: 'missing_audit_id' },
    }
  }

  return {
    statusCode: 200,
    body: { ok: true, action: 'processing', auditId },
  }
}
