import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'

describe('portfolio experience', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('starts with the complete profile and no dialog', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tôi xây những sản phẩm số')
    expect(screen.getByRole('button', { name: 'Gửi yêu cầu hợp tác' })).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens only after activating the floating action and closes with the close button', async () => {
    const user = userEvent.setup()
    render(<App />)
    const trigger = screen.getByRole('button', { name: 'Gửi yêu cầu hợp tác' })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(screen.getByText('Chế độ xem trước')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('switches all modal labels without clearing entered data', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu hợp tác' }))
    await user.type(screen.getByLabelText(/Họ và tên/), 'Phạm Trung Hiếu')
    const dialog = screen.getByRole('dialog')
    await user.click(dialog.querySelector('.dialog-language') as HTMLButtonElement)
    expect(screen.getByRole('dialog', { name: 'Request a Project' })).toBeVisible()
    expect(screen.getByLabelText(/Full name/)).toHaveValue('Phạm Trung Hiếu')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
  })

  it('never reports success in preview mode', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu hợp tác' }))
    const dialog = screen.getByRole('dialog')
    const within_dialog = (q: RegExp) => within(dialog).getByLabelText(q)
    await user.type(within_dialog(/Họ và tên/), 'Nguyễn Văn An')
    await user.type(within_dialog(/^Email/), 'an@example.com')
    await user.selectOptions(within_dialog(/Dịch vụ/), 'web')
    await user.type(within_dialog(/Mô tả yêu cầu/), 'Tôi cần xây dựng một website giới thiệu sản phẩm.')
    await user.click(within_dialog(/Tôi đồng ý/))
    await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }))
    expect(screen.getByRole('status')).toHaveTextContent('chế độ xem trước')
    expect(screen.queryByText(/đã được gửi/)).not.toBeInTheDocument()
  })
})
