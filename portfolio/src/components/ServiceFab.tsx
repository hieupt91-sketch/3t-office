import { forwardRef } from 'react'
import type { Copy } from '../content/copy'
import { MessageIcon } from './Icons'

export const ServiceFab = forwardRef<HTMLButtonElement, { copy: Copy; onClick: () => void }>(({ copy, onClick }, ref) => (
  <button ref={ref} type="button" className="service-fab" onClick={onClick} aria-label={copy.request} title={copy.request}>
    <MessageIcon /><span>{copy.requestShort}</span>
  </button>
))
