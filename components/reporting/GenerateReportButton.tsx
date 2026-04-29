import Link from 'next/link'
import type { ReportScope } from '@/lib/reporting/types'

type Props = {
  scope: ReportScope
  id: string
  label?: string
}

export function GenerateReportButton({ scope, id, label = 'Generate report' }: Props) {
  return (
    <Link
      href={`/reporting/reports?scope=${scope}&id=${id}`}
      style={{
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
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
      title={`Generate report scoped to this ${scope}`}
    >
      {label}
    </Link>
  )
}
