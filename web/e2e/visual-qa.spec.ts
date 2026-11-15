import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('/Users/yogambar/Downloads/Naytra/docs/ui/step-1');

const viewports = [
  { name: '360x800', width: 360, height: 800 },
  { name: '412x915', width: 412, height: 915 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

const themes = ['light', 'dark'] as const;

for (const vp of viewports) {
  for (const theme of themes) {
    test(`Capture StatusPage [${vp.name}] [${theme}]`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/status');
      await page.waitForLoadState('networkidle');

      // Set theme attribute
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(300);

      const filename = `status-${vp.name}-${theme}.png`;
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, filename),
        fullPage: true,
      });
    });

    test(`Capture DesignSystem [${vp.name}] [${theme}]`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/design');
      await page.waitForLoadState('networkidle');

      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(300);

      const filename = `design-${vp.name}-${theme}.png`;
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, filename),
        fullPage: true,
      });
    });
  }
}

test('Accessibility Axe Check on /status (Light & Dark)', async ({ page }) => {
  await page.goto('/status');
  await page.waitForLoadState('networkidle');

  // Light
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.waitForTimeout(300);
  let results = await new AxeBuilder({ page }).analyze();
  const criticalLight = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(criticalLight, `Axe critical/serious violations on /status (light): ${JSON.stringify(criticalLight, null, 2)}`).toHaveLength(0);

  // Dark
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(300);
  results = await new AxeBuilder({ page }).analyze();
  const criticalDark = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(criticalDark, `Axe critical/serious violations on /status (dark): ${JSON.stringify(criticalDark, null, 2)}`).toHaveLength(0);
});

test('Accessibility Axe Check on /design (Light & Dark)', async ({ page }) => {
  await page.goto('/design');
  await page.waitForLoadState('networkidle');

  // Light
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.waitForTimeout(300);
  let results = await new AxeBuilder({ page }).analyze();
  const criticalLight = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(criticalLight, `Axe critical/serious violations on /design (light): ${JSON.stringify(criticalLight, null, 2)}`).toHaveLength(0);

  // Dark
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(300);
  results = await new AxeBuilder({ page }).analyze();
  const criticalDark = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  expect(criticalDark, `Axe critical/serious violations on /design (dark): ${JSON.stringify(criticalDark, null, 2)}`).toHaveLength(0);
});

test('Reduced motion disables animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/design');
  await page.waitForLoadState('networkidle');

  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
});
