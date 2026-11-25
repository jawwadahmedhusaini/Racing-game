// Photograph the actual assembled game cars, including each variant's bodywork.
// Run from the project root with node scripts/render-garage-cards.mjs.
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const studio = `
import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CARS } from '/src/game/content';
import { createCar, loadVehicleAsset } from '/src/game/car';

export async function photograph() {
  const renderer = new T.WebGLRenderer({alpha:true, antialias:true, preserveDrawingBuffer:true});
  renderer.setSize(300,128);
  renderer.setClearColor(0,0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  const scene = new T.Scene(), room = new RoomEnvironment(), studio = new T.PMREMGenerator(renderer);
  const lighting = studio.fromScene(room,.04);
  scene.environment = lighting.texture;
  scene.add(new T.HemisphereLight(0xffffff,0x484956,2));
  const key = new T.DirectionalLight(0xfff1da,2); key.position.set(4,7,2); scene.add(key);
  const camera = new T.PerspectiveCamera(20,300/128,.1,60);
  const pictures = {};
  for (const spec of CARS) {
    await loadVehicleAsset(spec);
    const car = createCar(spec);
    scene.add(car.group);
    const distance = car.dimensions.z * 1.42;
    camera.position.set(-distance*.85,1.68,distance*.52);
    camera.lookAt(0,.55,0);
    renderer.render(scene,camera);
    pictures[spec.id] = renderer.domElement.toDataURL('image/webp',.88).split(',')[1];
    scene.remove(car.group);
    car.dispose();
  }
  lighting.dispose();room.dispose();studio.dispose();renderer.dispose();
  return pictures;
}`;

const path = '/__garage-photos.js';
const server = await createServer({
  server:{host:'127.0.0.1',port:5198},
  plugins:[{name:'garage-photography',resolveId:id=>id===path?id:null,load:id=>id===path?studio:null}],
});
await server.listen();
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage();
  await page.goto(server.resolvedUrls.local[0]);
  const photos = await page.evaluate(async path => (await import(path)).photograph(),path);
  await mkdir('public/assets/garage',{recursive:true});
  for (const [id,encoded] of Object.entries(photos)) await writeFile(`public/assets/garage/${id}.webp`,Buffer.from(encoded,'base64'));
} finally {
  await browser.close();
  await server.close();
}
