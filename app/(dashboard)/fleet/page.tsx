'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { createClient } from '@/lib/supabase/client'
import type { Vehicle, VehicleStatus } from '@/lib/types'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { L: any }
}

const STATUS_COLOR: Record<VehicleStatus, string> = {
  ok:     '#4a8a4a',
  warn:   '#d99755',
  danger: '#c94c3f',
}

const STATUS_LABEL: Record<VehicleStatus, string> = {
  ok:     'In service',
  warn:   'Service soon',
  danger: 'Service overdue',
}

function serviceText(v: Vehicle): string {
  if (!v.nextServiceDueKm) return 'Not scheduled'
  const remaining = Math.round(v.nextServiceDueKm - v.odometerKm)
  if (remaining <= 0) return 'Overdue'
  return `${remaining.toLocaleString()} km`
}

function FleetMap({ vehicles, selectedVehicle, onSelect }: {
  vehicles: Vehicle[]
  selectedVehicle: string | null
  onSelect: (reg: string) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
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

  // Initialise map once
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstance.current) return
    const L = window.L
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView([-34.08, 150.70], 11)
    mapInstance.current = map
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, opacity: 0.7 }).addTo(map)
  }, [leafletReady])

  // Re-draw markers when vehicles change
  useEffect(() => {
    if (!leafletReady || !mapInstance.current) return
    const L = window.L
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    vehicles.filter(v => v.gpsLat != null && v.gpsLon != null).forEach(v => {
      const color = STATUS_COLOR[v.status]
      const html = `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 0 0 3px ${color}33,0 2px 6px rgba(0,0,0,0.4);"></div>`
      const icon = L.divIcon({ className: 'cc-vmarker', html, iconSize: [16, 16], iconAnchor: [8, 8] })
      const marker = L.marker([v.gpsLat, v.gpsLon], { icon }).addTo(mapInstance.current)
      marker.bindTooltip(
        `<b>${v.registration}</b> · ${v.make} ${v.model}<br/>${v.driverName ?? 'Unassigned'}`,
        { direction: 'top', offset: [0, -8] }
      )
      marker.on('click', () => onSelect(v.registration))
      markersRef.current.push(marker)
    })
  }, [leafletReady, vehicles, onSelect])

  // Fly to selected vehicle
  useEffect(() => {
    if (!mapInstance.current || !selectedVehicle) return
    const v = vehicles.find(x => x.registration === selectedVehicle)
    if (v?.gpsLat != null && v?.gpsLon != null) {
      mapInstance.current.flyTo([v.gpsLat, v.gpsLon], 15, { duration: 0.8 })
    }
  }, [selectedVehicle, vehicles])

  return (
    <div style={{ position: 'relative', height: 460, border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-sunken)' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      {!leafletReady && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Loading satellite…
        </div>
      )}
      <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(20,24,22,0.88)', color: '#fff', padding: '8px 12px', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', backdropFilter: 'blur(8px)', zIndex: 1000, pointerEvents: 'none' }}>
        Fleet — Greater Sydney · Macarthur region
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(20,24,22,0.88)', color: '#fff', padding: '8px 12px', borderRadius: 8, display: 'flex', gap: 14, fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', backdropFilter: 'blur(8px)', zIndex: 1000, pointerEvents: 'none' }}>
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <span key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {STATUS_LABEL[status as VehicleStatus]}
          </span>
        ))}
      </div>
    </div>
  )
}

function rowToVehicle(r: Record<string, unknown>, staffMap: Map<string, string>): Vehicle {
  return {
    id:               r.id as string,
    registration:     r.registration as string,
    make:             r.make as string,
    model:            r.model as string,
    type:             r.type as string,
    status:           (r.status as string) as VehicleStatus,
    odometerKm:       r.odometer_km as number,
    lastServiceDate:  r.last_service_date as string | null,
    nextServiceDueKm: r.next_service_due_km as number | null,
    gpsLat:           r.gps_lat as number | null,
    gpsLon:           r.gps_lon as number | null,
    driverName:       r.current_driver_id ? (staffMap.get(r.current_driver_id as string) ?? null) : null,
    active:           r.active as boolean,
  }
}

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
      if (!org) { setLoading(false); return }
      const oid = (org as Record<string, unknown>).id as string

      const [{ data: vehicleRows }, { data: staffRows }] = await Promise.all([
        supabase.from('vehicles').select('*').eq('organization_id', oid).eq('active', true).order('registration'),
        supabase.from('staff').select('id, name').eq('organization_id', oid).eq('active', true),
      ])

      const staffMap = new Map(
        (staffRows ?? []).map(s => {
          const r = s as Record<string, unknown>
          return [r.id as string, r.name as string]
        })
      )

      setVehicles((vehicleRows ?? []).map(r => rowToVehicle(r as Record<string, unknown>, staffMap)))
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  const inService = vehicles.filter(v => v.status !== 'danger').length
  const overdue   = vehicles.filter(v => v.status === 'danger')

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">
          {loading ? 'Fleet & Equipment' : `${inService} of ${vehicles.length} in service`}
        </span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Fleet & Equipment</h2>
      </div>

      <div className="subpage-body">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 20 }}>
          <FleetMap vehicles={vehicles} selectedVehicle={selectedVehicle} onSelect={setSelectedVehicle} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="stat-big">
              <div className="lbl">Total fleet</div>
              <div className="num">{loading ? '—' : vehicles.length}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>registered vehicles</div>
            </div>
            <div className="stat-big">
              <div className="lbl">In service</div>
              <div className="num">{loading ? '—' : inService}<span style={{ fontSize: 28, color: 'var(--ink-3)' }}>/{loading ? '' : vehicles.length}</span></div>
            </div>
            <div className="stat-big">
              <div className="lbl">Service overdue</div>
              <div className="num" style={{ color: overdue.length > 0 ? 'var(--danger)' : 'var(--ink)' }}>
                {loading ? '—' : overdue.length}
              </div>
              {overdue.length > 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>
                  {overdue.map(v => v.registration).join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Loading…</div>
        ) : vehicles.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No vehicles on record</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Rego</th><th>Vehicle</th><th>Driver</th><th>Odometer</th><th>Next service</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} style={{ background: selectedVehicle === v.registration ? 'var(--accent-soft)' : undefined }}>
                  <td className="mono" style={{ fontWeight: 500 }}>{v.registration}</td>
                  <td>{v.make} {v.model} <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>· {v.type}</span></td>
                  <td>{v.driverName ?? <span style={{ color: 'var(--ink-3)' }}>Unassigned</span>}</td>
                  <td className="mono">{v.odometerKm.toLocaleString()} km</td>
                  <td className="mono">{serviceText(v)}</td>
                  <td><span className={`pill ${v.status}`}><span className="dot" />{STATUS_LABEL[v.status]}</span></td>
                  <td>
                    {v.gpsLat != null && v.gpsLon != null && (
                      <button className="btn" onClick={() => setSelectedVehicle(v.registration)} style={{ padding: '4px 10px', fontSize: 12 }}>
                        Locate →
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
