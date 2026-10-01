"""Score and sound effects for the promo, synthesized from timeline.json so sound and picture share one clock.

Everything is generated here (no samples, no outside music), so the soundtrack is ours to publish.
Motif: four plucked notes, one per protagonist (D, F#, A, C#). They sound alone in Act 1, together when the
four threads braid, and resolve to a high D at the end. Plucks are modal synthesis (decaying partials), which
gives exact tuning; the score is D major at 72 BPM, one bar = 100 frames at 30 fps.

Output (public/audio/): long-music.wav, long-sfx.wav, long-mix.wav and the same for short, mixed to about
-14 LUFS with ffmpeg loudnorm. Voice-over is mixed later, with the music ducked under it.
Run: python3 audio/synth.py            (needs numpy, scipy and ffmpeg)
"""
import json, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = Path(__file__).resolve().parents[1]
T = json.loads((ROOT / 'timeline.json').read_text())
OUT = ROOT / 'public' / 'audio'
SR = 48000
FPS, BAR = T['fps'], T['barFrames'] / T['fps']          # seconds per bar
BEAT = BAR / 4
rng = np.random.default_rng(7)

NOTES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
def hz(name):
    pitch, octave = name[:-1], int(name[-1])
    return 440 * 2 ** ((NOTES[pitch] + 12 * (octave + 1) - 69) / 12)

CHORDS = {  # voicings (pad) and bass root
    'D': (['D3', 'A3', 'D4', 'F#4', 'A4'], 'D2'), 'Dadd9': (['D3', 'A3', 'E4', 'F#4'], 'D2'),
    'Dmaj7': (['D3', 'A3', 'C#4', 'F#4'], 'D2'), 'Bm7': (['B2', 'F#3', 'A3', 'D4', 'F#4'], 'B1'),
    'Gmaj7': (['G2', 'D3', 'B3', 'F#4'], 'G1'), 'Asus4': (['A2', 'E3', 'A3', 'D4', 'E4'], 'A1'),
    'A': (['A2', 'E3', 'A3', 'C#4', 'E4'], 'A1'), 'A/C#': (['C#3', 'E3', 'A3', 'E4'], 'C#2'),
    'Em7': (['E2', 'B2', 'D3', 'G3', 'B3'], 'E2'), 'A7sus4': (['A2', 'E3', 'G3', 'D4'], 'A1'),
}
MOTIF = ['D5', 'F#5', 'A5', 'C#6']

