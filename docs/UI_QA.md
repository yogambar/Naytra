# UI / Visual QA Process — Naytra

> This document defines the quality assurance process for visual design, accessibility, and performance of the Naytra frontend.

---

## 1. Screenshot Protocol

Every UI change (new page, component update, layout fix) must be verified visually across the defined viewport and theme matrix.

### 1.1 Viewport Breakpoints

| Name | Width | Device Class |
| --- | --- | --- |
| **Mobile S** | 360px | Small Android phones |
| **Mobile L** | 414px | Large phones (iPhone 14, Pixel 7) |
| **Tablet** | 768px | iPad Mini, Android tablets |
| **Desktop** | 1280px | Laptop / desktop |
| **Desktop L** | 1920px | Full HD monitors |

### 1.2 Theme Variants

| Theme | Description |
| --- | --- |
| **Light** | Mist (`#EEF1F5`) background, Ink (`#172033`) text |
| **Dark** | Ink (`#172033`) background, Mist (`#EEF1F5`) text |

### 1.3 Screenshot Matrix

For each UI change, capture screenshots across:

- **5 viewports × 2 themes = 10 screenshots** (minimum)
- Include both **empty states** and **populated states** where applicable
- Include **error states** (form validation, API failure) if the component handles errors

### 1.4 Naming Convention

```
screenshots/{milestone}/{component}-{viewport}-{theme}-{state}.png
```

Examples:
```
screenshots/m1/signin-mobile-s-light-empty.png
screenshots/m1/signin-desktop-dark-error.png
screenshots/m2/wallet-tablet-light-populated.png
```

---

## 2. Accessibility Checks

Naytra targets **WCAG 2.1 Level AA**. Every UI component must pass the following checks.

### 2.1 Automated Audits

| Tool | Usage | When |
| --- | --- | --- |
| **axe-core** (via browser extension or CLI) | Automated accessibility scan | Every UI PR |
| **Lighthouse Accessibility audit** | Page-level a11y score | Every new page |
| **ESLint plugin jsx-a11y** | Compile-time a11y linting | Continuous (in lint step) |

**Target:** axe-core reports **zero violations** at the "critical" and "serious" levels.

### 2.2 Keyboard Navigation

| Check | Criteria |
| --- | --- |
| **Tab order** | Logical, follows visual reading order |
| **Focus visibility** | Every focusable element has a visible focus indicator (ring/outline) |
| **Activation** | Buttons activate on `Enter` and `Space`; links on `Enter` |
| **Escape** | Modals and popovers close on `Escape` |
| **Arrow keys** | Tab bars, select menus, and radio groups support arrow-key navigation |
| **Skip link** | "Skip to main content" link visible on first `Tab` |
| **No keyboard traps** | Focus never gets stuck — always possible to `Tab` out |

### 2.3 Screen Reader Testing

| Screen Reader | Platform | When |
| --- | --- | --- |
| **VoiceOver** | macOS / iOS | Every new page or complex component |
| **TalkBack** | Android | Before each Android build |
| **NVDA** | Windows (if available) | Optional; before release (M7) |

**Checklist:**

- [ ] Page title is announced on navigation
- [ ] Headings create a logical hierarchy (h1 → h2 → h3)
- [ ] Form inputs have associated labels
- [ ] Error messages are announced via `aria-live` or `role="alert"`
- [ ] Price changes are announced via `aria-live="polite"` (not `assertive`)
- [ ] Decorative images have `alt=""`
- [ ] Interactive elements have accessible names

---

## 3. Performance Metrics

Capture and record these metrics for every new page.

### 3.1 Core Web Vitals

| Metric | Budget | Tool |
| --- | --- | --- |
| **LCP** (Largest Contentful Paint) | ≤ 2.5 s | Lighthouse |
| **INP** (Interaction to Next Paint) | ≤ 200 ms | Lighthouse |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | Lighthouse |

### 3.2 Bundle Metrics

| Metric | Budget | Tool |
| --- | --- | --- |
| **Initial JS** | ≤ 250 KB (compressed) | `npx vite-bundle-visualizer` |
| **3D/WebGL chunk** | ≤ 350 KB (lazy) | Bundle analyzer |
| **Total page weight** | ≤ 800 KB (initial) | DevTools Network tab |
| **Font files** | ≤ 150 KB total | File size check |

### 3.3 Lighthouse Scores

| Category | Minimum Score |
| --- | --- |
| Performance | 90 |
| Accessibility | 95 |
| Best Practices | 95 |
| SEO | 90 |

### 3.4 Recording Format

```
# Performance Report — {Page Name}
Date: YYYY-MM-DD
Device: {Desktop / Mobile (throttled)}

LCP:  X.Xs
INP:  Xms
CLS:  X.XX

Lighthouse Performance:   XX
Lighthouse Accessibility: XX
Lighthouse Best Practices: XX
Lighthouse SEO:           XX

Initial JS: XXX KB
Total Weight: XXX KB
```

---

## 4. Reduced Motion Testing

Users who set `prefers-reduced-motion: reduce` in their OS must receive a **fully functional** experience without animations.

### Checklist

