import type { Copy } from '../content/copy'
import { ArrowUpRight } from './Icons'

export function Hero({ copy }: { copy: Copy }) {
  return <section className="hero" id="top" aria-labelledby="hero-title">
    <div className="hero-copy" data-reveal>
      <p className="eyebrow"><span />{copy.eyebrow}</p>
      <h1 id="hero-title">{copy.headline}</h1>
      <p className="hero-intro">{copy.intro}</p>
      <div className="hero-actions">
        <a className="button button-primary" href="#products">{copy.explore}<ArrowUpRight /></a>
        <a className="button button-quiet" href="#about">{copy.aboutLink}</a>
      </div>
    </div>
    <div className="hero-object" aria-hidden="true" data-reveal>
      <div className="orbit orbit-one" /><div className="orbit orbit-two" />
      <div className="monogram"><span>PH</span><small>3T · SOFTWARE</small></div>
      <div className="status-chip"><i />{copy.selectedWork}</div>
    </div>
  </section>
}
