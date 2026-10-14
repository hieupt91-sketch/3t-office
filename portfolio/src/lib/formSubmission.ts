import type { ServiceRequest } from '../types'

export type SubmissionResult = { ok: true } | { ok: false; reason: 'demo' | 'provider' }

function configuredEndpoint(): string | null {
  const endpoint = import.meta.env.VITE_FORM_ENDPOINT?.trim()
  if (!endpoint) return null
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

export function isSubmissionConfigured() {
  return configuredEndpoint() !== null
}

export async function submitRequest(values: ServiceRequest, signal?: AbortSignal): Promise<SubmissionResult> {
  const endpoint = configuredEndpoint()
  if (!endpoint) return { ok: false, reason: 'demo' }
  if (values.website) return { ok: false, reason: 'provider' }

  const payload = {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    organization: values.organization.trim(),
    service: values.service,
    details: values.details.trim(),
    budget: values.budget,
    timeline: values.timeline,
    consent: values.consent,
    language: values.language,
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
    return response.ok ? { ok: true } : { ok: false, reason: 'provider' }
  } catch {
    return { ok: false, reason: 'provider' }
  }
}
