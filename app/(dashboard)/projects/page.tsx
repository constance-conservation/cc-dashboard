'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCCState } from '@/lib/store/CCStateContext'
import { Icon } from '@/components/icons/Icon'
import { Drawer, Field } from '@/components/dashboard/Drawer'
import { Select } from '@/components/dashboard/Select'
import { NumericInput } from '@/components/dashboard/NumericInput'
import { InfoTooltip } from '@/components/dashboard/InfoTooltip'
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog'
import type { Project, Site, Activity, Priority, WorkUnit, AllocationStrategy, CrewSizeType, ActivityStatus, ActivityType } from '@/lib/types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function projectSites(state: ReturnType<typeof useCCState>, projectId: string): Site[] {
  const ids = new Set(state.projectSiteLinks.filter(l => l.projectId === projectId).map(l => l.siteId))
  return state.sites.filter(s => ids.has(s.id))
}

function monthsBetween(start: string, end: string): string[] {
  const months: string[] = []
  if (!start || !end) return months
  const s = new Date(start)
  const e = new Date(end)
  const cur = new Date(s.getFullYear(), s.getMonth(), 1)
  const last = new Date(e.getFullYear(), e.getMonth(), 1)
  while (cur <= last) {
    months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`)
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
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
        placeholder={available.length === 0 ? 'All sites linked — type to add new…' : 'Search sites or add new…'}
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

// ── ActivityTypeahead ──────────────────────────────────────────────────────────

function ActivityTypeahead({ value, displayName, activityTypes, onChange, onAddNew }: {
  value: string
  displayName?: string
  activityTypes: ActivityType[]
  onChange: (id: string, name: string) => void
  onAddNew: (name: string) => Promise<string>
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = activityTypes.find(t => t.id === value)
  const filtered = query
    ? activityTypes.filter(t => t.name.toLowerCase().includes(query.toLowerCase()))
    : activityTypes
  const showAdd = query.trim() && !activityTypes.some(t => t.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="input"
        placeholder="Search or add activity…"
        value={open ? query : (selected?.name ?? displayName ?? '')}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        readOnly={creating}
        style={{ width: '100%' }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-elev)', border: '1px solid var(--line)',
          borderRadius: 10, boxShadow: '0 8px 24px oklch(0.18 0.015 150 / 0.12)',
          maxHeight: 200, overflowY: 'auto', overflow: 'hidden',
        }}>
          {filtered.map(t => (
            <button key={t.id} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(t.id, t.name); setOpen(false); setQuery('') }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                fontSize: 13, background: value === t.id ? 'var(--accent-soft)' : 'transparent',
                color: value === t.id ? 'var(--accent)' : 'var(--ink)', cursor: 'pointer',
                border: 'none', borderBottom: '1px solid var(--line)',
              }}
              onMouseEnter={e => { if (value !== t.id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-sunken)' }}
              onMouseLeave={e => { if (value !== t.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >{t.name}</button>
          ))}
          {filtered.length === 0 && !showAdd && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>No activities found</div>
          )}
          {showAdd && (
            <button type="button"
              onMouseDown={async e => {
                e.preventDefault()
                setCreating(true)
                const newId = await onAddNew(query.trim())
                onChange(newId, query.trim())
                setOpen(false); setQuery(''); setCreating(false)
              }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                fontSize: 13, background: 'transparent', color: 'var(--accent)',
                cursor: 'pointer', border: 'none', fontWeight: 500,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-soft)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >{creating ? 'Adding…' : `+ Add "${query.trim()}" to activities`}</button>
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
  const [pendingTypeName, setPendingTypeName] = useState<string | null>(null)
  const [customAllocs, setCustomAllocs] = useState<Record<string, number>>(() => {
    if (!activityId) return {}
    return Object.fromEntries(
      state.allocations.filter(a => a.activityId === activityId).map(a => [a.period, a.allocation])
    )
  })

  useEffect(() => {
    if (!pendingTypeName) return
    const found = state.activityTypes.find(t => t.name === pendingTypeName)
    if (found) {
      setForm(prev => ({ ...prev, activityTypeId: found.id, name: found.name }))
      setPendingTypeName(null)
    }
  }, [state.activityTypes, pendingTypeName])

  const sites = projectSites(state, projectId)
  const siteOptions = [
    { value: '', label: 'Project-wide (no site)' },
    ...sites.map(s => ({ value: s.id, label: s.name })),
  ]

  const save = async () => {
    if (!form.name.trim() && !form.activityTypeId) return
    if (existing) {
      state.updateActivity(existing.id, form)
      if (form.allocationStrategy === 'custom') {
        const months = monthsBetween(form.start, form.end)
        const periods = months.map(m => ({ period: m, allocation: customAllocs[m] ?? 0 }))
        await state.setActivityAllocations(existing.id, periods)
      }
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
        <Field label="Activity">
          <ActivityTypeahead
            value={form.activityTypeId ?? ''}
            displayName={form.name}
            activityTypes={state.activityTypes}
            onChange={(id, name) => setForm({ ...form, activityTypeId: id, name })}
            onAddNew={async (name) => {
              state.addActivityType(name)
              setPendingTypeName(name)
              return '__pending__'
            }}
          />
        </Field>

        <Field label="Priority">
          <Select value={form.priority}
            onChange={v => setForm({ ...form, priority: v as Priority })}
            options={PRIORITY_OPTIONS} />
        </Field>

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

        <Field label={`Total ${form.unit}`}>
          <NumericInput className="input" value={form.totalAllocation}
            onChange={v => setForm({ ...form, totalAllocation: v })} min={0} />
        </Field>

        {form.allocationStrategy === 'custom' && (
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '12px', marginTop: 4 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 10 }}>
              Monthly allocation
            </div>
            {!form.start || !form.end ? (
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>Set start and end dates to configure monthly allocation</div>
            ) : (() => {
              const months = monthsBetween(form.start, form.end)
              const total = months.reduce((s, m) => s + (customAllocs[m] ?? 0), 0)
              return (
                <>
                  {months.map(m => {
                    const [y, mo] = m.split('-')
                    const label = new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
                    return (
                      <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 80, fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{label}</div>
                        <NumericInput className="input" style={{ width: 80 }} min={0}
                          value={customAllocs[m] ?? 0}
                          onChange={v => setCustomAllocs(prev => ({ ...prev, [m]: v }))} />
                        <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{form.unit}</span>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>Total allocated</span>
                    <span style={{ fontWeight: 600, color: total === form.totalAllocation ? 'var(--accent)' : 'var(--warn)' }}>
                      {total} / {form.totalAllocation} {form.unit}
                      {total !== form.totalAllocation && <span style={{ color: 'var(--warn)', marginLeft: 6, fontSize: 11 }}>({total > form.totalAllocation ? '+' : ''}{total - form.totalAllocation})</span>}
                    </span>
                  </div>
                  {!existing && (
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic', marginTop: 6 }}>
                      Monthly allocations will be saved after you create the activity and reopen it.
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

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

  const saveDetails = () => { state.updateProject(p.id, { ...edit, client: p.client }); onClose() }

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
          message="This will permanently delete the project, all its sites, activities, and roster assignments. Permanent deletion is available from both Active and Archived views."
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

      <Drawer
        title={p.name}
        subtitle={p.client}
        onClose={onClose}
        onSave={tab === 'details' ? saveDetails : undefined}
        onDelete={tab === 'details' ? () => setConfirmDeleteProject(true) : undefined}
        onArchive={tab === 'details' && !p.archived ? () => { state.archiveProject(p.id); onClose() } : undefined}
        onRestore={tab === 'details' && p.archived ? () => { state.restoreProject(p.id); onClose() } : undefined}
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
              <div style={{ padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--bg-sunken)', fontSize: 13, color: 'var(--ink-3)' }}>
                {p.client || '—'}
              </div>
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
                Add site
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
      {editActivityId !== null && (
        <ActivityDrawer
          projectId={projectId}
          activityId={editActivityId === 'new' ? null : editActivityId}
          state={state}
          onClose={() => setEditActivityId(null)}
        />
      )}
    </>
  )
}

// ── AddProjectModal ────────────────────────────────────────────────────────────

type PendingActivity = {
  name: string
  activityTypeId?: string
  siteKey: string
  priority: Priority
  unit: WorkUnit
  allocationStrategy: AllocationStrategy
  totalAllocation: number
  crewSizeType: CrewSizeType
  minCrew: number
  maxCrew?: number
  chargeOutRate: number
  overtimeFlag: boolean
  overtimeRate: number
  skills: string[]
  start: string
  end: string
  notes?: string
}

function AddProjectModal({ state, onClose }: {
  state: ReturnType<typeof useCCState>
  onClose: () => void
}) {
  const [p, setP] = useState<Omit<Project, 'id'>>({
    name: '', client: '', start: '', end: '',
    priority: 'medium', contractValue: 0, projectNumber: undefined,
  })
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientOpen, setClientOpen] = useState(false)
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([])
  const [pendingSiteNames, setPendingSiteNames] = useState<string[]>([])
  const [newSiteInput, setNewSiteInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const clientDropRef = useRef<HTMLDivElement>(null)
  const [pendingActivities, setPendingActivities] = useState<PendingActivity[]>([])
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [expandedActivityIdx, setExpandedActivityIdx] = useState<number | null>(null)
  const [activityForm, setActivityForm] = useState<PendingActivity>({
    name: '', activityTypeId: undefined, siteKey: '', priority: 'medium', unit: 'days',
    allocationStrategy: 'even', totalAllocation: 0, crewSizeType: 'fixed',
    minCrew: 1, maxCrew: undefined, chargeOutRate: 0,
    overtimeFlag: false, overtimeRate: 1.5, skills: [], start: '', end: '',
    notes: undefined,
  })

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (clientDropRef.current && !clientDropRef.current.contains(e.target as Node)) {
        setClientOpen(false)
      }
    }
    if (clientOpen) document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [clientOpen])

  const activeClients = state.clients.filter(c => c.status !== 'archived')
  const clientSites = selectedClientId
    ? state.sites.filter(s => s.clientId === selectedClientId)
    : []

  const selectClient = (clientId: string, clientName: string) => {
    setSelectedClientId(clientId)
    setP(prev => ({ ...prev, client: clientName }))
    setSelectedSiteIds([])
    setClientOpen(false)
  }

  const toggleSite = (siteId: string) => {
    setSelectedSiteIds(prev =>
      prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId]
    )
  }

  const addPendingSite = () => {
    const name = newSiteInput.trim()
    if (!name || pendingSiteNames.includes(name)) return
    setPendingSiteNames(prev => [...prev, name])
    setNewSiteInput('')
  }

  const save = async () => {
    if (!p.name.trim()) { setSaveError('Project name is required.'); return }
    if (!selectedClientId) { setSaveError('Client is required.'); return }
    if (!p.start) { setSaveError('Start date is required.'); return }
    if (!p.end) { setSaveError('End date is required.'); return }
    if (p.contractValue <= 0) { setSaveError('Contract value must be greater than $0.'); return }
    if (selectedSiteIds.length + pendingSiteNames.length === 0) { setSaveError('At least one site is required.'); return }

    setSaving(true)
    setSaveError(null)
    const result = await state.addProject(p)
    if (typeof result === 'string') {
      setSaving(false)
      setSaveError(result)
      return
    }
    const projectId = result.id
    for (const siteId of selectedSiteIds) {
      state.linkSite(projectId, siteId)
    }
    for (const siteName of pendingSiteNames) {
      await state.createAndLinkSite(projectId, siteName, undefined, selectedClientId)
    }
    // Build siteKey → realId map
    const resolvedSiteIds: Record<string, string> = {}
    selectedSiteIds.forEach(id => { resolvedSiteIds[id] = id })
    pendingSiteNames.forEach((name, i) => {
      const site = state.sites.find(s => s.name === name && s.clientId === selectedClientId)
      if (site) resolvedSiteIds[`pending:${i}`] = site.id
    })
    // Create pending activities
    for (const act of pendingActivities) {
      const resolvedSiteId = act.siteKey ? resolvedSiteIds[act.siteKey] : undefined
      await state.addActivity({
        projectId,
        siteId: resolvedSiteId,
        activityTypeId: act.activityTypeId,
        name: act.name,
        allocationStrategy: act.allocationStrategy,
        unit: act.unit,
        totalAllocation: act.totalAllocation,
        unitsCompleted: 0,
        crewSizeType: act.crewSizeType,
        minCrew: act.minCrew,
        maxCrew: act.maxCrew,
        chargeOutRate: act.chargeOutRate,
        overtimeFlag: act.overtimeFlag,
        overtimeRate: act.overtimeRate,
        skills: act.skills,
        priority: act.priority,
        status: 'active',
        start: act.start,
        end: act.end,
        notes: act.notes,
        sortOrder: 0,
      })
    }
    setSaving(false)
    onClose()
  }

  return (
    <Drawer title="New project" subtitle="Add to projects list" onClose={onClose} onSave={save}
      saveLabel={saving ? 'Creating…' : 'Create'} saveDisabled={saving}>
      <Field label="Project number (optional)">
        <input className="input" value={p.projectNumber ?? ''} placeholder="e.g. CC-2026-04"
          onChange={e => setP({ ...p, projectNumber: e.target.value || undefined })} autoFocus />
      </Field>

      <Field label="Project name">
        <input className="input" value={p.name}
          onChange={e => setP({ ...p, name: e.target.value })} />
      </Field>

      <Field label="Client">
        <div ref={clientDropRef} style={{ position: 'relative' }}>
          <button type="button" onClick={() => setClientOpen(o => !o)}
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
              borderRadius: 10, boxShadow: '0 8px 24px oklch(0.18 0.015 150 / 0.12)',
              overflow: 'hidden', maxHeight: 220, overflowY: 'auto',
            }}>
              {activeClients.length === 0 && (
                <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                  No clients — add one in the Clients section first
                </div>
              )}
              {activeClients.map(c => (
                <button key={c.id} type="button"
                  onClick={() => selectClient(c.id, c.name)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                    fontSize: 13, background: selectedClientId === c.id ? 'var(--accent-soft)' : 'transparent',
                    color: selectedClientId === c.id ? 'var(--accent)' : 'var(--ink)', cursor: 'pointer',
                    border: 'none', borderBottom: '1px solid var(--line)',
                  }}
                  onMouseEnter={e => { if (selectedClientId !== c.id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-sunken)' }}
                  onMouseLeave={e => { if (selectedClientId !== c.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >{c.name}</button>
              ))}
            </div>
          )}
        </div>
      </Field>

      {/* Site picker — only shown when a client is selected */}
      {selectedClientId && (
        <Field label="Sites (select existing or add new)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {clientSites.map(s => (
              <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={selectedSiteIds.includes(s.id)}
                  onChange={() => toggleSite(s.id)}
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14, flexShrink: 0 }} />
                <span>{s.name}</span>
              </label>
            ))}
            {pendingSiteNames.map(name => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked readOnly
                  style={{ accentColor: 'var(--accent)', width: 14, height: 14, flexShrink: 0 }} />
                <span>{name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent)' }}>new</span>
                <button className="iconbtn" type="button" style={{ marginLeft: 'auto', color: 'var(--ink-3)' }}
                  onClick={() => setPendingSiteNames(prev => prev.filter(n => n !== name))}>
                  <Icon name="x" size={10} />
                </button>
              </div>
            ))}
            {clientSites.length === 0 && pendingSiteNames.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                No sites for this client yet — add one below
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input className="input" placeholder="Add new site name…"
                value={newSiteInput} onChange={e => setNewSiteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPendingSite() } }}
                style={{ flex: 1 }} />
              <button className="btn" type="button" onClick={addPendingSite}
                disabled={!newSiteInput.trim()} style={{ flexShrink: 0 }}>
                Add
              </button>
            </div>
          </div>
        </Field>
      )}

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

      {/* Activities section */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 6 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: 12 }}>
          Activities
        </div>

        {/* Collapsed activity cards */}
        {pendingActivities.map((a, idx) => (
          <div key={idx} style={{ border: '1px solid var(--line)', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', background: expandedActivityIdx === idx ? 'var(--bg-sunken)' : 'transparent' }}
              onClick={() => setExpandedActivityIdx(expandedActivityIdx === idx ? null : idx)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {a.activityTypeId ? (state.activityTypes.find(t => t.id === a.activityTypeId)?.name ?? '') : ''}
                  {a.siteKey && (
                    <span>
                      {a.siteKey.startsWith('pending:')
                        ? pendingSiteNames[parseInt(a.siteKey.split(':')[1])] + ' (new)'
                        : state.sites.find(s => s.id === a.siteKey)?.name}
                    </span>
                  )}
                  {a.start && a.end ? ` · ${a.start} → ${a.end}` : ''}
                </div>
              </div>
              <span className={`pill${a.priority === 'high' ? ' accent' : ''}`} style={{ fontSize: 10 }}>
                <span className="dot" />{a.priority}
              </span>
              <button className="iconbtn" type="button" style={{ color: 'var(--danger)' }}
                onClick={e => { e.stopPropagation(); setPendingActivities(prev => prev.filter((_, i) => i !== idx)); if (expandedActivityIdx === idx) setExpandedActivityIdx(null) }}>
                <Icon name="trash" size={12} />
              </button>
            </div>
            {/* Expanded edit form */}
            {expandedActivityIdx === idx && (
              <div style={{ padding: '12px', borderTop: '1px solid var(--line)' }}>
                <Field label="Activity name">
                  <input className="input" value={a.name}
                    onChange={e => setPendingActivities(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                </Field>
              </div>
            )}
          </div>
        ))}

        {/* Add activity form */}
        {showActivityForm ? (
          <div style={{ border: '1px solid var(--accent)', borderRadius: 10, padding: '14px', marginBottom: 8 }}>
            <Field label="Activity">
              <ActivityTypeahead
                value={activityForm.activityTypeId ?? ''}
                displayName={activityForm.name}
                activityTypes={state.activityTypes}
                onChange={(id, name) => setActivityForm({ ...activityForm, activityTypeId: id, name })}
                onAddNew={async (name) => {
                  state.addActivityType(name)
                  await new Promise(r => setTimeout(r, 100))
                  const found = state.activityTypes.find(t => t.name === name)
                  return found?.id ?? name
                }}
              />
            </Field>
            {(() => {
              const siteOpts = [
                { value: '', label: 'Select site…' },
                ...selectedSiteIds.map(id => ({
                  value: id,
                  label: state.sites.find(s => s.id === id)?.name ?? id,
                })),
                ...pendingSiteNames.map((name, i) => ({
                  value: `pending:${i}`,
                  label: `${name} (new)`,
                })),
              ]
              return (
                <Field label="Site">
                  <Select value={activityForm.siteKey ?? ''}
                    onChange={v => setActivityForm({ ...activityForm, siteKey: v })}
                    options={siteOpts} />
                </Field>
              )
            })()}
            <Field label="Priority">
              <Select value={activityForm.priority}
                onChange={v => setActivityForm({ ...activityForm, priority: v as Priority })}
                options={PRIORITY_OPTIONS} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Start date">
                <input className="input" type="date" value={activityForm.start}
                  onChange={e => setActivityForm({ ...activityForm, start: e.target.value })} />
              </Field>
              <Field label="End date">
                <input className="input" type="date" value={activityForm.end}
                  onChange={e => setActivityForm({ ...activityForm, end: e.target.value })} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Work unit">
                <Select value={activityForm.unit}
                  onChange={v => setActivityForm({ ...activityForm, unit: v as WorkUnit })}
                  options={UNIT_OPTIONS} />
              </Field>
              <Field label="Allocation strategy">
                <Select value={activityForm.allocationStrategy}
                  onChange={v => setActivityForm({ ...activityForm, allocationStrategy: v as AllocationStrategy })}
                  options={ALLOCATION_OPTIONS} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label={`Total ${activityForm.unit}`}>
                <NumericInput className="input" value={activityForm.totalAllocation}
                  onChange={v => setActivityForm({ ...activityForm, totalAllocation: v })} min={0} />
              </Field>
              <Field label="Crew size">
                <NumericInput className="input" value={activityForm.minCrew}
                  onChange={v => setActivityForm({ ...activityForm, minCrew: v })} min={1} />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Charge-out rate ($)">
                <NumericInput className="input" value={activityForm.chargeOutRate}
                  onChange={v => setActivityForm({ ...activityForm, chargeOutRate: v })} min={0} />
              </Field>
              <Field label="Overtime">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={activityForm.overtimeFlag}
                      onChange={e => setActivityForm({ ...activityForm, overtimeFlag: e.target.checked })} />
                    Allow
                  </label>
                  <NumericInput className="input" step="0.1" value={activityForm.overtimeRate}
                    onChange={v => setActivityForm({ ...activityForm, overtimeRate: v })}
                    style={{ width: 70 }} disabled={!activityForm.overtimeFlag} />
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>× rate</span>
                </div>
              </Field>
            </div>
            <Field label="Notes (optional)">
              <textarea className="input" rows={2} value={activityForm.notes ?? ''}
                onChange={e => setActivityForm({ ...activityForm, notes: e.target.value || undefined })}
                style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn primary" type="button"
                disabled={!activityForm.name.trim() || !activityForm.siteKey}
                onClick={() => {
                  if (!activityForm.name.trim()) return
                  if (!activityForm.siteKey) return
                  setPendingActivities(prev => [...prev, { ...activityForm }])
                  setActivityForm({ name: '', activityTypeId: undefined, siteKey: '', priority: 'medium', unit: 'days', allocationStrategy: 'even', totalAllocation: 0, crewSizeType: 'fixed', minCrew: 1, maxCrew: undefined, chargeOutRate: 0, overtimeFlag: false, overtimeRate: 1.5, skills: [], start: '', end: '', notes: undefined })
                  setShowActivityForm(false)
                }}>
                Add activity
              </button>
              <button className="btn" type="button" onClick={() => setShowActivityForm(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="btn" type="button" onClick={() => setShowActivityForm(true)}>
            <Icon name="plus" size={14} /> Add activity
          </button>
        )}
      </div>

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

// ── ActivityTypesModal ─────────────────────────────────────────────────────────

function ActivityTypesModal({ state, onClose }: {
  state: ReturnType<typeof useCCState>
  onClose: () => void
}) {
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const addNew = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    state.addActivityType(newName.trim(), newDesc.trim() || undefined)
    setNewName('')
    setNewDesc('')
  }

  const startEdit = (t: { id: string; name: string; description?: string }) => {
    setEditId(t.id)
    setEditName(t.name)
    setEditDesc(t.description ?? '')
  }

  const commitEdit = () => {
    if (!editId || !editName.trim()) return
    state.updateActivityType(editId, { name: editName.trim(), description: editDesc.trim() || undefined })
    setEditId(null)
  }

  const typeInUse = (id: string) => state.activities.some(a => a.activityTypeId === id)

  return (
    <>
      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete activity type?"
          message="This will remove the type from the library. Existing activities that use this type will not be affected."
          confirmLabel="Delete"
          danger
          onConfirm={() => { state.deleteActivityType(confirmDeleteId); setConfirmDeleteId(null) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
      <div className="drawer-backdrop" onClick={onClose}>
        <div className="drawer" style={{ width: 560, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
          <div className="drawer-head">
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: 0, letterSpacing: '-0.015em' }}>
                Activities
              </h3>
            </div>
            <button className="iconbtn" onClick={onClose}><Icon name="close" size={16} /></button>
          </div>

          <div className="drawer-body">
            {/* Add new */}
            <form onSubmit={addNew} style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
                  Name
                </label>
                <input className="input" placeholder="e.g. Mechanical Mulching" value={newName}
                  onChange={e => setNewName(e.target.value)} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
                  Description (optional)
                </label>
                <input className="input" placeholder="Brief description…" value={newDesc}
                  onChange={e => setNewDesc(e.target.value)} />
              </div>
              <button type="submit" className="btn primary" style={{ flexShrink: 0 }}>
                <Icon name="plus" size={12} /> Add
              </button>
            </form>

            {/* List */}
            {state.activityTypes.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '20px 0' }}>
                No activity types yet — add one above
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {state.activityTypes.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-sunken)', borderRadius: 8 }}>
                    {editId === t.id ? (
                      <>
                        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
                          <input className="input" value={editName} onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditId(null) }}
                            autoFocus style={{ flex: 1 }} />
                          <input className="input" value={editDesc} onChange={e => setEditDesc(e.target.value)}
                            placeholder="Description…"
                            onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditId(null) }}
                            style={{ flex: 1 }} />
                        </div>
                        <button className="btn primary" onClick={commitEdit} style={{ fontSize: 12, padding: '5px 10px' }}>Save</button>
                        <button className="btn" onClick={() => setEditId(null)} style={{ fontSize: 12, padding: '5px 10px' }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</div>
                          {t.description && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>{t.description}</div>}
                        </div>
                        {typeInUse(t.id) && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>
                            {state.activities.filter(a => a.activityTypeId === t.id).length} in use
                          </span>
                        )}
                        <button className="iconbtn" onClick={() => startEdit(t)} style={{ color: 'var(--ink-3)' }}>
                          <Icon name="edit" size={13} />
                        </button>
                        <button className="iconbtn" onClick={() => setConfirmDeleteId(t.id)} style={{ color: 'var(--danger)' }}>
                          <Icon name="trash" size={13} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="drawer-foot">
            <div style={{ flex: 1 }} />
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── ProjectsPage ───────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const state = useCCState()
  const searchParams = useSearchParams()
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showActivityTypes, setShowActivityTypes] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const id = searchParams.get('open')
    if (!id) return
    const match = state.projects.find(p => p.id === id)
    if (match) setSelected(id)
  }, [searchParams])

  const visible = state.projects.filter(p => {
    const matchesSearch = !filter ||
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.client.toLowerCase().includes(filter.toLowerCase())
    return matchesSearch && (activeTab === 'archived' ? p.archived : !p.archived)
  })

  const tabStyle = (t: 'active' | 'archived') => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-mono)' as const, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
    background: activeTab === t ? 'var(--accent-soft)' : 'transparent',
    color: activeTab === t ? 'var(--accent)' : 'var(--ink-3)',
    border: '1px solid ' + (activeTab === t ? 'var(--accent)' : 'transparent'),
  })

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
          <button className="btn" onClick={() => setShowActivityTypes(true)}>
            Activities
          </button>
          <button style={tabStyle('active')} onClick={() => setActiveTab('active')}>Active</button>
          <button style={tabStyle('archived')} onClick={() => setActiveTab('archived')}>Archived</button>
          <div style={{ flex: 1 }} />
          <input className="input" placeholder="Search projects…" value={filter}
            onChange={e => setFilter(e.target.value)} style={{ width: 240 }} />
        </div>

        <table className="table">
          <thead><tr>
            <th>Project</th><th>Client</th><th>Contract value</th><th>Dates</th><th>Sites</th><th>Priority</th>
          </tr></thead>
          <tbody>
            {visible.map(p => {
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
                  <td className="mono" style={{ fontSize: 11 }}>
                    {p.start || '—'} → {p.end || '—'}
                  </td>
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
      </div>

      {selected && <ProjectDrawer projectId={selected} state={state} onClose={() => setSelected(null)} />}
      {showAdd && <AddProjectModal state={state} onClose={() => setShowAdd(false)} />}
      {showActivityTypes && <ActivityTypesModal state={state} onClose={() => setShowActivityTypes(false)} />}
    </div>
  )
}
