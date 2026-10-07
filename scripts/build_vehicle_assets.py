"""Complete original vehicle family. No shared lower-body design.
blender --background --python scripts/build_vehicle_assets.py -- --model all
Selectors: vela-gt, traffic, traffic-sedan/wagon/compact/pickup/camper.
Meters; Blender +Y forward, Z up. Vela wheels remain on the game suspension.
"""
import bpy,math,sys,json
from pathlib import Path
from mathutils import Vector
_root=Path(__file__).resolve().parents[1]
_helpers=(_root/'scripts/build_juice_assets.py').read_text()
exec(_helpers[:_helpers.index('# PASS TWO')])

# Each profile is (longitudinal position, half-width, deck height).
# They are hand-authored separately: hood length, haunches, belt and tail differ.
DESIGNS={
 'vela-gt':dict(L=2.16,w=.98,axle=1.45,radius=.36,center=-.30,base=.33,h=.82,f=.85,rf=.37,rr=-.60,rear=-1.13,rw=.62,gw=.72,
  profiles=[(-2.16,.77,.27),(-1.94,.91,.30),(-1.46,1.0,.39),(-.85,.95,.37),(0,.90,.34),(.88,.94,.32),(1.45,.98,.28),(1.96,.89,.28),(2.16,.78,.23)]),
 'sedan':dict(L=2.275,w=.91,axle=1.48,radius=.35,center=-.33,base=.41,h=.91,f=.93,rf=.36,rr=-.87,rear=-1.40,rw=.66,gw=.76,
  profiles=[(-2.275,.79,.27),(-2.02,.87,.36),(-1.50,.92,.40),(-1.13,.91,.41),(0,.89,.41),(.94,.90,.42),(1.48,.91,.39),(2.02,.87,.34),(2.275,.79,.30)]),
 'wagon':dict(L=2.35,w=.93,axle=1.54,radius=.35,center=-.33,base=.43,h=.99,f=.90,rf=.31,rr=-1.78,rear=-2.16,rw=.72,gw=.80,
  profiles=[(-2.35,.87,.44),(-2.12,.92,.47),(-1.54,.93,.47),(-.95,.925,.45),(0,.91,.43),(.91,.92,.44),(1.54,.93,.41),(2.12,.86,.34),(2.35,.79,.30)]),
 'compact':dict(L=1.86,w=.87,axle=1.17,radius=.31,center=-.37,base=.43,h=.95,f=1.04,rf=.49,rr=-.94,rear=-1.72,rw=.65,gw=.74,
  profiles=[(-1.86,.71,.32),(-1.68,.84,.46),(-1.17,.875,.48),(-.5,.86,.44),(.6,.855,.43),(1.17,.87,.44),(1.58,.79,.36),(1.86,.67,.33)]),
 'pickup':dict(L=2.44,w=.97,axle=1.60,radius=.39,center=-.29,base=.56,h=1.06,f=.72,rf=.25,rr=-.49,rear=-.84,rw=.73,gw=.81,
  profiles=[(-2.44,.89,.48),(-2.26,.96,.57),(-1.60,.97,.59),(-.86,.965,.58),(-.40,.95,.57),(.70,.96,.57),(1.60,.975,.57),(2.16,.95,.53),(2.44,.87,.39)]),
 'camper':dict(L=2.51,w=.99,axle=1.63,radius=.375,center=-.305,base=.69,h=1.58,f=2.23,rf=1.81,rr=-2.49,rear=-2.49,rw=.91,gw=.95,
  profiles=[(-2.51,.91,.66),(-2.34,.98,.71),(-1.63,.99,.73),(-.6,.99,.73),(.75,.99,.73),(1.63,.99,.71),(2.28,.98,.67),(2.51,.91,.56)]),
}

def part(name,loc,size,m,b=.018):
    o=box(name,loc,size,m,b)
    for mod in o.modifiers:
        if mod.type=='BEVEL':mod.segments=2
    return o

def ring(name,loc,r,t,m,axis=(0,0,0),segments=32):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=segments,minor_segments=6,location=loc,rotation=axis)
    return finish(bpy.context.object,name,m,0,True)

