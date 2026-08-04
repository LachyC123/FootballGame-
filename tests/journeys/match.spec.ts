import { expect, test, type Page } from '@playwright/test';

/** Click at internal-resolution coordinates (480×270) on the scaled canvas. */
async function clickWorld(page: Page, x: number, y: number): Promise<void> {
  const box = await page.locator('#app canvas').boundingBox();
  if (!box) throw new Error('canvas not found');
  await page.mouse.click(box.x + (x / 480) * box.width, box.y + (y / 270) * box.height);
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

test('new game runs Chapter 1: flashback → dialogue → drills (skippable) → match', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Title');
  await clickWorld(page, 240, 135); // unlock
  await page.waitForTimeout(400);
  await clickWorld(page, 240, 132); // NEW GAME
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Flashback', undefined, {
    timeout: 10_000,
  });
  // Skip through the flashback beats.
  for (let i = 0; i < 8; i++) {
    await clickWorld(page, 240, 120);
    await page.waitForTimeout(250);
  }
  // Click through dialogue / choice / drill-skip until the REAL match starts.
  const atRealMatch = (): Promise<boolean> =>
    page.evaluate(
      () => window.__SOLPORT__?.scene === 'Match' && window.__SOLPORT__?.mode === 'match',
    );
  for (let i = 0; i < 60; i++) {
    if (await atRealMatch()) break;
    await clickWorld(page, 240, 120); // dialogue advance / flashback skip
    await page.waitForTimeout(120);
    await clickWorld(page, 420, 150); // choice A hit area (harmless otherwise)
    await page.waitForTimeout(120);
    const inDrill = await page.evaluate(
      () => window.__SOLPORT__?.scene === 'Match' && window.__SOLPORT__?.mode === 'drill',
    );
    if (inDrill) {
      await clickWorld(page, 40, 260); // skip drill ›
      await page.waitForTimeout(900); // completion toast + transition
    }
  }
  expect(await atRealMatch()).toBe(true);
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
