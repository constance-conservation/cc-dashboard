import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateReport } from '@/lib/reporting/generation'
import {
  cadenceFromFrequency,
  defaultPeriodForCadence,
  isClientDueForGeneration,
  type ExtendedCadence,
} from '@/lib/reporting/generation/scheduling'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

type Summary = {
  considered: number
  generated: Array<{ clientId: string; clientReportId: string; cadence: ExtendedCadence }>
  skipped: Array<{ clientId: string; reason: string }>
  failed: Array<{ clientId: string; error: string }>
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const db = createAdminClient()
  const summary: Summary = { considered: 0, generated: [], skipped: [], failed: [] }
  const now = new Date()

  const { data: clients, error } = await db
    .from('clients')
    .select('id, name, report_frequency')
    .not('report_frequency', 'is', null)
  if (error) {
    return NextResponse.json({ ok: false, error: `client lookup failed: ${error.message}` }, { status: 500 })
  }

  for (const c of clients || []) {
    summary.considered += 1
    const cadence = cadenceFromFrequency(c.report_frequency)
    if (!cadence) {
      summary.skipped.push({ clientId: c.id, reason: `unknown frequency: ${c.report_frequency}` })
      continue
    }
    const { data: latest } = await db
      .from('client_reports')
      .select('generated_at')
      .eq('client_id', c.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const due = isClientDueForGeneration({
      cadence,
      lastGeneratedAt: latest?.generated_at || null,
      now,
    })
    if (!due) {
      summary.skipped.push({ clientId: c.id, reason: 'not due' })
      continue
    }

    const period = defaultPeriodForCadence(cadence, now)
    try {
      const result = await generateReport({
        clientId: c.id,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        cadence: period.reportCadence,
        writeDb: true,
      }, db)
      if (result.clientReportId) {
        summary.generated.push({ clientId: c.id, clientReportId: result.clientReportId, cadence })
      } else {
        summary.failed.push({ clientId: c.id, error: 'no clientReportId returned' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`generate-reports cron: client ${c.id} (${c.name}) failed:`, msg)
      summary.failed.push({ clientId: c.id, error: msg })
    }
  }

  return NextResponse.json({ ok: true, summary })
}
