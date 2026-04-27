'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { Select } from '@/components/dashboard/Select'

type PillVariant = 'accent' | 'warn' | 'ok' | 'danger'

type Report = {
  date: string
  author: string
  site: string
  type: string
  summary: string
  pill: PillVariant
}

const REPORTS: Report[] = [
  { date: '20 Apr', author: 'Cameron Ellis', site: 'Harrington Grove', type: 'Daily', summary: 'Completed northern slope clearance. Spotted 2 eastern blue-tongues relocated safely.', pill: 'accent' },
  { date: '20 Apr', author: 'Priya Nair', site: 'Liverpool — Site B', type: 'Daily', summary: 'Weed slashing 68% complete. One brushcutter reported faulty — swapped from Van 03.', pill: 'accent' },
  { date: '20 Apr', author: 'Daniel Krauss', site: 'AWP Reserve', type: 'Incident', summary: 'Minor laceration to volunteer — first aid administered. Form DK-07 filed.', pill: 'warn' },
  { date: '19 Apr', author: 'Marika Tawhai', site: 'Wollondilly', type: 'Survey', summary: 'Quadrat survey plots 14–22 completed. Native species richness up from baseline.', pill: 'accent' },
  { date: '19 Apr', author: "James O'Brien", site: 'Camden', type: 'Daily', summary: 'Lantana removal in sector 3 — 0.4ha treated. Mulching scheduled Monday.', pill: 'accent' },
  { date: '19 Apr', author: 'Lena Park', site: 'Camden Nursery', type: 'Daily', summary: 'Seed collection — 1.2kg Themeda triandra collected, dried, catalogued.', pill: 'accent' },
]

const SITE_COUNTS: [string, number][] = [
  ['Harrington Grove', 14], ['Liverpool', 11], ['Camden', 9], ['Wollondilly', 5], ['AWP Reserve', 3],
]

const REPORT_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'daily', label: 'Daily' },
  { value: 'incident', label: 'Incident' },
  { value: 'survey', label: 'Survey' },
]

export default function ReportingPage() {
  const [reportType, setReportType] = useState('')
  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Field reports & timesheets</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Staff Reporting</h2>
      </div>

      <div className="subpage-body">
        <div className="two-col">
          {/* Reports feed */}
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              <input className="input" placeholder="Search reports, authors, sites…" style={{ flex: 1 }} />
              <Select value={reportType} onChange={setReportType} options={REPORT_TYPE_OPTIONS} style={{ minWidth: 130 }} />
              <button className="btn"><Icon name="download" size={14} /> Export</button>
            </div>

            {REPORTS.map((r, i) => (
              <div key={i} style={{ background: 'var(--bg-elev)', border: '1px solid var(--line)', borderRadius: 12, padding: 18, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={`pill ${r.pill}`}><span className="dot" />{r.type}</span>
                    <span style={{ fontWeight: 500 }}>{r.author}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>· {r.site}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>{r.date}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>{r.summary}</div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div>
            <div className="panel">
              <div className="panel-head"><div className="panel-title">This week</div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {([
                  ['Reports filed', '42', undefined],
                  ['Timesheets pending', '6', 'warn'],
                  ['Incidents (week)', '1', undefined],
                  ['Hours logged', '612', undefined],
                ] as [string, string, string | undefined][]).map(([label, value, highlight]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: highlight === 'warn' ? 'var(--warn)' : 'var(--ink)' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel" style={{ marginTop: 12 }}>
              <div className="panel-head"><div className="panel-title">Reports by site</div></div>
              {SITE_COUNTS.map(([name, n]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                  <div style={{ flex: 1, fontSize: 13 }}>{name}</div>
                  <div style={{ width: 100, height: 4, background: 'var(--bg-sunken)', borderRadius: 2 }}>
                    <div style={{ width: (n / 14 * 100) + '%', height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', width: 20, textAlign: 'right' }}>{n}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
