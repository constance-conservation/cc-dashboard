'use client'

import { useState, useEffect, useRef } from 'react'

export type SelectOption = { value: string; label: string }

type Props = {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  style?: React.CSSProperties
}

export function Select({ value, onChange, options, placeholder, style }: Props) {
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)
  const displayLabel = selected?.label ?? placeholder ?? 'Select…'
  const isPlaceholder = !selected

  function handleToggle() {
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPanelPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  return (
    <div style={{ position: 'relative', fontSize: 13, ...style }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 8,
          background: 'var(--bg-elev)', fontSize: 'inherit', cursor: 'pointer', textAlign: 'left',
          color: isPlaceholder ? 'var(--ink-3)' : 'var(--ink)',
          outline: open ? '2px solid var(--accent)' : 'none', outlineOffset: -1,
          boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ flexShrink: 0, marginLeft: 8, opacity: 0.5, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : undefined }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: panelPos.top, left: panelPos.left, width: panelPos.width,
            zIndex: 9999, background: 'var(--bg-elev)', border: '1px solid var(--line)',
            borderRadius: 10, boxShadow: '0 8px 24px oklch(0.18 0.015 150 / 0.12)',
            overflow: 'hidden', minWidth: 140,
          }}
        >
          {options.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                fontSize: 'inherit',
                background: opt.value === value ? 'var(--accent-soft)' : 'transparent',
                color: opt.value === value ? 'var(--accent)' : 'var(--ink)',
                cursor: 'pointer', border: 'none',
                borderBottom: i < options.length - 1 ? '1px solid var(--line)' : 'none',
              }}
              onMouseEnter={e => { if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-sunken)' }}
              onMouseLeave={e => { if (opt.value !== value) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
