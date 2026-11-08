"""Build lightweight production front-layer images without touching the editable originals."""
from pathlib import Path
from PIL import Image

names = [f"cone-raster-{i}-front.png" for i in range(5)]
names += ["cone-waffle-cup-raster-front.png"]
for name in names:
    source = Path(name)
    assert source.is_file(), f"Missing original: {source}"
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        target = source.with_suffix(".webp")
        rgba.save(target, "WEBP", quality=90, method=6, exact=True)
        with Image.open(target) as result:
            result.load()
            assert result.size == rgba.size
            assert result.mode == "RGBA"
        print(f"{source}: {source.stat().st_size:,} -> {target}: {target.stat().st_size:,}")
