"""Derive the dark theme from web/styles.css at build time.

Every declaration that carries a colour is mirrored under `:root[data-mode=dark]`, in source order and inside
the same media query, so the cascade resolves exactly as in the light theme. Only the values change:
light surfaces become dark ones (cards a little lighter than the page), dark text becomes light, and
accent fills (gold buttons, green marks) or parts that are already dark (heroes, header) keep their colours.
Root tokens and a few judgement calls live in web/dark.css, which is appended after this block.
"""
import math, re

SCOPE = ':root[data-mode=dark]'
FG = {'color', 'fill', 'stroke', 'caret-color', 'text-decoration-color', '-webkit-text-fill-color', 'accent-color'}
BG = {'background', 'background-color', 'background-image'}
LINE = re.compile(r'^(?:border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|box-shadow|text-shadow|column-rule(?:-color)?)$')
CUSTOM = {'--route-accent': 'fg', '--route-wash': 'bg'}  # other custom properties: dark.css or kept as is
COLOR = re.compile(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)|(?<![-\w])(?:white|black)(?![-\w])')

def _lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def _gam(c): return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055

def to_oklch(r, g, b):
    r, g, b = (_lin(v / 255) for v in (r, g, b))
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(a, bb), math.atan2(bb, a)

def from_oklch(L, C, h):
    for _ in range(40):  # shrink chroma until the colour fits in sRGB
        a, b = C * math.cos(h), C * math.sin(h)
        l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
        m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
        s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
        rgb = (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
               -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
               -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
        if all(-0.001 <= v <= 1.001 for v in rgb): break
        C *= 0.9
    return tuple(round(min(1, max(0, _gam(min(1, max(0, v))))) * 255) for v in rgb)

def parse(token):
    t = token.lower()
    if t == 'white': return (255, 255, 255, 1)
    if t == 'black': return (0, 0, 0, 1)
    if t.startswith('#'):
        h = t[1:]
        if len(h) == 3: h = ''.join(c * 2 for c in h)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16) / 255 if len(h) == 8 else 1)
    parts = [p.strip() for p in re.split(r'[,/\s]+', t[t.index('(') + 1:-1]) if p.strip()]
    rgb = [float(p[:-1]) * 2.55 if p.endswith('%') else float(p) for p in parts[:3]]
    a = float(parts[3][:-1]) / 100 if len(parts) > 3 and parts[3].endswith('%') else float(parts[3]) if len(parts) > 3 else 1
    return (*rgb, a)

def fmt(r, g, b, a):
    return f'#{r:02x}{g:02x}{b:02x}' if a >= 0.999 else f'rgba({r},{g},{b},{a:.3g})'

def is_accent(L, C): return C > 0.045 and 0.5 < L < 0.86

def transform(token, role):
    r, g, b, a = parse(token)
    L, C, h = to_oklch(r, g, b)
    if role == 'fg':
        if L >= 0.62: return token                     # already light text (dark heroes, white on fills)
        L2, C2 = 0.97 - L * 0.55, C * 1.1
    else:
        if L <= 0.5 or is_accent(L, C): return token   # dark parts and accent fills stay as designed
        spread = 1.1 if role == 'bg' else 1.6          # lines need a bit more separation than surfaces
        L2, C2 = min(0.45, 0.205 + abs(L - 0.965) * spread), min(C, 0.035) * 0.9
    return fmt(*from_oklch(L2, C2, h), a)

def role_of(prop):
    if prop in CUSTOM: return CUSTOM[prop]
    if prop.startswith('--'): return None
    if prop in FG: return 'fg'
    if prop in BG: return 'bg'
    if LINE.match(prop): return 'line'
    return None

def light_fill(decls, tokens):
    """True when the rule paints its own light accent fill, so its text colour must stay dark."""
    for prop, value in decls:
        if role_of(prop) == 'bg':
            value = re.sub(r'var\((--[\w-]+)[^)]*\)', lambda v: tokens.get(v[1], ''), value)
            for tok in COLOR.findall(value):
                r, g, b, _ = parse(tok)
                L, C, _h = to_oklch(r, g, b)
                if is_accent(L, C) or L > 0.62 and transform(tok, 'bg') == tok: return True
    return False

def scope(selectors):
    out = []
    for sel in selectors.split(','):
        sel = sel.strip()
        if sel.startswith(':root'): out.append(SCOPE + sel[5:])
        elif sel.startswith('html'): out.append(SCOPE.replace(':root', 'html') + sel[4:])
        else: out.append(f'{SCOPE} {sel}')
    return ','.join(out)

def dark_overrides(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    # Light values of colour variables (first definition), so `background:var(--route-gold)` can be judged too.
    tokens = {}
    for name, value in re.findall(r'(--[\w-]+):\s*([^;}]+)', css):
        if COLOR.fullmatch(value.strip()): tokens.setdefault(name, value.strip())
    out, media = [], None
    blocks = re.finditer(r'(@media[^{]*)\{|([^{}@]+)\{([^{}]*)\}|\}', css)
    for m in blocks:
        if m[1] is not None:
            media = m[1].strip()[6:].strip(); continue
        if m[2] is None:
            media = None; continue
        if media and 'print' in media: continue
        decls = [(d.split(':', 1)[0].strip().lower(), d.split(':', 1)[1].strip()) for d in m[3].split(';') if ':' in d]
        keep_text = light_fill(decls, tokens)
        mirrored = []
        # Every colour-bearing declaration is mirrored, even var()/keyword ones, so the dark copies keep the
        # light cascade intact (a mirrored hex from a weaker rule must not beat an un-mirrored var() rule).
        for prop, value in decls:
            role = role_of(prop)
            if not role: continue
            if 'color-mix' in value or not COLOR.search(value) or role == 'fg' and keep_text: mirrored.append(f'{prop}:{value}'); continue
            mirrored.append(f'{prop}:' + COLOR.sub(lambda t: transform(t[0], role), value))
        if mirrored: out.append((media, f'{scope(m[2].strip())}{{{";".join(mirrored)}}}'))
    # Same order as the source; consecutive rules under one condition share a wrapper. Print stays light.
    text, current = [], object()
    for cond, rule in out:
        if cond != current:
            if text: text.append('}')
            text.append(f'@media screen and {cond}{{' if cond else '@media screen{'); current = cond
        text.append(rule)
    return '\n'.join(text + ['}']) + '\n' if text else ''
