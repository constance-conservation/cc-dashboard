import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 16 }}>404</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 12px', color: 'var(--ink)' }}>Page not found</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', margin: '0 0 28px' }}>This page doesn&apos;t exist in the dashboard.</p>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: 'var(--accent-ink)', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
          ← Back to dashboard
        </Link>
      </div>
    </div>
  )
}
