import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const androidRes = path.resolve(rootDir, 'android/app/src/main/res');
const webPublic = path.resolve(rootDir, 'web/public');

// SVG Candlestick N mark
const nMarkSvg = `
<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Left green candlestick (Bullish) -->
  <line x1="25" y1="12" x2="25" y2="88" stroke="#0B7A5A" stroke-width="4" stroke-linecap="round" />
  <rect x="16" y="28" width="18" height="44" rx="4" fill="#0B7A5A" />

  <!-- Right red candlestick (Bearish) -->
  <line x1="75" y1="12" x2="75" y2="88" stroke="#C43232" stroke-width="4" stroke-linecap="round" />
  <rect x="66" y="32" width="18" height="40" rx="4" fill="#C43232" />

  <!-- Diagonal Marigold connector creating the 'N' -->
  <path
    d="M25 32 L75 68"
    stroke="#F2A93B"
    stroke-width="11"
    stroke-linecap="round"
  />
</svg>
`;

// HTML templates
function getForegroundHtml(size) {
  // Adaptive icon foreground: 108x108 with 72x72 safe center zone (approx 66% scale)
  const markSize = Math.round(size * 0.55);
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body, html { margin: 0; padding: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }
      svg { width: ${markSize}px; height: ${markSize}px; }
    </style>
  </head>
  <body>
    ${nMarkSvg}
  </body>
  </html>
  `;
}

function getLegacyIconHtml(size, round = false) {
  const markSize = Math.round(size * 0.65);
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body, html { margin: 0; padding: 0; width: ${size}px; height: ${size}px; overflow: hidden; background: #172033; display: flex; align-items: center; justify-content: center; border-radius: ${round ? '50%' : '20%'}; }
      svg { width: ${markSize}px; height: ${markSize}px; }
    </style>
  </head>
  <body>
    ${nMarkSvg}
  </body>
  </html>
  `;
}

function getSplashHtml(width, height) {
  const markSize = Math.min(width, height) * 0.28;
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body, html {
        margin: 0;
        padding: 0;
        width: ${width}px;
        height: ${height}px;
        background: #172033;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        overflow: hidden;
      }
      .mark-container {
        width: ${markSize}px;
        height: ${markSize}px;
        filter: drop-shadow(0 12px 32px rgba(0, 0, 0, 0.45));
      }
      .mark-container svg {
        width: 100%;
        height: 100%;
      }
      .brand-title {
        color: #EEF1F5;
        font-size: ${Math.max(18, Math.round(markSize * 0.26))}px;
        font-weight: 800;
        letter-spacing: 0.18em;
        margin-top: ${Math.round(markSize * 0.16)}px;
        text-transform: uppercase;
      }
      .brand-sub {
        color: #F2A93B;
        font-size: ${Math.max(10, Math.round(markSize * 0.11))}px;
        font-weight: 600;
        letter-spacing: 0.12em;
        margin-top: 6px;
        opacity: 0.9;
      }
    </style>
  </head>
  <body>
    <div class="mark-container">
      ${nMarkSvg}
    </div>
    <div class="brand-title">NAYTRA</div>
    <div class="brand-sub">SENSEX 30 • PAPER TRADING</div>
  </body>
  </html>
  `;
}

async function generate() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  fs.mkdirSync(webPublic, { recursive: true });

  const mipmaps = [
    { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 },
  ];

  for (const m of mipmaps) {
    const targetDir = path.join(androidRes, m.dir);
    fs.mkdirSync(targetDir, { recursive: true });

    // Foreground
    await page.setViewportSize({ width: m.fgSize, height: m.fgSize });
    await page.setContent(getForegroundHtml(m.fgSize));
    await page.screenshot({ path: path.join(targetDir, 'ic_launcher_foreground.png'), omitBackground: true });

    // Legacy square
    await page.setViewportSize({ width: m.iconSize, height: m.iconSize });
    await page.setContent(getLegacyIconHtml(m.iconSize, false));
    await page.screenshot({ path: path.join(targetDir, 'ic_launcher.png') });

    // Legacy round
    await page.setContent(getLegacyIconHtml(m.iconSize, true));
    await page.screenshot({ path: path.join(targetDir, 'ic_launcher_round.png'), omitBackground: true });

    console.log(`Generated ${m.dir} assets`);
  }

  // Splashes
  const splashes = [
    { file: 'drawable/splash.png', w: 480, h: 320 },
    { file: 'drawable-port-mdpi/splash.png', w: 320, h: 480 },
    { file: 'drawable-port-hdpi/splash.png', w: 480, h: 800 },
    { file: 'drawable-port-xhdpi/splash.png', w: 720, h: 1280 },
    { file: 'drawable-port-xxhdpi/splash.png', w: 960, h: 1600 },
    { file: 'drawable-port-xxxhdpi/splash.png', w: 1280, h: 1920 },
    { file: 'drawable-land-mdpi/splash.png', w: 480, h: 320 },
    { file: 'drawable-land-hdpi/splash.png', w: 800, h: 480 },
    { file: 'drawable-land-xhdpi/splash.png', w: 1280, h: 720 },
    { file: 'drawable-land-xxhdpi/splash.png', w: 1600, h: 960 },
    { file: 'drawable-land-xxxhdpi/splash.png', w: 1920, h: 1280 },
  ];

  for (const s of splashes) {
    const dest = path.join(androidRes, s.file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.setContent(getSplashHtml(s.w, s.h));
    await page.screenshot({ path: dest });
    console.log(`Generated ${s.file} (${s.w}x${s.h})`);
  }

  // Web public icons
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(getLegacyIconHtml(512, false));
  await page.screenshot({ path: path.join(webPublic, 'icon-512.png') });

  await page.setViewportSize({ width: 192, height: 192 });
  await page.setContent(getLegacyIconHtml(192, false));
  await page.screenshot({ path: path.join(webPublic, 'icon-192.png') });

  await page.setViewportSize({ width: 64, height: 64 });
  await page.setContent(getLegacyIconHtml(64, false));
  await page.screenshot({ path: path.join(webPublic, 'favicon.png') });

  fs.writeFileSync(path.join(webPublic, 'favicon.svg'), nMarkSvg.trim());

  await browser.close();
  console.log('All icons and splash screens generated successfully!');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
