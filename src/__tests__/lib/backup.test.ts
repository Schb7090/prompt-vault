import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', () => {
    const fns = {
        existsSync: vi.fn(),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
    }
    return { default: fns, ...fns }
})

import fs from 'fs'
import { savePromptToMarkdown } from '@/lib/backup'

const prompt = {
    id: 'abc123xyz',
    title: 'My Test Prompt',
    content: 'You are a helpful assistant.',
    model: 'GPT-4o',
    environment: 'ChatGPT',
    goodFor: 'Testing',
    description: 'A test prompt',
    rating: 4,
    categoryId: 'cat-1',
}

describe('savePromptToMarkdown', () => {
    beforeEach(() => vi.clearAllMocks())

    it('creates backup directory when it does not exist', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(fs.mkdirSync).mockReturnValue(undefined as any)
        vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

        await savePromptToMarkdown(prompt)

        expect(fs.mkdirSync).toHaveBeenCalledWith(
            expect.stringContaining('prompts_backup'),
            { recursive: true }
        )
    })

    it('writes a markdown file with YAML front-matter', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true)
        vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

        await savePromptToMarkdown(prompt)

        expect(fs.writeFileSync).toHaveBeenCalledOnce()
        const [filePath, content] = vi.mocked(fs.writeFileSync).mock.calls[0] as [string, string, string]

        expect(filePath).toContain('my_test_prompt')
        expect(filePath).toContain('abc123x')
        expect(content).toContain('title: My Test Prompt')
        expect(content).toContain('model: GPT-4o')
        expect(content).toContain('rating: 4')
        expect(content).toContain('You are a helpful assistant.')
    })

    it('sanitizes special characters in the title for the filename', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true)
        vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

        await savePromptToMarkdown({ ...prompt, title: 'Hello World! Special?' })

        const [filePath] = vi.mocked(fs.writeFileSync).mock.calls[0] as [string, string, string]
        const filename = filePath.split('/').pop()!
        expect(filename).toMatch(/^[a-z0-9_]+\.md$/)
    })

    it('handles null optional fields without throwing', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true)
        vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

        await savePromptToMarkdown({ ...prompt, goodFor: null, description: null, categoryId: null })

        const [, content] = vi.mocked(fs.writeFileSync).mock.calls[0] as [string, string, string]
        expect(content).toContain('goodFor: ')
        expect(content).toContain('No description provided.')
    })
})
