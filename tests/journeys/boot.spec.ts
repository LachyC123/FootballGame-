import { expect, test } from '@playwright/test';

test('cold load reaches the Title scene with a canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#app canvas')).toBeVisible();
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Title', undefined, {
    timeout: 15_000,
  });
});

test('first tap is accepted on the title screen', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Title');
  await page.locator('#app canvas').click();
  // No crash and the game object survives the audio-unlock gesture.
  const alive = await page.evaluate(() => Boolean(window.__SOLPORT__?.game.isRunning));
  expect(alive).toBe(true);
});
