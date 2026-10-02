"""Bring recorded voice-over into the mix and the subtitles.

Takes the lines in audio/vo-samples/lines/*.flac (committed, small) or public/audio/vo/*.wav (fresh from vo.py),
writes public/audio/vo/<id>.wav for synth.py to mix, and records each line's length in timeline.json
("seconds"), so subtitles stay up exactly as long as the voice. Then run: python3 audio/synth.py
"""
import json, subprocess, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SAMPLES, VO = ROOT / 'audio' / 'vo-samples' / 'lines', ROOT / 'public' / 'audio' / 'vo'
T = json.loads((ROOT / 'timeline.json').read_text())
VO.mkdir(parents=True, exist_ok=True)
for i, cue in enumerate(T['long']['vo']):
    flac, wav = SAMPLES / f"{cue['id']}.flac", VO / f"{cue['id']}.wav"
    if flac.exists():
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(flac), '-ar', '48000', str(wav)], check=True)
    if not wav.exists():
        print(cue['id'], 'missing'); continue
    with wave.open(str(wav)) as w: secs = w.getnframes() / w.getframerate()
    nxt = T['long']['vo'][i + 1]['at'] if i + 1 < len(T['long']['vo']) else T['long']['frames']
    room = (nxt - cue['at']) / T['fps']
    cue['seconds'] = round(secs, 2)
    print(cue['id'], f'{secs:.2f}s of {room:.2f}s', 'TOO LONG' if secs > room - 0.2 else '')
(ROOT / 'timeline.json').write_text(json.dumps(T, ensure_ascii=False, indent=2) + '\n')
