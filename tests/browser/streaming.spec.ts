import {test,expect} from '@playwright/test';
import {writeFileSync,statSync} from 'node:fs';
const state=(page:any)=>page.evaluate(()=>(window as any).__apex.state());
async function boot(page:any){
  await page.addInitScript(()=>!localStorage.getItem('apex-rush-save-v1')&&localStorage.setItem('apex-rush-save-v1',JSON.stringify({version:1,settings:{quality:'low',adaptiveResolution:false,music:0,engine:0,effects:0}})));
  await page.goto('/');await expect(page.locator('.loading')).toHaveCount(0,{timeout:60000});
}

test('garage loads only its model; optional download failure retries and late selection cannot replace the current car',async({page})=>{
  const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.glb'))requests.push(r.url().split('/').at(-1)!);});
  await page.route('**/solstice-gt.glb',route=>route.abort());await boot(page);
  expect(requests).toEqual(['concept-car.glb']);const initialBytes=statSync('public/assets/concept-car.glb').size;
  await page.getByRole('button',{name:'View SOLSTICE GT'}).click();await expect(page.getByText('This car could not load. Select it again to retry.')).toBeVisible();
  expect((await state(page)).viewedCar).toBe('VANTA GT');expect((await state(page)).selected).toBe('vanta');
  await page.unroute('**/solstice-gt.glb');let release!:()=>void;const held=new Promise<void>(r=>release=r);let requested=false;
  await page.route('**/solstice-gt.glb',async route=>{requested=true;await held;await route.continue();});
  await page.getByRole('button',{name:'View SOLSTICE GT'}).click();await expect.poll(()=>requested).toBe(true);
  await page.getByRole('button',{name:'View VANTA GT'}).click();release();
  await expect.poll(async()=>(await state(page)).vehicleCache.some((e:any)=>e.key==='solstice-gt.glb'&&e.ready)).toBe(true);
  expect((await state(page)).viewedCar).toBe('VANTA GT');await expect(page.locator('.vehicle-status')).toBeHidden();
  await page.getByRole('button',{name:'View SOLSTICE GT'}).click();await expect(page.getByRole('button',{name:'UNLOCK · 2,500'})).toBeVisible();
  await page.getByRole('button',{name:'UNLOCK · 2,500'}).click();expect((await state(page)).selected).toBe('solstice');
  await page.reload();await expect(page.locator('.loading')).toHaveCount(0,{timeout:60000});expect((await state(page)).viewedCar).toBe('SOLSTICE GT');
  expect((await state(page)).vehicleCache.map((e:any)=>e.key)).toEqual(['solstice-gt.glb']);expect(errors).toEqual([]);
  const previousBytes=['concept-car.glb','concept-car-lod.glb','solstice-gt.glb','solstice-gt-lod.glb','bmw-m3.glb','bmw-m3-lod.glb'].reduce((sum,f)=>sum+statSync('public/assets/'+f).size,0);
  writeFileSync('artifacts/streaming-garage.json',JSON.stringify({date:new Date().toISOString(),requests,initialBytes,previousVehicleBytes:previousBytes,reduction:1-initialBytes/previousBytes,failedOptionalRetry:true,lateSelectionIgnored:true,savedSelectionReload:true,errors,passed:true},null,2));
});

test('race streams LODs, cancels an in-flight grid, retries without duplicate downloads and switches detail safely',async({page})=>{
  test.setTimeout(240000);const errors:string[]=[],requests:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.glb'))requests.push(r.url().split('/').at(-1)!);});
  await boot(page);let release!:()=>void,requested=false;const held=new Promise<void>(r=>release=r);
  await page.route('**/bmw-m3-lod.glb',async route=>{requested=true;await held;await route.continue();});
  await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.locator('[data-action="track"][data-value="city"]').click();await page.getByRole('button',{name:'START YOUR ENGINE'}).click();await expect.poll(()=>requested,{timeout:120000}).toBe(true);
  await page.locator('[data-action="cancel-load"]').click();await expect(page.getByRole('button',{name:'START YOUR ENGINE'})).toBeVisible();expect((await state(page)).player).toBeNull();release();
  await page.getByRole('button',{name:'START YOUR ENGINE'}).click();await page.waitForFunction(()=>(window as any).__apex.state().screen==='racing',null,{timeout:120000});
  expect([...requests].sort()).toEqual(['bmw-m3-lod.glb','concept-car-lod.glb','concept-car.glb','solstice-gt-lod.glb'].sort());expect((await state(page)).opponents).toBe(6);
  await page.getByRole('button',{name:'Pause race'}).click();await page.getByRole('button',{name:'SETTINGS',exact:true}).click();
  for(const quality of ['medium','low']){await page.locator('#quality').selectOption(quality);expect((await state(page)).quality).toBe(quality);}
  await page.getByRole('button',{name:'Close settings'}).click();await page.getByRole('button',{name:'QUIT TO GARAGE'}).click();
  const cache=(await state(page)).vehicleCache;expect(cache.filter((e:any)=>e.users===0).length).toBeLessThanOrEqual(2);expect(cache.filter((e:any)=>e.users>0).length).toBe(1);expect(errors).toEqual([]);
  writeFileSync('artifacts/streaming-race.json',JSON.stringify({date:new Date().toISOString(),requests,cache,cancelledPendingDownload:true,detailSwitch:true,errors,passed:true},null,2));
});
