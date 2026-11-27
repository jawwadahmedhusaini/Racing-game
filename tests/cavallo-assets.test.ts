import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARS } from '../src/game/content';
import { vehicleAssetKey } from '../src/game/car';
import { engineBank } from '../src/game/engine-voice';

const cavallo = CARS.find(car => car.id === 'cavallo-575')!;
const provenance = JSON.parse(readFileSync('public/licenses/cavallo-575.json', 'utf8'));

describe('Cavallo 575 GTC asset', () => {
  it('retains the standalone license, original sources, and a V12 engine profile', () => {
    expect(provenance.license).toBe('LAL-1.3');
    expect(readFileSync('public/' + provenance.licenseFile, 'utf8')).toContain('Licence Art Libre 1.3');
    expect(provenance.originals).toHaveLength(3);
    expect(engineBank(cavallo.id)).toBe('v12d');
  });

  for (const [index, asset] of provenance.assets.entries()) {
    it(`${asset.file} contains the assembled body and separate wheel pivots`, () => {
      const racing = index === 1;
      const bytes = readFileSync('public/' + asset.file);
      expect(asset.file).toBe('assets/' + vehicleAssetKey(cavallo, racing));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
      expect(bytes.length).toBeLessThan(racing ? 550_000 : 950_000);
      const data = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
      for (const side of ['L','R']) for (const axle of ['Front','Rear']) {
        const pivot = data.nodes.find((node: { name: string }) => node.name === `Wheel${axle}${side}`);
        expect(pivot.translation[1]).toBeCloseTo(cavallo.suspension!.wheelRadius);
        expect(pivot.translation[0] * (side === 'L' ? -1 : 1)).toBeGreaterThan(.8);
        expect(pivot.translation[2] * (axle === 'Front' ? 1 : -1)).toBeGreaterThan(1.2);
        expect(pivot.children.some((child: number) => data.nodes[child].name.startsWith('BrakePad'))).toBe(true);
      }
      const triangles = data.meshes.flatMap((mesh: {primitives: { indices: number }[]}) => mesh.primitives)
        .reduce((sum: number, part: { indices: number }) => sum + data.accessors[part.indices].count / 3, 0);
      expect(triangles).toBe(asset.triangles);
      expect(triangles).toBeLessThan(racing ? 13_000 : 25_000);
      expect(data.materials.map((material: {name: string}) => material.name))
        .toEqual(expect.arrayContaining(['Paint 1','Glass','Brakelight','Headlight','Reverse']));
    });
  }
});
