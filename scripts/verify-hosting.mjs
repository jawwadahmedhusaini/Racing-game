import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const url = process.env.GAME_URL || 'http://127.0.0.1:8010/Racing-game/';
const report = { date: new Date().toISOString(), url, errors: [], failedRequests: [], assetPaths: [] };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('response', response => {
    if (response.status() >= 400) report.failedRequests.push({ url: response.url(), status: response.status() });
    const parsed = new URL(response.url());
    if (parsed.pathname.includes('/assets/')) report.assetPaths.push(parsed.pathname);
  });
  await page.addInitScript(() => localStorage.setItem('apex-rush-save-v1', JSON.stringify({ version: 1, settings: { adaptiveResolution:false, quality: 'low', engine: 0, music: 0, effects: 0 } })));
  await page.goto(url);
  const release = await page.request.get(new URL('version.json',url).href);
  expect(release.status()).toBe(200);expect((await release.json()).version).toBe('2.4.0');
  report.version='2.4.0';
  await expect(page.locator('.loading')).toHaveCount(0, { timeout: 60000 });
  expect(await page.evaluate(() => '__apex' in window)).toBe(false);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'ASSET CREDITS & LICENSES' }).click();
  const license = await page.getByRole('link', { name: 'CC BY 4.0', exact: true }).getAttribute('href');
  expect(license).toBe('/Racing-game/licenses/CC-BY-4.0.txt');
  const licenseResponse = await page.request.get(new URL(license, url).href);
  expect(licenseResponse.status()).toBe(200);
  expect(await licenseResponse.text()).toContain('Creative Commons');
  report.licenseLink = license;
  await page.getByRole('button', { name: 'Close credits' }).click();
  await page.getByRole('button', { name: 'HIT THE ROAD' }).click();
  await page.locator('[data-action="track"][data-value="city"]').click();
  await page.getByRole('button', { name: 'START YOUR ENGINE' }).click();
  await page.waitForSelector('#countdown',{timeout:90000});
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').innerText()), { timeout: 120000 }).toBeGreaterThan(20);
  await page.keyboard.up('w');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'RESUME RACE' })).toBeVisible();
  report.keyboardAcceleration = true;
  report.pause = true;
  expect(report.assetPaths.some(path => path.endsWith('/concept-car.glb'))).toBe(true);
  expect(report.assetPaths.some(path => path.endsWith('/concept-car-lod.glb'))).toBe(true);
  for(const model of ['solstice-gt.glb','solstice-gt-lod.glb'])expect(report.assetPaths.some(path=>path.endsWith('/'+model))).toBe(true);
  const solstice=await page.request.get(new URL('licenses/solstice.json',url).href);expect(solstice.status()).toBe(200);expect((await solstice.json()).license).toBe('CC0-1.0');
  expect(report.assetPaths.some(path => path.endsWith('/venice_sunset_1k.hdr'))).toBe(true);
  expect(report.assetPaths.some(path => path.endsWith('/vegetation.json'))).toBe(true);
  for (const surface of ['ground-color.png','ground-normal.png','ground-rough.png','grass-color.png','water-normal.png','foliage-color.png','foliage-normal.png','bark-color.jpg','bark-normal.png']) {
    expect(report.assetPaths.some(path => path.endsWith(`/surfaces/${surface}`))).toBe(true);
  }
  for (const asset of ['coast-preview.jpg', 'city-preview.jpg']) {
    expect(report.assetPaths.some(path => path.endsWith(`/${asset}`))).toBe(true);
  }
  expect(report.assetPaths.every(path => path.startsWith('/Racing-game/assets/'))).toBe(true);
  expect(report.failedRequests).toEqual([]);
  expect(report.errors).toEqual([]);
  report.passed = true;
} finally {
  await browser.close();
  await writeFile('artifacts/hosting-smoke.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
