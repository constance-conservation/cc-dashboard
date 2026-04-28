'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCCState } from '@/lib/store/CCStateContext'
import { Icon } from '@/components/icons/Icon'
import { Drawer, Field } from '@/components/dashboard/Drawer'
import { Select } from '@/components/dashboard/Select'
import { NumericInput } from '@/components/dashboard/NumericInput'
import { InfoTooltip } from '@/components/dashboard/InfoTooltip'
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog'
import { createClient } from '@/lib/supabase/client'
import type { Project, Site, Activity, Priority, WorkUnit, AllocationStrategy, CrewSizeType, ActivityStatus } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function projectSites(state: ReturnType<typeof useCCState>, projectId: string): Site[] {
  const ids = new Set(state.projectSiteLinks.filter(l => l.projectId === projectId).map(l => l.siteId))
  return state.sites.filter(s => ids.has(s.id))
}

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]
const UNIT_OPTIONS = [
  { value: 'days', label: 'Days' },
  { value: 'hours', label: 'Hours' },
]
const ALLOCATION_OPTIONS = [
  { value: 'even', label: 'Even spread' },
  { value: 'custom', label: 'Custom (per month)' },
]
const CREW_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'range', label: 'Range' },
  { value: 'any', label: 'Any' },
]
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'complete', label: 'Complete' },
  { value: 'on_hold', label: 'On hold' },
]

// ── SkillsEditor ───────────────────────────────────────────────────────────────

function SkillsEditor({ selected, allSkills, onChange, onAddSkill }: {
  selected: string[]
  allSkills: string[]
  onChange: (s: string[]) => void
  onAddSkill: (s: string) => void
}) {
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
          <button key={s} type="button" onClick={() => toggle(s)}
            className={`skill-chip toggleable${selected.includes(s) ? ' on' : ''}`}>
            {selected.includes(s) && <Icon name="check" size={10} />} {s}
          </button>
        ))}
      </div>
      <form onSubmit={addNew} style={{ display: 'flex', gap: 6 }}>
        <input className="input" placeholder="Add new skill…" value={newSkill}
          onChange={e => setNewSkill(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" className="btn"><Icon name="plus" size={12} /> Add</button>
      </form>
    </div>
  )
}

// ── SiteSearchDropdown ─────────────────────────────────────────────────────────