def track(seconds): return np.zeros((2, int(seconds * SR) + SR * 4))   # room for reverb tails
def place(buf, sig, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i >= buf.shape[1]: return
    sig = sig[: buf.shape[1] - i] * gain
    buf[0, i:i + len(sig)] += sig * np.sqrt((1 - pan) / 2)
    buf[1, i:i + len(sig)] += sig * np.sqrt((1 + pan) / 2)
def lp(sig, cutoff, order=2): return sosfilt(butter(order, cutoff, 'low', fs=SR, output='sos'), sig)
def hp(sig, cutoff, order=2): return sosfilt(butter(order, cutoff, 'high', fs=SR, output='sos'), sig)
def env(n, attack, release):
    e = np.ones(n); a, r = int(attack * SR), int(release * SR)
    if a: e[:a] = np.linspace(0, 1, a) ** 2
    if r: e[-r:] *= np.linspace(1, 0, r) ** 2
    return e

# ---- instruments -------------------------------------------------------------------------------------------
def pluck(note, dur=4.0, bright=1.0, decay=1.0):
    """A plucked thread: decaying harmonic partials (higher ones fade faster), slight stretch, a soft transient."""
    f, t = hz(note), np.arange(int(dur * SR)) / SR
    sig = np.zeros_like(t)
    for k in range(1, 16):
        fk = f * k * (1 + 0.0004 * k * k)
        if fk > SR / 2.2: break
        amp = (bright ** (k - 1)) / k ** 1.1 * np.sin(np.pi * k * 0.27)   # plucked near the end of the string
        sig += amp * np.sin(2 * np.pi * fk * t) * np.exp(-t * (0.9 + 0.35 * k * k / bright) / decay)
    click = hp(rng.standard_normal(int(0.004 * SR)), 2500) * np.linspace(1, 0, int(0.004 * SR)) * 0.08
    sig[: len(click)] += click
    return sig * env(len(sig), 0.002, 0.3) / 1.6

def keys(note, dur=1.6):
    """Soft piano-like tone for the Act 2 arpeggios: two slightly detuned partial sets, quick high-partial decay."""
    f, t = hz(note), np.arange(int(dur * SR)) / SR
    sig = np.zeros_like(t)
    for detune in (0.9985, 1.0015):
        for k in range(1, 9):
            sig += (1 / k ** 1.6) * np.sin(2 * np.pi * f * detune * k * t) * np.exp(-t * (2.2 + 1.4 * k))
    return lp(sig, 4200) * env(len(t), 0.004, 0.25) / 3

def pad(names, dur, attack=0.8, release=1.0, cutoff=1400):
    t = np.arange(int(dur * SR)) / SR
    left, right = np.zeros_like(t), np.zeros_like(t)
    for i, n in enumerate(names):
        for j, det in enumerate((-0.07, 0.0, 0.07)):          # three voices a few cents apart: left, centre, right
            f = hz(n) * 2 ** (det / 12)
            v = sum(np.sin(2 * np.pi * f * k * t + i + j) / k ** 2 for k in range(1, 8, 2))   # soft triangle
            left += v * (1.0, 0.7, 0.4)[j]; right += v * (0.4, 0.7, 1.0)[j]
    trem = 1 + 0.08 * np.sin(2 * np.pi * 0.23 * t)
    e = env(len(t), attack, release) * trem / (len(names) * 3)
    return hp(lp(left, cutoff), 120) * e, hp(lp(right, cutoff), 120) * e   # the bass owns the lows

def bass(note, dur):
    f, t = hz(note), np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * env(len(t), 0.03, 0.4) * 0.55

def bell(note, dur=2.5):
    f, t = hz(note), np.arange(int(dur * SR)) / SR
    idx = 2.2 * np.exp(-t * 3)
    return np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t * 1.6) * env(len(t), 0.002, 0.2) * 0.35

def kick(dur=0.35):
    t = np.arange(int(dur * SR)) / SR
    return np.sin(2 * np.pi * (48 * t + 40 * (1 - np.exp(-t * 30)) / 30)) * np.exp(-t * 11) * 0.7

def shaker(dur=0.09):
    n = int(dur * SR); return hp(rng.standard_normal(n), 6000) * np.exp(-np.arange(n) / SR * 45) * 0.05

def noise_sweep(dur, f0, f1, rise=True):
    n = int(dur * SR); x = rng.standard_normal(n); out = np.zeros(n); step = 512; zi = np.zeros((2, 2))
    for s in range(0, n, step):                                   # band-pass sliding from f0 to f1, state carried
        fc = f0 * (f1 / f0) ** (s / n)
        sos = butter(1, [fc * 0.7, min(fc * 1.4, SR / 2.1)], 'band', fs=SR, output='sos')
        out[s:s + step], zi[:1] = sosfilt(sos, x[s:s + step], zi=zi[:1])
    shape = np.linspace(0, 1, n) ** 2 if rise else np.sin(np.linspace(0, np.pi, n)) ** 2
    return out * shape

def riser(dur):
    t = np.arange(int(dur * SR)) / SR
    tone = np.sin(2 * np.pi * (220 * t + 330 * t * t / (2 * dur))) * (t / dur) ** 2 * 0.15
    sig = noise_sweep(dur, 300, 7000) * 0.5 + tone
    sig[-int(0.04 * SR):] *= np.linspace(1, 0, int(0.04 * SR))     # end clean, no click at the downbeat
    return sig

def whoosh(): return noise_sweep(0.7, 2500, 400, rise=False) * 0.6
def swish(): return noise_sweep(0.35, 1200, 9000, rise=False) * 0.4 + kick(0.35) * 0.25

def tick():
    n = int(0.06 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1850 * t) * np.exp(-t * 90) + hp(rng.standard_normal(n), 3000) * np.exp(-t * 400) * 0.3) * 0.35

