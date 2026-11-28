"""Convert Neubi's CC0 BMW M3 mesh, adapted by CryHam, to a browser vehicle.

Fetch: python3 scripts/fetch-bmw-source.py
Convert: blender -b --disable-autoexec --python scripts/prepare-bmw.py
Pinned sources and generated asset hashes: public/licenses/bmw-m3.json.
"""
import bpy
import hashlib
import json
import math
import numpy as np
import struct
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path.cwd()
SOURCE = Path('/tmp/apex-assets')

def material(name, color, metal=0, roughness=.4, coat=0, opacity=1):
    surface = bpy.data.materials.new(name)
    surface.use_nodes = True
    shader = surface.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Coat Weight'].default_value = coat
    shader.inputs['Coat Roughness'].default_value = .12
    shader.inputs['Alpha'].default_value = opacity
    return surface

def texture(surface, image, color_space='sRGB'):
    if isinstance(image, str):
        image = bpy.data.images.load(str(SOURCE / image), check_existing=True)
    image.colorspace_settings.name = color_space
    node = surface.node_tree.nodes.new('ShaderNodeTexImage')
    node.image = image
    return node.outputs['Color']

def link(surface, image, input_name):
    tree = surface.node_tree
    tree.links.new(image, tree.nodes['Principled BSDF'].inputs[input_name])

def packed_atlas(name, pixels, color_space):
    height, width, _ = pixels.shape
    image = bpy.data.images.new(name, width, height, alpha=False)
    image.colorspace_settings.name = color_space
    image.pixels.foreach_set(pixels.astype(np.float32).ravel())
    image.pack()
    return image

def wheel_finish():
    # The original atlas places the rotor at the center of the tire island and
    # uses a plain tone for the alloy. Keep a single material/draw per wheel.
    size = 128
    y, x = np.mgrid[:size, :size] / size
    alloy = (x >= .51) & (y >= .49)
    rotor = (x - .25)**2 + (y - .75)**2 < .155**2
    pixels = np.zeros((size, size, 4))
    pixels[:, :, 1] = np.where(alloy, .27, np.where(rotor, .38, .78))
    pixels[:, :, 2] = np.where(alloy, .88, np.where(rotor, .75, .02))
    pixels[:, :, 3] = 1
    return packed_atlas('BMW wheel finish', pixels, 'Non-Color')

def tail_emission():
    # Use the original lamp's red reflector segmentation plus a horizontal
    # ribbing mask. Glowing areas leave the housing and clear segments dark.
    source = bpy.data.images.load(str(SOURCE / 'XZ_interior.png'), check_existing=True)
    width, height = source.size
    original = np.empty(width * height * 4, dtype=np.float32)
    source.pixels.foreach_get(original)
    rgba = original.reshape(height, width, 4)
    red, green, blue = rgba[:, :, :3].transpose(2, 0, 1)
    y, x = np.mgrid[:height, :width]
    section = (x >= width*.5) & (y >= height*.74)
    red_lens = np.clip((red - np.maximum(green, blue)*1.2) * 2.1, 0, 1)
    rib = np.where((y % 10) < 6, 1, .47)
    mask = section * red_lens * rib
    rgba = np.repeat(mask[:, :, None], 4, axis=2)
    rgba[:, :, 3] = 1
    return packed_atlas('BMW tail reflector mask', rgba, 'sRGB')

bpy.ops.wm.open_mainfile(filepath=str(SOURCE / 'bmw_m3_gt3.blend'), use_scripts=False)
for obj in list(bpy.data.objects):
    if obj.type != 'MESH':
        bpy.data.objects.remove(obj, do_unlink=True)

