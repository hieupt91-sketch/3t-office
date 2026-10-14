import { budgets, services, timelines } from '../data/services'
import type { FieldErrors, Language, ServiceRequest } from '../types'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const phonePattern = /^\+?[0-9 ()-]{7,24}$/

const messages = {
  vi: {
    required: 'Trường này là bắt buộc.', name: 'Họ tên phải có từ 2 đến 100 ký tự.', email: 'Vui lòng nhập email hợp lệ, tối đa 254 ký tự.', phone: 'Vui lòng nhập số điện thoại hợp lệ.', organization: 'Tổ chức không được vượt quá 150 ký tự.', details: 'Mô tả phải có từ 20 đến 5.000 ký tự.', select: 'Vui lòng chọn một giá trị hợp lệ.', consent: 'Bạn cần đồng ý trước khi gửi.',
  },
  en: {
    required: 'This field is required.', name: 'Name must contain 2–100 characters.', email: 'Enter a valid email of no more than 254 characters.', phone: 'Enter a valid phone number.', organization: 'Organization must not exceed 150 characters.', details: 'Project details must contain 20–5,000 characters.', select: 'Select a valid option.', consent: 'You must agree before submitting.',
  },
}

const hasOption = (options: { value: string }[], value: string) => options.some((option) => option.value === value)

export function validateRequest(values: ServiceRequest, language: Language): FieldErrors {
  const errors: FieldErrors = {}
  const msg = messages[language]
  const name = values.name.trim()
  const email = values.email.trim()
  const phone = values.phone.trim()
  const organization = values.organization.trim()
  const details = values.details.trim()

  if (name.length < 2 || name.length > 100) errors.name = msg.name
  if (!email) errors.email = msg.required
  else if (email.length > 254 || !emailPattern.test(email)) errors.email = msg.email
  if (phone && !phonePattern.test(phone)) errors.phone = msg.phone
  if (organization.length > 150) errors.organization = msg.organization
  if (!hasOption(services, values.service)) errors.service = msg.select
  if (details.length < 20 || details.length > 5000) errors.details = msg.details
  if (values.budget && !hasOption(budgets, values.budget)) errors.budget = msg.select
  if (values.timeline && !hasOption(timelines, values.timeline)) errors.timeline = msg.select
  if (!values.consent) errors.consent = msg.consent
  return errors
}
