'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCCState } from '@/lib/store/CCStateContext'
import { useSettings } from '@/lib/store/SettingsContext'
import { Icon } from '@/components/icons/Icon'
import { createClient } from '@/lib/supabase/client'

// ── App definitions ────────────────────────────────────────────
const APPS_OPERATIONS = [
  { id: 'roster',    href: '/rostering',  name: 'Rostering',      icon: 'roster'    as const, desc: 'Monthly crew scheduling by project' },
  { id: 'staff',     href: 'https://constance-reporting.vercel.app/', name: 'Staff Reporting', icon: 'staff' as const, desc: 'Daily reports, timesheets & incident logs' },
  { id: 'tender',    href: '/tendering',  name: 'Tendering',      icon: 'tender'    as const, desc: 'Live bids, proposals & submissions', comingSoon: true },
]

const APPS_MANAGEMENT = [
  { id: 'projects',  href: '/projects',   name: 'Projects',       icon: 'projects'  as const, desc: 'Live project list, capacity & budget' },
  { id: 'sites',     href: '/sites',      name: 'Sites',          icon: 'projects'  as const, desc: 'Project sites & field locations' },
  { id: 'employees', href: '/employees',  name: 'Employees',      icon: 'employees' as const, desc: 'Team details, skills & availability' },
  { id: 'finance',   href: '/finances',   name: 'Finances',       icon: 'finance'   as const, desc: 'P&L, invoicing, cash position', comingSoon: true },
]

const APPS_ASSETS = [
  { id: 'fleet',     href: '/fleet',      name: 'Fleet & Equipment', icon: 'fleet'  as const, desc: 'Vehicles, servicing & live locations', comingSoon: true },
  { id: 'inventory', href: '/inventory',  name: 'Inventory',      icon: 'inventory' as const, desc: 'Stock levels, consumables & equipment', comingSoon: true },
]

type AppEntry = { id: string; href: string; name: string; icon: 'roster' | 'tender' | 'staff' | 'finance' | 'fleet' | 'inventory' | 'employees' | 'projects' | 'tasks' | 'back' | 'arrow' | 'search' | 'bell' | 'settings' | 'close' | 'x' | 'plus' | 'filter' | 'download' | 'check' | 'trash' | 'edit' | 'cloud' | 'archive' | 'unarchive' | 'lock'; desc: string; comingSoon?: boolean }

type AppStats = Record<string, { statVal?: string | number; stat?: string; badge?: string | null; badgeKind?: string }>

type HomeSummary = {
  outstandingAmount: number
  outstandingCount: number
  ytdRevenue: number
  liveTenders: number
  livePipeline: number
  nextTenderDeadline: string | null
  totalVehicles: number
  inServiceVehicles: number
  serviceDue: boolean
}

// ── Helpers ────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}m`
  if (n >= 1000) return `$${Math.round(n / 1000)}k`
  return `$${n}`
}

function nextDueLabel(dateStr: string | null): string | null {
  if (!dateStr) return null
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `Due ${days[new Date(dateStr).getDay()]}`
}

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

// ── WMO weather code helpers ───────────────────────────────────
function wmoIcon(code: number): string {
  if (code === 0) return '☀'
  if (code <= 2) return '🌤'
  if (code === 3) return '☁'
  if (code <= 48) return '🌫'
  if (code <= 55) return '🌦'
  if (code <= 67) return '🌧'
  if (code <= 77) return '❄'
  if (code <= 82) return '🌦'
  return '⛈'
}

function wmoDesc(code: number): string {
  if (code === 0) return 'clear sky'
  if (code <= 2) return 'partly cloudy'
  if (code === 3) return 'overcast'
  if (code <= 48) return 'foggy'
  if (code <= 55) return 'drizzle'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'showers'
  return 'thunderstorm'
}

function windDirLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

type WeatherDay = { day: string; high: number; icon: string }
type WeatherData = {
  temp: number
  desc: string
  windSpeed: number
  windDir: string
  rainPct: number
  forecast: WeatherDay[]
}

