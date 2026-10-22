"""Optimize the CC-BY Car Concept asset with Blender 4.3+.
Input /tmp/CarConcept.glb; output public/assets/concept-car.glb.
Source and attribution: ASSET_LICENSES.md. Run from the project directory.
"""
import bpy, math, os, sys
race_lod="--race-lod" in sys.argv
from mathutils import Matrix
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/tmp/CarConcept.glb')
# Remove third-party badges; the game adds its own identification.
for name in ['License Plate','InteriorSteeringEmblem']:
    ob=bpy.data.objects.get(name)
    if ob: bpy.data.objects.remove(ob,do_unlink=True)
if race_lod:
    for ob in list(bpy.data.objects):
        if ob.name.startswith('Interior') or ob.name in ['Engine','Axles','BodyWindshieldWipers','BodyWindshieldWipersBase']:
            # Children have no useful exterior parts; preserve transforms of retained geometry.
            for child in list(ob.children):
                transform=child.matrix_world.copy();child.parent=None;child.matrix_world=transform
            bpy.data.objects.remove(ob,do_unlink=True)
bpy.context.view_layer.update()
# The showcase asset has 30-degree steering. Bake neutral steering for gameplay.
for name in ['WheelFrontL','WheelFrontR']:
    ob=bpy.data.objects[name]
    center=ob.matrix_world.translation.copy()
    ob.matrix_world=Matrix.Translation(center) @ Matrix.Rotation(math.radians(30),4,'Z') @ Matrix.Translation(-center) @ ob.matrix_world
bpy.context.view_layer.update()
# Preserve small cabin and rim details while reducing dense body surfaces.
for ob in list(bpy.data.objects):
    if ob.type!='MESH': continue
    if len(ob.data.polygons)>(300 if race_lod else 1200):
        bpy.context.view_layer.objects.active=ob
        mod=ob.modifiers.new('Web triangle budget','DECIMATE')
        mod.ratio=.20 if race_lod else .43
        mod.use_collapse_triangulate=True
        bpy.ops.object.modifier_apply(modifier=mod.name)
for image in bpy.data.images:
    limit=512 if race_lod else 1024
    if image.size[0]>limit or image.size[1]>limit:
        ratio=min(limit/image.size[0],limit/image.size[1])
        image.scale(round(image.size[0]*ratio),round(image.size[1]*ratio))
# Do not pay for transmission on six simultaneous vehicles; polished tinted glass.
for material in bpy.data.materials:
    if material.name=='Glass':
        for node in material.node_tree.nodes:
            if node.type=='BSDF_PRINCIPLED':
                node.inputs['Transmission Weight'].default_value=0
                node.inputs['Base Color'].default_value=(.018,.045,.065,1)
                node.inputs['Metallic'].default_value=.7
                node.inputs['Roughness'].default_value=.12
output=os.path.abspath('public/assets/concept-car-lod.glb' if race_lod else 'public/assets/concept-car.glb')
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_extras=False)
print('READY',output,os.path.getsize(output))
