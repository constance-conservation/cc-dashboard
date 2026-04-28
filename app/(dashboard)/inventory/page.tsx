'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'
import { Drawer, Field } from '@/components/dashboard/Drawer'
import { Select } from '@/components/dashboard/Select'
import { ConfirmDialog } from '@/components/dashboard/ConfirmDialog'
import { NumericInput } from '@/components/dashboard/NumericInput'
import { createClient } from '@/lib/supabase/client'
import type { InventoryItem } from '@/lib/types'

const CATEGORIES = ['Chemical', 'Equipment', 'PPE', 'Consumable', 'Seed Stock', 'General']
const UNITS = ['units', 'kg', 'L', 'mL', 'boxes', 'bags', 'rolls', 'pairs', 'sets']
const CATEGORY_OPTIONS = CATEGORIES.map(c => ({ value: c, label: c }))
const UNIT_OPTIONS = UNITS.map(u => ({ value: u, label: u }))

type StockStatus = 'ok' | 'low' | 'out'

function stockStatus(item: InventoryItem): StockStatus {
  if (item.quantity === 0) return 'out'
  if (item.quantity <= item.minStock) return 'low'
  return 'ok'
}

const STATUS_COLOR: Record<StockStatus, string> = {
  ok:  'var(--ok, #4a8a4a)',
  low: 'var(--warn, #d99755)',
  out: 'var(--danger, #c94c3f)',
}
const STATUS_LABEL: Record<StockStatus, string> = {
  ok:  'In stock',
  low: 'Low stock',
  out: 'Out of stock',
}

function rowToItem(r: Record<string, unknown>): InventoryItem {
  return {
    id:        r.id        as string,
    name:      r.name      as string,
    category:  r.category  as string,
    quantity:  r.quantity  as number,
    unit:      r.unit      as string,
    minStock:  r.min_stock as number,
    location:  r.location  as string | null,
    notes:     r.notes     as string | null,
    active:    r.active    as boolean,
  }
}

// ── Item card ─────────────────────────────────────────────────
function ItemCard({ item, onOpen }: { item: InventoryItem; onOpen: () => void }) {
  const status = stockStatus(item)
  return (
    <div className="app-card" onClick={onOpen} style={{ cursor: 'pointer', minHeight: 0, gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em', marginBottom: 4 }}>{item.name}</div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--bg-sunken)', color: 'var(--ink-3)', padding: '2px 6px', borderRadius: 4 }}>
            {item.category}
          </span>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: STATUS_COLOR[status] }}>
            {item.quantity}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {item.unit}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {item.location ?? <span style={{ fontStyle: 'italic' }}>No location set</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: STATUS_COLOR[status] }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[status] }} />
          {STATUS_LABEL[status]}
        </div>
      </div>
      {status !== 'ok' && item.minStock > 0 && (
        <div style={{ fontSize: 11, color: 'var(--ink-3)', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          Min stock: {item.minStock} {item.unit}
        </div>
      )}
    </div>
  )
}

