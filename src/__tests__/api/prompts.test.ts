import { describe, it, expect, vi } from 'vitest'
import prisma from '../__mocks__/prisma'

vi.mock('@/lib/prisma', () => ({ default: prisma }))
vi.mock('@/lib/backup', () => ({ savePromptToMarkdown: vi.fn().mockResolvedValue(undefined) }))

const mockPrompt = {
  id: 'p1',
  title: 'Test Prompt',
  content: 'Some content',
  model: 'GPT-4o',
  environment: 'ChatGPT',
  goodFor: 'Writing',
  description: 'A test',
  rating: 3,
  categoryId: 'cat-1',
  order: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  category: { id: 'cat-1', name: 'Coding', color: '#3b82f6' },
}

function makeRequest(url: string) {
  return new Request(url)
}

describe('GET /api/prompts', () => {
  it('fetches all prompts with no filters', async () => {
    prisma.prompt.findMany.mockResolvedValue([mockPrompt] as any)

    const { GET } = await import('@/app/api/prompts/route')
    const response = await GET(makeRequest('http://localhost/api/prompts'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toHaveLength(1)
    expect(prisma.prompt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    )
  })

  it('adds OR clause when q param is provided', async () => {
    prisma.prompt.findMany.mockResolvedValue([])

    const { GET } = await import('@/app/api/prompts/route')
    await GET(makeRequest('http://localhost/api/prompts?q=hello'))

    expect(prisma.prompt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { title: { contains: 'hello' } },
            { content: { contains: 'hello' } },
          ],
        },
      })
    )
  })

  it('filters by categoryId when provided', async () => {
    prisma.prompt.findMany.mockResolvedValue([])

    const { GET } = await import('@/app/api/prompts/route')
    await GET(makeRequest('http://localhost/api/prompts?categoryId=cat-1'))

    expect(prisma.prompt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { categoryId: 'cat-1' } })
    )
  })

  it('filters by rating when provided', async () => {
    prisma.prompt.findMany.mockResolvedValue([])

    const { GET } = await import('@/app/api/prompts/route')
    await GET(makeRequest('http://localhost/api/prompts?rating=4'))

    expect(prisma.prompt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { rating: 4 } })
    )
  })

  it('combines categoryId and q filters', async () => {
    prisma.prompt.findMany.mockResolvedValue([])

    const { GET } = await import('@/app/api/prompts/route')
    await GET(makeRequest('http://localhost/api/prompts?q=test&categoryId=cat-1'))

    expect(prisma.prompt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { title: { contains: 'test' } },
            { content: { contains: 'test' } },
          ],
          categoryId: 'cat-1',
        },
      })
    )
  })

  it('returns 500 when prisma throws', async () => {
    prisma.prompt.findMany.mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/prompts/route')
    const response = await GET(makeRequest('http://localhost/api/prompts'))

    expect(response.status).toBe(500)
  })
})

describe('POST /api/prompts', () => {
  it('creates a prompt with order = max + 1', async () => {
    prisma.prompt.findMany.mockResolvedValue([
      { order: 0 }, { order: 1 }, { order: 2 },
    ] as any)
    prisma.prompt.create.mockResolvedValue(mockPrompt as any)

    const { POST } = await import('@/app/api/prompts/route')
    const request = new Request('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Prompt',
        content: 'Some content',
        model: 'GPT-4o',
        environment: 'ChatGPT',
      }),
    })
    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(prisma.prompt.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ order: 3 }) })
    )
  })

  it('uses order 0 when no prompts exist', async () => {
    prisma.prompt.findMany.mockResolvedValue([])
    prisma.prompt.create.mockResolvedValue(mockPrompt as any)

    const { POST } = await import('@/app/api/prompts/route')
    const request = new Request('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({ title: 'T', content: 'C', model: 'M', environment: 'E' }),
    })
    await POST(request)

    expect(prisma.prompt.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ order: 0 }) })
    )
  })

  it('calls savePromptToMarkdown after creation', async () => {
    const { savePromptToMarkdown } = await import('@/lib/backup')
    prisma.prompt.findMany.mockResolvedValue([])
    prisma.prompt.create.mockResolvedValue(mockPrompt as any)

    const { POST } = await import('@/app/api/prompts/route')
    const request = new Request('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({ title: 'T', content: 'C', model: 'M', environment: 'E' }),
    })
    await POST(request)

    expect(savePromptToMarkdown).toHaveBeenCalledWith(mockPrompt)
  })

  it('defaults model to "Unknown" when not provided', async () => {
    prisma.prompt.findMany.mockResolvedValue([])
    prisma.prompt.create.mockResolvedValue(mockPrompt as any)

    const { POST } = await import('@/app/api/prompts/route')
    const request = new Request('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({ title: 'T', content: 'C' }),
    })
    await POST(request)

    expect(prisma.prompt.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ model: 'Unknown' }) })
    )
  })

  it('returns 500 when creation fails', async () => {
    prisma.prompt.findMany.mockResolvedValue([])
    prisma.prompt.create.mockRejectedValue(new Error('DB error'))

    const { POST } = await import('@/app/api/prompts/route')
    const request = new Request('http://localhost/api/prompts', {
      method: 'POST',
      body: JSON.stringify({ title: 'T', content: 'C', model: 'M', environment: 'E' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(500)
  })
})
