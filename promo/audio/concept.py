"""Score for the second promo, 「逆命」: a 60-second concept trailer at 90 BPM, on timeline.json's `concept` clock.

Trailer form in three acts, D minor to D major:
  Act I  (bars 0-5)   The end. A grand piano spells the fate motif one note at a time over a heartbeat; a clock
                      ticks on every beat (each tick, on screen, a companion loses their colour); death knells;
                      a braam for the demon god; a soul's light; the clock slows and stops.
  Act II (bars 6-14)  The rewind: Act I itself played backwards and three times as fast, like tape. Then the drop:
                      war drums and string sixteenths; the four protagonists each cut in with a slash and their own
                      theme (flute, cellos, horns, solo violin, as in the first promo); a stop-time hit; the
                      companions strobe on sixteenths; weapons clash, a level-up chime; the build.
  (bar 15)            One bar of silence: a heartbeat, a breath.
  Act III(bars 16-22) The second braam, the pipe organ and the full orchestra: the fate motif in the brass over
                      half-time drums, Bb-C-D into D major as the black sun shatters; bells; the piano plays the
                      motif once more, in major.

Samples: VSCO 2 CE and VCSL (both CC0) through audio/orchestra.py; braams, risers, slashes, the tape rewind, the
heartbeat, fire and shatter are synthesized here.
Run: python3 audio/concept.py   -> public/audio/concept-music.wav, concept-mix.wav (about -14 LUFS)
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
from scipy.signal import butter, lfilter, resample_poly, sosfilt

sys.path.insert(0, str(Path(__file__).parent))
from orchestra import LIB, SR, VCSL, Instrument, Mix, db, hall, hp, load, lp, lufs_ish, reverb

ROOT = Path(__file__).resolve().parents[1]
T = json.loads((ROOT / 'timeline.json').read_text())
C = T['concept']; SYNC = C['sync']
OUT = ROOT / 'public' / 'audio'
FPS = T['fps']; BEAT = C['beatFrames'] / FPS; BAR = 4 * BEAT; STEP = BEAT / 4
SECS = C['frames'] / FPS
rng = np.random.default_rng(23)

def at(bar, beat=0.0): return (bar * 4 + beat) * BEAT
def fr(frame): return frame / FPS

# ---- instruments ---------------------------------------------------------------------------------------------
V, VA, VC = 'Strings/Violin Section/', 'Strings/Viola Section/', 'Strings/Cello Section/'
OR, MB, ID = 'Aerophones/Edge-blown Aerophones/Pipe Organ/', 'Membranophones/Struck Membranophones/', 'Idiophones/Struck Idiophones/'
piano = Instrument('Chordophones/Zithers/Grand Piano, Steinway B/Sus', 'piano', octave=0, root=VCSL, oneshot=True, level='peak', width=0.9, send=0.65)
organ = Instrument(OR + 'Loud', 'organ', octave=0, root=VCSL, release=1.4, width=1.0, send=0.6)
organ_q = Instrument(OR + 'Quiet', 'organ', octave=0, root=VCSL, release=1.4, width=1.0, send=0.6)
pedal = Instrument(OR + 'Loud Pedal', 'organ', octave=0, root=VCSL, release=1.4, width=1.0, send=0.5)
bells = Instrument(ID + 'Tubular Bells 1', 'bells', octave=0, root=VCSL, oneshot=True, level='peak', pan=0.15, width=0.8, send=0.7)
bd2 = Instrument(MB + 'Bass Drum 2', 'drums', pitched=False, keep='^bassdrum_hit', root=VCSL, oneshot=True, level='peak', width=0.9, send=0.4)
tom_h = Instrument(MB + 'Tom 1/Mallet', 'drums', pitched=False, keep='HitM', root=VCSL, oneshot=True, level='peak', pan=-0.35, send=0.4)
tom_l = Instrument(MB + 'Tom 2/Mallet', 'drums', pitched=False, keep='HitM', root=VCSL, oneshot=True, level='peak', pan=0.35, send=0.4)
frame_drum = Instrument(MB + 'Frame Drum', 'drums', pitched=False, keep='HDrumL_Hit_', root=VCSL, oneshot=True, level='peak', pan=0.1, send=0.45)
snare = Instrument(MB + 'Snare Drum, Modern 1', 'drums', pitched=False, keep='HitNS', root=VCSL, oneshot=True, level='peak', pan=-0.1, send=0.4)
anvil = Instrument(ID + 'Anvil', 'metal', pitched=False, root=VCSL, oneshot=True, level='peak', pan=0.2, send=0.5)
clash = Instrument(ID + 'Clash Cymbals 1', 'metal', pitched=False, keep='cymbal_crash1_(ff|mf)', root=VCSL, oneshot=True, level='peak', send=0.5)
claves = Instrument('Percussion', 'clock', pitched=False, keep='^Claves1', oneshot=True, level='peak', pan=-0.3, send=0.35)
logdrum = Instrument('Percussion', 'clock', pitched=False, keep='^LogDrumHi', oneshot=True, level='peak', pan=0.3, send=0.35)
snare_roll = Instrument('Percussion', 'drums', pitched=False, keep='^Snare2-rollSN', release=0.3, send=0.4)
TIMP = {'Timpani1': 41.46, 'Timpani2': 53.56, 'Timpani5': 54.55, 'Timpani3': 56.29, 'Timpani4': 58.94}
timp = Instrument('Percussion/Timpani', 'drums', zones={k + '_Hit': v for k, v in TIMP.items()}, oneshot=True, level='peak', width=0.8, send=0.5)
timp_roll = Instrument('Percussion/Timpani/Rolls', 'drums', zones={k + '_Roll': v for k, v in TIMP.items()}, width=0.8, send=0.5, release=0.6)
gong = Instrument('Percussion', 'metal', keep='^gongHit', pitched=False, oneshot=True, level='peak', pan=0.2, send=0.55)
glock = Instrument('Percussion/Glock', 'bells', oneshot=True, level='peak', pan=0.3, width=0.5, send=0.55)
vln = Instrument(V + 'susVib', 'strings', pan=-0.45, width=0.8, send=0.42, release=0.4)
vln_trem = Instrument(V + 'Trem', 'strings', pan=-0.4, width=0.8, send=0.45, release=0.45)
vln_spic = Instrument(V + 'Spic', 'strings', oneshot=True, level='peak', pan=-0.45, width=0.8, send=0.35, release=0.1)
vla_spic = Instrument(VA + 'spic', 'strings', oneshot=True, level='peak', pan=-0.05, width=0.6, send=0.35, release=0.1)
vc = Instrument(VC + 'susvib', 'leads', pan=0.3, width=0.6, send=0.4, release=0.45)
vc_pad = Instrument(VC + 'susvib', 'strings', pan=0.3, width=0.6, send=0.4, release=0.45)
vc_trem = Instrument(VC + 'trem', 'strings', pan=0.3, width=0.6, send=0.42, release=0.45)
vc_spic = Instrument(VC + 'spic', 'strings', oneshot=True, level='peak', pan=0.3, width=0.6, send=0.33, release=0.1)
cb = Instrument('Strings/Solo Contrabass/SusVib', 'low', pan=0.45, width=0.5, send=0.32, release=0.5)
cb_spic = Instrument('Strings/Solo Contrabass/Spic', 'low', oneshot=True, level='peak', pan=0.45, width=0.5, send=0.3, release=0.12)
solo = Instrument('Strings/Solo Violin/Arco Vib', 'leads', octave=0, pan=0.12, width=0.35, send=0.45, release=0.4)
fl = Instrument('Woodwinds/Flute/expvib', 'leads', pan=-0.2, width=0.35, send=0.5, release=0.3)
hn = Instrument('Brass/F Horn/sus', 'brass', pan=-0.3, width=0.6, send=0.55, release=0.35)
tpt = Instrument('Brass/Trumpet/sus', 'brass', pan=0.15, width=0.5, send=0.5, release=0.3)
tbn = Instrument('Brass/Tenor Trombone/sus', 'brass', pan=0.35, width=0.5, send=0.5, release=0.35)
tuba = Instrument('Brass/Tuba/sus', 'low', pan=0.4, width=0.5, send=0.45, release=0.4)

M = Mix(SECS)

def note(inst, pitch, bar, beat, beats, vel=0.7, human=0.004, **kw):
    M.play(inst, pitch, at(bar, beat) + rng.uniform(-human, human), beats * BEAT, vel, **kw)

def line(inst, bar, notes, vel=0.7, legato=True, curve=None, **kw):
    for i, n in enumerate(notes):
        beat, pitch, d = n[:3]; v = n[3] if len(n) > 3 else vel
        nxt, prv = (notes[i + 1] if i + 1 < len(notes) else None), (notes[i - 1] if i else None)
        tie_next = legato and nxt is not None and abs(nxt[0] - beat - d) < 0.02
        tie_prev = legato and prv is not None and abs(prv[0] + prv[2] - beat) < 0.02
        note(inst, pitch, bar, beat, d, v, legato=tie_prev, release=0.14 if tie_next else None, curve=curve, **kw)

def chord(inst, bar, beat, pitches, beats, vel=0.5, curve=None, **kw):
    for p in pitches: note(inst, p, bar, beat, beats, vel, curve=curve, **kw)

def steps(inst, bar, pattern, vel=0.7, pitch=60, accent=(), human=0.003, **kw):
    """A 16-step bar: 'X' loud, 'x' normal, '.' rest; accented steps a little louder."""
    for k, c in enumerate(pattern):
        if c == '.': continue
        v = vel * (1.15 if c == 'X' or k in accent else 0.85)
        note(inst, pitch, bar, k / 4, 0.25, min(1.0, v), human=human, **kw)

# ---- synthesized sound design --------------------------------------------------------------------------------
def env(n, a, r):
    e = np.ones(n); ai, ri = int(a * SR), int(r * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if ri: e[-ri:] *= np.linspace(1, 0, ri) ** 2
    return e

def sweep_filter(x, f0, f1, kind='low', curve=None):
    """Time-varying 2nd-order filter, block-wise with state carried; cutoff moves f0->f1 (or along curve(u))."""
    out = np.zeros_like(x); step = 256; zi = np.zeros((1, 2))
    for s in range(0, len(x), step):
        u = s / len(x); fc = curve(u) if curve else f0 * (f1 / f0) ** u
        sos = butter(2, min(max(fc, 20), SR / 2.2), kind, fs=SR, output='sos')
        out[s:s + step], zi = sosfilt(sos, x[s:s + step], zi=zi)
    return out

def braam(dur=3.2, root=36.71, bright=1.0):
    """The trailer horn: detuned saws an octave apart, a filter that blares open and closes, soft-clipped."""
    t = np.arange(int(dur * SR)) / SR; x = np.zeros_like(t)
    for mult, amp in ((1, 1.0), (2, 0.8), (3, 0.45), (4, 0.35), (1.5, 0.3)):
        for det in (-0.12, 0.0, 0.11):
            f = root * mult * 2 ** (det / 12)
            x += amp * (2 * ((t * f + rng.random()) % 1) - 1)
    x = sweep_filter(x, 0, 0, curve=lambda u: 160 + 2400 * bright * np.exp(-((u * dur - 0.12) / 0.5) ** 2) + 260 * (1 - u))
    x = np.tanh(1.8 * x / np.max(np.abs(x)))
    return x * env(len(t), 0.03, dur * 0.6) * np.exp(-t * 0.35)

def boom(dur=2.4, f0=70, f1=30):
    t = np.arange(int(dur * SR)) / SR
    return np.sin(2 * np.pi * (f1 * t + (f0 - f1) * (1 - np.exp(-t * 4)) / 4)) * np.exp(-t * 1.5) * np.minimum(1, t / 0.003)

def heartbeat():
    out = np.zeros(int(0.8 * SR))
    for k, (dt, a) in enumerate(((0.0, 1.0), (0.3, 0.7))):
        b = boom(0.35, 70, 38) * a; i = int(dt * SR); out[i:i + len(b)] += b
    return lp(out, 160)

def shepard(dur, up=True, base=55.0):
    """An endless rise: octave-spaced sines gliding up together under a fixed bell-shaped spectral envelope."""
    t = np.arange(int(dur * SR)) / SR; x = np.zeros_like(t); rate = 1.0 / dur
    for k in range(8):
        pos = (k + (rate * t if up else -rate * t)) % 8                      # position in octaves
        f = base * 2 ** pos; amp = np.exp(-((pos - 4) / 1.6) ** 2)
        x += amp * np.sin(2 * np.pi * np.cumsum(f) / SR)
    return x / 4 * np.linspace(0.2, 1, len(t)) ** 1.5

def noise_sweep(dur, f0, f1, shape):
    x = rng.standard_normal(int(dur * SR))
    return sweep_filter(x, f0, f1, 'low') * shape(np.linspace(0, 1, len(x)))

def slash():
    """A blade cutting the air: a hissing sweep high to low, very fast, with a bright edge."""
    a = noise_sweep(0.32, 9000, 900, lambda u: np.sin(np.pi * np.minimum(1, u * 1.6)) ** 2)
    return hp(a, 600)

def shing(f=2350.0):
    t = np.arange(int(1.4 * SR)) / SR
    x = sum(a * np.sin(2 * np.pi * f * m * t + m) * np.exp(-t / d) for m, a, d in ((1, 0.5, 0.6), (1.51, 0.35, 0.4), (2.37, 0.25, 0.25), (3.9, 0.15, 0.12)))
    return x * np.minimum(1, t / 0.002)

def whirr(dur):
    """Tape rewinding: a reedy tone gliding up with flutter, plus hiss."""
    t = np.arange(int(dur * SR)) / SR
    f = 70 * (1500 / 70) ** (t / dur) * (1 + 0.02 * np.sin(2 * np.pi * 13 * t))
    tone = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.25
    return (lp(tone, 3000) + hp(rng.standard_normal(len(t)), 3000) * 0.12) * np.linspace(0.3, 1, len(t))

def ignite():
    """Fire catching: a roaring low whoosh that opens up, with crackle."""
    n = int(2.2 * SR); u = np.linspace(0, 1, n)
    roar = sweep_filter(rng.standard_normal(n), 0, 0, curve=lambda v: 200 + 3800 * np.exp(-((v - 0.15) / 0.2) ** 2) + 300 * v)
    crack = hp(rng.standard_normal(n) * (rng.random(n) < 0.004), 2000) * 6
    return (roar * np.exp(-u * 2.2) * np.minimum(1, u * 40) + crack * np.exp(-u * 1.5))

def shatter():
    out = np.zeros(int(1.6 * SR))
    for k in range(70):
        i = int(rng.uniform(0, 0.5) * SR); d = int(rng.uniform(0.02, 0.12) * SR)
        g = hp(rng.standard_normal(d), rng.uniform(2500, 7000)) * np.exp(-np.arange(d) / SR * rng.uniform(25, 60))
        out[i:i + d] += g * rng.uniform(0.2, 0.8)
    t = np.arange(len(out)) / SR
    pings = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * r) * 0.12 for f, r in ((3120, 4), (4470, 5), (5980, 6), (7340, 8)))
    return out + pings

def put(sig, t, stem='fx', pan=0.0, gain=0.0, send=0.35, width=1.0):
    M.put(stem, sig, t, pan, width, send, db(gain))

def backwards(sig, t_end, stem='fx', pan=0.0, gain=0.0, send=0.4):
    if sig.ndim == 1: sig = np.stack([sig, sig])
    M.put(stem, sig[:, ::-1].copy(), t_end - sig.shape[1] / SR, pan, 1.0, send, db(gain))

def big_hit(t, size=1.0, gong_too=True, timp_note='D2'):
    M.play(bd2, 60, t, 4, 0.75 + 0.25 * size); M.play(timp, timp_note, t, 4, 0.8 + 0.2 * size)
    M.play(clash, 60, t, 5, 0.7 + 0.3 * size)
    if gong_too: M.play(gong, 60, t + 0.01, 7, 0.95)
    put(boom(), t, 'fx', 0, -6 + 4 * size, 0.15)

# ---- Act I: the end --------------------------------------------------------------------------------------------
def act_one():
    for b in range(4):                                          # a heartbeat under the first bars
        put(heartbeat(), at(b), 'fx', 0, -8 - 2 * b, 0.1)
    note(piano, 'D2', 0, 0, 8, 0.6, human=0); note(piano, 'D3', 0, 0, 8, 0.45, human=0)
    note(vc_trem, 'D2', 0, 2, 14, 0.38, curve=[(0, 0), (0.5, 0.6), (1, 1)])
    note(pedal, 'D1', 1, 0, 12, 0.4, curve=[(0, 0), (0.4, 0.5), (1, 0.9)])
    note(cb, 'D2', 1, 0, 12, 0.35, curve=[(0, 0), (1, 1)])
    for i, f in enumerate(SYNC['ticks']):                       # the clock of fate: tick, tock
        late = f >= 400
        M.play(claves if i % 2 == 0 else logdrum, 60, fr(f), 1.5, 0.55 if not late else 0.4, gain=-4 if i % 2 else -2)
    for bar, beat, p, v in ((1, 0, 'A3', 0.55), (2, 0, 'D4', 0.6), (3, 0, 'E4', 0.58), (3, 2, 'F4', 0.66)):   # the motif, note by note
        note(piano, p, bar, beat, 8, v, human=0)
        note(piano, p[:-1] + str(int(p[-1]) + 1), bar, beat + 0.02, 8, v * 0.45, human=0)
    for f in SYNC['knells']:                                    # death knells
        M.play(bells, 'D3', fr(f), 10, 0.85); M.play(piano, 'D1', fr(f), 8, 0.5)
    chord(vln_trem, 2, 0, ['A4', 'D5'], 8, 0.22, curve=[(0, 0), (0.6, 0.6), (1, 1)])
    # bar 4: the demon god — the first braam, and a dark cluster that stays under it
    t = fr(SYNC['braams'][0]); big_hit(t, 0.8)
    put(braam(3.6, 36.71), t, 'braam', 0, -3, 0.25); put(braam(3.6, 73.42, 0.7), t + 0.01, 'braam', 0, -8, 0.25)
    chord(tbn, 4, 0, ['D2', 'A2', 'D3'], 3.5, 0.95, curve=[(0, 1), (0.5, 0.6), (1, 0.35)])
    chord(tuba, 4, 0, ['D2'], 3.5, 0.9, curve=[(0, 1), (1, 0.4)]); chord(hn, 4, 0, ['D3', 'F3', 'A3'], 3.5, 0.85, curve=[(0, 1), (0.5, 0.6), (1, 0.3)])
    note(pedal, 'D1', 4, 0, 4, 0.9, curve=[(0, 1), (1, 0.4)]); chord(organ, 4, 0, ['D2', 'A2', 'D3', 'F3', 'Eb3'], 4, 0.75, curve=[(0, 1), (1, 0.35)])
    chord(organ_q, 5, 0, ['D3', 'A3', 'Eb4'], 4, 0.45, curve=[(0, 0.6), (1, 0)])
    # bar 5: a soul's light; the clock slows and stops; then everything is drawn backwards
    M.play(glock, 'A6', fr(SYNC['soul']), 4, 0.5); M.play(piano, 'A5', fr(SYNC['soul']), 6, 0.42); M.play(piano, 'D6', fr(SYNC['soul']) + 0.02, 6, 0.3)
    chord(vln_trem, 5, 0, ['A5'], 3.6, 0.3, curve=[(0, 0), (0.5, 0.7), (1, 0.2)])
    backwards(clash.render(60, 4.0, 0.9), at(6) - 0.02, 'fx', 0, -9)
    backwards(piano.render('D5', 3.5, 0.7), at(6) - 0.03, 'piano', 0.2, -6)

# ---- Act II: rewind, the four, the gathering -------------------------------------------------------------------
GROOVE = {'bd2': 'X..x..x.X..x..x.', 'tom_l': '..x..x....x..x..', 'tom_h': '.x..x..x.x..x..x', 'frame': '....X.......X...', 'snare': '....X.......X..x'}
CHORDS = {'Dm': ('D2', ['D3', 'F3', 'A3', 'F3']), 'Bb': ('Bb1', ['Bb2', 'D3', 'F3', 'D3']), 'Gm': ('G1', ['G2', 'Bb2', 'D3', 'Bb2']),
          'F': ('F1', ['F2', 'A2', 'C3', 'A2']), 'A': ('A1', ['A2', 'C#3', 'E3', 'C#3']), 'C': ('C2', ['C3', 'E3', 'G3', 'E3']), 'D': ('D2', ['D3', 'F#3', 'A3', 'F#3'])}

def groove(bar, vel=0.75, parts=('bd2', 'tom_l', 'tom_h', 'frame', 'snare')):
    inst = {'bd2': bd2, 'tom_l': tom_l, 'tom_h': tom_h, 'frame': frame_drum, 'snare': snare}
    for k in parts: steps(inst[k], bar, GROOVE[k], vel * (1.0 if k in ('bd2', 'frame') else 0.8))
    note(timp, 'D2', bar, 0, 3, vel)

def ostinato(bar, c1, c2, vel=0.55, cellos=True):
    for half, c in enumerate((c1, c2)):
        root, tones = CHORDS[c]
        for k in range(8):
            b = half * 2 + k * 0.25
            if cellos: note(vc_spic, tones[k % 4], bar, b, 0.25, vel + (0.12 if k % 4 == 0 else 0))
            note(vla_spic, tones[(k + 2) % 4][:-1] + str(int(tones[(k + 2) % 4][-1]) + 1), bar, b, 0.25, vel - 0.08)
        for k in range(4): note(cb_spic, root, bar, half * 2 + k * 0.5, 0.5, vel + 0.05)

def act_two():
    # bar 6: rewind — Act I itself, reversed and three times as fast
    a, b = int(at(1) * SR), int(at(4) * SR)
    tape = sum(M.stems[k][:, a:b] for k in ('piano', 'bells', 'clock', 'strings') if k in M.stems)
    fast = resample_poly(tape, 1, 3, axis=1)[:, ::-1].copy()
    fast *= np.linspace(0.3, 1.0, fast.shape[1]) ** 1.5
    put(fast, at(6), 'fx', 0, 1, 0.4)
    put(whirr(BAR), at(6), 'fx', 0, -12, 0.2)
    put(shepard(BAR, True, 40), at(6), 'fx', 0, -10, 0.3)
    note(snare_roll, 60, 6, 2, 2, 0.75, curve=[(0, 0.1), (1, 1)])
    backwards(clash.render(60, 3.0, 1.0), at(7) - 0.01, 'fx', 0, -6)
    # bars 7-10: the drop; each protagonist cuts in with a slash on the downbeat
    heroes = [('Dm', 'Bb'), ('Gm', 'Dm'), ('Bb', 'F'), ('Gm', 'A')]
    for i, (c1, c2) in enumerate(heroes):
        bar = 7 + i; t = at(bar)
        big_hit(t, 0.75 if i else 0.95, gong_too=(i == 0))
        put(slash(), t - 0.06, 'fx', -0.4 + 0.25 * i, -3, 0.3); put(shing(2350 + 180 * i), t, 'metal', 0.3, -12, 0.5)
        M.play(anvil, 60, t, 2, 0.6 + 0.1 * i, gain=-6)
        put(noise_sweep(0.45, 400, 6000, lambda u: u ** 2), t - 0.45, 'fx', 0, -16, 0.2)       # the cut-in rushing in
        groove(bar, 0.72 + 0.04 * i)
        ostinato(bar, c1, c2, 0.5 + 0.03 * i, cellos=(i != 1))
        chord(hn, bar, 0, ['D3', 'F3'] if c1 in ('Dm', 'Bb') else ['D3', 'G3'], 2, 0.4); chord(hn, bar, 2, ['D3', 'F3'] if c2 != 'A' else ['C#3', 'E3'], 2, 0.42)
    line(fl, 7, [(0, 'A5', 0.5), (0.5, 'D6', 0.5), (1, 'E6', 0.25), (1.25, 'F6', 0.25), (1.5, 'G6', 0.5), (2, 'F6', 1), (3, 'D6', 0.5), (3.5, 'C6', 0.5)], 0.85)
    line(vc, 8, [(0, 'D3', 1), (1, 'G3', 0.75), (1.75, 'A3', 0.25), (2, 'Bb3', 1), (3, 'A3', 1)], 0.92)
    queen = [(0, 'F3', 0.75), (0.75, 'F3', 0.25), (1, 'Bb3', 0.75), (1.75, 'C4', 0.25), (2, 'D4', 1), (3, 'C4', 0.5), (3.5, 'A3', 0.5)]
    line(hn, 9, queen, 0.95, legato=False); line(tpt, 9, [(b, p[:-1] + str(int(p[-1]) + 1), d) for b, p, d in queen], 0.55, legato=False)
    line(solo, 10, [(0, 'D5', 0.5), (0.5, 'G5', 0.5), (1, 'A5', 0.25), (1.25, 'Bb5', 0.75), (2, 'C#6', 1), (3, 'D6', 0.25), (3.25, 'E6', 0.75)], 0.95)
    # bar 11: stop-time — one hit, a held chord, then the toms run into the strobe
    t = fr(SYNC['rewrite']); big_hit(t, 1.0, gong_too=False)
    chord(tbn, 11, 0, ['D2', 'A2', 'D3'], 1.2, 0.95); chord(hn, 11, 0, ['D3', 'F3', 'A3'], 1.2, 0.9); chord(tpt, 11, 0, ['D4', 'F4', 'A4'], 1.0, 0.85)
    chord(vln_trem, 11, 0, ['D5', 'F5', 'A5'], 3, 0.55); chord(vc_trem, 11, 0, ['D2', 'A2'], 3, 0.6); note(cb, 'D2', 11, 0, 3, 0.6)
    for k in range(8):
        note(tom_l if k % 2 else tom_h, 60, 11, 3 + k * 0.125, 0.125, 0.55 + 0.05 * k)
    # bar 12: the companions strobe on sixteenths
    groove(12, 0.85); ostinato(12, 'Bb', 'C', 0.6)
    for k in range(16):
        put(lp(hp(rng.standard_normal(int(0.03 * SR)), 2500), 9000) * np.exp(-np.arange(int(0.03 * SR)) / SR * 120), at(12, k / 4), 'fx', (-1) ** k * 0.4, -18, 0.15)
        if k % 2 == 0: M.play(glock, ['D6', 'F6', 'A6', 'D7'][(k // 2) % 4], at(12, k / 4), 1.5, 0.3)
    line(vln, 12, [(0, 'D5', 1), (1, 'F5', 1), (2, 'G5', 1), (3, 'E5', 1)], 0.7)
    chord(hn, 12, 0, ['D3', 'F3'], 2, 0.55); chord(hn, 12, 2, ['C3', 'E3', 'G3'], 2, 0.6)
    # bar 13: the battlefield — sword, lance, axe clash on the beats; then a level-up chime
    groove(13, 0.85); ostinato(13, 'Dm', 'Bb', 0.62)
    for i, f in enumerate(SYNC['clashes']):
        M.play(anvil, 60, fr(f), 2, 0.8 + 0.05 * i); put(shing(1900 + 400 * i), fr(f), 'metal', (-0.4, 0.4, 0)[i], -10, 0.45)
        put(slash(), fr(f) - 0.08, 'fx', (-0.4, 0.4, 0)[i], -8, 0.3)
    for k, p in enumerate(['D6', 'F6', 'A6', 'D7', 'F7', 'A7']):
        M.play(glock, p, fr(SYNC['levelup']) + k * STEP * 0.66, 2.5, 0.55)
    line(vln, 13, [(0, 'A5', 2), (2, 'F5', 2)], 0.72)
    # bar 14: the build — snare roll, timpani roll, rising strings and brass on the dominant, an endless riser
    note(snare_roll, 60, 14, 0, 4, 0.8, curve=[(0, 0.25), (1, 1)]); note(timp_roll, 'A2', 14, 0, 4, 0.85, curve=[(0, 0.2), (1, 1)])
    steps(bd2, 14, 'X.x.X.x.XxXxXXXX', 0.8)
    run = ['A4', 'Bb4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'Bb5', 'C#6', 'D6', 'E6', 'F6', 'G6', 'A6', 'Bb6']
    line(vln, 14, [(k * 0.25, p, 0.25) for k, p in enumerate(run[:11])], 0.8, legato=False)          # the section to D6, the soloist to the top
    line(solo, 14, [(k * 0.25, p, 0.25) for k, p in enumerate(run)], 0.85, legato=False)
    chord(hn, 14, 0, ['A2', 'E3', 'A3', 'C#4'], 4, 0.6, curve=[(0, 0.4), (1, 1)]); chord(tbn, 14, 0, ['A1', 'E2', 'A2'], 4, 0.6, curve=[(0, 0.4), (1, 1)])
    chord(tpt, 14, 2, ['A4', 'C#5', 'E5'], 2, 0.7, curve=[(0, 0.5), (1, 1)]); note(cb, 'A1', 14, 0, 4, 0.7, curve=[(0, 0.5), (1, 1)])
    put(shepard(BAR, True, 55), at(14), 'fx', 0, -7, 0.3)
    swell = load(str(VCSL / ID / 'Suspended Cymbal 2' / 'susCymb2_cresc_2.5s2.wav'), 'peak')
    e = np.convolve(np.abs(swell).mean(0), np.ones(2400) / 2400, mode='same'); top = int(np.argmax(e))
    put(swell[:, :top], fr(SYNC['silence']) - top / SR, 'metal', 0, -2, 0.4)

# ---- the silence, and Act III ----------------------------------------------------------------------------------
def act_three():
    s0 = fr(SYNC['silence'])
    put(heartbeat(), s0 + 0.08, 'fx', 0, -6, 0.05); put(heartbeat(), s0 + 0.08 + BEAT * 2, 'fx', 0, -9, 0.05)
    put(lp(hp(rng.standard_normal(int(0.9 * SR)), 300), 2500) * np.sin(np.linspace(0, np.pi, int(0.9 * SR))) ** 2, s0 + BEAT * 1.2, 'fx', 0, -30, 0.1)   # a breath
    t = fr(SYNC['ignite'])
    backwards(clash.render(60, 1.3, 1.0), t - 0.01, 'fx', 0, -4)
    backwards(braam(1.1, 36.71, 0.6), t - 0.02, 'braam', 0, -12, 0.2)
    # the second braam: bigger, with the organ, and fire catching
    big_hit(t, 1.0)
    put(braam(4.2, 36.71, 1.1), t, 'braam', 0, 0, 0.25); put(braam(4.2, 73.42, 0.9), t + 0.01, 'braam', 0, -5, 0.25)
    put(ignite(), t, 'fx', 0, -4, 0.3)
    melody = {16: [(0, 'A4', 1), (1, 'D5', 1), (2, 'E5', 1), (3, 'F5', 1)], 17: [(0, 'F5', 2), (2, 'D5', 2)],
              18: [(0, 'G5', 1.5), (1.5, 'F5', 0.5), (2, 'E5', 2)], 19: [(0, 'F5', 2), (2, 'E5', 2)]}
    prog = {16: ('Dm', 'Dm'), 17: ('Bb', 'Bb'), 18: ('Gm', 'A'), 19: ('Bb', 'C')}
    ORG = {'Dm': ['D3', 'F3', 'A3', 'D4'], 'Bb': ['Bb2', 'D3', 'F3', 'Bb3'], 'Gm': ['G2', 'Bb2', 'D3', 'G3'], 'A': ['A2', 'C#3', 'E3', 'A3'], 'C': ['C3', 'E3', 'G3', 'C4']}
    for bar in range(16, 20):
        c1, c2 = prog[bar]
        line(tpt, bar, melody[bar], 0.95, legato=False); line(vln, bar, melody[bar], 0.85, legato=False)
        line(solo, bar, [(b, p[:-1] + str(int(p[-1]) + 1), d) for b, p, d in melody[bar]], 0.8, legato=False)
        for half, c in enumerate((c1, c2)):
            root = CHORDS[c][0]
            chord(organ, bar, half * 2, ORG[c], 2, 0.85); note(pedal, root[:-1] + str(int(root[-1]) - 1) if int(root[-1]) > 1 else root, bar, half * 2, 2, 0.85)
            chord(tbn, bar, half * 2, [ORG[c][0][:-1] + str(int(ORG[c][0][-1]) - 1), ORG[c][0]], 2, 0.85); note(tuba, root, bar, half * 2, 2, 0.85)
            chord(hn, bar, half * 2, ORG[c][1:3], 2, 0.88)                                  # horns in their sampled range
        ostinato(bar, c1, c2, 0.68)
        for beat in (0, 2):
            M.play(bd2, 60, at(bar, beat), 4, 0.95 if beat == 0 else 0.85); M.play(timp, 'D2' if beat == 0 else 'A2', at(bar, beat), 4, 0.95)
        note(snare, 60, bar, 2, 0.5, 0.85); note(frame_drum, 60, bar, 2, 0.5, 0.8)
        for k in range(4): note(tom_l if k % 2 else tom_h, 60, bar, 3.5 + k * 0.125, 0.125, 0.6 + 0.08 * k)
        if bar > 16: M.play(clash, 60, at(bar), 4, 0.75)
    line(fl, 18, [(0, 'G6', 0.25), (0.25, 'A6', 0.25), (0.5, 'Bb6', 0.5), (1, 'A6', 1), (2, 'E6', 0.5), (2.5, 'C#6', 0.5), (3, 'E6', 1)], 0.8)
    line(solo, 19, [(0, 'D6', 0.5), (0.5, 'F6', 0.5), (1, 'Bb6', 1), (2, 'C7', 1), (3, 'E6', 0.5), (3.5, 'G6', 0.5)], 0.95)
    # the black sun shatters; D major
    put(shatter(), fr(SYNC['shatter']), 'fx', 0, -6, 0.5)
    backwards(clash.render(60, 2.0, 1.0), fr(SYNC['major']) - 0.01, 'fx', 0, -8)
    t = fr(SYNC['major']); big_hit(t, 1.0)
    fade = [(0, 1), (0.3, 0.7), (1, 0.12)]
    chord(organ, 20, 0, ['D3', 'F#3', 'A3', 'D4', 'F#4', 'A4'], 8, 0.9, curve=fade); note(pedal, 'D1', 20, 0, 8, 0.9, curve=fade)
    chord(tpt, 20, 0, ['A4', 'D5', 'F#5'], 5, 0.95, curve=fade); chord(hn, 20, 0, ['D3', 'F#3', 'A3'], 6, 0.9, curve=fade)
    chord(tbn, 20, 0, ['D2', 'A2', 'D3'], 6, 0.9, curve=fade); note(tuba, 'D2', 20, 0, 6, 0.9, curve=fade)
    chord(vln_trem, 20, 0, ['F#5', 'A5', 'D6'], 7, 0.75, curve=fade); chord(vc_trem, 20, 0, ['D2', 'A2'], 7, 0.75, curve=fade); note(cb, 'D2', 20, 0, 7, 0.75, curve=fade)
    note(timp_roll, 'D2', 20, 0.5, 5, 0.8, curve=[(0, 1), (1, 0.05)])
    for p, v in (('D3', 0.95), ('D4', 0.8), ('A3', 0.6)): M.play(bells, p, t + 0.02, 12, v)
    # coda: the piano, the motif in major
    for f, p in zip(SYNC['coda'], ['A4', 'D5', 'E5', 'F#5']): M.play(piano, p, fr(f), 6, 0.52)
    for p in ('D4', 'F#4', 'A4', 'D5'): M.play(piano, p, fr(SYNC['coda'][-1]), 6, 0.42)
    chord(vln, 21, 0, ['F#5', 'A5', 'D6'], 6, 0.22, curve=[(0, 0.4), (0.3, 1), (1, 0)])

# ---- mix --------------------------------------------------------------------------------------------------------
STEM_GAIN = {'piano': 3, 'organ': -2, 'bells': 1, 'drums': 0, 'metal': -2, 'clock': -3, 'strings': -1, 'leads': 3, 'brass': 0,
             'low': 0, 'braam': -2, 'fx': 0}

def compress(x, threshold=-10, ratio=2.2, attack=0.008, release=0.22):
    lvl = np.maximum(np.abs(x[0]), np.abs(x[1]))
    a, r = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    env_ = np.maximum(lfilter([1 - r], [1, -r], lvl), lfilter([1 - a], [1, -a], lvl))
    over = 20 * np.log10(np.maximum(env_, 1e-9)) - threshold
    return x * db(-np.maximum(over, 0) * (1 - 1 / ratio))

def render():
    act_one(); act_two(); act_three()
    ir = hall(3.6, seed=31)
    # The silence is real silence: every stem but the heartbeat, the breath and the reverse swells (fx, braam) is
    # cut at the stop, and so is the hall, until the hit.
    gate = np.ones(M.n, np.float32); s0, s1 = int(fr(SYNC['silence']) * SR), int((fr(SYNC['ignite']) - 0.05) * SR)
    gate[s0:s1] = 0.0; gate = np.convolve(gate, np.ones(480) / 480, mode='same').astype(np.float32)
    keep = ('fx', 'braam')
    stems = {k: v * db(STEM_GAIN.get(k, 0)) * (1 if k in keep else gate) for k, v in M.stems.items()}
    wet = reverb(sum(M.sends[k] * db(STEM_GAIN.get(k, 0)) * (1 if k in keep else gate) for k in M.stems), ir) * gate
    mix = sum(stems.values()) + wet * 0.55
    mix = np.stack([hp(mix[0], 26), hp(mix[1], 26)])
    n = int(SECS * SR); mix = mix[:, :n]; f = int(1.0 * SR); mix[:, -f:] *= np.linspace(1, 0, f) ** 1.5
    return compress(mix), stems

def write(path, x):
    peak = float(np.max(np.abs(x))); x = x / peak * 0.89 if peak > 0.89 else x
    from scipy.io import wavfile
    wavfile.write(path, SR, (np.clip(x.T, -1, 1) * 32767).astype('<i2'))

def loudnorm(src, dst, target=-14):
    meter = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(src), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    measured = float(meter.rsplit('I:', 1)[1].split('LUFS')[0])
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(src), '-af',
                    f'volume={target - measured:.2f}dB,alimiter=limit=0.78:level=false:attack=3:release=70', '-ar', str(SR), str(dst)], check=True)

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    mix, stems = render()
    if '--stems' in sys.argv:
        secs = [('end', 0, 6), ('drop', 7, 11), ('gather', 11, 15), ('burn', 16, 20), ('coda', 20, 22)]
        for k, v in sorted(stems.items()):
            print(f'{k:8s}', ' '.join(f'{name}:{lufs_ish(v[:, int(at(a) * SR):int(at(b) * SR)]):6.1f}' for name, a, b in secs))
    write(OUT / 'concept-music.wav', mix)
    loudnorm(OUT / 'concept-music.wav', OUT / 'concept-mix.wav')
    print('concept score written', f'{mix.shape[1] / SR:.2f}s')
