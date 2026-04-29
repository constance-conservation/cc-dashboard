type Segment = { value: number; color: string; label: string }

export function Donut({ segments }: { segments: Segment[] }) {
  const visible = segments.filter(s => s.value > 0)
  const total = visible.reduce((s, x) => s + x.value, 0)

  if (total === 0) {
    return <div className="donut-empty" style={{ color: 'var(--ink-3)', fontSize: 13 }}>No data yet</div>
  }

  let offset = 0
  const stops = visible.map(s => {
    const pct = (s.value / total) * 100
    const stop = `${s.color} ${offset}% ${offset + pct}%`
    offset += pct
    return stop
  }).join(', ')

  return (
    <div className="donut-container">
      <div className="donut" style={{ background: `conic-gradient(${stops})` }}>
        <div className="donut-center">
          <div className="value">{total}</div>
          <div className="label">total</div>
        </div>
      </div>
      <div className="donut-legend">
        {visible.map(s => (
          <div key={s.label} className="legend-item">
            <span className="legend-dot" style={{ background: s.color }} />
            {s.label}
            <span className="legend-count">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
