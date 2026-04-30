type Bar = { label: string; value: number }

export function BarList({ data, colors }: { data: Bar[]; colors: string[] }) {
  if (!data.length) {
    return <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>No data yet</div>
  }
  const max = data[0]?.value || 1
  return (
    <div>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100
        return (
          <div key={d.label + i} className="bar-row">
            <div className="bar-label" title={d.label}>{d.label}</div>
            <div className="bar-track">
              <div
                className={`bar-fill ${colors[i % colors.length]}`}
                style={{ width: `${pct.toFixed(1)}%` }}
              />
            </div>
            <div className="bar-count">{d.value}</div>
          </div>
        )
      })}
    </div>
  )
}
