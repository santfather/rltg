import { test, expect } from '@playwright/test';

test.describe('Level 00 Tutorial — smoke test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.main-menu')).toBeVisible({ timeout: 5000 });
  });

  test('completes level_00 with correct commands', async ({ page }) => {
    await page.keyboard.press('n');

    await expect(page.locator('.xterm-screen')).toBeVisible({ timeout: 8000 });

    const term = page.locator('.xterm-screen');
    await term.click();
    await page.keyboard.type('ls\r');
    await page.keyboard.type('cd /system\r');
    await page.keyboard.type('cat mission_briefing.txt\r');

    await expect(page.locator('.victory-screen')).toBeVisible({ timeout: 5000 });
  });

  test('game over when oxygen reaches 0', async ({ page }) => {
    await page.keyboard.press('n');
    await expect(page.locator('.xterm-screen')).toBeVisible({ timeout: 8000 });

    await page.evaluate(() => {
      const w = window as Window & {
        __gameStore?: {
          setState: (p: object) => void;
          getState: () => { setOxygen: (v: number) => void };
        };
      };
      const store = w.__gameStore;
      if (!store) throw new Error('__gameStore not exposed');
      store.setState({ oxygenEnabled: true });
      store.getState().setOxygen(0);
    });

    await expect(page.locator('text=СИСТЕМА ЖИЗНЕОБЕСПЕЧЕНИЯ ОТКАЗАЛА')).toBeVisible({
      timeout: 5000,
    });
  });
});