def interpolate(points,y):
    for i,(a,b) in enumerate(zip(points,points[1:])):
        if a[0]<=y<=b[0]:
            t=(y-a[0])/(b[0]-a[0]);span=b[0]-a[0]
            before=points[max(0,i-1)];after=points[min(len(points)-1,i+2)]
            result=[]
            for k in [1,2]:
                ma=(b[k]-before[k])/(b[0]-before[0]);mb=(after[k]-a[k])/(after[0]-a[0])
                result.append((2*t**3-3*t*t+1)*a[k]+(t**3-2*t*t+t)*span*ma+(-2*t**3+3*t*t)*b[k]+(t**3-t*t)*span*mb)
            return result
    return points[0][1:] if y<points[0][0] else points[-1][1:]

def body_shell(kind,d,paint):
    vertices=[];faces=[];sections=92 if kind=='vela-gt' else 68
    for j in range(sections+1):
        y=-d['L']+j*2*d['L']/sections;w,z=interpolate(d['profiles'],y)
        floor=-.30 if kind not in ('pickup','camper') else -.25
        mid=-.09 if kind not in ('pickup','camper') else .05
        half=[(0,z+.009),(.43*w,z+.006),(.77*w,z-.015),(.93*w,z-.060),(w,z-.13),(.995*w,mid),(.96*w,floor+.045),(.82*w,floor),(0,floor)]
        cross=half+[(-x,zz) for x,zz in reversed(half[1:-1])]
        vertices.extend((x,y,zz) for x,zz in cross)
    count=len(cross)
    for j in range(sections):
        for k in range(count):a=j*count+k;b=j*count+(k+1)%count;faces.append((a,b,b+count,a+count))
    faces.extend([tuple(reversed(range(count))),tuple(sections*count+k for k in range(count))])
    shell=mesh(kind+' original full-body surfacing',vertices,faces,paint,True)
    for y in [-d['axle'],d['axle']]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=d['radius']+.055,depth=2.7,location=(0,y,d['center']),rotation=(0,math.pi/2,0))
        cutter=bpy.context.object;mod=shell.modifiers.new('Open fitted fender arch','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
        bpy.context.view_layer.objects.active=shell;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    if kind=='pickup':
        cutter=part('Temporary cargo-bed recess',(0,-1.59,.46),(1.69,1.48,.61),paint,0)
        mod=shell.modifiers.new('Actual open pickup bed','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
        bpy.context.view_layer.objects.active=shell;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    # Flat end faces and split manufactured edges keep the reflection continuous.
    for face in shell.data.polygons:
        if abs(face.normal.y)>.995:face.use_smooth=False
    shell.data.set_sharp_from_angle(angle=math.radians(48))
    bevel=shell.modifiers.new('Soft body perimeter and wheel-arch return','BEVEL');bevel.width=.035;bevel.segments=4;bevel.limit_method='ANGLE';bevel.angle_limit=math.radians(48)
    normal=shell.modifiers.new('Coachwork corner normals','WEIGHTED_NORMAL');normal.keep_sharp=True;normal.weight=40
    return shell

def panes(name,points,m):return mesh(name,points,[(0,1,2,3)],m)

def cabin(kind,d,paint,glass,trim,accent):
    f,rf,rr,rear,b,h,rw,gw=[d[k] for k in ['f','rf','rr','rear','base','h','rw','gw']]
    roofv=[];rooff=[]
    for j in range(13):
        t=j/12;y=rr+(rf-rr)*t;ww=rw
        for k in range(17):
            x=ww*(k/8-1);roofv.append((x,y,h+.020*math.sin(t*math.pi)-.035*(x/ww)**2))
    for j in range(12):
        for k in range(16):i=j*17+k;rooff.append((i,i+1,i+18,i+17))
    mesh('Curved '+kind+' roof',roofv,rooff,accent if kind=='camper' else paint,True)
    for yy,label in [(rf,'Windshield header'),(rr,'Rear screen header')]:
        vertices=[];faces=[]
        for k in range(17):
            x=rw*(k/8-1);vertices.extend([(x,yy,h-.035),(x,yy,h-.035*(x/rw)**2)])
        for k in range(16):i=k*2;faces.append((i,i+2,i+3,i+1))
        mesh(label,vertices,faces,accent if kind=='camper' else paint)
    panes('Fitted windshield' ,[(-gw,f,b),(gw,f,b),(rw,rf,h-.035),(-rw,rf,h-.035)],glass)
    panes('Rear glazing',[(-gw,rear,b),(-rw,rr,h-.035),(rw,rr,h-.035),(gw,rear,b)],accent if kind=='camper' else glass)
    for side in [-1,1]:
        A=(side*gw,f,b);B=(side*rw,rf,h-.035);C=(side*rw,rr,h-.035);D=(side*gw,rear,b)
        if kind=='camper':
            panes('Full van cabin side',[A,B,C,D],accent)
            def xz(z):return side*(gw+(rw-gw)*(z-b)/(h-.035-b)+.009)
            for name,y0,y1,z0,z1 in [('Driver window',.61,1.80,.91,1.45),('Living window',-.28,-1.17,1.02,1.40)]:
                p=[(xz(z0),y0,z0),(xz(z1),y0,z1),(xz(z1),y1,z1),(xz(z0),y1,z0)]
                panes(name,p,glass)
                for a,c in zip(p,p[1:]+p[:1]):rod('Van window gasket',a,c,.016,trim)
            for yy in [.43,-1.55]:rod('Sliding door edge',(xz(.75),yy,.75),(xz(1.50),yy,1.50),.004,trim,4)
        else:
            panes('Fitted side windows',[A,B,C,D],glass)
            mid=-.20 if kind!='wagon' else -.13
            rod('B pillar',(side*gw,mid,b),(side*rw,mid,h-.023),.033,trim)
            if kind=='wagon':rod('Cargo quarter pillar',(side*gw,-1.38,b),(side*rw,-1.38,h-.028),.032,paint)
        panes('Cabin beltline joining panel',[A,D,(D[0],D[1],b-.13),(A[0],A[1],b-.13)],accent if kind=='camper' else paint)
        for a,c in [(A,B),(C,D)]:rod('Painted structural pillar',a,c,.032 if kind!='compact' else .045,paint)
        for a,c in [(A,D),(B,C)]:rod('Glazing seal',a,c,.013,trim)
        rod('Door mirror mounting arm',(side*gw,f-.10,b+.01),(side*(d['w']+.02),f-.10,b+.10),.012,trim)
        part('Body-color door mirror',(side*(d['w']+.055),f-.10,b+.11),(.15,.22,.083),paint,.035)
        part('Reflective mirror insert',(side*(d['w']+.055),f-.214,b+.11),(.11,.007,.052),alloy,.012)
    if kind=='camper':panes('Closed camper rear belt panel',[(-gw,rear-.002,b-.16),(gw,rear-.002,b-.16),(gw,rear-.002,b),(-gw,rear-.002,b)],accent)
    # Fine framing avoids the former all-glass box sitting on a shared chassis.
    for y,z,width in [(f,b,gw),(rf,h-.035,rw),(rear,b,gw),(rr,h-.035,rw)]:rod('Screen seal',(-width,y,z),(width,y,z),.012,trim)

def wheel(kind,side,y,d,rubber,alloy,trim):
    r=d['radius'];z=d['center'];cx=side*(d['w']-.12);depth=.145 if kind=='pickup' else .125
    # Smooth convex tire with a thicker truck/van sidewall.
    verts=[];faces=[];profile=[(-depth,r*.67),(-depth,r*.86),(-depth*.87,r*.98),(-depth*.60,r),(depth*.60,r),(depth*.87,r*.98),(depth,r*.86),(depth,r*.67)]
    for x,rad in profile:
        for k in range(40):a=k*math.tau/40;verts.append((cx+x,y+rad*math.cos(a),z+rad*math.sin(a)))
    for j in range(len(profile)-1):
        for k in range(40):a=j*40+k;c=j*40+(k+1)%40;faces.append((a,c,c+40,a+40))
    mesh('Road tire '+kind,verts,faces,rubber,True)
    rim=r*(.64 if kind in ('pickup','camper') else .72);face=cx+side*(depth+.004)
    o=cyl('Dark inner wheel barrel',(face-side*.057,y,z),rim*.95,rim*.95,.035,trim,32);o.rotation_euler.y=math.pi/2
    ring('Rim rolled lip',(face,y,z),rim,.013,alloy,(0,math.pi/2,0))
    o=cyl('Recessed brake rotor',(face-side*.045,y,z),rim*.70,rim*.70,.018,brake,32);o.rotation_euler.y=math.pi/2
    if kind in ('compact','camper'):
        o=cyl('Pressed steel wheel',(face,y,z),rim*.91,rim*.91,.025,alloy,32);o.rotation_euler.y=math.pi/2
        for k in range(8 if kind=='compact' else 10):
            a=k*math.tau/(8 if kind=='compact' else 10)
            bpy.ops.mesh.primitive_circle_add(vertices=10,radius=rim*.105,fill_type='NGON',location=(face+side*.016,y+rim*.72*math.cos(a),z+rim*.72*math.sin(a)),rotation=(0,side*math.pi/2,0));finish(bpy.context.object,'Steel wheel ventilation hole',trim)
    else:
        count=8 if kind=='sedan' else (6 if kind=='pickup' else 5)
        for k in range(count):
            for split in ([-.052,.052] if kind=='wagon' else [0]):
                a=k*math.tau/count+split;u=Vector((0,math.cos(a),math.sin(a)));v=Vector((0,-math.sin(a),math.cos(a)));p=Vector((face,y,z));width=.018 if kind!='pickup' else .028
                points=[]
                for dx in [-.008,.008]:
                    for rr,ww in [(rim*.17,width*.7),(rim*.94,width)]:
                        for sign in [-1,1]:points.append(p+u*rr+v*(sign*ww)+Vector((dx,0,0)))
                mesh('Forged rim blade',points,[(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)],alloy)
    o=cyl('Wheel center cap',(face+side*.020,y,z),rim*.24,rim*.24,.027,trim,16);o.rotation_euler.y=math.pi/2
    for k in range(6 if kind=='pickup' else 5):
        a=k*math.tau/(6 if kind=='pickup' else 5);o=cyl('Wheel lug',(face+side*.037,y+rim*.20*math.cos(a),z+rim*.20*math.sin(a)),.009,.009,.012,alloy,6);o.rotation_euler.y=math.pi/2
    for k in range(44 if kind!='pickup' else 32):
        a=k*math.tau/(44 if kind!='pickup' else 32)
        tread=part('Tire tread blocks',(cx,y+(r-.002)*math.sin(a),z+(r-.002)*math.cos(a)),(depth*1.72,.018 if kind!='pickup' else .026,.008),trim,.001)
        tread.rotation_euler.x=-a

def fender_lips(kind,d,paint,trim):
    # Continuous low-cost returns follow the shell cross-section at every height.
    for side in [-1,1]:
        for axle in [-d['axle'],d['axle']]:
            arc=[]
            for k in range(33):
                a=.18+(math.pi-.36)*k/32;r=d['radius']+.055
                yy=axle+r*math.cos(a);zz=d['center']+r*math.sin(a);ww,deck=interpolate(d['profiles'],yy)
                floor=-.30 if kind not in ('pickup','camper') else -.25;mid=-.09 if kind not in ('pickup','camper') else .05
                if zz<floor+.025:continue
                contour=[(0,deck+.009),(.43*ww,deck+.006),(.77*ww,deck-.015),(.93*ww,deck-.060),(ww,deck-.13),(.995*ww,mid),(.96*ww,floor+.045),(.82*ww,floor)]
                xx=ww*.99
                for (xa,za),(xb,zb) in zip(contour,contour[1:]):
                    if zb<=zz<=za:xx=xa+(xb-xa)*(za-zz)/(za-zb);break
                arc.append(Vector((side*(xx+.003),yy,zz)))
            vertices=[];faces=[];thickness=.022 if kind=='pickup' else .009
            for k,p in enumerate(arc):
                tangent=(arc[min(k+1,len(arc)-1)]-arc[max(0,k-1)]).normalized()
                normal=Vector((side,0,0));normal=(normal-tangent*normal.dot(tangent)).normalized();binormal=tangent.cross(normal).normalized()
                for j in range(8):a=j*math.tau/8;vertices.append(p+thickness*(normal*math.cos(a)+binormal*math.sin(a)))
            for k in range(len(arc)-1):
                for j in range(8):i=k*8+j;n=k*8+(j+1)%8;faces.append((i,n,n+8,i+8))
            faces.extend([tuple(reversed(range(8))),tuple((len(arc)-1)*8+j for j in range(8))])
            mesh('Continuous fitted fender lip',vertices,faces,trim if kind in ('pickup','camper','compact') else paint,True)

def road_detail(kind,d,paint,trim,alloy,glass,head,tail,ivory):
    L,w=d['L'],d['w']
    fender_lips(kind,d,paint,trim)
    for side in [-1,1]:
        # Door stamping and belt moldings follow this vehicle's own shell.
        for yy in ([-.03,-1.10] if kind in ('sedan','wagon') else [-.24]):
            width,height=interpolate(d['profiles'],yy)
            part('Recessed door handle',(side*width*.997,yy,height-.14),(.014,.145,.028),alloy,.006)
            rod('Door shut line',(side*width*.997,yy-.20,-.20),(side*width*.997,yy-.20,height-.08),.0035,trim,4)
        if kind=='vela-gt':
            part('Aero rocker',(side*.88,0,-.23),(.11,1.95,.095),trim,.012)
            for yy in [1.38,1.48,1.58]:part('Hood cooling slot',(side*.67,yy,interpolate(d['profiles'],yy)[1]-.015),(.23,.027,.01),trim,.003)
            for yy in [-1.71,-1.59,-1.47]:part('Rear deck ventilation',(side*.37,yy,interpolate(d['profiles'],yy)[1]+.006),(.38,.033,.014),trim,.003)
        elif kind in ('sedan','wagon'):
            rod('Belt rubbing strip',(side*(w-.013),-1.85,.08),(side*(w-.013),1.65,.08),.012,trim)
        elif kind=='pickup':
            part('Truck rocker step',(side*(w-.04),.02,-.26),(.14,1.62,.11),trim,.018)
        elif kind=='camper':
            part('Van lower cladding',(side*(w-.002),-.03,-.11),(.045,4.60,.13),trim,.015)
            for i in range(5):part('Engine bay louver',(side*.985,-1.88,.28+i*.055),(.012,.31,.019),trim,.002)
        # Each type has unique light shape and bumper depth, not the old sedan nose.
        if kind=='sedan':
            part('Sedan rectangular optical bezel',(side*.58,L+.006,.20),(.48,.025,.13),trim,.017)
            part('Sedan lamp lens',(side*.58,L+.021,.20),(.40,.012,.085),head,.010)
            part('Sedan broad tail lens',(side*.54,-L-.013,.155),(.42,.018,.08),tail,.011)
        elif kind=='wagon':
            part('Wagon inset lamp',(side*.57,L+.009,.18),(.43,.025,.15),trim,.02)
            part('Wagon projector',(side*.57,L+.025,.18),(.34,.009,.095),head,.012)
            part('Cargo vertical tail lens',(side*.75,-L-.012,.24),(.10,.015,.26),tail,.025)
        elif kind=='compact':
            bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=1,location=(side*.405,L-.031,.19));o=bpy.context.object;o.scale=(.215,.06,.12);finish(o,'Inset oval lamp bezel',trim,0,True)
            bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=1,location=(side*.405,L-.025,.19));o=bpy.context.object;o.scale=(.195,.06,.105);finish(o,'Oval compact headlight',head,0,True)
            part('Compact corner rear light',(side*.65,-L-.011,.31),(.14,.027,.21),tail,.05)
        elif kind=='pickup':
            part('Truck square light surround',(side*.65,L+.009,.23),(.30,.026,.26),alloy,.025)
            part('Truck square sealed lamp',(side*.65,L+.026,.26),(.23,.014,.155),head,.023)
            part('Pickup upright rear light',(side*.79,-L-.014,.29),(.11,.021,.26),tail,.02)
        elif kind=='camper':
            part('Van corner lamp bezel',(side*.72,L+.007,.22),(.25,.025,.24),trim,.025)
            part('Van headlamp',(side*.72,L+.024,.25),(.18,.012,.13),head,.02)
            part('Van tall rear cluster',(side*.80,-L-.01,.31),(.11,.025,.31),tail,.02)
        else:
            part('GT sculpted lamp recess',(side*.51,L-.010,.13),(.55,.068,.12),trim,.04)
            for j in range(3):part('GT independent projector',(side*.51+(j-1)*.15,L+.021,.14),(.102,.009,.044),head,.016)
            part('GT running-light blade',(side*.51,L+.016,.213),(.53,.012,.015),head,.004)
            part('GT slim tail strip',(side*.49,-L-.006,.23),(.64,.025,.042),tail,.011)
    # Inset indicators and optical dividers give each lamp a readable construction.
    for side in [-1,1]:
        if kind in ('sedan','wagon'):
            part('Amber corner indicator',(side*.72,L+.030,.18),(.10,.011,.070),amber,.008)
            rod('Headlight optical divider',(side*.55,L+.034,.145),(side*.55,L+.034,.225),.0035,alloy,4)
        elif kind in ('pickup','camper'):
            part('Amber lower lamp',(side*(.65 if kind=='pickup' else .72),L+.036,.15),(.15,.012,.040),amber,.009)
    # Hood and trunk creases follow the authored surface, rather than a flat overlay.
    if kind!='camper':
        for side in [-1,1]:
            points=[]
            for j in range(13):
                yy=d['f']+.07+(L-d['f']-.30)*j/12;ww,zz=interpolate(d['profiles'],yy)
                points.append((side*ww*.64,yy,zz-.003))
            for aa,bb in zip(points,points[1:]):rod('Fine stamped hood crease',aa,bb,.0025,trim,4)
    if kind=='sedan':
        part('Sedan painted bumper',(0,L-.005,-.015),(1.60,.16,.13),paint,.045)
        part('Sedan chrome bumper strip',(0,L+.071,-.017),(1.62,.010,.018),alloy,.004)
        part('Sedan twin grille',(0,L+.021,.20),(.47,.012,.13),trim,.014)
        for x in [-.18,-.12,-.06,.06,.12,.18]:rod('Sedan vertical grille', (x,L+.030,.14),(x,L+.030,.26),.004,alloy,4)
    elif kind=='wagon':
        part('Wagon molded bumper',(0,L+.007,-.045),(1.65,.14,.18),trim,.035)
        part('Wagon horizontal grille',(0,L+.025,.18),(.61,.017,.13),trim,.01)
        for z in [.14,.18,.22]:rod('Wagon grille bar',(-.30,L+.035,z),(.30,L+.035,z),.005,alloy,4)
        for x in [-.56,.56]:rod('Cargo roof rail',(x,-1.70,d['h']+.08),(x,.24,d['h']+.08),.020,alloy)
        for y in [-1.38,-.08]:rod('Cargo roof crossbar',(-.64,y,d['h']+.093),(.64,y,d['h']+.093),.014,trim)
        part('Cargo tailgate panel',(0,-L+.016,.18),(1.51,.035,.44),paint,.018)
        rod('Rear window wiper',(-.24,d['rear']-.009,.65),(.24,d['rear']-.009,.73),.009,trim)
    elif kind=='compact':
        part('Hatch sculpted bumper',(0,L-.07,-.030),(1.32,.21,.23),paint,.065)
        part('Compact lower intake',(0,L+.049,-.035),(.73,.015,.083),trim,.03)
        for x in [-.54,.54]:part('Round fog lamp',(x,L+.052,-.025),(.07,.012,.045),head,.018)
        part('Hatchback rear sill',(0,-L+.007,-.12),(1.4,.14,.12),trim,.035)
        part('Hatch spoiler',(0,-1.42,.71),(1.27,.20,.053),paint,.022)
    elif kind=='pickup':
        part('Pickup full-height grille',(0,L+.014,.26),(.95,.025,.28),trim,.015)
        for z in [.17,.23,.29,.35]:rod('Pickup horizontal grille',(-.45,L+.035,z),(.45,L+.035,z),.010,alloy,6)
        part('Pickup steel front bumper',(0,L-.011,-.02),(1.75,.18,.19),alloy,.035)
        part('Actual ribbed bed floor',(0,-1.59,.16),(1.66,1.47,.025),trim,.005)
        for x in [-.69,-.46,-.23,0,.23,.46,.69]:part('Bed floor rib',(x,-1.59,.19),(.032,1.43,.035),trim,.003)
        for side in [-1,1]:part('Bed top cap',(side*.897,-1.60,.581),(.12,1.65,.035),trim,.007)
        part('Stamped tailgate',(0,-L+.015,.34),(1.54,.033,.40),paint,.02)
        part('Tailgate handle',(0,-L-.009,.47),(.19,.012,.035),trim,.007)
        part('Pickup rear step bumper',(0,-L-.007,-.10),(1.75,.20,.14),alloy,.025)
    elif kind=='camper':
        part('Van rectangular front intake',(0,L+.020,.22),(.85,.015,.24),trim,.012)
        for z in [.14,.19,.24,.29]:rod('Van cooling grille',(-.40,L+.032,z),(.40,L+.032,z),.006,alloy,4)
        part('Van wraparound front bumper',(0,L-.021,-.12),(1.78,.20,.17),trim,.045)
        part('Van rear full-height door',(0,-2.514,1.06),(1.61,.020,.90),accent,.018)
        panes('Camper rear door window',[(-.48,-2.527,.99),(-.48,-2.527,1.40),(.48,-2.527,1.40),(.48,-2.527,.99)],glass)
        part('Camper rear door handle',(.56,-2.530,.80),(.11,.015,.032),alloy,.008)
        part('Pop-top gasket',(0,-.23,1.598),(1.73,3.90,.042),trim,.018)
        part('Raised camper roof',(0,-.23,1.643),(1.70,3.86,.065),accent,.028)
        part('Roof skylight',(0,-.76,1.687),(.59,.65,.025),glass,.032)
    else:
        part('GT low splitter',(0,L-.04,-.25),(1.64,.26,.05),trim,.018)
        part('GT central radiator',(0,L+.029,-.067),(.84,.016,.09),trim,.023)
        for x in [j*.06 for j in range(-6,7)]:rod('GT radiator blade',(x,L+.038,-.102),(x,L+.038,-.033),.003,alloy,4)
        part('GT ducktail',(0,-1.99,.342),(1.67,.18,.05),paint,.022)
        part('GT diffuser',(0,-L+.015,-.248),(1.48,.17,.09),trim,.014)
        for x in [-.48,-.24,0,.24,.48]:part('GT diffuser fin',(x,-L+.02,-.265),(.014,.20,.09),trim,.002)
        for x in [-.62,.62]:
            o=cyl('GT exhaust tip',(x,-L-.004,-.207),.058,.058,.15,alloy,24);o.rotation_euler.x=math.pi/2
            o=cyl('Recessed tailpipe bore',(x,-L-.083,-.207),.044,.044,.009,trim,20);o.rotation_euler.x=math.pi/2
        text('Vela rear badge','V E L A',(0,-L-.024,.277),.050,alloy)
    part('Rear registration',(0,-L-.030,.06 if kind!='vela-gt' else -.03),(.35,.012,.10),ivory,.006)
    if kind!='vela-gt':text('Pacific traffic plate','PR  '+{'sedan':'204','wagon':'318','compact':'127','pickup':'406','camper':'512'}[kind],(0,-L-.039,.034),.046,trim)
    if kind=='vela-gt':text('Pacific plate','PACIFIC',(0,-L-.039,-.048),.048,trim)
    else:part('Rear bumper',(0,-L+.003,-.22),(w*1.77,.11,.10),trim,.022)


