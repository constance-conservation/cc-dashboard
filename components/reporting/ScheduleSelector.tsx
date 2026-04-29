'use client'

import { useState, useTransition } from 'react'
import {
  updateSiteSchedule,
  type ScheduleCadence,
  type ScheduleConfig,
} from '@/app/(dashboard)/reporting/clients/[id]/sites/actions'

const OPTIONS: { value: ScheduleCadence; label: string }[] = [
  { value: 'off',         label: 'Off' },
  { value: 'weekly',      label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly',     label: 'Monthly' },
  { value: 'quarterly',   label: 'Quarterly' },
  { value: 'annually',    label: 'Annually' },
]

type Props = {
  siteId: string
  current: ScheduleConfig | null
  variant?: 'full' | 'compact'
  label?: string
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--ink-3)',
  marginBottom: 6,
}

const pillRow: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  alignItems: 'center',
}

function pillStyle(opts: {
  selected: boolean
  off: boolean
  disabled: boolean
  compact: boolean
}): React.CSSProperties {
  const { selected, off, disabled, compact } = opts
  return {
    display: 'inline-block',
    padding: compact ? '2px 8px' : '4px 10px',
    fontSize: compact ? 10 : 11,
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    borderRadius: 999,
    border: '1px solid',
    borderColor: selected ? (off ? 'var(--ink-3)' : 'var(--accent)') : 'var(--line)',
    background: selected
      ? off
        ? 'var(--bg-sunken)'
        : 'var(--accent-soft)'
      : 'transparent',
    color: selected ? (off ? 'var(--ink-2)' : 'var(--accent)') : 'var(--ink-3)',
    cursor: disabled ? 'wait' : 'pointer',
    userSelect: 'none',
    transition: 'background 0.12s, color 0.12s, border-color 0.12s',
  }
}

function readCadence(c: ScheduleConfig | null): ScheduleCadence {
  const v = c?.cadence
  if (
    v === 'off' || v === 'weekly' || v === 'fortnightly' ||
    v === 'monthly' || v === 'quarterly' || v === 'annually'
  ) return v
  return 'off'
}

export function ScheduleSelector({
  siteId,
  current,
  variant = 'full',
  label = 'Schedule',
}: Props) {
  const [cadence, setCadence] = useState<ScheduleCadence>(readCadence(current))
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const compact = variant === 'compact'

  function pick(next: ScheduleCadence) {
    if (isPending || next === cadence) return
    const prev = cadence
    setCadence(next)
    setFeedback('idle')
    setErrorMsg(null)
    startTransition(async () => {
      const res = await updateSiteSchedule(siteId, { cadence: next })
      if (res.ok) {
        setFeedback('saved')
        setTimeout(() => {
          setFeedback((f) => (f === 'saved' ? 'idle' : f))
        }, 1600)
      } else {
        setCadence(prev)
        setErrorMsg(res.error)
        setFeedback('error')
      }
    })
  }

  return (
    <div>
      {!compact && <div style={labelStyle}>{label}</div>}
      <div style={pillRow}>
        {compact && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--ink-3)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginRight: 4,
            }}
          >
            {label}
          </span>
        )}
        {OPTIONS.map((o) => (
          <span
            key={o.value}
            role="button"
            tabIndex={0}
            onClick={() => pick(o.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                pick(o.value)
              }
            }}
            style={pillStyle({
              selected: cadence === o.value,
              off: o.value === 'off',
              disabled: isPending,
              compact,
            })}
          >
            {o.label}
          </span>
        ))}
        <span style={{ marginLeft: 4, fontSize: 11, minWidth: 60 }}>
          {isPending && <span style={{ color: 'var(--ink-3)' }}>Saving…</span>}
          {!isPending && feedback === 'saved' && (
            <span style={{ color: 'var(--ok)' }}>Saved</span>
          )}
          {!isPending && feedback === 'error' && (
            <span style={{ color: 'var(--danger)' }} title={errorMsg ?? ''}>
              Error
            </span>
          )}
        </span>
      </div>
      {!compact && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>
          Stores the configured cadence on the site. Auto-generation pipeline ships in E12.
        </div>
      )}
    </div>
  )
}
