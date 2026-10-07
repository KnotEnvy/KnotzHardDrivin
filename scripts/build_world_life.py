"""Original articulated coastal characters, birds and picnic props.
Blender --background --python scripts/build_world_life.py -- --model all
Meters, +Y forward, Z up; exported named pivots animate in the game.
"""
import bpy, math, sys, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets'
SOURCE=ROOT/'artifacts/juice/blender'
OUT.mkdir(exist_ok=True);SOURCE.mkdir(parents=True,exist_ok=True)
active=None

def material(name,color,rough=.8,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 return m

def attach(o,name,m,smooth=True):
 o.name=name;o.data.materials.append(m)
 if smooth:
  for p in o.data.polygons:p.use_smooth=True
 if active:
  bpy.context.view_layer.update();o.parent=active;o.matrix_parent_inverse=active.matrix_world.inverted()
 return o

def sphere(name,p,size,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,location=p);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return attach(o,name,m)

def box(name,p,size,m,r=.025):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);attach(o,name,m,False)
 if r:
  b=o.modifiers.new('Soft finished edges','BEVEL');b.width=r;b.segments=2;o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
 return o

def rod(name,a,b,r,m,r2=None):
 a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cone_add(vertices=10,radius1=r,radius2=r if r2 is None else r2,depth=(b-a).length,location=(a+b)/2)
 o=attach(bpy.context.object,name,m);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def ring(name,p,r,t,m,rotation=(0,0,0),scale=(1,1,1)):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=24,minor_segments=6,location=p,rotation=rotation)
 o=attach(bpy.context.object,name,m);o.scale=scale;return o

def mesh(name,vertices,faces,m):
 g=bpy.data.meshes.new(name);g.from_pydata(vertices,[],faces);g.update();o=bpy.data.objects.new(name,g);bpy.context.collection.objects.link(o);return attach(o,name,m)

def joint(name,p,parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=p;bpy.context.view_layer.update()
 if parent:
  o.parent=parent;o.matrix_parent_inverse=parent.matrix_world.inverted()
 return o

def clear():
 global active
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);active=joint('LifeRoot',(0,0,0));return active

