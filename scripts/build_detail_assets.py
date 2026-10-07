"""Detail one authored model at a time, retaining editable Blender sources.
blender --background --python scripts/build_detail_assets.py -- --model vela-gt
Available: vela-gt, last-light-station, horizon-lodge, pacific-point, traffic, forest, all.
"""
import sys, math, bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
base=(ROOT/'scripts/build_juice_assets.py').read_text()
exec(base[:base.index('# PASS TWO')])
base_export=export

def torus(name,loc,r,t,m,rotation=(0,0,0),segments=32):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=segments,minor_segments=6,location=loc,rotation=rotation)
    return finish(bpy.context.object,name,m,0,True)

def surface(m,kind,scale=1):
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(1,1,1,1)
    for suffix,socket in [('color','Base Color'),('rough','Roughness'),('normal','Normal')]:
        im=bpy.data.images.load(str(OUT/'detail'/(kind+'-'+suffix+'.png')),check_existing=True);im.pack()
        if suffix!='color':im.colorspace_settings.name='Non-Color'
        n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=im;n.extension='REPEAT'
        if suffix=='normal':
            normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.45
            m.node_tree.links.new(n.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs['Normal'],p.inputs[socket])
        else:m.node_tree.links.new(n.outputs['Color'],p.inputs[socket])
    for o in bpy.context.scene.objects:
        if o.type!='MESH' or m not in list(o.data.materials):continue
        uv=o.data.uv_layers.active or o.data.uv_layers.new(name='Meter scaled surface UV')
        for poly in o.data.polygons:
            axis=max(range(3),key=lambda i:abs(poly.normal[i]));axes=[i for i in range(3) if i!=axis]
            for li in poly.loop_indices:
                v=o.matrix_world@o.data.vertices[o.data.loops[li].vertex_index].co
                uv.data[li].uv=(v[axes[0]]*scale,v[axes[1]]*scale)

def vela():
    seal=carbon
    for side in [-1,1]:
        for y in [-1.45,1.45]:
            points=[(side*.975,y+.444*math.cos(a),-.29+.444*math.sin(a)) for a in [i*math.pi/24 for i in range(25)]]
            for a,b in zip(points,points[1:]):rod('Rolled wheel arch lip',a,b,.009,paint,6)
        # Seat bolsters, stitching, headrests, belt anchors.
        box('Separate head restraint',(side*.34,-.39,.80),(.27,.095,.15),leather,.035)
        for x in [side*.34-.17,side*.34+.17]:
            box('Seat side bolster',(x,-.10,.46),(.07,.44,.12),leather,.027)
            rod('Seat piping',(x,-.422,.47),(x,-.422,.72),.004,ivory,6)
        rod('Safety belt webbing',(side*.58,-.40,.74),(side*.14,.02,.42),.013,carbon)
        box('Mirror turn repeater',(side*.98,.855,.428),(.155,.008,.013),head,.003)
        box('Amber side marker',(side*.955,1.78,.10),(.009,.075,.027),head,.004)
        # Quarter panel reflection breaks, fuel flap on right rear.
        if side==1:
            box('Recessed fuel filler',(side*.984,-1.10,.14),(.012,.19,.12),carbon,.026)
            box('Fuel filler lid',(side*.991,-1.10,.143),(.009,.17,.10),paint,.024)
    for x in [-.32,.29]:
        rod('Wiper arm',(x,.90,.349),(x-.14,.75,.54),.007,carbon)
        rod('Wiper blade',(x-.31,.756,.548),(x+.13,.756,.548),.008,carbon)
    torus('Leather wrapped steering rim',(-.34,.36,.57),.135,.016,carbon,(math.pi/2-.3,0,0))
    box('Steering boss',(-.34,.355,.565),(.13,.07,.065),chrome,.015)
    for sign in [-1,1]:rod('Steering spoke',(-.34,.35,.57),(-.34+sign*.11,.35,.59),.010,chrome)
    screen=mat('Instrument illumination',(.11,.40,.34),0,.5,.6)
    box('Recessed instrument binnacle',(-.34,.54,.53),(.35,.11,.15),carbon,.025)
    box('Gauge face',(-.34,.478,.548),(.29,.005,.09),screen,.005)
    box('Infotainment bezel',(.10,.515,.53),(.22,.08,.14),carbon,.012)
    box('Infotainment display',(.10,.472,.53),(.18,.004,.10),screen,.002)
    for x in [-.51,-.16,.38]:box('Dashboard vent',(x,.502,.457),(.12,.015,.043),carbon,.005)
    rod('Gear selector',(0,.14,.47),(0,.14,.58),.014,chrome)
    box('Gear grip',(0,.14,.595),(.055,.07,.05),leather,.018)
    for y in [-.07,-.22]:torus('Console cup well',(0,y,.48),.046,.005,chrome)
    for x in [-.30,.30]:
        box('Visor',(x,.54,.735),(.32,.09,.025),leather,.008)
    for x in [-.25,.25]:
        for i in range(13):rod('Rear screen demister',(x-.23,-.964+i*.029,.315+i*.035),(x+.23,-.964+i*.029,.315+i*.035),.0015,chrome,4)
    # Recessed radiator mesh and tow hook cover.
    for x in [i*.037 for i in range(-11,12)]:rod('Radiator mesh vertical',(x,2.116,-.16),(x,2.116,-.055),.0025,carbon,4)
    for z in [-.15,-.12,-.09,-.06]:rod('Radiator mesh horizontal',(-.43,2.116,z),(.43,2.116,z),.0025,carbon,4)
    box('Front tow eye cover',(.67,2.084,-.018),(.08,.012,.035),paint,.008)

