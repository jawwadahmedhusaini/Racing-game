import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const version=JSON.parse(await readFile('package.json','utf8')).version;
const results = { version,date: new Date().toISOString(), browser: browser.version(), viewport: '1280x800', samples: [], errors: [] };
try {
  for (const quality of ['low', 'medium']) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => results.errors.push(error.message));
    page.on('console', message => { if(message.type()==='error')results.errors.push(message.text()); });
    await page.addInitScript(quality => localStorage.setItem('apex-rush-save-v1', JSON.stringify({ version: 1, settings: { adaptiveResolution:false, quality, music: 0, engine: 0, effects: 0 } })), quality);
    await page.goto('http://127.0.0.1:5173');
    await page.waitForSelector('.loading', { state: 'detached', timeout: 60000 });
    const gpu = await page.evaluate(() => {
      const gl = document.querySelector('canvas').getContext('webgl2');
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    });
    results.gpu = gpu;
    for (const scene of ['garage', 'coast']) {
      if (scene === 'coast') {
        await page.getByRole('button', { name: 'HIT THE ROAD' }).click();
        await page.getByRole('button', { name: 'START YOUR ENGINE' }).click();
        await page.waitForSelector('#countdown',{timeout:90000});
        await page.evaluate(() => window.__apex.advance(7, { throttle: 1 }, true));
        await page.keyboard.down('w');
      }
      const sample = await page.evaluate(async () => {
        // Warm shaders before collecting real requestAnimationFrame wall times.
        for (let i = 0; i < 5; i++) await new Promise(requestAnimationFrame);
        const times = [], stats = [];
        for (let i = 0; i < 25; i++) {
          times.push(await new Promise(requestAnimationFrame));
          const { drawCalls, triangles, geometries } = window.__apex.state();
          stats.push({ drawCalls, triangles, geometries });
        }
        const deltas = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
        const average = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        return { frames: deltas.length, wallTimeMs: times.at(-1) - times[0], fps: Number((1000 / average).toFixed(2)), medianFrameMs: Number(deltas[Math.floor(deltas.length / 2)].toFixed(1)), p95FrameMs: Number(deltas[Math.floor(deltas.length * .95)].toFixed(1)), lastFrame: stats.at(-1) };
      });
      results.samples.push({ quality, scene, ...sample });
      console.log(JSON.stringify(results.samples.at(-1)));
    }
    await page.close();
  }
} finally {
  await browser.close();
  results.passed=results.samples.length===4&&results.errors.length===0;
  await writeFile('artifacts/performance.json', JSON.stringify(results, null, 2));
}
if (!results.passed) throw new Error(results.errors.join('\n')||'Incomplete performance run');
