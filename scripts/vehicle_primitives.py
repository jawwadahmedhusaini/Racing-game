"""Shared Blender mesh helpers for original APEX RUSH vehicles."""
import bpy, bmesh, math

LOW = False

def point(p): return (p[0],-p[2],p[1])
def material(name,color,metal=0,rough=.4,emission=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 if name=='Paint 1':n.inputs['Coat Weight'].default_value=1;n.inputs['Coat Roughness'].default_value=.12
 if emission:n.inputs['Emission Color'].default_value=(*emission,1);n.inputs['Emission Strength'].default_value=2
 return m

def mesh(name,vertices,faces,mat,smooth=True,parent=None):
 data=bpy.data.meshes.new(name);data.from_pydata([point(p) for p in vertices],[],faces);data.update()
 bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat)
 for p in data.polygons:p.use_smooth=smooth
 if parent:ob.parent=parent;ob.matrix_parent_inverse=parent.matrix_world.inverted()
 return ob

def box(name,size,pos,mat,bevel=.025,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=point(pos));ob=bpy.context.object;ob.name=name;ob.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(mat)
 if bevel:
  mod=ob.modifiers.new('Machined edges','BEVEL');mod.width=bevel;mod.segments=2 if LOW else 3;bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 if parent:ob.parent=parent;ob.matrix_parent_inverse=parent.matrix_world.inverted()
 return ob

def tube(name,points,radius,mat,parent=None,cyclic=False):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=radius;curve.resolution_u=1;curve.bevel_resolution=1 if LOW else 2
 spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
 for p,co in zip(spline.points,points):p.co=(*point(co),1)
 spline.use_cyclic_u=cyclic
 ob=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat)
 bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.convert(target='MESH');ob.select_set(False)
 if parent:ob.parent=parent;ob.matrix_parent_inverse=parent.matrix_world.inverted()
 return ob

def torus(name,center,major,minor,mat,parent=None,depth=1):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=32 if LOW else 64,minor_segments=8 if LOW else 12,location=point(center),rotation=(0,math.pi/2,0));ob=bpy.context.object;ob.name=name;ob.scale.z=depth;ob.data.materials.append(mat)
 for p in ob.data.polygons:p.use_smooth=True
 if parent:ob.parent=parent;ob.matrix_parent_inverse=parent.matrix_world.inverted()
 return ob

def disk(name,center,radius,depth,mat,parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=8 if name=='Disc drill' else 32 if LOW else 64,radius=radius,depth=depth,location=point(center),rotation=(0,math.pi/2,0));ob=bpy.context.object;ob.name=name;ob.data.materials.append(mat)
 for p in ob.data.polygons:p.use_smooth=len(p.vertices)==4
 if parent:ob.parent=parent;ob.matrix_parent_inverse=parent.matrix_world.inverted()
 return ob

def patch(name,fn,nu,nv,mat):
 vertices=[fn(i/nu,j/nv) for i in range(nu+1) for j in range(nv+1)];faces=[]
 for i in range(nu):
  for j in range(nv):a=i*(nv+1)+j;faces.append((a,a+1,a+nv+2,a+nv+1))
 return mesh(name,vertices,faces,mat)
