"""The long cut's score: from one harp string to a fate symphony, on timeline.json's clock (72 BPM, D minor).

Story in sound
  bars 0-1   one harp string, then the fate motif A-D-E-F; the thread snaps on the F (sync.snap).
  bar 2      time runs backwards: the opening harp is played in reverse under a string swell, and the thread
             rejoins on bar 3's downbeat (sync.rejoin).
  bar 3      the violins take the motif, the pulse starts, everything leans into bar 4.
  bars 4-7   the four routes, each a theme on its own instrument, all built on the motif's shape:
             Kai = flute (wind), Dietrich = cellos (the exile's sword), Theodora = horns (the queen),
             Leda = solo violin (harmonic minor, the rose's song).
  bars 8-13  the guide: F major, harp and spiccato strings, the motif turned major; marks, bells and the
             night wipe land on beats; then the build.
  bars 14-15 tutti: brass sing the motif in Theodora's rhythm, cellos carry Dietrich's line, the flute runs
             above, Leda's violin enters high in bar 15.
  bars 16-17 the cadence Bb-C-D lands on D MAJOR: the motif's F becomes F#. Fate rewritten. The harp plays
             the motif once more, in major.

Samples: VSCO 2 Community Edition (CC0) via audio/orchestra.py. A few sound-design layers (snap, wind, sword
ring, booms, swells) are synthesized here.
Run: python3 audio/score.py   -> public/audio/long-music.wav, long-mix.wav (about -14 LUFS)
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
from scipy.signal import lfilter

sys.path.insert(0, str(Path(__file__).parent))
from orchestra import LIB, SR, Instrument, Mix, db, hall, hp, load, lp, lufs_ish, reverb

ROOT = Path(__file__).resolve().parents[1]
T = json.loads((ROOT / 'timeline.json').read_text())
OUT = ROOT / 'public' / 'audio'
FPS = T['fps']; BEAT = T['beatFrames'] / FPS; BAR = 4 * BEAT
L = T['long']; SYNC = L['sync']; SECS = L['frames'] / FPS
rng = np.random.default_rng(5)

def at(bar, beat=0.0): return (bar * 4 + beat) * BEAT
def fr(frame): return frame / FPS

# ---- the orchestra --------------------------------------------------------------------------------------------
V, VA, VC = 'Strings/Violin Section/', 'Strings/Viola Section/', 'Strings/Cello Section/'
harp = Instrument('Strings/Harp', 'harp', octave=0, oneshot=True, level='peak', pan=-0.4, width=0.7, send=0.42)
vln = Instrument(V + 'susVib', 'strings', pan=-0.45, width=0.8, send=0.42, release=0.4)
vln_spic = Instrument(V + 'Spic', 'strings', oneshot=True, level='peak', pan=-0.45, width=0.8, send=0.35, release=0.12)
vln_trem = Instrument(V + 'Trem', 'strings', pan=-0.4, width=0.8, send=0.45, release=0.45)
vla = Instrument(VA + 'susvib', 'strings', pan=-0.05, width=0.6, send=0.42, release=0.4)
vla_spic = Instrument(VA + 'spic', 'strings', oneshot=True, level='peak', pan=-0.05, width=0.6, send=0.35, release=0.12)
vc = Instrument(VC + 'susvib', 'cellos', pan=0.3, width=0.6, send=0.4, release=0.45)
vc_pad = Instrument(VC + 'susvib', 'strings', pan=0.3, width=0.6, send=0.4, release=0.45)
vc_spic = Instrument(VC + 'spic', 'strings', oneshot=True, level='peak', pan=0.3, width=0.6, send=0.33, release=0.12)
vc_trem = Instrument(VC + 'trem', 'strings', pan=0.3, width=0.6, send=0.42, release=0.45)
cb = Instrument('Strings/Solo Contrabass/SusVib', 'low', pan=0.45, width=0.5, send=0.32, release=0.5)
cb_spic = Instrument('Strings/Solo Contrabass/Spic', 'low', oneshot=True, level='peak', pan=0.45, width=0.5, send=0.3, release=0.15)
solo = Instrument('Strings/Solo Violin/Arco Vib', 'solo', octave=0, pan=0.12, width=0.35, send=0.45, release=0.4)
fl = Instrument('Woodwinds/Flute/expvib', 'flute', pan=-0.2, width=0.35, send=0.5, release=0.3)
hn = Instrument('Brass/F Horn/sus', 'horns', pan=-0.3, width=0.6, send=0.55, release=0.35)
hn_pad = Instrument('Brass/F Horn/sus', 'brass', pan=-0.3, width=0.6, send=0.55, release=0.4)
tpt = Instrument('Brass/Trumpet/sus', 'brass', pan=0.15, width=0.5, send=0.5, release=0.3)
tbn = Instrument('Brass/Tenor Trombone/sus', 'brass', pan=0.35, width=0.5, send=0.5, release=0.35)
tuba = Instrument('Brass/Tuba/sus', 'low', pan=0.4, width=0.5, send=0.45, release=0.4)
TIMP = {'Timpani1': 41.46, 'Timpani2': 53.56, 'Timpani5': 54.55, 'Timpani3': 56.29, 'Timpani4': 58.94}
timp = Instrument('Percussion/Timpani', 'perc', zones={k + '_Hit': v for k, v in TIMP.items()}, oneshot=True, level='peak', pan=0.05, width=0.8, send=0.5)
timp_roll = Instrument('Percussion/Timpani/Rolls', 'perc', zones={k + '_Roll': v for k, v in TIMP.items()}, pan=0.05, width=0.8, send=0.5, release=0.6)
bd = Instrument('Percussion', 'perc', keep='^BDrumNewhit', pitched=False, oneshot=True, level='peak', width=0.9, send=0.55)
crash = Instrument('Percussion', 'perc', keep='^cymbal-crash1', pitched=False, oneshot=True, level='peak', pan=-0.25, send=0.5)
gong = Instrument('Percussion', 'perc', keep='^gongHit', pitched=False, oneshot=True, level='peak', pan=0.2, send=0.55)
glock = Instrument('Percussion/Glock', 'glock', oneshot=True, level='peak', pan=0.35, width=0.5, send=0.55)

M = Mix(SECS)

def note(inst, pitch, bar, beat, beats, vel=0.7, human=0.006, **kw):
    M.play(inst, pitch, at(bar, beat) + rng.uniform(-human, human), beats * BEAT, vel, **kw)

def line(inst, bar, notes, vel=0.7, legato=True, curve=None, **kw):
    """notes: (beat, pitch, beats[, vel]) from the start of `bar`; touching notes are joined legato."""
    for i, n in enumerate(notes):
        beat, pitch, d = n[:3]; v = n[3] if len(n) > 3 else vel
        nxt, prv = (notes[i + 1] if i + 1 < len(notes) else None), (notes[i - 1] if i else None)
        tie_next = legato and nxt is not None and abs(nxt[0] - beat - d) < 0.02
        tie_prev = legato and prv is not None and abs(prv[0] + prv[2] - beat) < 0.02
        note(inst, pitch, bar, beat, d, v, legato=tie_prev, release=0.14 if tie_next else None, curve=curve, **kw)

def chord(inst, bar, beat, pitches, beats, vel=0.5, curve=None, **kw):
    for p in pitches: note(inst, p, bar, beat, beats, vel, curve=curve, **kw)

def ostinato(inst, bar, beat0, beat1, pitches, step=0.5, vel=0.55, accent=0.15, grow=0.0, **kw):
    """Repeated short notes; `pitches` cycles; downbeats accented; vel can grow across the span."""
    b, k = beat0, 0
    while b < beat1 - 1e-6:
        v = vel + grow * (b - beat0) / max(beat1 - beat0, 1e-6) + (accent if abs(b % 1) < 1e-6 else 0)
        note(inst, pitches[k % len(pitches)], bar, b, step * 0.9, min(v, 1.0), **kw)
        b += step; k += 1

def swell(t, kind='Median', gain=0.0, stem='perc'):
    """A suspended-cymbal crescendo whose peak lands on time t, choked just after it."""
    x = load(str(LIB / 'Percussion' / f'susCymb1-cresc-{kind}_v1.wav'), 'peak')
    e = np.convolve(np.abs(x).mean(0), np.ones(2400) / 2400, mode='same'); top = int(np.argmax(e))
    seg = x[:, :top + int(0.06 * SR)].copy(); seg[:, -int(0.06 * SR):] *= np.linspace(1, 0, int(0.06 * SR))
    M.put(stem, seg, t - top / SR, -0.2, 1.0, 0.5, db(gain))

def backwards(sig, t_end, stem='fx', pan=0.0, gain=0.0, send=0.4):
    """Play a rendered sound reversed so that it ends on t_end: time running the other way."""
    if sig.ndim == 1: sig = np.stack([sig, sig])
    M.put(stem, sig[:, ::-1].copy(), t_end - sig.shape[1] / SR, pan, 1.0, send, db(gain))

# ---- synthesized layers ---------------------------------------------------------------------------------------
def tone(freqs, decays, dur, amps=None):
    t = np.arange(int(dur * SR)) / SR
    return sum((amps[i] if amps else 1) * np.sin(2 * np.pi * f * t + i) * np.exp(-t / d) for i, (f, d) in enumerate(zip(freqs, decays)))

def boom(dur=2.2, f0=62, f1=31):
    t = np.arange(int(dur * SR)) / SR
    ph = 2 * np.pi * (f1 * t + (f0 - f1) * (1 - np.exp(-t * 4)) / 4)
    return np.sin(ph) * np.exp(-t * 1.6) * np.minimum(1, t / 0.004)

def noise_band(dur, f0, f1, shape):
    """Band-limited noise sweeping f0 -> f1 (block-wise, filter state carried), shaped by `shape`(0..1)."""
    from scipy.signal import butter, sosfilt
    n = int(dur * SR); x = rng.standard_normal(n); out = np.zeros(n); step = 512; zi = np.zeros((1, 2))
    for s in range(0, n, step):
        fc = f0 * (f1 / f0) ** (s / n)
        sos = butter(1, [fc * 0.7, min(fc * 1.4, SR / 2.1)], 'band', fs=SR, output='sos')
        out[s:s + step], zi = sosfilt(sos, x[s:s + step], zi=zi)
    return out * shape(np.linspace(0, 1, n))

def snap():
    """The thread snapping: a hard transient, a bright ping that bends down, and a soft low thud."""
    t = np.arange(int(1.6 * SR)) / SR
    crack = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 120)
    zing = np.sin(2 * np.pi * (2600 * t - 1700 * (1 - np.exp(-t * 9)) / 9)) * np.exp(-t * 7) * 0.35
    ping = tone([3150, 4870, 7230], [0.35, 0.22, 0.12], 1.6, [0.3, 0.2, 0.1])
    return crack * 0.8 + zing + ping + boom(1.6, 90, 45) * 0.5

def wind(dur):
    return noise_band(dur, 350, 2400, lambda u: np.sin(np.pi * u) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 1.3 * u)))

def sword():
    """A blade ringing out: an edge scrape, then slow-beating metallic partials."""
    t = np.arange(int(3.2 * SR)) / SR
    scrape = noise_band(0.35, 6000, 2500, lambda u: (1 - u) ** 2) * 0.6
    ring = tone([1480, 1484.5, 3960, 6120, 8700], [1.6, 1.6, 0.9, 0.5, 0.25], 3.2, [0.25, 0.25, 0.18, 0.1, 0.05])
    ring[: len(scrape)] += scrape
    return ring

def embers(t0, t1, rate=9.0, gain=-30):
    n = int(rng.poisson(rate * (t1 - t0)))
    for t in np.sort(rng.uniform(t0, t1, n)):
        k = int(rng.uniform(0.004, 0.02) * SR)
        pop = hp(rng.standard_normal(k), rng.uniform(1500, 5000)) * np.exp(-np.arange(k) / SR * rng.uniform(150, 600))
        M.put('fx', pop, t, rng.uniform(-0.8, 0.8), 1.0, 0.3, db(gain + rng.uniform(-6, 4)))

def whoosh(t, dur=0.9, gain=-14, up=False):
    sig = noise_band(dur, 600 if up else 3500, 3500 if up else 500, lambda u: np.sin(np.pi * u ** (0.6 if up else 1.6)) ** 2)
    M.put('fx', sig, t - dur * (0.85 if up else 0.3), 0.0, 1.0, 0.35, db(gain))

def hit(t, size=1.0, gong_too=False):
    """Orchestral impact: timpani + bass drum + crash (+ gong), with a synthesized sub boom under it."""
    M.play(timp, 'D2', t, 3.0, 0.75 + 0.25 * size); M.play(bd, 60, t, 3.0, 0.6 + 0.4 * size)
    M.play(crash, 60, t, 4.0, 0.55 + 0.4 * size)
    if gong_too: M.play(gong, 60, t + 0.01, 6.0, 0.9)
    M.put('fx', boom(), t, 0.0, 1.0, 0.15, db(-8 + 4 * size))

# ---- the score ------------------------------------------------------------------------------------------------
def act_one():
    # bar 0 — one string
    note(harp, 'D3', 0, 0, 6, 0.85, human=0)
    note(harp, 'D5', 0, 0.02, 4, 0.2, human=0)
    note(cb, 'D2', 0, 0.5, 7.5, 0.4, curve=[(0, 0), (0.6, 0.7), (1, 1)])
    note(vc_pad, 'D3', 0, 2, 6, 0.32, curve=[(0, 0), (1, 1)])
    embers(0.2, at(2), 7)
    # bar 1 — the fate motif on the harp; the thread snaps on the F
    motif = [(0, 'A3', 0.7), (1, 'D4', 0.72), (2, 'E4', 0.7), (3, 'F4', 0.82)]
    harp_motif = np.zeros((2, int(BAR * SR) + 4 * SR), np.float32)
    for beat, p, v in motif:
        note(harp, p, 1, beat, 5, v, human=0)
        y = harp.render(p, 5, v); i = int(beat * BEAT * SR); harp_motif[:, i:i + y.shape[1]] += y[:, : harp_motif.shape[1] - i]
    note(harp, 'D2', 1, 0, 5, 0.5, human=0)
    note(vla, 'F3', 1, 0, 4, 0.3, curve=[(0, 0.2), (1, 1)])
    M.put('fx', snap(), fr(SYNC['snap']), 0.1, 1.0, 0.45, db(-11))
    # bar 2 — rewind: the opening harp, backwards, under a swelling D minor; the thread rejoins on bar 3
    backwards(harp_motif[:, : int((BAR + 0.5) * SR)], fr(SYNC['rejoin']) - 0.04, 'harp', -0.2, -4, 0.5)
    rev_crash = crash.render(60, 4.0, 0.8); backwards(rev_crash, fr(SYNC['rejoin']) - 0.02, 'fx', 0.0, -8, 0.4)
    backwards(boom(2.0, 70, 35) * 0.8, fr(SYNC['rejoin']), 'fx', 0.0, -16, 0.2)
    chord(vc_pad, 2, 0, ['D3', 'A3'], 4.4, 0.55, curve=[(0, 0.25), (1, 1)])
    chord(vla, 2, 0, ['F4'], 4.4, 0.45, curve=[(0, 0.2), (1, 1)])
    note(cb, 'D2', 2, 0, 4.4, 0.45, curve=[(0, 0.3), (1, 1)])
    chord(vln_trem, 2, 0.5, ['D5', 'A5'], 3.9, 0.4, curve=[(0, 0), (1, 1)])
    embers(at(2), at(3), 14, -32)
    # bar 3 — rejoined, multiplied: the violins take the motif, the pulse starts
    note(timp, 'D2', 3, 0, 3, 0.6, human=0); note(harp, 'D2', 3, 0, 4, 0.7, human=0); note(bd, 60, 3, 0, 3, 0.45, human=0)
    line(vln, 3, [(0, 'A4', 1), (1, 'D5', 1), (2, 'E5', 0.5), (2.5, 'F5', 0.5), (3, 'E5', 1.2)], 0.72,
         curve=[(0, 0.85), (1, 1)])
    chord(vla, 3, 0, ['A3', 'D4'], 2, 0.5); chord(vla, 3, 2, ['Bb3', 'D4'], 1, 0.55); chord(vla, 3, 3, ['A3', 'C#4'], 1, 0.6)
    note(vc_pad, 'D3', 3, 0, 2, 0.55); note(vc_pad, 'Bb2', 3, 2, 1, 0.6); note(vc_pad, 'A2', 3, 3, 1.1, 0.65)
    note(cb, 'D2', 3, 0, 2, 0.5); note(cb, 'Bb1', 3, 2, 1, 0.55); note(cb, 'A1', 3, 3, 1.1, 0.6)
    chord(hn_pad, 3, 0, ['F3', 'A3'], 2, 0.45, curve=[(0, 0.5), (1, 1)]); chord(hn_pad, 3, 2, ['F3', 'Bb3'], 1, 0.55); chord(hn_pad, 3, 3, ['E3', 'A3'], 1.1, 0.62)
    ostinato(vc_spic, 3, 0, 2, ['D3'], 0.25, 0.45, grow=0.1); ostinato(vc_spic, 3, 2, 3, ['Bb2'], 0.25, 0.55); ostinato(vc_spic, 3, 3, 4, ['A2'], 0.25, 0.62)
    for k in range(4):                                  # threads multiplying: rising harp flurries
        for j, p in enumerate(['D4', 'F4', 'A4', 'D5', 'F5', 'A5'] if k < 2 else ['Bb3', 'D4', 'F4', 'Bb4', 'D5', 'F5']):
            note(harp, p, 3, k * 0.75 + j * 0.11, 2.5, 0.32 + 0.04 * j, pan=-0.7 + 0.25 * j)
    note(timp_roll, 'A2', 3, 2, 2, 0.6, curve=[(0, 0.15), (1, 1)])
    swell(at(4), 'Median', -3)
    whoosh(at(4), 1.2, -12, up=True)

def heroes():
    hit(at(4), 0.75)
    # bar 4 — Kai: the flute, wind over Libera (Dm | Bb)
    line(fl, 4, [(0, 'A5', 0.5), (0.5, 'D6', 0.5), (1, 'E6', 0.25), (1.25, 'F6', 0.25), (1.5, 'G6', 0.5), (2, 'F6', 1),
                 (3, 'D6', 0.5), (3.5, 'C6', 0.5), (4, 'Bb5', 1.6, 0.5)], 0.8)
    for b in range(8):                                  # harp in eighths, like gusts
        p = (['D4', 'A4', 'F5', 'A4'] if b < 4 else ['Bb3', 'F4', 'D5', 'F4'])[b % 4]
        note(harp, p, 4, b * 0.5, 2, 0.38 + (0.08 if b % 2 == 0 else 0))
    chord(vln, 4, 0, ['A4'], 2, 0.35); chord(vln, 4, 2, ['Bb4'], 2, 0.35)
    chord(vla, 4, 0, ['F4'], 4, 0.32); note(vc_pad, 'D3', 4, 0, 2, 0.4); note(vc_pad, 'Bb2', 4, 2, 2, 0.4)
    note(cb, 'D2', 4, 0, 2, 0.45); note(cb, 'Bb1', 4, 2, 2, 0.45)
    ostinato(vla_spic, 4, 0, 4, ['D4'], 0.5, 0.32)
    M.put('fx', wind(2.8), at(4) - 0.2, -0.3, 1.0, 0.4, db(-15))
    # bar 5 — Dietrich: the cellos, a sword singing far from home (Gm | Dm)
    line(vc, 5, [(0, 'D3', 1), (1, 'G3', 0.75), (1.75, 'A3', 0.25), (2, 'Bb3', 1), (3, 'A3', 1.4)], 0.85,
         curve=[(0, 0.85), (0.55, 1), (1, 0.9)])
    chord(vla, 5, 0, ['D4', 'G4'], 2, 0.38); chord(vla, 5, 2, ['D4', 'F4'], 2, 0.38)
    chord(vln, 5, 0, ['Bb4', 'D5'], 2, 0.3); chord(vln, 5, 2, ['A4', 'D5'], 2, 0.3)
    note(cb, 'G1', 5, 0, 2, 0.5); note(cb, 'D2', 5, 2, 2, 0.5)
    ostinato(cb_spic, 5, 0, 2, ['G1'], 0.5, 0.4); ostinato(cb_spic, 5, 2, 4, ['D2'], 0.5, 0.4)
    note(timp, 'G2', 5, 0, 3, 0.5)
    M.put('fx', sword(), at(5) + 0.02, 0.35, 1.0, 0.5, db(-13))
    # bar 6 — Theodora: the horns, the queen and her country (Bb | F)
    # (the horn samples stop at C4, so the queen's theme sits in the horns' warm middle, a trumpet an octave above)
    queen = [(0, 'F3', 0.75), (0.75, 'F3', 0.25), (1, 'Bb3', 0.75), (1.75, 'C4', 0.25), (2, 'D4', 1), (3, 'C4', 0.5), (3.5, 'A3', 0.6)]
    line(hn, 6, queen, 0.88, legato=False)
    line(tpt, 6, [(b, p[:-1] + str(int(p[-1]) + 1), d) for b, p, d in queen], 0.42, legato=False)
    line(hn, 6, [(0, 'D3', 0.75), (0.75, 'D3', 0.25), (1, 'F3', 0.75), (1.75, 'A3', 0.25), (2, 'F3', 1), (3, 'F3', 0.5),
                 (3.5, 'C3', 0.6)], 0.62, legato=False, pan=-0.45)
    chord(tbn, 6, 0, ['Bb2', 'F3'], 2, 0.45); chord(tbn, 6, 2, ['F2', 'C3'], 2, 0.45)
    note(tuba, 'Bb1', 6, 0, 2, 0.4); note(tuba, 'F1', 6, 2, 2, 0.4)
    chord(vln, 6, 0, ['D5', 'F5'], 2, 0.3); chord(vln, 6, 2, ['C5', 'F5'], 2, 0.3)
    for beat, p in ((0.5, 'F6'), (1.5, 'C7'), (2.5, 'A6'), (3.0, 'F6'), (3.5, 'C7')):   # lamplight
        note(glock, p, 6, beat, 3, 0.45)
    note(timp, 'Bb2', 6, 0, 3, 0.55); note(timp, 'F2', 6, 2, 3, 0.45)
    ostinato(vla_spic, 6, 0, 2, ['Bb3', 'F4'], 0.5, 0.32); ostinato(vla_spic, 6, 2, 4, ['A3', 'F4'], 0.5, 0.32)
    # bar 7 — Leda: the solo violin, harmonic minor, the rose's song of revenge (Gm | A)
    line(solo, 7, [(0, 'D5', 0.5), (0.5, 'G5', 0.5), (1, 'A5', 0.25), (1.25, 'Bb5', 0.75), (2, 'C#6', 1),
                   (3, 'D6', 0.25), (3.25, 'E6', 1.15)], 0.88, curve=[(0, 0.9), (1, 1)])
    chord(vc_trem, 7, 0, ['G2', 'D3'], 2, 0.45); chord(vc_trem, 7, 2, ['A2', 'E3'], 2, 0.5)
    chord(vln_trem, 7, 0, ['Bb4', 'D5'], 2, 0.3); chord(vln_trem, 7, 2, ['A4', 'C#5'], 2, 0.35)
    note(cb, 'G1', 7, 0, 2, 0.5); note(cb, 'A1', 7, 2, 2, 0.55)
    note(timp_roll, 'A2', 7, 2, 2, 0.5, curve=[(0, 0.2), (1, 1)])
    for j, p in enumerate(['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5']):   # glissando
        note(harp, p, 7, 3.35 + j * 0.055, 2.5, 0.3 + 0.03 * j)
    swell(at(8), 'Short', -8)
    backwards(harp.render('A5', 2.5, 0.6), at(8), 'harp', 0.3, -6)

def guide():
    """Bars 8-13: the notebook. F major, harp and spiccato pulse, the motif turned major; then the build."""
    plan = [(8, ['F', 'C']), (9, ['Dm', 'Bb']), (10, ['F', 'C']), (11, ['Bb', 'C']), (12, ['Dm', 'Bb']), (13, ['Gm', 'A'])]
    V = {'F': ('F2', ['C4', 'F4', 'A4'], ['F4', 'A4', 'C5', 'A4']), 'C': ('C2', ['C4', 'E4', 'G4'], ['E4', 'G4', 'C5', 'G4']),
         'Dm': ('D2', ['D4', 'F4', 'A4'], ['D4', 'F4', 'A4', 'F4']), 'Bb': ('Bb1', ['D4', 'F4', 'Bb4'], ['D4', 'F4', 'Bb4', 'F4']),
         'Gm': ('G1', ['D4', 'G4', 'Bb4'], ['D4', 'G4', 'Bb4', 'G4']), 'A': ('A1', ['C#4', 'E4', 'A4'], ['C#4', 'E4', 'A4', 'E4'])}
    whoosh(fr(SYNC['cuts'][0]), 1.0, -16)
    for bar, (c1, c2) in plan:
        for half, c in enumerate((c1, c2)):
            root, pad, arp = V[c]; b0 = half * 2
            quiet = bar == 12                         # night: the room dims before the build
            if bar < 12:
                for k in range(4):                    # harp eighths, up an octave
                    p = arp[k][:-1] + str(int(arp[k][-1]) + 1)
                    note(harp, p, bar, b0 + k * 0.5, 1.6, 0.36 + (0.06 if k == 0 else 0))
                ostinato(vla_spic, bar, b0, b0 + 2, pad[:2], 0.5, 0.36)
                ostinato(cb_spic, bar, b0, b0 + 2, [root], 1.0, 0.42)
            chord(vla, bar, b0, pad, 2, 0.26 if quiet else 0.3)
            note(cb, root, bar, b0, 2, 0.32 if quiet else 0.36)
            note(vc_pad, root[:-1] + str(int(root[-1]) + 1), bar, b0, 2, 0.32)
    # the violins sing the fate motif in major, then answer it
    line(vln, 8, [(0, 'C5', 1), (1, 'F5', 1), (2, 'G5', 0.5), (2.5, 'A5', 1.5)], 0.6)
    line(vln, 9, [(0, 'A5', 1.5), (1.5, 'G5', 0.5), (2, 'F5', 2)], 0.55)
    line(vln, 10, [(0, 'F5', 1), (1, 'A5', 1), (2, 'G5', 2)], 0.55)
    line(vln, 11, [(0, 'F5', 2), (2, 'E5', 2)], 0.5)
    line(fl, 9, [(2, 'F5', 0.5), (2.5, 'Bb5', 0.5), (3, 'C6', 0.25), (3.25, 'D6', 0.75)], 0.5)     # Kai, remembered
    line(hn, 11, [(0, 'F3', 0.75), (0.75, 'F3', 0.25), (1, 'Bb3', 1)], 0.5, legato=False)           # Theodora, remembered
    for whoosh_at in SYNC['cuts'][1:5]: whoosh(fr(whoosh_at), 0.7, -21)
    for i, f in enumerate(SYNC['marks']):             # each person marked in the planner
        p = ['F6', 'G6', 'C7'][i]; M.play(glock, p, fr(f), 3, 0.5); M.play(harp, p[:-1] + '5', fr(f), 2, 0.45)
    for i, f in enumerate(SYNC['bells']):             # the calendar's windows
        M.play(glock, ['F6', 'E6'][i], fr(f), 4, 0.55); M.play(harp, ['Bb3', 'C4'][i], fr(f), 3, 0.4)
    # night: a soft swish and a low string as the theme turns
    whoosh(fr(SYNC['wipe']) + 0.25, 0.8, -15)
    M.play(harp, 'D2', fr(SYNC['wipe']), 4, 0.5); M.play(timp, 'D2', fr(SYNC['wipe']), 3, 0.35)
    # bars 12-13: the build
    ostinato(vc_spic, 12, 0, 2, ['D3'], 0.25, 0.4, grow=0.08); ostinato(vc_spic, 12, 2, 4, ['Bb2'], 0.25, 0.48, grow=0.08)
    ostinato(vc_spic, 13, 0, 2, ['G2'], 0.25, 0.58, grow=0.1); ostinato(vc_spic, 13, 2, 4, ['A2'], 0.25, 0.7, grow=0.15)
    ostinato(vla_spic, 13, 0, 2, ['D4', 'G4'], 0.25, 0.5, grow=0.1); ostinato(vla_spic, 13, 2, 4, ['E4', 'A4'], 0.25, 0.6, grow=0.15)
    ostinato(cb_spic, 13, 0, 4, ['G1', 'G1', 'G1', 'G1', 'A1', 'A1', 'A1', 'A1'], 0.5, 0.55, grow=0.2)
    note(vln, 'D5', 12, 0, 4, 0.45, curve=[(0, 0.6), (1, 1)])
    line(vln, 13, [(0, 'D5', 1), (1, 'G5', 1)], 0.62)
    line(vln, 13, [(2 + 0.25 * k, p, 0.25) for k, p in enumerate(['A4', 'Bb4', 'C#5', 'D5', 'E5', 'F5', 'G5', 'A5'])], 0.72)
    chord(hn_pad, 12, 0, ['F3', 'A3', 'D4'], 4, 0.4, curve=[(0, 0.6), (1, 1)])
    chord(hn_pad, 13, 0, ['G3', 'Bb3', 'D4'], 2, 0.55); chord(hn_pad, 13, 2, ['E3', 'A3', 'C#4'], 2, 0.62, curve=[(0, 0.7), (1, 1)])
    chord(tbn, 13, 0, ['G2', 'D3'], 2, 0.5); chord(tbn, 13, 2, ['A2', 'E3'], 2, 0.58, curve=[(0, 0.7), (1, 1)])
    note(tuba, 'G1', 13, 0, 2, 0.5); note(tuba, 'A1', 13, 2, 2, 0.58)
    note(timp_roll, 'A2', 13, 0, 4, 0.75, curve=[(0, 0.1), (0.7, 0.55), (1, 1)])
    swell(at(14), 'Long', -1)
    whoosh(at(14), 1.6, -10, up=True)
    backwards(crash.render(60, 3.0, 0.9), at(14) - 0.01, 'fx', 0.0, -9, 0.3)

def converge():
    """Bars 14-17: the four themes together, then the cadence Bb-C-D into D major."""
    hit(at(14), 1.0, gong_too=True)
    melody = [(0, 'A4', 0.75), (0.75, 'A4', 0.25), (1, 'D5', 0.75), (1.75, 'E5', 0.25), (2, 'F5', 2)]
    melody2 = [(0, 'G5', 0.75), (0.75, 'F5', 0.25), (1, 'D5', 1), (2, 'F5', 1), (3, 'E5', 1)]
    line(tpt, 14, melody, 0.92, legato=False); line(tpt, 15, melody2, 0.92, legato=False)
    line(vln, 14, melody, 0.85, legato=False); line(vln, 15, melody2, 0.85, legato=False)        # strings double the brass
    for upper, lower in ((14, [('F3', 'A3', 2), ('F3', 'Bb3', 2)]), (15, [('G3', 'Bb3', 2), ('F3', 'Bb3', 1), ('G3', 'C4', 1)])):
        b = 0
        for lo, hi, d in lower:
            chord(hn, upper, b, [lo, hi], d, 0.86, pan=-0.35); b += d
    chord(tbn, 14, 0, ['D3', 'A3'], 2, 0.8); chord(tbn, 14, 2, ['D3', 'F3', 'Bb3'], 2, 0.8)
    chord(tbn, 15, 0, ['D3', 'G3', 'Bb3'], 2, 0.8); chord(tbn, 15, 2, ['D3', 'F3', 'Bb3'], 1, 0.82); chord(tbn, 15, 3, ['E3', 'G3', 'C4'], 1, 0.86)
    for inst in (tuba, cb):
        line(inst, 14, [(0, 'D2', 2), (2, 'Bb1', 2)], 0.82, legato=False); line(inst, 15, [(0, 'G1', 2), (2, 'Bb1', 1), (3, 'C2', 1)], 0.85, legato=False)
    # Dietrich's line in the cellos, under everything
    line(vc, 14, [(0, 'D3', 1), (1, 'G3', 0.75), (1.75, 'A3', 0.25), (2, 'Bb3', 2)], 0.85)
    line(vc, 15, [(0, 'G3', 1.5), (1.5, 'A3', 0.5), (2, 'Bb3', 1), (3, 'C4', 1)], 0.88)
    # Kai's runs above
    line(fl, 14, [(0, 'A5', 0.25), (0.25, 'D6', 0.25), (0.5, 'E6', 0.25), (0.75, 'F6', 0.25), (1, 'A6', 1), (2, 'F6', 0.5),
                  (2.5, 'D6', 0.5), (3, 'F6', 0.25), (3.25, 'G6', 0.25), (3.5, 'A6', 0.5)], 0.85)
    line(fl, 15, [(0, 'G6', 2), (2, 'F6', 1), (3, 'G6', 1)], 0.8)
    # Leda's violin enters high in the second bar
    line(solo, 15, [(0, 'D6', 0.5), (0.5, 'G6', 0.5), (1, 'A6', 0.25), (1.25, 'Bb6', 0.75), (2, 'A6', 0.5), (2.5, 'F6', 0.5),
                    (3, 'G6', 0.5), (3.5, 'E6', 0.5)], 0.95)
    # the drive: violins and violas in sixteenths, timpani on the strong beats
    for bar, halves in ((14, [['D5', 'A4', 'F5', 'A4'], ['D5', 'Bb4', 'F5', 'Bb4']]), (15, [['D5', 'G4', 'Bb4', 'G4'], ['D5', 'Bb4', 'F5', 'Bb4']])):
        for h, pat in enumerate(halves):
            ostinato(vln_spic, bar, h * 2, h * 2 + 2, pat, 0.25, 0.62, accent=0.2)
            ostinato(vla_spic, bar, h * 2, h * 2 + 2, [pat[1], pat[0]], 0.25, 0.55, accent=0.2)
    for bar, hits in ((14, [(0, 'D2', 1.0), (1.5, 'A2', 0.62), (2, 'D2', 0.85), (3, 'A2', 0.6), (3.5, 'A2', 0.68)]),
                      (15, [(0, 'D2', 0.9), (1.5, 'A2', 0.6), (2, 'D2', 0.82), (3, 'A2', 0.62), (3.25, 'A2', 0.7), (3.5, 'D2', 0.8), (3.75, 'D2', 0.9)])):
        for beat, p, v in hits:
            if (bar, beat) != (14, 0): note(timp, p, bar, beat, 3, v, human=0.003)
    note(bd, 60, 14, 2, 3, 0.7); note(bd, 60, 15, 0, 3, 0.75); note(bd, 60, 15, 2, 3, 0.75)
    swell(at(16), 'Median', -2)
    # bars 16-17: D major — the F becomes F#
    hit(at(16), 1.0, gong_too=True)
    fade = [(0, 1), (0.35, 0.75), (1, 0.25)]
    chord(tpt, 16, 0, ['A4', 'F#5'], 6, 0.9, curve=fade); chord(hn, 16, 0, ['D3', 'F#3', 'A3', 'D4'], 7, 0.85, curve=fade)
    chord(tbn, 16, 0, ['D3', 'A3', 'F#3'], 7, 0.82, curve=fade); note(tuba, 'D2', 16, 0, 7, 0.82, curve=fade)
    note(cb, 'D2', 16, 0, 8, 0.8, curve=fade); chord(vc, 16, 0, ['D3', 'D4'], 8, 0.85, curve=fade)
    chord(vla, 16, 0, ['A3', 'D4', 'F#4'], 8, 0.7, curve=fade); chord(vln, 16, 0, ['F#5', 'A5', 'D6'], 8, 0.75, curve=fade)
    note(fl, 'A6', 16, 0, 3.5, 0.8, curve=fade); note(solo, 'F#6', 16, 0, 3.5, 0.9, curve=fade)
    note(timp_roll, 'D2', 16, 0.5, 5, 0.75, curve=[(0, 1), (1, 0.05)])
    for j, p in enumerate(['D2', 'A2', 'D3', 'F#3', 'A3', 'D4', 'F#4', 'A4', 'D5']):          # rolled harp chord
        note(harp, p, 16, j * 0.06, 6, 0.75, human=0)
    # bar 17: the one string, now in major
    for f, p in zip(SYNC['endMotif'], ['A4', 'D5', 'E5', 'F#5']):
        M.play(harp, p, fr(f), 5, 0.62)
    M.play(harp, 'D6', fr(SYNC['endMotif'][-1]) + BEAT, 5, 0.5)
    chord(vln, 17, 0, ['A5', 'D6'], 4, 0.3, curve=[(0, 1), (1, 0.4)])

# ---- mix ------------------------------------------------------------------------------------------------------
STEM_GAIN = {'harp': 0, 'strings': 0, 'cellos': 0, 'low': 0, 'solo': 3, 'flute': 3.5, 'horns': 0, 'brass': 0.5,
             'perc': 1.5, 'glock': 0, 'fx': 0}

def compress(x, threshold=-11, ratio=2.0, attack=0.01, release=0.25):
    lvl = np.maximum(np.abs(x[0]), np.abs(x[1]))
    a, r = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    env = lfilter([1 - r], [1, -r], lvl)                       # smooth level (release-speed), then fast attack peak hold
    env = np.maximum(env, lfilter([1 - a], [1, -a], lvl))
    over = 20 * np.log10(np.maximum(env, 1e-9)) - threshold
    g = db(-np.maximum(over, 0) * (1 - 1 / ratio))
    return x * g

def render():
    act_one(); heroes(); guide(); converge()
    ir = hall(3.2)
    lift = np.ones(M.n, np.float32)                            # the last act a little bigger than the rest
    a, b = int((at(14) - 0.05) * SR), int(at(18) * SR); lift[a:b] = db(1.5); lift = np.convolve(lift, np.ones(4800) / 4800, mode='same')
    stems = {k: v * db(STEM_GAIN.get(k, 0)) * lift for k, v in M.stems.items()}
    send = sum(M.sends[k] * db(STEM_GAIN.get(k, 0)) for k in M.stems)
    wet = reverb(send, ir)
    mix = sum(stems.values()) + wet * 0.55
    mix = np.stack([hp(mix[0], 28), hp(mix[1], 28)])
    n = int(SECS * SR); mix = mix[:, :n]
    f = int(1.4 * SR); mix[:, -f:] *= np.linspace(1, 0, f) ** 1.6
    return compress(mix), stems, wet

def write(path, x):
    peak = float(np.max(np.abs(x))); x = x / peak * 0.89 if peak > 0.89 else x
    from scipy.io import wavfile
    wavfile.write(path, SR, (np.clip(x.T, -1, 1) * 32767).astype('<i2'))

def loudnorm(src, dst, target=-14):
    meter = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(src), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    measured = float(meter.rsplit('I:', 1)[1].split('LUFS')[0])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(src), '-af',
                    f'volume={target - measured:.2f}dB,alimiter=limit=0.84:level=false:attack=4:release=80', '-ar', str(SR), str(dst)], check=True)

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    mix, stems, wet = render()
    if '--stems' in sys.argv:                                  # loudness of each stem per section, for balancing
        secs = [('one', 0, 3), ('heroes', 4, 8), ('guide', 8, 12), ('build', 12, 14), ('tutti', 14, 16), ('end', 16, 18)]
        for k, v in sorted(stems.items()):
            print(f'{k:8s}', ' '.join(f'{name}:{lufs_ish(v[:, int(at(a) * SR):int(at(b) * SR)]):6.1f}' for name, a, b in secs))
        for bar in range(4, 8):
            print('bar', bar, ' '.join(f'{k}:{lufs_ish(v[:, int(at(bar) * SR):int(at(bar + 1) * SR)]):6.1f}' for k, v in sorted(stems.items())))
    write(OUT / 'long-music.wav', mix)
    loudnorm(OUT / 'long-music.wav', OUT / 'long-mix.wav')
    print('long score written', f'{mix.shape[1] / SR:.2f}s')
