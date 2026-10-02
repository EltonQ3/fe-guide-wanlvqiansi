"""A small orchestral sampler for the promo score.

Plays notes from VSCO 2 Community Edition (Versilian Studios, CC0 1.0, https://github.com/sgossner/VSCO-2-CE).
For each note it takes the nearest sampled pitch and resamples it to the exact note. Velocity picks the
dynamic layer (timbre); every sample is level-matched first, so velocity alone sets loudness. Round robins
alternate. Sustained samples are cut to the note's length with a release fade; legato notes skip the attack
and fade in under the previous note's tail. Notes land in per-section stems so the mix can be measured and
balanced, and the reverb is a convolution hall built here.

Most VSCO file names sit an octave below the sounding pitch (checked by pitch detection; harp and solo violin
are named at pitch), hence the `octave` offsets below.
Fetch the samples (about 1.9 GB, git-ignored) with:  sh audio/fetch_samples.sh
"""
import functools, os, re, warnings
from math import gcd
from pathlib import Path
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

ROOT = Path(__file__).resolve().parents[1]
LIB = Path(os.environ.get('VSCO_DIR', ROOT / 'samples' / 'vsco-2-ce'))
VCSL = Path(os.environ.get('VCSL_DIR', ROOT / 'samples' / 'vcsl'))   # Versilian Community Sample Library, CC0
SR = 48000
NAMES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
         'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
DYN = {'ppp': 0, 'pp': 1, 'p': 2, 'mp': 3, 'mf': 4, 'f': 5, 'ff': 6, 'fff': 7}
warnings.filterwarnings('ignore', category=wavfile.WavFileWarning)

def midi(n):
    if not isinstance(n, str): return n
    m = re.fullmatch(r'([A-G][#b]?)(-?\d)', n)
    return NAMES[m[1]] + 12 * (int(m[2]) + 1)

def db(x): return 10 ** (x / 20)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)

