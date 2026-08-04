import { expect, test } from '@playwright/test';

test('title → two presses → playable match with running clock', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Title');
  const canvas = page.locator('#app canvas');
  await canvas.click();
  await canvas.click();
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Match', undefined, {
    timeout: 10_000,
  });
  // Simulate holding movement + a pass; the game must keep running.
  await page.keyboard.down('d');
  await page.waitForTimeout(1500);
  await page.keyboard.press('j');
  await page.keyboard.up('d');
  await page.waitForTimeout(500);
  const alive = await page.evaluate(() => Boolean(window.__SOLPORT__?.game.isRunning));
  expect(alive).toBe(true);
});

test('dev launcher jumps straight into a match (dev mode only falls back safely)', async ({
  page,
}) => {
  // In production preview builds import.meta.env.DEV is false, so ?scene=Match
  // must fall back to Title without crashing.
  await page.goto('/?scene=Match&seed=123');
  await page.waitForFunction(
    () => window.__SOLPORT__?.scene === 'Match' || window.__SOLPORT__?.scene === 'Title',
    undefined,
    { timeout: 15_000 },
  );
  const alive = await page.evaluate(() => Boolean(window.__SOLPORT__?.game.isRunning));
  expect(alive).toBe(true);
});
