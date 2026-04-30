import { NextResponse, after } from 'next/server'
import { handleWebhookPayload, type ScWebhookPayload } from '@/lib/reporting/ingestion/webhook_handler'
import { processInspection } from '@/lib/reporting/ingestion/process_inspection'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: Request) {
  // Open question #1 (signature verification): Safety Culture's webhook system
  // does not provide HMAC payload signing. The webhook URL itself is the secret —
  // treat it as bearer-token-equivalent (do not log or share). The route is
  // registered with SC by Peter as part of E18's cutover, not E17.

  let payload: ScWebhookPayload
  try {
    payload = (await req.json()) as ScWebhookPayload
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const result = handleWebhookPayload(payload)

  // Open question #2 (retry policy): if processInspection fails, log and rely
  // on SC's re-send on the next inspection.updated event. No queue retry for v1.
  if (result.body.action === 'processing') {
    const auditId = result.body.auditId
    after(async () => {
      try {
        const processed = await processInspection(auditId)
        if (processed.error) {
          console.error(`[webhook] async processInspection error for ${auditId}: ${processed.error}`)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[webhook] async processInspection threw for ${auditId}: ${message}`)
      }
    })
  }

  return NextResponse.json(result.body, { status: result.statusCode })
}
