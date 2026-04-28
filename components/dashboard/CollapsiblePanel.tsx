'use client'

import { useState } from 'react'

type CollapsiblePanelProps = {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  actions?: React.ReactNode
}

function ChevronDown({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function ChevronRight({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

export function CollapsiblePanel({
  title,
  defaultOpen = true,
  children,
  actions,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(prev => !prev)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(prev => !prev) } }}
        style={{
          background: 'var(--bg-sunken)',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          gap: 6,
        }}
      >
        <span style={{ color: 'var(--ink-2)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {open ? <ChevronDown /> : <ChevronRight />}
        </span>

        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--ink-2)',
            flex: 1,
          }}
        >
          {title}
        </span>

        {actions && (
          <span
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            {actions}
          </span>
        )}
      </div>

      {open && <div>{children}</div>}
    </div>
  )
}
