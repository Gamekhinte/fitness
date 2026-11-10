# Baut das Gymlimpix-Icon: goldener Lorbeerkranz auf leuchtend blauem Grund.
# Aufruf: python archiv/icon_gymlimpix.py  -> schreibt icon.svg, icon-kranz.svg (ohne Hintergrund)
import math, os

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
C = (512, 530)
R = 292
TINTE = "#1B2233"
GOLD = "#F2C14E"
GOLD_HELL = "#FFE08A"

def blatt(x, y, winkel, laenge, breite):
    # spitzes Blatt, Spitze zeigt in Richtung winkel
    a = math.radians(winkel)
    dx, dy = math.cos(a), math.sin(a)
    nx, ny = -dy, dx
    sx, sy = x + dx * laenge, y + dy * laenge
    mx, my = x + dx * laenge * 0.5, y + dy * laenge * 0.5
    c1 = (mx + nx * breite, my + ny * breite)
    c2 = (mx - nx * breite, my - ny * breite)
    mitte = f'<path d="M{x:.1f} {y:.1f} L{x + dx * laenge * .78:.1f} {y + dy * laenge * .78:.1f}" stroke="{TINTE}" stroke-width="5" stroke-linecap="round" opacity=".55"/>'
    return (f'<path d="M{x:.1f} {y:.1f} Q{c1[0]:.1f} {c1[1]:.1f} {sx:.1f} {sy:.1f} Q{c2[0]:.1f} {c2[1]:.1f} {x:.1f} {y:.1f} Z" '
            f'fill="{GOLD}" stroke="{TINTE}" stroke-width="12" stroke-linejoin="round"/>' + mitte)

def zweig(seite):
    # seite = -1 links, +1 rechts. Startet unten, läuft nach oben
    teile = []
    start, ende = 100, 245          # Grad (y nach unten), links
    n = 8
    pfad = []
    for i in range(n + 1):
        t = math.radians(start + (ende - start) * i / n)
        pfad.append((C[0] + R * math.cos(t), C[1] + R * math.sin(t)))
    if seite > 0:
        pfad = [(2 * C[0] - x, y) for x, y in pfad]
    d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pfad)
    teile.append(f'<path d="{d}" fill="none" stroke="{TINTE}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>')
    teile.append(f'<path d="{d}" fill="none" stroke="{GOLD}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>')
    for i in range(n):
        t = math.radians(start + (ende - start) * (i + 0.5) / n)
        x, y = C[0] + R * math.cos(t), C[1] + R * math.sin(t)
        tang = math.degrees(t) + 90          # Richtung nach oben am Bogen
        if seite > 0:
            x = 2 * C[0] - x
            tang = 180 - tang
        groesse = 1 - i * 0.045
        L, B = 118 * groesse, 44 * groesse
        aussen = tang - 38 * seite * -1 if seite < 0 else tang + 38 * -1
        innen = tang + 38 if seite < 0 else tang - 38 * -1
        # außen und innen je ein Blatt
        teile.append(blatt(x, y, tang - 40 if seite < 0 else tang + 40, L, B))
        teile.append(blatt(x, y, tang + 34 if seite < 0 else tang - 34, L * 0.9, B * 0.9))
    # Endblatt oben
    t = math.radians(ende)
    x, y = C[0] + R * math.cos(t), C[1] + R * math.sin(t)
    tang = math.degrees(t) + 90
    if seite > 0:
        x = 2 * C[0] - x
        tang = 180 - tang
    teile.append(blatt(x, y, tang, 104, 40))
    return "".join(teile)

def kranz():
    band = (f'<path d="M{C[0]-70} {C[1]+R+8} Q{C[0]} {C[1]+R-40} {C[0]+70} {C[1]+R+8}" fill="none" stroke="{TINTE}" stroke-width="30" stroke-linecap="round"/>'
            f'<path d="M{C[0]-70} {C[1]+R+8} Q{C[0]} {C[1]+R-40} {C[0]+70} {C[1]+R+8}" fill="none" stroke="{GOLD_HELL}" stroke-width="14" stroke-linecap="round"/>'
            f'<circle cx="{C[0]}" cy="{C[1]+R-14}" r="26" fill="{GOLD}" stroke="{TINTE}" stroke-width="12"/>')
    return zweig(-1) + zweig(1) + band

def svg(mit_grund=True):
    grund = ""
    if mit_grund:
        grund = f'''<defs>
  <radialGradient id="leucht" cx="50%" cy="50%" r="72%">
    <stop offset="0" stop-color="#7FE3FF"/>
    <stop offset=".38" stop-color="#2F9BFF"/>
    <stop offset="1" stop-color="#0B2A7A"/>
  </radialGradient>
  <filter id="schein" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
</defs>
<rect width="1024" height="1024" fill="url(#leucht)"/>
<circle cx="{C[0]}" cy="{C[1]}" r="300" fill="#BFF3FF" opacity=".45" filter="url(#schein)"/>'''
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{grund}<g>{kranz()}</g></svg>'

open(os.path.join(REPO, "icon.svg"), "w", encoding="utf-8").write(svg(True))
open(os.path.join(REPO, "icon-kranz.svg"), "w", encoding="utf-8").write(svg(False).replace('viewBox="0 0 1024 1024"', 'viewBox="160 180 704 720"'))
print("ok")
