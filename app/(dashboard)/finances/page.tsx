'use client'

import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'

type PillVariant = 'accent' | 'warn' | 'danger'

type Invoice = {
  id: string
  client: string
  amount: string
  age: string
  pill: PillVariant
  status: string
}

const INVOICES: Invoice[] = [
  { id: 'INV-2041', client: 'Camden Council', amount: '$24,600', age: '14 days', pill: 'warn', status: 'Overdue' },
  { id: 'INV-2039', client: 'Harrington Grove', amount: '$18,400', age: '9 days', pill: 'accent', status: 'Sent' },
  { id: 'INV-2037', client: 'Liverpool Council', amount: '$14,200', age: '22 days', pill: 'danger', status: 'Overdue 20d+' },
  { id: 'INV-2036', client: 'AWP', amount: '$12,800', age: '4 days', pill: 'accent', status: 'Sent' },
  { id: 'INV-2033', client: 'Wollondilly Shire', amount: '$8,400', age: '11 days', pill: 'accent', status: 'Sent' },
  { id: 'INV-2031', client: 'BGS', amount: '$5,800', age: '31 days', pill: 'danger', status: 'Overdue 30d+' },
]

const CLIENT_REVENUE: [string, number][] = [
  ['NSW NPWS', 42], ['Camden Council', 31], ['Harrington Grove', 28],
  ['Liverpool Council', 22], ['AWP', 18], ['Other', 45],
]

const BILLS: [string, string, string][] = [
  ['Payroll — fortnightly', '26 Apr', '$64,200'],
  ['Fleet — fuel cards', '28 Apr', '$3,880'],
  ['BAS — quarterly', '28 Apr', '$28,400'],
  ['Insurance renewal', '6 May', '$14,600'],
]

function RevenueChart() {
  const data = [62, 71, 68, 82, 79, 94, 88, 102, 98, 112, 118, 124]
  const months = ['M', 'J', 'J', 'A', 'S', 'O', 'N', 'D', 'J', 'F', 'M', 'A']
  const max = 130
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 200, padding: '10px 0 0' }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ width: '100%', height: (v / max * 100) + '%', background: i === data.length - 1 ? 'var(--accent)' : 'var(--accent-soft)', borderRadius: '3px 3px 0 0' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>{months[i]}</div>
        </div>
      ))}
    </div>
  )
}

export default function FinancesPage() {
  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">Cash, revenue & invoicing — Q2 FY26</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Finances</h2>
      </div>

      <div className="subpage-body">
        {/* KPI stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <div className="stat-big">
            <div className="lbl">Cash on hand</div>
            <div className="num">$312k</div>
            <div style={{ fontSize: 12, color: 'var(--ok)', marginTop: 6 }}>+$28k vs last mo.</div>
          </div>
          <div className="stat-big">
            <div className="lbl">MTD revenue</div>
            <div className="num">$186k</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>$840k YTD</div>
          </div>
          <div className="stat-big">
            <div className="lbl">Outstanding</div>
            <div className="num" style={{ color: 'var(--warn)' }}>$84.2k</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>6 invoices</div>
          </div>
          <div className="stat-big">
            <div className="lbl">Margin (YTD)</div>
            <div className="num">22<span style={{ fontSize: 28 }}>%</span></div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>target: 20%</div>
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
              <RevenueChart />
            </div>

            {/* Invoices */}
            <div className="panel" style={{ marginTop: 12 }}>
              <div className="panel-head">
                <div className="panel-title">Outstanding invoices</div>
                <span className="section-action">Chase all →</span>
              </div>
              <table className="table" style={{ border: 'none', borderRadius: 0 }}>
                <thead>
                  <tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Age</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {INVOICES.map(inv => (
                    <tr key={inv.id}>
                      <td className="mono">{inv.id}</td>
                      <td style={{ fontWeight: 500 }}>{inv.client}</td>
                      <td className="mono">{inv.amount}</td>
                      <td className="mono">{inv.age}</td>
                      <td><span className={`pill ${inv.pill}`}><span className="dot" />{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            {/* Revenue by client */}
            <div className="panel">
              <div className="panel-head"><div className="panel-title">Revenue by client — QTD</div></div>
              {CLIENT_REVENUE.map(([name, n]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ flex: 1, fontSize: 13 }}>{name}</div>
                  <div style={{ width: 120, height: 4, background: 'var(--bg-sunken)', borderRadius: 2 }}>
                    <div style={{ width: (n / 45 * 100) + '%', height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', width: 40, textAlign: 'right' }}>${n}k</div>
                </div>
              ))}
            </div>

            {/* Upcoming bills */}
            <div className="panel" style={{ marginTop: 12 }}>
              <div className="panel-head"><div className="panel-title">Upcoming bills</div></div>
              {BILLS.map(([name, date, amount], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--line)', alignItems: 'baseline' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{date}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink)' }}>{amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
