"""Author the original Aurel Orion R and its race LOD with Blender 4.3+."""
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
sys.path.insert(0,str(Path(__file__).resolve().parent))
from vehicle_primitives import box, disk, material, mesh, patch, point, torus, tube

ROOT = Path(__file__).resolve().parents[1]
FRONT_AXLE, REAR_AXLE = 1.44, -1.46
RADIUS = .38

# Each station specifies longitudinal position, shoulder width, hood height and shoulder height.
STATIONS = [
    (-2.43, .75, .57, .53), (-2.27, 1.01, .70, .69), (-1.73, 1.08, .77, .88),
    (-1.36, 1.09, .83, .90), (-.91, 1.03, .85, .78), (-.38, .97, .82, .64),
    (.13, .95, .81, .65), (.64, .95, .76, .75), (1.20, 1.02, .70, .88),
    (1.51, 1.05, .65, .87), (1.88, 1.00, .57, .75), (2.26, .89, .49, .56),
    (2.40, .66, .43, .45),
]

def profile(z):
    """Interpolate long body panels with continuous slopes between stations."""
    for i, (a, b) in enumerate(zip(STATIONS, STATIONS[1:])):
        if a[0] <= z <= b[0]:
            t = (z-a[0]) / (b[0]-a[0])
            p, n = STATIONS[max(0, i-1)], STATIONS[min(len(STATIONS)-1, i+2)]
            width = b[0]-a[0]
            return tuple(
                (2*t**3-3*t*t+1)*a[k] + (t**3-2*t*t+t)*(b[k]-p[k])/(b[0]-p[0])*width +
                (-2*t**3+3*t*t)*b[k] + (t**3-t*t)*(n[k]-a[k])/(n[0]-a[0])*width
                for k in (1, 2, 3)
            )
    return STATIONS[0][1:] if z < 0 else STATIONS[-1][1:]

def deck(x, z):
    width, hood, shoulder = profile(z)
    u = min(1, abs(x)/width)
    mix = u**3.6
    return hood*(1-mix) + shoulder*mix + .018*math.sin(math.pi*u)

def sill(z):
    for axle in (FRONT_AXLE, REAR_AXLE):
        distance = abs(z-axle)
        if distance < .45:
            return .36 + math.sqrt(.45**2-distance**2)
    return .17

def flank(z, v, side):
    width, _, shoulder = profile(z)
    floor = min(shoulder-.012, sill(z))
    # A tightly tucked waist creates an undercut ahead of the rear haunches.
    scallop = .17*math.exp(-((z+.55)/.48)**2)
    return (side*(width-(.125+scallop)*math.sin(v*math.pi*.74)),
            shoulder*(1-v)+floor*v, z)

def shape_distance(u):
    return STATIONS[0][0] + u*(STATIONS[-1][0]-STATIONS[0][0])

def section(name, points, mat):
    return mesh(name, points, [tuple(range(len(points)))], mat, smooth=False)

def shell(low, mats):
    paint, accent, dark, carbon = (mats[n] for n in ('paint','accent','dark','carbon'))
    count = 126 if not low else 76
    patch('Formed aluminium upper', lambda u,v: ((x := (2*v-1)*profile(z := shape_distance(u))[0]), deck(x,z), z),
          count, 30 if not low else 18, paint)
    for side in (-1, 1):
        patch('Undercut sill', lambda u,v: flank(shape_distance(u),v,side), count, 12 if not low else 6, paint)
        for axle in (FRONT_AXLE, REAR_AXLE):
            positions = []
            for i in range(35 if low else 59):
                theta = math.pi*i/(34 if low else 58)
                z = axle+.445*math.cos(theta)
                x,y,z = flank(z,1,side)
                positions.append((x,y,z))
            tube('Rolled fender lip',positions,.017,paint)
        tube('Forged-carbon side skirt',[(side*.796,.16,1.0),(side*.853,.14,.73),(side*.889,.14,-.72),(side*.941,.18,-1.0)],.043,carbon)
        # Insets follow the curved side surface, between the front and rear wheel openings.
        opening = [flank(z,v,side) for z,v in [(-.94,.14),(-.69,.30),(-.23,.55),(.03,.71),(-.66,.81),(-.90,.65)]]
        section('Side radiator inlet',[(x+side*.009,y,z) for x,y,z in opening],dark)
        tube('Intake bevel', [(x+side*.016,y,z) for x,y,z in opening], .013, accent, cyclic=True)
        for t in range(6):
            z=-.87+t*.067
            tube('Intake vane',[flank(z,.53,side),flank(z-.06,.68,side)],.012,carbon)
        seam = [flank(z,v,side) for z,v in [(1.00,.58),(.73,.87),(.34,.93),(-.43,.91),(-.81,.81)]]
        tube('Door cut',[(x+side*.006,y,z) for x,y,z in seam],.005,dark)
        h = flank(-.58,.20,side)
        box('Flush latch',(.021,.035,.15),(h[0]+side*.006,h[1],h[2]),accent,.012)
        tube('Camera mirror arm',[(side*.69,1.06,.67),(side*.98,1.04,.71)],.017,carbon)
        box('Camera mirror pod',(.16,.060,.16),(side*1.02,1.04,.72),paint,.026)
    # Close the underside and both fascia sections, behind separate grille and splitter assemblies.
    box('Flat floor', (1.45,.065,4.52),(0,.198,-.03),carbon,.024)
    for front,z in ((True,2.385),(False,-2.415)):
        sign = 1 if front else -1
        width,hood,shoulder=profile(z)
        patch('Bumper skin',lambda u,v: ((x := (2*v-1)*width),.22*(1-u)+deck(x,z)*u,z+sign*.018*u),
              5, 26 if not low else 14,paint)
        box('Recessed bumper', (1.28,.23,.13),(0,.34,z+sign*.008),dark,.046)
        box('Splitter' if front else 'Diffuser lip',(1.61,.048,.26),(0,.175,z-sign*.012),carbon,.019)
        for i in range(-6,7):
            box('Grille vein',(.015,.13,.024),(i*.085,.335,z+sign*.078),accent,.005)
    for x in (-.58,-.36,-.15,.15,.36,.58):
        box('Damped diffuser strake',(.022,.115,.51),(x,.196,-2.20),carbon,.009)

