import type { Language } from '../types'

export function readPreference<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = window.localStorage.getItem(key) as T | null
    return value && allowed.includes(value) ? value : fallback
  } catch {
    return fallback
  }
}

export function savePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

export function initialLanguage(): Language {
  return readPreference('portfolio-language', ['vi', 'en'] as const, 'vi')
}
