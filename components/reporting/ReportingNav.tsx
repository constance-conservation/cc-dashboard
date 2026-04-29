'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/icons/Icon'

type IconName = 'projects' | 'tasks' | 'employees' | 'staff' | 'cloud' | 'archive' | 'edit' | 'check'

type NavItem =
  | { name: string; icon: IconName; href: string }
  | { name: string; icon: IconName; href: null }

type Section = { heading: string; items: NavItem[] }

const SECTIONS: Section[] = [
  {
    heading: 'Overview',
    items: [
      { name: 'Dashboard',   icon: 'projects',  href: '/reporting' },
      { name: 'Inspections', icon: 'tasks',     href: '/reporting/inspections' },
      { name: 'Sites',       icon: 'projects',  href: '/reporting/sites' },
      { name: 'Clients',     icon: 'employees', href: '/reporting/clients' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { name: 'Staff & Hours', icon: 'staff',   href: '/reporting/staff' },
      { name: 'Chemicals',     icon: 'cloud',   href: '/reporting/chemicals' },
      { name: 'Species',       icon: 'archive', href: '/reporting/species' },
    ],
  },
  {
    heading: 'Reports',
    items: [
      { name: 'Client Reports',  icon: 'edit',  href: '/reporting/reports' },
      { name: 'Pipeline Health', icon: 'check', href: '/reporting/pipeline' },
    ],
  },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/reporting') return pathname === '/reporting'
  return pathname === href || pathname.startsWith(href + '/')
}

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  padding: '14px 16px 6px',
}

const itemBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 16px',
  fontSize: 13,
  textDecoration: 'none',
  borderLeft: '2px solid transparent',
  color: 'var(--ink)',
}

const itemActive: React.CSSProperties = {
  ...itemBase,
  color: 'var(--accent)',
  background: 'var(--accent-soft)',
  borderLeftColor: 'var(--accent)',
  fontWeight: 500,
}

const itemDisabled: React.CSSProperties = {
  ...itemBase,
  color: 'var(--ink-3)',
  cursor: 'not-allowed',
  opacity: 0.55,
}

export function ReportingNav() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: 220,
        borderRight: '1px solid var(--line)',
        background: 'var(--bg-elev)',
        paddingBottom: 16,
        position: 'sticky',
        top: 52,
        alignSelf: 'flex-start',
        height: 'calc(100vh - 52px)',
        overflowY: 'auto',
      }}
    >
      {SECTIONS.map((section) => (
        <div key={section.heading}>
          <div style={headingStyle}>{section.heading}</div>
          {section.items.map((item) => {
            if (item.href === null) {
              return (
                <div
                  key={item.name}
                  style={itemDisabled}
                  title="Coming soon"
                  aria-disabled="true"
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.name}</span>
                </div>
              )
            }
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                style={active ? itemActive : itemBase}
              >
                <Icon name={item.icon} size={16} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </aside>
  )
}
