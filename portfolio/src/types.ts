export type Language = 'vi' | 'en'
export type LocalizedText = Record<Language, string>

export type Project = {
  name: string
  kind: LocalizedText
  description: LocalizedText
  url: string
  mark: string
  highlights: LocalizedText[]
  image?: string
  imageAlt?: LocalizedText
}

export type ServiceRequest = {
  name: string
  email: string
  phone: string
  organization: string
  service: string
  details: string
  budget: string
  timeline: string
  consent: boolean
  website: string
  language: Language
}

export type FieldErrors = Partial<Record<keyof ServiceRequest, string>>
