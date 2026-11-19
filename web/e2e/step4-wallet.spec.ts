import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('/Users/yogambar/Downloads/Naytra/docs/ui/step-4');

test.describe('Step 4 Virtual Wallet & Double-Entry Ledger UI', () => {
  test.beforeEach(async ({ page }) => {
    // Inject mock token so ProtectedRoute allows direct access to /wallet
    await page.addInitScript(() => {
      localStorage.setItem('naytra_mock_token', 'mock-token:wallet_e2e_user:trader@naytra.local:true');
    });
  });

  // Mobile Viewport (360x800) across dark & light themes
  for (const theme of ['dark', 'light'] as const) {
    test(`Capture [Mobile 360x800] [${theme}] wallet`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('/wallet');
      await page.waitForLoadState('networkidle');

      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(300);

      await expect(page.getByRole('heading', { name: /Virtual Wallet & Ledger/i })).toBeVisible();
      await expect(page.getByText(/Paper Funds Only/i)).toBeVisible();
      await expect(page.getByText(/Available Virtual Cash/i)).toBeVisible();
      await expect(page.getByText(/Virtual Signup Bonus/i).first()).toBeVisible();
      await expect(page.getByText(/Double-Entry Ledger Transactions/i)).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `wallet-mobile-${theme}.png`),
        fullPage: false,
      });
    });
  }

  // Desktop Viewport (1280x800) across dark & light themes
  for (const theme of ['dark', 'light'] as const) {
    test(`Capture [Desktop 1280x800] [${theme}] wallet`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/wallet');
      await page.waitForLoadState('networkidle');

      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(300);

      await expect(page.getByRole('heading', { name: /Virtual Wallet & Ledger/i })).toBeVisible();
      await expect(page.getByText(/10,00,000 paise/i)).toBeVisible();
      await expect(page.getByText(/Initial Grant/i)).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `wallet-desktop-${theme}.png`),
        fullPage: false,
      });
    });
  }

  // Accessibility Axe Audit
  test('Accessibility Axe Check on Wallet Page (Light & Dark)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/wallet');
    await page.waitForLoadState('networkidle');

    for (const theme of ['dark', 'light'] as const) {
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(300);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });
});
