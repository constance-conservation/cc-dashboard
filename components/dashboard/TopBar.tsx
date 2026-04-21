'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Icon } from '@/components/icons/Icon'

export function TopBar() {
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  const [theme, setTheme] = useState<'green' | 'clay' | 'ocean' | 'ink'>('green')

  const toggleMode = () => {
    const next = mode === 'light' ? 'dark' : 'light'
    setMode(next)
    document.documentElement.setAttribute('data-mode', next === 'dark' ? 'dark' : '')
  }

  const setThemeAttr = (t: typeof theme) => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t === 'green' ? '' : t)
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand">
        <div className="brand-mark">C</div>
        <div>
          <div className="brand-name">Constance Conservation</div>
          <div className="brand-sub">Director</div>
        </div>
      </Link>

      <div className="chip">
        <span className="dot" />
        Live
      </div>

      <div className="topbar-right">
        {/* Theme swatches */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {([
            ['green', 'oklch(0.42 0.07 150)'],
            ['clay', 'oklch(0.48 0.1 50)'],
            ['ocean', 'oklch(0.42 0.08 230)'],
            ['ink', 'oklch(0.22 0.01 150)'],
          ] as const).map(([t, color]) => (
            <button
              key={t}
              onClick={() => setThemeAttr(t)}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: color, cursor: 'pointer', border: 'none',
                outline: theme === t ? '2px solid var(--ink)' : '2px solid transparent',
                outlineOffset: 2, transition: 'outline 0.15s',
              }}
              title={t}
            />
          ))}
        </div>

        <button className="iconbtn" onClick={toggleMode} title="Toggle dark mode">
          {mode === 'light'
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          }
        </button>

        <button className="iconbtn"><Icon name="bell" size={16} /></button>
        <button className="iconbtn"><Icon name="settings" size={16} /></button>
        <div className="avatar">CE</div>
      </div>
    </header>
  )
}
