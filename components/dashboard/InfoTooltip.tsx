'use client'

import { useState } from 'react'

type InfoTooltipProps = {
  text: string
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
    >
      <button
        aria-label="More information"
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'var(--bg-sunken)',
          border: '1px solid var(--line)',
          color: 'var(--ink-3)',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
        }}
      >
        i
      </button>

      {open && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 220,
            background: 'var(--bg-sunken)',
            border: '1px solid var(--line)',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '8px 10px',
            fontSize: 11,
            color: 'var(--ink-2)',
            lineHeight: 1.5,
            zIndex: 50,
            whiteSpace: 'normal',
          }}
        >
          {text}
        </div>
      )}
    </div>
  )
}