- [ ] **CSS transitions** are disabled or reduced to instant (`duration: 0`)
- [ ] **Page transitions** (if using View Transitions API) are skipped
- [ ] **Chart animations** (candlestick drawing, line graph animation) are disabled — chart renders in final state immediately
- [ ] **Price ticker** does not animate number changes — updates instantly
- [ ] **Loading skeletons** use static placeholders instead of shimmer animation
- [ ] **Scroll-driven animations** are disabled
- [ ] **WebGL visualizations** (if any) are static or replaced with a 2D fallback
- [ ] **Haptic feedback** (Android) is unaffected — it is not a motion trigger

### How to Test

1. **macOS:** System Settings → Accessibility → Display → Reduce motion
2. **Chrome DevTools:** Rendering panel → Emulate CSS media feature → `prefers-reduced-motion: reduce`
3. **Android:** Settings → Accessibility → Remove animations

---

## 5. GPU Tier Testing

Naytra may use WebGL for selective 3D visualizations (see `DESIGN.md` §5). These must degrade gracefully on low-end hardware.

### GPU Tiers

| Tier | Example Devices | Expected Experience |
| --- | --- | --- |
| **Tier 0** | Very old devices, no WebGL | 2D fallback; no 3D features |
| **Tier 1** | Budget Android phones (2–3 year old) | Simplified 3D (reduced particles, lower resolution) |
| **Tier 2** | Mid-range phones, older laptops | Full 3D with reduced quality settings |
| **Tier 3** | Flagship phones, modern laptops/desktops | Full 3D with maximum quality |

### Detection Strategy

- Use a GPU detection library (e.g., `detect-gpu`) to classify the device at runtime.
- Select the appropriate quality tier automatically.
- Provide a manual override in Settings for users who want to force a lower tier.

### Testing Approach

| Method | Covers |
| --- | --- |
| **Chrome DevTools → Performance → CPU throttling (6× slowdown)** | Simulates Tier 1 CPU |
| **Chrome `--use-gl=swiftshader`** | Software WebGL rendering (Tier 0/1) |
| **Real device testing** | Budget Android phone from the device lab |
| **Lighthouse with mobile throttling** | Simulates slow network + CPU |

### Acceptance Criteria

- [ ] App loads and is **fully functional** without WebGL (Tier 0)
- [ ] No blank screens or errors if WebGL is unavailable
- [ ] 3D chunks are **lazy-loaded** — never block initial page load
- [ ] FPS ≥ 30 on Tier 1 devices for any 3D visualizations
- [ ] FPS ≥ 60 on Tier 3 devices

---

## 6. QA Workflow Integration

### Per-PR Checklist

Before merging any UI-related PR:

- [ ] Screenshots captured for changed components (viewport × theme matrix)
- [ ] axe-core scan: zero critical/serious violations
- [ ] Keyboard navigation tested: logical tab order, visible focus
- [ ] Reduced motion mode tested: no unintended animations
- [ ] Lighthouse scores meet minimums
- [ ] Bundle size within budget (check with `npm run build && npm run analyze`)
- [ ] Dark mode visually verified

### Per-Milestone QA

Before marking a milestone complete:

- [ ] Full-page screenshots for all new pages (all 10 viewport × theme combos)
- [ ] Screen reader walkthrough (VoiceOver minimum)
- [ ] Performance report recorded for each new page
- [ ] GPU tier testing for any new 3D features
- [ ] Cross-browser check: Chrome, Firefox, Safari (latest stable)

---

## 7. Step 1 Verification Report (Design System & 3D Foundation)

**Date:** 2026-11-15  
**Scope:** M0 Foundation + Step 1 Design System Tokens, 16 UI Components, 4 Hooks, 3 Procedural 3D Scenes with 2D Fallbacks, `/status` page, and `/design` showcase route.

### 7.1 Automated Accessibility (Axe-Core Audit)
- **Tool:** `@axe-core/playwright` v4.14
- **Results:**
  - `/status` (Light & Dark): **0 Critical / 0 Serious violations** (PASSED)
  - `/design` (Light & Dark): **0 Critical / 0 Serious violations** (PASSED)
- **WCAG AA Compliance:** Verified 4.5:1 text contrast for all semantic tokens including Marigold high-contrast text (`--color-marigold-text`: `#8A4B00` light / `#F2A93B` dark), Up/Down indicators, and dark mode keycaps. Accessible names confirmed on progress indicators, interactive toggles, and navigation links.

### 7.2 Visual Regression & Viewport Matrix
20 full-page screenshots captured and archived in `docs/ui/step-1/`:
- **5 Viewports:** `360x800` (Mobile S), `412x915` (Mobile L), `768x1024` (Tablet), `1280x800` (Desktop), `1920x1080` (Desktop L)
- **2 Themes:** Light (Mist) and Dark (Ink)
- **2 Pages:** `/status` (StatusPage) and `/design` (DesignSystem showcase)

### 7.3 Reduced Motion Verification
- **Emulation:** `prefers-reduced-motion: reduce` verified via Playwright.
- **Behavior:** Shimmer and spring animations suppressed to `< 0.01ms`, CSS scroll behavior set to auto, 3D scenes gracefully render static 2D vector fallbacks without layout shift.

### 7.4 Test Suite Summary
- **API Unit & Integration Tests:** 30 passed in 0.09s (`pytest -v`)
- **Web Unit Tests:** 19 passed in 0.76s (`vitest run`)
- **E2E Visual & Accessibility Tests:** 23 passed in 44.5s (`playwright test`)
- **TypeScript Static Analysis:** Clean (`tsc --noEmit` exits 0)
- **Production Build:** Succeeded (`vite build` exits 0)

---

*Last updated: 2026-11-15*
