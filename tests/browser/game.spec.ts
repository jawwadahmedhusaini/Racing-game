import {test,expect,type Page} from '@playwright/test';
const state=(page:Page)=>page.evaluate(()=>(window as any).__apex.state());
const advance=(page:Page,seconds:number,input:Record<string,number|boolean>={},center=false)=>page.evaluate(({seconds,input,center})=>(window as any).__apex.advance(seconds,input,center),{seconds,input,center});
async function boot(page:Page){
  await page.addInitScript(()=>{if(!localStorage.getItem('apex-rush-save-v1'))localStorage.setItem('apex-rush-save-v1',JSON.stringify({version:1,settings:{quality:'low',difficulty:'rookie',music:0,engine:0,effects:0}}));});
  await page.goto('/');await expect(page.getByRole('button',{name:'HIT THE ROAD'})).toBeVisible();await expect(page.locator('.loading')).toHaveCount(0,{timeout:60000});
}
async function start(page:Page){await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.getByRole('button',{name:'START YOUR ENGINE'}).click();await expect(page.locator('#countdown')).toBeVisible();}
const pose=(page:Page)=>page.evaluate(()=>(window as any).__apex.pose());
function assertDirection(before:any,after:any,direction:number){
  const across=after.position.reduce((sum:number,x:number,i:number)=>sum+(x-before.position[i])*before.cameraRight[i],0);
  const yaw=Math.atan2(Math.sin(after.worldYaw-before.worldYaw),Math.cos(after.worldYaw-before.worldYaw));
  expect(across*direction).toBeGreaterThan(.2);
  expect(yaw*direction).toBeLessThan(-.1);
  expect(after.frontWheelYaw*direction).toBeLessThan(0);
}

test('WASD and arrow steering turn toward the correct side of the actual chase camera; forward cannot auto-turn',async({page})=>{
  await boot(page);await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.locator('[data-action="mode"][data-value="time"]').click();await page.getByRole('button',{name:'START YOUR ENGINE'}).click();await advance(page,7,{throttle:1},true);
  for(const [key,direction] of [['a',-1],['d',1],['ArrowLeft',-1],['ArrowRight',1]] as const){
    await page.keyboard.press('r');await advance(page,0);const before=await pose(page);
    await page.keyboard.down('w');await page.keyboard.down(key);await page.evaluate(()=>(window as any).__apex.advance(.65,null));const after=await pose(page);await page.keyboard.up(key);await page.keyboard.up('w');
    assertDirection(before,after,direction);
  }
  await page.keyboard.press('r');await advance(page,0);const before=await pose(page);
  await page.keyboard.down('w');await page.evaluate(()=>(window as any).__apex.advance(1.2,null));await page.keyboard.up('w');const after=await pose(page);
  expect(Math.abs(Math.atan2(Math.sin(after.worldYaw-before.worldYaw),Math.cos(after.worldYaw-before.worldYaw)))).toBeLessThan(.001);
  expect(Math.abs(after.roadYaw-before.roadYaw)).toBeGreaterThan(.02);
});

test('real keyboard controls, pause, boost, complete race, rewards and replay',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await boot(page);await page.getByRole('button',{name:'Paint blue'}).click();await start(page);await advance(page,4);
  await page.keyboard.down('w');await expect.poll(async()=>(await state(page)).player.speed).toBeGreaterThan(3);await page.keyboard.up('w');
  await advance(page,4,{throttle:1},true);await page.keyboard.down('d');expect((await state(page)).input.steer).toBe(1);await page.evaluate(()=>(window as any).__apex.advance(.1,null));expect((await state(page)).player.steer).toBe(1);await page.keyboard.up('d');
  await page.keyboard.press('Escape');await expect(page.getByText('PAUSED.',{exact:true})).toBeVisible();const before=(await state(page)).elapsed;await advance(page,5,{throttle:1});expect((await state(page)).elapsed).toBe(before);
  await page.evaluate(async()=>{for(let i=0;i<12;i++)await new Promise(requestAnimationFrame);});
  const pausedPose=await pose(page);expect(pausedPose.cameraDistance).toBeGreaterThan(6);expect(pausedPose.cameraDistance).toBeLessThan(12);
  await page.getByRole('button',{name:'RESUME RACE'}).click();
  await advance(page,.2,{throttle:1,nitro:true},true);expect((await state(page)).player.boost).toBeGreaterThan(0);await page.screenshot({path:'artifacts/boost.png'});
  await page.keyboard.press('r');expect(Math.abs((await state(page)).player.lateral)).toBeLessThan(.5);
  await advance(page,120,{throttle:1,nitro:true},true);await expect(page.getByText('FINAL STANDINGS')).toBeVisible();expect((await state(page)).status).toBe('finished');expect((await state(page)).credits).toBeGreaterThan(2500);await page.screenshot({path:'artifacts/results.png'});
  const credits=(await state(page)).credits;await advance(page,10,{throttle:1},true);expect((await state(page)).credits).toBe(credits);
  await page.getByRole('button',{name:'RACE AGAIN'}).click();expect((await state(page)).status).toBe('countdown');expect((await state(page)).player.speed).toBe(0);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'QUIT TO GARAGE'}).click();await page.reload();await expect(page.getByRole('button',{name:'Paint blue'})).toHaveAttribute('aria-pressed','true');expect((await state(page)).credits).toBe(credits);expect(errors).toEqual([]);
});