def animal(kind):
 global active
 root=clear();dog=kind=='dog'
 fur=material('Golden retriever coat' if dog else 'Deer warm coat',(.55,.29,.095) if dog else (.34,.20,.10))
 pale=material('Animal cream markings',(.82,.70,.43));dark=material('Animal nose and pupils',(.015,.012,.01),.4);eye=material('Animal amber eyes',(.27,.09,.014),.25)
 collar=material('Retriever ocean collar',(.025,.29,.28),.55);brass=material('Animal brass tag',(.56,.39,.12),.32,.65)
 foot=material('Animal pads and hooves',(.07,.046,.031))
 if dog:
  sphere('Barrel and ribcage',(0,-.02,.51),(.225,.44,.235),fur);sphere('Chest ruff',(0,.30,.58),(.21,.20,.25),pale);sphere('Haunches',(0,-.32,.49),(.23,.20,.21),fur)
 else:
  sphere('Deer slender ribcage',(0,-.04,1.03),(.23,.52,.27),fur);sphere('Deer pale belly',(0,-.04,.92),(.195,.44,.14),pale);sphere('Deer shoulder',(0,.32,1.05),(.22,.23,.31),fur)
 for side in [-1,1]:
  for front in [True,False]:
   y=(.29 if front else -.30) if dog else (.35 if front else -.39);top=.49 if dog else 1.05
   active=joint(('LegFront' if front else 'LegBack')+('L' if side<0 else 'R'),(side*(.16 if dog else .14),y,top),root)
   x=side*(.16 if dog else .14)
   if dog:
    sphere('Muscular upper leg',(x,y,top-.09),(.09,.10,.18),fur);rod('Tapered lower leg',(x,y,.36),(x,y+.025,.11),.065,fur,.042);sphere('Rounded paw',(x,y+.075,.07),(.08,.125,.07),pale)
    for dx in [-.032,0,.032]:rod('Paw toe division',(x+dx,y+.171,.045),(x+dx,y+.182,.075),.005,foot)
   else:
    rod('Deer upper leg',(x,y,1.01),(x,y+.05,.55),.073,fur,.039);sphere('Deer knee',(x,y+.05,.55),(.046,.05,.05),fur);rod('Deer lower leg',(x,y+.05,.56),(x,y+.035,.09),.027,fur,.023)
    for dx in [-.027,.027]:box('Cloven hoof',(x+dx,y+.061,.05),(.045,.10,.09),foot,.01)
 active=root
 neck_top=(0,.43,.74) if dog else (0,.50,1.48)
 sphere('Strong neck',(0,.33,.66) if dog else (0,.39,1.28),(.17,.185,.23) if dog else (.14,.22,.36),fur)
 if dog:
  ring('Woven collar',(0,.36,.68),.158,.023,collar,(math.pi/2,0,0),scale=(1,1,1.06));sphere('Brass identity tag',(0,.511,.58),(.040,.012,.046),brass)
 active=joint('Head',neck_top,root)
 if dog:
  sphere('Expressive skull',(0,.44,.77),(.168,.185,.18),fur);sphere('Cream muzzle',(0,.625,.705),(.107,.15,.08),pale);sphere('Wet nose',(0,.756,.739),(.062,.035,.042),dark)
  rod('Smile crease',(-.086,.665,.681),(.086,.665,.681),.006,dark)
  sphere('Little pink tongue',(.026,.712,.65),(.025,.043,.012),material('Retriever tongue',(.57,.18,.20),.5))
  for side in [-1,1]:
   sphere('Soft dropped ear',(side*.169,.363,.691),(.049,.091,.146),fur).rotation_euler[1]=side*.16
   sphere('Amber eye',(side*.125,.552,.804),(.030,.027,.03),eye);sphere('Round pupil',(side*.14,.569,.808),(.015,.012,.017),dark);sphere('Eye glint',(side*.147,.577,.820),(.007,.005,.006),pale)
   sphere('Brow',(side*.123,.541,.838),(.047,.035,.023),fur)
 else:
  sphere('Deer face',(0,.53,1.52),(.13,.21,.155),fur);sphere('Deer muzzle',(0,.725,1.43),(.083,.13,.075),pale);sphere('Deer dark nose',(0,.825,1.45),(.057,.032,.039),dark)
  for side in [-1,1]:
   sphere('Deer ear',(side*.19,.42,1.68),(.085,.044,.19),fur).rotation_euler[1]=side*.50
   sphere('Pale ear lining',(side*.19,.449,1.68),(.052,.017,.14),pale).rotation_euler[1]=side*.50
   sphere('Deer watchful eye',(side*.114,.615,1.57),(.025,.028,.025),dark)
  antlers=joint('Antlers',(0,.43,1.65),active);active=antlers
  for side in [-1,1]:
   points=[(side*.075,.44,1.65),(side*.15,.34,1.90),(side*.26,.15,2.10),(side*.37,.00,2.22)]
   for a,b in zip(points,points[1:]):rod('Antler beam',a,b,.029,brass,.015)
   for j in [1,2]:
    p=Vector(points[j]);rod('Antler tine',p,p+Vector((side*.045,.15,.18)),.018,brass,.005)
 active=joint('Tail',(0,-.45,.57 if dog else 1.10),root)
 if dog:
  rod('Retrieving tail',(0,-.45,.57),(0,-.91,.73),.070,fur,.04);sphere('Feathered tail',(0,-.72,.64),(.071,.21,.083),fur)
 else:rod('Deer short tail',(0,-.48,1.10),(0,-.70,1.15),.05,pale,.018)
 active=root
 return root