function SiteSearchDropdown({ linkedIds, allOrgSites, onLink, onCreateAndLink }: {
  linkedIds: Set<string>
  allOrgSites: Site[]
  onLink: (siteId: string) => void
  onCreateAndLink: (name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const q = query.trim().toLowerCase()
  const available = allOrgSites.filter(s => !linkedIds.has(s.id))
  const filtered = q === '' ? available : available.filter(s => s.name.toLowerCase().includes(q))
  const exactMatch = q !== '' && allOrgSites.some(s => s.name.toLowerCase() === q)
  const showCreate = q !== '' && !exactMatch
  const showDropdown = open && (filtered.length > 0 || showCreate)

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        className="input"
        placeholder={available.length === 0 ? 'All locations linked — type to create new…' : 'Search locations or add new…'}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        style={{ width: '100%' }}
      />
      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-elev)', border: '1px solid var(--line)',
          borderRadius: 10, boxShadow: '0 8px 24px oklch(0.18 0.015 150 / 0.12)',
          maxHeight: 220, overflowY: 'auto',
        }}>
          {filtered.map((s, i) => (
            <button key={s.id} type="button"
              onClick={() => { onLink(s.id); setQuery(''); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', fontSize: 13,
                background: 'transparent', color: 'var(--ink)', cursor: 'pointer', border: 'none',
                borderBottom: i < filtered.length - 1 || showCreate ? '1px solid var(--line)' : 'none',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-sunken)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >{s.name}</button>
          ))}
          {showCreate && (
            <button type="button"
              onClick={() => { onCreateAndLink(query.trim()); setQuery(''); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '9px 14px', fontSize: 13,
                background: 'transparent', color: 'var(--accent)', cursor: 'pointer', border: 'none', fontWeight: 500,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-soft)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >+ Create "{query.trim()}"</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── ActivityDrawer ─────────────────────────────────────────────────────────────

type ActivityFormState = Omit<Activity, 'id'>

function emptyActivity(projectId: string): ActivityFormState {
  return {
    projectId,
    siteId: undefined,
    activityTypeId: undefined,
    name: '',
    allocationStrategy: 'even',
    unit: 'days',
    totalAllocation: 0,
    unitsCompleted: 0,
    crewSizeType: 'fixed',
    minCrew: 1,
    maxCrew: undefined,
    chargeOutRate: 0,
    overtimeFlag: false,
    overtimeRate: 1.5,
    skills: [],
    priority: 'medium',
    status: 'active',
    start: '',
    end: '',
    notes: undefined,
    sortOrder: 0,
  }
}

function ActivityDrawer({ projectId, activityId, state, onClose }: {
  projectId: string
  activityId: string | null
  state: ReturnType<typeof useCCState>
  onClose: () => void
}) {
  const existing = activityId ? state.activities.find(a => a.id === activityId) : null
  const [form, setForm] = useState<ActivityFormState>(existing ? { ...existing } : emptyActivity(projectId))
  const [confirmDelete, setConfirmDelete] = useState(false)

  const sites = projectSites(state, projectId)
  const siteOptions = [
    { value: '', label: 'Project-wide (no site)' },
    ...sites.map(s => ({ value: s.id, label: s.name })),
  ]

  const save = () => {
    if (!form.name.trim()) return
    if (existing) {
      state.updateActivity(existing.id, form)
    } else {
      state.addActivity(form)
    }
    onClose()
  }

  return (
    <>
      {confirmDelete && existing && (
        <ConfirmDialog
          title={`Delete "${existing.name}"?`}
          message="This will permanently remove the activity and all associated roster assignments and cost entries."
          confirmLabel="Delete activity"
          danger
          onConfirm={() => { state.deleteActivity(existing.id); onClose() }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      <Drawer
        title={existing ? existing.name : 'New activity'}
        subtitle={existing ? 'Edit activity' : 'Add to project'}
        onClose={onClose}
        onSave={save}
        onDelete={existing ? () => setConfirmDelete(true) : undefined}
        saveLabel={existing ? 'Save' : 'Add activity'}
      >
        <Field label="Activity name">
          <input className="input" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Priority">
            <Select value={form.priority}
              onChange={v => setForm({ ...form, priority: v as Priority })}
              options={PRIORITY_OPTIONS} />
          </Field>
          <Field label="Status">
            <Select value={form.status}
              onChange={v => setForm({ ...form, status: v as ActivityStatus })}
              options={STATUS_OPTIONS} />
          </Field>
        </div>

        {sites.length > 0 && (
          <Field label="Site">
            <Select value={form.siteId ?? ''}
              onChange={v => setForm({ ...form, siteId: v || undefined })}
              options={siteOptions} />
          </Field>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Start date">
            <input className="input" type="date" value={form.start}
              onChange={e => setForm({ ...form, start: e.target.value })} />
          </Field>
          <Field label="End date">
            <input className="input" type="date" value={form.end}
              onChange={e => setForm({ ...form, end: e.target.value })} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Work unit">
            <Select value={form.unit}
              onChange={v => setForm({ ...form, unit: v as WorkUnit })}
              options={UNIT_OPTIONS} />
          </Field>
          <Field label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Allocation strategy
              <InfoTooltip text="Even spread: total units distributed evenly across the date range. Custom: set a specific amount per calendar month." />
            </span>
          }>
            <Select value={form.allocationStrategy}
              onChange={v => setForm({ ...form, allocationStrategy: v as AllocationStrategy })}
              options={ALLOCATION_OPTIONS} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label={`Total ${form.unit}`}>
            <NumericInput className="input" value={form.totalAllocation}
              onChange={v => setForm({ ...form, totalAllocation: v })} min={0} />
          </Field>
          <Field label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Already completed
              <InfoTooltip text="Set this when entering a project already in progress — the number of days/hours completed before this system entry. This offsets the remaining allocation." />
            </span>
          }>
            <NumericInput className="input" value={form.unitsCompleted}
              onChange={v => setForm({ ...form, unitsCompleted: v })} min={0} />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label={
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Crew type
              <InfoTooltip text="Fixed: exact head count each day. Range: minimum to maximum. Any: no crew constraint — assign as available." />
            </span>
          }>
            <Select value={form.crewSizeType}
              onChange={v => setForm({ ...form, crewSizeType: v as CrewSizeType })}
              options={CREW_TYPE_OPTIONS} />
          </Field>
          <Field label={form.crewSizeType === 'range' ? 'Min crew' : 'Crew size'}>
            <NumericInput className="input" value={form.minCrew}
              onChange={v => setForm({ ...form, minCrew: v })} min={1} />
          </Field>
        </div>

        {form.crewSizeType === 'range' && (
          <Field label="Max crew">
            <NumericInput className="input" value={form.maxCrew ?? 0}
              onChange={v => setForm({ ...form, maxCrew: v || undefined })} min={form.minCrew} />
          </Field>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label={`Charge-out rate ($ / ${form.unit === 'hours' ? 'hr' : 'day'})`}>
            <NumericInput className="input" value={form.chargeOutRate}
              onChange={v => setForm({ ...form, chargeOutRate: v })} min={0} />
          </Field>
          <Field label="Overtime">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.overtimeFlag}
                  onChange={e => setForm({ ...form, overtimeFlag: e.target.checked })} />
                Allow
              </label>
              <NumericInput className="input" step="0.1" value={form.overtimeRate}
                onChange={v => setForm({ ...form, overtimeRate: v })}
                style={{ width: 70 }} disabled={!form.overtimeFlag} />
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>× rate</span>
            </div>
          </Field>
        </div>

        <Field label="Required skills">
          <SkillsEditor selected={form.skills} allSkills={state.skills}
            onChange={skills => setForm({ ...form, skills })}
            onAddSkill={state.addSkill} />
        </Field>

        <Field label="Notes">
          <textarea className="input" rows={2} value={form.notes ?? ''}
            onChange={e => setForm({ ...form, notes: e.target.value || undefined })}
            style={{ resize: 'vertical', fontFamily: 'inherit' }} />
        </Field>
      </Drawer>
    </>
  )
}

// ── ProjectDrawer ──────────────────────────────────────────────────────────────

type DrawerTab = 'details' | 'sites' | 'activities'

function ProjectDrawer({ projectId, state, onClose }: {
  projectId: string
  state: ReturnType<typeof useCCState>
  onClose: () => void
}) {
  const p = state.projects.find(x => x.id === projectId)!
  const [edit, setEdit] = useState<Project>({ ...p })
  const [tab, setTab] = useState<DrawerTab>('details')
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false)
  const [confirmDeleteSite, setConfirmDeleteSite] = useState<string | null>(null)
  const [editActivityId, setEditActivityId] = useState<string | null | 'new'>(null)
  const [editSiteId, setEditSiteId] = useState<string | null>(null)

  const sites = projectSites(state, projectId)
  const linkedIds = new Set(sites.map(s => s.id))
  const activities = state.activities.filter(a => a.projectId === projectId)

  const saveDetails = () => { state.updateProject(p.id, edit); onClose() }

  const tabStyle = (t: DrawerTab) => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-mono)' as const, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
    background: tab === t ? 'var(--accent-soft)' : 'transparent',
    color: tab === t ? 'var(--accent)' : 'var(--ink-3)',
    border: '1px solid ' + (tab === t ? 'var(--accent)' : 'transparent'),
  })

  return (
    <>
      {confirmDeleteProject && (
        <ConfirmDialog
          title={`Delete "${p.name}"?`}
          message="This will permanently delete the project, all its sites, activities, and roster assignments."
          confirmLabel="Delete project"
          danger
          onConfirm={() => { state.deleteProject(p.id); onClose() }}
          onCancel={() => setConfirmDeleteProject(false)}
        />
      )}
      {confirmDeleteSite && (
        <ConfirmDialog
          title="Remove site from project?"
          message="This will unlink the site from this project. Activities assigned to this site will become project-wide."
          confirmLabel="Remove site"
          danger
          onConfirm={() => { state.unlinkSite(projectId, confirmDeleteSite); setConfirmDeleteSite(null) }}
          onCancel={() => setConfirmDeleteSite(null)}
        />
      )}

      {editActivityId !== null && (
        <ActivityDrawer
          projectId={projectId}
          activityId={editActivityId === 'new' ? null : editActivityId}
          state={state}
          onClose={() => setEditActivityId(null)}
        />
      )}

      <Drawer
        title={p.name}
        subtitle={p.client}
        onClose={onClose}
        onSave={tab === 'details' ? saveDetails : undefined}
        onDelete={tab === 'details' ? () => setConfirmDeleteProject(true) : undefined}
      >
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
          <button style={tabStyle('details')} onClick={() => setTab('details')}>Details</button>
          <button style={tabStyle('sites')} onClick={() => setTab('sites')}>
            Sites{sites.length > 0 ? ` (${sites.length})` : ''}
          </button>
          <button style={tabStyle('activities')} onClick={() => setTab('activities')}>
            Activities{activities.length > 0 ? ` (${activities.length})` : ''}
          </button>
        </div>

        {/* Details tab */}
        {tab === 'details' && (
          <>
            <Field label="Project name">
              <input className="input" value={edit.name}
                onChange={e => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <Field label="Client">
              <input className="input" value={edit.client}
                onChange={e => setEdit({ ...edit, client: e.target.value })} />
            </Field>
            <Field label="Project number (optional)">
              <input className="input" value={edit.projectNumber ?? ''}
                placeholder="e.g. CC-2026-04"
                onChange={e => setEdit({ ...edit, projectNumber: e.target.value || undefined })} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Start date">
                <input className="input" type="date" value={edit.start}
                  onChange={e => setEdit({ ...edit, start: e.target.value })} />
              </Field>
              <Field label="End date">
                <input className="input" type="date" value={edit.end}
                  onChange={e => setEdit({ ...edit, end: e.target.value })} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Priority">
                <Select value={edit.priority}
                  onChange={v => setEdit({ ...edit, priority: v as Priority })}
                  options={PRIORITY_OPTIONS} />
              </Field>
              <Field label="Contract value ($)">
                <NumericInput className="input" value={edit.contractValue}
                  onChange={v => setEdit({ ...edit, contractValue: v })} min={0} />
              </Field>
            </div>
          </>
        )}

        {/* Sites tab */}
        {tab === 'sites' && (
          <>
            {sites.length === 0 && (
              <div style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 14 }}>
                No sites yet
              </div>
            )}
            {sites.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                {editSiteId === s.id ? (
                  <>
                    <input className="input" defaultValue={s.name} style={{ flex: 1 }}
                      onBlur={e => state.updateSite(s.id, { name: e.target.value })} />
                    <button className="btn" onClick={() => setEditSiteId(null)}>Done</button>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
                      {activities.filter(a => a.siteId === s.id).length} activities
                    </span>
                    <button className="iconbtn" onClick={() => setEditSiteId(s.id)}>
                      <Icon name="edit" size={12} />
                    </button>
                    <button className="iconbtn" onClick={() => setConfirmDeleteSite(s.id)}
                      style={{ color: 'var(--danger)' }}>
                      <Icon name="trash" size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 6 }}>
                Link location
              </div>
              <SiteSearchDropdown
                linkedIds={linkedIds}
                allOrgSites={state.sites}
                onLink={siteId => state.linkSite(projectId, siteId)}
                onCreateAndLink={name => state.createAndLinkSite(projectId, name)}
              />
            </div>
          </>
        )}

        {/* Activities tab */}
        {tab === 'activities' && (
          <>
            <button className="btn primary" style={{ marginBottom: 16 }}
              onClick={() => setEditActivityId('new')}>
              <Icon name="plus" size={14} /> New activity
            </button>

            {activities.length === 0 && (
              <div style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                No activities yet — add one above
              </div>
            )}

            {/* Group activities by site, then project-wide */}
            {[...sites, null].map(site => {
              const group = site
                ? activities.filter(a => a.siteId === site.id)
                : activities.filter(a => !a.siteId)
              if (group.length === 0 && site !== null) return null

              return (
                <div key={site?.id ?? 'project-wide'} style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid var(--line)' }}>
                    {site ? site.name : (sites.length > 0 ? 'Project-wide' : 'Activities')}
                  </div>
                  {group.map(a => (
                    <div key={a.id}
                      onClick={() => setEditActivityId(a.id)}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 4 }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-sunken)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{a.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', display: 'flex', gap: 10 }}>
                          <span>{a.totalAllocation}{a.unit === 'hours' ? 'h' : 'd'}</span>
                          <span>Crew: {a.crewSizeType === 'any' ? 'any' : a.crewSizeType === 'range' ? `${a.minCrew}–${a.maxCrew}` : String(a.minCrew)}</span>
                          <span>${a.chargeOutRate}/{a.unit === 'hours' ? 'hr' : 'day'}</span>
                          {a.unitsCompleted > 0 && <span style={{ color: 'var(--accent)' }}>{a.unitsCompleted} done</span>}
                        </div>
                      </div>
                      <span className={`pill${a.priority === 'high' ? ' accent' : ''}`} style={{ fontSize: 10 }}>
                        <span className="dot" />{a.priority}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 10,
                        color: a.status === 'complete' ? 'var(--accent)' : a.status === 'on_hold' ? 'var(--warn)' : 'var(--ink-3)',
                      }}>
                        {a.status === 'on_hold' ? 'on hold' : a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )}
      </Drawer>
    </>
  )
}

// ── ProjectCard ────────────────────────────────────────────────────────────────

function ProjectCard({ project, state, onOpen }: {
  project: Project
  state: ReturnType<typeof useCCState>
  onOpen: () => void
}) {
  const p = project
  const activities = state.activities.filter(a => a.projectId === p.id)
  const sites = projectSites(state, p.id)
  const activeCount = activities.filter(a => a.status === 'active').length

  return (
    <div className="app-card" onClick={onOpen} style={{ minHeight: 0 }}>
      <div className="app-card-top">
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 4 }}>
            {p.client}
            {p.projectNumber && <span style={{ marginLeft: 8, opacity: 0.7 }}>{p.projectNumber}</span>}
          </div>
          <h3 className="app-name" style={{ fontSize: 22, marginBottom: 2 }}>{p.name}</h3>
        </div>
        <span className={`pill ${p.priority === 'high' ? 'accent' : ''}`}>
          <span className="dot" />{p.priority}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 2 }}>Contract</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '-0.01em' }}>
            ${(p.contractValue / 1000).toFixed(1)}k
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 2 }}>Activities</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '-0.01em' }}>
            {activeCount}
            {activities.length > activeCount && (
              <span style={{ fontSize: 12, color: 'var(--ink-3)', marginLeft: 4 }}>/ {activities.length}</span>
            )}
          </div>
        </div>
        {sites.length > 0 && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 2 }}>Sites</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, letterSpacing: '-0.01em' }}>{sites.length}</div>
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {p.start || '—'} → {p.end || '—'}
      </div>
    </div>
  )
}

