'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/icons/Icon'
import { useSettings } from '@/lib/store/SettingsContext'

export function TopBar() {
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const { settings, setSetting } = useSettings()
  const pathname = usePathname()

  const toggleMode = () => {
    const next = mode === 'light' ? 'dark' : 'light'
    setMode(next)
    document.documentElement.setAttribute('data-mode', next === 'dark' ? 'dark' : '')
  }

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
      }
    }
    if (showSettings) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showSettings])

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
<button className="iconbtn" onClick={toggleMode} title="Toggle dark mode">
          {mode === 'light'
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          }
        </button>

        <button className="iconbtn"><Icon name="bell" size={16} /></button>
        <div ref={settingsRef} style={{ position: 'relative' }}>
          <button className="iconbtn" onClick={() => setShowSettings(v => !v)} title="Settings">
            <Icon name="settings" size={16} />
          </button>
          {showSettings && (
            <div style={{
              position: 'fixed', top: 52, right: 12, zIndex: 200,
              background: 'var(--bg-elev)', border: '1px solid var(--line)',
              borderRadius: 12, boxShadow: '0 8px 32px oklch(0.18 0.015 150 / 0.14)',
              minWidth: 220, overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--ink)' }}>
                  Settings
                </div>
              </div>
              {pathname === '/' && (
                <div style={{ padding: '12px 16px' }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: 'var(--ink-3)', marginBottom: 8,
                  }}>
                    Dashboard Layout
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['grid', 'list'] as const).map(l => (
                      <button key={l} onClick={() => setSetting('dashboardLayout', l)} style={{
                        flex: 1, padding: '6px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em',
                        background: settings.dashboardLayout === l ? 'var(--accent-soft)' : 'var(--bg-sunken)',
                        color: settings.dashboardLayout === l ? 'var(--accent)' : 'var(--ink-3)',
                        border: '1px solid ' + (settings.dashboardLayout === l ? 'var(--accent)' : 'transparent'),
                      }}>
                        {l === 'grid' ? 'Cards' : 'List'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="avatar">CE</div>
      </div>
    </header>
  )
}