def gull():
 global active
 root=clear();white=material('Gull ivory feathers',(.85,.83,.74));gray=material('Gull slate wing mantle',(.32,.38,.40));black=material('Gull black flight tips',(.021,.029,.031));yellow=material('Gull ochre bill and feet',(.71,.41,.06));eye=material('Gull black eyes',(.008,.012,.014),.3)
 sphere('Streamlined gull body',(0,0,.08),(.12,.24,.12),white);sphere('Gull head',(0,.21,.17),(.092,.10,.092),white);rod('Tapered bill',(0,.28,.15),(0,.40,.135),.029,yellow,.004)
 for side in [-1,1]:
  sphere('Gull eye',(side*.081,.245,.19),(.011,.013,.012),eye)
  active=joint('WingL' if side<0 else 'WingR',(side*.095,0,.11),root)
  v=[(side*.09,.07,.11),(side*.28,.10,.18),(side*.58,-.08,.15),(side*.79,-.28,.07),(side*.50,-.28,.06),(side*.21,-.14,.08)]
  if side<0:v=list(reversed(v))
  o=mesh('Curved wing mantle',v,[(0,1,2,3,4,5)],gray);solid=o.modifiers.new('Wing thickness','SOLIDIFY');solid.thickness=.012
  for j in range(10):
   x=.16+j*.060;y=-.13-j*.016;length=.19+j*.008;m=black if j>6 else white
   vv=[(side*(x-.027),y+.08,.12),(side*(x+.031),y+.06,.115),(side*(x+.047),y-length,.045),(side*x,y-length-.018,.044),(side*(x-.025),y-length+.045,.05)]
   if side<0:vv=list(reversed(vv))
   mesh('Layered primary feather',vv,[(0,1,2,3,4)],m)
 active=root
 for j in range(5):sphere('Gull tail plume',((j-2)*.030,-.24,.07),(.025,.125,.014),white)
 for side in [-1,1]:rod('Gull leg',(side*.05,-.06,.00),(side*.05,-.08,-.085),.009,yellow);rod('Gull folded foot',(side*.05,-.08,-.085),(side*.05,-.025,-.085),.012,yellow)
 return root

