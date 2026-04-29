'use client'

import { useState, useTransition } from 'react'
import {
  setClientReportFrequency,
  type ClientReportFrequency,
} from '@/app/(dashboard)/reporting/clients/actions'

const OPTIONS: { value: '' | ClientReportFrequency; label: string }[] = [
  { value: '',            label: 'None / off' },
  { value: 'weekly',      label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly',     label: 'Monthly' },
  { value: 'quarterly',   label: 'Quarterly' },
  { value: 'annually',    label: 'Annually' },
]

type Props = {
  clientId: string
  currentValue: string | null
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--ink-3)',
  marginBottom: 6,
}

const selectStyle: React.CSSProperties = {
  fontSize: 13,
  padding: '6px 10px',
  border: '1px solid var(--line)',
  borderRadius: 6,
  background: 'var(--bg-elev)',
  color: 'var(--ink)',
  minWidth: 160,
}

const buttonStyleBase: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 12,
  fontWeight: 500,
  border: '1px solid var(--accent)',
  borderRadius: 6,
  background: 'var(--accent)',
  color: 'var(--bg-elev)',
  cursor: 'pointer',
}

const buttonStyleDisabled: React.CSSProperties = {
  ...buttonStyleBase,
  background: 'var(--bg-sunken)',
  color: 'var(--ink-3)',
  borderColor: 'var(--line)',
  cursor: 'not-allowed',
}

export function CadenceSelector({ clientId, currentValue }: Props) {
  const [value, setValue] = useState<'' | ClientReportFrequency>(
    (currentValue as ClientReportFrequency | null) ?? '',
  )
  const [savedValue, setSavedValue] = useState<'' | ClientReportFrequency>(
    (currentValue as ClientReportFrequency | null) ?? '',
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const dirty = value !== savedValue
  const disabled = !dirty || isPending

  function handleSave() {
    setFeedback('idle')
    setErrorMsg(null)
    const next = value === '' ? null : value
    startTransition(async () => {
      const res = await setClientReportFrequency(clientId, next)
      if (res.ok) {
        setSavedValue(value)
        setFeedback('saved')
      } else {
        setErrorMsg(res.error)
        setFeedback('error')
      }
    })
  }

  return (
    <div>
      <div style={labelStyle}>Report cadence</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <select
          value={value}
          onChange={(e) => {
            setValue(e.target.value as '' | ClientReportFrequency)
            setFeedback('idle')
          }}
          disabled={isPending}
          style={selectStyle}
        >
          {OPTIONS.map((o) => (
            <option key={o.value || 'none'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled}
          style={disabled ? buttonStyleDisabled : buttonStyleBase}
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        {feedback === 'saved' && (
          <span style={{ fontSize: 12, color: 'var(--ok)' }}>Saved</span>
        )}
        {feedback === 'error' && (
          <span style={{ fontSize: 12, color: 'var(--danger)' }} title={errorMsg ?? ''}>
            Error — {errorMsg ?? 'try again'}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
        Stores the configured cadence. Auto-generation pipeline ships in E12.
      </div>
    </div>
  )
}
