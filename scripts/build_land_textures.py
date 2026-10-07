"""Original, deterministic, tileable road and habitat PBR maps."""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np,json
OUT=Path(__file__).resolve().parents[1]/'public/assets/land';OUT.mkdir(parents=True,exist_ok=True)
N=1024

def noise(rng,cells):
 a=rng.random((cells,cells)).astype(np.float32)
 tile=Image.fromarray(np.tile(a,(3,3))).resize((N*3,N*3),Image.Resampling.BICUBIC)
 v=np.asarray(tile.crop((N,N,N*2,N*2)),dtype=np.float32)
 return (v-v.mean())/(v.std()+1e-5)

report=[]
for index,(kind,base) in enumerate([('asphalt',(69,71,68)),('grass',(99,106,64)),('soil',(127,108,80)),('sand',(180,160,125)),('needles',(101,74,49)),('rock',(137,129,112)),('gravel',(144,132,110))]):
 rng=np.random.default_rng(1019+index*97)
 broad=noise(rng,6);middle=noise(rng,40);fine=noise(rng,220)
 variation=broad*.055+middle*.038+fine*.043
 if kind=='rock':
  y,x=np.mgrid[0:N,0:N];layers=np.sin(y/N*np.pi*10+noise(rng,5)*4+noise(rng,19)*.8)
  variation+=layers*.025;height=middle*.11+layers*.045+fine*.055
 else:height=middle*.09+fine*.075
 rgb=np.clip(np.asarray(base)[None,None,:]*(1+variation[:,:,None]),0,255).astype(np.uint8)
 color=Image.fromarray(rgb);heightMap=Image.fromarray(np.uint8(np.clip(128+height*100,0,255)))
 c=ImageDraw.Draw(color);h=ImageDraw.Draw(heightMap)
 # Wrap every small feature across edges, preserving repeat continuity.
 def ellipse(box,ink,elevation):
  for ox in [-N,0,N]:
   for oy in [-N,0,N]:
    b=[box[0]+ox,box[1]+oy,box[2]+ox,box[3]+oy];c.ellipse(b,fill=ink);h.ellipse(b,fill=elevation)
 if kind in ('asphalt','soil','gravel','sand'):
  count={'asphalt':18500,'soil':6400,'gravel':5000,'sand':12000}[kind]
  for i in range(count):
   x,y=rng.uniform(0,N,2);radius=rng.uniform(.45,2.2) if kind!='gravel' else rng.uniform(1.1,6.7)
   tone=rng.uniform(.72,1.34);ink=tuple(int(np.clip(v*tone,0,255)) for v in base)
   ellipse((x-radius,y-radius*.65,x+radius,y+radius*.7),ink,int(rng.uniform(118,171)))
 if kind in ('grass','needles'):
  for i in range(11500 if kind=='needles' else 6500):
   x,y=rng.uniform(0,N,2);angle=rng.uniform(0,np.pi*2);length=rng.uniform(9,34) if kind=='needles' else rng.uniform(4,19)
   ink=(int(rng.uniform(105,161)),int(rng.uniform(78,116)),int(rng.uniform(40,70))) if kind=='needles' else (int(rng.uniform(77,127)),int(rng.uniform(92,137)),int(rng.uniform(46,81)))
   for ox in [-N,0,N]:
    for oy in [-N,0,N]:
     points=[(x+ox,y+oy),(x+ox+np.cos(angle)*length,y+oy+np.sin(angle)*length)];c.line(points,fill=ink,width=1 if kind=='needles' else 2);h.line(points,fill=158,width=1 if kind=='needles' else 2)
 hh=np.asarray(heightMap,dtype=np.float32)/255
 rough=np.clip(.88+middle*.025+fine*.027-(hh-.5)*.09,.65,.99)
 if kind=='asphalt':rough=np.clip(.88+middle*.026-(hh-.5)*.12,.72,.99)
 ao=np.clip(.91+(hh-.5)*.35,.72,1)
 packed=np.uint8(np.clip(np.stack([hh,rough,ao],axis=2)*255,0,255))
 color.save(OUT/f'{kind}-color.png',optimize=True);Image.fromarray(packed).save(OUT/f'{kind}-surface.png',optimize=True)
 if kind in ('asphalt','gravel','rock'):
  dx=(np.roll(hh,-1,1)-np.roll(hh,1,1))*2.8;dy=(np.roll(hh,-1,0)-np.roll(hh,1,0))*2.8
  z=np.ones_like(dx);l=np.sqrt(dx*dx+dy*dy+z*z);normal=np.uint8(np.clip(np.stack([-dx/l,-dy/l,z/l],axis=2)*127+128,0,255));Image.fromarray(normal).save(OUT/f'{kind}-normal.png',optimize=True)
 report.append({'kind':kind,'size':N,'files':[p.name for p in OUT.glob(f'{kind}-*.png')]})
(Path(__file__).resolve().parents[1]/'artifacts/road-land/textures.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report))
