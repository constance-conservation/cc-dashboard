'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Icon } from '@/components/icons/Icon'

export function TopBar() {
  const [mode, setMode] = useState<'light' | 'dark'>('light')

  const toggleMode = () => {
    const next = mode === 'light' ? 'dark' : 'light'
    setMode(next)
    document.documentElement.setAttribute('data-mode', next === 'dark' ? 'dark' : '')
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
