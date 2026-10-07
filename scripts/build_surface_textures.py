"""Deterministic original tileable PBR surfaces; build without external image assets."""
from pathlib import Path
from PIL import Image, ImageFilter
import random, math
OUT=Path(__file__).resolve().parents[1]/'public/assets/detail';OUT.mkdir(exist_ok=True)
N=512
for kind,base in [('plaster',(176,161,127)),('cedar',(133,83,46)),('concrete',(138,134,122)),('slate',(52,68,68)),('bark',(91,55,32))]:
    rng=random.Random(kind);im=Image.new('RGB',(N,N));height=Image.new('L',(N,N));rough=Image.new('L',(N,N))
    px=im.load();hp=height.load();rp=rough.load()
    for y in range(N):
        for x in range(N):
            fine=rng.uniform(-1,1);wave=math.sin(x*.085+math.sin(y*.032)*2)+.45*math.sin(x*.38+math.sin(y*.024))
            if kind in ('cedar','bark'):
                v=wave*.10+fine*.035;seam= x%128<3;h=128+wave*23+fine*9
                if seam:v-=.21;h-=45
            elif kind=='slate':
                seam=y%96<3 or (x+(y//96%2)*64)%128<2;v=fine*.035+math.sin(x*.045)*.025;h=128+fine*13
                if seam:v-=.2;h-=32
            else:
                v=fine*.05+math.sin(x*.02)*math.cos(y*.035)*.025;h=128+fine*19
                if kind=='concrete' and (x%256<2 or y%256<2):v-=.13;h-=26
            px[x,y]=tuple(max(0,min(255,int(c*(1+v)))) for c in base);hp[x,y]=max(0,min(255,int(h)));rp[x,y]=int(200+fine*17)
    height=height.filter(ImageFilter.GaussianBlur(.65));hp=height.load();normal=Image.new('RGB',(N,N));np=normal.load()
    for y in range(N):
        for x in range(N):
            dx=(hp[(x+1)%N,y]-hp[(x-1)%N,y])*.035;dy=(hp[x,(y+1)%N]-hp[x,(y-1)%N])*.035
            l=math.sqrt(dx*dx+dy*dy+1);np[x,y]=(int(128-dx/l*127),int(128-dy/l*127),int(128+127/l))
    im.save(OUT/(kind+'-color.png'));normal.save(OUT/(kind+'-normal.png'));rough.save(OUT/(kind+'-rough.png'))
print('Generated five original PBR surface sets')