paint = material('Paint 1 BMW', (.36, .55, .68), .67, .23, coat=1)
link(paint, texture(paint, 'XZ_body_red.png'), 'Base Color')
interior = material('BMW interior', (.12, .12, .12), .12, .58)
link(interior, texture(interior, 'XZ_interior.png'), 'Base Color')
glass = material('Glass', (.035, .06, .08), .15, .095, coat=.35)
lamp_glass = material('BMW headlamp cover', (.5, .69, .83), .03, .075, coat=.4, opacity=.2)
head = material('Headlight', (.64, .82, 1), .15, .16)
projector = material('BMW projector optics', (.17, .24, .32), .72, .21, coat=.65)
tail = material('Brakelight', (.9, .23, .22), .04, .24, coat=.35)
link(tail, texture(tail, 'XZ_interior.png'), 'Base Color')
link(tail, texture(tail, tail_emission()), 'Emission Color')
tail.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 1
reverse = material('Reverse', (.7, .8, .9), .1, .2)

# Migrate the original road axes to Blender, then glTF Y-up/+Z-forward.
transform = Matrix(((0, -1, 0, 0), (1, 0, 0, .14), (0, 0, 1, .84), (0, 0, 0, 1)))
object_materials = {
    'XZ_body': ('BMW body', paint),
    'XZ_glass': ('BMW glass', glass),
    'XZ_interior': ('BMW interior', interior),
}
for obj in list(bpy.data.objects):
    name, surface = object_materials[obj.name]
    obj.data.transform(transform @ obj.matrix_world)
    obj.animation_data_clear()
    obj.constraints.clear()
    obj.parent = None
    obj.delta_rotation_euler = (0, 0, 0)
    obj.delta_scale = (1, 1, 1)
    obj.delta_location = (0, 0, 0)
    obj.matrix_world = Matrix.Identity(4)
    obj.data.materials.clear()
    obj.data.materials.append(surface)
    for face in obj.data.polygons:
        face.use_smooth = True
    obj.name = name
    if surface == glass:
        # The headlamp covers share the original glazing mesh.
        obj.data.materials.append(lamp_glass)
        for face in obj.data.polygons:
            if face.center.y < -1.65:
                face.material_index = 1
    if surface == interior:
        obj.data.materials.append(tail)
        obj.data.materials.append(projector)
        uv = obj.data.uv_layers.active.data
        for face in obj.data.polygons:
            if face.center.y > 1.2 and all(uv[i].uv.x > .5 and uv[i].uv.y > .74 for i in face.loop_indices):
                face.material_index = 1
            if face.center.y < -1.77 and .43 < abs(face.center.x) < .67 and .57 < face.center.z < .7:
                face.material_index = 2

with bpy.data.libraries.load(str(SOURCE / 'bmw_m3_gt3_wheel.blend'), link=False) as (_, target):
    target.objects = ['XZ_wheel', 'XZ_brake']
wheel, brake = target.objects
rim = material('BMW wheel', (1, 1, 1))
link(rim, texture(rim, 'XZ_Tire.png'), 'Base Color')
channels = rim.node_tree.nodes.new('ShaderNodeSeparateColor')
rim.node_tree.links.new(texture(rim, wheel_finish(), 'Non-Color'), channels.inputs['Color'])
link(rim, channels.outputs['Green'], 'Roughness')
link(rim, channels.outputs['Blue'], 'Metallic')
normal = rim.node_tree.nodes.new('ShaderNodeNormalMap')
normal.inputs['Strength'].default_value = .64
rim.node_tree.links.new(texture(rim, 'XZ_Tire_norm.png', 'Non-Color'), normal.inputs['Color'])
link(rim, normal.outputs['Normal'], 'Normal')
caliper = material('BMW caliper', (.41, .035, .016), .35, .24, coat=.45)

