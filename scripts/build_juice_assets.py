"""Original Pacific Run art assets. Blender background build, meters, +Y forward.
Run: blender --background --python scripts/build_juice_assets.py
All manufacturing bevels are baked; meshes batch by material for runtime cost.
"""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'public/assets'
OUT.mkdir(exist_ok=True)
SOURCE = ROOT/'artifacts/juice/blender'
SOURCE.mkdir(parents=True, exist_ok=True)
random.seed(2048)

def clear():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def mat(name, color, metal=0, rough=.6, emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
    return m

def finish(o,name,m,bevel=0,smooth=False):
    o.name=name;o.data.materials.append(m)
    if bevel:
        b=o.modifiers.new('Machined edge radii','BEVEL');b.width=bevel;b.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    if smooth:
        for p in o.data.polygons:p.use_smooth=True
    return o

def box(name,loc,size,m,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,m,bevel)

def mesh(name,verts,faces,m,smooth=False):
    g=bpy.data.meshes.new(name);g.from_pydata(verts,[],faces);g.update()
    o=bpy.data.objects.new(name,g);bpy.context.collection.objects.link(o);return finish(o,name,m,0,smooth)

def cyl(name,loc,r1,r2,h,m,vertices=24):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r1,radius2=r2,depth=h,location=loc)
    o=finish(bpy.context.object,name,m,.012)
    for p in o.data.polygons:p.use_smooth=abs(p.normal.z)<.5
    return o

def rod(name,a,b,r,m,verts=8):
    a,b=Vector(a),Vector(b);o=cyl(name,(a+b)/2,r,r*.72,(b-a).length,m,verts)
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def text(name,value,loc,size,m,rotation=(math.pi/2,0,0)):
    bpy.ops.object.text_add(location=loc,rotation=rotation)
    o=bpy.context.object;o.name=name;o.data.body=value;o.data.size=size;o.data.align_x='CENTER'
    o.data.extrude=.002;o.data.materials.append(m)
    bpy.ops.object.convert(target='MESH');return o

