"""Final forest: textured intersecting sprays, asymmetrical branches, two crown profiles.
Uses the same original manufacturing/export helpers as the main art build.
"""
from pathlib import Path
source=Path(__file__).with_name('build_juice_assets.py').read_text()
exec(source[:source.index('# PASS TWO')])
clear()
bark=mat('Redwood ridged bark',(.22,.10,.055),0,1)
leaf=mat('Redwood needle cards',(.08,.18,.08),0,.91)
image=bpy.data.images.load(str(ROOT/'public/assets/redwood-needles.png'));image.pack()
tex=leaf.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
bsdf=leaf.node_tree.nodes.get('Principled BSDF');leaf.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color']);leaf.node_tree.links.new(tex.outputs['Alpha'],bsdf.inputs['Alpha'])
leaf.surface_render_method='DITHERED';leaf.use_backface_culling=False

def card(name,a,b,across,width):
    a,b,across=Vector(a),Vector(b),Vector(across)*width
    o=mesh(name,[a-across*.38,a+across*.38,b+across*.55,b-across*.55],[(0,1,2,3)],leaf)
    uv=o.data.uv_layers.new(name='Needle atlas')
    for polygon in o.data.polygons:
        for loop in polygon.loop_indices:uv.data[loop].uv=[(0,0),(1,0),(1,1),(0,1)][o.data.loops[loop].vertex_index]

def build(name,seed,low=False,wide=False):
    clear();random.seed(seed)
    v=[];f=[];rings=12 if not low else 8;sides=12 if not low else 8;height=25
    for j in range(rings):
        z=j*height/(rings-1);r=.60*(1-j/rings)+.07
        for k in range(sides):
            a=k*math.tau/sides;rr=r*(1+.13*math.sin(k*9+j*.7));v.append((rr*math.cos(a)+.12*math.sin(j*.4),rr*math.sin(a),z))
    for j in range(rings-1):
        for k in range(sides):a=j*sides+k;b=j*sides+(k+1)%sides;f.append((a,b,b+sides,a+sides))
    mesh('Fluted redwood trunk',v,f,bark,True)
    layers=16 if not low else 10;branches=9 if not low else 7
    for j in range(layers):
        t=j/(layers-1);z=5+t*19
        reach=(1-t)**.76*(5.0 if wide else 4.0)+.18
        for k in range(branches):
            if random.random()<.08:continue
            a=k*math.tau/branches+j*.77+(random.random()-.5)*.4
            length=reach*(.65+random.random()*.55)
            zz=z+(random.random()-.5)*1.5
            base=Vector((.15*math.sin(j*.7),0,zz));tip=base+Vector((math.cos(a)*length,math.sin(a)*length,-.35-random.random()*.45))
            direction=tip-base
            if not low:
                bpy.ops.mesh.primitive_cone_add(vertices=5,radius1=.040,radius2=.004,depth=direction.length,location=(base+tip)/2)
                o=bpy.context.object;o.rotation_euler=direction.to_track_quat('Z','Y').to_euler();finish(o,'Natural redwood bough',bark)
            tangent=Vector((-math.sin(a),math.cos(a),0))
            start=base.lerp(tip,.08)
            for plane in range(3 if not low else 2):
                across=tangent*math.cos(plane*math.pi/3)+Vector((0,0,1))*math.sin(plane*math.pi/3)
                width=(.45+length*.44)*(1+random.random()*.2)
                card('Individual needle spray',start,tip,across,width)
    export(name)

build('pacific-redwood',57)
build('pacific-redwood-lod',57,True)
build('pacific-redwood-wide',99,wide=True)
build('pacific-redwood-wide-lod',99,True,True)
