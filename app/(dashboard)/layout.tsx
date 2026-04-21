'use client'

import { StateProvider } from '@/lib/store/CCStateContext'
import { TopBar } from '@/components/dashboard/TopBar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <StateProvider>
      <div className="app">
        <TopBar />
        {children}
      </div>
    </StateProvider>
  )
}
