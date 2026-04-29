import Link from 'next/link'

type Props = {
  title: string
  meta?: string | null
  href?: string
  children?: React.ReactNode
}

export function RowCard({ title, meta, href, children }: Props) {
  const titleEl = (
    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>{title}</div>
  )

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        padding: '12px 14px',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        {href
          ? <Link href={href} style={{ textDecoration: 'none' }}>{titleEl}</Link>
          : titleEl}
        {meta && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{meta}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}
