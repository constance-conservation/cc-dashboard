'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCCState } from '@/lib/store/CCStateContext'
import { Icon } from '@/components/icons/Icon'
import { Drawer, Field } from '@/components/dashboard/Drawer'
import { NumericInput } from '@/components/dashboard/NumericInput'
import type { Project } from '@/lib/types'

function CapacityMeter({ label, pct, caption }: { label: string; pct: number; caption: string }) {
  const color = pct > 90 ? 'var(--danger)' : pct > 75 ? 'var(--warn)' : 'var(--accent)'
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1, letterSpacing: '-0.015em', color }}>
          {pct}<span style={{ fontSize: 14 }}>%</span>
        </div>
      </div>
      <div style={{ height: 4, background: 'var(--bg-sunken)', borderRadius: 2, margin: '6px 0', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{caption}</div>
    </div>
  )
}

function SkillsEditor({ selected, allSkills, onChange, onAddSkill }: { selected: string[]; allSkills: string[]; onChange: (s: string[]) => void; onAddSkill: (s: string) => void }) {
  const [newSkill, setNewSkill] = useState('')
  const toggle = (s: string) => {
    if (selected.includes(s)) onChange(selected.filter(x => x !== s))
    else onChange([...selected, s])
  }
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
        <input className="input" placeholder="Add new skill…" value={newSkill} onChange={e => setNewSkill(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" className="btn"><Icon name="plus" size={12} /> Add</button>
      </form>
    </div>
  )
}

function ProjectCard({ project, state, onOpen }: { project: Project; state: ReturnType<typeof useCCState>; onOpen: () => void }) {
  const p = project
  const budgetPct = Math.min(100, Math.round((p.spent / p.budget) * 100))
  const monthKey = state.rosterMonth
  const usedVisits = Object.entries(state.roster).filter(([d, assignments]) =>
    d.startsWith(monthKey) && assignments.some(a => a.projectId === p.id)
  ).length
  const capacityPct = Math.min(100, Math.round((usedVisits / p.visitsPerMonth) * 100))
  const remaining = Math.max(0, p.visitsPerMonth - usedVisits)

  return (
    <div className="app-card" onClick={onOpen} style={{ minHeight: 0 }}>
      <div className="app-card-top">
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 4 }}>{p.client}</div>
          <h3 className="app-name" style={{ fontSize: 22, marginBottom: 2 }}>{p.name}</h3>
        </div>
        <span className={`pill ${p.priority === 'high' ? 'accent' : ''}`}><span className="dot" />{p.priority}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <CapacityMeter label="Budget" pct={budgetPct} caption={`$${(p.spent / 1000).toFixed(1)}k of $${(p.budget / 1000).toFixed(1)}k`} />
        <CapacityMeter label="Visits this month" pct={capacityPct} caption={`${usedVisits} of ${p.visitsPerMonth} · ${remaining} remain`} />
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 6 }}>
        <span>Unit: <b style={{ color: 'var(--ink)' }}>{p.unit}</b></span>
        <span>Crew: <b style={{ color: 'var(--ink)' }}>{p.crewSize}</b></span>
        <span>Allocation: <b style={{ color: 'var(--ink)' }}>{p.monthlyAllocation}{p.unit === 'hours' ? 'h' : 'd'}/mo</b></span>
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
        {(p.skills || []).map(s => <span key={s} className="skill-chip">{s}</span>)}
      </div>
    </div>
  )
}

function ProjectDrawer({ projectId, state, onClose }: { projectId: string; state: ReturnType<typeof useCCState>; onClose: () => void }) {
  const p = state.projects.find(x => x.id === projectId)!
  const [edit, setEdit] = useState<Project>(p)
  const save = () => { state.updateProject(p.id, edit); onClose() }
  const del = () => { if (confirm(`Remove ${p.name}?`)) { state.deleteProject(p.id); onClose() } }
  return (
    <Drawer title={p.name} subtitle={p.client} onClose={onClose} onSave={save} onDelete={del}>
      <Field label="Project name"><input className="input" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} /></Field>
      <Field label="Client"><input className="input" value={edit.client} onChange={e => setEdit({ ...edit, client: e.target.value })} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Start"><input className="input" type="date" value={edit.start} onChange={e => setEdit({ ...edit, start: e.target.value })} /></Field>
        <Field label="End"><input className="input" type="date" value={edit.end} onChange={e => setEdit({ ...edit, end: e.target.value })} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Work unit">
          <select className="select" value={edit.unit} onChange={e => setEdit({ ...edit, unit: e.target.value as 'days' | 'hours' })}>
            <option value="days">Days</option><option value="hours">Hours</option>
          </select>
        </Field>
        <Field label="Priority">
          <select className="select" value={edit.priority} onChange={e => setEdit({ ...edit, priority: e.target.value as Project['priority'] })}>
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label={`Monthly allocation (${edit.unit})`}><NumericInput className="input" value={edit.monthlyAllocation} onChange={v => setEdit({ ...edit, monthlyAllocation: v })} /></Field>
        <Field label="Visits per month"><NumericInput className="input" value={edit.visitsPerMonth} onChange={v => setEdit({ ...edit, visitsPerMonth: v })} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Fixed crew size"><NumericInput className="input" value={edit.crewSize} onChange={v => setEdit({ ...edit, crewSize: v })} /></Field>
        <Field label={`Charge-out rate (per ${edit.unit === 'hours' ? 'hr' : 'day'})`}><NumericInput className="input" value={edit.chargeOutRate} onChange={v => setEdit({ ...edit, chargeOutRate: v })} /></Field>
      </div>
      <Field label="Budget (AUD)"><NumericInput className="input" value={edit.budget} onChange={v => setEdit({ ...edit, budget: v })} /></Field>
      <Field label="Overtime">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={edit.overtimeFlag} onChange={e => setEdit({ ...edit, overtimeFlag: e.target.checked })} /> Allow overtime
          </label>
          <NumericInput className="input" step="0.1" value={edit.overtimeRate} onChange={v => setEdit({ ...edit, overtimeRate: v })} style={{ width: 80 }} disabled={!edit.overtimeFlag} />
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>× rate</span>
        </div>
      </Field>
      <Field label="Required skills">
        <SkillsEditor selected={edit.skills} allSkills={state.skills} onChange={skills => setEdit({ ...edit, skills })} onAddSkill={state.addSkill} />
      </Field>
    </Drawer>
  )
}

