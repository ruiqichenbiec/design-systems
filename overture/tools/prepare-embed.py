"""Prepare the compressed copies that dist/overture-showcase.html embeds.

Run once whenever a source photo or the promo film changes (Python 3 + Pillow; ffmpeg for the film):

    python tools/prepare-embed.py --ffmpeg "<path to ffmpeg.exe>"

Writes src/embed/photos/*.webp, src/embed/video/overture-promo-15s-720p.mp4 and src/embed/manifest.json.
The manifest records each source's SHA-256 so tools/build-standalone.mjs can refuse stale copies.
"""
import argparse, hashlib, json, os, shutil, subprocess, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'project', 'assets')
OUT = os.path.join(ROOT, 'src', 'embed')

# name used by Overture.asset() -> (longest side in px, WebP quality). Display sizes decide the limits:
# the pin is shown at 28 px, the stage photographs up to ~1100 px wide in the lightbox.
PHOTOS = {
    'photos/overture-art.png': (1586, 82),
    'photos/red-silk.png': (1586, 82),
    'photos/resonance-silk.png': (1536, 86),
    'photos/textile-panorama.png': (1600, 80),
    'photos/brass-pin.png': (96, 90),
    'photos/hero-backstage.jpg': (1536, 80),
    'photos/stage-bow.jpg': (1402, 80),
    'photos/runway.jpg': (1536, 80),
    'photos/camera-hands.jpg': (1402, 80),
    'photos/backstage-mirror.jpg': (1536, 80),
    'photos/dance-stage.jpg': (1536, 80),
}
FILM = ('video/overture-promo-15s.mp4', 'video/overture-promo-15s-720p.mp4')


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', default=shutil.which('ffmpeg'), help='ffmpeg executable for the 720p film')
    args = parser.parse_args()
    entries = []
    for name, (side, quality) in PHOTOS.items():
        source = os.path.join(SRC, name)
        target_rel = os.path.splitext(name)[0] + '.webp'
        target = os.path.join(OUT, target_rel)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        image = Image.open(source)
        image.load()
        has_alpha = image.mode in ('RGBA', 'LA') or 'transparency' in image.info
        image = image.convert('RGBA' if has_alpha else 'RGB')
        if max(image.size) > side:
            scale = side / max(image.size)
            image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
        image.save(target, 'WEBP', quality=quality, method=6, alpha_quality=90 if has_alpha else 100)
        entries.append({'name': name, 'file': target_rel.replace('\\', '/'), 'type': 'image/webp', 'width': image.width, 'height': image.height,
                        'alpha': has_alpha, 'bytes': os.path.getsize(target), 'source_sha256': sha256(source), 'sha256': sha256(target)})
        print(f'{name} -> {target_rel} {image.width}x{image.height} {os.path.getsize(target) // 1024} KB')
    if not args.ffmpeg:
        sys.exit('ffmpeg not found: pass --ffmpeg <path> to encode the 720p film')
    source = os.path.join(SRC, FILM[0])
    target = os.path.join(OUT, FILM[1])
    os.makedirs(os.path.dirname(target), exist_ok=True)
    # 1280x720 at 30 fps, H.264 High, AAC 96 kb/s, moov atom first so playback starts before the blob is fully read.
    subprocess.run([args.ffmpeg, '-y', '-v', 'error', '-i', source, '-vf', 'scale=1280:720:flags=lanczos,fps=30',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', target], check=True)
    entries.append({'name': FILM[0], 'file': FILM[1], 'type': 'video/mp4', 'width': 1280, 'height': 720,
                    'bytes': os.path.getsize(target), 'source_sha256': sha256(source), 'sha256': sha256(target)})
    print(f'{FILM[0]} -> {FILM[1]} {os.path.getsize(target) // 1024} KB')
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump({'note': 'Compressed copies embedded by dist/overture-showcase.html. Regenerate with tools/prepare-embed.py.', 'files': entries}, f, ensure_ascii=False, indent=2)
        f.write('\n')


if __name__ == '__main__':
    main()
