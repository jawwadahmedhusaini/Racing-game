"""Convert Neubi's CC0 BMW M3 mesh, adapted by CryHam, to a browser vehicle.
Fetch: python3 scripts/fetch-bmw-source.py
Convert: blender -b --disable-autoexec --python scripts/prepare-bmw.py
Sources and hashes: public/licenses/bmw-m3.json. Download inputs into /tmp/apex-assets.
"""
import bpy,math,os,json,hashlib,struct
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path.cwd();SRC=Path('/tmp/apex-assets')
bpy.ops.wm.open_mainfile(filepath=str(SRC/'bmw_m3_gt3.blend'),use_scripts=False)
for o in list(bpy.data.objects):
 if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)

def material(name,color,metal=0,rough=.4,image=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 if name.startswith('Paint'):bs.inputs['Coat Weight'].default_value=1;bs.inputs['Coat Roughness'].default_value=.12
 if image:
  tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(SRC/image),check_existing=True);m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
 return m
paint=material('Paint 1 BMW',(.12,.24,.36),.7,.25)
interior=material('BMW interior',(.12,.12,.12),.15,.55,'XZ_interior.png')
glass=material('Glass',(.035,.06,.08),.3,.1)
# Migrate the original road axes to Blender, then glTF Y-up/+Z-forward.
transform=Matrix(((0,-1,0,0),(1,0,0,.14),(0,0,1,.84),(0,0,0,1)))
for o in list(bpy.data.objects):
 o.data.transform(transform@o.matrix_world);o.animation_data_clear();o.constraints.clear();o.parent=None;o.delta_rotation_euler=(0,0,0);o.delta_scale=(1,1,1);o.delta_location=(0,0,0);o.matrix_world=Matrix.Identity(4)
 o.data.materials.clear();o.data.materials.append(paint if 'body' in o.name else glass if 'glass' in o.name else interior)
 for face in o.data.polygons:face.use_smooth=True
 o.name={'XZ_body':'BMW body','XZ_glass':'BMW glass','XZ_interior':'BMW interior'}[o.name]
# Neutral wheel rig, separated calipers, signed rotation in runtime.
with bpy.data.libraries.load(str(SRC/'bmw_m3_gt3_wheel.blend'),link=False) as (a,b):b.objects=['XZ_wheel','XZ_brake']
wheel,brake=b.objects
rim=material('BMW wheel',(.3,.32,.34),.4,.55,'XZ_Tire.png');caliper=material('BMW caliper',(.28,.03,.015),.45,.3)
for axle,long in [('Front',1.54),('Rear',-1.15)]:
 for side,x in [('L',-.84),('R',.84)]:
  pivot=bpy.data.objects.new('Wheel'+axle+side,None);bpy.context.collection.objects.link(pivot);pivot.location=(x,-long+.14,.389)
  for source,mat,suffix in [(wheel,rim,'Wheel'),(brake,caliper,'BrakePad')]:
   ob=bpy.data.objects.new(suffix+axle+side,source.data.copy());bpy.context.collection.objects.link(ob);ob.parent=pivot;ob.scale=(1,1.18,1.18)
   if side=='L':ob.rotation_euler.z=math.pi
   ob.data.materials.clear();ob.data.materials.append(mat)
   for f in ob.data.polygons:f.use_smooth=True
for o in [wheel,brake]:bpy.data.objects.remove(o,do_unlink=True)
# Small functional lamps follow the source front/rear light locations.
head=material('Headlight',(.75,.9,1),.1,.2);tail=material('Brakelight',(1,1,1),.1,.25,'XZ_interior.png');reverse=material('Reverse',(.7,.8,.9),.1,.2)
# Illuminate the existing textured tail-lamp faces; no floating overlay geometry.
ob=bpy.data.objects['BMW interior'];ob.data.materials.append(tail);uv=ob.data.uv_layers.active.data
for face in ob.data.polygons:
 if face.center.y>1.2 and all(uv[i].uv.x>.5 and uv[i].uv.y>.74 for i in face.loop_indices):face.material_index=1
bs=tail.node_tree.nodes.get('Principled BSDF');tex=next(n for n in tail.node_tree.nodes if n.type=='TEX_IMAGE');tail.node_tree.links.new(tex.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=1
def lamp(name,loc,scale,mat):
 # Seat each lens on the actual shell at this height instead of guessing its depth.
 x,y,z=loc;rear=y>0;origin=Vector((x,5 if rear else -5,z));direction=Vector((0,-1 if rear else 1,0));hits=[]
 for name_body in ['BMW body','BMW interior']:
  body=bpy.data.objects[name_body];ok,point,normal,index=body.ray_cast(origin,direction)
  if ok:hits.append(point)
 if hits:
  point=min(hits,key=lambda p:(p-origin).length);loc=(x,point.y+(.012 if rear else -.012),z)
 else:return
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mat)
for side in [-1,1]:
 for dx in [-.075,.075]:lamp('Headlight lens',(side*.65+dx,-2.12+.14,.63),(.062,.009,.05),head)
 lamp('Reverse lamp',(side*.44,2.1+.14,.81),(.046,.009,.024),reverse)
for im in bpy.data.images:
 if im.size[0]>1024 or im.size[1]>1024:
  r=min(1024/im.size[0],1024/im.size[1]);im.scale(round(im.size[0]*r),round(im.size[1]*r))
# Exclude all unused cameras, images and reference meshes from the export.
bpy.ops.object.select_all(action='SELECT')
out=ROOT/'public/assets';records=[]
for lod in [False,True]:
 if lod:
  for o in list(bpy.data.objects):
   if o.type=='MESH' and len(o.data.polygons)>250:
    bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Race LOD','DECIMATE');mod.ratio=.6;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 path=out/('bmw-m3-lod.glb' if lod else 'bmw-m3.glb')
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_extras=False,use_selection=True)
 data=path.read_bytes();j=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]]);triangles=sum(j['accessors'][p['indices']]['count']//3 if 'indices' in p else j['accessors'][p['attributes']['POSITION']]['count']//3 for mesh in j['meshes'] for p in mesh['primitives'])
 records.append({'triangles':triangles,'file':str(path.relative_to(ROOT/'public')),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size})
manifest={'license':'CC0-1.0','creator':'Neubi','adaptedBy':'CryHam (Stunt Rally), APEX RUSH','sourceListing':'https://www.blendswap.com/blends/view/19869','sourceCredits':'https://github.com/stuntrally/blendfiles/blob/251bc67d5ff52ce535525e144a4a1304e3b2b5ef/cars/XZ/about.txt','originalCreditText':(SRC/'about.txt').read_text(),'sources':json.loads((SRC/'bmw-sources.json').read_text()),'modifications':'Coordinate conversion, PBR materials, remapped existing interior/wheel textures, rigged four wheels and fixed calipers, functional lamps, two LODs. Performance and sound are game tuning, not manufacturer specifications.','trademarkNotice':'Unofficial community model. BMW is a trademark of its owner; no endorsement or manufacturer sound recording is claimed.','assets':records}
(ROOT/'public/licenses/bmw-m3.json').write_text(json.dumps(manifest,indent=2)+'\n')
