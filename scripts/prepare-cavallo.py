"""Convert the Free Art licensed Speed Dreams Cavallo 575 with Blender 4.3+.

Original AC3D body and texture links are recorded in public/licenses/cavallo-575.json.
Save them to asset-inbox/cavallo-575/body.ac and skin.png before running:
blender -b --python scripts/prepare-cavallo.py
"""
from pathlib import Path
import hashlib
import json
import math
import re
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import vehicle_primitives as shapes

SOURCE = ROOT / 'asset-inbox/cavallo-575'
ORIGINAL = 'https://raw.githubusercontent.com/dglanzman/speed-dreams/e359f47009d1bfc6e01d642f684d9c0b81d7929d/data/cars/models/ls1-cavallo-570s1'
RADIUS = .337
PAINT = set('BODY BODY_hood BODYa BODYm BODYm.001 BODYn BODYo BODYp BODYq BODYr fbmp fbmp_hump fbmp_jump rbmp rear rear_p2 rvm_p2 sideskirt1 wing'.split())
GLAZING = {'WI'}
OPTICS = {'flgt', 'headlights_case'}
TAIL = {'rlgt'}
INTERIOR = {'INT', 'STEER', 'cage'}
OMIT = set(':WI DRIVER DRIVERHAND head VISOR int2 Int_rubber sunshade BODYe'.split())
RACE_OMIT = {'antenna', 'wiper', 'winlett', 'cage'}

def source_objects():
    """Read the individual polygon objects and their per-corner UV coordinates."""
    data = (SOURCE / 'body.ac').read_text()
    for section in data.split('OBJECT poly\n')[1:]:
        name = re.search(r'^name "(.*)"$', section, re.M)[1]
        verts = re.search(r'numvert (\d+)\n(.*?)\nnumsurf', section, re.S)[2]
        points = [tuple(map(float, line.split())) for line in verts.splitlines()]
        # Source coordinates are longitudinal, up, lateral. Changing the basis reverses winding.
        vertices = [shapes.point((z, y + .042, x)) for x, y, z in points]
        faces = []
        for surface in re.finditer(r'SURF (0x[0-9a-f]+)\nmat \d+\nrefs (\d+)\n', section, re.I):
            rows = section[surface.end():].splitlines()[:int(surface[2])]
            corners = [(int(i),float(u),float(v)) for i,u,v in (row.split() for row in rows)]
            faces.append((bool(int(surface[1],16) & 16), corners[::-1]))
        yield name, vertices, faces

def paint_atlas():
    """Keep the original panel shading as neutral tintable detail, omitting livery colours."""
    original = bpy.data.images.load(str(SOURCE / 'skin.png'))
    original.scale(1024, 1024)
    values = list(original.pixels)
    for i in range(0, len(values), 4):
        red, green, blue = values[i:i+3]
        # Dark grey paint grooves carry the original bump and seam design.
        level = max(red, green, blue)
        y = i // (4*1024)
        tone = .99 if y>=756 else max(.13, min(.99, (level/.83)**.60))
        values[i:i+4] = (tone,tone,tone,1)
    original.name = 'Cavallo panel detail'
    original.pixels.foreach_set(values)
    original.filepath_raw = str(SOURCE / 'panel-detail.png')
    original.file_format = 'PNG'
    original.pack()
    return original

def shell(low, mats):
    for name, vertices, faces in source_objects():
        if name in OMIT or low and name in RACE_OMIT:
            continue
        if name in PAINT:
            finish = mats['paint']
        elif name in GLAZING:
            finish = mats['glass']
        elif name in OPTICS:
            finish = mats['lamps']
        elif name in TAIL:
            finish = mats['rear']
        elif name in INTERIOR:
            finish = mats['interior']
        elif name in {'exhaust', 'cooler_pat', 'rvm_p1'}:
            finish = mats['steel']
        else:
            finish = mats['trim']
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(vertices, [], [[i for i, _, _ in corners] for _, corners in faces])
        mesh.update()
        uv = mesh.uv_layers.new()
        for poly, (smooth, corners) in zip(mesh.polygons, faces):
            poly.use_smooth = smooth
            for index, (_, u, v) in zip(poly.loop_indices, corners):
                uv.data[index].uv = (u,v)
        obj = bpy.data.objects.new(name,mesh)
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(finish)
    # Reverse optics sit inside the original inset lamp housings.
    for side in (-1,1):
        shapes.box('Reverse light',(.049,.035,.025),(side*.57,.71,-2.291),mats['reverse'],.011)

