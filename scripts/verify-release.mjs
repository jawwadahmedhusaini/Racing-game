import { chromium, expect } from '@playwright/test';
import { writeFile, readFile } from 'node:fs/promises';

const version=JSON.parse(await readFile('package.json','utf8')).version;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = { date: new Date().toISOString(), production: true, errors: [], layouts: [], failedRequests: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || /PCFSoftShadowMap has been removed/.test(m.text())) report.errors.push(m.text()); });
  page.on('response', response => { if (response.status() >= 400) report.failedRequests.push({ url: response.url(), status: response.status() }); });
  await page.addInitScript(() => localStorage.setItem('apex-rush-save-v1', JSON.stringify({ version: 1, settings: { adaptiveResolution:false, quality: 'low', engine: 0, music: 0, effects: 0 } })));
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000');
  const release = await page.request.get(new URL('version.json',page.url()).href);
  expect(release.status()).toBe(200);expect((await release.json()).version).toBe(version);
  report.version=version;
  await expect(page.locator('.loading')).toHaveCount(0, { timeout: 60000 });
  expect(await page.evaluate(() => '__apex' in window)).toBe(false);
  report.testApiAbsent = true;
  for (const [width, height] of [[1280, 800], [1600, 900], [844, 390], [390, 844]]) {
    await page.setViewportSize({ width, height });
    const layout = await page.evaluate(() => {
      const upgrade = document.querySelector('.upgrade-row').getBoundingClientRect();
      const stats = document.querySelector('.performance').getBoundingClientRect();
      return { width: innerWidth, height: innerHeight, overflow: document.body.scrollWidth > innerWidth, upgradeBottom: upgrade.bottom, statsTop: stats.top };
    });
    report.layouts.push(layout);
    expect(layout.overflow).toBe(false);
    expect(layout.upgradeBottom).toBeLessThan(layout.statsTop);
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole('button',{name:'View SOLSTICE GT'}).click();
  await page.getByRole('button',{name:'UNLOCK · 2,500'}).click();
  report.solsticePurchased=true;
  for(const file of ['assets/bmw-m3.glb','assets/bmw-m3-lod.glb','assets/audio/v8f-9.wav','licenses/audio.json','licenses/bmw-m3.json']){const response=await page.request.get(new URL(file,page.url()).href);expect(response.status()).toBe(200);}
  report.bmwAndAudioAssets=true;
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#quality').selectOption('ultra');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.screenshot({ path: 'artifacts/ultra-garage.png' });
  report.ultraRendered = true;
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#quality').selectOption('low');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.setViewportSize({ width: 960, height: 600 });
  await page.getByRole('button', { name: 'HIT THE ROAD' }).click();
  await page.getByRole('button', { name: 'START YOUR ENGINE' }).click();
  await page.waitForSelector('#countdown',{timeout:90000});
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').innerText()), { timeout: 120000 }).toBeGreaterThan(20);
  report.keyboardAcceleration = true;
  await page.keyboard.down('Shift');
  await expect(page.locator('#nitro-wash')).toHaveClass(/active/, { timeout: 20000 });
  report.nitro = true;
  await page.keyboard.up('Shift');
  await page.keyboard.up('w');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'RESUME RACE' })).toBeVisible();
  report.pause = true;
  await page.getByRole('button', { name: 'RESUME RACE' }).click();
  await expect(page.getByRole('button', { name: 'Pause race' })).toBeVisible();
  report.resume = true;
  await page.keyboard.down('s');
  await expect(page.locator('#gear')).toHaveText('R',{timeout:120000});
  expect(Number(await page.locator('#speed').innerText())).toBeGreaterThanOrEqual(0);
  await page.keyboard.up('s');report.reverse=true;
  await page.screenshot({ path: 'artifacts/production-race.png' });
  expect(report.errors).toEqual([]);
  expect(report.failedRequests).toEqual([]);
  report.passed = true;
} finally {
  await browser.close();
  await writeFile('artifacts/production-smoke.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
