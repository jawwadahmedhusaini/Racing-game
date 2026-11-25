import {chromium,expect} from '@playwright/test';
import {writeFile,readFile} from 'node:fs/promises';
const report={version:JSON.parse(await readFile('package.json')).version,date:new Date().toISOString(),hardwarePerformanceVerified:false,posedDevelopmentCaptures:true,errors:[],scenes:[],requests:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('.glb'))report.requests.push(r.url().split('/').at(-1));});
 await page.addInitScript(()=>localStorage.setItem('apex-rush-save-v1',JSON.stringify({version:1,selected:'lf-gt',owned:['vanta','lf-gt'],settings:{quality:'high',adaptiveResolution:false,music:0,engine:0,effects:0}})));
 await page.goto('http://127.0.0.1:5173/drive.html');await page.locator('.loading').waitFor({state:'detached',timeout:120000});
 await page.screenshot({path:'artifacts/lf-garage.png'});report.garage=await page.evaluate(()=>window.__apex.state());console.log('LF garage captured',report.garage.carBounds);
 await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.locator('[data-action="track"][data-value="city"]').click();await page.getByRole('button',{name:'START YOUR ENGINE'}).click();
 await page.waitForFunction(()=>window.__apex.state().screen==='racing',null,{timeout:180000});await page.evaluate(()=>window.__apex.advance(5));await page.getByRole('button',{name:'Pause race'}).click();await page.evaluate(()=>document.querySelector('#modal').style.visibility='hidden');
 for(const distance of [0,850,1270,1780]){await page.evaluate(d=>window.__apex.viewAt(d),distance);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:`artifacts/imported-city-${distance}.png`});report.scenes.push({distance,...await page.evaluate(()=>window.__apex.state())});console.log('City captured',distance);}
 report.audit=await page.evaluate(()=>window.__apex.auditRoad());expect(report.audit.violations).toEqual([]);expect(report.scenes[0].importedBuildings).toBeGreaterThan(10);expect(report.errors).toEqual([]);report.passed=true;
}finally{await browser.close();await writeFile('artifacts/imported-art-review.json',JSON.stringify(report,null,2));}