def reverb(buf, seconds=2.6, wet=0.32):
    n = int(seconds * SR); t = np.arange(n) / SR
    ir = [lp(rng.standard_normal(n), 5200) * np.exp(-t * 6.9 / seconds) for _ in range(2)]
    for ch in range(2): ir[ch][: int(0.012 * SR)] = 0                 # a little pre-delay
    out = np.stack([fftconvolve(buf[ch], ir[ch])[: buf.shape[1]] for ch in range(2)])
    out *= np.sqrt(np.sum(buf ** 2) / max(np.sum(out ** 2), 1e-12))
    return buf * (1 - wet) + out * wet

# ---- arrangements ------------------------------------------------------------------------------------------
def chords_at(spec):  # [(name, start_bar, length_bars)] -> seconds
    return [(name, b * BAR, n * BAR) for name, b, n in spec]

def lay_pad(buf, spec, gain=0.55, cutoff=1400, until=None):
    for name, t0, d in chords_at(spec):
        if until is not None and t0 >= until: break
        l, r = pad(CHORDS[name][0], d + 0.9, attack=min(0.8, d / 3), release=0.9, cutoff=cutoff)
        place(buf, l, t0, -0.6, gain); place(buf, r, t0, 0.6, gain)

def shimmer(buf, t0, t1, chord, density, octave_up=1, gain=1.0):
    """Many faint threads: soft plucks on chord tones, scattered across the stereo field."""
    tones = [n[:-1] + str(int(n[-1]) + octave_up) for n in CHORDS[chord][0][1:]]
    t = t0
    while t < t1:
        if rng.random() < density:
            place(buf, pluck(rng.choice(tones), 2.5, bright=0.55), t + rng.uniform(-0.02, 0.02), rng.uniform(-0.9, 0.9), rng.uniform(0.08, 0.16) * gain)
        t += BEAT / 2

def long_music():
    L = T['long']; secs = L['frames'] / FPS
    m = track(secs)
    chords = L['music']['chords']
    # Act 1 -------------------------------------------------------------------------------------------------
    place(m, pluck('D4', 6, bright=0.7, decay=2.2), 0.0, 0, 0.9)                      # the first thread
    place(m, bass('D2', BAR * 1.2) * env(int(BAR * 1.2 * SR), 2.0, 0.6), BAR * 0.2, 0, 0.35)
    lay_pad(m, [c for c in chords if c[1] == 1], gain=0.28)                             # rising from silence
    lay_pad(m, [c for c in chords if c[1] == 2], gain=0.4)
    lay_pad(m, [c for c in chords if 3 <= c[1] < 8], gain=0.42)
    shimmer(m, BAR * 1, BAR * 2, 'Bm7', 0.4); shimmer(m, BAR * 2, BAR * 3, 'Gmaj7', 0.85, gain=1.6)   # threads multiply
    shimmer(m, BAR * 2.5, BAR * 3, 'Gmaj7', 0.9, octave_up=2, gain=1.2)
    for i, (note, chord) in enumerate(zip(MOTIF, ['Dadd9', 'Bm7', 'Gmaj7', 'A'])):           # the four heroes
        t0 = BAR * (3 + i)
        place(m, pluck(note, 5, bright=0.8, decay=1.8), t0, [-0.4, 0.3, -0.2, 0.4][i], 0.75)
        place(m, pluck(note, 3, bright=0.5), t0 + BEAT * 1.5, -[-0.4, 0.3, -0.2, 0.4][i], 0.25)   # echo
        shimmer(m, t0 + BEAT, t0 + BAR, chord, 0.25)
        place(m, bass(CHORDS[chord][1], BAR), t0, 0, 0.4)
    for j, note in enumerate(MOTIF):                                                         # braid: together
        place(m, pluck(note, 6, bright=0.85, decay=2.4), BAR * 7 + j * 0.045, [-0.5, -0.15, 0.15, 0.5][j], 0.55)
    place(m, bass('D2', BAR), BAR * 7, 0, 0.45)
    # Act 2 -------------------------------------------------------------------------------------------------
    lay_pad(m, [c for c in chords if 8 <= c[1] < 14], gain=0.32, cutoff=1800)
    patterns = [0, 2, 1, 3, 2, 1, 3, 2]                                                      # arpeggio order
    for name, t0, d in chords_at([c for c in chords if 8 <= c[1] < 13]):
        tones = [n[:-1] + str(int(n[-1]) + 1) for n in CHORDS[name][0][1:]]
        for s in range(8):
            place(m, keys(tones[patterns[s] % len(tones)]), t0 + s * BEAT / 2, (s % 2 - 0.5) * 0.5, 0.33 if s % 4 else 0.42)
        place(m, bass(CHORDS[name][1], d), t0, 0, 0.5)
        for b in range(4):
            if b in (0, 2): place(m, kick(), t0 + b * BEAT, 0, 0.35)
            for half in range(2): place(m, shaker(), t0 + b * BEAT + half * BEAT / 2, 0.3, 0.8 if half else 0.5)
    for note, at in (('A5', 1050), ('D6', 1100), ('F#6', 1150)):                             # threads connect
        place(m, pluck(note, 3, bright=0.6), at / FPS, 0.2, 0.32)
    # night: only pad and sub, filter closing
    lay_pad(m, [['A7sus4', 13, 1]], gain=0.26, cutoff=650)
    place(m, bass('A1', BAR), BAR * 13, 0, 0.25)
    # Act 3 -------------------------------------------------------------------------------------------------
    lay_pad(m, [c for c in chords if c[1] >= 14], gain=0.6, cutoff=1700)
    for b, chord in ((14, 'Gmaj7'), (15, 'A')):
        place(m, kick(0.6), BAR * b, 0, 0.45)
        for s in range(8):                                                                    # motif climbs
            place(m, pluck(MOTIF[s % 4], 2.5, bright=0.7), BAR * b + s * BEAT / 2, [-0.5, -0.15, 0.15, 0.5][s % 4], 0.22 + 0.02 * s)
        place(m, bass(CHORDS[chord][1], BAR), BAR * b, 0, 0.5)
    for j, note in enumerate(['D5', 'F#5', 'A5', 'D6']):                                    # resolution
        place(m, pluck(note, 7, bright=0.8, decay=2.6), BAR * 16 + j * BEAT, [-0.5, -0.15, 0.15, 0.5][j], 0.6)
    place(m, bass('D2', BAR * 2), BAR * 16, 0, 0.5)
    place(m, pluck('D4', 6, bright=0.7, decay=2.2), BAR * 17 + BEAT, 0, 0.5)                # the first thread, again
    m = reverb(m, 2.8, 0.34)
    return fade_out(m, secs, 1.6)

