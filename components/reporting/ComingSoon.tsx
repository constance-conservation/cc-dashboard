import Link from 'next/link'
import { Icon } from '@/components/icons/Icon'

export function ComingSoon({ title, crumb }: { title: string; crumb: string }) {
  return (
    <div className="subpage">
      <div className="subpage-top">
        <Link href="/reporting" className="back-btn">
          <Icon name="back" size={16} /> Reporting
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line)' }} />
        <span className="sp-crumb">{crumb}</span>
        <div style={{ flex: 1 }} />
        <h2 className="sp-title">{title}</h2>
      </div>
      <div className="subpage-body">
        <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--ink-3)' }}>Coming soon</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8 }}>
            This route will be ported in a follow-up brief (E9–E11).
          </div>
        </div>
      </div>
    </div>
  )
}
