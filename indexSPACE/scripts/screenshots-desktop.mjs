import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const UI_URL = process.env.UI_URL || 'http://localhost:3000';
const OUT_DIR = 'screenshots';

mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const shots = [];

  // 1. Desktop dashboard
  await desktop.goto(UI_URL, { waitUntil: 'networkidle' });
  await sleep(1500);
  await desktop.screenshot({ path: `${OUT_DIR}/01-dashboard-desktop.png`, fullPage: true });
  shots.push('01-dashboard-desktop');

  // 2. Portfolio drawer open
  await desktop.click('button:has-text("ACCOUNT")');
  await sleep(1000);
  await desktop.screenshot({ path: `${OUT_DIR}/02-portfolio-drawer.png`, fullPage: true });
  shots.push('02-portfolio-drawer');
  await desktop.keyboard.press('Escape');
  await sleep(500);

  // 3. Vault AI Acceleration
  await desktop.goto(`${UI_URL}/vault/ai-acceleration`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await desktop.screenshot({ path: `${OUT_DIR}/03-vault-ai-acceleration.png`, fullPage: true });
  shots.push('03-vault-ai-acceleration');

  // 4. Vault Crypto Reflexivity
  await desktop.goto(`${UI_URL}/vault/crypto-reflexivity`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await desktop.screenshot({ path: `${OUT_DIR}/04-vault-crypto-reflexivity.png`, fullPage: true });
  shots.push('04-vault-crypto-reflexivity');

  // 5. Internal page
  await desktop.goto(`${UI_URL}/internal`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await desktop.screenshot({ path: `${OUT_DIR}/05-internal-page.png`, fullPage: true });
  shots.push('05-internal-page');

  // 6. 404 page
  await desktop.goto(`${UI_URL}/nonexistent`, { waitUntil: 'networkidle' });
  await sleep(1500);
  await desktop.screenshot({ path: `${OUT_DIR}/06-404-page.png`, fullPage: true });
  shots.push('06-404-page');

  await browser.close();
  console.log('Desktop screenshots:', shots.join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
