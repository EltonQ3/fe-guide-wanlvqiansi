"""Shrink avatars and derive small class icons for the site. Needs Pillow (not a build dependency).

Avatars are shown at 72px at most, so anything larger than 192px is resized in place.
Class icons are copied from docs/assets/icon/class/*.png to docs/assets/icon/class-sm/*.webp at 96px.
Originals stay in git history and in docs/archive; running the script twice changes nothing.
"""
from pathlib import Path
import sys
try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow is required: python3 -m pip install pillow')

ASSETS = Path(__file__).resolve().parents[1] / 'docs' / 'assets'
for f in sorted((ASSETS / 'avatar').glob('*.jpg')):
    im = Image.open(f)
    if max(im.size) > 192:
        im.convert('RGB').resize((192, round(192 * im.height / im.width)), Image.LANCZOS).save(f, 'JPEG', quality=84, optimize=True, progressive=True)
        print('avatar', f.name)
out = ASSETS / 'icon' / 'class-sm'
out.mkdir(exist_ok=True)
for f in sorted((ASSETS / 'icon' / 'class').glob('*.png')):
    dst = out / (f.stem + '.webp')
    if not dst.exists():
        Image.open(f).convert('RGBA').resize((96, 96), Image.LANCZOS).save(dst, 'WEBP', quality=88, method=6)
        print('icon', dst.name)