def interior(kind,d,trim,leather,alloy):
    f,b,h=d['f'],d['base'],d['h']
    part('Cabin floor',(0,-.1,b-.055),(1.40,1.7,.026),trim,.004)
    part('Dashboard safely inside screen',(0,f-.28,b+.06),(1.22,.21,.12),trim,.026)
    seatY=f-.70
    for x in [-.34,.34]:
        part('Upholstered seat cushion',(x,seatY,b+.025),(.45,.42,.105),leather,.038)
        o=part('Seat back',(x,seatY-.23,b+.20),(.43,.11,.33),leather,.035);o.rotation_euler.x=-.10
        part('Separate headrest',(x,seatY-.23,b+.40),(.26,.10,.105),leather,.025)
    part('Center console',(0,seatY+.12,b+.06),(.15,.65,.12),trim,.018)
    ring('Steering wheel',(-.34,f-.47,b+.21),.12,.014,trim,(math.pi/2-.25,0,0))
    part('Instrument binnacle',(-.34,f-.28,b+.15),(.30,.11,.13),trim,.02)
    for x in [-.43,-.26]:ring('Instrument chrome ring',(x,f-.341,b+.17),.035,.003,alloy,(math.pi/2,0,0),20)
    for x in [-.30,.30]:
        # Wiper lies on the actual raked screen, not floating in front of it.
        t=.15;p=(x,f+(d['rf']-f)*t,b+(h-.035-b)*t+.008)
        q=(x-.11,f+(d['rf']-f)*.33,b+(h-.035-b)*.33+.008)
        rod('Fitted windshield wiper arm',p,q,.005,trim,6)
        rod('Wiper rubber blade',(q[0]-.13,q[1],q[2]),(q[0]+.14,q[1],q[2]),.006,trim,6)


