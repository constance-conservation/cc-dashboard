'use client'

import { useEffect } from 'react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: '12vh',
  zIndex: 1000,
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-elev)',
  border: '1px solid var(--line)',
  borderRadius: 6,
  width: 'min(440px, 92vw)',
  boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
}

const headStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--line)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}

const titleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--ink)',
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const closeStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--ink-3)',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
  padding: 4,
}

export function Modal({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div style={cardStyle} role="dialog" aria-modal="true" aria-label={title}>
        <div style={headStyle}>
          <span style={titleStyle}>{title}</span>
          <button type="button" onClick={onClose} style={closeStyle} aria-label="Close">
            ×
          </button>
        </div>
        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  )
}
