import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { random } from './materials';

type Position = [x: number, y: number, z: number];

/** Authored pit-lane scenery, grouped by surface for inexpensive static rendering. */
export function createShowroom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a1723');
  scene.fog = new THREE.FogExp2('#0a1723', .012);
  scene.environmentIntensity = .94;

  const group = new THREE.Group();
  scene.add(group);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial({
    map: shadowTexture(), transparent: true, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -.024;
  group.add(shadow);

  const sheet = concreteTexture();
  const wallSheet = sheet.clone();
  wallSheet.repeat.set(1.6,1);
  wallSheet.needsUpdate = true;
  const asphalt = new THREE.MeshStandardMaterial({
    color: '#343a40', roughness: .62, metalness: .09, map: sheet,
    bumpMap: sheet, bumpScale: .026,
  });
  const concrete = new THREE.MeshStandardMaterial({color: '#888b88', roughness: .86, map: wallSheet});
  const charcoal = new THREE.MeshStandardMaterial({color: '#252c30', roughness: .78, map: wallSheet});
  const steel = new THREE.MeshStandardMaterial({color: '#30393c', roughness: .47, metalness: .55});
  const zinc = new THREE.MeshStandardMaterial({color: '#788589', roughness: .46, metalness: .67});
  const rubber = new THREE.MeshStandardMaterial({color: '#141819', roughness: .91});
  const oxblood = new THREE.MeshStandardMaterial({color: '#8f3229', roughness: .59, metalness: .27});
  const safety = new THREE.MeshStandardMaterial({color: '#b1a15f', roughness: .7});
  const warmFixture = new THREE.MeshBasicMaterial({color: new THREE.Color(3, 2.55, 1.92)});
  const coolFixture = new THREE.MeshBasicMaterial({color: new THREE.Color(.72, 1.51, 2.45)});
  const warning = new THREE.MeshBasicMaterial({color: new THREE.Color(2.25, .33, .085)});
  const exterior = new THREE.MeshStandardMaterial({color: '#162936', roughness: .74, metalness: .18});
  const containers = [
    new THREE.MeshStandardMaterial({color: '#183b44', roughness: .68, metalness: .26}),
    new THREE.MeshStandardMaterial({color: '#543b33', roughness: .73, metalness: .22}),
  ];

  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, [x, y, z]: Position) => {
    geometry.translate(x, y, z);
    const batch = batches.get(material) ?? [];
    batch.push(geometry);
    batches.set(material, batch);
  };
  const box = (p: Position, w: number, h: number, d: number, material: THREE.Material) =>
    add(new THREE.BoxGeometry(w, h, d), material, p);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(168, 168), asphalt);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.034;
  floor.receiveShadow = true;
  scene.add(floor);
  const markings = new THREE.Mesh(new THREE.PlaneGeometry(25, 24), new THREE.MeshBasicMaterial({
    map: floorTexture(), transparent: true, depthWrite: false,
  }));
  markings.rotation.x = -Math.PI / 2;
  markings.position.set(0, -.03, -2);
  scene.add(markings);

  // The door is a hole in the bay walls. The yard and cranes continue behind it.
  const doorZ = -8.3, doorLeft = -4.05, doorRight = 4.9, doorHeight = 4.15;
  box([-6.1, 2.55, doorZ], 4.1, 5.1, .47, concrete);
  box([-6.1, .62, doorZ + .25], 4.1, 1.24, .04, charcoal);
  box([7.85, 2.55, doorZ], 5.9, 5.1, .47, concrete);
  box([7.85, .62, doorZ + .25], 5.9, 1.24, .04, charcoal);
  box([.425, 4.68, doorZ], 8.95, 1.06, .47, concrete);
  box([-8.22, 2.55, -.1], .44, 5.1, 16.4, concrete);
  box([-7.97, .62, -.1], .05, 1.24, 16.4, charcoal);
  box([-7.935, 1.26, -.1], .04, .058, 16.4, steel);
  for (const z of [-7.19,-3.91,-.55,2.73,5.95]) {
    box([-7.985, 2.28, z], .016, 2.03, .026, charcoal);
    for (const y of [1.56,3.2]) box([-7.973,y,z+.092], .017, .031, .031, steel);
  }
  box([10.78, 2.55, -.1], .44, 5.1, 16.4, charcoal);
  box([1.29, 4.96, -.1], 19, .15, 16.4, charcoal);
  box([.425, doorHeight - .045, doorZ + .34], 9.1, .21, .47, steel);
  box([.425, doorHeight - .145, doorZ + .45], 8.8, .046, .065, warmFixture);
  for (const x of [doorLeft, doorRight]) {
    box([x, 2.11, doorZ + .32], .23, 4.22, .33, steel);
    box([x, 2.01, doorZ + .49], .043, 3.88, .027, zinc);
    box([x, .48, doorZ + .68], .3, .96, .36, rubber);
    for (const y of [.24, .60, .82]) box([x, y, doorZ + .874], .29, .068, .012, safety);
  }
  for (let y = 4.29; y < 4.9; y += .11) box([.425, y, doorZ + .26], 8.88, .025, .08, zinc);
  box([5.12, 1.42, doorZ + .285], .18, .28, .13, steel);
  box([5.12, 1.50, doorZ + .36], .07, .054, .012, warning);
  for (const z of [-5.6, -1.65, 2.15, 6.07]) {
    box([1.25, 4.64, z], 18.85, .35, .24, steel);
    box([-1.22, 4.42, z], 5.5, .14, .48, steel);
    box([-1.22, 4.336, z], 5.24, .035, .35, warmFixture);
    box([-7.94, 3.02, z], .18, 3.96, .23, concrete);
    box([10.55, 3.02, z], .18, 3.96, .23, steel);
  }

  // Shelves, segmented tool cabinets, wall conduit and spare touring wheels.
  box([-6.2, .54, -7.48], 3.07, 1.08, .81, oxblood);
  box([-6.2, 1.105, -7.48], 3.18, .10, .88, rubber);
  for (const x of [-7.17, -6.2, -5.23]) {
    for (const y of [.32, .58, .83]) {
      box([x, y, -7.052], .89, .193, .047, steel);
      box([x, y + .043, -7.011], .32, .029, .046, zinc);
    }
  }
  box([-6.2, 1.7, -8.018], 3.05, .86, .05, steel);
  box([-6.2, 2.13, -7.9], 3.08, .07, .21, steel);
  box([-6.2, 2.083, -7.834], 2.94, .03, .075, warmFixture);
  for (const [x, height] of [[-7.26,.38],[-7.05,.29],[-6.76,.34],[-6.49,.24],[-6.1,.44],[-5.32,.35],[-5.05,.20]]) {
    box([x, 1.76 - height / 2, -7.976], .052, height, .055, zinc);
    box([x, 1.78, -7.971], .099, .057, .075, zinc);
  }
  for (let y = .11; y < 1.02; y += .222) {
    // Radial sidewall rings leave the center open when viewed from above.
    for (const [x,z] of [[-6.77,-5.18],[-6.74,-4.34]]) {
      const tire = new THREE.LatheGeometry([
        new THREE.Vector2(.22,-.100), new THREE.Vector2(.301,-.106),
        new THREE.Vector2(.343,-.078), new THREE.Vector2(.351,-.050),
        new THREE.Vector2(.351,.058), new THREE.Vector2(.334,.084),
        new THREE.Vector2(.292,.107), new THREE.Vector2(.22,.103),
        new THREE.Vector2(.22,-.100),
      ], 26);
      // Box primitives and lathe rings share position, normal and UV attributes.
      add(tire, rubber, [x,y,z]);
    }
  }
  box([-7.858, 3.62, -.14], .045, .057, 15.32, zinc);
  box([-7.858, 3.77, -.14], .045, .057, 15.32, steel);
  box([-7.854, 3.69, -4.45], .09, .25, .26, steel);
  box([-7.78, 1.41, -5.14], .29, .70, .49, steel);
  box([-7.619, 1.57, -5.23], .027, .102, .13, coolFixture);
  for (const x of [-7.12,-5.38]) {
    box([x, 1.25, -7.55], .16, .22, .28, oxblood);
    box([x, 1.39, -7.55], .041, .056, .045, zinc);
  }

  const pitSign = new THREE.Mesh(new THREE.PlaneGeometry(2.98, .76), new THREE.MeshStandardMaterial({
    map: signTexture(), roughness: .6, emissive: '#7d93a5', emissiveIntensity: .13,
  }));
  pitSign.position.set(-6.1, 3.36, doorZ + .274);
  scene.add(pitSign);
  box([-6.1, 3.36, doorZ + .235], 3.02, .8, .035, steel);

  // Paddock edge and night port. Stacked cargo and a thin crane silhouette
  // remain recognizable through the door at the wider phone framing.
  box([-4.4, .25, -19.8], 29.6, .50, .49, exterior);
  box([-4.4, .502, -19.8], 29.6, .029, .49, zinc);
  for (const x of [-9,-4.1,1,6.2,10.4]) {
    box([x, 1.24, -19.8], .099, 1.51, .11, steel);
    box([x, 1.99, -19.8], .145, .044, .145, zinc);
  }
  for (const y of [1,1.43,1.94]) box([-.1,y,-19.8], 20.6, .023, .055, steel);
  for (const [index, [x,z,levels]] of [[-14,-27,2],[-8.5,-28.6,1],[-2.6,-33,2],[3.4,-33.4,1],[9.1,-35.1,2]].entries()) {
    for (let layer = 0; layer < levels; layer++) {
      const y = 1.27 + 2.59 * layer;
      box([x,y,z], 5.5, 2.54, 2.49, containers[(index+layer)%2]);
      for (let dx = -2.57; dx <= 2.57; dx += .34) box([x+dx,y,z+1.257], .063, 2.38, .088, exterior);
      for (const dx of [-2.74,2.74]) box([x+dx,y,z+1.28], .095, 2.60, .12, steel);
    }
  }
  for (const x of [-9.2,1.4,11.8]) {
    box([x, 2.57, -17.7], .096, 5.14, .096, exterior);
    box([x, 5.156, -17.48], .34, .105, .61, steel);
    box([x, 5.1, -17.41], .264, .034, .45, coolFixture);
    box([x, 1.01, -19.51], .42, .065, .021, coolFixture);
  }
  const beam = (from: Position, to: Position, thickness: number, material: THREE.Material) => {
    const direction = new THREE.Vector3(to[0]-from[0], to[1]-from[1], to[2]-from[2]);
    const geometry = new THREE.BoxGeometry(thickness, direction.length(), thickness);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), direction.normalize()));
    const center = from.map((value,axis)=>(value+to[axis])/2) as Position;
    add(geometry,material,center);
  };
  for (const z of [-58,-62]) {
    beam([-17,0,z],[-13,15,z],.48,exterior);
    beam([-7,0,z],[-10.6,15,z],.43,exterior);
    beam([-18,15,z],[9,15,z],.4,exterior);
    beam([-18,16.9,z],[9,16.9,z],.28,exterior);
    beam([2.4,15,z],[2.4,5.5,z],.064,steel);
    for (let x = -17; x < 8; x += 3.5) beam([x,15,z],[x+2.65,16.9,z],.13,steel);
    box([9, 16.9, z], .12, .14, .16, warning);
  }
  for (const [material, parts] of batches) {
    const merged = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, material);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }

  // Light reflects as long practical strips. Off-camera softboxes keep gloss
  // legible on every vehicle without requiring a realtime reflection pass.
  scene.add(new THREE.HemisphereLight('#c9ddf6', '#595860', .68));
  const key = new THREE.DirectionalLight('#fff0d6', 2.1);
  key.position.set(2.8, 6.7, 3.35);
  key.castShadow = true;
  key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-5.5,right:5.5,top:5.5,bottom:-5.5});
  key.shadow.normalBias = .023;
  key.shadow.bias = -.00012;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#84c6ff', 1.48);
  rim.position.set(-1.3, 2.05, -7.5);
  scene.add(rim);
  const fill = new THREE.DirectionalLight('#f3e6d6', .49);
  fill.position.set(-5, 1.55, 2.6);
  scene.add(fill);
  const yardLight = new THREE.PointLight('#82beee', 62, 35, 2);
  yardLight.position.set(-1.25, 5.2, -16.7);
  const benchLight = new THREE.PointLight('#ffdcab', 12, 10, 2);
  benchLight.position.set(-6.31, 2.05, -7.61);
  scene.add(yardLight,benchLight);

  const panelMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color(2.4, 2.13, 1.74),side:THREE.DoubleSide});
  const rimMaterial = new THREE.MeshBasicMaterial({color: new THREE.Color(.75, 1.42, 2.21),side:THREE.DoubleSide});
  for (const [x,y,z,w,h,material] of [
    [1.6,4.52,1.4,5.6,1.12,panelMaterial],
    [-5.75,3.08,1.4,3.2,1.15,panelMaterial],
    [1.3,3.65,-6.55,6.0,.68,rimMaterial],
  ] as const) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
    panel.position.set(x,y,z);
    panel.lookAt(0,.55,0);
    panel.userData.probeOnly = true;
    panel.visible = false;
    scene.add(panel);
  }
  return {scene, group, shadow};
}

