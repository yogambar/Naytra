import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('/Users/yogambar/Downloads/Naytra/docs/ui/step-3');

const authPages = [
  { name: 'welcome', path: '/welcome', heading: /Get up to ₹10,000 signup bonus/i },
  { name: 'signup', path: '/signup', heading: /Create your account/i },
  { name: 'signin', path: '/signin', heading: /Welcome back/i },
  { name: 'verify-email', path: '/verify-email', heading: /Verify your email/i },
  { name: 'complete-profile', path: '/complete-profile', heading: /Complete Your Profile/i },
  { name: 'forgot-password', path: '/forgot-password', heading: /Reset your password/i },
];

test.describe('Step 3 Authentication & Onboarding UI', () => {
  // Mobile Viewport (360x800) across all auth screens in light & dark mode
  for (const p of authPages) {
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

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `${p.name}-mobile-${theme}.png`),
          fullPage: false,
        });
      });
    }
  }

  // Desktop Viewport (1280x800) for Welcome & Signup
  for (const theme of ['dark', 'light'] as const) {
    test(`Capture [Desktop 1280x800] [${theme}] welcome`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/welcome');
      await page.waitForLoadState('networkidle');

      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(300);

      await expect(page.getByRole('heading', { name: /Get up to ₹10,000 signup bonus/i })).toBeVisible();
      await expect(page.getByText(/No real money involved/i)).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `welcome-desktop-${theme}.png`),
        fullPage: false,
      });
    });

    test(`Capture [Desktop 1280x800] [${theme}] signup`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');

      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(300);

      await expect(page.getByRole('heading', { name: /Create your account/i })).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `signup-desktop-${theme}.png`),
        fullPage: false,
      });
    });
  }

  // Interactive Form Validation Test on /signup
  test('Signup form age and password validation feedback', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    // Fill name & email
    await page.getByPlaceholder(/Ramesh Kumar/i).fill('Test Candidate');
    await page.getByPlaceholder(/you@example\.com/i).fill('test@candidate.com');

    // Test under-18 DOB rejection in UI
    const dobInput = page.locator('input[type="date"]');
    await dobInput.fill('2015-05-15'); // 11 years old
    await expect(page.getByText(/Must be 18\+/i)).toBeVisible();

    // Now set adult DOB
    await dobInput.fill('1998-05-15');
    await expect(page.getByText(/Eligible/i)).toBeVisible();

    // Type weak password then strong password
    const pwdInput = page.getByPlaceholder(/At least 10 characters/i);
    await pwdInput.fill('short');
    await expect(page.getByText(/Too Short/i)).toBeVisible();

    await pwdInput.fill('StrongPaperTrading2026!');
    await expect(page.getByText(/Strong/i)).toBeVisible();

    // Accept terms
    const termsCheck = page.locator('input[type="checkbox"]');
    await termsCheck.check();
    expect(await termsCheck.isChecked()).toBe(true);
  });

  // Axe Accessibility Audit on Auth Screens
  test('Accessibility Axe Check on Welcome & Signup (Light & Dark)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/welcome');
    await page.waitForLoadState('networkidle');

    // Welcome Dark
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(200);
    let results = await new AxeBuilder({ page }).analyze();
    let critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, `Axe critical/serious violations on /welcome (dark): ${JSON.stringify(critical, null, 2)}`).toHaveLength(0);

    // Welcome Light
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(200);
    results = await new AxeBuilder({ page }).analyze();
    critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, `Axe critical/serious violations on /welcome (light): ${JSON.stringify(critical, null, 2)}`).toHaveLength(0);

    // Signup Light
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(200);
    results = await new AxeBuilder({ page }).analyze();
    critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, `Axe critical/serious violations on /signup (light): ${JSON.stringify(critical, null, 2)}`).toHaveLength(0);
  });
});
