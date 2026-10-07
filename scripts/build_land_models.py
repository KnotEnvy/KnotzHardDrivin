"""Original stratified coastal outcrops and regional ground plants."""
from pathlib import Path
import bpy,math,random,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
# Use only the shared modeling functions, before the character build dispatch.
helpers=(ROOT/'scripts/build_world_life.py').read_text(encoding='utf8').split('models={')[0]
exec(compile(helpers,'world_life_helpers','exec'),globals())
SOURCE=ROOT/'artifacts/road-land/blender';SOURCE.mkdir(parents=True,exist_ok=True)

def rocky():
 global active
 clear();stone=material('Coastal sandstone mineral',(.41,.38,.31),.94)
 # Eroded mass with angled fracture planes, uneven crowns and broken bedding.
 # Icosphere topology avoids the repeated rectangular layer silhouette.
 from mathutils import noise
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4,radius=1)
 o=attach(bpy.context.object,'Fractured sandstone outcrop',stone,False)
 for v in o.data.vertices:
  q=v.co.copy();a=math.atan2(q.y,q.x)
  coarse=noise.fractal(q*1.8+Vector((7,2,13)),.9,2.0,3)
  fine=noise.noise(q*8+Vector((12,4,9)))
  x=q.x*1.62*(1+coarse*.15)+.12*q.z
  y=q.y*1.13*(1+coarse*.14)-.08*q.z
  z=(q.z+1)*1.48+coarse*.16+fine*.022
  # Intersect a handful of tilted planes to form broad fracture faces.
  x=min(x,1.36-.19*z+.12*y);x=max(x,-1.42+.08*z-.16*y)
  y=min(y,.99-.11*z+.07*x);y=max(y,-1.07+.07*z+.15*x)
  z=min(z,2.52+.23*x-.13*y)
  # Different beds disappear around the rock rather than encircling it.
  depth=0
  for h,width,strength,phase in [(.63,.032,.045,.9),(1.17,.045,.063,2.1),(1.82,.027,.039,4.2)]:
   seam=z-h-x*.10-y*.055-.035*math.sin(a*3+phase)
   depth+=math.exp(-seam*seam/(width*width))*strength*(.4+.6*max(0,math.sin(a*2+phase)))
  x*=1-depth;y*=1-depth
  z=max(0,z-.18)
  v.co=(x,y,z)
 o.data.update()
 # Reduce redundant smooth triangles while retaining the fracture planes.
 bpy.context.view_layer.objects.active=o
 dec=o.modifiers.new('Broken sandstone silhouette','DECIMATE');dec.ratio=.70
 bpy.ops.object.modifier_apply(modifier=dec.name)
 # Fine material relief from the original rock maps; UVs remain packed in GLB.
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':
   bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.2,island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT');o.select_set(False)
 nodes=stone.node_tree.nodes;links=stone.node_tree.links;bsdf=nodes.get('Principled BSDF')
 for field,inputName in [('color','Base Color'),('surface','Roughness'),('normal','Normal')]:
  node=nodes.new('ShaderNodeTexImage');node.image=bpy.data.images.load(str(ROOT/'public/assets/land'/f'rock-{field}.png'));node.image.pack()
  if field!='color':node.image.colorspace_settings.name='Non-Color'
  if field=='surface':split=nodes.new('ShaderNodeSeparateColor');links.new(node.outputs['Color'],split.inputs['Color']);links.new(split.outputs['Green'],bsdf.inputs[inputName])
  elif field=='normal':n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.35;links.new(node.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],bsdf.inputs[inputName])
  else:links.new(node.outputs['Color'],bsdf.inputs[inputName])
 export('pacific-outcrop')
 # Preserve the irregular silhouette while reducing distant running cost.
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':
   bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Distant strata','DECIMATE');dec.ratio=.14;bpy.ops.object.modifier_apply(modifier=dec.name)
 export('pacific-outcrop-lod')

def fern():
 clear();leaf=material('Fern deep green leaflets',(.12,.23,.08),.94);stem=material('Fern pale stems',(.30,.32,.12),.91)
 for frond in range(9):
  a=frond*math.tau/9;axis=Vector((math.cos(a),math.sin(a),0));across=Vector((-math.sin(a),math.cos(a),0))
  def center(t):return axis*(t*.73)+Vector((0,0,math.sin(t*2.0)*.62+.015))
  for j in range(15):
   t=j/15;p=center(t);q=center((j+1)/15);mesh('Fern rachis',[p-across*.006,p+across*.006,q+across*.003,q-across*.003],[(0,1,2),(0,2,3)],stem)
   length=math.sin((t+.10)*math.pi)*.17
   for side in [-1,1]:
    tip=p+across*(side*length)+axis*.055;mid=p+across*(side*length*.54)+axis*.017+Vector((0,0,.018))
    mesh('Folded fern pinnule',[p-axis*.018,p+axis*.026,mid,tip],[(0,1,2),(1,3,2)],leaf)
 export('pacific-fern')

def scrub():
 clear();leaf=material('Coastal sage silver green',(.26,.34,.22),.96);stem=material('Sage woody branches',(.31,.26,.17),.96);petal=material('Coastal daisy ivory petals',(.78,.73,.51),.89);heart=material('Daisy ochre center',(.51,.33,.075),.9)
 for branch in range(7):
  a=branch*2.399;tip=Vector((math.cos(a)*.28,math.sin(a)*.28,.34+.12*math.sin(branch+2)));rod('Sage branch',(0,0,.02),tip,.012,stem,.004)
  for j in range(5):
   p=tip*(.25+j*.14);axis=Vector((math.cos(a+1),math.sin(a+1),.2));across=Vector((-axis.y,axis.x,0));leafTip=p+axis*.14;mid=p+axis*.06+Vector((0,0,.012))
   mesh('Sage lance leaf',[p,mid+across*.025,leafTip,mid-across*.025],[(0,1,2),(0,2,3)],leaf)
 for k in range(5):
  a=k*2.4;p=Vector((math.cos(a)*.20,math.sin(a)*.20,.46+.07*math.sin(k)));rod('Wildflower stem',(p.x*.8,p.y*.8,.02),p,.004,stem)
  sphere('Daisy center',p,(.027,.027,.015),heart)
  for j in range(8):
   aa=j*math.tau/8;axis=Vector((math.cos(aa),math.sin(aa),0));across=Vector((-axis.y,axis.x,0));mid=p+axis*.052;tip=p+axis*.096
   mesh('Wildflower petal',[p,mid+across*.023,tip,mid-across*.023],[(0,1,2),(0,2,3)],petal)
 export('pacific-scrub')

rocky();fern();scrub()
print('Built original sandstone outcrop with LOD, forest fern and coastal sage/wildflower cluster')
