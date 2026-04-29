import { BACKFILL_TARGET } from '@/lib/reporting/types'

export function BackfillAlert({ total }: { total: number }) {
  if (total >= BACKFILL_TARGET) return null
  return (
    <div className="alert-bar">
      <span>⚠</span> Backfill in progress —{' '}
      <strong>{total.toLocaleString()}</strong> of ~{BACKFILL_TARGET.toLocaleString()} inspections processed
    </div>
  )
}
