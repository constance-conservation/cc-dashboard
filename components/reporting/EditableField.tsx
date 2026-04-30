'use client'

import { useEffect, useRef, useState, useTransition } from 'react'

export type SaveResult = { ok: true } | { ok: false; error: string }

type Props = {
  label: string
  value: string | null
  placeholder?: string
  hint?: string
  inputType?: 'text' | 'email' | 'tel'
  onSave: (next: string | null) => Promise<SaveResult>
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--ink-3)',
  marginBottom: 4,
}

const valueStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--ink)',
  cursor: 'text',
  padding: '4px 6px',
  margin: '-4px -6px',
  borderRadius: 4,
  border: '1px solid transparent',
  minHeight: 22,
  display: 'inline-block',
}

const valueStyleEmpty: React.CSSProperties = {
  ...valueStyle,
  color: 'var(--ink-4)',
  fontStyle: 'italic',
}

const inputStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '4px 6px',
  border: '1px solid var(--accent)',
  borderRadius: 4,
  background: 'var(--bg-elev)',
  color: 'var(--ink)',
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
}

function normalize(raw: string): string | null {
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed
}

export function EditableField({
  label,
  value,
  placeholder = 'Click to edit',
  hint,
  inputType = 'text',
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string>(value ?? '')
  const [savedValue, setSavedValue] = useState<string | null>(value)
  const [feedback, setFeedback] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    setSavedValue(value)
    setDraft(value ?? '')
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  function startEdit() {
    cancelledRef.current = false
    setDraft(savedValue ?? '')
    setFeedback('idle')
    setErrorMsg(null)
    setEditing(true)
  }

  function commit() {
    if (cancelledRef.current) {
      cancelledRef.current = false
      setEditing(false)
      return
    }
    const next = normalize(draft)
    if (next === savedValue) {
      setEditing(false)
      return
    }
    startTransition(async () => {
      const res = await onSave(next)
      if (res.ok) {
        setSavedValue(next)
        setFeedback('saved')
        setEditing(false)
        setTimeout(() => {
          setFeedback((f) => (f === 'saved' ? 'idle' : f))
        }, 1600)
      } else {
        setErrorMsg(res.error)
        setFeedback('error')
      }
    })
  }

  function cancel() {
    cancelledRef.current = true
    setDraft(savedValue ?? '')
    setFeedback('idle')
    setErrorMsg(null)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  const showEmpty = !editing && (savedValue ?? '').trim() === ''

  return (
    <div>
      <div style={labelStyle}>{label}</div>
      {editing ? (
        <input
          ref={inputRef}
          type={inputType}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (feedback !== 'idle') setFeedback('idle')
          }}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          style={inputStyle}
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={startEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              startEdit()
            }
          }}
          style={showEmpty ? valueStyleEmpty : valueStyle}
          title="Click to edit"
        >
          {showEmpty ? placeholder : savedValue}
        </div>
      )}
      <div style={{ marginTop: 4, minHeight: 14, fontSize: 11 }}>
        {isPending && <span style={{ color: 'var(--ink-3)' }}>Saving…</span>}
        {!isPending && feedback === 'saved' && (
          <span style={{ color: 'var(--ok)' }}>Saved</span>
        )}
        {!isPending && feedback === 'error' && (
          <span style={{ color: 'var(--danger)' }} title={errorMsg ?? ''}>
            Error — {errorMsg ?? 'try again'}
          </span>
        )}
        {!isPending && feedback === 'idle' && hint && (
          <span style={{ color: 'var(--ink-3)' }}>{hint}</span>
        )}
      </div>
    </div>
  )
}