// ── AddProjectModal ────────────────────────────────────────────────────────────

function AddProjectModal({ state, onClose }: {
  state: ReturnType<typeof useCCState>
  onClose: () => void
}) {
  const [p, setP] = useState<Omit<Project, 'id'>>({
    name: '', client: '', start: '', end: '',
    priority: 'medium', contractValue: 0,
  })
  const [existingClients, setExistingClients] = useState<string[]>([])
  const [newClient, setNewClient] = useState(false)
  const [clientOpen, setClientOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const clientDropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (clientDropRef.current && !clientDropRef.current.contains(e.target as Node)) {
        setClientOpen(false)
      }
    }
    if (clientOpen) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [clientOpen])

  useEffect(() => {
    const supabase = createClient()
    async function loadClients() {
      const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
      if (!org) return
      const { data: rows } = await supabase
        .from('clients')
        .select('name')
        .eq('organization_id', (org as Record<string, unknown>).id as string)
        .order('name')
      setExistingClients((rows ?? []).map(r => (r as Record<string, unknown>).name as string))
    }
    loadClients()
  }, [])

  const save = async () => {
    if (!p.name.trim()) { setSaveError('Project name is required.'); return }
    if (!p.client.trim()) { setSaveError('Client is required.'); return }
    setSaving(true)
    setSaveError(null)
    const ok = await state.addProject(p)
    setSaving(false)
    if (ok) {
      onClose()
    } else {
      setSaveError('Failed to save — check your connection and try again.')
    }
  }

  return (
    <Drawer title="New project" subtitle="Add to projects list" onClose={onClose} onSave={save}
      saveLabel={saving ? 'Creating…' : 'Create'} saveDisabled={saving}>
      <Field label="Project name">
        <input className="input" value={p.name}
          onChange={e => setP({ ...p, name: e.target.value })} autoFocus />
      </Field>

      <Field label="Client">
        {!newClient ? (
          <div ref={clientDropRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setClientOpen(o => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 8,
                background: 'var(--bg-elev)', fontSize: 13, cursor: 'pointer', textAlign: 'left',
                color: p.client ? 'var(--ink)' : 'var(--ink-3)',
                outline: clientOpen ? '2px solid var(--accent)' : 'none', outlineOffset: -1,
              }}
            >
              <span>{p.client || 'Select client…'}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, marginLeft: 8, opacity: 0.5, transform: clientOpen ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}>
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {clientOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                background: 'var(--bg-elev)', border: '1px solid var(--line)',
                borderRadius: 10, boxShadow: '0 8px 24px oklch(0.18 0.015 150 / 0.12)', overflow: 'hidden',
              }}>
                {existingClients.map(c => (
                  <button key={c} type="button"
                    onClick={() => { setP({ ...p, client: c }); setClientOpen(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                      fontSize: 13, background: p.client === c ? 'var(--accent-soft)' : 'transparent',
                      color: p.client === c ? 'var(--accent)' : 'var(--ink)', cursor: 'pointer',
                      border: 'none', borderBottom: '1px solid var(--line)',
                    }}
                    onMouseEnter={e => { if (p.client !== c) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-sunken)' }}
                    onMouseLeave={e => { if (p.client !== c) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >{c}</button>
                ))}
                <button type="button"
                  onClick={() => { setNewClient(true); setP({ ...p, client: '' }); setClientOpen(false) }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                    fontSize: 13, background: 'transparent', color: 'var(--accent)',
                    cursor: 'pointer', border: 'none', fontWeight: 500,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-soft)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >+ New client…</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="input" style={{ flex: 1 }} placeholder="New client name…"
              value={p.client} onChange={e => setP({ ...p, client: e.target.value })} autoFocus />
            <button className="btn" type="button"
              onClick={() => { setNewClient(false); setP({ ...p, client: '' }) }}>Cancel</button>
          </div>
        )}
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Start date">
          <input className="input" type="date" value={p.start}
            onChange={e => setP({ ...p, start: e.target.value })} />
        </Field>
        <Field label="End date">
          <input className="input" type="date" value={p.end}
            onChange={e => setP({ ...p, end: e.target.value })} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Priority">
          <Select value={p.priority}
            onChange={v => setP({ ...p, priority: v as Priority })}
            options={PRIORITY_OPTIONS} />
        </Field>
        <Field label="Contract value ($)">
          <NumericInput className="input" value={p.contractValue}
            onChange={v => setP({ ...p, contractValue: v })} min={0} />
        </Field>
      </div>

      <Field label="Project number (optional)">
        <input className="input" value={p.projectNumber ?? ''} placeholder="e.g. CC-2026-04"
          onChange={e => setP({ ...p, projectNumber: e.target.value || undefined })} />
      </Field>

      {saveError && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 12,
          background: 'oklch(0.95 0.02 25)', color: 'var(--danger)',
          border: '1px solid oklch(0.85 0.06 25)',
        }}>
          {saveError}
        </div>
      )}
    </Drawer>
  )
}

