import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

test('reduced motion remains readable and interactive', async ({ page }) => {
  await page.goto('/')
  const behavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)
  expect(behavior).toBe('auto')
  await expect(page.getByTestId('warehouse-canvas')).toBeVisible()
  await page.getByRole('button', { name: /pause/i }).click()
  await expect(page.getByRole('button', { name: /resume/i })).toBeVisible()
})
