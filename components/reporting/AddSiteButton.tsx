'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createSite } from '@/app/(dashboard)/reporting/clients/[id]/sites/actions'
import { Modal } from './Modal'

type Props = {
  clientId: string
}

const triggerStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 10px',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  borderRadius: 4,
  border: '1px solid var(--accent)',
  background: 'var(--accent-soft)',
  color: 'var(--accent)',
  cursor: 'pointer',
}

const fieldLabel: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--ink-3)',
  marginBottom: 4,
  display: 'block',
}

const inputStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 8px',
  border: '1px solid var(--line)',
  borderRadius: 4,
  background: 'var(--bg)',
  color: 'var(--ink)',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const btnRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 8,
  marginTop: 14,
}

const btnPrimary: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  borderRadius: 4,
  border: '1px solid var(--accent)',
  background: 'var(--accent)',
  color: 'var(--bg)',
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  borderRadius: 4,
  border: '1px solid var(--line)',
  background: 'transparent',
  color: 'var(--ink-2)',
  cursor: 'pointer',
}

export function AddSiteButton({ clientId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [longName, setLongName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setName('')
    setLongName('')
    setError(null)
  }

  function close() {
    if (isPending) return
    setOpen(false)
    reset()
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (isPending) return
    setError(null)
    const trimmed = name.trim()
    if (trimmed === '') {
      setError('Name is required')
      return
    }
    const long = longName.trim()
    startTransition(async () => {
      const res = await createSite(clientId, trimmed, long === '' ? null : long)
      if (res.ok) {
        setOpen(false)
        reset()
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <>
      <button type="button" style={triggerStyle} onClick={() => setOpen(true)}>
        + Add site
      </button>
      <Modal open={open} title="New site" onClose={close}>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={fieldLabel}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
              autoFocus
              disabled={isPending}
            />
          </div>
          <div>
            <label style={fieldLabel}>Long name (optional)</label>
            <input
              type="text"
              value={longName}
              onChange={(e) => setLongName(e.target.value)}
              style={inputStyle}
              disabled={isPending}
            />
          </div>
          {error && (
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--danger)' }}>{error}</div>
          )}
          <div style={btnRow}>
            <button type="button" style={btnSecondary} onClick={close} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" style={btnPrimary} disabled={isPending}>
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
