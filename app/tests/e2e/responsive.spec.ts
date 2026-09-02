import { expect, test } from '@playwright/test';

/**
 * Mobile layout checks.
 *
 * The board is the thing most likely to break on a small screen, so these
 * assert the two failures that actually matter: the page scrolling sideways,
 * and the board overflowing its container.
 */

test('the sign-in screen fits a phone without horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});

test('the sign-in button is a comfortable tap target', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: /continue with google/i });
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  // 44px is the widely used minimum for a touch target.
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test('the board fits the viewport on a phone', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => '__signInForTests' in window, null, { timeout: 20_000 });
  await page.evaluate(() =>
    (
      window as unknown as { __signInForTests: (e: string, p: string) => Promise<void> }
    ).__signInForTests(`mobile${Date.now()}@example.test`, 'test-password-123'),
  );
  await page.waitForURL('**/play', { timeout: 20_000 });

  await page.getByRole('button', { name: /play the computer/i }).click();
  await page.waitForURL(/\/play\/[A-Z0-9]{6}/, { timeout: 20_000 });
  await expect(page.getByTestId('cell-0-0')).toBeVisible();

  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);

  // All nine sub-boards are on screen horizontally.
  const board = page.getByRole('group', { name: /ultimate tic-tac-toe board/i });
  const box = await board.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.width).toBeLessThanOrEqual(viewport.width);
});
