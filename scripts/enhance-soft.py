from PIL import Image, ImageFilter
from pathlib import Path
for name in ('soft-round.png','soft-classic.png','soft-fine.png'):
    p=Path(name)
    try:
        im=Image.open(p).convert('RGBA')
        im.load()
    except (OSError, ValueError) as exc:
        print('Skipped unreadable PNG',name,exc)
        continue
    if im.width>=300:
        continue
    scale=4
    # Resize premultiplied RGB and alpha separately to avoid black contour halos.
    alpha=im.getchannel('A')
    rgb=im.convert('RGB')
    bg=Image.new('RGB', im.size, (255,255,255))
    bg.paste(rgb, mask=alpha)
    w=int(im.width*scale);h=int(im.height*scale)
    color=bg.resize((w,h),Image.Resampling.LANCZOS)
    color=color.filter(ImageFilter.UnsharpMask(radius=1.2,percent=50,threshold=3))
    a=alpha.resize((w,h),Image.Resampling.LANCZOS)
    color.putalpha(a)
    color.save(p,optimize=True)
    print(name, w, h)
