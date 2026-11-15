# Design System — Naytra

---

## 1. Brand Identity

### The N Mark

The Naytra logo is the letter **N** constructed from **two candlestick chart elements** — a visual bridge between the app's identity and its stock-market purpose. The candlesticks form the two vertical strokes of the N, with the diagonal connecting them.

### Brand Values

- **Clarity** — complex market concepts made simple
- **Confidence** — learn without financial risk
- **Craft** — polished, tactile, modern

---

## 2. Color Palette

| Name | Hex | RGB | Usage |
| --- | --- | --- | --- |
| **Ink** | `#172033` | 23, 32, 51 | Primary text, dark backgrounds, N mark |
| **Mist** | `#EEF1F5` | 238, 241, 245 | Light backgrounds, cards, surfaces |
| **Marigold** | `#F2A93B` | 242, 169, 59 | Primary accent, CTAs, highlights, brand warmth |
| **Up** | `#0B7A5A` | 11, 122, 90 | Positive values, gains, buy indicators |
| **Down** | `#C43232` | 196, 50, 50 | Negative values, losses, sell indicators |

### Extended Palette (Derived)

| Name | Hex | Usage |
| --- | --- | --- |
| Ink-90 | `#2A3448` | Secondary text |
| Ink-70 | `#4A5568` | Tertiary text, labels |
| Ink-50 | `#718096` | Placeholder text, disabled states |
| Mist-dark | `#DDE2EA` | Borders, dividers |
| Marigold-light | `#FDF0DB` | Subtle highlights, selected states |
| Marigold-dark | `#D4922E` | Hover/active accent |
| Up-light | `#E6F5F0` | Gain backgrounds |
| Down-light | `#FDE8E8` | Loss backgrounds |

### Dark Mode Mapping

| Light | Dark Equivalent |
| --- | --- |
| Mist (`#EEF1F5`) background | Ink (`#172033`) background |
| Ink (`#172033`) text | Mist (`#EEF1F5`) text |
| Marigold | Marigold (unchanged — sufficient contrast on dark) |
| Up / Down | Up / Down (unchanged — tested for contrast on dark) |

---

## 3. Typography

### Font Stack

| Role | Font | Weight | Licence | Source |
| --- | --- | --- | --- | --- |
| **Headings** | Bricolage Grotesque | 600 (Semi-bold), 700 (Bold) | SIL OFL | Self-hosted |
| **Body** | IBM Plex Sans | 400 (Regular), 500 (Medium), 600 (Semi-bold) | SIL OFL | Self-hosted |
| **Monospace** | IBM Plex Mono | 400, 500 | SIL OFL | Self-hosted |

> **Self-hosted:** Font files are bundled in the web build (`web/public/fonts/`). No external requests to Google Fonts. This improves LCP, eliminates layout shift, and avoids third-party tracking.

### Type Scale

| Token | Size | Line Height | Font | Weight | Usage |
| --- | --- | --- | --- | --- | --- |
| `display` | 48px / 3rem | 1.1 | Bricolage Grotesque | 700 | Hero headlines |
| `h1` | 36px / 2.25rem | 1.2 | Bricolage Grotesque | 700 | Page titles |
| `h2` | 28px / 1.75rem | 1.25 | Bricolage Grotesque | 600 | Section headings |
| `h3` | 22px / 1.375rem | 1.3 | Bricolage Grotesque | 600 | Card titles |
| `h4` | 18px / 1.125rem | 1.35 | Bricolage Grotesque | 600 | Subsection headings |
| `body-lg` | 18px / 1.125rem | 1.6 | IBM Plex Sans | 400 | Lead paragraphs |
| `body` | 16px / 1rem | 1.6 | IBM Plex Sans | 400 | Default body text |
| `body-sm` | 14px / 0.875rem | 1.5 | IBM Plex Sans | 400 | Secondary text, captions |
| `caption` | 12px / 0.75rem | 1.4 | IBM Plex Sans | 500 | Labels, timestamps |
| `mono` | 14px / 0.875rem | 1.5 | IBM Plex Mono | 400 | Code, prices, numbers |

---

## 4. Elevation System

