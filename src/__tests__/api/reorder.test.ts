import { describe, it, expect, vi } from 'vitest'
import prisma from '../__mocks__/prisma'

vi.mock('@/lib/prisma', () => ({ default: prisma }))

describe('PUT /api/prompts/reorder', () => {
  it('calls $transaction with update operations for each prompt', async () => {
    prisma.$transaction.mockResolvedValue([])
    prisma.prompt.update.mockReturnValue({} as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    const { PUT } = await import('@/app/api/prompts/reorder/route')
    const request = new Request('http://localhost/api/prompts/reorder', {
      method: 'PUT',
      body: JSON.stringify({
        prompts: [
          { id: 'p1', order: 0 },
          { id: 'p2', order: 1 },
          { id: 'p3', order: 2 },
        ],
      }),
    })
    const response = await PUT(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(prisma.$transaction).toHaveBeenCalledOnce()
    expect(prisma.prompt.update).toHaveBeenCalledTimes(3)
  })

  it('passes correct order and id to each update', async () => {
    prisma.$transaction.mockResolvedValue([])
    prisma.prompt.update.mockReturnValue({} as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    const { PUT } = await import('@/app/api/prompts/reorder/route')
    const request = new Request('http://localhost/api/prompts/reorder', {
      method: 'PUT',
      body: JSON.stringify({
        prompts: [{ id: 'p1', order: 5, categoryId: 'cat-2' }],
      }),
    })
    await PUT(request)

    expect(prisma.prompt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ order: 5 }),
      })
    )
  })

  it('returns 500 when transaction fails', async () => {
    prisma.$transaction.mockRejectedValue(new Error('Transaction failed'))

    const { PUT } = await import('@/app/api/prompts/reorder/route')
    const request = new Request('http://localhost/api/prompts/reorder', {
      method: 'PUT',
      body: JSON.stringify({ prompts: [{ id: 'p1', order: 0 }] }),
    })
    const response = await PUT(request)

    expect(response.status).toBe(500)
  })
})