// ── Weather widget — Open-Meteo, Camden NSW ────────────────────
function WeatherWidget() {
  const [wx, setWx] = useState<WeatherData | null>(null)

  useEffect(() => {
    const url =
      'https://api.open-meteo.com/v1/forecast' +
      '?latitude=-34.0519&longitude=150.6958' +
      '&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m' +
      '&daily=weather_code,temperature_2m_max,precipitation_probability_max' +
      '&timezone=Australia%2FSydney&forecast_days=7'
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const c = data.current
        const d = data.daily
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const forecast: WeatherDay[] = (d.time as string[]).slice(1, 7).map((t: string, i: number) => ({
          day: dayNames[new Date(t + 'T12:00:00').getDay()],
          high: Math.round(d.temperature_2m_max[i + 1]),
          icon: wmoIcon(d.weather_code[i + 1]),
        }))
        setWx({
          temp: Math.round(c.temperature_2m),
          desc: wmoDesc(c.weather_code),
          windSpeed: Math.round(c.wind_speed_10m),
          windDir: windDirLabel(c.wind_direction_10m),
          rainPct: d.precipitation_probability_max[0] ?? 0,
          forecast,
        })
      })
      .catch(() => {})
  }, [])

  return (
    <div className="kpi">
      <div className="kpi-label">Weather — Camden field office</div>
      {wx ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="kpi-value">{wx.temp}°</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{wx.desc}</div>
          </div>
          <div className="kpi-delta">
            {wx.windDir} winds · {wx.windSpeed} km/h · {wx.rainPct}% rain
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 10, justifyContent: 'space-between' }}>
            {wx.forecast.map(f => (
              <div key={f.day} style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <div>{f.day}</div>
                <div style={{ fontSize: 13, margin: '3px 0' }}>{f.icon}</div>
                <div style={{ color: 'var(--ink)', fontSize: 11 }}>{f.high}°</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 8 }}>Loading…</div>
      )}
    </div>
  )
}