for axle, longitudinal in [('Front', 1.54), ('Rear', -1.15)]:
    for side, x in [('L', -.84), ('R', .84)]:
        pivot = bpy.data.objects.new('Wheel' + axle + side, None)
        bpy.context.collection.objects.link(pivot)
        pivot.location = (x, -longitudinal+.14, .389)
        for source, surface, label in [(wheel, rim, 'Wheel'), (brake, caliper, 'BrakePad')]:
            obj = bpy.data.objects.new(label + axle + side, source.data.copy())
            bpy.context.collection.objects.link(obj)
            obj.parent = pivot
            obj.scale = (1, 1.18, 1.18)
            # The source lug nuts and rotor are on the negative X face.
            if side == 'R':
                obj.rotation_euler.z = math.pi
            obj.data.materials.clear()
            obj.data.materials.append(surface)
            for face in obj.data.polygons:
                face.use_smooth = True
for obj in (wheel, brake):
    bpy.data.objects.remove(obj, do_unlink=True)

for side in (-1, 1):
    for number, (x, y, z, radius) in enumerate([
        (.488, -1.972, .628, .039), (.614, -1.897, .634, .043)
    ]):
        bpy.ops.mesh.primitive_torus_add(
            major_segments=20, minor_segments=4, major_radius=radius, minor_radius=.004,
            location=(side*x, y, z), rotation=(math.pi/2, 0, side*.28),
        )
        obj = bpy.context.object
        obj.name = f'Projector halo {side} {number}'
        obj.data.materials.append(head)

    # Seat the small reverse element on the curved tail-light geometry.
    origin = Vector((side*.44, 5, .81))
    ok, point, _, _ = bpy.data.objects['BMW interior'].ray_cast(origin, Vector((0, -1, 0)))
    if ok:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, location=(point.x, point.y+.012, point.z))
        obj = bpy.context.object
        obj.name = 'Reverse lamp'
        obj.scale = (.046, .008, .018)
        obj.data.materials.append(reverse)

bpy.ops.object.select_all(action='SELECT')
records = []
for lod in (False, True):
    if lod:
        # The ground plane / axle centers are kept by simplifying the rim and
        # body rather than altering the tires or wheel parent transforms.
        rim.node_tree.links.remove(normal.outputs['Normal'].links[0])
        # Small screen silhouettes do not need full-resolution cockpit
        # or reflector textures. Keep the body map sharp for chase cameras.
        for name in ('XZ_interior.png', 'BMW tail reflector mask'):
            image = bpy.data.images[name]
            width, height = image.size
            image.scale(width // 2, height // 2)
            image.pack()
        for obj in list(bpy.data.objects):
            if obj.type == 'MESH' and len(obj.data.polygons) > 250:
                bpy.context.view_layer.objects.active = obj
                modifier = obj.modifiers.new('Race LOD', 'DECIMATE')
                modifier.ratio = .54 if obj.name.startswith('Wheel') else .59
                modifier.use_collapse_triangulate = True
                bpy.ops.object.modifier_apply(modifier=modifier.name)
    path = ROOT / 'public/assets' / ('bmw-m3-lod.glb' if lod else 'bmw-m3.glb')
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format='GLB', export_animations=False, export_cameras=False,
        export_lights=False, export_yup=True, export_extras=False, use_selection=True,
    )
    data = path.read_bytes()
    document = json.loads(data[20:20 + struct.unpack_from('<I', data, 12)[0]])
    triangles = sum(document['accessors'][primitive['indices']]['count']//3
                    for mesh in document['meshes'] for primitive in mesh['primitives'])
    records.append({
        'triangles': triangles, 'file': str(path.relative_to(ROOT / 'public')),
        'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
    })

manifest_path = ROOT / 'public/licenses/bmw-m3.json'
manifest = json.loads(manifest_path.read_text())
manifest['modifications'] = (
    'Coordinate conversion, paint and dashboard atlas materials, exterior glass and headlamp covers, '
    'rigged outward-facing wheels and fixed calipers, rubber and alloy finishes, seated projector halos '
    'and reverse lamps, tail reflector mask, two detail levels. Performance and sound use game tuning.'
)
manifest['assets'] = records
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
