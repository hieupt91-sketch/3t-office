import type { LocalizedText } from '../types'

export type Option = { value: string; label: LocalizedText }

export const services: Option[] = [
  { value: 'custom-software', label: { vi: 'Phát triển phần mềm theo yêu cầu', en: 'Custom Software Development' } },
  { value: 'web', label: { vi: 'Website và ứng dụng web', en: 'Website & Web Applications' } },
  { value: 'business', label: { vi: 'Phần mềm quản lý bán hàng, doanh nghiệp', en: 'Business & Sales Management Systems' } },
  { value: 'mobile', label: { vi: 'Ứng dụng di động', en: 'Mobile Applications' } },
  { value: 'education', label: { vi: 'Giải pháp công nghệ giáo dục', en: 'Education Technology' } },
  { value: 'infrastructure', label: { vi: 'Server và hạ tầng CNTT', en: 'IT Infrastructure' } },
  { value: 'consulting', label: { vi: 'Tư vấn giải pháp', en: 'Technology Consulting' } },
  { value: 'other', label: { vi: 'Khác', en: 'Other' } },
]

export const budgets: Option[] = [
  { value: 'unknown', label: { vi: 'Không rõ', en: 'Not sure' } },
  { value: 'under-10m', label: { vi: 'Dưới 10 triệu', en: 'Under VND 10 million' } },
  { value: '10m-30m', label: { vi: '10–30 triệu', en: 'VND 10–30 million' } },
  { value: '30m-100m', label: { vi: '30–100 triệu', en: 'VND 30–100 million' } },
  { value: 'over-100m', label: { vi: 'Trên 100 triệu', en: 'Over VND 100 million' } },
  { value: 'discuss', label: { vi: 'Trao đổi thêm', en: 'Let’s discuss' } },
]

export const timelines: Option[] = [
  { value: 'asap', label: { vi: 'Sớm nhất', en: 'As soon as possible' } },
  { value: '1-3-months', label: { vi: '1–3 tháng', en: '1–3 months' } },
  { value: 'over-3-months', label: { vi: 'Trên 3 tháng', en: 'More than 3 months' } },
  { value: 'unknown', label: { vi: 'Chưa xác định', en: 'Not decided' } },
]