def station():
    black=mat('Station rubber and asphalt',(.025,.028,.025),0,.91)
    for x in [-3.5,3.5]:
        for j,y in enumerate([-4.8,-3.2]):
            text('Pump digits','38.42',(x,y-.357,1.77),.082,light)
            text('Pump label','UNLEADED',(x,y-.36,1.39),.052,teal)
            text('Pump number',str(1+j+(2 if x>0 else 0)),(x,y-.36,1.99),.11,teal)
            for dx in [-.17,0,.17]:box('Grade selection key',(x+dx,y-.355,1.47),(.055,.012,.041),black,.006)
            box('Nozzle cradle',(x+.46,y-.12,1.51),(.08,.13,.24),black,.017)
            rod('Nozzle handle',(x+.52,y-.14,1.36),(x+.52,y-.14,1.61),.025,steel)
            rod('Nozzle spout',(x+.52,y-.14,1.61),(x+.40,y-.14,1.73),.016,steel)
    for x in [-5.8,5.8]:
        rod('Shop rainwater downpipe',(x,8.58,.35),(x,8.58,4.47),.045,steel)
        box('Rain gutter',(x,5,4.37),(.10,7.5,.12),steel,.012)
    for x in [-3,2]:
        box('Rooftop HVAC',(x,6.5,4.97),(1.7,1.2,.55),steel,.025)
        for i in range(9):box('HVAC intake louver',(x-.65+i*.16,5.89,4.98),(.055,.025,.36),teal,.004)
        torus('HVAC fan guard',(x,6.5,5.255),.34,.022,teal)
    box('Electrical service cabinet',(6.06,7.5,1.5),(.13,1.0,1.5),steel)
    rod('Meter conduit',(6.10,7.5,2.2),(6.10,7.5,4.3),.025,steel)
    for z in [.31,.49,.67]:box('Plinth brick course',(0,1.38,z),(12,.16,.12),wood,.007)
    # Cafe counter and products are modeled against glazing, with window transoms.
    for x in [-4,4]:
        box('Window cafe counter',(x,1.24,1.20),(1.80,.2,.12),wood,.02)
        for dx in [-.45,0,.45]:cyl('Cafe cup',(x+dx,1.10,1.33),.055,.07,.13,white,12)
        box('Glazing transom',(x,1.38,2.64),(2.3,.075,.055),steel,.005)
    box('Coffee menu board',(-3.8,1.18,2.29),(.87,.05,.72),teal,.015)
    text('Coffee menu title','COFFEE',(-3.8,1.145,2.40),.12,white)
    text('Coffee menu line','FRESH DAILY',(-3.8,1.145,2.19),.063,white)
    text('Hours on door','OPEN  /  06 - 22',(0,1.27,2.50),.09,white)
    for x in [-6.9,6.9]:
        box('Planter box',(x,.2,.43),(1.1,1,.70),wood,.03)
        for i in range(7):rod('Planter stems',(x,.2,.7),(x+math.sin(i*2.3)*.45,.2+math.cos(i*2.3)*.38,1.6+math.sin(i)*.2),.035,teal)
    for x in [-9,9]:
        for i in range(6):box('Parking stall line',(x,-9+i*1.6,.174),(.09,1.2,.009),white,.001)
    for x in [-11,11]:
        box('Storm drain',(x,-6,.174),(.55,1.1,.013),steel,.002)
        for i in range(8):box('Drain slot',(x,-6-.45+i*.13,.183),(.48,.035,.008),black,.001)
    surface(cream,'concrete',.4);surface(wood,'cedar',.9)

