import { test, expect } from '@playwright/test'

test.describe('Prompt Vault smoke tests', () => {
    test('loads the dashboard', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByRole('heading', { name: 'Vault' })).toBeVisible()
        await expect(page.locator('h1:has-text("Prompts")')).toBeVisible()
    })

    test('shows All Prompts in sidebar', async ({ page }) => {
        await page.goto('/')
        await expect(page.getByText('All Prompts')).toBeVisible()
    })

    test('opens create prompt modal on + button click', async ({ page }) => {
        await page.goto('/')
        const addBtn = page.locator('button.btn-primary').first()
        await addBtn.click()
        await expect(
            page.locator('input[placeholder*="title" i], input[placeholder*="Title" i]')
        ).toBeVisible()
    })

    test('search input accepts text', async ({ page }) => {
        await page.goto('/')
        const search = page.locator('input[placeholder*="Search"]')
        await search.fill('hello')
        await expect(search).toHaveValue('hello')
    })
})