def greenhouse(low, mats):
    paint, dark, glass, cockpit, textile, carbon = (mats[n] for n in ('paint','dark','glass','cockpit','textile','carbon'))
    # Forward canopy flows into a raised engine spine and leaves the outer flying buttresses open.
    patch('Canopy roof', lambda u,v: ((2*v-1)*(.55-.055*u),1.333+.037*math.sin(v*math.pi)+.012*math.sin(u*math.pi),.40-u*.89),
          19 if not low else 11, 18 if not low else 10,paint)
    patch('Laminated windshield', lambda u,v: ((2*v-1)*(.74-.19*u),.777+.556*u+.035*math.sin(v*math.pi),
          1.012-u*.61-.046*math.sin(v*math.pi)),22 if not low else 13,24 if not low else 14,glass)
    patch('Engine cover glass',lambda u,v:((2*v-1)*(.495+.107*u),1.332-.487*u+.034*math.sin(v*math.pi),-.49-u*.96),
          16 if not low else 10,18 if not low else 12,glass)
    for side in (-1,1):
        frame=[(side*.739,.781,1.010),(side*.549,1.335,.4),(side*.496,1.331,-.49),(side*.602,.846,-1.45),(side*.747,.797,-.43)]
        section('Flush side glass',frame,glass)
        tube('Painted roof rail',frame,.020,paint,cyclic=True)
        tube('Canopy pillar',[(side*.505,1.33,-.36),(side*.700,.836,-.59)],.020,dark)
        patch('Flying buttress',lambda u,v:(side*(.51+u*.43+(v-.5)*(.104-.023*u)),1.30-.43*u+.04*math.sin(math.pi*v),-.47-u*1.12),20,10 if not low else 5,paint)
        box('Seat cushion',(.42,.12,.47),(side*.36,.54,.10),cockpit,.045)
        seat=box('Bucket seat shell',(.46,.57,.15),(side*.36,.83,-.20),carbon,.058)
        seat.rotation_euler.x=math.radians(9)
        box('Seat insert',(.31,.34,.08),(side*.36,.85,-.11),textile,.038)
        box('Head restraint',(.22,.15,.15),(side*.36,1.10,-.23),textile,.032)
    box('Cockpit tub',(1.40,.11,1.15),(0,.46,.15),cockpit,.036)
    box('Instrument cowl',(1.31,.20,.27),(0,.783,.67),cockpit,.067)
    box('Console',(.20,.20,.74),(0,.67,.05),carbon,.042)
    tube('Steering wheel',[(-.361+.151*math.cos(i*math.tau/40),.905+.128*math.sin(i*math.tau/40),.47) for i in range(40)],.018,cockpit,cyclic=True)
    box('Steering hub',(.20,.043,.037),(-.361,.905,.47),mats['accent'],.009)
    for i in range(8):
        box('Engine scoop louver',(.64,.029,.027),(0,.910-.013*i,-1.16-.10*i),carbon,.008)

