import {chromium} from '@playwright/test';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
page.on('pageerror',e=>console.log('ERROR',e.message));
await page.addInitScript(()=>localStorage.setItem('apex-rush-save-v1',JSON.stringify({version:1,settings:{quality:'medium',music:0,engine:0,effects:0}})));
await page.goto('http://127.0.0.1:5173');await page.waitForSelector('.loading',{state:'detached',timeout:60000});await page.screenshot({path:'artifacts/garage-final.png'});
for(const track of ['coast','city']){
 await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.locator(`[data-action="track"][data-value="${track}"]`).click();await page.getByRole('button',{name:'START YOUR ENGINE'}).click();await page.evaluate(()=>window.__apex.advance(7,{throttle:1},true));
 await page.evaluate(()=>document.querySelector('#ui').style.visibility='hidden');
 await page.screenshot({path:`public/assets/${track}-preview.jpg`,type:'jpeg',quality:87});
 await page.evaluate(()=>document.querySelector('#ui').style.visibility='visible');await page.screenshot({path:`artifacts/${track}-final.png`});
 console.log(track,await page.evaluate(()=>window.__apex.state()));
 await page.getByRole('button',{name:'Pause race'}).click();await page.getByRole('button',{name:'QUIT TO GARAGE'}).click();
}
await page.getByRole('button',{name:'HIT THE ROAD'}).click();await page.screenshot({path:'artifacts/track-selection.png'});await browser.close();
