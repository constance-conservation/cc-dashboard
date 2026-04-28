'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCCState } from '@/lib/store/CCStateContext'
import { Icon } from '@/components/icons/Icon'
import { Drawer, Field } from '@/components/dashboard/Drawer'
import { Select } from '@/components/dashboard/Select'
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog'
import type { Client, ClientStatus, ClientType } from '@/lib/types'

const STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'past',     label: 'Past' },
]

const TYPE_OPTIONS = [
  { value: '',           label: 'Unspecified' },
  { value: 'government', label: 'Government' },
  { value: 'council',    label: 'Council' },
  { value: 'corporate',  label: 'Corporate' },
  { value: 'ngo',        label: 'NGO' },
  { value: 'private',    label: 'Private' },
]

const TYPE_LABEL: Record<string, string> = {
  government: 'Government', council: 'Council', corporate: 'Corporate', ngo: 'NGO', private: 'Private',
}

// ── AddClientModal ─────────────────────────────────────────────────────────────

function AddClientModal({ state, onClose }: { state: ReturnType<typeof useCCState>; onClose: () => void }) {
  const [c, setC] = useState<Omit<Client, 'id'>>({
    name: '', status: 'active', clientType: undefined,
    contactName: undefined, email: undefined, phone: undefined, notes: undefined, abn: undefined,
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const save = async () => {
    if (!c.name.trim()) { setSaveError('Client name is required.'); return }
    setSaving(true)
    setSaveError(null)
    const err = await state.addClient(c)
    setSaving(false)
    if (err === null) onClose()
    else setSaveError(err)
  }

  return (
    <Drawer title="New client" subtitle="Add to client directory" onClose={onClose} onSave={save}
      saveLabel={saving ? 'Creating…' : 'Create'} saveDisabled={saving}>
      <Field label="Client name">
        <input className="input" value={c.name} onChange={e => setC({ ...c, name: e.target.value })} autoFocus />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Status">
          <Select value={c.status} onChange={v => setC({ ...c, status: v as ClientStatus })} options={STATUS_OPTIONS} />
        </Field>
        <Field label="Client type">
          <Select value={c.clientType ?? ''} onChange={v => setC({ ...c, clientType: (v as ClientType) || undefined })} options={TYPE_OPTIONS} />
        </Field>
      </div>
      <Field label="Primary contact">
        <input className="input" placeholder="Contact person name" value={c.contactName ?? ''}
          onChange={e => setC({ ...c, contactName: e.target.value || undefined })} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Email">
          <input className="input" type="email" placeholder="email@example.com" value={c.email ?? ''}
            onChange={e => setC({ ...c, email: e.target.value || undefined })} />
        </Field>
        <Field label="Phone">
          <input className="input" type="tel" placeholder="02 xxxx xxxx" value={c.phone ?? ''}
            onChange={e => setC({ ...c, phone: e.target.value || undefined })} />
        </Field>
      </div>
      <Field label="ABN (optional)">
        <input className="input" placeholder="XX XXX XXX XXX" value={c.abn ?? ''}
          onChange={e => setC({ ...c, abn: e.target.value || undefined })} />
      </Field>
      <Field label="Notes (optional)">
        <textarea className="input" rows={2} value={c.notes ?? ''}
          onChange={e => setC({ ...c, notes: e.target.value || undefined })}
          style={{ resize: 'vertical', fontFamily: 'inherit' }} />
      </Field>
      {saveError && (
        <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 12, background: 'oklch(0.95 0.02 25)', color: 'var(--danger)', border: '1px solid oklch(0.85 0.06 25)' }}>
          {saveError}
        </div>
      )}
    </Drawer>
  )
}

// ── ClientDrawer ───────────────────────────────────────────────────────────────

type ClientTab = 'details' | 'projects' | 'sites'

