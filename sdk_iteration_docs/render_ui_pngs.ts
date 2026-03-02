/**
 * render_ui_pngs.ts
 *
 * Captures pixel-perfect screenshots of UI components and starter kit layouts.
 *
 * Modes:
 *   components  — Capture individual UI components (requires App_AllComponents in main.tsx)
 *   kits        — Capture full-page starter kit layouts (requires App_StarterKitCapture in main.tsx)
 *   all         — Both (requires App_AllComponents first, then App_StarterKitCapture — or run separately)
 *
 * Prerequisites:
 *   1. npm install playwright (from repo root)
 *   2. npx playwright install chromium
 *   3. Set the correct App import in demo-app/src/main.tsx
 *   4. Start backend + demo app (cd demo-app && npm run dev)
 *
 * Usage:
 *   npx tsx sdk_iteration_docs/render_ui_pngs.ts components
 *   npx tsx sdk_iteration_docs/render_ui_pngs.ts kits
 *   npx tsx sdk_iteration_docs/render_ui_pngs.ts           # defaults to "kits"
 *
 * Options:
 *   DEV_URL  — override the demo app URL (default: http://localhost:5173)
 *   SCALE    — device scale factor for retina (default: 2)
 */

import { chromium, type Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_URL = process.env.DEV_URL || 'http://localhost:5173';
const SCALE = Number(process.env.SCALE) || 2;
const OUTPUT_DIR = path.resolve(__dirname, 'ui_images');

// ── Component capture config (App_AllComponents) ──

const COMPONENTS: {
  name: string;
  selector: string;
  waitFor?: string;
}[] = [
  { name: 'MarketStats',         selector: '[data-capture="MarketStats"]',         waitFor: '.fs-stats-bar .fs-stat-value' },
  { name: 'AuthWidget',          selector: '[data-capture="AuthWidget"]',          waitFor: '.fs-auth-widget' },
  { name: 'ConsensusChart',      selector: '[data-capture="ConsensusChart"]',      waitFor: '.fs-chart-container .recharts-surface' },
  { name: 'DistributionChart',   selector: '[data-capture="DistributionChart"]',   waitFor: '.fs-chart-container .recharts-surface' },
  { name: 'TimelineChart',       selector: '[data-capture="TimelineChart"]',       waitFor: '.fs-chart-container .recharts-surface' },
  { name: 'MarketCharts',        selector: '[data-capture="MarketCharts"]',        waitFor: '.fs-chart-container .recharts-surface' },
  { name: 'TradePanel',          selector: '[data-capture="TradePanel"]',          waitFor: '.fs-trade-panel' },
  { name: 'ShapeCutter',         selector: '[data-capture="ShapeCutter"]',         waitFor: '.fs-shape-cutter' },
  { name: 'BinaryPanel',         selector: '[data-capture="BinaryPanel"]',         waitFor: '.fs-binary-panel' },
  { name: 'BucketRangeSelector', selector: '[data-capture="BucketRangeSelector"]', waitFor: '.fs-bucket-range' },
  { name: 'BucketTradePanel',    selector: '[data-capture="BucketTradePanel"]',    waitFor: '.fs-bucket-trade-panel' },
  { name: 'CustomShapeEditor',   selector: '[data-capture="CustomShapeEditor"]',   waitFor: '.fs-custom-shape' },
  { name: 'PositionTable',       selector: '[data-capture="PositionTable"]',       waitFor: '.fs-table-container' },
  { name: 'TimeSales',           selector: '[data-capture="TimeSales"]',           waitFor: '.fs-time-sales' },
];

// ── Starter kit capture config (App_StarterKitCapture with hash routing) ──

const STARTER_KITS: {
  name: string;
  hash: string;
}[] = [
  { name: 'StarterKit_BasicTrading',     hash: 'basic' },
  { name: 'StarterKit_BinaryPanel',      hash: 'binary' },
  { name: 'StarterKit_CustomShape',      hash: 'custom-shape' },
  { name: 'StarterKit_DistRange',        hash: 'dist-range' },
  { name: 'StarterKit_ShapeCutter',      hash: 'shape-cutter' },
  { name: 'StarterKit_TimelineBinary',   hash: 'timeline-binary' },
];

// ── Component capture ──

async function captureComponents(page: Page) {
  console.log('\n=== Capturing individual components ===\n');

  console.log(`Navigating to ${DEV_URL}...`);
  await page.goto(DEV_URL, { waitUntil: 'networkidle' });

  console.log('Waiting for components to hydrate...');
  await page.waitForTimeout(4000);

  for (const comp of COMPONENTS) {
    const outPath = path.join(OUTPUT_DIR, `${comp.name}.png`);

    try {
      await page.waitForSelector(comp.selector, { timeout: 10000 });

      if (comp.waitFor) {
        await page.waitForSelector(`${comp.selector} ${comp.waitFor}`, { timeout: 10000 }).catch(() => {
          console.warn(`  ⚠ Inner selector "${comp.waitFor}" not found for ${comp.name}, capturing anyway`);
        });
      }

      await page.waitForTimeout(500);

      const element = await page.$(comp.selector);
      if (!element) {
        console.error(`  ✗ ${comp.name}: element not found`);
        continue;
      }

      await element.screenshot({ path: outPath });
      console.log(`  ✓ ${comp.name}.png`);
    } catch (err) {
      console.error(`  ✗ ${comp.name}: ${(err as Error).message}`);
    }
  }

  // AuthWidget: capture both states
  console.log('\nCapturing AuthWidget alternate state...');
  try {
    const authSelector = '[data-capture="AuthWidget"]';
    const userBar = await page.$(`${authSelector} .fs-auth-user-bar`);

    if (userBar) {
      const loggedInPath = path.join(OUTPUT_DIR, 'AuthWidget_LoggedIn.png');
      const originalPath = path.join(OUTPUT_DIR, 'AuthWidget.png');
      if (fs.existsSync(originalPath)) {
        fs.renameSync(originalPath, loggedInPath);
        console.log('  ✓ AuthWidget.png → AuthWidget_LoggedIn.png (was already authenticated)');
      }
      const signOutBtn = await page.$(`${authSelector} .fs-auth-signout-btn`);
      if (signOutBtn) {
        await signOutBtn.click();
        await page.waitForTimeout(1500);
        const element = await page.$(authSelector);
        if (element) {
          await element.screenshot({ path: path.join(OUTPUT_DIR, 'AuthWidget_LoggedOut.png') });
          console.log('  ✓ AuthWidget_LoggedOut.png');
        }
      }
    } else {
      const loggedOutPath = path.join(OUTPUT_DIR, 'AuthWidget_LoggedOut.png');
      const originalPath = path.join(OUTPUT_DIR, 'AuthWidget.png');
      if (fs.existsSync(originalPath)) {
        fs.renameSync(originalPath, loggedOutPath);
        console.log('  ✓ AuthWidget.png → AuthWidget_LoggedOut.png');
      }
      const signInBtn = await page.$(`${authSelector} .fs-auth-btn-primary`);
      if (signInBtn) {
        await signInBtn.click();
        await page.waitForTimeout(500);
        const inputs = await page.$$(`${authSelector} .fs-auth-input`);
        if (inputs.length >= 2) {
          await inputs[0].fill(process.env.VITE_FS_USERNAME || 'demo');
          await inputs[1].fill(process.env.VITE_FS_PASSWORD || 'demo');
          const submitBtn = await page.$(`${authSelector} .fs-auth-btn-primary`);
          if (submitBtn) {
            await submitBtn.click();
            await page.waitForTimeout(3000);
            const element = await page.$(authSelector);
            if (element) {
              await element.screenshot({ path: path.join(OUTPUT_DIR, 'AuthWidget_LoggedIn.png') });
              console.log('  ✓ AuthWidget_LoggedIn.png');
            }
          }
        }
      }
    }
  } catch (err) {
    console.error(`  ✗ AuthWidget alternate state: ${(err as Error).message}`);
  }
}

// ── Starter kit capture ──

async function captureStarterKits(page: Page) {
  console.log('\n=== Capturing starter kit layouts ===\n');

  for (const kit of STARTER_KITS) {
    const outPath = path.join(OUTPUT_DIR, `${kit.name}.png`);
    const url = `${DEV_URL}#${kit.hash}`;
    const selector = `[data-capture="${kit.name}"]`;

    try {
      console.log(`  Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for data to load and charts to render
      await page.waitForTimeout(5000);

      // Capture just the widget wrapper element
      await page.waitForSelector(selector, { timeout: 10000 });
      const element = await page.$(selector);
      if (!element) {
        console.error(`  ✗ ${kit.name}: element not found`);
        continue;
      }

      await element.screenshot({ path: outPath });
      console.log(`  ✓ ${kit.name}.png`);
    } catch (err) {
      console.error(`  ✗ ${kit.name}: ${(err as Error).message}`);
    }
  }
}

// ── Main ──

async function main() {
  const mode = process.argv[2] || 'kits';

  if (!['components', 'kits', 'all'].includes(mode)) {
    console.error(`Unknown mode: ${mode}`);
    console.error('Usage: npx tsx render_ui_pngs.ts [components|kits|all]');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Launching browser (scale: ${SCALE}x, mode: ${mode})...`);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: SCALE,
  });
  const page = await context.newPage();

  if (mode === 'components' || mode === 'all') {
    await captureComponents(page);
  }

  if (mode === 'kits' || mode === 'all') {
    await captureStarterKits(page);
  }

  await browser.close();
  console.log(`\nDone! Images saved to: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