test('career unlock, purchase, exact car selection, upgrades and persistent settings',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);
  await page.getByRole('button',{name:'CAREER',exact:true}).click();await expect(page.locator('[data-action="event"][data-value="1"]')).toBeDisabled();await page.locator('[data-action="event"][data-value="0"]').click();await advance(page,130,{throttle:1,nitro:true},true);await expect(page.getByText('FINAL STANDINGS')).toBeVisible();
  await page.getByRole('button',{name:'BACK TO GARAGE'}).click();await page.getByRole('button',{name:'View SPECTRE S'}).click();await page.getByRole('button',{name:'UNLOCK · 6,000'}).click();expect((await state(page)).selected).toBe('spectre');
  await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.locator('[data-action="track"][data-value="city"]').click();await page.locator('[data-action="mode"][data-value="time"]').click();await page.getByRole('button',{name:'START YOUR ENGINE'}).click();expect((await state(page)).player.spec).toBe('spectre');await advance(page,90,{throttle:1,nitro:true},true);await expect(page.getByText('FINAL STANDINGS')).toBeVisible();await page.getByRole('button',{name:'RACE AGAIN'}).click();await advance(page,90,{throttle:1,nitro:true},true);await page.getByRole('button',{name:'BACK TO GARAGE'}).click();await page.getByRole('button',{name:'UPGRADE · 1,800'}).click();await expect(page.getByText('STAGE 1 / 3')).toBeVisible();
  await page.getByRole('button',{name:'CAREER',exact:true}).click();await expect(page.locator('[data-action="event"][data-value="1"]')).toBeEnabled();await page.getByRole('button',{name:'GARAGE',exact:true}).click();
  await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#difficulty').selectOption('pro');await page.locator('#autoAccelerate').check();await page.getByRole('button',{name:'Close settings'}).click();await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();await expect(page.locator('#difficulty')).toHaveValue('pro');await expect(page.locator('#autoAccelerate')).toBeChecked();expect(errors).toEqual([]);
});

test('city elimination completes and camera stays operational across camera modes',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.locator('[data-action="track"][data-value="city"]').click();await page.locator('[data-action="mode"][data-value="elimination"]').click();await page.getByRole('button',{name:'START YOUR ENGINE'}).click();
  await advance(page,8,{throttle:1},true);await page.keyboard.press('c');await page.keyboard.press('c');await page.keyboard.press('c');await page.screenshot({path:'artifacts/city-verified.png'});await advance(page,100);await expect(page.getByText('FINAL STANDINGS')).toBeVisible();expect((await state(page)).player.eliminated).toBe(true);expect(errors).toEqual([]);
});

test('mobile layout and touch input work without overflowing the viewport',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);expect(await page.evaluate(()=>document.body.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'artifacts/mobile-garage.png'});
  await start(page);await advance(page,4);await expect(page.getByRole('button',{name:'Accelerate',exact:true})).toBeVisible();
  const box=(await page.getByRole('button',{name:'Accelerate',exact:true}).boundingBox())!;const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await expect.poll(async()=>(await state(page)).player.speed).toBeGreaterThan(0);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  // Independent fingers may share one action; releasing one must not release the other.
  const ax=box.x+box.width/2,ay=box.y+box.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:ax-6,y:ay,id:1},{x:ax+6,y:ay,id:2}]});
  expect((await state(page)).input.throttle).toBe(1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:ax+6,y:ay,id:2}]});expect((await state(page)).input.throttle).toBe(1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect((await state(page)).input.throttle).toBe(0);
  await advance(page,3,{throttle:1},true);
  for(const [name,direction] of [['Steer left',-1],['Steer right',1]] as const){
    await page.keyboard.press('r');await advance(page,0);const before=await pose(page),control=(await page.getByRole('button',{name,exact:true}).boundingBox())!;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:control.x+control.width/2,y:control.y+control.height/2}]});await page.evaluate(()=>(window as any).__apex.advance(.65,null));const after=await pose(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assertDirection(before,after,direction);
    expect((await state(page)).input.steer).toBe(0);
  }
  await page.getByRole('button',{name:'Recover car',exact:true}).tap();expect(Math.abs((await state(page)).player.lateral)).toBeLessThan(.1);
  await page.screenshot({path:'artifacts/mobile-race.png'});await page.getByRole('button',{name:'Pause race'}).tap();await expect(page.getByRole('button',{name:'RESUME RACE'})).toBeVisible();expect(errors).toEqual([]);await context.close();
});

test('brake overrides auto acceleration, pause locks recovery, and quality changes preserve the race',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await boot(page);await page.getByRole('button',{name:'Settings',exact:true}).click();await page.locator('#autoAccelerate').check();await page.getByRole('button',{name:'Close settings'}).click();
  await start(page);await advance(page,7,{throttle:1},true);await page.keyboard.down('s');await page.keyboard.down('Shift');
  expect((await state(page)).input).toMatchObject({throttle:0,brake:1,nitro:false});const speed=(await state(page)).player.speed;
  await page.evaluate(()=>(window as any).__apex.advance(.5,null));expect((await state(page)).player.speed).toBeLessThan(speed-12);await page.keyboard.up('s');await page.keyboard.up('Shift');
  await advance(page,.2,{throttle:1,steer:1});await page.keyboard.press('Escape');const paused=await state(page);
  await page.keyboard.press('r');await page.keyboard.press('c');expect((await state(page)).player).toEqual(paused.player);
  await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.locator('#quality').selectOption('medium');
  expect((await state(page)).player).toEqual(paused.player);expect((await state(page)).quality).toBe('medium');
  await page.keyboard.press('Escape');await expect(page.getByText('PAUSED.',{exact:true})).toBeVisible();expect((await state(page)).paused).toBe(true);
  await page.keyboard.press('Escape');expect((await state(page)).paused).toBe(false);await page.keyboard.press('r');expect((await state(page)).player.heading).toBeCloseTo(0,1);
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.locator('#quality').selectOption('low');expect((await state(page)).quality).toBe('low');expect(errors).toEqual([]);
});
