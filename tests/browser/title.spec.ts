import { test, expect } from '@playwright/test';

test('title opens without WebGL or race assets and its circuit choice reaches race setup', async ({page}) => {
  const heavy: string[] = [];
  page.on('request', request => {
    if (/\.glb$|\.hdr$|\/surfaces\/|vegetation\.json|\.wav$/.test(request.url())) heavy.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', {name:'Apex Rush', exact:true})).toBeVisible({timeout:5000});
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect.poll(()=>page.locator('.cover-art img').evaluate(image=>(image as HTMLImageElement).naturalWidth)).toBeGreaterThan(1000);
  await page.getByRole('button', {name:'How to play'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', {name:'How to play'})).toBeFocused();
  expect(heavy).toEqual([]);
  await page.getByRole('link', {name:/Neon Harbor/}).click();
  await expect(page.locator('.track-card.city.active')).toBeVisible({timeout:60000});
  expect(heavy.filter(url => /\/surfaces\/|vegetation\.json/.test(url))).toEqual([]);
  await page.goBack();
  await expect(page.getByRole('heading', {name:'Apex Rush', exact:true})).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});
