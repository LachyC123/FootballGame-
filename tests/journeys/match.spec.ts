import { expect, test, type Page } from '@playwright/test';

/** Click at internal-resolution coordinates (480×270) on the scaled canvas. */
async function clickWorld(page: Page, x: number, y: number): Promise<void> {
  const box = await page.locator('#app canvas').boundingBox();
  if (!box) throw new Error('canvas not found');
  await page.mouse.click(box.x + (x / 480) * box.width, box.y + (y / 270) * box.height);
}

async function holdKey(page: Page, key: string, ms: number): Promise<void> {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function scene(page: Page): Promise<string> {
  return page.evaluate(() => window.__SOLPORT__?.scene ?? '');
}

test('friendly match from the title menu is playable', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Title');
  await clickWorld(page, 240, 135); // audio unlock tap
  await page.waitForTimeout(400); // menu builds after async save load
  await clickWorld(page, 240, 154); // FRIENDLY entry (fresh profile: 2nd row)
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

test('new game: flashback → hub → find Tero → intro → cage sequence → match', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Title');
  await clickWorld(page, 240, 135); // unlock
  await page.waitForTimeout(400);
  await clickWorld(page, 240, 130); // NEW GAME
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Flashback', undefined, {
    timeout: 10_000,
  });
  // Skip through the flashback beats into the hub.
  for (let i = 0; i < 10 && (await scene(page)) !== 'Hub'; i++) {
    await clickWorld(page, 240, 120);
    await page.waitForTimeout(350);
  }
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Hub', undefined, {
    timeout: 10_000,
  });
  await page.waitForTimeout(400);

  // Walk from spawn (90,210) up to Tero (96,150) and talk.
  await holdKey(page, 'w', 1000);
  await holdKey(page, 'j', 90);
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Dialogue', undefined, {
    timeout: 5_000,
  });
  // Click through the intro (includes the ego/team choice).
  for (let i = 0; i < 30 && (await scene(page)) === 'Dialogue'; i++) {
    await clickWorld(page, 240, 120);
    await page.waitForTimeout(130);
    await clickWorld(page, 420, 150); // choice A hit area (harmless otherwise)
    await page.waitForTimeout(130);
  }
  await page.waitForFunction(() => window.__SOLPORT__?.scene === 'Hub', undefined, {
    timeout: 5_000,
  });
  await page.waitForTimeout(500); // hub restarts with the crew placed

  // Walk to the Netyard gate (430,150) and start the challenge.
  await holdKey(page, 'w', 950);
  await holdKey(page, 'd', 5200);
  await holdKey(page, 'j', 90);

  // Drive the cage sequence: dialogues click through, drills get skipped.
  const atRealMatch = (): Promise<boolean> =>
    page.evaluate(
      () => window.__SOLPORT__?.scene === 'Match' && window.__SOLPORT__?.mode === 'match',
    );
  for (let i = 0; i < 60; i++) {
    if (await atRealMatch()) break;
    const s = await scene(page);
    if (s === 'Dialogue') {
      await clickWorld(page, 240, 120);
      await page.waitForTimeout(140);
    } else if (s === 'Match') {
      await clickWorld(page, 40, 260); // skip drill ›
      await page.waitForTimeout(900);
    } else {
      // Idle in the hub: press A again like a player would — recovers a
      // missed gate press or advances a ceremony card.
      await holdKey(page, 'j', 120);
      await page.waitForTimeout(300);
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
