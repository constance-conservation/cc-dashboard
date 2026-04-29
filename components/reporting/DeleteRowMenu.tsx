'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import {
  deleteSite,
  deleteZone,
} from '@/app/(dashboard)/reporting/clients/[id]/sites/actions'

type Props = {
  kind: 'site' | 'zone'
  id: string
  onDeleted?: () => void
}

const triggerStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--line)',
  color: 'var(--ink-3)',
  width: 26,
  height: 26,
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
}

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 'calc(100% + 4px)',
  background: 'var(--bg-elev)',
  border: '1px solid var(--line)',
  borderRadius: 4,
  boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
  zIndex: 50,
  minWidth: 140,
  padding: 4,
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'transparent',
  border: 'none',
  padding: '6px 10px',
  fontSize: 12,
  color: 'var(--danger)',
  cursor: 'pointer',
  borderRadius: 3,
  fontFamily: 'inherit',
}

const errStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: 'var(--danger)',
  maxWidth: 240,
  textAlign: 'right',
}

export function DeleteRowMenu({ kind, id, onDeleted }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  function onDelete() {
    if (isPending) return
    const label = kind === 'site' ? 'site' : 'zone'
    if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) return
    setError(null)
    startTransition(async () => {
      const res = kind === 'site' ? await deleteSite(id) : await deleteZone(id)
      if (res.ok) {
        setOpen(false)
        if (onDeleted) onDeleted()
        else router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        style={triggerStyle}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-label={`${kind} actions`}
        disabled={isPending}
      >
        ⋯
      </button>
      {open && (
        <div style={menuStyle} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            style={menuItemStyle}
            onClick={onDelete}
            disabled={isPending}
          >
            {isPending ? 'Deleting…' : `Delete ${kind}`}
          </button>
        </div>
      )}
      {error && <div style={errStyle}>{error}</div>}
    </div>
  )
}
