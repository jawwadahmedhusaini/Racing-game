import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests/browser',timeout:180_000,expect:{timeout:20_000},fullyParallel:false,workers:1,retries:0,
  use:{baseURL:'http://127.0.0.1:5173',viewport:{width:1280,height:800},screenshot:'only-on-failure',trace:'off',launchOptions:{executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']}},
  webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI,timeout:60_000},reporter:[['list'],['json',{outputFile:'artifacts/browser-results.json'}]],
});
