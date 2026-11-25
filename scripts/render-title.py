"""Render the title photograph from the licensed LF GT that ships in the game.

From the project root run blender -b -t 4 -P scripts/render-title.py.
Use -- --proof for a quick composition check.
"""
from pathlib import Path
import sys
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
proof = '--proof' in sys.argv
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 12 if proof else 96
scene.cycles.use_denoising = False
scene.cycles.max_bounces = 6
scene.render.resolution_x, scene.render.resolution_y = 1800, 1020
scene.render.resolution_percentage = 35 if proof else 100
scene.world = bpy.data.worlds.new('Dusk')
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes['Background']
hdr = scene.world.node_tree.nodes.new('ShaderNodeTexEnvironment')
hdr.image = bpy.data.images.load(str(ROOT / 'public/assets/venice_sunset_1k.hdr'))
scene.world.node_tree.links.new(hdr.outputs[0], bg.inputs[0])
bg.inputs[1].default_value = .27

bpy.ops.import_scene.gltf(filepath=str(ROOT / 'public/assets/lf-gt.glb'))
for material in bpy.data.materials:
    node = next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None) if material.use_nodes else None
    if not node:
        continue
    if material.name.startswith('Paint 1'):
        color = node.inputs['Base Color']
        for link in list(color.links):
            material.node_tree.links.remove(link)
        color.default_value = (.65, .026, .008, 1)
        node.inputs['Metallic'].default_value = .58
        node.inputs['Roughness'].default_value = .23
        node.inputs['Coat Weight'].default_value = 1
        node.inputs['Coat Roughness'].default_value = .1
    if material.name == 'Glass':
        node.inputs['Alpha'].default_value = 1
        node.inputs['Transmission Weight'].default_value = .65
        node.inputs['Roughness'].default_value = .075

def material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return mat

def slab(name, center, size, finish):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    block = bpy.context.object
    block.name = name
    block.dimensions = size
    block.data.materials.append(finish)

def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat('-Z','Y').to_euler()

def softbox(name, xyz, target, width, height, watts, color):
    data = bpy.data.lights.new(name,'AREA')
    data.shape, data.size, data.size_y = 'RECTANGLE', width, height
    data.energy, data.color = watts, color
    light = bpy.data.objects.new(name, data)
    scene.collection.objects.link(light)
    light.location = xyz
    aim(light, target)

concrete = material('Ground concrete',(.077,.085,.092),.36)
nodes = concrete.node_tree.nodes
noise = nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 280
noise.inputs['Detail'].default_value = 2
bump = nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = .15
bump.inputs['Distance'].default_value = .024
concrete.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
concrete.node_tree.links.new(bump.outputs['Normal'], nodes['Principled BSDF'].inputs['Normal'])
slab('Concrete apron',(0,0,-.105),(90,90,.20),concrete)
steel = material('Anodised wall',(.052,.060,.066),.53)
for i in range(43):
    slab('Pit wall',(-9,i*.78-16,3.7),(.16,.769,8.4),steel)
slab('Loading bay',(-8.6,0,3.5),(.8,36,.14),steel)
slab('Distant bay',(0,13,4),(60,.3,10),steel)
softbox('Daylight ceiling',(1,-2,6),(0,0,.5),8,3.5,1550,(.88,.92,1))
softbox('Horizon stripe',(-4,3,2),(0,0,.6),8,.8,1350,(1,.66,.41))
softbox('Front fill',(3,-5,2.8),(0,0,.65),5,1.8,620,(.88,.92,1))
softbox('Rim',(3,4,3.8),(0,0,.7),5,1,1100,(1,.32,.12))
softbox('Bay light',(-7,2,2.1),(-9,4,2.8),10,.6,1200,(1,.41,.17))

bpy.ops.object.camera_add(location=(5.55,-5.10,1.42))
camera = bpy.context.object
camera.data.lens = 43
aim(camera,(0,-.05,.64))
scene.camera = camera
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = -.85
scene.render.image_settings.file_format = 'WEBP'
scene.render.image_settings.quality = 88
scene.render.filepath = '/tmp/apex-title-proof.webp' if proof else str(ROOT / 'public/assets/lf-title.webp')
bpy.ops.render.render(write_still=True)
