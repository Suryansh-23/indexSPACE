/**
 * render_ui_pngs.ts  -- Automated UI screenshot capture for SDK documentation
 *
 * Uses Playwright to capture pixel-perfect, retina-quality PNGs of every SDK
 * UI component and starter kit layout. Output goes to internal_sdk_docs/ui_images/.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This script works with two companion React apps in demo-app/src/:
 *
 *   App_AllComponents.tsx         -- Renders every UI component on one page.
 *                                  Each component is wrapped in a <div data-capture="ComponentName">
 *                                  so this script can target and screenshot them individually.
 *
 *   App_StarterKitCapture.tsx     -- Hash-routed app that renders each starter kit layout.
 *                                  Navigate to #basic, #binary, #custom-shape, etc.
 *                                  Each layout is wrapped in <div data-capture="StarterKit_Name">.
 *                                  Uses noAuthConfig so AuthWidget renders logged-out.
 *
 * Only one app can be active at a time in demo-app/src/main.tsx. You must set
 * the correct import before running each mode (see usage below).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MODES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   components  -- Captures individual UI components (14 components + 2 AuthWidget states).
 *                Requires: `import App from './App_AllComponents'` in main.tsx.
 *
 *   kits        -- Captures full starter kit layouts (6 layouts, logged-out state).
 *                Requires: `import App from './App_StarterKitCapture'` in main.tsx.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PREREQUISITES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   1. Install deps (one-time):
 *        npm install playwright && npx playwright install chromium
 *
 *   2. Set the correct App import in demo-app/src/main.tsx (see modes above)
 *
 *   3. Start the backend API server
 *
 *   4. Start the demo app:
 *        cd demo-app && npm run dev
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * USAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   # Activate the conda environment (required for node/npx access)
 *   conda activate python-313
 *
 *   # Capture individual component screenshots
 *   #   (main.tsx must import App_AllComponents)
 *   npx tsx internal_sdk_docs/render_ui_pngs.ts components
 *
 *   # Capture starter kit layout screenshots
 *   #   (main.tsx must import App_StarterKitCapture)
 *   npx tsx internal_sdk_docs/render_ui_pngs.ts kits
 *
 *   # Default (no argument) runs "kits" mode
 *   npx tsx internal_sdk_docs/render_ui_pngs.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ENVIRONMENT VARIABLES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   DEV_URL   -- Demo app URL (default: http://localhost:5173)
 *   SCALE     -- Device scale factor for retina (default: 2, use 1 for standard)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * OUTPUT FILES  -- internal_sdk_docs/ui_images/
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   "components" mode produces:
 *     MarketStats.png, ConsensusChart.png, DistributionChart.png,
 *     TimelineChart.png, MarketCharts.png, TradePanel.png, ShapeCutter.png,
 *     BinaryPanel.png, BucketRangeSelector.png, BucketTradePanel.png,
 *     CustomShapeEditor.png, PositionTable.png, TimeSales.png,
 *     AuthWidget_LoggedIn.png, AuthWidget_LoggedOut.png
 *
 *   "kits" mode produces:
 *     StarterKit_BasicTrading.png, StarterKit_BinaryPanel.png,
 *     StarterKit_CustomShape.png, StarterKit_DistRange.png,
 *     StarterKit_ShapeCutter.png, StarterKit_TimelineBinary.png
 *
 *   All images use fs-dark theme at 2x retina resolution.
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

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT CAPTURE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
//
// Each entry maps to a <div data-capture="Name"> in App_AllComponents.tsx.
// - name:    Output filename (without .png extension)
// - selector: CSS selector targeting the wrapper div
// - waitFor:  Optional inner selector to wait for before capturing  -- ensures
//             the component has finished loading/rendering (e.g., Recharts SVG
//             elements appear only after data fetches complete)

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

// ═══════════════════════════════════════════════════════════════════════════════
// STARTER KIT CAPTURE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
//
// Each entry maps to a hash route in App_StarterKitCapture.tsx.
// The app uses a simple hash router: navigating to /#basic renders the
// BasicTradingLayout, which wraps its content in <div data-capture="StarterKit_BasicTrading">.
// - name: Output filename (without .png)  -- must match the data-capture attribute
// - hash: URL hash fragment to navigate to

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

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT CAPTURE
// ═══════════════════════════════════════════════════════════════════════════════
//
// Navigates to the App_AllComponents page (single URL, all components stacked)
// and screenshots each one by its data-capture selector.
//
// AuthWidget special handling:
//   The demo app may auto-authenticate (if .env has credentials). This script
//   captures the initial state, then toggles to the opposite state:
//   - If auto-authenticated: renames initial capture to _LoggedIn, signs out, captures _LoggedOut
//   - If not authenticated: renames initial capture to _LoggedOut, signs in, captures _LoggedIn

async function captureComponents(page: Page) {
  console.log('\n=== Capturing individual components ===\n');

  console.log(`Navigating to ${DEV_URL}...`);
  await page.goto(DEV_URL, { waitUntil: 'networkidle' });

  // Wait for all components to fetch data and render (charts need time for Recharts SVG)
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

      // Let CSS transitions and animations settle
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

  // --- AuthWidget: capture both logged-in and logged-out states ---
  console.log('\nCapturing AuthWidget alternate state...');
  try {
    const authSelector = '[data-capture="AuthWidget"]';
    const userBar = await page.$(`${authSelector} .fs-auth-user-bar`);

    if (userBar) {
      // Already logged in  -- rename initial capture and sign out for logged-out capture
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
      // Not logged in  -- rename initial capture and sign in for logged-in capture
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

// ═══════════════════════════════════════════════════════════════════════════════
// STARTER KIT CAPTURE
// ═══════════════════════════════════════════════════════════════════════════════
//
// Navigates to each hash route in App_StarterKitCapture and captures the
// widget wrapper element. Each layout renders with noAuthConfig (logged-out)
// and fs-dark theme. The hash router re-renders the layout without a full
// page reload, but we use page.goto() per kit to ensure clean state.

async function captureStarterKits(page: Page) {
  console.log('\n=== Capturing starter kit layouts ===\n');

  for (const kit of STARTER_KITS) {
    const outPath = path.join(OUTPUT_DIR, `${kit.name}.png`);
    const url = `${DEV_URL}#${kit.hash}`;
    const selector = `[data-capture="${kit.name}"]`;

    try {
      console.log(`  Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for data fetches + chart renders (TimelineChart needs history data)
      await page.waitForTimeout(5000);

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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  const mode = process.argv[2] || 'kits';

  if (!['components', 'kits'].includes(mode)) {
    console.error(`Unknown mode: "${mode}"`);
    console.error('');
    console.error('Usage: npx tsx internal_sdk_docs/render_ui_pngs.ts [components|kits]');
    console.error('');
    console.error('  components  Capture individual UI component screenshots');
    console.error('              Requires App_AllComponents in main.tsx');
    console.error('');
    console.error('  kits        Capture starter kit layout screenshots (default)');
    console.error('              Requires App_StarterKitCapture in main.tsx');
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

  if (mode === 'components') {
    await captureComponents(page);
  } else {
    await captureStarterKits(page);
  }

  await browser.close();
  console.log(`\nDone! Images saved to: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
