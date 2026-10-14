import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import type { Copy } from '../content/copy'
import { budgets, services, timelines } from '../data/services'
import { submitRequest, isSubmissionConfigured } from '../lib/formSubmission'
import { validateRequest } from '../lib/formValidation'
import type { FieldErrors, Language, ServiceRequest } from '../types'

const blankRequest = (language: Language): ServiceRequest => ({
  name: '', email: '', phone: '', organization: '', service: '', details: '', budget: '', timeline: '', consent: false, website: '', language,
})

type Props = { open: boolean; onClose: () => void; copy: Copy; language: Language; onLanguage: () => void; triggerRef: React.RefObject<HTMLButtonElement | null> }

export function ServiceRequestModal({ open, onClose, copy, language, onLanguage, triggerRef }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [values, setValues] = useState<ServiceRequest>(() => blankRequest(language))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error' | 'demo'>('idle')
  const configured = isSubmissionConfigured()
  const dirty = Object.entries(values).some(([key, value]) => key !== 'language' && key !== 'consent' && Boolean(value)) || values.consent

  useEffect(() => setValues((current) => ({ ...current, language })), [language])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    if (!dialog.open) dialog.showModal()
    document.body.classList.add('modal-open')
    window.setTimeout(() => firstFieldRef.current?.focus(), 0)
    return () => {
      document.body.classList.remove('modal-open')
      if (dialog.open) dialog.close()
    }
  }, [open])

  if (!open) return null

  const requestClose = () => {
    if (dirty && status !== 'success' && !window.confirm(copy.discard)) return
    onClose()
    window.setTimeout(() => triggerRef.current?.focus(), 0)
  }

  const update = <K extends keyof ServiceRequest>(key: K, value: ServiceRequest[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    if (status !== 'submitting') setStatus('idle')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (status === 'submitting') return
    const nextErrors = validateRequest(values, language)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0]
      dialogRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    if (!configured) {
      setStatus('demo')
      return
    }
    setStatus('submitting')
    const result = await submitRequest(values)
    if (result.ok) {
      setStatus('success')
      setValues(blankRequest(language))
      setErrors({})
    } else setStatus(result.reason === 'demo' ? 'demo' : 'error')
  }

  const trapFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href]'))
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }

  const fieldError = (name: keyof ServiceRequest) => errors[name] ? `${name}-error` : undefined
  return <dialog ref={dialogRef} className="service-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={(event) => { event.preventDefault(); requestClose() }} onClick={(event) => { if (event.target === dialogRef.current) requestClose() }} onKeyDown={trapFocus}>
    <div className="dialog-panel">
      <header className="dialog-header">
        <div><p className="section-label">{copy.requestShort}</p><h2 id={titleId}>{copy.request}</h2><p id={descriptionId}>{copy.modalIntro}</p></div>
        <div className="dialog-tools">
          <button type="button" className="dialog-language" onClick={onLanguage}>{copy.language}</button>
          <button type="button" className="dialog-close" aria-label={copy.close} onClick={requestClose}>×</button>
        </div>
      </header>
      {!configured && <div className="demo-notice" role="note"><strong>{copy.demoTitle}</strong><span>{copy.demoBody}</span></div>}
      <form noValidate onSubmit={handleSubmit}>
        <div className="form-grid">
          <Field label={copy.fields.name} required error={errors.name}><input ref={firstFieldRef} name="name" autoComplete="name" value={values.name} onChange={(e) => update('name', e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={fieldError('name')} /></Field>
          <Field label={copy.fields.email} required error={errors.email}><input name="email" type="email" autoComplete="email" value={values.email} onChange={(e) => update('email', e.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={fieldError('email')} /></Field>
          <Field label={copy.fields.phone} optional={copy.fields.optional} error={errors.phone}><input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={(e) => update('phone', e.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={fieldError('phone')} /></Field>
          <Field label={copy.fields.organization} optional={copy.fields.optional} error={errors.organization}><input name="organization" autoComplete="organization" value={values.organization} onChange={(e) => update('organization', e.target.value)} aria-invalid={Boolean(errors.organization)} aria-describedby={fieldError('organization')} /></Field>
          <Field label={copy.fields.service} required error={errors.service}><select name="service" value={values.service} onChange={(e) => update('service', e.target.value)} aria-invalid={Boolean(errors.service)} aria-describedby={fieldError('service')}><option value="">{copy.placeholders.select}</option>{services.map((option) => <option key={option.value} value={option.value}>{option.label[language]}</option>)}</select></Field>
          <Field label={copy.fields.budget} optional={copy.fields.optional} error={errors.budget}><select name="budget" value={values.budget} onChange={(e) => update('budget', e.target.value)} aria-invalid={Boolean(errors.budget)} aria-describedby={fieldError('budget')}><option value="">{copy.placeholders.select}</option>{budgets.map((option) => <option key={option.value} value={option.value}>{option.label[language]}</option>)}</select></Field>
          <Field label={copy.fields.timeline} optional={copy.fields.optional} error={errors.timeline}><select name="timeline" value={values.timeline} onChange={(e) => update('timeline', e.target.value)} aria-invalid={Boolean(errors.timeline)} aria-describedby={fieldError('timeline')}><option value="">{copy.placeholders.select}</option>{timelines.map((option) => <option key={option.value} value={option.value}>{option.label[language]}</option>)}</select></Field>
          <Field className="full-field" label={copy.fields.details} required error={errors.details}><textarea name="details" rows={5} maxLength={5000} placeholder={copy.placeholders.details} value={values.details} onChange={(e) => update('details', e.target.value)} aria-invalid={Boolean(errors.details)} aria-describedby={fieldError('details')} /><small>{values.details.length}/5000</small></Field>
          <div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(e) => update('website', e.target.value)} /></label></div>
        </div>
        <label className="consent"><input name="consent" type="checkbox" checked={values.consent} onChange={(e) => update('consent', e.target.checked)} aria-invalid={Boolean(errors.consent)} aria-describedby={fieldError('consent')} /><span>{copy.fields.consent}</span></label>
        {errors.consent && <span className="field-error" id="consent-error">{errors.consent}</span>}
        <p className="privacy-note">{copy.privacy}</p>
        {status !== 'idle' && status !== 'submitting' && <div className={`submit-message ${status}`} role="status" aria-live="polite">{status === 'success' ? copy.success : status === 'demo' ? copy.demoError : copy.error}</div>}
        <div className="form-actions"><a href="mailto:hieupt.qb@gmail.com">hieupt.qb@gmail.com</a><button className="button button-primary" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? copy.sending : copy.send}</button></div>
      </form>
    </div>
  </dialog>
}

function Field({ label, required, optional, error, className = '', children }: { label: string; required?: boolean; optional?: string; error?: string; className?: string; children: React.ReactNode }) {
  return <label className={`field ${className}`}><span>{label}{required && <b aria-hidden="true"> *</b>}{!required && optional && <em>{optional}</em>}</span>{children}{error && <span className="field-error" id={`${String((children as React.ReactElement<{ name?: string }>).props.name)}-error`}>{error}</span>}</label>
}