def person(cycling=False):
 global active
 root=clear();skin=material('Visitor skin',(.55,.32,.20));shirt=material('Visitor coastal linen',(.04,.29,.32));pants=material('Visitor rust shorts',(.39,.14,.075));shoe=material('Visitor cream footwear',(.75,.71,.57));dark=material('Visitor dark trim',(.018,.025,.027));hat=material('Visitor straw cap',(.66,.49,.26))
 if not cycling:
  for side in [-1,1]:
   active=joint('LegFrontL' if side<0 else 'LegFrontR',(side*.125,0,.87),root)
   sphere('Shorts leg',(side*.125,0,.72),(.115,.125,.23),pants);rod('Bare lower leg',(side*.125,0,.55),(side*.125,.02,.12),.065,skin,.048);box('Canvas shoe',(side*.125,.095,.075),(.15,.29,.13),shoe,.036);box('Shoe sole',(side*.125,.095,.025),(.157,.297,.03),dark,.012)
  active=root;box('Tailored linen torso',(0,0,1.19),(.43,.26,.65),shirt,.075)
  for z in [1.01,1.13,1.25,1.37]:sphere('Linen button',(0,.145,z),(.012,.008,.012),shoe)
  box('Chest pocket',(-.12,.144,1.29),(.105,.016,.10),shirt,.01)
  for side in [-1,1]:
   shoulder=(side*.23,0,1.43);active=joint('ArmL' if side<0 else 'ArmR',shoulder,root)
   sphere('Linen short sleeve',(side*.26,0,1.34),(.10,.115,.16),shirt);rod('Upper arm',(side*.28,0,1.30),(side*.31,0,1.10),.066,skin,.057)
   active=joint('ForearmL' if side<0 else 'ForearmR',(side*.31,0,1.10),active)
   rod('Forearm',(side*.31,0,1.11),(side*.33,.04,.90),.057,skin,.042);sphere('Hand',(side*.33,.045,.855),(.053,.065,.08),skin)
  neck=(0,0,1.47);head=(0,.005,1.69)
 else:
  # Rider leans into a classic steel touring bicycle.
  sphere('Rider shorts',(0,-.08,1.06),(.19,.17,.15),pants);o=box('Rider jersey',(0,.16,1.36),(.37,.26,.52),shirt,.055);o.rotation_euler[0]=-.45
  for side in [-1,1]:
   active=joint('LegFrontL' if side<0 else 'LegFrontR',(side*.12,-.10,1.06),root)
   rod('Rider thigh',(side*.12,-.10,1.05),(side*.14,.30,.75),.085,pants,.065);active=joint('KneeL' if side<0 else 'KneeR',(side*.14,.30,.75),active);rod('Rider calf',(side*.14,.30,.75),(side*.14,.03,.42),.052,skin,.038);box('Rider shoe',(side*.14,.10,.40),(.12,.22,.075),shoe,.025)
   active=root;rod('Rider sleeve',(side*.19,.29,1.49),(side*.24,.40,1.30),.08,shirt,.065);rod('Rider reaching forearm',(side*.24,.40,1.30),(side*.27,.55,1.12),.05,skin,.038);sphere('Rider gloved hand',(side*.27,.54,1.115),(.055,.052,.046),dark)
  neck=(0,.31,1.55);head=(0,.42,1.68)
 active=root;rod('Neck',neck,head,.064,skin)
 active=joint('Head',head,root);sphere('Friendly face',head,(.115,.103,.14),skin);sphere('Nose',(0,head[1]+.101,head[2]-.01),(.032,.041,.031),skin)
 for side in [-1,1]:sphere('Eye',(side*.041,head[1]+.091,head[2]+.030),(.012,.009,.009),dark);sphere('Ear',(side*.114,head[1],head[2]-.017),(.024,.023,.044),skin)
 rod('Subtle smile',(-.032,head[1]+.099,head[2]-.050),(.032,head[1]+.099,head[2]-.050),.005,dark)
 sphere('Helmet' if cycling else 'Cap crown',(0,head[1]-.01,head[2]+.091),(.125,.114,.079),hat)
 if not cycling:box('Curved cap peak',(0,head[1]+.12,head[2]+.074),(.23,.13,.022),hat,.015)
 else:
  for x in [-.065,0,.065]:box('Helmet vent',(x,head[1]+.010,head[2]+.152),(.022,.115,.012),dark,.006)
 active=root
 if cycling:
  steel=material('Bicycle sea green enamel',(.035,.30,.27),.36,.22);alloy=material('Bicycle polished fittings',(.37,.42,.43),.72,.28);rubber=material('Bicycle rubber',(.018,.024,.025),0,.92)
  for front,y in [(True,.64),(False,-.65)]:
   active=joint('WheelFront' if front else 'WheelBack',(0,y,.37),root)
   ring('Touring tire',(0,y,.37),.342,.031,rubber,(0,math.pi/2,0));ring('Wheel rim',(0,y,.37),.309,.011,alloy,(0,math.pi/2,0))
   for j in range(16):
    a=j*math.tau/16;rod('Wheel spoke',(0,y,.37),(0,y+math.sin(a)*.30,.37+math.cos(a)*.30),.003,alloy)
   rod('Wheel axle',(-.09,y,.37),(.09,y,.37),.025,alloy)
  active=root
  A=(0,-.65,.37);B=(0,-.12,1.04);C=(0,.08,.43);D=(0,.49,.98);E=(0,.64,.37)
  for a,b in [(A,B),(B,C),(C,A),(B,D),(D,C),(D,E)]:rod('Steel diamond frame',a,b,.023,steel)
  rod('Seat tube',C,(0,-.15,1.10),.022,alloy);box('Leather saddle',(0,-.16,1.13),(.20,.29,.066),dark,.025)
  rod('Handlebar stem',D,(0,.47,1.15),.017,alloy);rod('Touring handlebar',(-.29,.53,1.13),(.29,.53,1.13),.014,alloy)
  for side in [-1,1]:rod('Rubber bar grip',(side*.20,.53,1.13),(side*.29,.53,1.13),.022,rubber)
  active=joint('Crank',(0,.06,.43),root)
  rod('Pedal crank',(-.14,.06,.43),(-.14,.06,.59),.015,alloy);rod('Pedal crank',(.14,.06,.43),(.14,.06,.27),.015,alloy)
  for side in [-1,1]:box('Touring pedal',(side*.16,.06,.43+side*.16),(.11,.075,.024),dark,.004)
  active=root;ring('Chain ring',(.052,.06,.43),.105,.012,alloy,(0,math.pi/2,0));rod('Chain upper',(.06,-.65,.40),(.06,.06,.52),.006,dark);rod('Chain lower',(.06,-.65,.34),(.06,.06,.34),.006,dark)
  box('Touring rear rack',(0,-.64,.82),(.28,.38,.035),alloy,.008)
  box('Canvas pannier',(.17,-.67,.65),(.16,.30,.32),pants,.03);box('Pannier flap',(.17,-.67,.82),(.175,.32,.04),hat,.01)
 return root