def lighting(low, mats):
    dark, lamps, rear, reverse, alloy, carbon = (mats[n] for n in ('dark','lamps','rear','reverse','alloy','carbon'))
    for side in (-1,1):
        outline = [(side*x,deck(x,z)+.010,z) for x,z in [(.46,2.28),(.68,2.27),(.91,1.96),(.90,1.69),(.77,1.74),(.60,2.03)]]
        section('Smoked headlight housing',outline,dark)
        for line in [(.65,2.23,.88,1.96),(.875,1.93,.875,1.74),(.51,2.205,.66,2.19)]:
            a,z0,b,z1=line
            tube('Blade headlight',[(side*(x:=a+(b-a)*i/16),deck(x,z:=z0+(z1-z0)*i/16)+.023,z) for i in range(17)],.012,lamps)
        # Double rear light signature runs under a raised lip with an air gap below it.
        for j in [0,1]:
            tube('Dual rear light bar',[(side*(.12+i*.80/26),.570+j*.064+.057*(i/26)**3,-2.472+.103*(i/26)**3) for i in range(27)],.013,rear)
        box('Reverse lens',(.126,.028,.022),(side*.35,.475,-2.485),reverse,.009)
        disk('Exhaust surround',(side*.29,.355,-2.474),.087,.068,alloy).rotation_euler=(math.pi/2,0,0)
        disk('Exhaust core',(side*.29,.355,-2.511),.064,.018,dark).rotation_euler=(math.pi/2,0,0)
        box('Wing mount',(.05,.136,.12),(side*.59,.76,-2.123),carbon,.011)
    patch('Swan tail',lambda u,v:((2*v-1)*(.92-.039*u),.829+.039*u+.048*abs(2*v-1)**3,-2.088-.251*u+.07*abs(2*v-1)),10,28 if not low else 17,carbon)

def wheels(low,mats):
    for axle,label in ((FRONT_AXLE,'Front'),(REAR_AXLE,'Rear')):
        for side,suffix in ((-1,'L'),(1,'R')):
            center=(side*.931,RADIUS,axle)
            pivot=bpy.data.objects.new('Wheel'+label+suffix,None)
            bpy.context.collection.objects.link(pivot)
            pivot.location=point(center)
            bpy.context.view_layer.update()
            def at(x,y=0,z=0):
                return (center[0]+side*x,center[1]+y,center[2]+z)
            torus('Radial tire',center,.286,.094,mats['rubber'],pivot,1.52 if label=='Rear' else 1.39)
            disk('Dark barrel',center,.278,.213,mats['dark'],pivot)
            torus('Forged outer lip',at(.121),.270,.016,mats['alloy'],pivot)
            disk('Carbon ceramic disc',at(.094),.229,.009,mats['disc'],pivot)
            disk('Center lock cap',at(.129),.065,.027,mats['alloy'],pivot)
            for i in range(9):
                a=i*math.tau/9
                for off in [-.15,.15]:
                    command=[(.138,.060,a),(.119,.145,a+off*.25),(.120,.261,a+off)]
                    tube('Y spoke',[at(x,r*math.sin(t),r*math.cos(t)) for x,r,t in command],.012,mats['alloy'],pivot)
            caliper=box('BrakePad fixed',(.055,.142,.083),at(.10,.084,-.194),mats['caliper'],.024,pivot)
            caliper.rotation_euler.x=math.radians(20)
            if not low:
                for i in range(24):
                    a=i*math.tau/24
                    tube('Circumferential tread cut',[at(x,RADIUS*math.sin(a+x*.55),RADIUS*math.cos(a+x*.55)) for x in [-.106,-.05,0,.05,.106]],.003,mats['carbon'],pivot)

def build(low, library):
    library.LOW=low
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats = dict(
        paint=material('Paint 1',(.44,.26,.098),.7,.24),
        accent=material('Champagne brightwork',(.48,.38,.24),.72,.28),
        dark=material('Grille',(.009,.012,.016),.28,.43),
        carbon=material('Carbon',(.021,.030,.041),.55,.34),
        glass=material('Glass',(.04,.08,.10),.35,.11),
        cockpit=material('Interior',(.023,.031,.038),.1,.74),
        textile=material('Interior 3',(.27,.17,.095),.02,.73),
        rubber=material('Tire',(.016,.018,.021),.02,.84),
        alloy=material('Rim2',(.38,.34,.27),.86,.23),
        disc=material('Ceramic rotor',(.22,.25,.29),.45,.54),
        caliper=material('Caliper',(.84,.108,.033),.34,.24),
        lamps=material('Headlight',(.7,.87,1),.35,.19,(.62,.85,1)),
        rear=material('Brakelight',(.53,.010,.028),.37,.19,(1,.014,.045)),
        reverse=material('Reverse',(.75,.80,.87),.2,.21),
    )
    # Lamps and glass are thin optical surfaces and read on both sides.
    mats['glass'].use_backface_culling=False
    shell(low,mats)
    greenhouse(low,mats)
    lighting(low,mats)
    wheels(low,mats)
    filename = 'orion-r-lod.glb' if low else 'orion-r.glb'
    path = ROOT/'public/assets'/filename
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_animations=False,
                             export_cameras=False,export_lights=False,export_yup=True,export_extras=False)
    tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.data.objects if o.type=='MESH')
    return {'file':'assets/'+filename,'bytes':path.stat().st_size,'triangles':tris,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}

if __name__ == '__main__':
    import vehicle_primitives as library
    assets = [build(False,library),build(True,library)]
    metadata = {'name':'Aurel Orion R','author':'APEX RUSH project','license':'CC0-1.0','source':'scripts/build-orion.py',
                'description':'Original hypercar geometry and materials. Four independently rigged wheels, fixed brake calipers, separate race LOD, no imported manufacturer geometry or logos.',
                'assets':assets}
    (ROOT/'public/licenses/orion-r.json').write_text(json.dumps(metadata,indent=2)+'\n')
