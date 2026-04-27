'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { createClient } from '@/lib/supabase/client'

type DbTender = {
  id: string
  name: string
  value: number
  stage: string
  due_date: string | null
  submitted_date: string | null
  awarded_date: string | null
  notes: string | null
  clients: { name: string } | null
}

type TenderStatus = 'live' | 'won' | 'lost'

function statusFromStage(stage: string): TenderStatus {
  const s = stage.toLowerCase()
  if (s === 'awarded') return 'won'
  if (s === 'not selected' || s === 'unsuccessful' || s === 'declined') return 'lost'
  return 'live'
}

function fmt(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}m`
  if (n >= 1000) return `$${Math.round(n / 1000)}k`
  return `$${n.toFixed(0)}`
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {text}
    </div>
  )
}

export default function TenderingPage() {
  const [tenders, setTenders] = useState<DbTender[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TenderStatus | 'all'>('live')

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
      if (!org) { setLoading(false); return }
      const oid = (org as Record<string, unknown>).id as string
      const { data: rows } = await supabase
        .from('tenders')
        .select('id, name, value, stage, due_date, submitted_date, awarded_date, notes, clients(name)')
        .eq('organization_id', oid)
        .order('created_at', { ascending: false })
      setTenders((rows ?? []) as unknown as DbTender[])
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  const withStatus = tenders.map(t => ({ ...t, status: statusFromStage(t.stage) }))
  const live = withStatus.filter(t => t.status === 'live')
  const won  = withStatus.filter(t => t.status === 'won')
  const lost = withStatus.filter(t => t.status === 'lost')
  const filtered = withStatus.filter(t => tab === 'all' || t.status === tab)

  const livePipeline = live.reduce((s, t) => s + t.value, 0)
  const resolved = won.length + lost.length
  const winRate = resolved > 0 ? Math.round((won.length / resolved) * 100) : null
  const avgWon = won.length > 0 ? Math.round(won.reduce((s, t) => s + t.value, 0) / won.length) : null

  const nextDeadline = live
    .filter(t => t.due_date)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0] ?? null

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
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
          <div className="stat-big">
            <div className="lbl">Live pipeline</div>
            <div className="num">{loading ? '—' : fmt(livePipeline)}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
              {loading ? '' : `${live.length} active`}
            </div>
          </div>
          <div className="stat-big">
            <div className="lbl">Win rate</div>
            <div className="num">
              {loading ? '—' : winRate !== null ? <>{winRate}<span style={{ fontSize: 28 }}>%</span></> : '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
              {resolved > 0 ? `${won.length} of ${resolved} resolved` : 'No resolved tenders'}
            </div>
          </div>
          <div className="stat-big">
            <div className="lbl">Avg. contract (won)</div>
            <div className="num">{loading ? '—' : avgWon !== null ? fmt(avgWon) : '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
              {won.length > 0 ? `${won.length} won` : 'No won tenders'}
            </div>
          </div>
          <div className="stat-big">
            <div className="lbl">Next deadline</div>
            <div className="num" style={{ fontSize: 32 }}>
              {loading ? '—' : nextDeadline ? fmtDate(nextDeadline.due_date) : '—'}
            </div>
            <div style={{ fontSize: 12, color: nextDeadline ? 'var(--warn)' : 'var(--ink-3)', marginTop: 6 }}>
              {loading ? '' : nextDeadline ? nextDeadline.name : 'No upcoming deadlines'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {(['live', 'won', 'lost', 'all'] as const).map(t => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
              {t === 'live' && !loading ? ` (${live.length})` : ''}
            </div>
          ))}
        </div>

        {loading ? (
          <Empty text="Loading…" />
        ) : filtered.length === 0 ? (
          <Empty text="No tenders found" />
        ) : (
          <table className="table">
            <thead>
              <tr><th>Title</th><th>Client</th><th>Value</th><th>Stage</th><th>Due</th></tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.name}</td>
                  <td>{t.clients?.name ?? '—'}</td>
                  <td className="mono">{fmt(t.value)}</td>
                  <td>
                    <span className={`pill ${t.status === 'won' ? 'ok' : t.status === 'lost' ? 'danger' : 'accent'}`}>
                      <span className="dot" />{t.stage}
                    </span>
                  </td>
                  <td className="mono">{fmtDate(t.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
