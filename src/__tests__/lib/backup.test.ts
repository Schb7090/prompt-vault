import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

vi.mock('fs')
vi.mock('path', async (importOriginal) => {
  const actual = await importOriginal<typeof import('path')>()
  return { ...actual, join: actual.join }
})

const mockPrompt = {
  id: 'abc12345-xyz',
  title: 'My Test Prompt',
  content: 'Do something useful',
  model: 'GPT-4o',
  environment: 'ChatGPT',
  goodFor: 'Writing',
  description: 'A helpful prompt',
  rating: 4,
  categoryId: 'cat-1',
}

describe('savePromptToMarkdown', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(fs.existsSync).mockReturnValue(true)
    vi.mocked(fs.writeFileSync).mockImplementation(() => {})
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined)
  })

  it('writes a file with YAML frontmatter and markdown body', async () => {
    const { savePromptToMarkdown } = await import('@/lib/backup')
    await savePromptToMarkdown(mockPrompt)

    expect(fs.writeFileSync).toHaveBeenCalledOnce()
    const [, content] = vi.mocked(fs.writeFileSync).mock.calls[0]
    const contentStr = content as string
    expect(contentStr).toContain('title: My Test Prompt')
    expect(contentStr).toContain('model: GPT-4o')
    expect(contentStr).toContain('environment: ChatGPT')
    expect(contentStr).toContain('rating: 4')
    expect(contentStr).toContain('# My Test Prompt')
    expect(contentStr).toContain('Do something useful')
  })

  it('sanitizes special characters in filename to underscores', async () => {
    const { savePromptToMarkdown } = await import('@/lib/backup')
    await savePromptToMarkdown({ ...mockPrompt, title: 'Hello@#$World!' })

    const [filePath] = vi.mocked(fs.writeFileSync).mock.calls[0]
    expect(filePath as string).toMatch(/hello___world__abc12345/)
  })

  it('uses first 8 chars of id in filename', async () => {
    const { savePromptToMarkdown } = await import('@/lib/backup')
    await savePromptToMarkdown(mockPrompt)

    const [filePath] = vi.mocked(fs.writeFileSync).mock.calls[0]
    expect(filePath as string).toContain('abc12345')
  })

  it('creates backup directory if it does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    const { savePromptToMarkdown } = await import('@/lib/backup')
    await savePromptToMarkdown(mockPrompt)

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('prompts_backup'), { recursive: true })
  })

  it('skips mkdir if backup directory already exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)
    const { savePromptToMarkdown } = await import('@/lib/backup')
    await savePromptToMarkdown(mockPrompt)

    expect(fs.mkdirSync).not.toHaveBeenCalled()
  })

  it('uses empty string for optional fields when they are null/undefined', async () => {
    const { savePromptToMarkdown } = await import('@/lib/backup')
    await savePromptToMarkdown({ ...mockPrompt, goodFor: null, categoryId: null, description: null })

    const [, content] = vi.mocked(fs.writeFileSync).mock.calls[0]
    const contentStr = content as string
    expect(contentStr).toContain('goodFor: ')
    expect(contentStr).toContain('categoryId: ')
    expect(contentStr).toContain('No description provided.')
  })
})