function texture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function shadowTexture() {
  return texture(128,128,ctx => {
    const shadow = ctx.createRadialGradient(64,64,4,64,64,64);
    shadow.addColorStop(0,'rgba(1,2,3,.92)');
    shadow.addColorStop(.42,'rgba(1,2,3,.70)');
    shadow.addColorStop(1,'rgba(1,2,3,0)');
    ctx.fillStyle = shadow;
    ctx.fillRect(0,0,128,128);
  });
}

function concreteTexture() {
  const map = texture(256,256,ctx => {
    const rng = random(61641);
    const layers = [[5,28],[18,14],[50,8]] as const;
    const grids = layers.map(([size])=>Array.from({length:size*size},()=>rng()-.5));
    const image = ctx.createImageData(256,256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      let value = 180 +(rng()-.5)*18;
      layers.forEach(([size,weight],layer)=>{
        const u=x*size/256,v=y*size/256;
        const i=Math.floor(u),j=Math.floor(v),a=u-i,b=v-j;
        const grid=grids[layer];
        const top=THREE.MathUtils.lerp(grid[j*size+i],grid[j*size+(i+1)%size],a);
        const bottom=THREE.MathUtils.lerp(grid[((j+1)%size)*size+i],grid[((j+1)%size)*size+(i+1)%size],a);
        value+=THREE.MathUtils.lerp(top,bottom,b)*weight;
      });
      const index = (y*256+x)*4;
      image.data[index] = value;
      image.data[index+1] = value+1;
      image.data[index+2] = value+1;
      image.data[index+3] = 255;
    }
    ctx.putImageData(image,0,0);
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(32,32);
  map.anisotropy = 4;
  return map;
}

function floorTexture() {
  return texture(1024,1024,ctx => {
    // Construction joints, worn pit box paint, and rubber on the arrival line.
    const rng = random(3537);
    const point = (x: number, z: number) => [512+x*40.96,512+(z+2)*42.6667] as const;
    const line = (x1:number,z1:number,x2:number,z2:number,color:string,width:number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(...point(x1,z1));
      ctx.lineTo(...point(x2,z2));
      ctx.stroke();
    };
    for (const x of [-8.12,-4.05,0,4.9,8.82]) line(x,-14,x,10,'rgba(8,12,20,.41)',1.6);
    for (const z of [-12,-8.3,-4.45,1.4,6.75]) line(-8.1,z,10.68,z,'rgba(8,12,20,.46)',2);
    for (const x of [-2.35,2.35]) {
      line(x,-7.6,x,4.45,'rgba(186,163,99,.48)',2.8);
      for (const z of [-3.8,3.5]) line(x,z,x*.66,z,'rgba(215,211,187,.71)',4);
    }
    line(-4.01,-8.05,4.84,-8.05,'rgba(223,208,161,.38)',4);
    for (let i = 0; i < 440; i++) {
      const sign = rng()>.5 ? 1 : -1;
      const x = sign*(.87+(rng()-.5)*.3), z = -8 + 13*rng();
      line(x,z,x+(rng()-.5)*.028,z+.14+rng()*.6,'rgba(8,12,16,.078)',1+rng()*3);
    }
    for (const z of [-6.6,4.3]) {
      line(-4.55,z,-4.55,z+.86,'rgba(173,150,102,.61)',4);
      line(-4.68,z,-4.68,z+.86,'rgba(173,150,102,.61)',4);
    }
  });
}

function signTexture() {
  return texture(768,196,ctx => {
    const fill = ctx.createLinearGradient(0,0,0,196);
    fill.addColorStop(0,'#242a2d');
    fill.addColorStop(1,'#171c20');
    ctx.fillStyle = fill;
    ctx.fillRect(0,0,768,196);
    ctx.strokeStyle = '#70685a';
    ctx.lineWidth = 2;
    ctx.strokeRect(9,9,750,178);
    ctx.fillStyle = '#ba8351';
    ctx.fillRect(36,41,7,111);
    ctx.fillStyle = '#f1e8d7';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('NEON HARBOR',69,99);
    ctx.fillStyle = '#aeb8bc';
    ctx.font = '27px sans-serif';
    ctx.fillText('PIT LANE',71,144);
  });
}
