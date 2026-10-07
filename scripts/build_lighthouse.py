"""Rebuild the original Pacific Point lighthouse using Blender's background CLI."""
import bpy, math
from pathlib import Path
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def mat(name, rgb, metal=0, rough=.6, emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*rgb,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*rgb,1)
    p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if emission: p.inputs['Emission Color'].default_value=(*rgb,1); p.inputs['Emission Strength'].default_value=emission
    return m
stone=mat('Warm limestone',(.64,.59,.48)); cream=mat('Salt weathered ivory',(.82,.79,.67)); red=mat('Vermilion enamel',(.38,.075,.035),.3,.3)
metal=mat('Bronze railings',(.08,.11,.105),.7,.32); glass=mat('Lantern amber',(.95,.54,.13),.1,.24,2)
roof=mat('Slate shingles',(.15,.19,.19)); wood=mat('Keeper door',(.14,.20,.19))
def finish(o,name,m,bevel=0):
    o.name=name;o.data.materials.append(m)
    if bevel:
        mod=o.modifiers.new('Soft manufactured edges','BEVEL');mod.width=bevel;mod.segments=3
        o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
    return o
def cyl(name,r1,r2,h,z,m,verts=64):
    bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r1,radius2=r2,depth=h,location=(0,0,z))
    o=finish(bpy.context.object,name,m,.025)
    for p in o.data.polygons:p.use_smooth=abs(p.normal.z)<.5
    return o
def box(name,loc,scale,m):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,m,.04)
cyl('Octagonal stone foundation',4.3,4.3,1,.5,stone,8)
cyl('Lower tower',2.45,1.94,8,5,cream)
cyl('Scarlet middle course',1.94,1.70,4,11,red)
cyl('Upper tower',1.70,1.40,5,15.5,cream)
for z,r in [(1,2.55),(9,2.02),(13,1.78),(18,1.65)]:cyl('Stone cornice',r,r,.23,z,stone)
cyl('Gallery platform',2.45,2.45,.28,18.2,cream)
cyl('Lantern sill',1.40,1.40,.3,18.55,metal)
cyl('Fresnel lamp',.52,.52,1.7,19.55,glass,32)
for i in range(12):
    a=i*math.tau/12
    box('Lantern mullion',(1.3*math.cos(a),1.3*math.sin(a),19.7),(.08,.08,2.1),metal)
    box('Gallery upright',(2.2*math.cos(a),2.2*math.sin(a),18.9),(.055,.055,1.1),metal)
for z,r in [(19.35,2.2),(18.9,2.2),(20.75,1.4)]:
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=.045,major_segments=64,minor_segments=8,location=(0,0,z));finish(bpy.context.object,'Gallery handrail',metal)
cyl('Lantern roof',1.8,.15,1.35,21.4,red)
cyl('Lightning finial',.07,.025,1,22.4,metal,12)
box('Entrance surround',(0,-2.35,2.1),(1.45,.3,2.35),stone)
box('Entrance door',(0,-2.53,2),(1.05,.08,1.9),wood)
for z,r in [(5,2.2),(10,1.87),(15,1.6)]:
    box('Window surround',(0,-r,z),(.75,.15,1.1),stone)
    box('Recessed window',(0,-r-.09,z),(.52,.035,.83),metal)
box('Keeper cottage',(7,2,1.8),(7,5,3.6),cream)
for sign in [-1,1]:
    o=box('Pitched slate roof',(7,2+sign*1.4,4.3),(7.6,3.1,.2),roof);o.rotation_euler.x=-sign*.43
for x in [4.7,7,9.3]:
    box('Cottage window frame',(x,-.53,2),(.95,.14,1.4),stone)
    box('Cottage window',(x,-.62,2),(.72,.04,1.15),metal)
box('Chimney',(9,2.2,4.9),(.7,.8,2),stone)
# Bake bevels, then join into material groups to bound in-game draw calls.
for obj in list(bpy.context.scene.objects):
    bpy.context.view_layer.objects.active=obj
    for modifier in list(obj.modifiers): bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.join()
out=Path(__file__).resolve().parents[1]/'public/assets/pacific-point.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_apply=True)
print('EXPORTED',out)
