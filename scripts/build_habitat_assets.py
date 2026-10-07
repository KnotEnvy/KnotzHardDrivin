"""Authored palm and overlook furniture, using the same original model helpers."""
clear()
bark=mat('Palm fibrous bark',(.31,.23,.13),0,.95)
leaf=mat('Palm waxy leaflets',(.16,.24,.095),0,.82);leaf.use_backface_culling=False
fiber=mat('Palm dry crown fibers',(.32,.25,.11),0,1)
v=[];f=[];rings=49;sides=16
for j in range(rings):
    z=j*10/(rings-1);r=(.28-z*.009)*(1+.06*math.sin(j*2.1))
    for k in range(sides):
        a=k*math.tau/sides;v.append((r*math.cos(a)+.018*z*z,r*math.sin(a),z))
for j in range(rings-1):
    for k in range(sides):a=j*sides+k;b=j*sides+(k+1)%sides;f.append((a,b,b+sides,a+sides))
mesh('Naturally bowed palm trunk',v,f,bark,True)
# Ring scars are subtly raised at old leaf attachment points.
for j in range(28):
    z=.22+j*.35;torus('Palm leaf scar',(.018*z*z,0,z),.28-z*.009,.009,bark,segments=16)
for branch in range(11):
    a=branch*math.tau/11+.18;axis=Vector((math.cos(a),math.sin(a),0));across=Vector((-math.sin(a),math.cos(a),0));origin=Vector((1.80,0,9.97))
    def center(t):return origin+axis*(t*4.4)+Vector((0,0,math.sin(t*math.pi)*.75-t*t*.9))
    for j in range(28):
        t=j/28;p=center(t);q=center((j+1)/28);span=(math.sin(t*math.pi)*.72+.13)*(1-t*.3)
        mesh('Palm leaf midrib',[p-across*.014,p+across*.014,q+across*.008,q-across*.008],[(0,1,2,3)],fiber)
        for side in [-1,1]:
            tip=p+axis*.42+across*(side*span)+Vector((0,0,-.20));fold=p+axis*.19+across*(side*span*.58)+Vector((0,0,-.055))
            mesh('Folded palm leaflet',[p-axis*.055,p+axis*.095,fold,tip],[(0,1,2),(1,3,2)],leaf)
for i in range(9):
    a=i*2.4;p=Vector((1.8,0,9.95));q=p+Vector((math.cos(a)*.43,math.sin(a)*.43,-1.1-random.random()*.35));rod('Dry crown petiole',p,q,.025,fiber,6)
for i in range(5):
    a=i*2.4;bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=.17,location=(1.8+.30*math.cos(a),.3*math.sin(a),9.77));finish(bpy.context.object,'Coconut cluster',fiber,0,True)
surface(bark,'bark',1.1);export('pacific-palm')
for obj in list(bpy.context.scene.objects):
    if obj.type!='MESH':continue
    bpy.context.view_layer.objects.active=obj
    dec=obj.modifiers.new('Distant palm canopy','DECIMATE');dec.ratio=.23
    bpy.ops.object.modifier_apply(modifier=dec.name)
export('pacific-palm-lod')
clear()
wood=mat('Overlook weathered timber',(.30,.19,.09),0,.91);iron=mat('Overlook galvanized metal',(.28,.31,.31),.73,.47);cream=mat('Overlook limestone',(.55,.52,.43),0,.9);green=mat('Park signage green',(.02,.11,.095),.08,.8);ink=mat('Park signage lettering',(.80,.78,.62),0,.85)
box('Overlook paving',(0,0,.12),(7,5,.24),cream,.018)
for x in [-2,2]:
    for i in range(7):box('Picnic table top plank',(x,-.35+i*.12,.86),(1.72,.09,.07),wood,.01)
    for y in [-.85,.95]:
        for i in range(3):box('Picnic bench plank',(x,y+i*.09,.45),(1.9,.07,.065),wood,.008)
    for xx in [x-.58,x+.58]:
        rod('Picnic table A frame',(xx,-.67,.10),(xx,.08,.80),.055,iron)
        rod('Picnic table A frame',(xx,.85,.10),(xx,.08,.80),.055,iron)
        rod('Picnic bench support',(xx,-.88,.37),(xx,1.14,.37),.048,iron)
for x in [-3.15,3.15]:
    box('Overlook fence post',(x,2.25,.76),(.13,.13,1.2),wood,.017)
for z in [.60,1.20]:box('Overlook fence horizontal',(0,2.25,z),(6.5,.08,.08),wood,.013)
for i in range(19):box('Overlook railing spindle',(-3+i*.33,2.25,.85),(.045,.045,.66),iron,.005)
box('Interpretive board',(0,-2.0,1.42),(1.8,.10,.70),green,.025)
for x in [-.65,.65]:box('Interpretive board support',(x,-1.95,.68),(.08,.08,1.3),wood,.015)
text('Interpretive title','PACIFIC OVERLOOK',(0,-2.061,1.52),.135,ink)
text('Interpretive subtitle','TAKE THE LONG WAY',(0,-2.061,1.32),.075,ink)
cyl('Viewing scope pedestal',(2.55,1.6,.90),.09,.075,1.5,iron,16)
rod('Binocular scope',(2.55,1.35,1.7),(2.55,1.75,1.85),.11,iron,16)
surface(wood,'cedar',.9);surface(cream,'concrete',.5);export('pacific-overlook')