def lodge():
    metal=mat('Lodge hardware',(.25,.27,.25),.8,.4)
    for row,z in enumerate([1.9,4.9]):
        for j,x in enumerate([-7.6,-3.8,0,3.8,7.6]):
            text('Room number',str(101+row*100+j),(x+1.32,-2.629,z+.42),.105,trim)
            box('Door recessed upper panel',(x+1.32,-2.632,z+.18),(.45,.015,.54),roof,.01)
            box('Door lower panel',(x+1.32,-2.632,z-.52),(.45,.015,.49),roof,.01)
            box('Door latch',(x+1.53,-2.68,z-.25),(.10,.04,.022),metal,.006)
            box('Window vertical muntin',(x,-2.645,z),(.036,.06,1.75),trim,.004)
            box('Window horizontal muntin',(x,-2.645,z),(1.8,.06,.04),trim,.004)
            box('Room curtain left',(x-.62,-2.59,z),(.38,.015,1.5),cedar,.002)
            box('Room curtain right',(x+.62,-2.59,z),(.38,.015,1.5),cedar,.002)
    for side in [-1,1]:
        for y in [-.1,2.5]:
            for z in [1.9,4.9]:
                box('Side elevation window',(side*10.03,y,z),(.06,1.2,1.7),glaze)
                for dy in [-.67,.67]:box('Side window casing',(side*10.08,y+dy,z),(.08,.08,1.9),trim,.008)
        rod('Lodge drainpipe',(side*10.15,4.65,.3),(side*10.15,4.65,6.6),.045,metal)
        mesh('Gable infill',[(side*10.04,-3.1,6.5),(side*10.04,1,7.95),(side*10.04,5.1,6.5)],[(0,1,2)],plaster)
        for y in [-3.1,5.1]:rod('Gable rake board',(side*10.55,y,6.48),(side*10.55,1,7.95),.055,cedar)
    for y in [-3.1,5.1]:box('Eave gutter',(0,y,6.49),(21,.17,.16),metal,.01)
    for i in range(18):box('Weatherboard accent',(0,4.54,.8+i*.30),(20,.04,.22),cedar,.003)
    for x in [-7.5,0,7.5]:
        box('Porch seat',(x,-3.23,.58),(.70,.70,.12),cedar,.02)
        box('Porch chair back',(x,-2.94,.91),(.7,.065,.55),cedar,.014)
        for xx in [x-.29,x+.29]:
            for y in [-3.49,-2.97]:box('Porch chair leg',(xx,y,.3),(.048,.048,.6),metal,.005)
    for sign in [-1,1]:
        rod('Stair handrail',(-11+sign*.6,-3,.95),(-11+sign*.6,-.12,4.07),.035,trim)
    for z in [6.75,7.02,7.29,7.56,7.83,8.1,8.37]:box('Chimney masonry course',(7,1.5,z),(1.035,.935,.045),plaster,.004)
    box('Chimney cap',(7,1.5,8.58),(1.26,1.10,.14),roof,.008)
    surface(plaster,'plaster',.7);surface(cedar,'cedar',.8)

