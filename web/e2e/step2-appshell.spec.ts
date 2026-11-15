import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('/Users/yogambar/Downloads/Naytra/docs/ui/step-2');

const pages = [
  { name: 'dashboard', path: '/dashboard', heading: /Market Dashboard/i },
  { name: 'holdings', path: '/holdings', heading: /Holdings & Sensex 30/i },
  { name: 'learn', path: '/learn', heading: /Market Academy/i },
  { name: 'wallet', path: '/wallet', heading: /Virtual Wallet & Ledger/i },
  { name: 'profile', path: '/profile', heading: /Profile & Settings/i },
];

test.describe('Step 2 AppShell UI & Navigation', () => {
  // Mobile Viewport (360x800)
  for (const p of pages) {
    for (const theme of ['dark', 'light'] as const) {
      test(`Capture [Mobile 360x800] [${theme}] ${p.name}`, async ({ page }) => {
        await page.setViewportSize({ width: 360, height: 800 });
        await page.goto(p.path);
        await page.waitForLoadState('networkidle');

        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await page.waitForTimeout(300);

        await expect(page.getByRole('heading', { name: p.heading })).toBeVisible();

        // Ensure bottom floating tab bar is visible on mobile
        const bottomNav = page.locator('nav[aria-label="Mobile primary navigation"]');
        await expect(bottomNav).toBeVisible();

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${p.name}-mobile-${theme}.png`),
          fullPage: false,
        });
      });
    }
  }

  // Desktop Viewport (1280x800)
  for (const theme of ['dark', 'light'] as const) {
    test(`Capture [Desktop 1280x800] [${theme}] dashboard`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(300);

      await expect(page.getByRole('heading', { name: /Market Dashboard/i })).toBeVisible();

      // Ensure side rail is visible on desktop
      const sideNav = page.locator('nav[aria-label="Main sidebar menu"]');
      await expect(sideNav).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `dashboard-desktop-${theme}.png`),
        fullPage: false,
      });
    });
  }

  // Mobile Bottom Tab Bar Navigation Flow
  test('Mobile interactive navigation between tabs', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Bottom tab bar navigation
    const nav = page.locator('nav[aria-label="Mobile primary navigation"]');

    // Click Holdings
    await nav.getByRole('link', { name: 'Holdings' }).click();
    await expect(page.getByRole('heading', { name: /Holdings & Sensex 30/i })).toBeVisible();

    // Click Learn
    await nav.getByRole('link', { name: 'Learn' }).click();
    await expect(page.getByRole('heading', { name: /Market Academy/i })).toBeVisible();
    await expect(page.getByText(/AI forecasting is coming in Phase 2/i)).toBeVisible();

    // Click Wallet
    await nav.getByRole('link', { name: 'Wallet' }).click();
    await expect(page.getByRole('heading', { name: /Virtual Wallet & Ledger/i })).toBeVisible();
    await expect(page.getByText(/538,550 paise/i)).toBeVisible();

    // Click Profile
    await nav.getByRole('link', { name: 'Profile' }).click();
    await expect(page.getByRole('heading', { name: /Profile & Settings/i })).toBeVisible();
    await expect(page.getByText(/com\.rgc\.naytra/i)).toBeVisible();
  });

  // Axe Accessibility Check on AppShell
  test('Accessibility Axe Check on Dashboard & Wallet (Light & Dark)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Dark
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(300);
    let results = await new AxeBuilder({ page }).analyze();
    let critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, `Axe critical/serious violations on /dashboard (dark): ${JSON.stringify(critical, null, 2)}`).toHaveLength(0);

    // Light
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(300);
    results = await new AxeBuilder({ page }).analyze();
    critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, `Axe critical/serious violations on /dashboard (light): ${JSON.stringify(critical, null, 2)}`).toHaveLength(0);
  });
});
