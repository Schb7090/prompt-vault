import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PromptCard from '@/components/PromptCard'
import type { Prompt } from '@/components/PromptCard'

const prompt: Prompt = {
    id: 'p1',
    title: 'My Helpful Prompt',
    content: 'You are an expert assistant.',
    model: 'GPT-4o',
    environment: 'ChatGPT',
    goodFor: 'Brainstorming',
    description: 'Useful for creative tasks',
    rating: 3,
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Coding', color: '#3b82f6' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    order: 0,
}

const handlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    showToast: vi.fn(),
}

describe('PromptCard', () => {
    beforeEach(() => vi.clearAllMocks())

    it('renders the prompt title', () => {
        render(<PromptCard prompt={prompt} {...handlers} />)
        expect(screen.getByText('My Helpful Prompt')).toBeInTheDocument()
    })

    it('renders model and environment pills', () => {
        render(<PromptCard prompt={prompt} {...handlers} />)
        expect(screen.getByText('GPT-4o')).toBeInTheDocument()
        expect(screen.getByText('ChatGPT')).toBeInTheDocument()
    })

    it('renders the category badge', () => {
        render(<PromptCard prompt={prompt} {...handlers} />)
        expect(screen.getByText('Coding')).toBeInTheDocument()
    })

    it('renders goodFor pill with sparkle emoji', () => {
        render(<PromptCard prompt={prompt} {...handlers} />)
        expect(screen.getByText('✨ Brainstorming')).toBeInTheDocument()
    })

    it('calls onEdit when the edit button is clicked', async () => {
        const user = userEvent.setup()
        render(<PromptCard prompt={prompt} {...handlers} />)
        await user.click(screen.getByTitle('Edit'))
        expect(handlers.onEdit).toHaveBeenCalledWith(prompt)
    })

    it('calls onDelete when the delete button is clicked', async () => {
        const user = userEvent.setup()
        render(<PromptCard prompt={prompt} {...handlers} />)
        await user.click(screen.getByTitle('Delete'))
        expect(handlers.onDelete).toHaveBeenCalledWith('p1')
    })

    it('does not render goodFor pill when goodFor is null', () => {
        render(<PromptCard prompt={{ ...prompt, goodFor: null }} {...handlers} />)
        expect(screen.queryByText(/Brainstorming/)).not.toBeInTheDocument()
    })
})
