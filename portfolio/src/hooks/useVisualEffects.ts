import { useEffect } from 'react'

export function useVisualEffects() {
  useEffect(() => {
    const root = document.documentElement
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    root.classList.add('effects-ready')

    const revealItems = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (reduced || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'))
      return () => root.classList.remove('effects-ready')
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    revealItems.forEach((item) => observer.observe(item))

    const trackPointer = (event: PointerEvent) => {
      root.style.setProperty('--pointer-x', `${event.clientX}px`)
      root.style.setProperty('--pointer-y', `${event.clientY}px`)
    }
    window.addEventListener('pointermove', trackPointer, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('pointermove', trackPointer)
      root.classList.remove('effects-ready')
    }
  }, [])
}