def long_sfx():
    L = T['long']; secs = L['frames'] / FPS; s = track(secs)
    for e in L['sfx']:
        if e['type'] == 'riser': place(s, riser((e['to'] - e['from']) / FPS), e['from'] / FPS, 0, 0.5)
        elif e['type'] == 'whoosh': place(s, whoosh(), e['at'] / FPS - 0.25, 0, 0.55)
        elif e['type'] == 'swish': place(s, swish(), e['at'] / FPS - 0.05, 0.3, 0.6)
        elif e['type'] == 'tick': place(s, tick(), e['at'] / FPS, 0.1, 0.55)
        elif e['type'] == 'bell': place(s, bell('B5' if e['at'] < 1250 else 'E6'), e['at'] / FPS, 0.2, 0.5)
    return fade_out(reverb(s, 1.6, 0.2), secs, 0.4)

def short_music():
    S = T['short']; secs = S['frames'] / FPS; m = track(secs)
    place(m, pluck('D4', 4, bright=0.7, decay=1.6), 0, 0, 0.9)
    shimmer(m, 25 / FPS, 75 / FPS, 'Bm7', 0.9)
    lay_pad(m, S['music']['chords'], gain=0.5)
    for i, note in enumerate(MOTIF):
        at = (75 + 50 * i) / FPS
        place(m, pluck(note, 3.5, bright=0.8, decay=1.4), at, [-0.4, 0.3, -0.2, 0.4][i], 0.75)
        place(m, bass(CHORDS[['Dadd9', 'Bm7', 'Gmaj7', 'A'][i]][1], 50 / FPS), at, 0, 0.45)
    for k in range(8):
        at = 275 / FPS + k * BEAT / 2
        place(m, keys(['F#5', 'A5', 'C#6', 'A5', 'D6', 'A5', 'F#5', 'A5'][k]), at, (k % 2 - 0.5) * 0.5, 0.36)
        if k % 2 == 0: place(m, kick(), at, 0, 0.35 if k % 4 == 0 else 0.2)
    for j, note in enumerate(['D5', 'F#5', 'A5', 'D6']):
        place(m, pluck(note, 5, bright=0.85, decay=2), 375 / FPS + j * 0.09, [-0.5, -0.15, 0.15, 0.5][j], 0.6)
    place(m, bass('D2', 2.5), 375 / FPS, 0, 0.5)
    return fade_out(reverb(m, 2.4, 0.3), secs, 0.8)

