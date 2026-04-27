'use client'

type ConfirmDialogProps = {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      onClick={onCancel}
    >
      <div
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '28px 28px 24px', width: 380, maxWidth: 'calc(100vw - 32px)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, margin: '0 0 10px', letterSpacing: '-0.015em' }}>{title}</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 24px', lineHeight: 1.55 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button
            className="btn primary"
            onClick={onConfirm}
            style={danger ? { background: 'var(--danger)', borderColor: 'var(--danger)' } : undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
