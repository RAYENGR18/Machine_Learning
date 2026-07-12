// Predictina UI test + screenshot harness (Playwright)
// Run from: predictina/  (node_modules/playwright lives here)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const URL = process.env.APP_URL || 'http://127.0.0.1:5173/';
const OUT = '/tmp/predictina_shots';
mkdirSync(OUT, { recursive: true });

const results = [];
const log = (k, v = '') => { results.push(`${k}${v ? ': ' + v : ''}`); console.log(k, v); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });

// ─────────────────────────── DESKTOP ───────────────────────────
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

await page.setViewportSize({ width: 1280, height: 900 });
await page.goto(URL, { waitUntil: 'networkidle' });

// Wait for API status to settle (status now shown in header badge)
await page.waitForFunction(
  () => /live|offline/i.test(document.querySelector('header')?.textContent || ''),
  { timeout: 8000 }
).catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/01_desktop_initial.png`, fullPage: true });
log('✅ desktop initial loaded');

// Test: header badge (now reads "Model live" when API is online)
const headerText = (await page.textContent('header'))?.trim();
log('header text', headerText);
log('ASSERT api live', /live/i.test(headerText || '') ? 'PASS' : 'FAIL');

// Test: Estimate button present & disabled-enabling
const btn = page.locator('.predict-btn');
log('ASSERT predict button count', await btn.count() === 1 ? 'PASS' : 'FAIL');

// Fill a rich form
await page.selectOption('select >> nth=0', 'Tunis');              // city
await page.fill('input[placeholder*="Lac"]', 'La Marsa');          // location
await page.selectOption('select >> nth=1', 'villa');               // type
await page.fill('input[type=number] >> nth=0', '190');             // surface
await page.fill('input[type=number] >> nth=1', '5');               // rooms
await page.fill('input[type=number] >> nth=2', '2');               // bathrooms
await page.fill('input[type=number] >> nth=3', '1');               // floor
await page.fill('input[type=number] >> nth=4', '2');               // total floors
await page.fill('input[type=number] >> nth=5', '2015');            // year
// Amenities are now toggle chips (buttons with aria-pressed)
await page.getByRole('button', { name: 'Parking', exact: true }).click(); // parking
await page.getByRole('button', { name: 'Garden', exact: true }).click();  // garden
await page.screenshot({ path: `${OUT}/02_desktop_form_filled.png`, fullPage: true });
log('✅ form filled screenshot');

// Submit
await btn.click();
// Loading state
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/03_desktop_loading.png`, fullPage: true }).catch(() => {});

// Wait for result price
const priceAppeared = await page.waitForFunction(
  () => !!document.querySelector('.price-value')?.textContent?.trim(),
  { timeout: 15000 }
).then(() => true).catch(() => false);
log('ASSERT prediction rendered', priceAppeared ? 'PASS' : 'FAIL');

// Wait for city comparison bars
const barsAppeared = await page.waitForFunction(
  () => document.querySelectorAll('.compare-row').length >= 10,
  { timeout: 15000 }
).then(() => true).catch(() => false);
const barCount = await page.locator('.compare-row').count();
log('ASSERT city bars rendered', barsAppeared ? `PASS (${barCount})` : `FAIL (${barCount})`);

await page.waitForTimeout(1200); // let bar width transition finish
await page.screenshot({ path: `${OUT}/04_desktop_result.png`, fullPage: true });

const priceText = (await page.textContent('.price-value'))?.trim();
log('Predicted price', priceText);

// Tag assertions
const providedTags = await page.locator('.tag.provided').count();
const defaultTags = await page.locator('.tag.default').count();
log('provided/default tag counts', `${providedTags} / ${defaultTags}`);
log('ASSERT provided tags > 0', providedTags > 0 ? 'PASS' : 'FAIL');

// ─────────────────────────── MOBILE ───────────────────────────
const mpage = await ctx.newPage();
await mpage.setViewportSize({ width: 390, height: 844 });
await mpage.goto(URL, { waitUntil: 'networkidle' });
await mpage.waitForFunction(
  () => /live|offline/i.test(document.querySelector('header')?.textContent || ''),
  { timeout: 8000 }
).catch(() => {});
await mpage.waitForTimeout(400);
await mpage.screenshot({ path: `${OUT}/05_mobile_initial.png`, fullPage: true });

// fill + submit on mobile (single column)
await mpage.selectOption('select >> nth=0', 'Sousse');
await mpage.selectOption('select >> nth=1', 'apartment');
await mpage.fill('input[type=number] >> nth=0', '95');
await mpage.fill('input[type=number] >> nth=1', '3');
await mpage.locator('.predict-btn').click();
await mpage.waitForFunction(
  () => !!document.querySelector('.price-value')?.textContent?.trim(),
  { timeout: 15000 }
).catch(() => {});
await mpage.waitForFunction(
  () => document.querySelectorAll('.compare-row').length >= 10,
  { timeout: 15000 }
).catch(() => {});
await mpage.waitForTimeout(1200);
await mpage.screenshot({ path: `${OUT}/06_mobile_result.png`, fullPage: true });
log('✅ mobile result screenshot');

log('Console errors', consoleErrors.length ? JSON.stringify(consoleErrors.slice(0,5)) : 'none');

await browser.close();
console.log('\n===== SUMMARY =====\n' + results.join('\n'));
