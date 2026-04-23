'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCCState } from '@/lib/store/CCStateContext'
import { Icon } from '@/components/icons/Icon'

// ── App definitions ────────────────────────────────────────────
const APPS = [
  { id: 'roster', href: '/rostering', name: 'Rostering', icon: 'roster' as const, desc: 'Monthly crew scheduling by project' },
  { id: 'projects', href: '/projects', name: 'Projects', icon: 'projects' as const, desc: 'Live project list, capacity & budget' },
  { id: 'employees', href: '/employees', name: 'Employees', icon: 'employees' as const, desc: 'Team details, skills & availability' },
  { id: 'tender', href: '/tendering', name: 'Tendering', icon: 'tender' as const, desc: 'Live bids, proposals & submissions' },
  { id: 'staff', href: 'https://constance-reporting.vercel.app/', name: 'Staff Reporting', icon: 'staff' as const, desc: 'Daily reports, timesheets & incident logs' },
  { id: 'finance', href: '/finances', name: 'Finances', icon: 'finance' as const, desc: 'P&L, invoicing, cash position' },
  { id: 'fleet', href: '/fleet', name: 'Fleet & Equipment', icon: 'fleet' as const, desc: 'Vehicles, servicing & live locations' },
]

type AppStats = Record<string, { statVal?: string | number; stat?: string; badge?: string | null; badgeKind?: string }>