@functools.lru_cache(maxsize=None)
def load(path, by='rms'):
    """Stereo float32 at SR, leading silence trimmed, level-matched (sustains by RMS of the body, hits by peak)."""
    sr, x = wavfile.read(path)
    x = x.astype(np.float32) / (np.iinfo(x.dtype).max if x.dtype.kind == 'i' else 1)
    x = x.T if x.ndim == 2 else np.stack([x, x])
    x = x[:2] if x.shape[0] > 2 else x
    if sr != SR:
        g = gcd(SR, sr); x = resample_poly(x, SR // g, sr // g, axis=1).astype(np.float32)
    a = np.abs(x).max(0)
    start = max(0, int(np.argmax(a > a.max() * 0.02)) - int(0.003 * SR))
    x = x[:, start:]
    if by == 'rms':
        body = x[:, int(0.05 * SR): int(1.5 * SR)]
        x = x * (0.1 / max(float(np.sqrt(np.mean(body ** 2))), 1e-6))
    else:
        x = x * (0.5 / max(float(np.abs(x).max()), 1e-6))
    return np.ascontiguousarray(x)

class Instrument:
    """One articulation of one instrument: a folder of samples named like Name_A#3_v2_rr1.wav."""

    def __init__(self, folder, stem, octave=12, keep=None, release=0.3, gain=0.0, pan=0.0, width=1.0,
                 send=0.35, oneshot=False, legato_skip=0.07, pitched=True, level='rms', zones=None, ring=6.0, root=None):
        self.stem, self.release, self.gain, self.pan, self.width, self.send = stem, release, gain, pan, width, send
        self.oneshot, self.legato_skip, self.pitched, self.level, self.ring = oneshot, legato_skip, pitched, level, ring
        self.zones, self.turn = {}, {}
        base = Path(root) if root else LIB
        for f in sorted((base / folder).glob('*.wav')):
            if keep and not re.search(keep, f.name): continue
            if zones is not None:                     # unnamed pitches (timpani): {file prefix: midi}
                note = next((m for p, m in zones.items() if f.name.startswith(p)), None)
                if note is None: continue
            elif pitched:
                m = re.search(r'_([A-G]#?)(-?\d)(?=[_.])', f.name)
                if not m: continue
                note = NAMES[m[1]] + 12 * (int(m[2]) + 1) + octave
            else:
                note = 60
            v = re.search(r'_vl?(\d+)', f.name)
            d = re.search(r'_(ppp|pp|p|mp|mf|fff|ff|f)(?=[_.\d])', f.name)
            layer = int(v[1]) if v else DYN[d[1]] if d else 0
            self.zones.setdefault(note, {}).setdefault(layer, []).append(str(f))
        if not self.zones: raise SystemExit(f'No samples in {base / folder} (run: sh audio/fetch_samples.sh)')

    def pick(self, p, vel):
        zone = min(self.zones, key=lambda z: (abs(z - p), -z)) if self.pitched else 60
        layers = self.zones[zone]; keys = sorted(layers)
        k = keys[min(len(keys) - 1, int(vel * len(keys)))]
        files = layers[k]; i = self.turn.get((zone, k), 0); self.turn[(zone, k)] = i + 1
        return zone, files[i % len(files)]

    def render(self, pitch, dur, vel=0.7, legato=False, release=None, curve=None, offset=0.0):
        """One note as a stereo array. dur in seconds; curve = [(fraction of dur, gain)] for swells."""
        p = midi(pitch) if self.pitched else 60
        zone, path = self.pick(p, vel)
        if self.pitched and abs(p - zone) > 5: print(f'  note {pitch} is {p - zone:+.1f} semitones from the nearest sample ({path})')
        x = load(path, self.level)
        ratio = 2 ** ((p - zone) / 12) if self.pitched else 1.0
        rel = self.release if release is None else release
        skip = int((self.legato_skip if legato else 0) * SR + offset * SR)
        n = int((dur + rel) * SR) if not self.oneshot else int(min((x.shape[1] - skip) / ratio, (dur + rel) * SR))
        pos = skip + np.arange(max(n, 1)) * ratio
        y = np.stack([np.interp(pos, np.arange(x.shape[1]), x[c], right=0.0) for c in range(2)])
        e = np.ones(y.shape[1], np.float32)
        a = int((0.045 if legato else 0.003) * SR)
        e[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
        if not self.oneshot or dur + rel < (x.shape[1] - skip) / ratio / SR:
            s, r = int(dur * SR), int(rel * SR)
            if s < len(e): e[s:s + r] *= np.cos(np.linspace(0, np.pi / 2, len(e[s:s + r]))) ** 2; e[s + r:] = 0
        if curve:
            fr = np.arange(len(e)) / SR / max(dur, 1e-3)
            e *= np.interp(fr, [c[0] for c in curve], [c[1] for c in curve])
        return y * e * db(self.gain + (vel - 1) * 26)

class Mix:
    """Per-stem stereo buffers on one clock (seconds)."""

    def __init__(self, seconds, tail=6.0):
        self.n = int((seconds + tail) * SR); self.seconds = seconds
        self.stems, self.sends = {}, {}

    def buf(self, stem):
        if stem not in self.stems:
            self.stems[stem] = np.zeros((2, self.n), np.float32); self.sends[stem] = np.zeros((2, self.n), np.float32)
        return self.stems[stem]

    def put(self, stem, sig, t, pan=0.0, width=1.0, send=0.3, gain=1.0):
        if sig.ndim == 1: sig = np.stack([sig, sig])
        mid, side = (sig[0] + sig[1]) / 2, (sig[0] - sig[1]) / 2 * width
        l, r = mid + side, mid - side
        th = (pan + 1) * np.pi / 4
        sig = np.stack([l * np.cos(th), r * np.sin(th)]) * np.sqrt(2) * gain
        i = int(round(t * SR))
        if i < 0: sig, i = sig[:, -i:], 0
        k = min(sig.shape[1], self.n - i)
        if k <= 0: return
        self.buf(stem)[:, i:i + k] += sig[:, :k]
        self.sends[stem][:, i:i + k] += sig[:, :k] * send

    def play(self, inst, pitch, t, dur, vel=0.7, pan=None, gain=0.0, **kw):
        self.put(inst.stem, inst.render(pitch, dur, vel, **kw), t, inst.pan if pan is None else pan, inst.width, inst.send, db(gain))

def hall(seconds=3.2, predelay=0.024, seed=11):
    """Stereo hall impulse: sparse early reflections, then a dense tail whose highs die faster than its lows."""
    rng = np.random.default_rng(seed); n = int(seconds * SR); t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for c in range(2):
        noise = rng.standard_normal(n)
        ir[c] = lp(noise, 1800) * np.exp(-6.9 * t / seconds) + hp(noise, 1800) * 0.6 * np.exp(-6.9 * t / (seconds * 0.45))
        ir[c] *= np.clip((t - predelay) / 0.06, 0, 1)
        for k in range(10):
            j = int((predelay + rng.uniform(0.004, 0.07)) * SR); ir[c, j] += rng.uniform(0.3, 0.9) * (-1) ** k
    return ir / np.sqrt(np.sum(ir ** 2) / 2)

def reverb(send, ir):
    return np.stack([fftconvolve(send[c], ir[c])[: send.shape[1]] for c in range(2)]).astype(np.float32)

def lufs_ish(x):
    """Rough loudness (K-weighting approximated by a 100 Hz high-pass and a high shelf skipped) for balancing stems."""
    y = hp(x.mean(0), 100); return 10 * np.log10(max(float(np.mean(y ** 2)), 1e-12)) - 0.691