// ── ProjectsPage ───────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const state = useCCState()
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [filter, setFilter] = useState('')

  const visible = state.projects.filter(p =>
    !filter ||
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.client.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">{visible.length} of {state.projects.length} projects</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Projects</h2>
      </div>

      <div className="subpage-body">
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
          <button className="btn primary" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={14} /> New project
          </button>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <div className={`tab ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')}>Cards</div>
            <div className={`tab ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>Table</div>
          </div>
          <div style={{ flex: 1 }} />
          <input className="input" placeholder="Search projects…" value={filter}
            onChange={e => setFilter(e.target.value)} style={{ width: 240 }} />
        </div>

        {view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {visible.map(p => (
              <ProjectCard key={p.id} project={p} state={state} onOpen={() => setSelected(p.id)} />
            ))}
          </div>
        ) : (
          <table className="table">
            <thead><tr>
              <th>Project</th><th>Client</th><th>Contract value</th><th>Activities</th><th>Sites</th><th>Priority</th>
            </tr></thead>
            <tbody>
              {visible.map(p => {
                const acts = state.activities.filter(a => a.projectId === p.id)
                const ss = projectSites(state, p.id)
                return (
                  <tr key={p.id} onClick={() => setSelected(p.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>
                      {p.name}
                      {p.projectNumber && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', marginLeft: 6 }}>
                          {p.projectNumber}
                        </span>
                      )}
                    </td>
                    <td>{p.client}</td>
                    <td className="mono">${(p.contractValue / 1000).toFixed(1)}k</td>
                    <td className="mono">{acts.length}</td>
                    <td className="mono">{ss.length}</td>
                    <td>
                      <span className={`pill ${p.priority === 'high' ? 'accent' : ''}`}>
                        <span className="dot" />{p.priority}
                      </span>
                    </td>
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