// ── Layout variants ────────────────────────────────────────────
function AppGridCards({ stats, apps }: { stats: AppStats; apps: AppEntry[] }) {
  return (
    <div className="app-grid">
      {apps.map(app => {
        const s = stats[app.id] || {}
        const card = (
          <div className="app-card" style={app.comingSoon ? { opacity: 0.55, cursor: 'default', pointerEvents: 'none' } : undefined}>
            <div className="app-card-top">
              <div className="app-icon"><Icon name={app.icon} /></div>
              {app.comingSoon
                ? <span className="app-badge">Coming soon</span>
                : s.badge && <span className={`app-badge ${s.badgeKind || ''}`}>{s.badge}</span>}
            </div>
            <h3 className="app-name">{app.name}</h3>
            <p className="app-desc">{app.desc}</p>
            <div className="app-footer">
              {app.comingSoon
                ? <span className="app-stat" style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>In development</span>
                : <><span className="app-stat"><b>{s.statVal ?? '—'}</b>{s.stat || ''}</span><span className="app-arrow"><Icon name="arrow" size={14} /></span></>}
            </div>
          </div>
        )
        return app.comingSoon
          ? <div key={app.id} style={{ textDecoration: 'none' }}>{card}</div>
          : <Link key={app.id} href={app.href} style={{ textDecoration: 'none' }} {...(app.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{card}</Link>
      })}
    </div>
  )
}

function AppListRows({ stats, apps }: { stats: AppStats; apps: AppEntry[] }) {
  return (
    <div className="app-list">
      {apps.map(app => {
        const s = stats[app.id] || {}
        const cs = app.comingSoon
        const row = (
          <div className="app-row" style={cs ? { opacity: 0.55, cursor: 'default', pointerEvents: 'none' } : undefined}>
            <div className="app-icon"><Icon name={app.icon} size={18} /></div>
            <div>
              <div className="row-name">{app.name}</div>
              <div className="row-desc">{app.desc}</div>
            </div>
            <div className="row-stat">{cs ? <span style={{ fontStyle: 'italic', color: 'var(--ink-4)' }}>—</span> : <><b>{s.statVal ?? '—'}</b> {s.stat || ''}</>}</div>
            <div>
              {cs
                ? <span className="pill">Coming soon</span>
                : s.badge
                  ? <span className={`pill ${s.badgeKind === 'alert' ? 'warn' : ''}`}><span className="dot" />{s.badge}</span>
                  : <span className="pill"><span className="dot" />Nominal</span>}
            </div>
            <div className="row-launch">{cs ? '' : 'Launch →'}</div>
          </div>
        )
        return cs
          ? <div key={app.id} style={{ textDecoration: 'none' }}>{row}</div>
          : <Link key={app.id} href={app.href} style={{ textDecoration: 'none' }} {...(app.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{row}</Link>
      })}
    </div>
  )
}

// ── Main dashboard ─────────────────────────────────────────────
export default function DashboardPage() {
  const state = useCCState()
  const { settings } = useSettings()
  const [summary, setSummary] = useState<HomeSummary | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function loadSummary() {
      const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
      if (!org) return
      const oid = (org as Record<string, unknown>).id as string

      const today = new Date().toISOString().slice(0, 10)
      const currentYear = today.slice(0, 4)

      const [{ data: invoiceRows }, { data: tenderRows }, { data: vehicleRows }] = await Promise.all([
        supabase.from('invoices').select('amount, status, paid_date').eq('organization_id', oid),
        supabase.from('tenders').select('stage, due_date, value').eq('organization_id', oid),
        supabase.from('vehicles').select('status').eq('organization_id', oid).eq('active', true),
      ])

      const invoices = (invoiceRows ?? []) as Array<{ amount: number; status: string; paid_date: string | null }>
      const tenders  = (tenderRows  ?? []) as Array<{ stage: string; due_date: string | null; value: number }>
      const vehicles = (vehicleRows ?? []) as Array<{ status: string }>

      const outstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
      const outstandingAmount = outstanding.reduce((s, i) => s + i.amount, 0)

      const paid = invoices.filter(i => i.status === 'paid' && i.paid_date)
      const ytdRevenue = paid.filter(i => i.paid_date!.startsWith(currentYear)).reduce((s, i) => s + i.amount, 0)

      const deadStages = new Set(['awarded', 'not selected', 'unsuccessful', 'declined'])
      const liveTenders = tenders.filter(t => !deadStages.has(t.stage.toLowerCase()))
      const livePipeline = liveTenders.reduce((s, t) => s + t.value, 0)
      const nextTenderDeadline = liveTenders
        .filter(t => t.due_date && t.due_date >= today)
        .sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0]?.due_date ?? null

      const totalVehicles   = vehicles.length
      const inServiceVehicles = vehicles.filter(v => v.status !== 'danger').length
      const serviceDue      = vehicles.some(v => v.status === 'danger' || v.status === 'warn')

      setSummary({
        outstandingAmount,
        outstandingCount: outstanding.length,
        ytdRevenue,
        liveTenders: liveTenders.length,
        livePipeline,
        nextTenderDeadline,
        totalVehicles,
        inServiceVehicles,
        serviceDue,
      })
    }
    loadSummary().catch(console.error)
  }, [])

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const firstName = state.currentUserName?.split(' ')[0] ?? ''

  const todayKey = new Date().toISOString().slice(0, 10)
  const todayAssignments = state.roster[todayKey] ?? []
  const onShiftToday = todayAssignments.length
  const activeSites = new Set(todayAssignments.map(a => a.projectId)).size

  const staffOnShift = Array.from(
    todayAssignments.reduce((map, a) => {
      if (!map.has(a.employeeId)) map.set(a.employeeId, a.projectId)
      return map
    }, new Map<string, string>())
  ).map(([empId, projId]) => {
    const emp = state.employees.find(e => e.id === empId)
    const proj = state.projects.find(p => p.id === projId)
    return emp ? { name: emp.name, initials: emp.name.split(' ').map(x => x[0]).join(''), role: emp.role, site: proj?.name ?? 'Unassigned' } : null
  }).filter((x): x is NonNullable<typeof x> => x !== null)

  const heroSub = onShiftToday === 0
    ? 'No crew rostered today.'
    : `${onShiftToday} staff across ${activeSites} site${activeSites !== 1 ? 's' : ''} today.`

  const stats: AppStats = {
    roster:   { statVal: onShiftToday, stat: ' on shift', badge: null },
    projects: { statVal: state.projects.length, stat: ' active', badge: null },
    sites:    { statVal: state.sites.length, stat: ' locations', badge: null },
    employees: { statVal: state.employees.length, stat: ' team', badge: null },
    tender: {
      statVal:  summary?.liveTenders ?? '—',
      stat:     ' active',
      badge:    summary ? nextDueLabel(summary.nextTenderDeadline) : null,
    },
    staff:   { statVal: '—', stat: ' reports', badge: null },
    finance: {
      statVal: summary ? fmt(summary.outstandingAmount) : '—',
      stat:    ' outstanding',
      badge:   null,
    },
    fleet: {
      statVal:   summary ? `${summary.inServiceVehicles} / ${summary.totalVehicles}` : '—',
      stat:      ' in service',
      badge:     summary?.serviceDue ? 'Service due' : null,
      badgeKind: 'alert',
    },
  }

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
            {greeting}, <em>{firstName}</em>.<br />{heroSub}
          </h1>
          <div className="hero-meta">
            <div><span className="label">On shift today</span><span className="val">{onShiftToday > 0 ? `${onShiftToday} staff across ${activeSites} site${activeSites !== 1 ? 's' : ''}` : 'No crew rostered'}</span></div>
            <div><span className="label">Active projects</span><span className="val">{state.projects.length} running</span></div>
            <div><span className="label">Outstanding invoices</span><span className="val">{summary ? fmt(summary.outstandingAmount) : '—'}</span></div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="content">
        {/* KPI row */}
        <div className="kpi-row">
          <WeatherWidget />
          <div className="kpi">
            <div className="kpi-label">Live tender pipeline</div>
            <div className="kpi-value">{summary ? fmt(summary.livePipeline) : '—'}</div>
            <div className="kpi-delta">{summary ? `${summary.liveTenders} active tender${summary.liveTenders !== 1 ? 's' : ''}` : ''}</div>
            <div className="kpi-spark"><Spark data={[0, 0]} /></div>
          </div>
          <div className="kpi">
            <div className="kpi-label">YTD revenue</div>
            <div className="kpi-value">{summary ? fmt(summary.ytdRevenue) : '—'}</div>
            <div className="kpi-delta">Paid invoices — {new Date().getFullYear()}</div>
            <div className="kpi-spark"><Spark data={[0, 0]} /></div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Outstanding invoices</div>
            <div className="kpi-value" style={{ color: summary && summary.outstandingAmount > 0 ? 'var(--warn)' : undefined }}>
              {summary ? fmt(summary.outstandingAmount) : '—'}
            </div>
            <div className="kpi-delta">{summary ? `${summary.outstandingCount} invoice${summary.outstandingCount !== 1 ? 's' : ''} unpaid` : ''}</div>
            <div className="kpi-spark"><Spark data={[0, 0]} /></div>
          </div>
        </div>

        {/* Applications section */}
        <div className="section-head">
          <div className="section-title">Applications</div>
        </div>

        {settings.dashboardLayout === 'list'
          ? <AppListRows stats={stats} apps={APPS_OPERATIONS} />
          : <AppGridCards stats={stats} apps={APPS_OPERATIONS} />}

        {/* Business Management section */}
        <div className="section-head" style={{ marginTop: 32 }}>
          <div className="section-title">Organisation</div>
        </div>

        {settings.dashboardLayout === 'list'
          ? <AppListRows stats={stats} apps={APPS_MANAGEMENT} />
          : <AppGridCards stats={stats} apps={APPS_MANAGEMENT} />}

        {/* Assets & Operations section */}
        <div className="section-head" style={{ marginTop: 32 }}>
          <div className="section-title">Assets &amp; Operations</div>
        </div>

        {settings.dashboardLayout === 'list'
          ? <AppListRows stats={stats} apps={APPS_ASSETS} />
          : <AppGridCards stats={stats} apps={APPS_ASSETS} />}

        {/* Bottom panels */}
        <div className="panel-grid">
          {/* Project progress */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Project progress</div>
              <Link href="/projects" className="section-action">All projects →</Link>
            </div>
            {state.projects.map(p => {
              const acts = state.activities.filter(a => a.projectId === p.id)
              const doneCount = acts.filter(a => a.status === 'complete').length
              const pct = acts.length > 0 ? Math.round((doneCount / acts.length) * 100) : 0
              return (
                <div key={p.id} className="project-item">
                  <div className="project-top">
                    <div className="project-name">{p.name}</div>
                    <div className="project-meta">${(p.contractValue / 1000).toFixed(1)}k</div>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width: pct + '%' }} /></div>
                  <div className="progress-row"><span>{p.client}</span><span>{doneCount}/{acts.length} activities done</span></div>
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
            {staffOnShift.length === 0 ? (
              <div style={{ padding: '20px 0', color: 'var(--ink-3)', fontSize: 13, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                No crew rostered for today
              </div>
            ) : staffOnShift.map((s, i) => (
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
