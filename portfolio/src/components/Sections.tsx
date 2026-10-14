import type { Copy } from '../content/copy'
import type { Language, Project } from '../types'
import { ArrowUpRight } from './Icons'

export function About({ copy }: { copy: Copy }) {
  return (
    <section className="section about-section" id="about" aria-labelledby="about-title" data-reveal>
      <div className="section-number">01</div>
      <div className="about-grid">
        <div>
          <p className="section-label">{copy.nav.about}</p>
          <h2 id="about-title">{copy.aboutTitle}</h2>
        </div>
        <div>
          <p className="large-copy">{copy.aboutBody}</p>
          <ol className="principles">
            {copy.principles.map((item, index) => (
              <li key={item}>
                <span>0{index + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

export function Capabilities({ copy }: { copy: Copy }) {
  return (
    <section className="capabilities" aria-labelledby="capabilities-title" data-reveal>
      <p className="section-label" id="capabilities-title">{copy.capabilitiesTitle}</p>
      <div className="capability-list">
        {copy.capabilities.map((item, index) => (
          <div key={item}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function ProjectCard({ project, language, linkLabel, delay }: {
  project: Project
  language: Language
  linkLabel: string
  delay?: '1' | '2' | '3'
}) {
  const hasImage = Boolean(project.image)
  return (
    <article
      className="project-card"
      data-reveal
      {...(delay ? { 'data-reveal-delay': delay } : {})}
    >
      <div className={hasImage ? 'project-visual has-image' : 'project-visual'}>
        {hasImage
          ? <img src={project.image} alt={project.imageAlt?.[language] ?? ''} width="1440" height="1000" loading="lazy" decoding="async" />
          : (
            <>
              <span aria-hidden="true">{project.mark}</span>
              <div className="grid-lines" aria-hidden="true" />
            </>
          )
        }
        <span className="visual-code" aria-hidden="true">{project.mark}</span>
      </div>
      <div className="project-body">
        <p className="card-kind">{project.kind[language]}</p>
        <h3>{project.name}</h3>
        <p>{project.description[language]}</p>
        <div className="project-tags">
          {project.highlights.map((h) => (
            <span key={h.en}>{h[language]}</span>
          ))}
        </div>
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${linkLabel}: ${project.name} (${language === 'vi' ? 'mở trong tab mới' : 'opens in a new tab'})`}
        >
          {linkLabel}
          <ArrowUpRight />
        </a>
      </div>
    </article>
  )
}

const DELAYS = [undefined, '1', '2', '3'] as const

export function ProjectSection({
  id, number, title, lead, projects, language, linkLabel,
}: {
  id: string
  number: string
  title: string
  lead: string
  projects: Project[]
  language: Language
  linkLabel: string
}) {
  return (
    <section className="section work-section" id={id} aria-labelledby={`${id}-title`}>
      <div className="section-heading">
        <div>
          <span className="section-number">{number}</span>
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
        <p>{lead}</p>
      </div>
      <div className="project-grid">
        {projects.map((project, i) => (
          <ProjectCard
            key={project.name}
            project={project}
            language={language}
            linkLabel={linkLabel}
            delay={DELAYS[i % DELAYS.length]}
          />
        ))}
      </div>
    </section>
  )
}

export function Company({ copy }: { copy: Copy }) {
  return (
    <section className="company-section" id="company" aria-labelledby="company-title" data-reveal>
      <div className="company-mark" aria-hidden="true">
        <img
          src="./projects/3t-logo.png"
          alt=""
          width="1024"
          height="1024"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div>
        <p className="section-label">{copy.companyKicker}</p>
        <h2 id="company-title">{copy.companyTitle}</h2>
        <p>{copy.companyBody}</p>
        <a
          className="button button-light"
          href="https://3tcomputer.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {copy.visitCompany}
          <ArrowUpRight />
        </a>
      </div>
    </section>
  )
}

export function Footer({ copy, language }: { copy: Copy; language: Language }) {
  return (
    <footer id="contact" className="site-footer" data-reveal>
      <div>
        <p className="section-label">{copy.nav.contact}</p>
        <h2>{copy.contactTitle}</h2>
        <p style={{ color: 'var(--muted)', lineHeight: 1.75, maxWidth: 640 }}>
          {copy.contactBody}
        </p>
        <div className="contact-links">
          <a
            className="contact-link primary"
            href="mailto:hieupt.qb@gmail.com"
            aria-label={`${copy.contactEmail}: hieupt.qb@gmail.com`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M1.5 4.5L8 9l6.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            hieupt.qb@gmail.com
          </a>
          <a
            className="contact-link"
            href="tel:+84967136099"
            aria-label={`${copy.contactPhone}: +84 967 136 099`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 2.5C3 2.22 3.22 2 3.5 2h2.62c.26 0 .48.19.5.45l.5 3a.5.5 0 01-.29.52l-1.3.65a7.5 7.5 0 003.32 3.32l.65-1.3a.5.5 0 01.52-.29l3 .5c.26.02.45.24.45.5V12.5c0 .28-.22.5-.5.5C5.94 13 3 10.06 3 6.5v-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            +84 967 136 099
          </a>
          <a
            className="contact-link"
            href="https://3tcomputer.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 2c-2 2-2 4-2 6s0 4 2 6M8 2c2 2 2 4 2 6s0 4-2 6M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            3tcomputer.com
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Phạm Trung Hiếu</span>
        <span>{copy.copyright}</span>
        <span>{language.toUpperCase()}</span>
      </div>
    </footer>
  )
}