def save_vehicle(name):
    # Preserve named body panels and editable bevels; batch only the GLB copy.
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')))
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH':continue
        bpy.context.view_layer.objects.active=o
        for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
    buckets={}
    for o in list(bpy.context.scene.objects):
        if o.type=='MESH':buckets.setdefault(o.data.materials[0].name,[]).append(o)
    for nameM,items in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in items:o.select_set(True)
        bpy.context.view_layer.objects.active=items[0]
        if len(items)>1:bpy.ops.object.join()
        items[0].name=nameM;items[0].data.validate(clean_customdata=False)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_apply=True)
    print('VEHICLE_EXPORTED',name,'draws',len(buckets))

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
selected=globals().get('_VEHICLE_SELECTION') or (args[args.index('--model')+1] if '--model' in args else 'all')
for kind,d in DESIGNS.items():
    asset=kind if kind=='vela-gt' else 'traffic-'+kind
    if selected not in ('all',asset) and not(selected=='traffic' and kind!='vela-gt'):continue
    clear()
    for unused in list(bpy.data.materials):
        if unused.users==0:bpy.data.materials.remove(unused)
    hero=kind=='vela-gt'
    paint=mat('Vela coachwork' if hero else 'Traffic enamel',(.91,.39,.075) if hero else (.30,.46,.47),.65 if hero else .58,.24 if hero else .28)
    paint.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=1 if hero else .80
    trim=mat('Graphite aero' if hero else 'Traffic polymer',(.017,.022,.025),.12,.61)
    alloy=mat('Brushed alloy' if hero else 'Traffic satin alloy',(.52,.57,.59),.91,.26)
    glass=mat('Smoked blue glazing' if hero else 'Traffic smoked glazing',(.014,.036,.041),.16,.095)
    if hero:
        glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.78;glass.surface_render_method='DITHERED'
    head=mat('Ivory LED' if hero else 'Traffic ivory lamps',(.95,.88,.70),.1,.2,2.6 if hero else .70)
    tail=mat('Ruby LED' if hero else 'Traffic ruby lamps',(.65,.015,.008),.1,.23,2.0 if hero else .65)
    leather=mat('Saddle interior' if hero else 'Traffic upholstery',(.16,.075,.032),0,.89)
    ivory=mat('Porcelain lettering' if hero else 'Traffic registration',(.80,.78,.69),0,.65)
    brake=mat('Dark brake steel',(.12,.14,.15),.65,.46)
    amber=mat('Amber indicator optic',(.9,.30,.025),.16,.25,.30)
    rubber=mat('Traffic tire rubber',(.011,.014,.016),0,.93)
    accent=mat('Traffic accent',(.78,.76,.66),.26,.36) if kind=='camper' else paint
    body_shell(kind,d,paint);cabin(kind,d,paint,glass,trim,accent)
    road_detail(kind,d,paint,trim,alloy,glass,head,tail,ivory);interior(kind,d,trim,leather,alloy)
    if not hero:
        for side in [-1,1]:
            for y in [-d['axle'],d['axle']]:wheel(kind,side,y,d,rubber,alloy,trim)
    save_vehicle(asset)
    if not hero:
        for o in list(bpy.context.scene.objects):
            if o.type!='MESH':continue
            bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Distant vehicle silhouette','DECIMATE');dec.ratio=.18
            bpy.ops.object.modifier_apply(modifier=dec.name);o.data.validate(clean_customdata=False)
        save_vehicle(asset+'-lod')
