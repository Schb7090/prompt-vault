import '@testing-library/jest-dom'

// navigator is only available in jsdom environments, not in node
if (typeof navigator !== 'undefined') {
    Object.assign(navigator, {
        clipboard: {
            writeText: vi.fn().mockResolvedValue(undefined),
        },
    })
}
