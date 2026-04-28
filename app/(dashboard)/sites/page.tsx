'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCCState } from '@/lib/store/CCStateContext'
import { Icon } from '@/components/icons/Icon'
import { Drawer, Field } from '@/components/dashboard/Drawer'
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog'
import { createClient } from '@/lib/supabase/client'
import type { Site } from '@/lib/types'

// ── AddSiteModal ───────────────────────────────────────────────

function AddSiteModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (name: string, notes?: string) => Promise<string | null>
}) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    const err = await onCreate(name.trim(), notes.trim() || undefined)
    setSaving(false)
    if (err === null) onClose()
    else setError(err)
  }

  return (
    <Drawer title="New location" subtitle="Add to org library" onClose={onClose} onSave={save}
      saveLabel={saving ? 'Creating…' : 'Create'} saveDisabled={saving}>
      <Field label="Location name">
        <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus />
      </Field>
      <Field label="Notes (optional)">
        <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
          style={{ resize: 'vertical', fontFamily: 'inherit' }} />
      </Field>
      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 12, background: 'oklch(0.95 0.02 25)', color: 'var(--danger)', border: '1px solid oklch(0.85 0.06 25)' }}>
          {error}
        </div>
      )}
    </Drawer>
  )
}

// ── SitesPage ──────────────────────────────────────────────────

export default function SitesPage() {
  const state = useCCState()
  const [showAdd, setShowAdd] = useState(false)
  const [editSiteId, setEditSiteId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [newSites, setNewSites] = useState<Site[]>([])
  const [filter, setFilter] = useState('')

  const allSites = [...state.sites, ...newSites.filter(ns => !state.sites.find(s => s.id === ns.id))]
  const visible = filter
    ? allSites.filter(s => s.name.toLowerCase().includes(filter.toLowerCase()))
    : allSites

  async function createSiteInline(name: string, notes?: string): Promise<string | null> {
    const supabase = createClient()
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    if (!org) return 'Failed to load org'
    const { data: inserted, error } = await supabase
      .from('sites')
      .insert({
        organization_id: (org as Record<string, unknown>).id as string,
        name: name.trim(),
        notes: notes || null,
        active: true,
        sort_order: 0,
      })
      .select('id, name, notes, active, sort_order')
      .single()
    if (error || !inserted) return error?.message ?? 'Unknown error'
    const row = inserted as Record<string, unknown>
    setNewSites(prev => [
      ...prev,
      {
        id: row.id as string,
        name: row.name as string,
        notes: (row.notes as string) || undefined,
        active: row.active as boolean,
        sortOrder: row.sort_order as number,
      },
    ])
    return null
  }

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">{allSites.length} location{allSites.length !== 1 ? 's' : ''}</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Sites</h2>
      </div>

      <div className="subpage-body">
        <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
          <button className="btn primary" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={14} /> New site
          </button>
          <div style={{ flex: 1 }} />
          <input className="input" placeholder="Search sites…" value={filter}
            onChange={e => setFilter(e.target.value)} style={{ width: 240 }} />
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Notes</th>
              <th>Linked projects</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map(s => {
              const links = state.projectSiteLinks.filter(l => l.siteId === s.id)
              const linkedNames = links
                .map(l => state.projects.find(p => p.id === l.projectId)?.name)
                .filter((n): n is string => Boolean(n))
              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>
                    {editSiteId === s.id ? (
                      <input
                        className="input"
                        defaultValue={s.name}
                        onBlur={e => {
                          state.updateSite(s.id, { name: e.target.value.trim() || s.name })
                          setEditSiteId(null)
                        }}
                        autoFocus
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <span onClick={() => setEditSiteId(s.id)} style={{ cursor: 'text' }}>{s.name}</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                    {s.notes
                      ? (s.notes.length > 60 ? s.notes.slice(0, 60) + '…' : s.notes)
                      : '—'}
                  </td>
                  <td>
                    {links.length === 0 ? (
                      <span style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>None</span>
                    ) : (
                      <div>
                        <span className="pill" style={{ fontSize: 10 }}>
                          {links.length} project{links.length !== 1 ? 's' : ''}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                          {linkedNames.join(', ')}
                        </div>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="iconbtn" onClick={() => setEditSiteId(s.id)}>
                        <Icon name="edit" size={12} />
                      </button>
                      <button
                        className="iconbtn"
                        onClick={() => links.length === 0 ? setConfirmDeleteId(s.id) : undefined}
                        style={{
                          color: links.length === 0 ? 'var(--danger)' : 'var(--ink-4)',
                          cursor: links.length === 0 ? 'pointer' : 'not-allowed',
                        }}
                        title={links.length > 0 ? 'Unlink from all projects before deleting' : 'Delete permanently'}
                        disabled={links.length > 0}
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
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
            {filter ? 'No sites match your search' : 'No sites yet — add one above'}
          </div>
        )}
      </div>

      {showAdd && (
        <AddSiteModal onClose={() => setShowAdd(false)} onCreate={createSiteInline} />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete location permanently?"
          message="This will permanently remove the location from the org library. This cannot be undone."
          confirmLabel="Delete location"
          danger
          onConfirm={() => {
            state.deleteSite(confirmDeleteId)
            setConfirmDeleteId(null)
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
