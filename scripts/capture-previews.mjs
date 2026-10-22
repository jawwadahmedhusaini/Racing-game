import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const previews=[];
const report={date:new Date().toISOString(),quality:'high',errors:[],scenes:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
await page.addInitScript(()=>localStorage.setItem('apex-rush-save-v1',JSON.stringify({version:1,settings:{quality:'high',music:0,engine:0,effects:0}})));
await page.goto('http://127.0.0.1:5173');await page.waitForSelector('.loading',{state:'detached',timeout:60000});await page.screenshot({path:'artifacts/garage-final.png'});
for(const track of ['coast','city']){
 await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.locator(`[data-action="track"][data-value="${track}"]`).click();await page.getByRole('button',{name:'START YOUR ENGINE'}).click();await page.evaluate(()=>window.__apex.advance(7,{throttle:1},true));
 if(track==='coast'){
  await page.screenshot({path:'artifacts/coast-start.png'});
  await page.evaluate(()=>{while(window.__apex.state().player.distance<1660)window.__apex.advance(1,{throttle:1},true);});
  await page.keyboard.press('r');await page.evaluate(()=>window.__apex.advance(2.3,{throttle:.4},true));
 }
 await page.getByRole('button',{name:'Pause race'}).click();await page.evaluate(()=>document.querySelector('#modal').style.visibility='hidden');
 await page.evaluate(()=>document.querySelector('#ui').style.visibility='hidden');
 previews.push({track,data:await page.screenshot({type:'jpeg',quality:87})});
 await page.evaluate(()=>document.querySelector('#ui').style.visibility='visible');await page.screenshot({path:`artifacts/${track}-final.png`});
 const state=await page.evaluate(()=>window.__apex.state());report.scenes.push({track,...state});console.log(track,state);
 await page.evaluate(()=>document.querySelector('#modal').style.visibility='visible');await page.getByRole('button',{name:'QUIT TO GARAGE'}).click();
}
await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.screenshot({path:'artifacts/track-selection.png'});await browser.close();
for(const {track,data} of previews)await writeFile(`public/assets/${track}-preview.jpg`,data);
report.passed=report.errors.length===0;await writeFile('artifacts/visual-review.json',JSON.stringify(report,null,2));if(!report.passed)throw new Error(report.errors.join('\n'));
