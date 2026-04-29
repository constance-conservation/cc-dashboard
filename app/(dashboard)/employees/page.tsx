'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useCCState } from '@/lib/store/CCStateContext'
import { Icon } from '@/components/icons/Icon'
import { Drawer, Field } from '@/components/dashboard/Drawer'
import { Select } from '@/components/dashboard/Select'
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog'
import { NumericInput } from '@/components/dashboard/NumericInput'
import type { Employee } from '@/lib/types'

const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'casual', label: 'Casual' },
  { value: 'contractor', label: 'Contractor' },
]

function SkillsEditor({ selected, allSkills, onChange, onAddSkill }: { selected: string[]; allSkills: string[]; onChange: (s: string[]) => void; onAddSkill: (s: string) => void }) {
  const [newSkill, setNewSkill] = useState('')
  const toggle = (s: string) => selected.includes(s) ? onChange(selected.filter(x => x !== s)) : onChange([...selected, s])
  const addNew = (e: React.FormEvent) => {
    e.preventDefault()
    const s = newSkill.trim()
    if (!s) return
    onAddSkill(s)
    if (!selected.includes(s)) onChange([...selected, s])
    setNewSkill('')
  }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {allSkills.map(s => (
          <button key={s} type="button" onClick={() => toggle(s)} className={`skill-chip toggleable${selected.includes(s) ? ' on' : ''}`}>
            {selected.includes(s) && <Icon name="check" size={10} />} {s}
          </button>
        ))}
      </div>
      <form onSubmit={addNew} style={{ display: 'flex', gap: 6 }}>
        <input className="input" placeholder="Add new skill to master list…" value={newSkill} onChange={e => setNewSkill(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" className="btn"><Icon name="plus" size={12} /> Add</button>
      </form>
    </div>
  )
}

function ListManagerModal({ title, items, onAdd, onRemove, onRename, onClose, note }: { title: string; items: string[]; onAdd: (s: string) => void; onRemove: (s: string) => void; onRename?: (o: string, n: string) => void; onClose: () => void; note?: string }) {
  const [val, setVal] = useState('')
  const [editingIdx, setEditingIdx] = useState(-1)
  const [editVal, setEditVal] = useState('')
  const startEdit = (i: number, name: string) => { setEditingIdx(i); setEditVal(name) }
  const commitEdit = (oldName: string) => {
    if (editVal.trim() && editVal !== oldName && onRename) onRename(oldName, editVal.trim())
    setEditingIdx(-1)
  }
  return (
    <Drawer title={title} subtitle={note} onClose={onClose} saveLabel="Done" onSave={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (val.trim()) { onAdd(val.trim()); setVal('') } }} style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input className="input" placeholder="Add new…" value={val} onChange={e => setVal(e.target.value)} style={{ flex: 1 }} autoFocus />
        <button type="submit" className="btn primary"><Icon name="plus" size={12} /> Add</button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-sunken)', borderRadius: 6 }}>
            {editingIdx === i ? (
              <input className="input" value={editVal} onChange={e => setEditVal(e.target.value)} autoFocus
                onBlur={() => commitEdit(s)}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(s); if (e.key === 'Escape') setEditingIdx(-1) }}
                style={{ flex: 1, fontSize: 13 }} />
            ) : (
              <span style={{ flex: 1, fontSize: 13 }} onDoubleClick={() => startEdit(i, s)}>{s}</span>
            )}
            {onRename && editingIdx !== i && <button className="iconbtn" onClick={() => startEdit(i, s)} style={{ color: 'var(--ink-3)' }}><Icon name="edit" size={13} /></button>}
            <button className="iconbtn" onClick={() => onRemove(s)} style={{ color: 'var(--ink-3)' }}><Icon name="trash" size={14} /></button>
          </div>
        ))}
      </div>
    </Drawer>
  )
}