def kite():
 root=clear();colors=[material('Kite coral',(.76,.19,.10)),material('Kite turquoise',(.025,.38,.39)),material('Kite golden yellow',(.94,.58,.12)),material('Kite cream',(.86,.79,.61))];frame=material('Kite bamboo spars',(.40,.28,.12))
 points=[(0,0,.95),(.65,0,0),(0,0,-.75),(-.65,0,0)];center=(0,.09,0)
 for j in range(4):mesh('Stitched kite panel',[center,points[j],points[(j+1)%4]],[(0,1,2)],colors[j]).data.materials[0].use_backface_culling=False
 rod('Vertical kite spar',points[0],points[2],.012,frame);rod('Cross kite spar',points[1],points[3],.012,frame)
 for j in range(4):rod('Kite edge seam',points[j],points[(j+1)%4],.007,colors[3])
 return root

def picnic():
 root=clear();wicker=material('Picnic woven wicker',(.39,.24,.10));linen=material('Picnic coral blanket',(.59,.17,.11));cream=material('Picnic cream trim',(.80,.75,.60));teal=material('Picnic thermos enamel',(.03,.31,.31),.32,.2);steel=material('Picnic steel',(.38,.43,.44),.3,.7)
 box('Picnic basket',(0,0,.17),(.54,.34,.31),wicker,.026);box('Basket lid',(0,0,.335),(.57,.37,.032),cream,.015)
 for i in range(12):box('Woven horizontal bands',(0,-.175,.04+i*.023),(.51,.015,.009),cream,.002)
 for i in range(14):box('Woven vertical straps',(-.25+i*.038,-.179,.18),(.012,.015,.27),wicker,.002)
 ring('Basket carrying handle',(0,0,.43),.23,.020,wicker,(math.pi/2,0,0),(.98,.7,1))
 box('Folded picnic blanket',(.63,0,.057),(.55,.41,.11),linen,.02)
 for x in [.41,.48,.55,.62,.69,.76,.83]:box('Blanket woven stripe',(x,0,.116),(.026,.40,.008),cream,.002)
 rod('Thermos',(-.52,0,.015),(-.52,0,.32),.066,teal);rod('Thermos lid',(-.52,0,.31),(-.52,0,.36),.07,steel)
 for x in [-.48,.37]:rod('Coffee cup',(x,.33,.02),(x,.33,.13),.045,cream,.053);ring('Cup handle',(x+.048,.33,.08),.035,.008,cream,(math.pi/2,0,0))
 return root

def export(name):
 # Join only within a material AND a pivot; articulated parts stay independent.
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':
   bpy.context.view_layer.objects.active=o
   for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
 buckets={}
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':buckets.setdefault((o.parent.name if o.parent else '',o.data.materials[0].name),[]).append(o)
 for (parent,material_name),items in buckets.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.select_set(True)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();items[0].name=parent+'_'+material_name
 bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_apply=True,export_cameras=False,export_lights=False)
 print('LIFE_EXPORTED',name,'draws',len(buckets),flush=True)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
selector=args[args.index('--model')+1] if '--model' in args else 'all'
models={'dog':lambda:animal('dog'),'deer':lambda:animal('deer'),'gull':gull,'visitor':person,'cyclist':lambda:person(True),'kite':kite,'picnic':picnic}
for name,build in models.items():
 if selector not in ('all',name):continue
 build();export('pacific-'+name)
