import { describe, it, expect, vi } from 'vitest'
import prisma from '../__mocks__/prisma'

vi.mock('@/lib/prisma', () => ({ default: prisma }))

const mockCategories = [
  { id: '1', name: 'Coding', color: '#3b82f6' },
  { id: '2', name: 'General', color: '#64748b' },
]

describe('GET /api/categories', () => {
  it('returns categories ordered by name', async () => {
    prisma.category.findMany.mockResolvedValue(mockCategories)

    const { GET } = await import('@/app/api/categories/route')
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(mockCategories)
    expect(prisma.category.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } })
  })

  it('returns 500 when prisma throws', async () => {
    prisma.category.findMany.mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/categories/route')
    const response = await GET()

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })
})

describe('POST /api/categories', () => {
  it('creates a category and returns 201', async () => {
    const created = { id: '3', name: 'Marketing', color: '#ec4899' }
    prisma.category.create.mockResolvedValue(created)

    const { POST } = await import('@/app/api/categories/route')
    const request = new Request('http://localhost/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Marketing', color: '#ec4899' }),
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body).toEqual(created)
    expect(prisma.category.create).toHaveBeenCalledWith({
      data: { name: 'Marketing', color: '#ec4899' },
    })
  })

  it('returns 500 when create fails', async () => {
    prisma.category.create.mockRejectedValue(new Error('Unique constraint'))

    const { POST } = await import('@/app/api/categories/route')
    const request = new Request('http://localhost/api/categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Duplicate', color: '#000' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(500)
  })
})
