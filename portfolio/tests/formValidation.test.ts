import { describe, expect, it } from 'vitest'
import { validateRequest } from '../src/lib/formValidation'
import type { ServiceRequest } from '../src/types'

const valid: ServiceRequest = {
  name: 'Nguyễn Văn An', email: 'an@example.com', phone: '+84 912 345 678', organization: '3T', service: 'web',
  details: 'Tôi cần xây dựng một website giới thiệu sản phẩm.', budget: '10m-30m', timeline: '1-3-months', consent: true, website: '', language: 'vi',
}

describe('validateRequest', () => {
  it('accepts a valid Vietnamese request', () => {
    expect(validateRequest(valid, 'vi')).toEqual({})
  })

  it('rejects required, boundary, and tampered values', () => {
    const errors = validateRequest({ ...valid, name: 'A', email: 'bad', service: 'forged', details: 'quá ngắn', consent: false }, 'vi')
    expect(errors).toMatchObject({ name: expect.any(String), email: expect.any(String), service: expect.any(String), details: expect.any(String), consent: expect.any(String) })
  })

  it('allows exact documented text boundaries', () => {
    expect(validateRequest({ ...valid, name: 'An', details: 'a'.repeat(20) }, 'en')).toEqual({})
    expect(validateRequest({ ...valid, name: 'a'.repeat(101), details: 'a'.repeat(5001) }, 'en')).toMatchObject({ name: expect.any(String), details: expect.any(String) })
  })
})