function ClientDrawer({ clientId, state, onClose }: {
  clientId: string
  state: ReturnType<typeof useCCState>
  onClose: () => void
}) {
  const allClients = [...state.clients, ...state.archivedClients]
  const client = allClients.find(c => c.id === clientId)
  if (!client) return null

  const isArchived = client.status === 'archived'
  const [edit, setEdit] = useState<Client>({ ...client })
  const [tab, setTab] = useState<ClientTab>('details')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newSiteName, setNewSiteName] = useState('')
  const [newSiteNotes, setNewSiteNotes] = useState('')
  const [addingSite, setAddingSite] = useState(false)
  const [siteError, setSiteError] = useState<string | null>(null)
  const [confirmDeleteSiteId, setConfirmDeleteSiteId] = useState<string | null>(null)
  const [editSiteId, setEditSiteId] = useState<string | null>(null)
  const [editSiteName, setEditSiteName] = useState('')
  const [editSiteNotes, setEditSiteNotes] = useState('')

  const linkedProjects = state.projects.filter(p => p.client === client.name)
  const hasProjects = linkedProjects.length > 0
  const clientSites = state.sites.filter(s => s.clientId === client.id)

  const save = () => { state.updateClient(client.id, edit); onClose() }

  const tabStyle = (t: ClientTab) => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
    fontFamily: 'var(--font-mono)' as const, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
    background: tab === t ? 'var(--accent-soft)' : 'transparent',
    color: tab === t ? 'var(--accent)' : 'var(--ink-3)',
    border: '1px solid ' + (tab === t ? 'var(--accent)' : 'transparent'),
  })

  const addSite = async () => {
    if (!newSiteName.trim()) return
    setAddingSite(true)
    setSiteError(null)
    const err = await state.createSiteForClient(client.id, newSiteName.trim(), newSiteNotes.trim() || undefined)
    setAddingSite(false)
    if (err === null) { setNewSiteName(''); setNewSiteNotes('') }
    else setSiteError(err)
  }

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete "${client.name}"?`}
          message={hasProjects
            ? `This will permanently delete the client AND all ${linkedProjects.length} linked project${linkedProjects.length !== 1 ? 's' : ''} and their activities. This cannot be undone.\n\nTo keep these projects, reassign them to another client first.`
            : 'This will permanently remove the client. This cannot be undone.'}
          confirmLabel="Delete client"
          danger
          onConfirm={() => { state.deleteClient(client.id); onClose() }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {confirmDeleteSiteId && (
        <ConfirmDialog
          title="Delete site permanently?"
          message="This will remove the site from the client library. This cannot be undone."
          confirmLabel="Delete site"
          danger
          onConfirm={() => { state.deleteSite(confirmDeleteSiteId); setConfirmDeleteSiteId(null) }}
          onCancel={() => setConfirmDeleteSiteId(null)}
        />
      )}
      <Drawer
        title={client.name}
        subtitle={client.clientType ? TYPE_LABEL[client.clientType] : undefined}
        onClose={onClose}
        onSave={tab === 'details' ? save : undefined}
        onDelete={tab === 'details' ? () => setConfirmDelete(true) : undefined}
        onArchive={tab === 'details' && !isArchived ? () => { state.archiveClient(client.id); onClose() } : undefined}
        onRestore={tab === 'details' && isArchived ? () => { state.restoreClient(client.id); onClose() } : undefined}
      >
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
          <button style={tabStyle('details')} onClick={() => setTab('details')}>Details</button>
          <button style={tabStyle('projects')} onClick={() => setTab('projects')}>
            Projects{linkedProjects.length > 0 ? ` (${linkedProjects.length})` : ''}
          </button>
          <button style={tabStyle('sites')} onClick={() => setTab('sites')}>
            Sites{clientSites.length > 0 ? ` (${clientSites.length})` : ''}
          </button>
        </div>

        {tab === 'details' && (
          <>
            <Field label="Client name">
              <input className="input" value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Status">
                <Select value={edit.status === 'archived' ? 'active' : edit.status}
                  onChange={v => setEdit({ ...edit, status: v as ClientStatus })}
                  options={STATUS_OPTIONS} />
              </Field>
              <Field label="Client type">
                <Select value={edit.clientType ?? ''}
                  onChange={v => setEdit({ ...edit, clientType: (v as ClientType) || undefined })}
                  options={TYPE_OPTIONS} />
              </Field>
            </div>
            <Field label="Primary contact">
              <input className="input" placeholder="Contact person name" value={edit.contactName ?? ''}
                onChange={e => setEdit({ ...edit, contactName: e.target.value || undefined })} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Email">
                <input className="input" type="email" value={edit.email ?? ''}
                  onChange={e => setEdit({ ...edit, email: e.target.value || undefined })} />
              </Field>
              <Field label="Phone">
                <input className="input" type="tel" value={edit.phone ?? ''}
                  onChange={e => setEdit({ ...edit, phone: e.target.value || undefined })} />
              </Field>
            </div>
            <Field label="ABN">
              <input className="input" placeholder="XX XXX XXX XXX" value={edit.abn ?? ''}
                onChange={e => setEdit({ ...edit, abn: e.target.value || undefined })} />
            </Field>
            <Field label="Notes">
              <textarea className="input" rows={3} value={edit.notes ?? ''}
                onChange={e => setEdit({ ...edit, notes: e.target.value || undefined })}
                style={{ resize: 'vertical', fontFamily: 'inherit' }} />
            </Field>
          </>
        )}

        {tab === 'projects' && (
          <>
            {linkedProjects.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                No projects linked
              </div>
            ) : linkedProjects.map(p => (
              <Link key={p.id} href={`/projects?open=${p.id}`} onClick={onClose} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>
                      {p.name}
                      {p.projectNumber && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', marginLeft: 6 }}>{p.projectNumber}</span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                      {p.start || '—'} → {p.end || '—'}
                    </div>
                  </div>
                  <span className={`pill${p.priority === 'high' ? ' accent' : ''}`} style={{ fontSize: 10 }}>
                    <span className="dot" />{p.priority}
                  </span>
                  {p.archived && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)' }}>archived</span>
                  )}
                </div>
              </Link>
            ))}
          </>
        )}

        {tab === 'sites' && (
          <>
            {/* Add new site form */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
                  New site name
                </label>
                <input className="input" placeholder="e.g. Camden South bushland"
                  value={newSiteName} onChange={e => setNewSiteName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSite() }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
                  Notes (optional)
                </label>
                <input className="input" placeholder="Optional notes"
                  value={newSiteNotes} onChange={e => setNewSiteNotes(e.target.value)} />
              </div>
              <button className="btn primary" onClick={addSite} disabled={addingSite || !newSiteName.trim()}
                style={{ flexShrink: 0 }}>
                <Icon name="plus" size={12} /> Add
              </button>
            </div>
            {siteError && (
              <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: 12, background: 'oklch(0.95 0.02 25)', color: 'var(--danger)', border: '1px solid oklch(0.85 0.06 25)', marginBottom: 12 }}>
                {siteError}
              </div>
            )}

            {/* Site list */}
            {clientSites.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 0' }}>
                No sites yet — add one above
              </div>
            ) : clientSites.map(s => {
              const linkedToProjects = state.projectSiteLinks.some(l => l.siteId === s.id)
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ flex: 1 }}>
                    {editSiteId === s.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input className="input" value={editSiteName}
                          onChange={e => setEditSiteName(e.target.value)}
                          onBlur={() => state.updateSite(s.id, { name: editSiteName.trim() || s.name, notes: editSiteNotes.trim() || undefined })}
                          autoFocus style={{ width: '100%' }} />
                        <input className="input" value={editSiteNotes}
                          onChange={e => setEditSiteNotes(e.target.value)}
                          placeholder="Notes (optional)"
                          style={{ width: '100%' }} />
                        <button className="btn" style={{ alignSelf: 'flex-start', marginTop: 2 }}
                          onClick={() => { state.updateSite(s.id, { name: editSiteName.trim() || s.name, notes: editSiteNotes.trim() || undefined }); setEditSiteId(null) }}>
                          Done
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 500 }} onClick={() => { setEditSiteId(s.id); setEditSiteName(s.name); setEditSiteNotes(s.notes ?? '') }}>
                        {s.name}
                      </div>
                    )}
                    {editSiteId !== s.id && s.notes && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                        {s.notes.length > 60 ? s.notes.slice(0, 60) + '…' : s.notes}
                      </div>
                    )}
                  </div>
                  {linkedToProjects && (
                    <span className="pill" style={{ fontSize: 10 }}>
                      {state.projectSiteLinks.filter(l => l.siteId === s.id).length} project{state.projectSiteLinks.filter(l => l.siteId === s.id).length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="iconbtn" onClick={() => { setEditSiteId(s.id); setEditSiteName(s.name); setEditSiteNotes(s.notes ?? '') }}>
                      <Icon name="edit" size={12} />
                    </button>
                    <button className="iconbtn"
                      onClick={() => linkedToProjects ? undefined : setConfirmDeleteSiteId(s.id)}
                      style={{
                        color: linkedToProjects ? 'var(--ink-4)' : 'var(--danger)',
                        cursor: linkedToProjects ? 'not-allowed' : 'pointer',
                      }}
                      title={linkedToProjects ? 'Unlink from all projects before deleting' : 'Delete permanently'}
                      disabled={linkedToProjects}
                    >
                      <Icon name="trash" size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </Drawer>
    </>
  )
}

// ── ClientsPage ────────────────────────────────────────────────────────────────

type ClientTab2 = 'active' | 'prospect' | 'past' | 'archived'

export default function ClientsPage() {
  const state = useCCState()
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [activeTab, setActiveTab] = useState<ClientTab2>('active')
  const [filter, setFilter] = useState('')

  const tabCounts = {
    active:   state.clients.filter(c => c.status === 'active').length,
    prospect: state.clients.filter(c => c.status === 'prospect').length,
    past:     state.clients.filter(c => c.status === 'past').length,
    archived: state.archivedClients.length,
  }

  const sourceList = activeTab === 'archived' ? state.archivedClients : state.clients.filter(c => c.status === activeTab)
  const visible = filter
    ? sourceList.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()) || (c.contactName ?? '').toLowerCase().includes(filter.toLowerCase()))
    : sourceList

  const tabStyle = (t: ClientTab2) => ({
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
        <span className="sp-crumb">{tabCounts.active} active · {tabCounts.prospect} prospects</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Clients</h2>
      </div>

      <div className="subpage-body">
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
          {activeTab !== 'archived' && (
            <button className="btn primary" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={14} /> New client
            </button>
          )}
          <button style={tabStyle('active')} onClick={() => setActiveTab('active')}>
            Active{tabCounts.active > 0 ? ` (${tabCounts.active})` : ''}
          </button>
          <button style={tabStyle('prospect')} onClick={() => setActiveTab('prospect')}>
            Prospects{tabCounts.prospect > 0 ? ` (${tabCounts.prospect})` : ''}
          </button>
          <button style={tabStyle('past')} onClick={() => setActiveTab('past')}>
            Past{tabCounts.past > 0 ? ` (${tabCounts.past})` : ''}
          </button>
          <button style={tabStyle('archived')} onClick={() => setActiveTab('archived')}>
            Archived{tabCounts.archived > 0 ? ` (${tabCounts.archived})` : ''}
          </button>
          <div style={{ flex: 1 }} />
          <input className="input" placeholder="Search clients…" value={filter}
            onChange={e => setFilter(e.target.value)} style={{ width: 240 }} />
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Contact</th>
              <th>Email / Phone</th>
              <th>Projects</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(c => {
              const projects = state.projects.filter(p => p.client === c.name)
              return (
                <tr key={c.id} onClick={() => setSelected(c.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 500 }}>
                    {c.name}
                    {c.abn && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
                        ABN {c.abn}
                      </div>
                    )}
                  </td>
                  <td>
                    {c.clientType ? (
                      <span className="pill" style={{ fontSize: 10 }}>{TYPE_LABEL[c.clientType]}</span>
                    ) : (
                      <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {c.contactName || <span style={{ color: 'var(--ink-3)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {c.email && <div>{c.email}</div>}
                    {c.phone && <div style={{ color: 'var(--ink-3)' }}>{c.phone}</div>}
                    {!c.email && !c.phone && <span style={{ color: 'var(--ink-3)' }}>—</span>}
                  </td>
                  <td className="mono">
                    {projects.length > 0 ? (
                      <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
                    ) : (
                      <span style={{ color: 'var(--ink-3)' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {visible.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '40px 0',
            color: 'var(--ink-3)', fontSize: 13,
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {filter ? 'No clients match your search' : `No ${activeTab === 'prospect' ? 'prospect' : activeTab} clients`}
          </div>
        )}
      </div>

      {selected && (
        <ClientDrawer clientId={selected} state={state} onClose={() => setSelected(null)} />
      )}
      {showAdd && <AddClientModal state={state} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
