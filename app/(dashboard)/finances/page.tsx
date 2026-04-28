'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { createClient } from '@/lib/supabase/client'

type DbInvoice = {
  id: string
  invoice_number: string | null
  issue_date: string
  due_date: string | null
  paid_date: string | null
  amount: number
  status: string
  clients: { name: string } | null
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

function fmt(n: number): string {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}m`
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function pillFor(inv: DbInvoice): { variant: string; label: string } {
  const today = new Date().toISOString().slice(0, 10)
  if (inv.due_date && inv.due_date < today) {
    const days = daysAgo(inv.due_date)
    return { variant: days > 30 ? 'danger' : 'warn', label: `Overdue ${days}d` }
  }
  if (inv.status === 'draft') return { variant: '', label: 'Draft' }
  return { variant: 'accent', label: 'Sent' }
}

function RevenueChart({ data, months }: { data: number[]; months: string[] }) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 200, padding: '10px 0 0' }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{
              width: '100%',
              height: v > 0 ? (v / max * 100) + '%' : '2px',
              minHeight: v > 0 ? undefined : '2px',
              background: i === data.length - 1 ? 'var(--accent)' : 'var(--accent-soft)',
              borderRadius: '3px 3px 0 0',
            }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>{months[i]}</div>
        </div>
      ))}
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ padding: '24px 0', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {text}
    </div>
  )
}

export default function FinancesPage() {
  const [invoices, setInvoices] = useState<DbInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
      if (!org) { setLoading(false); return }
      const oid = (org as Record<string, unknown>).id as string
      const { data: rows } = await supabase
        .from('invoices')
        .select('id, invoice_number, issue_date, due_date, paid_date, amount, status, clients(name)')
        .eq('organization_id', oid)
        .order('issue_date', { ascending: false })
      setInvoices((rows ?? []) as unknown as DbInvoice[])
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const currentMonth = today.slice(0, 7)
  const currentYear = today.slice(0, 4)
  const now = new Date()

  const outstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
  const paid = invoices.filter(i => i.status === 'paid' && i.paid_date)

  const outstandingTotal = outstanding.reduce((s, i) => s + i.amount, 0)
  const mtdRevenue = paid.filter(i => i.paid_date!.startsWith(currentMonth)).reduce((s, i) => s + i.amount, 0)
  const ytdRevenue = paid.filter(i => i.paid_date!.startsWith(currentYear)).reduce((s, i) => s + i.amount, 0)

  // Revenue chart — last 12 months
  const monthKeys = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return d.toISOString().slice(0, 7)
  })
  const monthLabels = monthKeys.map(k =>
    new Date(k + '-01').toLocaleString('en-AU', { month: 'short' }).slice(0, 1)
  )
  const chartData = monthKeys.map(k =>
    paid.filter(i => i.paid_date!.startsWith(k)).reduce((s, i) => s + i.amount, 0) / 1000
  )

  // Revenue by client — YTD paid invoices
  const revenueByClient = Object.entries(
    paid
      .filter(i => i.paid_date!.startsWith(currentYear))
      .reduce<Record<string, number>>((acc, i) => {
        const name = i.clients?.name ?? 'Unknown'
        acc[name] = (acc[name] ?? 0) + i.amount
        return acc
      }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxClient = Math.max(...revenueByClient.map(([, v]) => v), 1)

  const fyLabel = now.getMonth() >= 6 ? `FY${now.getFullYear() + 1}` : `FY${now.getFullYear()}`

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Revenue & invoicing — {fyLabel}</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Finances</h2>
      </div>

      <div className="subpage-body">
        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <div className="stat-big">
            <div className="lbl">Outstanding</div>
            <div className="num" style={{ color: outstandingTotal > 0 ? 'var(--warn)' : 'var(--ink)' }}>
              {loading ? '—' : fmt(outstandingTotal)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
              {loading ? '' : `${outstanding.length} invoice${outstanding.length !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div className="stat-big">
            <div className="lbl">MTD revenue</div>
            <div className="num">{loading ? '—' : fmt(mtdRevenue)}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
              {now.toLocaleString('en-AU', { month: 'long' })}
            </div>
          </div>
          <div className="stat-big">
            <div className="lbl">YTD revenue</div>
            <div className="num">{loading ? '—' : fmt(ytdRevenue)}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>{fyLabel}</div>
          </div>
          <div className="stat-big">
            <div className="lbl">Invoices on record</div>
            <div className="num">{loading ? '—' : invoices.length}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
              {paid.length} paid · {outstanding.length} outstanding
            </div>
          </div>
        </div>

        <div className="two-col">
          <div>
            {/* Revenue chart */}
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Revenue — last 12 months</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>AUD · monthly</div>
              </div>
              {loading
                ? <div style={{ height: 200, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 12 }}>Loading…</div>
                : chartData.every(v => v === 0)
                  ? <div style={{ height: 200, display: 'grid', placeItems: 'center' }}><Empty text="No paid invoices on record" /></div>
                  : <RevenueChart data={chartData} months={monthLabels} />
              }
            </div>

            {/* Outstanding invoices */}
            <div className="panel" style={{ marginTop: 12 }}>
              <div className="panel-head">
                <div className="panel-title">Outstanding invoices</div>
              </div>
              {loading
                ? <Empty text="Loading…" />
                : outstanding.length === 0
                  ? <Empty text="No outstanding invoices" />
                  : (
                    <table className="table" style={{ border: 'none', borderRadius: 0 }}>
                      <thead>
                        <tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Age</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {outstanding.map(inv => {
                          const { variant, label } = pillFor(inv)
                          return (
                            <tr key={inv.id}>
                              <td className="mono">{inv.invoice_number ?? inv.id.slice(0, 8).toUpperCase()}</td>
                              <td style={{ fontWeight: 500 }}>{inv.clients?.name ?? '—'}</td>
                              <td className="mono">{fmt(inv.amount)}</td>
                              <td className="mono">{daysAgo(inv.issue_date)}d</td>
                              <td><span className={`pill ${variant}`}><span className="dot" />{label}</span></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )
              }
            </div>
          </div>

          <div>
            {/* Revenue by client */}
            <div className="panel">
              <div className="panel-head"><div className="panel-title">Revenue by client — YTD</div></div>
              {loading
                ? <Empty text="Loading…" />
                : revenueByClient.length === 0
                  ? <Empty text="No paid invoices yet" />
                  : revenueByClient.map(([name, amount]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ flex: 1, fontSize: 13 }}>{name}</div>
                      <div style={{ width: 120, height: 4, background: 'var(--bg-sunken)', borderRadius: 2 }}>
                        <div style={{ width: (amount / maxClient * 100) + '%', height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', width: 52, textAlign: 'right' }}>{fmt(amount)}</div>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
