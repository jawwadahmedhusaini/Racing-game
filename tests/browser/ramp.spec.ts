import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';

for(const track of ['coast','city'])test(`${track}: full ramp-edge approach launches, lands and escapes raised-face contact`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('apex-rush-save-v1',JSON.stringify({version:1,settings:{adaptiveResolution:false,quality:'low',music:0,engine:0,effects:0}})));
 await page.goto('/');await expect(page.locator('.loading')).toHaveCount(0,{timeout:60000});
 await page.getByRole('button',{name:'HIT THE ROAD'}).click();
 await page.locator(`[data-action="track"][data-value="${track}"]`).click();
 await page.locator('[data-action="mode"][data-value="time"]').click();
 await page.getByRole('button',{name:'START YOUR ENGINE'}).click();
 await page.waitForFunction(()=>!(window as any).__apex.state().preparing,null,{timeout:90000});
 await page.evaluate(()=>(window as any).__apex.advance(4));
 const bounds=await page.evaluate(()=>(window as any).__apex.rampScenario('edge'));
 await page.keyboard.down('w');
 const climb=await page.evaluate(()=>{(window as any).__apex.advance(.4,null,2.9);return (window as any).__apex.state().player;});
 expect(climb.rampLift).toBeGreaterThan(.5);expect(climb.speed).toBeGreaterThan(30);expect(climb.impactSerial).toBe(0);
 await page.screenshot({path:`artifacts/ramp-${track}-climb.png`});
 const jump=await page.evaluate(()=>{(window as any).__apex.advance(.4,null,2.9);return (window as any).__apex.state().player;});
 expect(jump.distance).toBeGreaterThan(bounds.lip);expect(jump.airborne).toBeGreaterThan(1.5);expect(jump.jumpTotal).toBe(1);
 await page.screenshot({path:`artifacts/ramp-${track}-jump.png`});
 const landed=await page.evaluate(()=>{(window as any).__apex.advance(3,null,2.9);return (window as any).__apex.state().player;});
 await page.keyboard.up('w');expect(landed.airborne).toBe(0);expect(landed.landingSerial).toBe(1);expect(landed.jumpRewardPending).toBe(false);
 const escapes=[];
 for(const reverse of [false,true]){
  await page.evaluate(()=>(window as any).__apex.rampScenario('side'));
  const before=await page.evaluate(()=>(window as any).__apex.state().player.distance),key=reverse?'s':'w';
  await page.keyboard.down(key);const after=await page.evaluate(()=>{(window as any).__apex.advance(1.5,null);return (window as any).__apex.state().player;});await page.keyboard.up(key);
  expect((after.distance-before)*(reverse?-1:1)).toBeGreaterThan(3);escapes.push({reverse,before,after});
 }
 await page.evaluate(()=>(window as any).__apex.rampScenario('back'));
 await page.keyboard.down('s');const stopped=await page.evaluate(()=>{(window as any).__apex.advance(1,null);return (window as any).__apex.state().player;});await page.keyboard.up('s');
 expect(Math.abs(stopped.speed)).toBeLessThan(.1);expect(stopped.distance).toBeGreaterThan(bounds.lip+2.2);
 await page.keyboard.down('w');const away=await page.evaluate(()=>{(window as any).__apex.advance(1.5,null,5.5);return (window as any).__apex.state().player;});await page.keyboard.up('w');
 expect(away.distance).toBeGreaterThan(stopped.distance+10);expect(errors).toEqual([]);
 writeFileSync(`artifacts/ramp-${track}-browser.json`,JSON.stringify({date:new Date().toISOString(),track,bounds,climb,jump,landed,escapes,stopped,away,errors,passed:true},null,2));
});
