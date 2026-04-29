'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  generateClientReport,
  generateSiteReport,
  generateZoneReport,
  type GenerateResult,
} from '@/lib/reporting/generation/actions'
import type { ReportScope } from '@/lib/reporting/types'

type Props = {
  scope: ReportScope
  id: string
  label?: string
}

export function GenerateReportButton({ scope, id, label = 'Generate report' }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const onClick = () => {
    setError(null)
    startTransition(async () => {
      let result: GenerateResult
      if (scope === 'client') result = await generateClientReport(id)
      else if (scope === 'site') result = await generateSiteReport(id)
      else result = await generateZoneReport(id)

      if (result.ok) {
        router.push(`/reporting/reports/${result.clientReportId}`)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 500,
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 6,
    cursor: isPending ? 'wait' : 'pointer',
    opacity: isPending ? 0.7 : 1,
    whiteSpace: 'nowrap' as const,
    fontFamily: 'inherit',
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        style={buttonStyle}
        title={`Generate report scoped to this ${scope}`}
      >
        {isPending ? 'Generating…' : label}
      </button>
      {error && (
        <span style={{ fontSize: 11, color: 'var(--danger, #c4513d)', maxWidth: 280, textAlign: 'right' }}>
          {error}
        </span>
      )}
    </span>
  )
}
