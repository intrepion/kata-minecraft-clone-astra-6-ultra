import { test, expect, type Page } from '@playwright/test';

const saveKey = 'blockfield.world.v1';

async function ready(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__BLOCKFIELD__));
}

test('welcome settings control sound, daylight, and sliders and dismiss with Escape', async ({ page }) => {
  await ready(page);
  await page.getByRole('button', { name: 'Open settings' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const sound = dialog.getByRole('switch', { name: 'World sounds' });
  await expect(sound).toHaveAttribute('aria-checked', 'true');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.state.muted)).toBe(true);
  await sound.click();
  await expect(sound).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.state.muted)).toBe(false);

  await dialog.getByRole('button', { name: 'Daylight', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Moonlight', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.state.daytime)).toBe(false);
  await dialog.getByRole('button', { name: 'Moonlight', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.state.daytime)).toBe(true);

  const sensitivity = dialog.getByRole('slider', { name: 'Look sensitivity' });
  await sensitivity.fill('1.6');
  await expect(sensitivity).toHaveValue('1.6');
  await expect(dialog.locator('output').filter({ hasText: '1.6×' })).toBeVisible();
  const distance = dialog.getByRole('slider', { name: 'View distance' });
  await distance.fill('90');
  await expect(distance).toHaveValue('90');
  await expect(dialog.locator('output').filter({ hasText: '90 blocks' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: /small blocks/i })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.state)).toMatchObject({
    playing: false, started: false, panel: null,
  });

  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(sensitivity).toHaveValue('1.6');
  await expect(distance).toHaveValue('90');
});

test('new world cancellation preserves the save and confirmation replaces it persistently', async ({ page }) => {
  const previous = {
    version: 1,
    // Outside the generated seed range, so the assertion cannot fail randomly.
    seed: 1_234_567,
    edits: [['10,44,22', 8]],
    position: [10.5, 30, 22.5],
    yaw: 0, pitch: 0, selected: 7, flying: true, daytime: true,
  };
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: saveKey, state: previous });
  await ready(page);
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.world.seed)).toBe(previous.seed);

  await page.getByRole('button', { name: 'Open settings' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Create a new world', exact: true }).click();
  await expect(dialog.getByText('Start fresh?', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/can’t be undone/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep my world' }).click();
  await expect(dialog.getByText('Start fresh?', { exact: true })).toBeHidden();
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.world.seed)).toBe(previous.seed);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), saveKey)).toEqual(previous);

  await dialog.getByRole('button', { name: 'Create a new world', exact: true }).click();
  await dialog.getByRole('button', { name: 'Yes, create a new world' }).click();
  await expect(dialog).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as any).__BLOCKFIELD__.state.playing)).toBe(true);
  const newSeed = await page.evaluate(() => (window as any).__BLOCKFIELD__.world.seed);
  expect(newSeed).not.toBe(previous.seed);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), saveKey)).toMatchObject({
    seed: newSeed, edits: [], flying: false,
  });

  await page.reload();
  await page.waitForFunction(() => Boolean((window as any).__BLOCKFIELD__));
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.world.seed)).toBe(newSeed);
  expect(await page.evaluate(() => (window as any).__BLOCKFIELD__.world.getEdits())).toEqual([]);
});
