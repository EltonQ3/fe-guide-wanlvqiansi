"""Japanese voice-over via Google Cloud Text-to-Speech, kept well inside the free tier.

The owner asked for no paid usage, so this script refuses to go past a hard monthly cap (MONTH_CAP characters,
far below Google's free allowance, which is counted in the millions; check Google's pricing page), and caches
every line by voice and text so re-running never bills the same line twice. Every call is logged in
audio/tts-usage.json (no key in it).

Key: environment variable GOOGLE_TTS_API_KEY (set in the cloud environment's settings; never in the repo or chat).

  python3 audio/vo.py voices                         # list Japanese voices (free call, no characters used)
  python3 audio/vo.py audition ja-JP-Neural2-B ...   # first line (v01) in each voice -> public/audio/vo/audition/
  python3 audio/vo.py render ja-JP-Neural2-B --rate 0.92   # all lines -> public/audio/vo/v01.wav ...
Then `python3 audio/synth.py` mixes the voice in, ducking the music under it.
"""
import base64, datetime, hashlib, json, os, sys, urllib.request, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
T = json.loads((ROOT / 'timeline.json').read_text())
VO = ROOT / 'public' / 'audio' / 'vo'
CACHE = ROOT / 'public' / 'audio' / 'vo-cache'
USAGE = ROOT / 'audio' / 'tts-usage.json'
API = 'https://texttospeech.googleapis.com/v1'
MONTH_CAP = 20000          # characters per calendar month; one full render is about 300

def key():
    k = os.environ.get('GOOGLE_TTS_API_KEY')
    if not k: sys.exit('GOOGLE_TTS_API_KEY is not set in this session (environment variables reach new sessions only).')
    return k

def usage():
    month = datetime.date.today().strftime('%Y-%m')
    u = json.loads(USAGE.read_text()) if USAGE.exists() else {}
    if u.get('month') != month: u = {'month': month, 'characters': 0, 'calls': []}
    return u

def synthesize(text, voice, rate=1.0, pitch=0.0):
    tag = hashlib.sha256(json.dumps([text, voice, rate, pitch]).encode()).hexdigest()[:16]
    cached = CACHE / f'{tag}.wav'
    if cached.exists(): return cached.read_bytes()
    u = usage()
    if u['characters'] + len(text) > MONTH_CAP:
        sys.exit(f"Stopped: this would pass the {MONTH_CAP}-character monthly cap ({u['characters']} used). Nothing was sent.")
    body = {'input': {'text': text}, 'voice': {'languageCode': 'ja-JP', 'name': voice},
            'audioConfig': {'audioEncoding': 'LINEAR16', 'sampleRateHertz': 48000, 'speakingRate': rate, 'pitch': pitch}}
    req = urllib.request.Request(f'{API}/text:synthesize?key={key()}', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r: audio = base64.b64decode(json.load(r)['audioContent'])
    u['characters'] += len(text); u['calls'].append({'at': datetime.datetime.now().isoformat(timespec='seconds'), 'voice': voice, 'chars': len(text)})
    USAGE.write_text(json.dumps(u, ensure_ascii=False, indent=2) + '\n')
    CACHE.mkdir(parents=True, exist_ok=True); cached.write_bytes(audio)
    return audio

def seconds(path):
    with wave.open(str(path)) as w: return w.getnframes() / w.getframerate()

if __name__ == '__main__':
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else 'help'), sys.argv[2:]
    if cmd == 'voices':
        with urllib.request.urlopen(f'{API}/voices?languageCode=ja-JP&key={key()}', timeout=30) as r:
            for v in json.load(r)['voices']: print(v['name'], v['ssmlGender'], v['naturalSampleRateHertz'])
    elif cmd == 'audition':
        (VO / 'audition').mkdir(parents=True, exist_ok=True)
        line = T['long']['vo'][0]['ja']
        for voice in args:
            (VO / 'audition' / f'{voice}.wav').write_bytes(synthesize(line, voice)); print('wrote', voice)
    elif cmd == 'render':
        voice, rate = args[0], float(args[args.index('--rate') + 1]) if '--rate' in args else 1.0
        VO.mkdir(parents=True, exist_ok=True)
        cues = T['long']['vo']
        for i, cue in enumerate(cues):
            out = VO / f"{cue['id']}.wav"; out.write_bytes(synthesize(cue['ja'], voice, rate))
            room = ((cues[i + 1]['at'] if i + 1 < len(cues) else T['long']['frames']) - cue['at']) / T['fps']
            print(cue['id'], f'{seconds(out):.2f}s', '(longer than its slot!)' if seconds(out) > room - 0.2 else '')
        print('characters used this month:', usage()['characters'], '/', MONTH_CAP)
    else:
        print(__doc__)
