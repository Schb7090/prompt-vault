// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import prisma from '../__mocks__/prisma'

vi.mock('@/lib/prisma', () => ({ default: prisma }))
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_new: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn().mockReturnValue(Buffer.from('fake-xlsx')),
}))

const mockPrompts = [
  {
    id: 'p1',
    title: 'Test Prompt',
    model: 'GPT-4o',
    environment: 'ChatGPT',
    goodFor: 'Writing',
    rating: 4,
    description: 'A test',
    content: 'Do something',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    category: { id: 'cat-1', name: 'Coding', color: '#3b82f6' },
  },
]

describe('GET /api/export', () => {
  it('returns an xlsx file response with correct content-type', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.prompt.findMany.mockResolvedValue(mockPrompts as any)

    const { GET } = await import('@/app/api/export/route')
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('spreadsheetml')
    expect(response.headers.get('Content-Disposition')).toContain('prompts_export.xlsx')
  })

  it('maps prompts to correct column names', async () => {
    const { utils } = await import('xlsx')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.prompt.findMany.mockResolvedValue(mockPrompts as any)

    const { GET } = await import('@/app/api/export/route')
    await GET()

    expect(utils.json_to_sheet).toHaveBeenCalledWith([
      expect.objectContaining({
        Title: 'Test Prompt',
        Model: 'GPT-4o',
        Environment: 'ChatGPT',
        'Good For': 'Writing',
        Rating: 4,
        Category: 'Coding',
      }),
    ])
  })

  it('uses "N/A" for prompts without a category', async () => {
    const { utils } = await import('xlsx')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.prompt.findMany.mockResolvedValue([{ ...mockPrompts[0], category: null }] as any)

    const { GET } = await import('@/app/api/export/route')
    await GET()

    expect(utils.json_to_sheet).toHaveBeenCalledWith([
      expect.objectContaining({ Category: 'N/A' }),
    ])
  })

  it('returns 500 when prisma throws', async () => {
    prisma.prompt.findMany.mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/export/route')
    const response = await GET()

    expect(response.status).toBe(500)
  })
})
