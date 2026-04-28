'use client'

import { StateProvider } from '@/lib/store/CCStateContext'
import { TopBar } from '@/components/dashboard/TopBar'
import { useCCState } from '@/lib/store/CCStateContext'
import { SettingsProvider } from '@/lib/store/SettingsContext'

function LoadingGate({ children }: { children: React.ReactNode }) {
  const { loading } = useCCState()
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 13, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Loading…
      </div>
    )
  }
  return <>{children}</>
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <StateProvider>
        <div className="app">
          <TopBar />
          <LoadingGate>{children}</LoadingGate>
        </div>
      </StateProvider>
    </SettingsProvider>
  )
}
