import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__BLOCKFIELD__));
}

async function play(page: Page) {
  await page.getByRole('button', { name: /let.s build/i }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__BLOCKFIELD__.state.playing)).toBe(true);
  await page.waitForFunction(() => {
    const game = (window as any).__BLOCKFIELD__;
    return game.camera.position.distanceTo(game.player.eyePosition) < 0.01;
  });
}

test('welcome renders a working 3D world without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await ready(page);
  await expect(page).toHaveTitle(/Blockfield/);
  await expect(page.getByRole('heading', { name: /small blocks/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /let.s build/i })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.renderer.info.render.triangles)).toBeGreaterThan(1000);
  await page.screenshot({ path: 'test-results/welcome-desktop.png' });
  expect(errors).toEqual([]);
});

test('walking, flying, hotbar, inventory, and pausing work', async ({ page }) => {
  await ready(page);
  await play(page);
  const startZ = await page.evaluate(() => (window as any).__BLOCKFIELD__.player.position.z);
  await page.keyboard.down('w');
  await expect.poll(() => page.evaluate(() => (window as any).__BLOCKFIELD__.player.position.z)).toBeLessThan(startZ - 0.5);
  await page.keyboard.up('w');
  await page.keyboard.press('f');
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.player.flying)).toBe(true);
  const startY = await page.evaluate(() => (window as any).__BLOCKFIELD__.player.position.y);
  await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => (window as any).__BLOCKFIELD__.player.position.y)).toBeGreaterThan(startY + 0.5);
  await page.keyboard.up('Space');
  await page.keyboard.press('8');
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.state.selected)).toBe(7);
  await page.keyboard.press('e');
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.state.panel)).toBe('inventory');
  await page.screenshot({ path: 'test-results/inventory-desktop.png' });
  await page.keyboard.press('e');
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.state.playing)).toBe(true);
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as any).__BLOCKFIELD__.state.panel)).toBe('pause');
});

test('blocks can be broken, placed, and restored after reloading', async ({ page }) => {
  await ready(page);
  await play(page);
  await page.evaluate(() => {
    const game = (window as any).__BLOCKFIELD__;
    game.player.position.set(10.5, 18.5, 22.5);
    game.player.flying = true;
    game.player.pitch = -1.56;
    game.player.yaw = 0;
  });
  await page.waitForFunction(() => (window as any).__BLOCKFIELD__.target?.block.y === 15);
  await page.keyboard.press('q');
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.world.getBlock(10, 15, 22))).toBe(0);
  await page.waitForFunction(() => (window as any).__BLOCKFIELD__.target?.block.y === 14);
  await page.keyboard.press('8');
  await page.waitForTimeout(160);
  await page.keyboard.press('b');
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.world.getBlock(10, 15, 22))).toBe(8);
  await page.evaluate(() => (window as any).__BLOCKFIELD__.save());
  await page.reload();
  await page.waitForFunction(() => Boolean((window as any).__BLOCKFIELD__));
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.world.getBlock(10, 15, 22))).toBe(8);
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.state.selected)).toBe(7);
});

test('phone welcome fits the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await expect(page.getByRole('button', { name: /let.s build/i })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: 'test-results/welcome-mobile.png' });
});

test('touch players can explore, move, descend, and pause', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await ready(page);
    await page.getByRole('button', { name: 'Explore the world' }).tap();
    await expect.poll(() => page.evaluate(() => (window as any).__BLOCKFIELD__.player.flying)).toBe(true);
    const forward = page.getByRole('button', { name: 'Move forward', exact: true });
    await expect(forward).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fly down', exact: true })).toBeVisible();
    const startZ = await page.evaluate(() => (window as any).__BLOCKFIELD__.player.position.z);
    const box = (await forward.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(() => page.evaluate(() => (window as any).__BLOCKFIELD__.player.position.z)).toBeLessThan(startZ - 0.4);
    await page.mouse.up();
    await page.screenshot({ path: 'test-results/gameplay-mobile.png' });
    await page.getByRole('button', { name: 'Pause game', exact: true }).tap();
    await expect(page.getByRole('dialog')).toBeVisible();
  } finally {
    await context.close();
  }
});
