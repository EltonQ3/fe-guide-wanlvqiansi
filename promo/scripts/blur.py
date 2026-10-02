"""Soft copies of the captures (public/capture/blur/*.jpg) for the video's depth of field: the camera shows a
blurred copy at the edges of the frame and the sharp capture in the middle. Run after scripts/capture.cjs."""
from pathlib import Path
from PIL import Image, ImageFilter

CAP = Path(__file__).resolve().parents[1] / 'public' / 'capture'
(CAP / 'blur').mkdir(exist_ok=True)
for png in sorted(CAP.glob('*.png')):
    im = Image.open(png).convert('RGB')
    im = im.resize((im.width // 4, im.height // 4), Image.LANCZOS).filter(ImageFilter.GaussianBlur(5))
    im.save(CAP / 'blur' / f'{png.stem}.jpg', quality=85)
print('blurred', len(list((CAP / 'blur').glob('*.jpg'))), 'captures')
