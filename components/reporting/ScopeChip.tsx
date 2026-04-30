import Link from 'next/link'
import type { ScopeContext } from '@/lib/reporting/types'

export function ScopeChip({ context }: { context: ScopeContext }) {
  if (!context.scope || !context.id || !context.displayName) return null

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        padding: '7px 14px',
        borderRadius: 999,
        background: 'var(--accent-soft)',
        color: 'var(--accent)',
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ textTransform: 'uppercase', opacity: 0.7 }}>{context.scope}</span>
      <span style={{ fontWeight: 600, fontFamily: 'inherit' }}>{context.displayName}</span>
      <Link
        href="/reporting/reports"
        style={{
          color: 'inherit',
          textDecoration: 'underline',
          opacity: 0.85,
          fontSize: 11,
        }}
      >
        Clear filter
      </Link>
    </div>
  )
}
