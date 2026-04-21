import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in — Constance Conservation',
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontSize: 22, fontFamily: 'var(--font-display)' }}>C</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}>Constance Conservation</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Director Dashboard</div>
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', padding: 32 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Sign in</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '0 0 28px', lineHeight: 1.5 }}>
            Access is restricted to <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>@constanceconservation.com.au</span> addresses.
          </p>

          <form action="/api/auth/login" method="POST">
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 6 }}>
                Email address
              </label>
              <input
                name="email"
                type="email"
                className="input"
                placeholder="you@constanceconservation.com.au"
                style={{ width: '100%' }}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className="btn primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', fontSize: 14 }}
            >
              Send magic link
            </button>
          </form>

          <p style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', margin: '20px 0 0', lineHeight: 1.5 }}>
            You&apos;ll receive a sign-in link by email. No password required.
          </p>
        </div>

        <p style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', marginTop: 20 }}>
          Constance Conservation · Sydney, NSW
        </p>
      </div>
    </div>
  )
}
