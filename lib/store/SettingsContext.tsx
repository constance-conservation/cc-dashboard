'use client'

import { createContext, useContext, useState, useEffect } from 'react'

type Settings = { dashboardLayout: 'grid' | 'list' }
const DEFAULTS: Settings = { dashboardLayout: 'grid' }

const Ctx = createContext<{
  settings: Settings
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void
} | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, set] = useState<Settings>(DEFAULTS)

  useEffect(() => {
    try {
      const s = localStorage.getItem('cc-settings')
      if (s) set({ ...DEFAULTS, ...JSON.parse(s) })
    } catch {}
  }, [])

  const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    set(prev => {
      const next = { ...prev, [k]: v }
      localStorage.setItem('cc-settings', JSON.stringify(next))
      return next
    })
  }

  return <Ctx.Provider value={{ settings, setSetting }}>{children}</Ctx.Provider>
}

export function useSettings() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
