'use client'

import { Icon } from '@/components/icons/Icon'

type DrawerProps = {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
  onClose: () => void
  onSave?: () => void
  onDelete?: () => void
  onArchive?: () => void
  onRestore?: () => void
  saveLabel?: string
}

export function Drawer({ title, subtitle, children, onClose, onSave, onDelete, onArchive, onRestore, saveLabel = 'Save' }: DrawerProps) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: 0, letterSpacing: '-0.015em' }}>{title}</h3>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{subtitle}</div>}
          </div>
          <button className="iconbtn" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        <div className="drawer-body">{children}</div>
        <div className="drawer-foot">
          {onDelete && (
            <button className="btn" onClick={onDelete} style={{ color: 'var(--danger)' }}>
              <Icon name="trash" size={12} /> Delete
            </button>
          )}
          {onArchive && (
            <button className="btn" onClick={onArchive} style={{ color: 'var(--ink-3)' }}>
              <Icon name="archive" size={12} /> Archive
            </button>
          )}
          {onRestore && (
            <button className="btn" onClick={onRestore} style={{ color: 'var(--accent)' }}>
              <Icon name="unarchive" size={12} /> Restore
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancel</button>
          {onSave && <button className="btn primary" onClick={onSave}>{saveLabel}</button>}
        </div>
      </div>
    </div>
  )
}

type FieldProps = {
  label: string
  children: React.ReactNode
}

export function Field({ label, children }: FieldProps) {
  return (
    <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
