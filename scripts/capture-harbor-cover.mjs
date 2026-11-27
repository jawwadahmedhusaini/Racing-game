// Run against the development server after preparing the Orion and harbor assets.
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  executablePath:process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({viewport:{width:1600,height:900}});
  await page.addInitScript(() => localStorage.setItem('apex-rush-save-v1',JSON.stringify({
    version:1,owned:['orion-r'],selected:'orion-r',
    settings:{quality:'high',adaptiveResolution:false,engine:0,effects:0,music:0},
  })));
  await page.goto(new URL('drive.html?track=city',process.env.GAME_URL??'http://127.0.0.1:5173/').href);
  await page.locator('.loading').waitFor({state:'detached',timeout:120000});
  await page.getByRole('button',{name:'START YOUR ENGINE'}).click();
  await expect(page.locator('#countdown')).toBeVisible({timeout:180000});
  for (const distance of [360,1108,1157,2620]) {
    const png = await page.evaluate(d=>window.__apex.coverFrame(d,-3.3),distance);
    await writeFile(`artifacts/harbor-cover-${distance}.png`,Buffer.from(png.split(',')[1],'base64'));
  }
} finally {
  await browser.close();
}
