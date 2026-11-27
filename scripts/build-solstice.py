"""Author the original Solstice GT, without importing an existing vehicle.
Blender 4.3+: blender -b --factory-startup --python scripts/build-solstice.py
Coordinates below use the game's x/right, y/up, z/front. Both GLBs are reproducible.
Original project geometry, released under CC0; see public/licenses/solstice.json.
"""
import bpy, bmesh, math, os, json, hashlib
from mathutils import Vector
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
import vehicle_primitives as primitives
from vehicle_primitives import box, disk, material, mesh, patch, point, torus, tube
ROOT=Path(__file__).resolve().parent.parent

# Smooth longitudinal proportions, deliberately distinct from Car Concept.
SECTIONS=[(-2.36,.76,.65),(-2.25,.96,.77),(-1.70,1.03,.86),(-1.32,1.05,.88),(-.75,.99,.84),(0,.94,.82),(.70,.97,.84),(1.42,1.03,.84),(1.85,.98,.73),(2.23,.89,.60),(2.36,.73,.54)]
def profile(z):
 for i,(a,b) in enumerate(zip(SECTIONS,SECTIONS[1:])):
  if a[0]<=z<=b[0]:
   t=(z-a[0])/(b[0]-a[0]);before=SECTIONS[max(0,i-1)];after=SECTIONS[min(len(SECTIONS)-1,i+2)];length=b[0]-a[0]
   return tuple((2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*(b[k]-before[k])/(b[0]-before[0])*length+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*(after[k]-a[k])/(after[0]-a[0])*length for k in [1,2])
 return SECTIONS[0][1:] if z<0 else SECTIONS[-1][1:]

def surface(x,z):
 w,h=profile(z);u=abs(x)/w;haunch=.065*math.exp(-((abs(z)-1.38)/.44)**2)
 return h+.045*(1-u*u)+haunch*math.exp(-((u-.76)/.22)**2)
def arch(z):
 h=.20
 for axle in [-1.34,1.43]:
  d=abs(z-axle)
  if d<.45:h=max(h,.40+math.sqrt(max(0,.45**2-d*d)))
 return h

def build(low):
 global LOW;LOW=low;primitives.LOW=low;bpy.ops.wm.read_factory_settings(use_empty=True)
 paint=material('Paint 1',(.035,.19,.21),.68,.27);carbon=material('Carbon',(.018,.023,.027),.25,.38);rubber=material('Tire',(.012,.014,.017),0,.88);rim=material('Rim2',(.44,.52,.57),.88,.25);dark=material('Grille',(.009,.013,.016),.35,.48);glass=material('Glass',(.025,.07,.09),.55,.13);chrome=material('Brightwork',(.57,.65,.7),.92,.21);brake=material('Brakelight',(.4,.01,.018),.15,.22,(1,.01,.02));lamp=material('Headlight',(.7,.85,1),.2,.18,(.7,.9,1));reverse=material('Reverse',(.5,.6,.7),.15,.22);interior=material('Interior',(.045,.055,.06),0,.8);stitch=material('Interior 3',(.15,.28,.29),0,.8);caliper=material('Caliper',(.7,.22,.03),.45,.34)
 nz=112 if not LOW else 68;nx=28 if not LOW else 16
 patch('body-shell',lambda u,v:( (2*v-1)*profile(-2.36+u*4.72)[0],surface((2*v-1)*profile(-2.36+u*4.72)[0],-2.36+u*4.72),-2.36+u*4.72),nz,nx,paint)
 for side in [-1,1]:
  def flank(u,v):
   z=-2.36+u*4.72;w,_=profile(z);bottom=arch(z);top=surface(w,z);return (side*(w-.055*math.sin(v*math.pi)-.055*v),top*(1-v)+bottom*v,z)
  patch('Sculpted flank',flank,nz,8 if not LOW else 4,paint)
  # Wheel openings are real geometry, with thin rolled lips and black inner liners.
  for axle in [-1.34,1.43]:
   pts=[]
   for i in range(45 if not LOW else 25):
    a=math.pi*i/(44 if not LOW else 24);z=axle+.45*math.cos(a);pts.append((side*(profile(z)[0]-.047),.40+.45*math.sin(a),z))
   tube('Rolled wheel arch',pts,.015,paint)
  box('Carbon sill',(.065,.095,1.85),(side*.943,.20,.06),carbon,.02)
  # Continuous roof/window frame: long bonnet, rearward cabin, fastback rear glass.
  outline=[(side*.85,.85,.76),(side*.70,1.29,.10),(side*.66,1.32,-.63),(side*.84,.87,-1.36)]
  tube('Cabin frame',outline,.036,paint,cyclic=True)
  mesh('Side glass',[(side*.837,.877,.68),(side*.687,1.268,.075),(side*.65,1.29,-.61),(side*.817,.89,-1.28)],[(0,1,2,3)],glass)
  tube('Window gasket',[(side*.841,.862,.72),(side*.698,1.286,.10),(side*.665,1.312,-.63),(side*.837,.88,-1.34)],.012,carbon,cyclic=True)
  tube('Window quarter divider',[(side*.675,1.30,-.52),(side*.832,.88,-.72)],.019,carbon)
  # Door gaps and flush handles on the curved side.
  pts=[]
  for z,y in [(.70,.83),(.67,.64),(.57,.34),(.35,.28),(-.65,.28),(-.94,.42),(-1.01,.78)]:pts.append((side*(profile(z)[0]-.025),y,z))
  tube('Door shutline',pts,.006,dark)
  box('Flush handle',(.014,.025,.15),(side*.97,.75,-.69),chrome,.007)
  tube('Mirror arm',[(side*.81,.94,.52),(side*1.055,.99,.52)],.025,carbon)
  box('Mirror housing',(.24,.11,.19),(side*1.10,1.01,.51),paint,.045)
  box('Mirror glass',(.18,.065,.008),(side*1.10,1.015,.41),chrome,.015)
  # Narrow swept light lenses mounted on the front shoulders.
  lens=[(side*x,surface(x,z)+.008,z) for x,z in [(.57,2.235),(.86,2.01),(.87,1.88),(.62,2.10)]]
  mesh('Front smoked lens',lens,[(0,1,2,3)],dark)
  for offset in [0,.045]:tube('Front blade LED',[(side*(.62+i*.22/16),surface(.62+i*.22/16,2.19-i*.20/16-offset)+.016,2.19-i*.20/16-offset) for i in range(17)],.012,lamp)
  # Hood creases follow the actual body surface.
  tube('Bonnet shutline',[(side*(.48+.10*i/30),surface(.48+.10*i/30,.80+i*1.18/30)+.004,.80+i*1.18/30) for i in range(31)],.0045,dark)
  tube('Rear blade LED',[(side*(.13+i*.72/24),.696+i*.027/24,-2.36+.075*(i/24)**2) for i in range(25)],.018,brake)
  box('Reverse-lamp',(.11,.027,.018),(side*.28,.49,-2.405),reverse,.006)
  # Two circular exhausts, with dark recessed mouths.
  disk('Exhaust tip',(side*.69,.29,-2.30),.09,.12,chrome).rotation_euler=(math.pi/2,0,0)
  disk('Exhaust mouth',(side*.69,.29,-2.37),.068,.008,dark).rotation_euler=(math.pi/2,0,0)
 # Roof, curved windshield and sloped rear glass.
 patch('Roof',lambda u,v:((2*v-1)*(.70-.04*u),1.30+.035*math.sin(v*math.pi)+.02*math.sin(u*math.pi),.10-u*.74),20 if not LOW else 10,24 if not LOW else 12,paint)
 patch('Windshield',lambda u,v:((2*v-1)*(.84-.14*u),.86+.43*u+.02*math.sin(v*math.pi),.75-.65*u-.025*math.sin(v*math.pi)),16,20,glass)
 patch('Fastback glass',lambda u,v:((2*v-1)*(.66+.18*u),1.31-.44*u+.02*math.sin(v*math.pi),-.64-.72*u),16,20,glass)
 # Solid front and rear fascia, recessed intake and carbon splitter.
 for z,sgn in [(2.355,1),(-2.355,-1)]:
  mesh('Painted fascia',[(-.74,.21,z),(.74,.21,z),(.76,.55 if sgn>0 else .65,z),(-.76,.55 if sgn>0 else .65,z)],[(0,1,2,3)],paint)
  box('Recessed intake' if sgn>0 else 'Rear diffuser', (1.24,.25,.07),(0,.365,z+sgn*.008),dark,.055)
  box('Splitter' if sgn>0 else 'Diffuser lip',(1.64,.045,.23),(0,.19,z-sgn*.045),carbon,.025)
  for i in range(-9,10):box('Grille fin',(.012,.16,.018),(i*.061,.36,z+sgn*.051),carbon,.003)
 for x in [-.58,-.29,0,.29,.58]:box('Diffuser strake',(.025,.12,.38),(x,.205,-2.25),carbon,.008)
 # Thin ducktail integrated into the deck, separate from the older tall wings.
 tube('Ducktail',[(-.93+i*1.86/40,.81-.025*math.cos(i*math.pi/20),-2.20+.09*((i-20)/20)**2) for i in range(41)],.039,paint)
 box('Cabin floor',(1.6,.10,1.8),(0,.34,-.35),interior,.04)
 box('Dashboard',(1.55,.22,.31),(0,.78,.57),interior,.08)
 for side in [-1,1]:
  box('Seat cushion',(.48,.13,.55),(side*.42,.48,-.29),interior,.07);box('Seat back',(.47,.53,.13),(side*.42,.80,-.59),interior,.075);box('Headrest',(.25,.19,.12),(side*.42,1.05,-.59),stitch,.055)
 box('Console',(.19,.22,.80),(0,.56,-.10),carbon,.03)
 if not LOW:
  tube('Steering wheel',[( -.42+.155*math.cos(i*math.pi/24),.87+.155*math.sin(i*math.pi/24),.35) for i in range(48)],.019,interior,cyclic=True)
 # Each wheel is independently rigged with fixed calipers and rotating hubs.
 for front,axle in [(False,-1.34),(True,1.43)]:
  for side in [-1,1]:
   center=(side*.952,.395,axle);name=('WheelFront' if front else 'WheelRear')+('L' if side<0 else 'R')
   parent=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(parent);parent.location=point(center);bpy.context.view_layer.update()
   torus('Tire shoulder',center,.291,.086,rubber,parent,1.47)
   disk('Wheel barrel',center,.294,.22,dark,parent)
   face=(side*1.065,.395,axle);torus('Forged rim lip',face,.266,.014,rim,parent);disk('Brake disc',(side*1.035,.395,axle),.235,.012,chrome,parent)
   disk('Center lock',(side*1.075,.395,axle),.058,.024,chrome,parent)
   for i in range(10):
    a=i*math.pi/5
    for branch in [-1,1]:
     pts=[(side*1.078,.395+math.sin(a)*.055,axle+math.cos(a)*.055),(side*1.068,.395+math.sin(a+branch*.08)*.16,axle+math.cos(a+branch*.08)*.16),(side*1.062,.395+math.sin(a+branch*.14)*.257,axle+math.cos(a+branch*.14)*.257)]
     tube('Split spoke',pts,.012 if LOW else .014,rim,parent)
   box('BrakePad',(.05,.17,.085),(side*1.04,.395,axle+.195),caliper,.02,parent)
   if not LOW:
    for i in range(36):
     a=i*math.pi/18
     for radius in [.18,.21]:disk('Disc drill',(side*1.045,.395+math.sin(a)*radius,axle+math.cos(a)*radius),.005,.002,dark,parent)
    for i in range(48):
     a=i*math.pi/24;tube('Tread groove',[(side*.952+dx,.395+math.sin(a+dx*.35)*.378,axle+math.cos(a+dx*.35)*.378) for dx in [-.06,0,.06]],.003,carbon,parent)
 bpy.context.view_layer.update()
 # Material batches happen at runtime; preserve wheel pivots and object names.
 path=ROOT/'public/assets'/('solstice-gt-lod.glb' if LOW else 'solstice-gt.glb')
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_extras=False)
 tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.data.objects if o.type=='MESH')
 print('SOLSTICE',path.name,path.stat().st_size,tris)
 return {'file':'assets/'+path.name,'bytes':path.stat().st_size,'triangles':tris,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
assets=[build(False),build(True)]
(ROOT/'public/licenses/solstice.json').write_text(json.dumps({'name':'Solstice GT','author':'APEX RUSH project','license':'CC0-1.0','source':'scripts/build-solstice.py','description':'Original long-bonnet grand tourer authored for APEX RUSH. No imported vehicle geometry, textures or manufacturer branding. High and race LOD share design and wheel rig.','assets':assets},indent=2)+'\n')
