'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'

type TenderStatus = 'live' | 'won' | 'lost'

type Tender = {
  ref: string
  title: string
  client: string
  value: string
  due: string
  status: TenderStatus
  stage: string
}

const TENDERS: Tender[] = [
  { ref: 'CC-T-247', title: 'NPWS Macarthur — Weed management panel', client: 'NSW NPWS', value: '$182,400', due: '2 May', status: 'live', stage: 'Drafting' },
  { ref: 'CC-T-246', title: 'Harrington Grove — Stage 5 bush regen', client: 'Harrington Grove', value: '$96,000', due: '28 Apr', status: 'live', stage: 'Review' },
  { ref: 'CC-T-245', title: 'Camden Council VMP — 3yr renewal', client: 'Camden Council', value: '$240,000', due: '6 May', status: 'live', stage: 'Drafting' },
  { ref: 'CC-T-244', title: 'Wollondilly biodiversity survey (EOI)', client: 'Wollondilly Shire', value: '$64,500', due: '24 Apr', status: 'live', stage: 'Submitted' },
  { ref: 'CC-T-243', title: 'AWP wildlife corridor Stage 2', client: 'AWP', value: '$310,000', due: '—', status: 'won', stage: 'Awarded' },
  { ref: 'CC-T-242', title: 'Liverpool Council — APZ maintenance', client: 'Liverpool Council', value: '$128,000', due: '—', status: 'won', stage: 'Awarded' },
  { ref: 'CC-T-241', title: 'BGS — Habitat restoration scoping', client: 'BGS', value: '$48,000', due: '—', status: 'lost', stage: 'Not selected' },
]

export default function TenderingPage() {
  const [tab, setTab] = useState<TenderStatus | 'all'>('live')
  const filtered = TENDERS.filter(t => tab === 'all' || t.status === tab)

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Bids & proposals</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Tendering</h2>
      </div>

      <div className="subpage-body">
        {/* KPI stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
          <div className="stat-big">
            <div className="lbl">Live pipeline</div>
            <div className="num">$1.4m</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>7 active</div>
          </div>
          <div className="stat-big">
            <div className="lbl">Win rate (12m)</div>
            <div className="num">68<span style={{ fontSize: 28 }}>%</span></div>
            <div style={{ fontSize: 12, color: 'var(--ok)', marginTop: 6 }}>↑ 4pts vs last yr</div>
          </div>
          <div className="stat-big">
            <div className="lbl">Avg. contract</div>
            <div className="num">$142k</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>32 contracts</div>
          </div>
          <div className="stat-big">
            <div className="lbl">Next deadline</div>
            <div className="num" style={{ fontSize: 32 }}>24 Apr</div>
            <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: 6 }}>Wollondilly EOI</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {(['live', 'won', 'lost', 'all'] as const).map(t => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)} {t === 'live' && `(${TENDERS.filter(x => x.status === 'live').length})`}
            </div>
          ))}
        </div>

        <table className="table">
          <thead>
            <tr><th>Ref</th><th>Title</th><th>Client</th><th>Value</th><th>Stage</th><th>Due</th></tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.ref}>
                <td className="mono">{t.ref}</td>
                <td style={{ fontWeight: 500 }}>{t.title}</td>
                <td>{t.client}</td>
                <td className="mono">{t.value}</td>
                <td>
                  <span className={`pill ${t.status === 'won' ? 'ok' : t.status === 'lost' ? 'danger' : 'accent'}`}>
                    <span className="dot" />{t.stage}
                  </span>
                </td>
                <td className="mono">{t.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