def short_sfx():
    S = T['short']; secs = S['frames'] / FPS; s = track(secs)
    for e in S['sfx']:
        if e['type'] == 'riser': place(s, riser((e['to'] - e['from']) / FPS), e['from'] / FPS, 0, 0.45)
        elif e['type'] == 'whoosh': place(s, whoosh(), e['at'] / FPS - 0.25, 0, 0.5)
        elif e['type'] == 'tick': place(s, tick(), e['at'] / FPS, 0.1, 0.5)
    return fade_out(s, secs, 0.3)

def fade_out(buf, secs, length):
    n = int(secs * SR); buf = buf[:, :n].copy(); f = int(length * SR)
    buf[:, -f:] *= np.linspace(1, 0, f) ** 1.5
    return buf

def read_mono(path):
    with wave.open(str(path)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
        if w.getnchannels() == 2: x = x.reshape(-1, 2).mean(1)
        if w.getframerate() != SR: x = np.interp(np.arange(int(len(x) * SR / w.getframerate())) * w.getframerate() / SR, np.arange(len(x)), x)
    return x

def voice_track(secs):
    """Japanese voice-over at its cue frames (public/audio/vo/v01.wav ...) and a gain curve that ducks the music
    about 8 dB under each line, with short ramps. Returns (None, None) until the voice has been generated."""
    n = int(secs * SR); vo = np.zeros((2, n)); duck = np.ones(n); found = False
    for cue in T['long']['vo']:
        path = OUT / 'vo' / f"{cue['id']}.wav"
        if not path.exists(): continue
        found = True; sig = hp(read_mono(path), 90); t0 = cue['at'] / FPS
        place(vo, sig / max(np.max(np.abs(sig)), 1e-6) * 0.7, t0)
        a, b, r = int((t0 - 0.12) * SR), int((t0 + len(sig) / SR + 0.25) * SR), int(0.15 * SR)
        curve = np.ones(n); curve[max(a, 0):min(b, n)] = 0.4
        duck = np.minimum(duck, np.convolve(curve, np.ones(r) / r, mode='same'))
    return (vo, duck) if found else (None, None)

def write(path, buf):
    peak = np.max(np.abs(buf)); buf = buf / peak * 0.8 if peak > 0.8 else buf
    data = (np.clip(buf.T, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())

def loudnorm(src, dst, target=-14):
    # One static gain to the target loudness, then a peak limiter. (Single-pass loudnorm rides the gain over
    # time and flattens the quiet intro and the night section.)
    meter = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(src), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    measured = float(meter.rsplit('I:', 1)[1].split('LUFS')[0])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(src), '-af', f'volume={target - measured:.2f}dB,alimiter=limit=0.84:level=false:attack=3:release=60', '-ar', str(SR), str(dst)], check=True)

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for name, music, sfx in (('long', long_music, long_sfx), ('short', short_music, short_sfx)):
        mus, fx = music(), sfx()
        write(OUT / f'{name}-music.wav', mus); write(OUT / f'{name}-sfx.wav', fx)
        vo, duck = voice_track(T['long']['frames'] / FPS) if name == 'long' else (None, None)
        if vo is not None: print('voice-over mixed in, music ducked under it')
        write(OUT / f'{name}-raw.wav', mus * 0.85 * (duck if duck is not None else 1) + fx + (vo if vo is not None else 0))
        loudnorm(OUT / f'{name}-raw.wav', OUT / f'{name}-mix.wav')
        (OUT / f'{name}-raw.wav').unlink()
        print(name, 'written', f'{mus.shape[1] / SR:.2f}s')
