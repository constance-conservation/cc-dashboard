import type { SyncState } from '@/lib/reporting/types'

function formatTimestamp(value: string | null): string {
  if (!value) return 'Never'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

export function SyncStateInfo({ state }: { state: SyncState | null }) {
  if (!state) {
    return (
      <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
        No sync state recorded yet.
      </div>
    )
  }

  const cells: { label: string; value: string }[] = [
    { label: 'Last Sync', value: formatTimestamp(state.lastSyncAt) },
    { label: 'High Water Mark', value: formatTimestamp(state.highWaterMark) },
    { label: 'Total Synced', value: state.totalSynced.toLocaleString() },
  ]

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 20,
        }}
      >
        {cells.map(c => (
          <div key={c.label}>
            <div className="kpi-label">{c.label}</div>
            <div style={{ fontSize: 14, fontWeight: 500 }} className="mono">
              {c.value}
            </div>
          </div>
        ))}
      </div>
      {state.lastError && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            background: 'var(--danger-bg, rgba(220, 80, 60, 0.08))',
            borderRadius: 6,
            fontSize: 12,
            color: 'var(--danger)',
          }}
        >
          {state.lastError}
        </div>
      )}
    </div>
  )
}
