"""Original needle spray alpha atlas, authored procedurally for the Blender forest."""
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math, random
random.seed(707)
image=Image.new('RGBA',(512,512),(0,0,0,0));draw=ImageDraw.Draw(image)
draw.line([(256,500),(252,35)],fill=(90,105,55,255),width=5)
for row in range(22):
    t=row/22;root=(256,465-row*18);spread=(math.sin((t+.08)*math.pi)*.8+.12)*205
    for side in [-1,1]:
        end=(root[0]+side*spread,root[1]-35-random.random()*20)
        draw.line([root,end],fill=(62,98,53,255),width=4)
        for i in range(15):
            a=(i+.5)/15;x=root[0]+(end[0]-root[0])*a;y=root[1]+(end[1]-root[1])*a
            length=(1-a*.6)*(17+random.random()*9)
            for direction in [-1,1]:
                tip=(x+side*length*.35,y+direction*length)
                c=(36+random.randrange(18),77+random.randrange(32),39+random.randrange(16),255)
                draw.line([(x,y),tip],fill=c,width=3)
# Fine antialiasing softens clipped leaf edges, retaining a crisp silhouette.
image=image.filter(ImageFilter.GaussianBlur(.45))
out=Path('public/assets/redwood-needles.png');image.save(out)
print(out)
