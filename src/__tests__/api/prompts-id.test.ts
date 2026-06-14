import { describe, it, expect, vi } from 'vitest'
import prisma from '../__mocks__/prisma'

vi.mock('@/lib/prisma', () => ({ default: prisma }))
vi.mock('@/lib/backup', () => ({ savePromptToMarkdown: vi.fn().mockResolvedValue(undefined) }))

const mockPrompt = {
  id: 'p1',
  title: 'Updated Prompt',
  content: 'Updated content',
  model: 'GPT-4o',
  environment: 'ChatGPT',
  goodFor: null,
  description: null,
  rating: 5,
  categoryId: null,
  order: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: null,
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PUT /api/prompts/[id]', () => {
  it('updates a prompt and returns it', async () => {
    prisma.prompt.update.mockResolvedValue(mockPrompt as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    const { PUT } = await import('@/app/api/prompts/[id]/route')
    const request = new Request('http://localhost/api/prompts/p1', {
      method: 'PUT',
      body: JSON.stringify({
        title: 'Updated Prompt', content: 'Updated content',
        model: 'GPT-4o', environment: 'ChatGPT', rating: 5,
      }),
    })
    const response = await PUT(request, makeParams('p1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.title).toBe('Updated Prompt')
    expect(prisma.prompt.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' } })
    )
  })

  it('calls savePromptToMarkdown after update', async () => {
    const { savePromptToMarkdown } = await import('@/lib/backup')
    prisma.prompt.update.mockResolvedValue(mockPrompt as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    const { PUT } = await import('@/app/api/prompts/[id]/route')
    const request = new Request('http://localhost/api/prompts/p1', {
      method: 'PUT',
      body: JSON.stringify({ title: 'T', content: 'C', model: 'M', environment: 'E', rating: 3 }),
    })
    await PUT(request, makeParams('p1'))

    expect(savePromptToMarkdown).toHaveBeenCalledWith(mockPrompt)
  })

  it('returns 500 when update fails', async () => {
    prisma.prompt.update.mockRejectedValue(new Error('Not found'))

    const { PUT } = await import('@/app/api/prompts/[id]/route')
    const request = new Request('http://localhost/api/prompts/bad-id', {
      method: 'PUT',
      body: JSON.stringify({ title: 'T', content: 'C', model: 'M', environment: 'E', rating: 3 }),
    })
    const response = await PUT(request, makeParams('bad-id'))

    expect(response.status).toBe(500)
  })
})

describe('DELETE /api/prompts/[id]', () => {
  it('deletes a prompt and returns success message', async () => {
    prisma.prompt.delete.mockResolvedValue(mockPrompt as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    const { DELETE } = await import('@/app/api/prompts/[id]/route')
    const request = new Request('http://localhost/api/prompts/p1', { method: 'DELETE' })
    const response = await DELETE(request, makeParams('p1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.message).toBe('Prompt deleted')
    expect(prisma.prompt.delete).toHaveBeenCalledWith({ where: { id: 'p1' } })
  })

  it('returns 500 when delete fails', async () => {
    prisma.prompt.delete.mockRejectedValue(new Error('Not found'))

    const { DELETE } = await import('@/app/api/prompts/[id]/route')
    const request = new Request('http://localhost/api/prompts/bad-id', { method: 'DELETE' })
    const response = await DELETE(request, makeParams('bad-id'))

    expect(response.status).toBe(500)
  })
})
