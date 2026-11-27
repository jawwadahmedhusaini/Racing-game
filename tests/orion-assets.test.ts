import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CARS, STARTER_CAR_ID } from '../src/game/content';
import { vehicleAssetKey } from '../src/game/car';

const spec = CARS.find(car => car.id === STARTER_CAR_ID)!;
const metadata = JSON.parse(readFileSync('public/licenses/orion-r.json', 'utf8'));

for (const asset of metadata.assets) it(`${asset.file} has bounded chassis geometry, grounded tires and independent calipers`, async () => {
  const racing = asset.file.endsWith('-lod.glb');
  expect(asset.file).toBe('assets/' + vehicleAssetKey(spec, racing));
  const bytes = readFileSync(`public/${asset.file}`);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
  expect(bytes.length).toBeLessThan(racing ? 1_100_000 : 2_100_000);
  const model = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  model.scene.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(model.scene);
  expect(Math.max(-bounds.min.x, bounds.max.x)).toBeLessThan(spec.collision!.halfWidth);
  expect(Math.max(-bounds.min.z, bounds.max.z)).toBeLessThan(spec.collision!.halfLength);
  expect(bounds.min.y).toBeCloseTo(0, 2);
  expect(bounds.max.y).toBeGreaterThan(1.32);
  for (const axle of ['Front', 'Rear']) for (const side of ['L', 'R']) {
    const wheel = model.scene.getObjectByName(`Wheel${axle}${side}`)!;
    const position = wheel.getWorldPosition(new Vector3());
    expect(position.y).toBeCloseTo(spec.suspension!.wheelRadius);
    expect(position.x * (side === 'L' ? -1 : 1)).toBeCloseTo(.931);
    expect(position.z * (axle === 'Front' ? 1 : -1)).toBeGreaterThan(1.4);
    expect(wheel.children.some(child => child.name.includes('BrakePad'))).toBe(true);
  }
  for (const sign of [-1, 1]) {
    const ray = new Raycaster(new Vector3(sign * .35, .475, -4), new Vector3(0, 0, 1));
    const [hit] = ray.intersectObject(model.scene, true);
    expect((hit.object as Mesh).material).toHaveProperty('name','Reverse');
  }
  let triangles = 0;
  model.scene.traverse(object => {
    if (object instanceof Mesh) triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
  });
  expect(triangles).toBe(asset.triangles);
  expect(triangles).toBeLessThan(racing ? 35_000 : 100_000);
});
