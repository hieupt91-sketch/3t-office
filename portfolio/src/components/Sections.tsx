import type { Copy } from '../content/copy'
import type { Language, Project } from '../types'
import { ArrowUpRight } from './Icons'

export function About({ copy }: { copy: Copy }) {
  return <section className="section about-section" id="about" aria-labelledby="about-title" data-reveal>
    <div className="section-number">01</div>
    <div className="about-grid">
      <div><p className="section-label">{copy.nav.about}</p><h2 id="about-title">{copy.aboutTitle}</h2></div>
      <div><p className="large-copy">{copy.aboutBody}</p><ol className="principles">{copy.principles.map((item, index) => <li key={item}><span>0{index + 1}</span>{item}</li>)}</ol></div>
    </div>
  </section>
}

export function Capabilities({ copy }: { copy: Copy }) {
  return <section className="capabilities" aria-labelledby="capabilities-title" data-reveal>
    <p className="section-label" id="capabilities-title">{copy.capabilitiesTitle}</p>
    <div className="capability-list">{copy.capabilities.map((item, index) => <div key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></div>)}</div>
  </section>
}

function ProjectCard({ project, language, linkLabel }: { project: Project; language: Language; linkLabel: string }) {
  return <article className="project-card" data-reveal>
    <div className={project.image ? 'project-visual has-image' : 'project-visual'}>
      {project.image ? <img src={project.image} alt={project.imageAlt?.[language] ?? ''} width="1350" height="749" loading="lazy" /> : <><span aria-hidden="true">{project.mark}</span><div className="grid-lines" aria-hidden="true" /></>}
      {project.image && <span className="visual-code" aria-hidden="true">{project.mark}</span>}
    </div>
    <div className="project-body">
      <p className="card-kind">{project.kind[language]}</p>
      <h3>{project.name}</h3>
      <p>{project.description[language]}</p>
      <div className="project-tags">{project.highlights.map((highlight) => <span key={highlight.en}>{highlight[language]}</span>)}</div>
      <a href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`${linkLabel}: ${project.name} (${language === 'vi' ? 'mở trong tab mới' : 'opens in a new tab'})`}>{linkLabel}<ArrowUpRight /></a>
    </div>
  </article>
}

export function ProjectSection({ id, number, title, lead, projects, language, linkLabel }: { id: string; number: string; title: string; lead: string; projects: Project[]; language: Language; linkLabel: string }) {
  return <section className="section work-section" id={id} aria-labelledby={`${id}-title`}>
    <div className="section-heading"><div><span className="section-number">{number}</span><p className="section-label">{title}</p><h2 id={`${id}-title`}>{title}</h2></div><p>{lead}</p></div>
    <div className="project-grid">{projects.map((project) => <ProjectCard key={project.name} project={project} language={language} linkLabel={linkLabel} />)}</div>
  </section>
}

export function Company({ copy }: { copy: Copy }) {
  return <section className="company-section" id="company" aria-labelledby="company-title" data-reveal>
    <div className="company-mark" aria-hidden="true"><span>3T</span></div>
    <div><p className="section-label">{copy.companyKicker}</p><h2 id="company-title">{copy.companyTitle}</h2><p>{copy.companyBody}</p><a className="button button-light" href="https://3tcomputer.com/" target="_blank" rel="noopener noreferrer">{copy.visitCompany}<ArrowUpRight /></a></div>
  </section>
}

export function Footer({ copy, language }: { copy: Copy; language: Language }) {
  return <footer id="contact" className="site-footer" data-reveal>
    <div><p className="section-label">{copy.nav.contact}</p><h2>{copy.contactTitle}</h2><p>{copy.contactBody}</p><a href="mailto:hieupt.qb@gmail.com">{copy.email}: hieupt.qb@gmail.com</a></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Phạm Trung Hiếu</span><span>{copy.copyright}</span><span>{language.toUpperCase()}</span></div>
  </footer>
}
