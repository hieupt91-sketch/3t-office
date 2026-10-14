import { useState } from 'react'
import { initialLanguage, savePreference } from '../lib/preferences'
import type { Language } from '../types'

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(initialLanguage)
  const setLanguage = (value: Language) => {
    setLanguageState(value)
    savePreference('portfolio-language', value)
  }
  return [language, setLanguage] as const
}
