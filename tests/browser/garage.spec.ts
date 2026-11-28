import {openVehicles} from './garage-controls';
import {test,expect} from '@playwright/test';
import {CARS} from '../../src/game/content';

test('preview vehicles are driveable immediately and keep selection without spending credits',async({page})=>{
  test.setTimeout(180_000);
  await page.setViewportSize({width:960,height:600});
  await page.addInitScript(()=>{
    if(!localStorage.getItem('apex-rush-save-v1')){
      localStorage.setItem('apex-rush-save-v1',JSON.stringify({
        version:1,credits:0,owned:['orion-r'],selected:'orion-r',
        settings:{quality:'low',adaptiveResolution:false,music:0,engine:0,effects:0},
      }));
    }
  });
  await page.goto('/drive.html');
  await expect(page.locator('.loading')).toHaveCount(0,{timeout:90000});
  await expect(page.locator('.pit-roster')).toHaveCount(0);
  await openVehicles(page);
  await expect(page.getByText('All cars available')).toBeVisible();
  await expect(page.locator('.pit-car')).toHaveCount(CARS.length);
  for(const [index,car] of CARS.entries()){
    await openVehicles(page);
    const card=page.locator(`.pit-car[data-value="${index}"]`);
    await card.click();
    await expect(page.getByRole('dialog',{name:'Vehicles'})).toHaveCount(0);
    await expect(page.getByRole('heading',{name:`${car.maker} ${car.name}` })).toBeVisible();
    await expect(page.getByRole('button',{name:'RACE',exact:true})).toBeVisible();
  }
  await openVehicles(page);await page.getByRole('button',{name:'View BMW M3 GTR'}).click();
  await expect(page.getByRole('heading',{name:'BMW M3 GTR'})).toBeVisible();
  await page.reload();
  await expect(page.locator('.loading')).toHaveCount(0,{timeout:90000});
  await expect(page.getByRole('heading',{name:'BMW M3 GTR'})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('apex-rush-save-v1')!))).toMatchObject({
    credits:0,owned:['orion-r'],selected:'bmw-m3',
  });
  await page.setViewportSize({width:360,height:800});
  await expect(page.locator('.pit-console')).toBeVisible();
  expect(await page.locator('.pit-garage').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  await page.getByRole('button',{name:'RACE',exact:true}).click();
  await expect(page.locator('.selected-car-label')).toContainText('M3 GTR');
});

test('Cavallo is available at zero credits and uses its dedicated race model',async({page})=>{
  await page.setViewportSize({width:760,height:460});
  await page.addInitScript(()=>localStorage.setItem('apex-rush-save-v1',JSON.stringify({
    version:1,credits:0,owned:['orion-r'],selected:'orion-r',
    settings:{quality:'low',adaptiveResolution:false,music:0,engine:0,effects:0},
  })));
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/drive.html');
  await expect(page.locator('.loading')).toHaveCount(0,{timeout:90000});
  await openVehicles(page);await page.getByRole('button',{name:'View 575 GTC'}).click();
  await expect(page.getByRole('heading',{name:'CAVALLO 575 GTC'})).toBeVisible();
  await page.getByRole('button',{name:'RACE',exact:true}).click();
  await page.locator('[data-action="mode"][data-value="time"]').click();
  const raceModel=page.waitForResponse(response=>response.url().endsWith('/cavallo-575-lod.glb'));
  await page.getByRole('button',{name:'START YOUR ENGINE'}).click();
  expect((await raceModel).ok()).toBe(true);
  await expect(page.locator('#countdown')).toBeVisible({timeout:90000});
  const driver=await page.evaluate(()=>{
    const game=(window as any).__apex;
    game.useManualClock();
    game.advance(5,{throttle:1},true);
    return game.state().player;
  });
  expect(driver.spec).toBe('cavallo-575');
  expect(driver.speed).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});
