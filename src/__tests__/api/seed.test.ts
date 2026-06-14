// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'
import prisma from '../__mocks__/prisma'

vi.mock('@/lib/prisma', () => ({ default: prisma }))

describe('GET /api/seed', () => {
  it('seeds exactly 7 categories when none exist', async () => {
    prisma.category.findUnique.mockResolvedValue(null)
    prisma.category.create.mockResolvedValue({ id: '1', name: 'Coding', color: '#3b82f6' })

    const { GET } = await import('@/app/api/seed/route')
    const response = await GET()
    const body = await response.json()

    expect(body.message).toBe('Seeded successfully')
    expect(prisma.category.create).toHaveBeenCalledTimes(7)
  })

  it('skips categories that already exist', async () => {
    // Only the first category already exists
    prisma.category.findUnique.mockImplementation(({ where }) =>
      where.name === 'Coding'
        ? Promise.resolve({ id: '1', name: 'Coding', color: '#3b82f6' })
        : Promise.resolve(null)
    )
    prisma.category.create.mockResolvedValue({ id: '2', name: 'General', color: '#64748b' })

    const { GET } = await import('@/app/api/seed/route')
    await GET()

    expect(prisma.category.create).toHaveBeenCalledTimes(6)
  })

  it('creates the expected category names', async () => {
    prisma.category.findUnique.mockResolvedValue(null)
    prisma.category.create.mockResolvedValue({ id: '1', name: 'Coding', color: '#3b82f6' })

    const { GET } = await import('@/app/api/seed/route')
    await GET()

    const createdNames = vi.mocked(prisma.category.create).mock.calls.map((c) => c[0].data.name)
    expect(createdNames).toEqual([
      'Coding', 'Creative Writing', 'Data Analysis', 'Marketing & SEO',
      'Productivity', 'Social Media', 'General',
    ])
  })

  it('returns 500 when prisma throws', async () => {
    prisma.category.findUnique.mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/seed/route')
    const response = await GET()

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })
})
