import { ReportingNav } from '@/components/reporting/ReportingNav'

export default function ReportingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'stretch' }}>
      <ReportingNav />
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  )
}
