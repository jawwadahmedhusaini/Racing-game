import {expect, test} from '@playwright/test';

test('a new player can enter, finish and revisit the featured race',async({page})=>{
  test.setTimeout(300_000);
  await page.addInitScript(() => {
    // Use the same state as a fresh profile, with a smaller software-rendering budget.
    if(!localStorage.getItem('apex-rush-save-v1')) localStorage.setItem('apex-rush-save-v1', JSON.stringify({
      version:1, selected:'orion-r', owned:['orion-r'],
      settings:{quality:'low',adaptiveResolution:false,music:0,effects:0,engine:0},
    }));
  });
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await page.getByRole('link',{name:'Race Neon Harbor'}).click();
  await expect(page.locator('.track-card.city.active')).toBeVisible();
  await page.getByRole('button',{name:'START YOUR ENGINE'}).click();
  await expect(page.getByRole('region',{name:'Preparing race'})).toBeVisible();
  await expect(page.getByRole('img',{name:'Circuit map'})).toBeVisible();
  await expect(page.locator('#countdown')).toBeVisible({timeout:120000});
  const grid=await page.evaluate(()=>(window as any).__apex.state());
  expect(grid.player.spec).toBe('orion-r');
  expect(grid.opponents).toBe(6);
  const audit=await page.evaluate(()=>(window as any).__apex.auditRoad());
  expect(audit.violations).toEqual([]);
  expect(audit.kinds['underpass-pier']).toBeGreaterThan(14);
  expect(audit.kinds['freight-chicane-stack']).toBeGreaterThan(8);
  expect(audit.kinds['breakwater-pier']).toBe(4);
  expect(audit.minUnderpassClearance).toBeGreaterThan(9.8);
  await page.evaluate(()=>{
    const game=(window as any).__apex;
    game.useManualClock();game.advance(185,{nitro:true},'race');
  });
  await expect(page.getByRole('heading',{name:'FINAL STANDINGS'})).toBeVisible();
  await expect(page.getByText('BEST LAP',{exact:true})).toBeVisible();
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('apex-rush-save-v1')!));
  expect(save.bestTimes['city-v8-quick']).toBeGreaterThan(0);
  await page.getByRole('button',{name:'RACE AGAIN'}).click();
  await expect(page.locator('#countdown')).toBeVisible({timeout:120000});
  await page.goto('/');
  await page.getByRole('link',{name:'Continue'}).click();
  await expect(page.locator('.track-card.city.active')).toBeVisible();
  expect(errors).toEqual([]);
});
