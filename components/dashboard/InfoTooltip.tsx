'use client'

import { useState, useRef, useEffect } from 'react'

type InfoTooltipProps = {
  text: string
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={() => setOpen(prev => !prev)}
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
            left: 'calc(100% + 6px)',
            top: '50%',
            transform: 'translateY(-50%)',
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