def lighthouse():
    # Existing primary geometry is kept; detailing uses the common model helpers.
    stone=bpy.data.materials.get('Warm limestone');cream=bpy.data.materials.get('Salt weathered ivory');red=bpy.data.materials.get('Vermilion enamel');metal=bpy.data.materials.get('Bronze railings');roof=bpy.data.materials.get('Slate shingles');wood=bpy.data.materials.get('Keeper door')
    seam=mat('Lighthouse masonry joints',(.43,.41,.34),0,1)
    for j in range(17):
        z=1.35+j*.98;r=2.45-(z-1)*.063+ .008
        torus('Tower masonry bed joint',(0,0,z),r,.012,seam,segments=64)
    for z,r in [(5,2.2),(10,1.87),(15,1.6)]:
        box('Tower sash vertical',(0,-r-.118,z),(.027,.028,.85),cream,.003)
        box('Tower sash horizontal',(0,-r-.118,z),(.52,.028,.027),cream,.003)
    for x in [-.33,0,.33]:box('Door inset plank',(x,-2.581,2),(.025,.012,1.75),metal,.002)
    box('Door handle',(.34,-2.60,1.98),(.10,.05,.025),metal,.005)
    for i in range(5):box('Entry stone step',(0,-3.6-i*.52,.1+(4-i)*.18),(2.6,.6,.22),stone,.025)
    for z in [18.90+i*.095 for i in range(15)]:torus('Fresnel prismatic lens ring',(0,0,z),.555,.025,bpy.data.materials.get('Lantern amber'),segments=48)
    glass=mat('Clear lantern panes',(.22,.37,.40),.15,.14);glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.23;glass.surface_render_method='DITHERED'
    for i in range(12):
        a=i*math.tau/12;b=(i+1)*math.tau/12
        mesh('Lantern glass panel',[(1.30*math.cos(t),1.30*math.sin(t),z) for z,t in [(18.72,a),(18.72,b),(20.68,b),(20.68,a)]],[(0,1,2,3)],glass)
    for x in [4.7,7,9.3]:
        box('Cottage window sash',(x,-.66,2),(.035,.04,1.15),cream,.003)
        box('Cottage cross sash',(x,-.66,2),(.72,.04,.035),cream,.003)
    for side in [-1,1]:
        box('Cottage gutter',(7,2+side*2.94,3.68),(7.7,.12,.13),metal,.012)
    rod('Cottage downspout',(10.7,-.85,.15),(10.7,-.85,3.75),.035,metal)
    box('Chimney crown',(9,2.2,5.93),(.92,1.02,.14),roof,.015)
    for i in range(19):
        x=-5+i*.85;box('Keeper fence picket',(x,6, .72),(.075,.07,1.25),wood,.009)
    for z in [.40,.95]:box('Keeper fence rail',(2.6,6,z),(15.3,.06,.07),wood,.009)
    surface(stone,'concrete',.75);surface(cream,'plaster',.65);surface(roof,'slate',.65)

def hooked(name):
    {'vela-gt':vela,'last-light-station':station,'horizon-lodge':lodge}[name]()
    base_export(name)

def build_existing(name):
    global export
    export=hooked
    starts=[base.index('# PASS TWO'),base.index('# PASS ONE'),base.index('# Coastal lodge'),base.index('# Final textured')]
    i=['vela-gt','last-light-station','horizon-lodge'].index(name)
    exec(base[starts[i]:starts[i+1]],globals())
    export=base_export

def build_lighthouse():
    ns={};src=(ROOT/'scripts/build_lighthouse.py').read_text();exec(src[:src.index('# Bake bevels')],ns)
    lighthouse();base_export('pacific-point')

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
choice=args[args.index('--model')+1] if '--model' in args else 'all'
for name in ['vela-gt','last-light-station','horizon-lodge']:
    if choice in (name,'all'):
        if name=='vela-gt':
            _VEHICLE_SELECTION='vela-gt'
            exec(compile((ROOT/'scripts/build_vehicle_assets.py').read_text(),str(ROOT/'scripts/build_vehicle_assets.py'),'exec'),globals())
        else:build_existing(name)
if choice in ('pacific-point','all'):build_lighthouse()
if choice in ('habitat','all'):exec(compile((ROOT/'scripts/build_habitat_assets.py').read_text(),str(ROOT/'scripts/build_habitat_assets.py'),'exec'),globals())
if choice in ('traffic','all') or choice.startswith('traffic-'):
    _TRAFFIC_ONLY=choice[8:] if choice.startswith('traffic-') else None
    exec(compile((ROOT/'scripts/build_traffic_assets.py').read_text(),str(ROOT/'scripts/build_traffic_assets.py'),'exec'),globals())
if choice in ('forest','all'):
    src=(ROOT/'scripts/build_forest.py').read_text();src=src.replace("build('pacific-redwood',57)","surface(bark,'bark',1.1)\nbuild('pacific-redwood',57)")
    # Surface assignment is per generated object, before every forest export.
    src=src.replace('    export(name)',"    surface(bark,'bark',1.1)\n    export(name)")
    exec(compile(src,str(ROOT/'scripts/build_forest.py'),'exec'),globals())