def wheels(mats, low):
    for axle, track, end in [(1.26,.841,'Front'),(-1.32,.862,'Rear')]:
        for side, flank in [(-1,'L'),(1,'R')]:
            def at(x,y=0,z=0):
                return (side*(track+x), RADIUS+y, axle+z)
            pivot = bpy.data.objects.new('Wheel'+end+flank,None)
            bpy.context.collection.objects.link(pivot)
            pivot.location = shapes.point(at(0))
            bpy.context.view_layer.update()
            depth = 1.33 if end=='Rear' else 1.25
            shapes.torus('Slick tire',at(0),.260,.077,mats['tire'],pivot,depth)
            shapes.disk('Inner barrel',at(-.013),.24,.20,mats['trim'],pivot)
            shapes.torus('Polished rim',at(.095),.229,.013,mats['alloy'],pivot)
            shapes.disk('Ventilated disc',at(.073),.199,.018,mats['disc'],pivot)
            shapes.disk('Centre hub',at(.112),.059,.028,mats['alloy'],pivot)
            for j in range(10):
                a = math.tau*j/10
                path = [at(x,r*math.sin(a+t),r*math.cos(a+t)) for x,r,t in [(.118,.056,0),(.094,.143,.028),(.095,.224,.059)]]
                shapes.tube('Cast spoke',path,.013,mats['alloy'],pivot)
            shapes.box('BrakePad fixed',(.041,.092,.108),at(.093,.128,.116),mats['caliper'],.014,pivot)
            if not low:
                for j in range(18):
                    a = math.tau*j/18
                    shapes.disk('Disc drill',at(.083,.173*math.sin(a),.173*math.cos(a)),.006,.002,mats['trim'],pivot)

def build(low):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    shapes.LOW = low
    mat = shapes.material
    mats = {
        'paint':mat('Paint 1',(.62,.031,.027),.62,.29),
        'glass':mat('Glass',(.038,.065,.086),.28,.10),
        'lamps':mat('Headlight',(.82,.88,.92),.31,.19,(.58,.73,.80)),
        'rear':mat('Brakelight',(.65,.012,.026),.27,.25,(.90,.014,.033)),
        'reverse':mat('Reverse',(.74,.79,.86),.16,.25),
        'steel':mat('Machined metal',(.29,.30,.32),.74,.31),
        'trim':mat('Carbon and rubber trim',(.025,.030,.036),.26,.46),
        'interior':mat('Interior',(.042,.048,.052),.12,.56),
        'tire':mat('Tire',(.015,.016,.018),.01,.86),
        'alloy':mat('Rim2',(.39,.42,.47),.73,.23),
        'disc':mat('Disc',(.19,.21,.24),.66,.44),
        'caliper':mat('Caliper',(.55,.12,.028),.3,.31),
    }
    tex = mats['paint'].node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = paint_atlas()
    shader = mats['paint'].node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (1,1,1,1)
    mats['paint'].node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    shell(low,mats)
    wheels(mats,low)
    path = ROOT / ('public/assets/cavallo-575-lod.glb' if low else 'public/assets/cavallo-575.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_yup=True,
        export_image_format='JPEG',export_jpeg_quality=88,export_animations=False,export_cameras=False,export_lights=False)
    triangles = sum(len(poly.vertices)-2 for o in bpy.data.objects if o.type=='MESH' for poly in o.data.polygons)
    return {'file':'assets/'+path.name,'bytes':path.stat().st_size,'triangles':triangles,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

if __name__=='__main__':
    manifest = {
        'name':'Cavallo 575 GTC',
        'sourceInspiration':'A Ferrari 575 GTC interpretation, as identified by the Speed Dreams source credits.',
        'license':'LAL-1.3',
        'licenseFile':'licenses/LAL-1.3.txt',
        'authors':['RSDG (base model)','Andrew Sumner (2007 and 2009 conversion and rework)',
            'Haruna (2011 texture rework)','Eckhard M. Jaeger (2011 texture and mapping)',
            'W-E-C (2011 3D improvements)','APEX RUSH project (game adaptation)'],
        'originals':[f'{ORIGINAL}/{name}' for name in ['readme.txt','ls1-cavallo-570s1.ac','ls1-cavallo-570s1.png']],
        'modifications':'Converted from the AC3D original, retaining its main body, hood, glass and wing geometry and neutralised panel-detail atlas. Applied new PBR lamp, glazing and metal materials, replaced wheels and rigged both axles with new calipers, and exported detailed and race GLBs. The standalone adapted assets retain the Free Art License.',
        'assets':[build(False),build(True)],
    }
    (ROOT/'public/licenses/cavallo-575.json').write_text(json.dumps(manifest,indent=2)+'\n')
