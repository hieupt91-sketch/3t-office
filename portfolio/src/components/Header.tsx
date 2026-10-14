import { useState } from 'react'
import type { Copy } from '../content/copy'
import type { Language } from '../types'

type Props = { copy: Copy; language: Language; onLanguage: () => void }

export function Header({ copy, language, onLanguage }: Props) {
  const [open, setOpen] = useState(false)
  const links: [string, string][] = [
    ['about', copy.nav.about],
    ['products', copy.nav.products],
    ['projects', copy.nav.projects],
    ['company', copy.nav.company],
    ['contact', copy.nav.contact],
  ]
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="Phạm Trung Hiếu — Trang chủ">
        <span className="brand-mark" aria-hidden="true">PH</span>
        <strong className="brand-name">Phạm Trung Hiếu</strong>
      </a>
      <button
        className="menu-button icon-button"
        type="button"
        aria-expanded={open}
        aria-controls="main-nav"
        aria-label={open ? copy.closeMenu : copy.menu}
        onClick={() => setOpen(!open)}
      >
        <span className={open ? 'menu-lines is-open' : 'menu-lines'} aria-hidden="true" />
      </button>
      <nav
        id="main-nav"
        className={open ? 'main-nav is-open' : 'main-nav'}
        aria-label={language === 'vi' ? 'Điều hướng chính' : 'Main navigation'}
      >
        {links.map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{label}</a>
        ))}
        <div className="header-actions">
          <button type="button" className="text-button" onClick={onLanguage}>{copy.language}</button>
        </div>
      </nav>
    </header>
  )
}