def export(name):
    objs=list(bpy.context.scene.objects)
    for o in objs:
        if o.type!='MESH':continue
        bpy.context.view_layer.objects.active=o
        for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    # Join by material: shared draws, clean editable material families in .blend.
    buckets={}
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH':buckets.setdefault(o.data.materials[0].name,[]).append(o)
    for material,items in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in items:o.select_set(True)
        bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();items[0].name=material
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_apply=True)
    print('JUICE_EXPORTED',name,'draws',len(buckets),'triangles',sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'))

# PASS TWO: Vela GT. Curved coachwork, open arches, individual window panes.
clear()
paint=mat('Vela coachwork',(.91,.39,.075),.65,.24)
p=paint.node_tree.nodes.get('Principled BSDF');p.inputs['Coat Weight'].default_value=1;p.inputs['Coat Roughness'].default_value=.11
carbon=mat('Graphite aero',(.018,.026,.028),.25,.43)
chrome=mat('Brushed alloy',(.57,.64,.65),.95,.22)
glass=mat('Smoked blue glazing',(.012,.022,.029),.08,.075)
gp=glass.node_tree.nodes.get('Principled BSDF');gp.inputs['Alpha'].default_value=.70
glass.surface_render_method='DITHERED'
head=mat('Ivory LED',(.95,.85,.60),.15,.2,3)
tail=mat('Ruby LED',(.7,.012,.006),.1,.23,2.4)
leather=mat('Saddle interior',(.17,.075,.035),0,.83)
ivory=mat('Porcelain lettering',(.86,.86,.75),.1,.6)
# Cross-section contours with independently rounded fenders and curved hood.
controls=[(-2.17,.69,.06),(-2.02,.88,.17),(-1.6,.99,.25),(-1.25,.98,.28),(-.7,.91,.29),(0,.9,.29),(.85,.95,.28),(1.45,.99,.26),(1.93,.88,.15),(2.13,.73,.05)]
def sample(y):
    for i in range(len(controls)-1):
        a,b=controls[i],controls[i+1]
        if a[0]<=y<=b[0]:
            t=(y-a[0])/(b[0]-a[0]);t=t*t*(3-2*t)
            return a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t
    return controls[-1][1:]
verts=[];faces=[];N=100;K=32
for j in range(N+1):
    y=-2.17+j*4.3/N;w,h=sample(y)
    for k in range(K):
        a=math.tau*k/K;x=w*math.cos(a)
        # Superellipse shoulder, continuously smooth curvature rather than facets.
        z= -.08+(h+.08)*max(0,math.sin(a))**.45 if math.sin(a)>=0 else -.08+.22*math.sin(a)
        verts.append((x,y,z))
for j in range(N):
    for k in range(K):
        a=j*K+k;b=j*K+(k+1)%K;faces.append((a,b,b+K,a+K))
faces += [tuple(reversed(range(K))),tuple(N*K+k for k in range(K))]
body=mesh('Hand-surfaced monocoque',verts,faces,paint,True)
# Actual tire apertures instead of painted circles.
for y in [-1.45,1.45]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.445,depth=2.6,location=(0,y,-.29),rotation=(0,math.pi/2,0))
    cutter=bpy.context.object
    mod=body.modifiers.new('Open wheel aperture','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.context.view_layer.objects.active=body;bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
# Cabin roof formed from curved cross sections, each side has genuine glazing faces.
roofSections=[(-.52,.62,.86),(-.34,.64,.90),(.15,.635,.91),(.40,.625,.865),(.55,.61,.81)]
rv=[];rf=[]
for y,w,h in roofSections:
    for k in range(17):
        x=-w+2*w*k/16;rv.append((x,y,h-.035*(x/w)**2))
for j in range(4):
    for k in range(16):a=j*17+k;rf.append((a,a+1,a+18,a+17))
mesh('Continuous fastback roof',rv,rf,paint,True)
# Windshield/front at +Y, rear screen at -Y, framed curved panes.
for side in [-1,1]:
    a=(side*.69,.93,.28);b=(side*.62,.50,.80);c=(side*.62,-.52,.86);d=(side*.72,-.96,.28)
    mesh('Quarter and door glass',[a,b,c,d],[(0,1,2,3)],glass)
    for q,r in [(a,b),(b,c),(c,d),(d,a)]:rod('Glazing surround',q,r,.018,chrome)
    rod('B pillar',(side*.705,-.18,.28),(side*.637,-.18,.85),.025,carbon)
    rod('A pillar',a,b,.035,paint)
    rod('C pillar',c,d,.041,paint)
    box('Door recessed handle',(side*.931,-.26,.18),(.019,.19,.035),chrome,.012)
    box('Side rocker sill',(side*.885,0,-.23),(.12,1.8,.1),carbon)
    for y in [-.64,.68]:rod('Door shut line',(side*.924,y,-.17),(side*.924,y,.21),.005,carbon)
    box('Mirror stem',(side*.75,.7,.40),(.32,.05,.04),carbon,.012)
    box('Aerodynamic mirror',(side*.98,.72,.43),(.22,.28,.105),paint,.04)
    box('Mirror lens',(side*.98,.568,.43),(.16,.012,.065),chrome,.012)
    # Front projector recess, three independent capsules, rim trim.
    box('Headlight recess',(side*.50,2.00,.14),(.57,.125,.15),carbon,.055)
    for i in range(3):box('Projector capsule',(side*.5+(i-1)*.15,2.065,.155),(.105,.016,.049),head,.019)
    box('DRL blade',(side*.5,2.06,.235),(.55,.023,.015),head,.006)
    box('Front lower inlet',(side*.55,2.04,-.125),(.42,.055,.115),carbon)
    box('Rear LED recess',(side*.47,-2.035,.14),(.7,.115,.09),carbon)
    box('Rear light blade',(side*.47,-2.087,.15),(.65,.022,.028),tail,.009)
    for y in [-1.8,-1.64,-1.48]:box('Engine deck louver',(side*.41,y,sample(y)[1]-.005),(.45,.045,.018),carbon,.004)
    for y in [1.4,1.49,1.58]:box('Hood heat extractor',(side*.74,y,sample(y)[1]-.013),(.17,.027,.012),carbon,.004)
    rod('Hood panel seam',(side*.63,.96,.295),(side*.55,1.87,.19),.004,carbon)
    # Twin tailpipes, with dark recessed bores.
    o=cyl('Polished tailpipe',(side*.63,-2.095,-.21),.070,.070,.18,chrome);o.rotation_euler.x=math.pi/2
    o=cyl('Exhaust bore',(side*.63,-2.193,-.21),.052,.052,.012,carbon);o.rotation_euler.x=math.pi/2
    box('Bucket seat',(side*.34,-.1,.39),(.45,.48,.14),leather,.05)
    o=box('Seat back',(side*.34,-.36,.58),(.44,.11,.41),leather,.05);o.rotation_euler.x=-.14
mesh('Front windshield',[(-.69,.96,.30),(.69,.96,.30),(.61,.55,.81),(-.61,.55,.81)],[(0,1,2,3)],glass)
mesh('Rear screen',[(-.71,-.97,.3),(-.62,-.52,.86),(.62,-.52,.86),(.71,-.97,.3)],[(0,1,2,3)],glass)
box('Front splitter',(0,2.02,-.255),(1.63,.28,.065),carbon,.025)
box('Rear diffuser',(0,-2.04,-.255),(1.58,.19,.105),carbon)
for x in [-.52,-.26,0,.26,.52]:box('Diffuser strake',(x,-2.09,-.275),(.018,.25,.13),carbon,.003)
box('Ducktail spoiler',(0,-1.94,.31),(1.7,.21,.075),paint,.025)
box('License plinth',(0,-2.16,-.05),(.43,.024,.13),carbon)
text('Pacific plate','PACIFIC',(0,-2.176,-.084),.065,ivory)
text('Vela deck badge','V E L A',(0,-2.09,.21),.062,chrome)
box('Cabin shadow floor',(0,-.1,.275),(1.38,1.7,.02),carbon,.002)
box('Dashboard',(0,.64,.42),(1.25,.23,.16),leather,.035)
box('Center console',(0,0,.38),(.16,.7,.18),carbon)
box('Dark rear parcel shelf',(0,-.76,.31),(1.44,.48,.025),carbon,.004)
# Tiny nose emblem and sculpted central grille mesh.
box('Nose badge',(0,2.11,.135),(.053,.01,.060),chrome,.008)
for x in [i*.07 for i in range(-6,7)]:box('Grille vertical',(x,2.111,-.11),(.009,.014,.08),chrome,.002)
export('vela-gt')

# PASS ONE: Last Light service station. Authored canopy, pumps, glazing and patio.
clear()
cream=mat('Saltwashed plaster',(.66,.61,.47),0,.85)
teal=mat('Pacific teal enamel',(.045,.19,.19),.25,.38)
wood=mat('Weathered cedar',(.24,.13,.066),0,.9)
steel=mat('Anodized steel',(.29,.32,.30),.7,.45)
window=mat('Storefront reflective glass',(.04,.15,.19),.4,.19)
light=mat('Warm practical lamps',(1,.66,.26),0,.3,2.8)
red=mat('Coral accents',(.59,.14,.07),.2,.5)
white=mat('Station ivory',(.88,.83,.65),0,.7)
box('Concrete forecourt',(0,0,.08),(26,22,.16),cream,.08)
box('Shop walls',(0,5,2.2),(12,7,4.4),cream,.07)
box('Floating fascia',(0,5,4.53),(12.6,7.8,.35),teal,.05)
for x in [-4,-1.3,1.3,4]:
    box('Shop glazed bay',(x,1.46,2.15),(2.25,.055,2.8),window)
    for xx in [x-1.15,x+1.15]:box('Window mullion',(xx,1.39,2.15),(.07,.1,2.95),steel)
    box('Shop bay sill',(x,1.36,.74),(2.4,.17,.09),white)
box('Entrance frame',(0,1.38,1.55),(1.5,.08,3.0),teal)
box('Entrance door',(0,1.31,1.55),(1.3,.025,2.8),window)
rod('Entry handle',(.42,1.25,1.3),(.42,1.25,1.85),.018,steel)
for x in [-5.5,5.5]:
    box('Canopy pier',(x,-4,2.5),(.45,.45,5),teal,.055)
    box('Pier coral band',(x,-4,1.7),(.46,.46,.25),red,.01)
box('Island canopy',(0,-4,5.05),(14,7,.32),white,.09)
box('Canopy fascia',(0,-7.54,5.02),(14,.07,.30),teal)
for x in [-4,-1.35,1.35,4]:box('Recessed canopy light',(x,-4,4.87),(1.5,.14,.02),light,.01)
for x in [-3.5,3.5]:
    box('Pump island',(x,-4,.22),(2.9,3.6,.35),cream,.12)
    for y in [-4.8,-3.2]:
        box('Dispenser base',(x,y,.74),(.68,.65,1.05),teal,.09)
        box('Dispenser head',(x,y,1.63),(.88,.66,.83),white,.10)
        box('Digital display',(x,y-.345,1.79),(.51,.01,.19),window,.006)
        box('Grade coral strip',(x,y-.346,1.51),(.65,.012,.09),red,.003)
        rod('Fuel hose',(x+.51,y,1.75),(x+.64,y,.65),.034,wood)
        rod('Fuel hose return',(x+.64,y,.65),(x+.40,y,.95),.034,wood)
    for xx in [x-1.4,x+1.4]:cyl('Protective bollard',(xx,-4,.67),.1,.1,1,red)
for x in [-5,5]:
    box('Bench seat',(x,.05,.63),(1.8,.47,.12),wood)
    box('Bench back',(x,.26,.92),(1.8,.09,.55),wood)
    for xx in [x-.65,x+.65]:box('Bench leg',(xx,.05,.3),(.06,.38,.6),steel,.004)
# Visible facade lettering, no texture download dependency.
text('Shop wordmark','LAST LIGHT',(0,1.02,3.82),.6,white)
text('Canopy wordmark','F U E L  /  C O F F E E',(0,-7.59,4.95),.19,white)
for x in [-5.5,5.5]:box('Door sconce',(x,1.2,3.4),(.15,.16,.5),light)
# Timber side cladding gives the facade texture at road distance.
for i in range(20):box('Cedar siding',(-6.045,2+i*.32,2.2),(.06,.20,4),wood,.01)
export('last-light-station')

# Coastal lodge: repeated rooms, slatted balcony, pitched standing-seam roof.
clear()
plaster=mat('Lodge chalk plaster',(.70,.64,.49),0,.9)
cedar=mat('Lodge red cedar',(.33,.14,.062),0,.88)
roof=mat('Standing seam roof',(.085,.16,.16),.4,.54)
glaze=mat('Lodge glass',(.04,.12,.16),.45,.18)
trim=mat('Lodge ivory trim',(.87,.80,.62),0,.75)
lamp=mat('Lodge amber sconces',(.95,.60,.20),0,.3,2.2)
box('Lodge foundation',(0,0,.2),(22,9,.4),plaster)
box('Lodge main mass',(0,1,3.4),(20,7,6.4),plaster,.05)
for sign in [-1,1]:
    o=box('Gabled metal roof',(0,1+sign*2,7.18),(21,4.5,.15),roof,.01);o.rotation_euler.x=-sign*.35
    for i in range(27):
        o=box('Standing roof seam',(-10.4+i*.8,1+sign*2,7.28),(.025,4.5,.025),trim,.002);o.rotation_euler.x=-sign*.35
for x in [-7.6,-3.8,0,3.8,7.6]:
    for z in [1.9,4.9]:
        box('Room window',(x,-2.54,z),(1.8,.07,1.7),glaze)
        for xx in [x-1,x+1]:box('Window trim',(xx,-2.63,z),(.09,.10,1.9),trim,.01)
        for zz in [z-1,z+1]:box('Window header',(x,-2.63,zz),(2.1,.1,.09),trim,.01)
        box('Door',(x+1.32,-2.58,z-.25),(.62,.07,2.0),cedar)
        box('Room sconce',(x-1.23,-2.77,z+.2),(.11,.14,.32),lamp)
box('Balcony deck',(0,-3.22,3.43),(20,1.7,.17),cedar)
for x in [-9.5,-5.7,-1.9,1.9,5.7,9.5]:box('Porch support',(x,-3.75,1.8),(.17,.17,3.6),cedar)
for i in range(81):box('Balcony spindle',(-10+i*.25,-4,4),(.035,.035,1.03),trim,.004)
box('Balcony handrail',(0,-4,4.53),(20.2,.09,.09),cedar,.02)
for i in range(13):box('Side stair',(-11,-3+i*.24,.15+i*.26),(1.4,.32,.30),cedar,.01)
box('Sign panel',(0,-2.60,6.35),(7.9,.14,.62),roof)
text('Lodge signage','HORIZON MOTOR LODGE',(0,-2.7,6.18),.29,trim)
box('Chimney',(7,1.5,7.5),(1.0,.9,2.0),cedar)
export('horizon-lodge')

# Final textured redwood assets and low-detail variants.
exec(compile((ROOT/'scripts/build_forest.py').read_text(),str(ROOT/'scripts/build_forest.py'),'exec'))
