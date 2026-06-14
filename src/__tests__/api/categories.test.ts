// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
    default: {
        category: {
            findMany: vi.fn(),
            create: vi.fn(),
        },
    },
}))

import { GET, POST } from '@/app/api/categories/route'
import prisma from '@/lib/prisma'

const mockCategories = [
    { id: 'cat1', name: 'Coding', color: '#3b82f6' },
    { id: 'cat2', name: 'Writing', color: '#8b5cf6' },
]

describe('GET /api/categories', () => {
    beforeEach(() => vi.clearAllMocks())

    it('returns categories sorted by name', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(prisma.category.findMany).mockResolvedValue(mockCategories as any)

        const response = await GET()
        const data = await response.json()

        expect(prisma.category.findMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } })
        expect(data).toEqual(mockCategories)
    })

    it('returns 500 when Prisma throws', async () => {
        vi.mocked(prisma.category.findMany).mockRejectedValue(new Error('DB error'))

        const response = await GET()
        expect(response.status).toBe(500)
        const data = await response.json()
        expect(data).toHaveProperty('error')
    })
})

describe('POST /api/categories', () => {
    beforeEach(() => vi.clearAllMocks())

    it('creates a new category and returns 201', async () => {
        const created = { id: 'cat3', name: 'Marketing', color: '#10b981' }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(prisma.category.create).mockResolvedValue(created as any)

        const request = new Request('http://localhost:3000/api/categories', {
            method: 'POST',
            body: JSON.stringify({ name: 'Marketing', color: '#10b981' }),
            headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(201)
        expect(data).toEqual(created)
    })

    it('returns 500 when Prisma throws', async () => {
        vi.mocked(prisma.category.create).mockRejectedValue(new Error('DB error'))

        const request = new Request('http://localhost:3000/api/categories', {
            method: 'POST',
            body: JSON.stringify({ name: 'Fail' }),
            headers: { 'Content-Type': 'application/json' },
        })

        const response = await POST(request)
        expect(response.status).toBe(500)
    })
})