function AddProjectModal({ state, onClose }: { state: ReturnType<typeof useCCState>; onClose: () => void }) {
  const [p, setP] = useState<Omit<Project, 'id'>>({ name: '', client: '', start: '', end: '', unit: 'days', monthlyAllocation: 20, visitsPerMonth: 10, crewSize: 3, chargeOutRate: 1000, overtimeFlag: false, overtimeRate: 1.5, priority: 'medium', budget: 20000, spent: 0, skills: [] })
  const save = () => { if (!p.name) return; state.addProject(p); onClose() }
  return (
    <Drawer title="New project" subtitle="Add to projects list" onClose={onClose} onSave={save} saveLabel="Create">
      <Field label="Project name"><input className="input" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} autoFocus /></Field>
      <Field label="Client"><input className="input" value={p.client} onChange={e => setP({ ...p, client: e.target.value })} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Unit">
          <select className="select" value={p.unit} onChange={e => setP({ ...p, unit: e.target.value as 'days' | 'hours' })}>
            <option value="days">Days</option><option value="hours">Hours</option>
          </select>
        </Field>
        <Field label="Monthly allocation"><NumericInput className="input" value={p.monthlyAllocation} onChange={v => setP({ ...p, monthlyAllocation: v })} /></Field>
      </div>
      <Field label="Budget"><NumericInput className="input" value={p.budget} onChange={v => setP({ ...p, budget: v })} /></Field>
    </Drawer>
  )
}

export default function ProjectsPage() {
  const state = useCCState()
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [view, setView] = useState<'grid' | 'table'>('grid')

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">{state.projects.length} active projects · capacity & budget</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Projects</h2>
      </div>

      <div className="subpage-body">
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
          <button className="btn primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={14} /> New project</button>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <div className={`tab ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>Cards</div>
            <div className={`tab ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</div>
          </div>
          <div style={{ flex: 1 }} />
          <input className="input" placeholder="Search projects…" style={{ width: 240 }} />
        </div>

        {view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {state.projects.map(p => <ProjectCard key={p.id} project={p} state={state} onOpen={() => setSelected(p.id)} />)}
          </div>
        ) : (
          <table className="table">
            <thead><tr>
              <th>Project</th><th>Client</th><th>Unit</th><th>Allocation</th><th>Crew</th><th>Budget</th><th>Spent</th><th>Priority</th>
            </tr></thead>
            <tbody>
              {state.projects.map(p => {
                const pct = Math.round((p.spent / p.budget) * 100)
                return (
                  <tr key={p.id} onClick={() => setSelected(p.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td>{p.client}</td>
                    <td className="mono">{p.unit}</td>
                    <td className="mono">{p.monthlyAllocation}{p.unit === 'hours' ? 'h' : 'd'}/mo</td>
                    <td className="mono">{p.crewSize}</td>
                    <td className="mono">${(p.budget / 1000).toFixed(1)}k</td>
                    <td><span style={{ color: pct > 90 ? 'var(--danger)' : pct > 75 ? 'var(--warn)' : 'var(--ink)' }}>{pct}%</span> <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>${(p.spent / 1000).toFixed(1)}k</span></td>
                    <td><span className={`pill ${p.priority === 'high' ? 'accent' : ''}`}><span className="dot" />{p.priority}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {selected && <ProjectDrawer projectId={selected} state={state} onClose={() => setSelected(null)} />}
      {showAdd && <AddProjectModal state={state} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