Naytra uses a 6-level elevation system to create visual depth. Elevations are achieved with `box-shadow` and subtle background adjustments.

| Token | Shadow | Use |
| --- | --- | --- |
| `e0` | None | Flat content, inline text |
| `e1` | `0 1px 3px rgba(23,32,51,0.08)` | Cards, list items |
| `e2` | `0 4px 12px rgba(23,32,51,0.12)` | Raised cards, dropdown panels |
| `e3` | `0 8px 24px rgba(23,32,51,0.16)` | Modals, floating action buttons |
| `e4` | `0 16px 48px rgba(23,32,51,0.20)` | Toasts, popovers |
| `e5` | `0 24px 64px rgba(23,32,51,0.24)` | Full-screen overlays |

> **Status:** Defined. Will be implemented as Tailwind utilities or CSS custom properties in Step 1.

---

## 5. 3D / 4D Design Philosophy

### 3D — Visible Depth

Naytra's UI should feel **tangible and tactile**, not flat. The "3D" principle means:

| Principle | Implementation |
| --- | --- |
| **Light source** | Consistent top-left light source for all shadows and highlights |
| **Elevation** | Cards and interactive elements appear to float above the surface (see §4) |
| **Tactile controls** | Buttons have subtle pressed/raised states; sliders feel physical |
| **Selective WebGL** | Hero visualizations (e.g., 3D portfolio globe, candlestick depth) may use WebGL — loaded lazily, never blocking initial paint |

### 4D — Time Dimension

The "4D" principle adds **time** as a conscious design element:

| Principle | Implementation |
| --- | --- |
| **Live motion** | Prices tick in real-time with smooth number transitions; charts animate new candles |
| **Replay / time-travel** | The replay engine is a first-class UI concept — scrub through market history like a video player |
| **Continuity** | Page transitions use shared-element animations; state persists across navigation |
| **Haptics** | On Android (Capacitor), provide haptic feedback on trade execution and significant price movements |

> The 4D philosophy makes the app feel **alive** — not a static spreadsheet of numbers, but a living simulation of the market.

---

## 6. Component Inventory

> **Status:** Planned for Step 1 implementation. The following components will be built:

### Atoms

- Button (primary, secondary, ghost, danger)
- Input (text, number, password)
- Badge (neutral, success, danger, warning)
- Icon (system icon set)
- Price display (with Up/Down coloring)
- Skeleton loader

### Molecules

- Card (elevated surface with header/body/footer)
- Form field (label + input + error message)
- Price ticker (animated number with color)
- Nav item (icon + label + active state)
- Empty state (illustration + message + action)

### Organisms

- Navigation bar (top)
- Bottom tab bar (mobile)
- Stock list item (symbol, name, price, change)
- Order form (buy/sell with quantity input)
- Transaction row (ledger entry)

### Pages

- Sign in / Sign up
- Dashboard
- Stock list
- Stock detail
- Portfolio
- Wallet / Ledger
- Settings

---

## 7. Dark Mode Strategy

| Aspect | Approach |
| --- | --- |
| **Trigger** | System preference (`prefers-color-scheme`) + manual toggle |
| **Persistence** | User choice saved to `localStorage`; system default if no choice |
| **Implementation** | CSS custom properties (`:root` and `[data-theme="dark"]`) + Tailwind `dark:` variant |
| **Color mapping** | See §2 Dark Mode Mapping |
| **Charts** | Dark-aware chart themes (dark background, light grid lines) |
| **Images** | Decorative images swap or dim; the N mark works on both backgrounds |
| **Transition** | Smooth `transition: background-color 200ms, color 200ms` on theme switch |

---

## 8. Accessibility Requirements

Naytra targets **WCAG 2.1 Level AA** compliance.

| Requirement | Details |
| --- | --- |
| **Color contrast** | Minimum 4.5:1 for normal text, 3:1 for large text. All palette combinations tested. |
| **Keyboard navigation** | All interactive elements focusable and operable via keyboard. Visible focus rings. |
| **Screen reader support** | Semantic HTML, ARIA labels where needed, live regions for price updates. |
| **Reduced motion** | Respect `prefers-reduced-motion: reduce`. Disable animations, transitions, and auto-playing tickers. Provide static alternatives. |
| **Text scaling** | UI must remain usable at **200% text zoom** (browser zoom). No fixed-height containers that clip text. |
| **Touch targets** | Minimum 44×44px tap targets on mobile. |
| **Error identification** | Form errors announced to screen readers; not conveyed by color alone. |
| **Alt text** | All meaningful images have descriptive alt text. Decorative images use `alt=""`. |
| **Language** | `<html lang="en">` set. |

