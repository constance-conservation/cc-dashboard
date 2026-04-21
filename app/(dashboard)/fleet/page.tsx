'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import type { Vehicle } from '@/lib/types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { L: any }
}

const FLEET_VEHICLES: Vehicle[] = [
  { reg: 'CC-001', make: 'Toyota Hilux', type: '4WD Ute', driver: 'Cameron Ellis', loc: 'Harrington Grove', status: 'ok', km: 84200, service: '2,400 km', lat: -34.0395, lng: 150.7031, speed: 0 },
  { reg: 'CC-002', make: 'Toyota Hilux', type: '4WD Ute', driver: 'Priya Nair', loc: 'Liverpool Site B', status: 'ok', km: 62100, service: '4,800 km', lat: -33.9235, lng: 150.9239, speed: 42 },
  { reg: 'CC-003', make: 'Isuzu D-Max', type: '4WD Tray', driver: "James O'Brien", loc: 'Camden', status: 'warn', km: 118400, service: 'Due in 200 km', lat: -34.0536, lng: 150.6926, speed: 12 },
  { reg: 'CC-004', make: 'Ford Ranger', type: '4WD Ute', driver: 'Marika Tawhai', loc: 'Wollondilly', status: 'ok', km: 41600, service: '6,400 km', lat: -34.2270, lng: 150.5152, speed: 0 },
  { reg: 'CC-005', make: 'Kubota RTV', type: 'ATV', driver: 'Daniel Krauss', loc: 'AWP Reserve', status: 'ok', km: 8400, service: '120 hrs', lat: -34.1650, lng: 150.6400, speed: 0 },
  { reg: 'CC-006', make: 'Iveco Daily', type: 'Crew van', driver: 'Depot', loc: 'Camden Depot', status: 'danger', km: 142000, service: 'Overdue', lat: -34.0591, lng: 150.6983, speed: 0 },
  { reg: 'CC-007', make: 'Toyota Landcruiser', type: '4WD Wagon', driver: 'Cameron Ellis', loc: 'Harrington Grove', status: 'ok', km: 96000, service: '1,200 km', lat: -34.0440, lng: 150.7080, speed: 0 },
]

const STATUS_COLOR: Record<Vehicle['status'], string> = {
  ok: '#4a8a4a',
  warn: '#d99755',
  danger: '#c94c3f',
}

const STATUS_LABEL: Record<Vehicle['status'], string> = {
  ok: 'In service',
  warn: 'Service soon',
  danger: 'Service overdue',
}

function FleetMap({ selectedVehicle, onSelect }: { selectedVehicle: string | null; onSelect: (reg: string) => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null)
  const [leafletReady, setLeafletReady] = useState(typeof window !== 'undefined' && !!window.L)

  useEffect(() => {
    if (window.L) { setLeafletReady(true); return }
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
    css.crossOrigin = ''
    document.head.appendChild(css)
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
    s.crossOrigin = ''
    s.onload = () => setLeafletReady(true)
    document.head.appendChild(s)
  }, [])

  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstance.current) return
    const L = window.L
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView([-34.08, 150.70], 11)
    mapInstance.current = map
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, opacity: 0.7 }).addTo(map)

    FLEET_VEHICLES.forEach(v => {
      const color = STATUS_COLOR[v.status]
      const html = `<div style="position:relative;"><div style="width:16px;height:16px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 0 0 3px ${color}33,0 2px 6px rgba(0,0,0,0.4);"></div>${v.speed > 0 ? `<div style="position:absolute;top:-2px;left:-2px;width:20px;height:20px;border-radius:50%;border:2px solid ${color};animation:pulse 2s infinite;opacity:0.6;"></div>` : ''}</div>`
      const icon = L.divIcon({ className: 'cc-vmarker', html, iconSize: [16, 16], iconAnchor: [8, 8] })
      const m = L.marker([v.lat, v.lng], { icon }).addTo(map)
      m.bindTooltip(`<b>${v.reg}</b> · ${v.make}<br/>${v.driver}${v.speed > 0 ? ' · ' + v.speed + ' km/h' : ''}`, { direction: 'top', offset: [0, -8] })
      m.on('click', () => onSelect(v.reg))
    })
  }, [leafletReady, onSelect])

  useEffect(() => {
    if (!mapInstance.current || !selectedVehicle) return
    const v = FLEET_VEHICLES.find(x => x.reg === selectedVehicle)
    if (v) mapInstance.current.flyTo([v.lat, v.lng], 15, { duration: 0.8 })
  }, [selectedVehicle])

  return (
    <div style={{ position: 'relative', height: 460, border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-sunken)' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {!leafletReady && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Loading satellite…
        </div>
      )}
      <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(20,24,22,0.88)', color: '#fff', padding: '8px 12px', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', backdropFilter: 'blur(8px)', zIndex: 1000, pointerEvents: 'none' }}>
        Live fleet — Greater Sydney · Macarthur region
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(20,24,22,0.88)', color: '#fff', padding: '8px 12px', borderRadius: 8, display: 'flex', gap: 14, fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', backdropFilter: 'blur(8px)', zIndex: 1000, pointerEvents: 'none' }}>
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <span key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {STATUS_LABEL[status as Vehicle['status']]}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function FleetPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)

  const inService = FLEET_VEHICLES.filter(v => v.status !== 'danger').length
  const moving = FLEET_VEHICLES.filter(v => v.speed > 0).length
  const overdue = FLEET_VEHICLES.filter(v => v.status === 'danger').length

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">{inService} of {FLEET_VEHICLES.length} in service · live tracking</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Fleet & Equipment</h2>
      </div>

      <div className="subpage-body">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 20 }}>
          <FleetMap selectedVehicle={selectedVehicle} onSelect={setSelectedVehicle} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="stat-big">
              <div className="lbl">In service</div>
              <div className="num">{inService}<span style={{ fontSize: 28, color: 'var(--ink-3)' }}>/{FLEET_VEHICLES.length}</span></div>
            </div>
            <div className="stat-big">
              <div className="lbl">Currently moving</div>
              <div className="num">{moving}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>live on the map</div>
            </div>
            <div className="stat-big">
              <div className="lbl">Service overdue</div>
              <div className="num" style={{ color: 'var(--danger)' }}>{overdue}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>CC-006</div>
            </div>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr><th>Rego</th><th>Vehicle</th><th>Driver</th><th>Location</th><th>Odometer</th><th>Next service</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {FLEET_VEHICLES.map(v => (
              <tr key={v.reg} style={{ background: selectedVehicle === v.reg ? 'var(--accent-soft)' : undefined }}>
                <td className="mono" style={{ fontWeight: 500, color: 'var(--ink)' }}>{v.reg}</td>
                <td>{v.make} <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>· {v.type}</span></td>
                <td>{v.driver}</td>
                <td>{v.loc} {v.speed > 0 && <span className="pill accent" style={{ marginLeft: 6 }}><span className="dot" />{v.speed} km/h</span>}</td>
                <td className="mono">{v.km.toLocaleString()} km</td>
                <td className="mono">{v.service}</td>
                <td><span className={`pill ${v.status}`}><span className="dot" />{STATUS_LABEL[v.status]}</span></td>
                <td>
                  <button className="btn" onClick={() => setSelectedVehicle(v.reg)} style={{ padding: '4px 10px', fontSize: 12 }}>
                    Locate →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
