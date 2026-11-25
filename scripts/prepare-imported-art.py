"""Build the LF rig and four raytrace buildings from pinned CC-BY sources.
Inputs: asset-inbox/next-{cars,city}; see public/licenses/imported-art.json.
Run: blender -b --disable-autoexec --python scripts/prepare-imported-art.py
"""
import bpy, math, json, hashlib, struct
from pathlib import Path
from mathutils import Matrix, Vector
ROOT=Path.cwd(); OUT=ROOT/'public/assets'; records=[]

def mat(name,color,metal=0,rough=.4,image=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough
 if name.startswith('Paint'):b.inputs['Coat Weight'].default_value=1;b.inputs['Coat Roughness'].default_value=.1
 if image:
  t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=image;m.node_tree.links.new(t.outputs['Color'],b.inputs['Base Color'])
 return m

def export(name):

 for o in bpy.data.objects:
  o.hide_viewport=False;o.hide_render=False;o.hide_set(False)
  if o.name not in bpy.context.scene.objects:bpy.context.collection.objects.link(o)
 bpy.ops.object.select_all(action='SELECT');p=OUT/name
 bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_extras=False,use_selection=True)
 d=p.read_bytes();j=json.loads(d[20:20+struct.unpack_from('<I',d,12)[0]])
 records.append({'file':'assets/'+name,'bytes':len(d),'sha256':hashlib.sha256(d).hexdigest(),'triangles':sum(j['accessors'][p['indices']]['count']//3 for m in j['meshes'] for p in m['primitives'])})

bpy.ops.wm.open_mainfile(filepath=str(ROOT/'asset-inbox/next-cars/cars/LF/LF.blend'),use_scripts=False)
for o in list(bpy.data.objects):
 if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
images={n:bpy.data.images.load(str(ROOT/('asset-inbox/next-cars/textures/LF_'+n+'.png'))) for n in ['body_red','interior','wheel']}
for im in images.values():
 if max(im.size)>1024:im.scale(1024,1024)
 im.pack()
paint=mat('Paint 1 LF',(.6,.03,.02),.65,.25,images['body_red']);inside=mat('LF trim',(.3,.3,.3),.3,.48,images['interior']);glass=mat('Glass',(.03,.06,.08),.25,.1);wheelmat=mat('LF wheels',(.4,.4,.4),.45,.45,images['wheel'])
head=mat('Headlight',(.8,.9,1),.1,.2,images['interior']);tail=mat('Brakelight',(.6,.015,.025),.1,.25,images['interior'])
# Mesh nose points along -Y (opposite the source physics configuration).
# Centre the body, raise the tyres to Z=0, then export glTF Y-up/+Z forward.
T=Matrix(((1,0,0,0),(0,1,0,-.24),(0,0,1,.72),(0,0,0,1)))
front=bpy.data.objects['LF_wheel'];rear=bpy.data.objects['LF_wheel_rear']
pixels=list(images['interior'].pixels);w,h=images['interior'].size
for o in list(bpy.data.objects):
 if o in [front,rear]:continue
 original=o.name;o.data.transform(T@o.matrix_world);o.matrix_world=Matrix.Identity(4);o.animation_data_clear();o.constraints.clear();o.data.materials.clear();o.data.materials.append(paint if 'body' in original else glass if 'glass' in original else inside)
 if 'interior' in original:
  o.data.materials.append(head);o.data.materials.append(tail);uv=o.data.uv_layers.active.data
  for f in o.data.polygons:
   u=sum(uv[i].uv.x for i in f.loop_indices)/len(f.loop_indices);v=sum(uv[i].uv.y for i in f.loop_indices)/len(f.loop_indices);k=(min(h-1,max(0,int(v*h)))*w+min(w-1,max(0,int(u*w))))*4;r,g,b=pixels[k:k+3]
   if f.center.y>1 and r>.02 and r>g*2 and r>b*1.6:f.material_index=2
   elif f.center.y<-.9 and min(r,g,b)>.3 and f.center.z>.45:f.material_index=1
 for f in o.data.polygons:f.use_smooth=True
for axle,y,x,source in [('Front',-1.34,.94,front),('Rear',1.54,.92,rear)]:
 for side,sign in [('L',-1),('R',1)]:
  pivot=bpy.data.objects.new('Wheel'+axle+side,None);bpy.context.collection.objects.link(pivot);pivot.location=(sign*x,y-.24,.36)
  ob=bpy.data.objects.new('Tyre'+axle+side,source.data.copy());bpy.context.collection.objects.link(ob);ob.parent=pivot
  # The source hub faces -X. Keep the spokes outboard on both sides.
  if sign>0:ob.rotation_euler.z=math.pi
  ob.data.materials.clear();ob.data.materials.append(wheelmat)
  for f in ob.data.polygons:f.use_smooth=True
for o in [front,rear]:bpy.data.objects.remove(o,do_unlink=True)
print('LAMP FACES',[(m.name,sum(1 for o in bpy.data.objects if o.type=='MESH' for f in o.data.polygons if o.data.materials[f.material_index]==m)) for m in [head,tail]])
export('lf-gt.glb')
for o in list(bpy.data.objects):
 if o.type=='MESH' and len(o.data.polygons)>300:
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Race LOD','DECIMATE');mod.ratio=.36;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=mod.name)
export('lf-gt-lod.glb')

bpy.ops.wm.open_mainfile(filepath=str(ROOT/'asset-inbox/next-city/12Buildings.blend'),use_scripts=False)
selected=['cube12_default.017','cube42_default14.008','cube43_default.014','cube3_default.005']
for o in list(bpy.data.objects):
 if o.name not in selected:bpy.data.objects.remove(o,do_unlink=True)
diffuse=bpy.data.images['texture_diffuse.png'];normal=bpy.data.images['texture_normal.png'];diffuse.scale(1024,1024);normal.scale(1024,1024);diffuse.pack();normal.pack();normal.colorspace_settings.name='Non-Color'
stone=mat('Raytrace masonry',(.7,.75,.8),.05,.7,diffuse);n=stone.node_tree.nodes.new('ShaderNodeTexImage');n.image=normal;nm=stone.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.5;stone.node_tree.links.new(n.outputs['Color'],nm.inputs['Color']);stone.node_tree.links.new(nm.outputs['Normal'],stone.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
window=mat('Raytrace glazing',(.025,.065,.09),.7,.2);warm=mat('Raytrace warm windows',(.14,.12,.08),.45,.3);cool=mat('Raytrace cool windows',(.045,.1,.14),.5,.25)
# Compact room masks add curtains and ceiling light to individually mapped glazing.
for material,tint in [(window,(.025,.065,.09)),(warm,(.7,.36,.12)),(cool,(.12,.36,.5))]:
 room=bpy.data.images.new(material.name+' room',width=64,height=64);values=[]
 for y in range(64):
  for x in range(64):
   edge=min(x,63-x,y,63-y);v=.08 if edge<2 else .22+.62*(y/63)**1.5
   if 53<y<57 and 9<x<55:v=.95
   if 18<x<24:v*=.5
   values.extend((tint[0]*v,tint[1]*v,tint[2]*v,1))
 room.pixels=values;room.pack();b=material.node_tree.nodes.get('Principled BSDF');t=material.node_tree.nodes.new('ShaderNodeTexImage');t.image=room;material.node_tree.links.new(t.outputs['Color'],b.inputs['Base Color'])
 if material!=window:material.node_tree.links.new(t.outputs['Color'],b.inputs['Emission Color']);b.inputs['Emission Strength'].default_value=.6
for index,name in enumerate(selected):
 o=bpy.data.objects[name];o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4);low=Vector(tuple(min(v.co[i] for v in o.data.vertices) for i in range(3)));high=Vector(tuple(max(v.co[i] for v in o.data.vertices) for i in range(3)));o.data.transform(Matrix.Translation((-(low.x+high.x)/2,-(low.y+high.y)/2,-low.z)));o.name=['Harbor Arcade','Crown Tower','Terrace House','Spire Tower'][index]
 o.data.materials.clear()
 for m in [stone,window,warm,cool]:o.data.materials.append(m)
 uv=o.data.uv_layers.active.data
 for f in o.data.polygons:
  if all(uv[i].uv.x>.5 and uv[i].uv.y>.5 for i in f.loop_indices):
   # Stable lighting per architectural window, using spatial cells rather than triangle index.
   for loop in f.loop_indices:
    point=o.data.vertices[o.data.loops[loop].vertex_index].co;uv[loop].uv=((point.x if abs(f.normal.y)>.5 else point.y)/3,point.z/3.5)
   code=(int(f.center.x*2)*13+int(f.center.y*2)*7+int(f.center.z/3)*3)%9;f.material_index=2 if code<2 else 3 if code==3 else 1
export('harbor-architecture.glb')
sourcebase='https://github.com/stuntrally/blendfiles/blob/251bc67d5ff52ce535525e144a4a1304e3b2b5ef/'
manifest={'car':{'creator':'MasterLife','title':'LF','license':'CC-BY (version unspecified by source)','source':sourcebase+'cars/LF/LF.blend','credit':(ROOT/'asset-inbox/next-cars/cars/LF/about.txt').read_text(),'textures':json.loads((ROOT/'asset-inbox/next-cars/textures/sources.json').read_text()),'modifications':'Coordinate normalization, four animated wheels, textured PBR materials, functional existing lamp faces, 1024px maps and race LOD. LF GT is the in-game label; handling and V12 sound are game tuning, not manufacturer specifications.'},'architecture':{'creator':'raytrace','title':'12 Buildings (four selected)','license':'CC-BY (version unspecified by source)','source':sourcebase+'props/buildings/skyscrapers/12Buildings.blend','credit':(ROOT/'asset-inbox/next-city/readme.txt').read_text(),'textureCreator':'Calinou','textureLicense':'CC-BY-SA-3.0','textureLicenseUrl':'https://creativecommons.org/licenses/by-sa/3.0/','modifications':'Four selected meshes centered and grounded; atlas and normal map resized to 1024px; glazing separated into dark, warm and cool emissive materials. Adapted textures remain CC-BY-SA-3.0.'},'assets':records}
(ROOT/'public/licenses/imported-art.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(records))
