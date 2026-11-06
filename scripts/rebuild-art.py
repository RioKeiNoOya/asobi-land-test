from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math

ROOT=Path('.')
CANDIDATES=[
    *ROOT.glob('piece-*.png'), *ROOT.glob('ai-*.png'),
    *ROOT.glob('deco-*.png'),
    *[ROOT/name for name in ['crab.png','dolphin.png','jelly.png','octopus.png','pineapple.png','fish-small.png','fish-blue.png']]
]
def repair_cutout(path):
    im=Image.open(path).convert('RGBA')
    a=im.getchannel('A')
    # Keep antialiasing while removing fully transparent colored fringes.
    a=a.point(lambda x: 0 if x<10 else x)
    im.putalpha(a)
    bbox=a.point(lambda x:255 if x>=18 else 0).getbbox()
    if not bbox:
        return
    im=im.crop(bbox)
    canvas=Image.new('RGBA',(512,512),(0,0,0,0))
    scale=min(456/im.width,456/im.height)
    sz=(max(1,round(im.width*scale)),max(1,round(im.height*scale)))
    im=im.resize(sz,Image.Resampling.LANCZOS)
    canvas.alpha_composite(im,((512-sz[0])//2,(512-sz[1])//2))
    canvas.save(path,optimize=True)

for path in CANDIDATES:
    if path.is_file():
        repair_cutout(path)

# Raster edible waffle cup: illustrated baked wafer bowl, transparent background.
S=3
im=Image.new('RGBA',(600*S,600*S),(0,0,0,0))
d=ImageDraw.Draw(im,'RGBA')
def pbox(v):return tuple(round(x*S) for x in v)
def poly(pts,fill):d.polygon([(int(x*S),int(y*S)) for x,y in pts],fill=fill)
# bowl sides, rounded foot; intentionally no paper or ceramic elements
poly([(82,221),(518,221),(490,357),(453,442),(394,489),(205,489),(146,442),(109,357)],(176,95,37,255))
for y in range(223,480):
    # baked amber surface with vertical light/shadow shading
    k=(y-223)/257
    left=82+(121*k-10*math.sin(k*math.pi))
    right=518-(121*k-10*math.sin(k*math.pi))
    if right<=left:continue
    tone=int(197-38*k)
    d.line(((left*S,y*S),(right*S,y*S)),fill=(min(255,tone+42),int(tone*.68),int(tone*.30),255),width=S)
# criss-cross waffle weave clipped to curved bowl
mask=Image.new('L',im.size,0);md=ImageDraw.Draw(mask)
md.polygon([(int(x*S),int(y*S)) for x,y in [(84,225),(516,225),(487,356),(450,442),(394,488),(206,488),(150,442),(113,356)]],fill=255)
weave=Image.new('RGBA',im.size,(0,0,0,0));wd=ImageDraw.Draw(weave)
for off in range(-650,1150,45):
    wd.line([(off*S,190*S),((off+370)*S,505*S)],fill=(123,61,25,175),width=9*S)
    wd.line([(off*S,190*S),((off-370)*S,505*S)],fill=(130,63,22,175),width=9*S)
    wd.line([((off+6)*S,190*S),((off+376)*S,505*S)],fill=(255,211,130,115),width=4*S)
weave.putalpha(Image.composite(weave.getchannel('A'),Image.new('L',im.size,0),mask))
im.alpha_composite(weave)
d=ImageDraw.Draw(im,'RGBA')
# deep inside, outer rolled rim, baking highlights
d.ellipse(pbox((78,166,522,288)),fill=(133,70,26,255),outline=(244,171,74,255),width=13*S)
d.ellipse(pbox((103,179,497,264)),fill=(93,51,26,255))
d.arc(pbox((80,161,520,282)),start=3,end=176,fill=(255,223,150,255),width=15*S)
d.arc(pbox((83,177,520,287)),start=8,end=165,fill=(236,156,73,255),width=10*S)
d.line([(int(x*S),int(y*S)) for x,y in [(147,426),(203,477),(396,477),(451,426)]],fill=(255,201,114,170),width=7*S)
im=im.resize((600,600),Image.Resampling.LANCZOS)
im.save('cone-waffle-cup-raster.png',optimize=True)
print('Normalized',len(CANDIDATES),'cutouts and built waffle cup.')