function EmpLocationPickerModal({ initialLat, initialLng, onConfirm, onClose }: {
  initialLat?: number
  initialLng?: number
  onConfirm: (lat: number, lng: number) => void
  onClose: () => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null)
  const [leafletReady, setLeafletReady] = useState(typeof window !== 'undefined' && !!(window as any).L)
  const [picked, setPicked] = useState<{ lat: number; lng: number } | undefined>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : undefined
  )

  useEffect(() => {
    if ((window as any).L) { setLeafletReady(true); return }
    const css = document.createElement('link'); css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='; css.crossOrigin = ''
    document.head.appendChild(css)
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='; s.crossOrigin = ''
    s.onload = () => setLeafletReady(true); document.head.appendChild(s)
  }, [])

  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstance.current) return
    const L = (window as any).L
    const center: [number, number] = initialLat != null && initialLng != null ? [initialLat, initialLng] : [-33.87, 151.21]
    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView(center, initialLat != null ? 13 : 8)
    mapInstance.current = map
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }).addTo(map)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, opacity: 0.7 }).addTo(map)
    if (initialLat != null && initialLng != null) markerRef.current = L.marker([initialLat, initialLng]).addTo(map)
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng
      if (markerRef.current) markerRef.current.remove()
      markerRef.current = L.marker([lat, lng]).addTo(map)
      setPicked({ lat, lng })
    })
  }, [leafletReady])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'oklch(0.1 0.01 150 / 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 520, maxWidth: '95vw', background: 'var(--bg-elev)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 48px rgba(0,0,0,0.45)', border: '1px solid var(--line)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>Set home location</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Click to mark where this employee lives</div>
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        <div style={{ position: 'relative', height: 280, margin: '12px 12px 0', borderRadius: 8, overflow: 'hidden' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {!leafletReady && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Loading map…</div>}
        </div>
        <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: picked ? 'var(--ink-2)' : 'var(--ink-3)' }}>
            {picked ? `${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}` : 'No location selected'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn primary" disabled={!picked} onClick={() => picked && onConfirm(picked.lat, picked.lng)}>Confirm location</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmployeeCard({ emp, onOpen, onUnarchive }: {
  emp: Employee
  onOpen?: () => void
  onUnarchive?: () => void
}) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S']
  const keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const availCount = keys.filter(k => emp.availability[k]).length
  const isArchived = !!onUnarchive
  return (
    <div className="app-card" onClick={onOpen} style={{ minHeight: 0, gap: 14, cursor: onOpen ? 'pointer' : 'default', opacity: isArchived ? 0.75 : 1 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div className="staff-avatar" style={{ width: 44, height: 44, fontSize: 14 }}>{emp.name.split(' ').map(x => x[0]).join('')}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em' }}>{emp.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginTop: 2 }}>{emp.type}</div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>${emp.payRate}/hr</div>
          {onUnarchive && (
            <button
              className="btn"
              title="Restore employee"
              onClick={e => { e.stopPropagation(); onUnarchive() }}
              style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Icon name="unarchive" size={12} /> Restore
            </button>
          )}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-4)', marginBottom: 6 }}>Availability</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {days.map((d, i) => (
            <div key={i} style={{ flex: 1, height: 26, borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 11, fontFamily: 'var(--font-mono)', background: emp.availability[keys[i]] ? 'var(--accent-soft)' : 'var(--bg-sunken)', color: emp.availability[keys[i]] ? 'var(--accent)' : 'var(--ink-4)', border: '1px solid ' + (emp.availability[keys[i]] ? 'transparent' : 'var(--line)') }}>{d}</div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>{isArchived ? 'Archived — not available for rostering' : `${availCount} days/week available`}</div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-4)', marginBottom: 6 }}>Skills ({emp.skills.length})</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {emp.skills.slice(0, 4).map(s => <span key={s} className="skill-chip">{s}</span>)}
          {emp.skills.length > 4 && <span className="skill-chip" style={{ opacity: 0.6 }}>+{emp.skills.length - 4}</span>}
        </div>
      </div>
    </div>
  )
}

