import { useEffect, useRef, useState } from 'react'
import { copy } from './content/copy'
import { clientProjects, products } from './data/projects'
import { useLanguage } from './hooks/usePreferences'
import { useVisualEffects } from './hooks/useVisualEffects'
import { About, Capabilities, Company, Footer, ProjectSection } from './components/Sections'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { ServiceFab } from './components/ServiceFab'
import { ServiceRequestModal } from './components/ServiceRequestModal'

export default function App() {
  const [language, setLanguage] = useLanguage()
  const [modalOpen, setModalOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const text = copy[language]
  useVisualEffects()

  useEffect(() => {
    document.documentElement.lang = language
    document.title = language === 'vi' ? 'Phạm Trung Hiếu | Xây dựng sản phẩm phần mềm' : 'Pham Trung Hieu | Software Product Builder'
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', language === 'vi' ? 'Portfolio của Phạm Trung Hiếu — những sản phẩm số cho tài liệu, công việc và vận hành thực tế.' : 'Portfolio of Pham Trung Hieu — digital products for documents, productivity, and real-world operations.')
  }, [language])

  return <>
    <Header copy={text} language={language} onLanguage={() => setLanguage(language === 'vi' ? 'en' : 'vi')} />
    <main id="main-content">
      <Hero copy={text} />
      <About copy={text} />
      <Capabilities copy={text} />
      <ProjectSection id="products" number="02" title={text.productsTitle} lead={text.productsLead} projects={products} language={language} linkLabel={text.openProject} />
      <ProjectSection id="projects" number="03" title={text.projectsTitle} lead={text.projectsLead} projects={clientProjects} language={language} linkLabel={text.openProject} />
      <Company copy={text} />
    </main>
    <Footer copy={text} language={language} />
    <ServiceFab ref={triggerRef} copy={text} onClick={() => setModalOpen(true)} />
    <ServiceRequestModal open={modalOpen} onClose={() => setModalOpen(false)} copy={text} language={language} onLanguage={() => setLanguage(language === 'vi' ? 'en' : 'vi')} triggerRef={triggerRef} />
  </>
}
