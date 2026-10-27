import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});

for(const track of ['coast','city'])test(`${track}: touch wall impacts rotate the car, steering/reverse escape and lateral speed stay usable`,async({page,context})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('apex-rush-save-v1',JSON.stringify({version:1,settings:{adaptiveResolution:false,quality:'low',music:0,engine:0,effects:0}})));
 await page.goto('/');await expect(page.locator('.loading')).toHaveCount(0,{timeout:60000});
 await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.locator(`[data-action="track"][data-value="${track}"]`).click();await page.locator('[data-action="mode"][data-value="time"]').click();await page.getByRole('button',{name:'START YOUR ENGINE'}).click();
 await page.waitForFunction(()=>!(window as any).__apex.state().preparing,null,{timeout:90000});await page.evaluate(()=>(window as any).__apex.advance(4));
 const cdp=await context.newCDPSession(page);
 const press=async(names:string[])=>{const points=[];for(const [id,name] of names.entries()){const b=(await page.getByRole('button',{name,exact:true}).boundingBox())!;points.push({id:id+1,x:b.x+b.width/2,y:b.y+b.height/2});}await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});};
 const release=()=>cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const cases=[];
 for(const side of [-1,1]){
  const before=await page.evaluate(side=>{const a=(window as any).__apex;a.wallScenario(side,'glance');return {player:a.state().player,yaw:a.pose().worldYaw};},side);
  await press(['Accelerate']);
  const hit=await page.evaluate(()=>{const a=(window as any).__apex;a.advance(.8,null);return {player:a.state().player,yaw:a.pose().worldYaw};});await release();
  const turn=Math.atan2(Math.sin(hit.yaw-before.yaw),Math.cos(hit.yaw-before.yaw));
  expect(turn*side).toBeGreaterThan(.15);expect(hit.player.impactSerial).toBeGreaterThan(0);expect(hit.player.speed).toBeGreaterThan(8);
  await page.screenshot({path:`artifacts/wall-${track}-${side<0?'left':'right'}.png`});
  await press(['Accelerate',side<0?'Steer right':'Steer left']);
  const away=await page.evaluate(()=>{const a=(window as any).__apex;a.advance(.4,null);return a.state().player;});await release();
  expect(away.lateral*side).toBeLessThan(before.player.lateral*side-.5);cases.push({side,before,hit,away});
 }
 await page.evaluate(()=>(window as any).__apex.wallScenario(1,'head-on'));await press(['Accelerate']);
 const stopped=await page.evaluate(()=>{const a=(window as any).__apex;a.advance(.6,null);return a.state().player;});await release();expect(Math.hypot(stopped.speed,stopped.sideSpeed)).toBeLessThan(1);
 await press(['Brake and reverse']);const reversed=await page.evaluate(()=>{const a=(window as any).__apex;a.advance(1.6,null);return a.state().player;});await release();
 expect(reversed.lateral).toBeLessThan(stopped.lateral-3);expect(reversed.speed).toBeLessThan(-4);
 const slide=await page.evaluate(()=>{const a=(window as any).__apex;a.wallScenario(1,'slide');return {player:a.state().player,hud:Number(document.getElementById('speed')!.textContent)};});
 expect(slide.player.speed).toBe(0);expect(slide.player.sideSpeed).toBe(10);expect(slide.hud).toBe(36);expect(errors).toEqual([]);
 writeFileSync(`artifacts/wall-${track}-browser.json`,JSON.stringify({date:new Date().toISOString(),track,cases,stopped,reversed,slide,errors,passed:true},null,2));
});