function EmployeeDrawer({ employeeId, state, onClose }: { employeeId: string; state: ReturnType<typeof useCCState>; onClose: () => void }) {
  const emp = state.employees.find(e => e.id === employeeId) ?? state.archivedEmployees.find(e => e.id === employeeId)
  if (!emp) return null
  const isArchived = !state.employees.find(e => e.id === employeeId)
  const [edit, setEdit] = useState<Employee>(emp)
  const [confirm, setConfirm] = useState<'delete' | 'archive' | null>(null)
  const [showHomePicker, setShowHomePicker] = useState(false)
  const save = () => { state.updateEmployee(emp.id, edit); onClose() }
  const del = () => setConfirm('delete')
  const archive = () => setConfirm('archive')
  const restore = () => { state.unarchiveEmployee(emp.id); onClose() }
  const handleConfirm = () => {
    if (confirm === 'delete') { state.deleteEmployee(emp.id); onClose() }
    if (confirm === 'archive') { state.archiveEmployee(emp.id); onClose() }
    setConfirm(null)
  }
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  return (
    <>
    {confirm === 'delete' && (
      <ConfirmDialog
        title={`Delete ${emp.name}?`}
        message="This is permanent and cannot be undone. All roster history referencing this employee will be retained, but the employee will no longer appear anywhere in the system."
        confirmLabel="Delete permanently"
        danger
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    )}
    {confirm === 'archive' && (
      <ConfirmDialog
        title={`Archive ${emp.name}?`}
        message="They will be cleared from availability and removed from future rostering. You can restore them at any time from the Archived section."
        confirmLabel="Archive"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    )}
    <Drawer
      title={emp.name}
      subtitle={isArchived ? 'Archived employee' : undefined}
      onClose={onClose}
      onSave={save}
      onDelete={del}
      onArchive={isArchived ? undefined : archive}
      onRestore={isArchived ? restore : undefined}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Name"><input className="input" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></Field>
        <Field label="Role">
          <Select value={edit.role} onChange={v => setEdit({ ...edit, role: v })} options={state.roles.map(r => ({ value: r, label: r }))} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Employment type">
          <Select value={edit.type} onChange={v => setEdit({ ...edit, type: v as Employee['type'] })} options={EMPLOYMENT_TYPES} />
        </Field>
        <Field label="Pay rate (AUD/hr)"><NumericInput className="input" value={edit.payRate} onChange={v => setEdit({ ...edit, payRate: v })} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Email"><input className="input" value={edit.email} onChange={e => setEdit({ ...edit, email: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} /></Field>
      </div>
      <Field label="Home address (optional)">
        <input className="input" placeholder="e.g. 12 Smith St, Camden NSW 2570"
          value={edit.address ?? ''}
          onChange={e => setEdit({ ...edit, address: e.target.value || undefined })} />
      </Field>
      <Field label="Home location">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {edit.homeLat != null ? (
            <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
              {edit.homeLat.toFixed(5)}, {edit.homeLng?.toFixed(5)}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Not set</span>
          )}
          <button type="button" className="btn" style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => setShowHomePicker(true)}>
            {edit.homeLat != null ? 'Edit' : 'Set location'}
          </button>
          {edit.homeLat != null && (
            <button type="button" className="iconbtn" style={{ color: 'var(--danger)' }}
              onClick={() => setEdit({ ...edit, homeLat: undefined, homeLng: undefined })}>
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
      </Field>
      <Field label="Weekly availability">
        <div style={{ display: 'flex', gap: 4 }}>
          {days.map(d => (
            <label key={d} style={{ flex: 1, height: 40, display: 'grid', placeItems: 'center', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', background: edit.availability[d] ? 'var(--accent-soft)' : 'var(--bg-sunken)', color: edit.availability[d] ? 'var(--accent)' : 'var(--ink-3)', border: '1px solid ' + (edit.availability[d] ? 'var(--accent)' : 'var(--line)'), borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
              <input type="checkbox" checked={edit.availability[d]} onChange={e => setEdit({ ...edit, availability: { ...edit.availability, [d]: e.target.checked } })} style={{ display: 'none' }} />
              {d.slice(0, 3)}
            </label>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>Saturday only appears in the roster if at least one employee has it ticked.</div>
      </Field>
      <Field label={`Skills (${edit.skills.length})`}>
        <SkillsEditor selected={edit.skills} allSkills={state.skills} onChange={skills => setEdit({ ...edit, skills })} onAddSkill={state.addSkill} />
      </Field>
    </Drawer>
    {showHomePicker && (
      <EmpLocationPickerModal
        initialLat={edit.homeLat}
        initialLng={edit.homeLng}
        onConfirm={(lat, lng) => { setEdit({ ...edit, homeLat: lat, homeLng: lng }); setShowHomePicker(false) }}
        onClose={() => setShowHomePicker(false)}
      />
    )}
    </>
  )
}

function AddEmployeeModal({ state, onClose }: { state: ReturnType<typeof useCCState>; onClose: () => void }) {
  const [e, setE] = useState<Omit<Employee, 'id'>>({ name: '', role: state.roles[0] || 'Field Crew', type: 'full-time', payRate: 40, email: '', phone: '', availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false }, skills: [], address: undefined, homeLat: undefined, homeLng: undefined })
  const [showHomePicker, setShowHomePicker] = useState(false)
  const save = () => { if (!e.name.trim()) return; state.addEmployee(e); onClose() }
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  return (
    <Drawer title="New employee" subtitle="Add to team roster" onClose={onClose} onSave={save} saveLabel="Create">
      <Field label="Name"><input className="input" value={e.name} onChange={ev => setE({ ...e, name: ev.target.value })} autoFocus /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Role">
          <Select value={e.role} onChange={v => setE({ ...e, role: v })} options={state.roles.map(r => ({ value: r, label: r }))} />
        </Field>
        <Field label="Type">
          <Select value={e.type} onChange={v => setE({ ...e, type: v as Employee['type'] })} options={EMPLOYMENT_TYPES} />
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Email"><input className="input" type="email" placeholder="email@example.com" value={e.email} onChange={ev => setE({ ...e, email: ev.target.value })} /></Field>
        <Field label="Phone"><input className="input" type="tel" placeholder="04xx xxx xxx" value={e.phone} onChange={ev => setE({ ...e, phone: ev.target.value })} /></Field>
      </div>
      <Field label="Home address (optional)">
        <input className="input" placeholder="e.g. 12 Smith St, Camden NSW 2570"
          value={e.address ?? ''}
          onChange={ev => setE({ ...e, address: ev.target.value || undefined })} />
      </Field>
      <Field label="Home location">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {e.homeLat != null ? (
            <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
              {e.homeLat.toFixed(5)}, {e.homeLng?.toFixed(5)}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>Not set</span>
          )}
          <button type="button" className="btn" style={{ fontSize: 12, padding: '4px 10px' }}
            onClick={() => setShowHomePicker(true)}>
            {e.homeLat != null ? 'Edit' : 'Set location'}
          </button>
          {e.homeLat != null && (
            <button type="button" className="iconbtn" style={{ color: 'var(--danger)' }}
              onClick={() => setE({ ...e, homeLat: undefined, homeLng: undefined })}>
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
      </Field>
      {showHomePicker && (
        <EmpLocationPickerModal
          initialLat={e.homeLat}
          initialLng={e.homeLng}
          onConfirm={(lat, lng) => { setE({ ...e, homeLat: lat, homeLng: lng }); setShowHomePicker(false) }}
          onClose={() => setShowHomePicker(false)}
        />
      )}
      <Field label="Pay rate (AUD/hr)"><NumericInput className="input" value={e.payRate} onChange={v => setE({ ...e, payRate: v })} /></Field>
      <Field label="Weekly availability">
        <div style={{ display: 'flex', gap: 4 }}>
          {days.map(d => (
            <label key={d} style={{ flex: 1, height: 40, display: 'grid', placeItems: 'center', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', background: e.availability[d] ? 'var(--accent-soft)' : 'var(--bg-sunken)', color: e.availability[d] ? 'var(--accent)' : 'var(--ink-3)', border: '1px solid ' + (e.availability[d] ? 'var(--accent)' : 'var(--line)'), borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
              <input type="checkbox" checked={e.availability[d]} onChange={ev => setE({ ...e, availability: { ...e.availability, [d]: ev.target.checked } })} style={{ display: 'none' }} />
              {d}
            </label>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>Saturday only appears in the roster if at least one employee has it ticked.</div>
      </Field>
      <Field label={`Skills (${e.skills.length})`}>
        <SkillsEditor selected={e.skills} allSkills={state.skills} onChange={skills => setE({ ...e, skills })} onAddSkill={state.addSkill} />
      </Field>
    </Drawer>
  )
}

export default function EmployeesPage() {
  const state = useCCState()
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showSkills, setShowSkills] = useState(false)
  const [showRoles, setShowRoles] = useState(false)
  const [filter, setFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')

  const visible = state.employees.filter(e =>
    !filter || e.name.toLowerCase().includes(filter.toLowerCase()) || e.role.toLowerCase().includes(filter.toLowerCase())
  )
  const visibleArchived = state.archivedEmployees.filter(e =>
    !filter || e.name.toLowerCase().includes(filter.toLowerCase()) || e.role.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">{activeTab === 'active' ? `${state.employees.length} active · ${state.skills.length} skills tracked` : `${state.archivedEmployees.length} archived`}</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Employees</h2>
      </div>

      <div className="subpage-body">
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
          {activeTab === 'active' && <button className="btn primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={14} /> New employee</button>}
          <button className="btn" onClick={() => setShowSkills(true)}>Manage skills ({state.skills.length})</button>
          <button className="btn" onClick={() => setShowRoles(true)}>Manage roles ({state.roles.length})</button>
          <button style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: activeTab === 'active' ? 'var(--accent-soft)' : 'transparent', color: activeTab === 'active' ? 'var(--accent)' : 'var(--ink-3)', border: '1px solid ' + (activeTab === 'active' ? 'var(--accent)' : 'transparent') }} onClick={() => setActiveTab('active')}>Active</button>
          <button style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: activeTab === 'archived' ? 'var(--accent-soft)' : 'transparent', color: activeTab === 'archived' ? 'var(--accent)' : 'var(--ink-3)', border: '1px solid ' + (activeTab === 'archived' ? 'var(--accent)' : 'transparent') }} onClick={() => setActiveTab('archived')}>Archived</button>
          <div style={{ flex: 1 }} />
          <input className="input" placeholder="Search name or role…" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 260 }} />
        </div>

        {activeTab === 'active' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {visible.map(emp => (
              <EmployeeCard key={emp.id} emp={emp} onOpen={() => setSelected(emp.id)} />
            ))}
            {visible.length === 0 && (
              <div style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                No employees match
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
            {visibleArchived.map(emp => (
              <EmployeeCard
                key={emp.id}
                emp={emp}
                onOpen={() => setSelected(emp.id)}
                onUnarchive={() => state.unarchiveEmployee(emp.id)}
              />
            ))}
            {visibleArchived.length === 0 && (
              <div style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                No archived employees
              </div>
            )}
          </div>
        )}
      </div>

      {selected && <EmployeeDrawer employeeId={selected} state={state} onClose={() => setSelected(null)} />}
      {showAdd && <AddEmployeeModal state={state} onClose={() => setShowAdd(false)} />}
      {showSkills && <ListManagerModal title="Master skills list" items={state.skills} onAdd={state.addSkill} onRemove={state.removeSkill} onRename={state.renameSkill} onClose={() => setShowSkills(false)} note="These skills are shared across Projects and Employees. Editing here updates everywhere." />}
      {showRoles && <ListManagerModal title="Master roles list" items={state.roles} onAdd={state.addRole} onRemove={state.removeRole} onRename={state.renameRole} onClose={() => setShowRoles(false)} note="Roles determine scheduling rules (e.g. no two Field Supervisors on the same project per day)." />}
    </div>
  )
}