// ── Add / Edit drawer ─────────────────────────────────────────
function ItemDrawer({
  item, orgId, onClose, onSaved, onDeleted,
}: {
  item: InventoryItem | null
  orgId: string
  onClose: () => void
  onSaved: (item: InventoryItem) => void
  onDeleted: (id: string) => void
}) {
  const blank: Omit<InventoryItem, 'id' | 'active'> = {
    name: '', category: 'General', quantity: 0, unit: 'units',
    minStock: 0, location: null, notes: null,
  }
  const [form, setForm] = useState<Omit<InventoryItem, 'id' | 'active'>>(
    item ? { name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, minStock: item.minStock, location: item.location, notes: item.notes }
         : blank
  )
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      name:            form.name.trim(),
      category:        form.category,
      quantity:        form.quantity,
      unit:            form.unit,
      min_stock:       form.minStock,
      location:        form.location || null,
      notes:           form.notes || null,
      organization_id: orgId,
      active:          true,
    }
    if (item) {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(payload)
        .eq('id', item.id)
        .select()
        .single()
      if (!error && data) onSaved(rowToItem(data as Record<string, unknown>))
    } else {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert(payload)
        .select()
        .single()
      if (!error && data) onSaved(rowToItem(data as Record<string, unknown>))
    }
    setSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!item) return
    const supabase = createClient()
    await supabase.from('inventory_items').update({ active: false }).eq('id', item.id)
    onDeleted(item.id)
    onClose()
  }

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete "${item?.name}"?`}
          message="This item will be permanently removed from the inventory list."
          confirmLabel="Delete item"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      <Drawer
        title={item ? item.name : 'New item'}
        subtitle={item ? item.category : 'Add to inventory'}
        onClose={onClose}
        onSave={save}
        onDelete={item ? () => setConfirmDelete(true) : undefined}
        saveLabel={saving ? 'Saving…' : item ? 'Save' : 'Add item'}
      >
        <Field label="Item name">
          <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus placeholder="e.g. Glyphosate 360, Hard hat, Secateurs…" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Category">
            <Select value={form.category} onChange={v => setForm({ ...form, category: v })} options={CATEGORY_OPTIONS} />
          </Field>
          <Field label="Location">
            <input className="input" value={form.location ?? ''} onChange={e => setForm({ ...form, location: e.target.value || null })} placeholder="e.g. Shed A, Vehicle 01…" />
          </Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <Field label="Quantity">
            <NumericInput className="input" min={0} step="any" value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} />
          </Field>
          <Field label="Unit">
            <Select value={form.unit} onChange={v => setForm({ ...form, unit: v })} options={UNIT_OPTIONS} />
          </Field>
          <Field label="Min stock (alert)">
            <NumericInput className="input" min={0} step="any" value={form.minStock} onChange={v => setForm({ ...form, minStock: v })} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="input" rows={3} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value || null })} placeholder="Supplier, expiry date, storage requirements…" style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
        </Field>
      </Drawer>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single()
    if (!org) { setLoading(false); return }
    const oid = (org as Record<string, unknown>).id as string
    setOrgId(oid)
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('organization_id', oid)
      .eq('active', true)
      .order('name')
    setItems((data ?? []).map(r => rowToItem(r as Record<string, unknown>)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaved = (saved: InventoryItem) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id)
      return idx >= 0 ? prev.map(i => i.id === saved.id ? saved : i) : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
    })
  }
  const handleDeleted = (id: string) => setItems(prev => prev.filter(i => i.id !== id))

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.location?.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'All' || i.category === categoryFilter
    return matchSearch && matchCat
  })

  const lowCount = items.filter(i => stockStatus(i) === 'low').length
  const outCount = items.filter(i => stockStatus(i) === 'out').length
  const selectedItem = selected ? items.find(i => i.id === selected) ?? null : null

  const categories = ['All', ...CATEGORIES.filter(c => items.some(i => i.category === c))]

  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/" className="back-btn"><Icon name="back" size={16} /> Dashboard</Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">
          {items.length} items
          {lowCount > 0 && <> · <span style={{ color: 'var(--warn)' }}>{lowCount} low stock</span></>}
          {outCount > 0 && <> · <span style={{ color: 'var(--danger)' }}>{outCount} out of stock</span></>}
        </span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">Inventory</h2>
      </div>

      <div className="subpage-body">
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={14} /> Add item</button>
          <div style={{ flex: 1 }} />
          <input className="input" placeholder="Search items or location…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
        </div>

        {/* Category filter chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.04em',
                background: categoryFilter === cat ? 'var(--accent-soft)' : 'var(--bg-sunken)',
                color: categoryFilter === cat ? 'var(--accent)' : 'var(--ink-3)',
                border: '1px solid ' + (categoryFilter === cat ? 'var(--accent)' : 'transparent'),
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {loading ? (
          <div style={{ padding: '40px 0', color: 'var(--ink-3)', fontSize: 13, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Loading inventory…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 0', color: 'var(--ink-3)', fontSize: 13, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {items.length === 0 ? 'No items yet — add your first inventory item.' : 'No items match your search.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {filtered.map(item => (
              <ItemCard key={item.id} item={item} onOpen={() => setSelected(item.id)} />
            ))}
          </div>
        )}
      </div>

      {(selected || showAdd) && orgId && (
        <ItemDrawer
          item={selectedItem}
          orgId={orgId}
          onClose={() => { setSelected(null); setShowAdd(false) }}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
