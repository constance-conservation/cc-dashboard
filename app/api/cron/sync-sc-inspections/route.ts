import { NextResponse } from 'next/server'
import { runSync } from '@/lib/reporting/ingestion/scheduled_sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET not configured' },
      { status: 500 }
    )
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  try {
    const summary = await runSync()
    return NextResponse.json({ ok: true, summary })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`sync-sc-inspections cron failed: ${error}`)
    return NextResponse.json({ ok: false, error }, { status: 500 })
  }
}
