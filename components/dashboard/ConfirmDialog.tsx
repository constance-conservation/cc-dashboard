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
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'grid', placeItems: 'center',
        background: 'rgba(10, 12, 10, 0.55)',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
      } as React.CSSProperties}
      onClick={onCancel}
    >
      <div
        style={{
          width: 420,
          maxWidth: 'calc(100vw - 32px)',
          padding: '30px 30px 26px',
          borderRadius: 20,
          background: 'rgba(252, 253, 252, 0.82)',
          backdropFilter: 'blur(60px) saturate(200%) brightness(1.06)',
          WebkitBackdropFilter: 'blur(60px) saturate(200%) brightness(1.06)',
          border: '1px solid rgba(255,255,255,0.72)',
          boxShadow: [
            '0 0 0 0.5px rgba(0,0,0,0.08)',
            '0 4px 6px rgba(0,0,0,0.04)',
            '0 12px 40px rgba(0,0,0,0.22)',
            'inset 0 1px 0 rgba(255,255,255,0.95)',
            'inset 0 -1px 0 rgba(0,0,0,0.04)',
          ].join(', '),
        } as React.CSSProperties}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 21,
          margin: '0 0 10px',
          letterSpacing: '-0.018em',
          color: 'rgba(10,15,10,0.92)',
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: 13.5,
          color: 'rgba(10,15,10,0.62)',
          margin: '0 0 26px',
          lineHeight: 1.6,
        }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            className="btn"
            onClick={onCancel}
            style={{
              background: 'rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.1)',
              color: 'rgba(10,15,10,0.75)',
            }}
          >
            Cancel
          </button>
          <button
            className="btn primary"
            onClick={onConfirm}
            style={danger ? {
              background: 'linear-gradient(160deg, #c0392b 0%, #a93226 100%)',
              borderColor: 'transparent',
              boxShadow: '0 1px 3px rgba(169,50,38,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
            } : {
              boxShadow: '0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
