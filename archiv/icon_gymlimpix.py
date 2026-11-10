# Baut das Gymlimpix-Icon im Stil der App: dicke Tusche, harte Schatten, Gold, leuchtendes Blau.
# Großes G in der Mitte, darunter zwei kräftige Lorbeerzweige wie bei einer Siegermedaille.
# Aufruf: python archiv/icon_gymlimpix.py  -> icon.svg und icon-kranz.svg (ohne Hintergrund, für den Ladebildschirm)
import math, os

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
TINTE = "#1B2233"
GOLD, GOLD_D = "#F7C948", "#E0A12C"
SCHATTEN = 18           # harter Schatten nach unten
RAND = 16               # Tusche-Rand

def blatt(x, y, w, L, B):
    a = math.radians(w); dx, dy = math.cos(a), math.sin(a); nx, ny = -dy, dx
    sx, sy = x + dx * L, y + dy * L
    c1 = (x + dx * L * .42 + nx * B, y + dy * L * .42 + ny * B)
    c2 = (x + dx * L * .58 - nx * B * .85, y + dy * L * .58 - ny * B * .85)
    return f"M{x:.1f} {y:.1f} Q{c1[0]:.1f} {c1[1]:.1f} {sx:.1f} {sy:.1f} Q{c2[0]:.1f} {c2[1]:.1f} {x:.1f} {y:.1f}Z"

def zweig(seite):
    # Bogen von unten Mitte nach außen oben, 5 große Blätter
    cx, cy, R = 512, 470, 300
    start, ende, n = 96, 196, 5        # Grad, links
    stiel, blaetter = [], []
    for i in range(n + 1):
        t = math.radians(start + (ende - start) * i / n)
        x, y = cx + R * math.cos(t), cy + R * math.sin(t)
        stiel.append((x if seite < 0 else 2 * cx - x, y))
    for i in range(n):
        t = math.radians(start + (ende - start) * (i + .55) / n)
        x, y = cx + R * math.cos(t), cy + R * math.sin(t)
        tang = math.degrees(t) + 90
        if seite > 0: x = 2 * cx - x; tang = 180 - tang
        g = 1 - i * .06
        blaetter.append((blatt(x, y, tang - 42 * (-seite), 175 * g, 64 * g), GOLD))     # außen
        blaetter.append((blatt(x, y, tang + 30 * (-seite), 140 * g, 52 * g), GOLD_D))   # innen
    t = math.radians(ende); x, y = cx + R * math.cos(t), cy + R * math.sin(t); tang = math.degrees(t) + 90
    if seite > 0: x = 2 * cx - x; tang = 180 - tang
    blaetter.append((blatt(x, y, tang, 150, 56), GOLD))
    return "M" + " L".join(f"{a:.1f} {b:.1f}" for a, b in stiel), blaetter

def kranz(dy=0):
    teile = []
    for seite in (-1, 1):
        stiel, bl = zweig(seite)
        teile.append(("stiel", stiel))
        teile += [("blatt", d, f) for d, f in bl]
    def lage(farbe_override=None, rand=0, verschieb=0):
        out = [f'<g transform="translate(0 {verschieb + dy})">']
        for t in teile:
            if t[0] == "stiel":
                out.append(f'<path d="{t[1]}" fill="none" stroke="{farbe_override or TINTE if rand else farbe_override or GOLD_D}" stroke-width="{22 + rand * 2}" stroke-linecap="round" stroke-linejoin="round"/>')
            else:
                f = farbe_override or t[2]
                out.append(f'<path d="{t[1]}" fill="{f}" stroke="{farbe_override or TINTE}" stroke-width="{rand * 2 if rand else 0}" stroke-linejoin="round"/>')
        out.append("</g>")
        return "".join(out)
    # Schatten, dann Tusche-Rand, dann Farbe
    return lage("#0A2466", RAND, SCHATTEN) + lage(None, RAND) + lage(None, 0)

def G(dy=0):
    # dickes, rundes G aus Strichen: Bogen plus Querbalken nach innen
    cx, cy, r = 512, 455 + dy, 178
    p = lambda g: (cx + r * math.cos(math.radians(g)), cy + r * math.sin(math.radians(g)))
    (xa, ya), (xe, ye) = p(-42), p(8)
    # von rechts oben über oben, links und unten bis rechts Mitte, dann Balken nach innen
    bogen = f"M{xa:.1f} {ya:.1f} A{r} {r} 0 1 0 {xe:.1f} {ye:.1f} L{cx + 40:.1f} {ye:.1f}"
    w = 118
    def strich(farbe, breite, v=0):
        return f'<path d="{bogen}" transform="translate(0 {v})" fill="none" stroke="{farbe}" stroke-width="{breite}" stroke-linecap="round" stroke-linejoin="round"/>'
    return strich("#0A2466", w + RAND * 2, SCHATTEN) + strich(TINTE, w + RAND * 2) + strich("#FFFFFF", w) + \
        f'<path d="{bogen}" fill="none" stroke="#DDF3FF" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" transform="translate(-14 22) scale(1.0)" opacity="0"/>'

def svg(mit_grund=True):
    g = ""
    if mit_grund:
        g = '''<defs>
<radialGradient id="leucht" cx="50%" cy="44%" r="70%"><stop offset="0" stop-color="#8BE7FF"/><stop offset=".45" stop-color="#2E8CF0"/><stop offset="1" stop-color="#0A2E86"/></radialGradient>
<filter id="schein" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="46"/></filter></defs>
<rect width="1024" height="1024" fill="url(#leucht)"/>
<circle cx="512" cy="470" r="300" fill="#D6F7FF" opacity=".45" filter="url(#schein)"/>'''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{g}{kranz()}{G()}</svg>'

open(os.path.join(REPO, "icon.svg"), "w", encoding="utf-8").write(svg(True))
open(os.path.join(REPO, "icon-kranz.svg"), "w", encoding="utf-8").write(svg(False).replace('viewBox="0 0 1024 1024"', 'viewBox="150 170 724 700"'))
print("ok")
