type Props = {
  label: string
  value: string | number
  sub?: string
  accent?: string
}

export function KpiTile({ label, value, sub, accent }: Props) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={accent ? { color: accent } : undefined}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}