// ── Sparkline ─────────────────────────────────────────────────
function Spark({ data, color }: { data: number[]; color?: string }) {
  const w = 120, h = 28
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color || 'var(--accent)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── KPI widgets ────────────────────────────────────────────────
function TenderPipelineWidget() {
  const actuals = [172, 186, 201, 194, 218, 232]
  const predicted = 258
  const lastMonth = actuals[actuals.length - 1]
  const pctChange = ((predicted - lastMonth) / lastMonth) * 100
  const up = pctChange >= 0
  return (
    <div className="kpi">
      <div className="kpi-label">Predicted revenue — next month</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div className="kpi-value">${predicted}k</div>
        <div style={{ fontSize: 13, color: up ? 'var(--ok)' : 'var(--danger)', fontWeight: 500 }}>
          {up ? '▲' : '▼'} {Math.abs(pctChange).toFixed(1)}%
        </div>
      </div>
      <div className="kpi-delta">{up ? 'Higher' : 'Lower'} than last month (${lastMonth}k)</div>
      <div className="kpi-spark"><Spark data={[...actuals, predicted]} /></div>
    </div>
  )
}

function WeatherWidget() {
  const forecast = [
    ['Mon', '21°', '☀'], ['Tue', '23°', '☀'], ['Wed', '19°', '⛅'],
    ['Thu', '17°', '🌧'], ['Fri', '18°', '⛅'], ['Sat', '20°', '☀'],
  ] as const
  return (
    <div className="kpi">
      <div className="kpi-label">Weather — Camden field office</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div className="kpi-value">19°</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>partly cloudy</div>
      </div>
      <div className="kpi-delta">Light winds SE · 12 km/h · 0% rain</div>
      <div style={{ display: 'flex', gap: 4, marginTop: 10, justifyContent: 'space-between' }}>
        {forecast.map(([d, t, icon]) => (
          <div key={d} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div>{d}</div>
            <div style={{ fontSize: 13, margin: '3px 0' }}>{icon}</div>
            <div style={{ color: 'var(--ink)', fontSize: 11 }}>{t}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Layout variants ────────────────────────────────────────────
function AppGridCards({ stats }: { stats: AppStats }) {
  return (
    <div className="app-grid">
      {APPS.map(app => {
        const s = stats[app.id] || {}
        return (
          <Link key={app.id} href={app.href} style={{ textDecoration: 'none' }} {...(app.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            <div className="app-card">
              <div className="app-card-top">
                <div className="app-icon"><Icon name={app.icon} /></div>
                {s.badge && <span className={`app-badge ${s.badgeKind || ''}`}>{s.badge}</span>}
              </div>
              <h3 className="app-name">{app.name}</h3>
              <p className="app-desc">{app.desc}</p>
              <div className="app-footer">
                <span className="app-stat"><b>{s.statVal ?? '—'}</b>{s.stat || ''}</span>
                <span className="app-arrow"><Icon name="arrow" size={14} /></span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function AppListRows({ stats }: { stats: AppStats }) {
  return (
    <div className="app-list">
      {APPS.map(app => {
        const s = stats[app.id] || {}
        return (
          <Link key={app.id} href={app.href} style={{ textDecoration: 'none' }} {...(app.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            <div className="app-row">
              <div className="app-icon"><Icon name={app.icon} size={18} /></div>
              <div>
                <div className="row-name">{app.name}</div>
                <div className="row-desc">{app.desc}</div>
              </div>
              <div className="row-stat"><b>{s.statVal ?? '—'}</b> {s.stat || ''}</div>
              <div>
                {s.badge
                  ? <span className={`pill ${s.badgeKind === 'alert' ? 'warn' : ''}`}><span className="dot" />{s.badge}</span>
                  : <span className="pill"><span className="dot" />Nominal</span>}
              </div>
              <div className="row-launch">Launch →</div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function AppCompactGrid() {
  return (
    <div className="app-compact-grid">
      {APPS.map(app => (
        <Link key={app.id} href={app.href} style={{ textDecoration: 'none' }} {...(app.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          <div className="app-compact">
            <div className="app-icon"><Icon name={app.icon} size={16} /></div>
            <div className="name">{app.name}</div>
            <div className="hint">Open →</div>
          </div>
        </Link>
      ))}
    </div>
  )
}

type Layout = 'grid' | 'list' | 'compact'

// ── Main dashboard ─────────────────────────────────────────────
export default function DashboardPage() {
  const state = useCCState()
  const [layout, setLayout] = useState<Layout>('grid')

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  const directorName = 'Cameron Ellis'
  const firstName = directorName.split(' ')[0]

  const onShiftToday = (() => {
    const todayKey = new Date().toISOString().slice(0, 10)
    return state.roster[todayKey]?.length || 18
  })()

  const stats: AppStats = {
    roster: { statVal: onShiftToday, stat: 'on shift', badge: '3 open', badgeKind: 'alert' },
    projects: { statVal: state.projects.length, stat: 'active', badge: '2 due wk' },
    employees: { statVal: state.employees.length, stat: 'team', badge: null },
    tender: { statVal: '7', stat: 'active', badge: 'Due Fri' },
    staff: { statVal: '12', stat: 'reports', badge: '2 new' },
    finance: { statVal: '$84.2k', stat: 'outstanding', badge: null },
    fleet: { statVal: '14 / 16', stat: 'in service', badge: 'Service due', badgeKind: 'alert' },
  }

  const LayoutComp = layout === 'list' ? <AppListRows stats={stats} /> : layout === 'compact' ? <AppCompactGrid /> : <AppGridCards stats={stats} />
  const layoutLabel = layout === 'grid' ? 'Card grid' : layout === 'list' ? 'Operational list' : 'Compact launcher'

  return (
    <>
      {/* Hero */}
      <div className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span>Director Dashboard</span>
            <span>·</span>
            <span>{today}</span>
          </div>
          <h1 className="hero-title">
            Good morning, <em>{firstName}</em>.<br />Five crews in the field today.
          </h1>
          <div className="hero-meta">
            <div><span className="label">On shift today</span><span className="val">{onShiftToday} staff across 5 sites</span></div>
            <div><span className="label">Weather — Camden</span><span className="val">19° · light winds</span></div>
            <div><span className="label">Active projects</span><span className="val">{state.projects.length} running · 2 completing this week</span></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="content">
        {/* KPI row */}
        <div className="kpi-row">
          <TenderPipelineWidget />
          <WeatherWidget />
          <div className="kpi">
            <div className="kpi-label">Tender pipeline — Q2</div>
            <div className="kpi-value">$1.4m</div>
            <div className="kpi-delta">7 live · 3 awaiting</div>
            <div className="kpi-spark"><Spark data={[0.8, 0.9, 1.0, 1.1, 1.2, 1.35, 1.4]} /></div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Outstanding invoices</div>
            <div className="kpi-value">$84.2k</div>
            <div className="kpi-delta down">6 invoices · 2 overdue</div>
            <div className="kpi-spark"><Spark data={[92, 88, 90, 85, 88, 86, 84]} /></div>
          </div>
        </div>

        {/* Applications section */}
        <div className="section-head">
          <div className="section-title">Applications</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['grid', 'list', 'compact'] as Layout[]).map(l => (
              <button
                key={l}
                onClick={() => setLayout(l)}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                  background: layout === l ? 'var(--accent-soft)' : 'transparent',
                  color: layout === l ? 'var(--accent)' : 'var(--ink-3)',
                  border: '1px solid ' + (layout === l ? 'var(--accent)' : 'transparent'),
                  fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}
              >
                {l === 'grid' ? 'Cards' : l === 'list' ? 'List' : 'Compact'}
              </button>
            ))}
          </div>
        </div>

        {LayoutComp}

        {/* Bottom panels */}
        <div className="panel-grid">
          {/* Project progress */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Project progress</div>
              <Link href="/projects" className="section-action">All projects →</Link>
            </div>
            {state.projects.map(p => {
              const pct = Math.min(100, Math.round((p.spent / p.budget) * 100))
              return (
                <div key={p.id} className="project-item">
                  <div className="project-top">
                    <div className="project-name">{p.name}</div>
                    <div className="project-meta">${(p.spent / 1000).toFixed(1)}k / ${(p.budget / 1000).toFixed(1)}k</div>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: pct + '%' }} /></div>
                  <div className="progress-row"><span>{p.client}</span><span>{pct}% of budget</span></div>
                </div>
              )
            })}
          </div>

          {/* Staff on shift */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Staff on shift — today</div>
              <Link href="/rostering" className="section-action">Full roster →</Link>
            </div>
            {([
              { name: 'Cameron Ellis', initials: 'CE', role: 'Lead Ecologist', site: 'Harrington Grove' },
              { name: 'Priya Nair', initials: 'PN', role: 'Field Supervisor', site: 'Liverpool — Site B' },
              { name: "James O'Brien", initials: 'JO', role: 'Bush Regenerator', site: 'Camden — Weed crew' },
              { name: 'Marika Tawhai', initials: 'MT', role: 'Ecologist', site: 'Wollondilly — Survey' },
              { name: 'Daniel Krauss', initials: 'DK', role: 'Fire / APZ Lead', site: 'AWP Reserve' },
              { name: 'Lena Park', initials: 'LP', role: 'Native Seed Tech', site: 'Camden Nursery' },
              { name: 'Tom Fitzgerald', initials: 'TF', role: 'Field Crew', site: 'Harrington Grove' },
              { name: 'Amelia Chen', initials: 'AC', role: 'Field Crew', site: 'Liverpool — Site B' },
            ] as const).map((s, i) => (
              <div key={i} className="staff-row">
                <div className="staff-avatar">{s.initials}</div>
                <div className="staff-info">
                  <div className="staff-name">{s.name}</div>
                  <div className="staff-role">{s.role}</div>
                </div>
                <div className="staff-location">{s.site}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
