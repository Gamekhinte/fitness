# Baut 6 Icon-Varianten für Gymlimpix nach archiv/icon-varianten/
import math, os

HIER = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HIER, "icon-varianten")
os.makedirs(OUT, exist_ok=True)
C = (512, 520)

def blatt(x, y, winkel, L, B, farbe):
    a = math.radians(winkel); dx, dy = math.cos(a), math.sin(a); nx, ny = -dy, dx
    sx, sy = x + dx * L, y + dy * L
    # asymmetrisch: bauchiger auf einer Seite, wirkt natürlicher
    c1 = (x + dx * L * .45 + nx * B, y + dy * L * .45 + ny * B)
    c2 = (x + dx * L * .55 - nx * B * .8, y + dy * L * .55 - ny * B * .8)
    return f'<path d="M{x:.1f} {y:.1f} Q{c1[0]:.1f} {c1[1]:.1f} {sx:.1f} {sy:.1f} Q{c2[0]:.1f} {c2[1]:.1f} {x:.1f} {y:.1f}Z" fill="{farbe}"/>'

def kranz(R=330, n=7, L=165, B=62, aussen="#F7C948", innen="#E0A82E", stiel="#E0A82E", start=108, ende=250, schliessen=False, spitze=True):
    t = []
    for seite in (-1, 1):
        pts = []
        for i in range(n + 1):
            w = math.radians(start + (ende - start) * i / n)
            x, y = C[0] + R * math.cos(w), C[1] + R * math.sin(w)
            if seite > 0: x = 2 * C[0] - x
            pts.append((x, y))
        d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
        t.append(f'<path d="{d}" fill="none" stroke="{stiel}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>')
        for i in range(n):
            w = math.radians(start + (ende - start) * (i + .35) / n)
            x, y = C[0] + R * math.cos(w), C[1] + R * math.sin(w)
            tang = math.degrees(w) + 90
            if seite > 0: x = 2 * C[0] - x; tang = 180 - tang
            g = 1 - i * .05
            dreh = 34 if seite < 0 else -34
            t.append(blatt(x, y, tang + dreh, L * g * .92, B * g * .92, innen))   # innen
            t.append(blatt(x, y, tang - dreh, L * g, B * g, aussen))            # außen
        if spitze:
            w = math.radians(ende); x, y = C[0] + R * math.cos(w), C[1] + R * math.sin(w)
            tang = math.degrees(w) + 90
            if seite > 0: x = 2 * C[0] - x; tang = 180 - tang
            t.append(blatt(x, y, tang, L * .8, B * .8, aussen))
    return "".join(t)

def grund(innen="#7FE3FF", mitte="#2F9BFF", aussen="#0B2A7A", glanz=True):
    g = f'''<defs><radialGradient id="g" cx="50%" cy="46%" r="70%"><stop offset="0" stop-color="{innen}"/><stop offset=".42" stop-color="{mitte}"/><stop offset="1" stop-color="{aussen}"/></radialGradient>
<filter id="w" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="38"/></filter>
<filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#04163F" flood-opacity=".55"/></filter>
<filter id="leuchten" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<rect width="1024" height="1024" fill="url(#g)"/>'''
    if glanz: g += f'<circle cx="512" cy="500" r="290" fill="#CFF6FF" opacity=".35" filter="url(#w)"/>'
    return g

def svg(inhalt): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{inhalt}</svg>'

FONT = "<style>@import url('https://fonts.googleapis.com/css2?family=Lilita+One&amp;display=swap');</style>"
def G(farbe="#FFFFFF", gr=430, y=668):
    return f'<text x="512" y="{y}" text-anchor="middle" font-family="Lilita One, Arial Black, sans-serif" font-size="{gr}" fill="{farbe}" filter="url(#s)">G</text>'

blitz = '<path d="M560 250 L380 560 L500 560 L450 790 L660 450 L535 450 L600 250 Z" fill="#FFFFFF" filter="url(#s)"/>'
hantel = ('<g filter="url(#s)" fill="#FFFFFF" transform="rotate(-35 512 520)"><rect x="372" y="500" width="280" height="40" rx="12"/>'
          '<rect x="352" y="420" width="50" height="200" rx="16"/><rect x="306" y="452" width="40" height="136" rx="13"/>'
          '<rect x="622" y="420" width="50" height="200" rx="16"/><rect x="678" y="452" width="40" height="136" rx="13"/></g>')
fackel = ('<g filter="url(#s)"><path d="M462 560 L562 560 L540 800 L484 800 Z" fill="#FFFFFF"/>'
          '<rect x="446" y="536" width="132" height="40" rx="12" fill="#FFFFFF"/>'
          '<path d="M512 250 C600 340 610 430 560 520 L464 520 C414 430 440 360 512 250 Z" fill="#FFB938"/>'
          '<path d="M512 350 C560 410 560 460 532 520 L492 520 C470 470 476 410 512 350 Z" fill="#FFF1B8"/></g>')

V = {
 "1_kranz_G": grund() + f'<g filter="url(#s)">{kranz()}</g>' + FONT + G(),
 "2_neon_weiss": grund("#5FD0FF", "#1466E0", "#061A55") + f'<g filter="url(#leuchten)">{kranz(aussen="#FFFFFF", innen="#CFEFFF", stiel="#CFEFFF")}</g>' + FONT + G("#FFFFFF"),
 "3_kranz_blitz": grund() + f'<g filter="url(#s)">{kranz()}</g>' + blitz,
 "4_kranz_hantel": grund() + f'<g filter="url(#s)">{kranz()}</g>' + hantel,
 "5_kranz_fackel": grund() + f'<g filter="url(#s)">{kranz()}</g>' + fackel,
 "6_nur_kranz_gross": grund() + f'<g filter="url(#s)">{kranz(R=345, n=8, L=185, B=70, start=100, ende=246)}</g>',
}
for k, v in V.items():
    open(os.path.join(OUT, k + ".svg"), "w", encoding="utf-8").write(svg(v))
cells = "".join(f'<div class="c"><img src="{k}.svg"><img class="k" src="{k}.svg"><b>{k.split("_")[0]}</b></div>' for k in V)
open(os.path.join(OUT, "uebersicht.html"), "w", encoding="utf-8").write(f'''<html><head><meta charset="utf-8"><style>
body{{margin:0;padding:24px;background:#fff;font-family:Segoe UI,Arial}} .g{{display:grid;grid-template-columns:repeat(3,300px);gap:22px}}
.c{{text-align:center}} img{{width:240px;height:240px;border-radius:54px;display:block;margin:0 auto}}
img.k{{width:60px;height:60px;border-radius:14px;margin-top:10px}} b{{display:block;font-size:26px;margin-top:6px}}
</style></head><body><div class="g">{cells}</div></body></html>''')
print("ok")
