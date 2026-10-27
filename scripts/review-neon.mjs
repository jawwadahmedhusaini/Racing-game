import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const version=JSON.parse(await readFile('package.json','utf8')).version;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={version,date:new Date().toISOString(),quality:'high',hardwarePerformanceVerified:false,posedDevelopmentCaptures:true,errors:[],scenes:[]};let preview;
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  await page.addInitScript(()=>localStorage.setItem('apex-rush-save-v1',JSON.stringify({version:1,settings:{quality:'high',adaptiveResolution:false,music:0,engine:0,effects:0}})));
  await page.goto(process.env.GAME_URL??'http://127.0.0.1:5173');await page.locator('.loading').waitFor({state:'detached',timeout:90000});
  await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.locator('[data-action="track"][data-value="city"]').click();await page.getByRole('button',{name:'START YOUR ENGINE'}).click();
  await page.waitForFunction(()=>window.__apex.state().screen==='racing',null,{timeout:180000});await page.evaluate(()=>window.__apex.advance(4));
  await page.getByRole('button',{name:'Pause race'}).click();await page.evaluate(()=>document.querySelector('#modal').style.visibility='hidden');
  for(const distance of [0,270,1270,1780,2320]){
    await page.evaluate(d=>window.__apex.viewAt(d),distance);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await page.screenshot({path:`artifacts/neon-${distance}.png`});
    report.scenes.push({distance,...await page.evaluate(()=>window.__apex.state())});console.log('Captured Neon Harbor',distance);
    if(distance===0){await page.evaluate(()=>document.querySelector('#ui').style.visibility='hidden');preview=await page.screenshot({type:'jpeg',quality:87});await page.evaluate(()=>document.querySelector('#ui').style.visibility='visible');}
  }
  report.audit=await page.evaluate(()=>window.__apex.auditRoad());
  if(report.audit.violations.length||report.audit.samples<4000)throw new Error('Road clearance audit failed');
  report.passed=report.errors.length===0;
}finally{await browser.close();}
await writeFile('artifacts/neon-review.json',JSON.stringify(report,null,2));
if(!report.passed)throw new Error(report.errors.join('\n'));
if(preview)await writeFile('public/assets/city-preview.jpg',preview);
console.log(JSON.stringify({version,passed:report.passed,audit:report.audit}));