---

## 9. Performance Budgets

| Metric | Budget | Tool |
| --- | --- | --- |
| **Initial JS bundle** | ≤ 250 KB (compressed) | Vite bundle analyzer |
| **3D/WebGL chunk** | ≤ 350 KB (lazy-loaded) | — |
| **LCP** | ≤ 2.5 s | Lighthouse |
| **FID / INP** | ≤ 200 ms | Lighthouse |
| **CLS** | ≤ 0.1 | Lighthouse |
| **Total page weight** | ≤ 800 KB (initial load) | DevTools Network |
| **Font files** | ≤ 150 KB total (subset + woff2) | — |
| **Time to Interactive** | ≤ 3.5 s (3G throttled) | Lighthouse |

### Strategies

- **Code splitting**: Route-based lazy loading with `React.lazy()` + `Suspense`.
- **Tree shaking**: Vite handles this by default with ESM.
- **Font subsetting**: Only include Latin character set; use `woff2` format.
- **Image optimization**: Use `avif` / `webp` with `<picture>` fallbacks.
- **Preloading**: `<link rel="preload">` for critical fonts and above-the-fold assets.
- **Service worker**: Cache static assets for offline-capable repeat visits (M6+).

---

## 10. Step 1 Implementation: 3D Depth System & 4D Motion

### The 3D Depth System
- **One Light Source**: Top-left light model applied consistently across all cards and 3D scenes.
- **Elevation Ramp (e0 to e5)**:
  - `e0`: Flat surface
  - `e1`: Subtle elevation (`0 1px 2px -1px rgba(23,32,51,0.08), 0 2px 4px 0 rgba(23,32,51,0.04)`)
  - `e2`: Interactive cards (`0 3px 6px -2px rgba(23,32,51,0.08), 0 4px 12px 0 rgba(23,32,51,0.06)`)
  - `e3`: Floating sheets / glass surfaces
  - `e4`: Dropdowns, popovers, and toasts
  - `e5`: Modal dialogs and full bottom sheets
  - **Dark Mode Elevation**: Uses lighter surface tints + a 1px top highlight (`inset 0 1px 0 rgba(255,255,255,0.08)`) instead of heavy black drop shadows.
- **Surface Types**:
  - `Surface`: base, raised, inset, glass, and hero
  - `Card3D`: 3D perspective hover tilt (800px perspective, max 6 degrees) restricted strictly to fine mouse pointers (`pointer: fine`); touch devices only receive press-depth scale (0.98).
  - `Button`: Keycap tactile 3D buttons with a distinct bottom edge; active states translate down 2px and flatten the key shadow.

### 4D Motion & Time Dimensions
- **NumberTicker**: Monospace rolling digits that land on the exact server-provided numerical value.
- **PriceFlash**: Instant visual glow + arrow indicator + delta text on change (never color alone).
- **ProgressRing**: SVG-based replay clock ring showing progress through trading sessions.
- **Time Continuity**: Shared transitions, shimmer skeletons, and orchestrated screen entrances.

### WebGL 3D Scene Rules
- Lazy-loaded procedural geometry via `@react-three/fiber` and `three.js`.
- Strict DPR capping at `Math.min(devicePixelRatio, 2)`.
- Automatic rendering pause on off-screen (via `IntersectionObserver`) and tab hidden (via `visibilitychange`).
- Hardware GPU Tier gate: Tiers 0 and 1 skip WebGL and display static SVG/CSS fallbacks.
- Motion preferences gate: `prefers-reduced-motion` immediately serves static fallbacks.
- Zero external 3D asset dependencies; all geometries (`LogoN3D`, `CoinVirtual3D`, `CandleStack3D`) are procedurally synthesized.

---

*Last updated: 2026-11-14*
