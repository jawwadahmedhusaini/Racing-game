import {chromium,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={version:JSON.parse(await readFile('package.json','utf8')).version,date:new Date().toISOString(),browser:browser.version(),renderer:'ANGLE/SwiftShader software WebGL 2',viewport:'1100x720',quality:'low',runs:[],errors:[],failedRequests:[]};
try{
 const page=await browser.newPage({viewport:{width:1100,height:720}});page.setDefaultTimeout(90000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.failedRequests.push({url:r.url(),status:r.status()});});
 await page.addInitScript(()=>localStorage.setItem('apex-rush-save-v1',JSON.stringify({version:1,settings:{quality:'low',adaptiveResolution:false,music:0,engine:0,effects:0}})));
 await page.goto('http://127.0.0.1:5173');await page.waitForSelector('.loading',{state:'detached'});
 for(const [i,track] of ['coast','coast','city'].entries()){
  await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.locator(`[data-action="track"][data-value="${track}"]`).click();
  const immediate=await page.evaluate(()=>{const start=performance.now();document.querySelector('[data-action="start"]').click();return {clickMs:performance.now()-start,screen:window.__apex.state().screen};});
  expect(immediate.screen).toBe('preparing');expect(immediate.clickMs).toBeLessThan(250);
  if(i===0){await page.keyboard.down('w');await page.screenshot({path:'artifacts/race-loading.png'});}
  await page.waitForFunction(()=>window.__apex.state().screen==='racing'&&!window.__apex.state().preparing);
  const state=await page.evaluate(()=>window.__apex.state()),audit=await page.evaluate(()=>window.__apex.auditRoad());expect(audit.violations).toEqual([]);
  if(i===0){expect(state.input.throttle).toBe(1);expect(state.status).toBe('countdown');await page.keyboard.up('w');report.heldThrottleDuringLoading=true;}
  report.runs.push({track,cached:i===1,...immediate,preparation:state.loadMetrics,audit});
  await page.screenshot({path:`artifacts/${track}-grid.png`});
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'QUIT TO GARAGE'}).click();
 }
 await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.locator('[data-action="track"][data-value="coast"]').click();await page.locator('[data-action="mode"][data-value="time"]').click();await page.getByRole('button',{name:'START YOUR ENGINE'}).click();await page.waitForSelector('#countdown');await page.evaluate(()=>window.__apex.advance(4));
 await page.keyboard.down('s');await page.evaluate(()=>window.__apex.advance(2,null));await expect(page.locator('#gear')).toHaveText('R');await page.screenshot({path:'artifacts/reverse-driving.png'});await page.keyboard.up('s');
 expect(report.errors).toEqual([]);expect(report.failedRequests).toEqual([]);report.passed=true;
}finally{await browser.close();await writeFile('artifacts/startup-review.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
