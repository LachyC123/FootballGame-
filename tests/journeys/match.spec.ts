import { expect, test, type Page } from '@playwright/test';

/** Click at internal-resolution coordinates (480×270) on the scaled canvas. */
async function clickWorld(page: Page, x: number, y: number): Promise<void> {
  const box = await page.locator('#app canvas').boundingBox();
  if (!box) throw new Error('canvas not found');
  await page.mouse.click(box.x + (x / 480) * box.width, box.y + (y / 270) * box.height);
}

async function sceneIs(page: Page, name: string): Promise<boolean> {
  return page.evaluate((n) => window.__SOLPORT__?.scene === n, name);
}

test('friendly match from the title menu is playable', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Title');
  await clickWorld(page, 240, 135); // audio unlock tap
  await page.waitForTimeout(400); // menu builds after async save load
  await clickWorld(page, 240, 150); // FRIENDLY entry (fresh profile: 2nd row)
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Match', undefined, {
    timeout: 10_000,
  });
  await page.keyboard.down('d');
  await page.waitForTimeout(1200);
  await page.keyboard.press('j');
  await page.keyboard.up('d');
  const alive = await page.evaluate(() => Boolean(window.__SOLPORT__?.game.isRunning));
  expect(alive).toBe(true);
});

test('new game runs Chapter 1: dialogue → choice → match', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Title');
  await clickWorld(page, 240, 135); // unlock
  await page.waitForTimeout(400);
  await clickWorld(page, 240, 132); // NEW GAME
  await page.waitForFunction(
    () => window.__SOLPORT__?.scene === 'Story' || window.__SOLPORT__?.scene === 'Dialogue',
    undefined,
    { timeout: 10_000 },
  );
  // Click through dialogue; when the choice appears, centre clicks stop
  // advancing, so periodically try the choice button position too.
  for (let i = 0; i < 40; i++) {
    if (await sceneIs(page, 'Match')) break;
    await clickWorld(page, 240, 120); // advance / complete typewriter
    await page.waitForTimeout(120);
    await clickWorld(page, 240, 120);
    await page.waitForTimeout(120);
    await clickWorld(page, 420, 157); // choice A hit area (harmless otherwise)
    await page.waitForTimeout(150);
  }
  expect(await sceneIs(page, 'Match')).toBe(true);
  const alive = await page.evaluate(() => Boolean(window.__SOLPORT__?.game.isRunning));
  expect(alive).toBe(true);
});

test('dev launcher falls back safely in production builds', async ({ page }) => {
  await page.goto('/?scene=Match&seed=123');
  await page.waitForFunction(
    () => window.__SOLPORT__?.scene === 'Match' || window.__SOLPORT__?.scene === 'Title',
    undefined,
    { timeout: 15_000 },
  );
  const alive = await page.evaluate(() => Boolean(window.__SOLPORT__?.game.isRunning));
  expect(alive).toBe(true);
});
