'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCCState } from '@/lib/store/CCStateContext'
import { Icon } from '@/components/icons/Icon'
import { Drawer, Field } from '@/components/dashboard/Drawer'
import type { Employee } from '@/lib/types'

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

function EmployeeCard({ emp, onOpen }: { emp: Employee; onOpen: () => void }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S']
  const keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const availCount = keys.filter(k => emp.availability[k]).length
  return (
    <div className="app-card" onClick={onOpen} style={{ minHeight: 0, gap: 14 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div className="staff-avatar" style={{ width: 44, height: 44, fontSize: 14 }}>{emp.name.split(' ').map(x => x[0]).join('')}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em' }}>{emp.name}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', marginTop: 2 }}>{emp.role} · {emp.type}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>${emp.payRate}/hr</div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-4)', marginBottom: 6 }}>Availability</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {days.map((d, i) => (
            <div key={i} style={{ flex: 1, height: 26, borderRadius: 4, display: 'grid', placeItems: 'center', fontSize: 11, fontFamily: 'var(--font-mono)', background: emp.availability[keys[i]] ? 'var(--accent-soft)' : 'var(--bg-sunken)', color: emp.availability[keys[i]] ? 'var(--accent)' : 'var(--ink-4)', border: '1px solid ' + (emp.availability[keys[i]] ? 'transparent' : 'var(--line)') }}>{d}</div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6 }}>{availCount} days/week available</div>
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
  const emp = state.employees.find(e => e.id === employeeId)!
  const [edit, setEdit] = useState<Employee>(emp)
  const save = () => { state.updateEmployee(emp.id, edit); onClose() }
  const del = () => { if (confirm(`Remove ${emp.name}?`)) { state.deleteEmployee(emp.id); onClose() } }
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  return (
    <Drawer title={emp.name} subtitle={emp.role} onClose={onClose} onSave={save} onDelete={del}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Name"><input className="input" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></Field>
        <Field label="Role">
          <select className="select" value={edit.role} onChange={e => setEdit({ ...edit, role: e.target.value })}>
            {state.roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Employment type">
          <select className="select" value={edit.type} onChange={e => setEdit({ ...edit, type: e.target.value as Employee['type'] })}>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="casual">Casual</option>
            <option value="contractor">Contractor</option>
          </select>
        </Field>
        <Field label="Pay rate (AUD/hr)"><input className="input" type="number" value={edit.payRate} onChange={e => setEdit({ ...edit, payRate: +e.target.value })} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Email"><input className="input" value={edit.email} onChange={e => setEdit({ ...edit, email: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} /></Field>
      </div>
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
  )
}

function AddEmployeeModal({ state, onClose }: { state: ReturnType<typeof useCCState>; onClose: () => void }) {
  const [e, setE] = useState<Omit<Employee, 'id'>>({ name: '', role: state.roles[0] || 'Field Crew', type: 'full-time', payRate: 40, email: '', phone: '', availability: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false }, skills: [] })
  const save = () => { if (!e.name.trim()) return; state.addEmployee(e); onClose() }
  return (
    <Drawer title="New employee" subtitle="Add to team roster" onClose={onClose} onSave={save} saveLabel="Create">
      <Field label="Name"><input className="input" value={e.name} onChange={ev => setE({ ...e, name: ev.target.value })} autoFocus /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Role">
          <select className="select" value={e.role} onChange={ev => setE({ ...e, role: ev.target.value })}>
            {state.roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select className="select" value={e.type} onChange={ev => setE({ ...e, type: ev.target.value as Employee['type'] })}>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="casual">Casual</option>
            <option value="contractor">Contractor</option>
          </select>
        </Field>
      </div>
      <Field label="Pay rate (AUD/hr)"><input className="input" type="number" value={e.payRate} onChange={ev => setE({ ...e, payRate: +ev.target.value })} /></Field>
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

  const visible = state.employees.filter(e =>
    !filter || e.name.toLowerCase().includes(filter.toLowerCase()) || e.role.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">{state.employees.length} team members · {state.skills.length} skills tracked</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Employees</h2>
      </div>

      <div className="subpage-body">
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
          <button className="btn primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={14} /> New employee</button>
          <button className="btn" onClick={() => setShowSkills(true)}>Manage skills ({state.skills.length})</button>
          <button className="btn" onClick={() => setShowRoles(true)}>Manage roles ({state.roles.length})</button>
          <div style={{ flex: 1 }} />
          <input className="input" placeholder="Search name or role…" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 260 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {visible.map(emp => <EmployeeCard key={emp.id} emp={emp} onOpen={() => setSelected(emp.id)} />)}
        </div>
      </div>

      {selected && <EmployeeDrawer employeeId={selected} state={state} onClose={() => setSelected(null)} />}
      {showAdd && <AddEmployeeModal state={state} onClose={() => setShowAdd(false)} />}
      {showSkills && <ListManagerModal title="Master skills list" items={state.skills} onAdd={state.addSkill} onRemove={state.removeSkill} onRename={state.renameSkill} onClose={() => setShowSkills(false)} note="These skills are shared across Projects and Employees. Editing here updates everywhere." />}
      {showRoles && <ListManagerModal title="Master roles list" items={state.roles} onAdd={state.addRole} onRemove={state.removeRole} onRename={state.renameRole} onClose={() => setShowRoles(false)} note="Roles determine scheduling rules (e.g. no two Field Supervisors on the same project per day)." />}
    </div>
  )
}
