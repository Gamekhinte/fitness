# Gymlimpix-Logo: das Maskottchen nach der Standard-Figur "Olympionike" aus der App.
# Runder Kopf, braune Haut, dunkle Haarkappe, grüner Lorbeerkranz, große Augen, rote Wangen, weiße Tunika.
# Flach, dicke Tusche wie in der App, eisblauer Grund.
# Aufruf: python archiv/icon_gymlimpix.py -> icon.svg (mit Grund) und icon-kranz.svg (ohne Grund, Ladebildschirm)
import math, os

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
INK, EIS, PAPIER = "#2B2826", "#7CD4FF", "#F2EDE1"
HAUT, HAUT_D, HAAR = "#B0714F", "#94593D", "#3A3634"
GRUEN, GRUEN_D, WANGE, GOLD = "#5FAE4F", "#3E8A3A", "#F2918A", "#F2C14E"
T = 26  # Tusche

def blatt(x, y, w, L, B, farbe):
    a = math.radians(w); dx, dy = math.cos(a), math.sin(a); nx, ny = -dy, dx
    return (f'<path d="M{x:.1f} {y:.1f} Q{x+dx*L*.5+nx*B:.1f} {y+dy*L*.5+ny*B:.1f} {x+dx*L:.1f} {y+dy*L:.1f} '
            f'Q{x+dx*L*.5-nx*B:.1f} {y+dy*L*.5-ny*B:.1f} {x:.1f} {y:.1f}Z" fill="{farbe}" stroke="{INK}" stroke-width="12" stroke-linejoin="round"/>')

def kranz():
    # Band über die Stirn: Ellipsenbogen, Blätter zeigen von beiden Seiten zur Mitte
    cx, cy, rx, ry = 512, 470, 268, 92
    t = []
    for seite in (-1, 1):
        for i in range(4):
            g = 196 + i * 17 if seite < 0 else 344 - i * 17    # Grad auf der Ellipse (oben = 270)
            a = math.radians(g)
            x, y = cx + rx * math.cos(a), cy + ry * math.sin(a)
            tang = math.degrees(math.atan2(ry * math.cos(a), -rx * math.sin(a)))
            if seite > 0: tang += 180
            t.append(blatt(x, y, tang - 30, 104, 36, GRUEN))
            t.append(blatt(x, y, tang + 30, 94, 32, GRUEN_D))
    return "".join(t)

def figur():
    p = []
    # Schultern mit Tunika
    p.append(f'<path d="M206 1040 C214 860 330 792 512 792 C694 792 810 860 818 1040 Z" fill="{PAPIER}" stroke="{INK}" stroke-width="{T}" stroke-linejoin="round"/>')
    p.append(f'<path d="M430 800 Q512 866 594 800" fill="none" stroke="{INK}" stroke-width="18" stroke-linecap="round"/>')
    # Hals
    p.append(f'<path d="M448 720 V812 Q512 846 576 812 V720 Z" fill="{HAUT_D}" stroke="{INK}" stroke-width="{T}" stroke-linejoin="round"/>')
    # Ohren
    for s in (-1, 1):
        p.append(f'<ellipse cx="{512 + s * 268}" cy="540" rx="44" ry="58" fill="{HAUT}" stroke="{INK}" stroke-width="{T}"/>')
    # Kopf
    p.append(f'<circle cx="512" cy="512" r="262" fill="{HAUT}" stroke="{INK}" stroke-width="{T}"/>')
    # Haarkappe
    p.append(f'<path d="M252 486 C236 300 360 218 512 218 C664 218 788 300 772 486 C700 430 616 414 512 416 C408 414 324 430 252 486 Z" fill="{HAAR}" stroke="{INK}" stroke-width="{T}" stroke-linejoin="round"/>')
    p.append(kranz())
    # Augen, schauen leicht zur Seite wie bei der Figur
    for x in (420, 604):
        p.append(f'<circle cx="{x}" cy="566" r="60" fill="#FFFFFF" stroke="{INK}" stroke-width="20"/>')
        p.append(f'<circle cx="{x + 16}" cy="572" r="31" fill="{INK}"/>')
        p.append(f'<circle cx="{x + 27}" cy="559" r="10" fill="#FFFFFF"/>')
    # Wangen
    for x in (356, 668):
        p.append(f'<ellipse cx="{x}" cy="660" rx="42" ry="25" fill="{WANGE}"/>')
    # Nase und Lächeln
    p.append(f'<path d="M506 618 Q490 650 520 656" fill="none" stroke="{INK}" stroke-width="16" stroke-linecap="round"/>')
    p.append(f'<path d="M452 704 Q512 748 572 704" fill="none" stroke="{INK}" stroke-width="20" stroke-linecap="round"/>')
    return "".join(p)

def svg(grund=True):
    g = f'<rect width="1024" height="1024" fill="{EIS}"/>' if grund else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{g}{figur()}</svg>'

open(os.path.join(REPO, "icon.svg"), "w", encoding="utf-8").write(svg(True))
open(os.path.join(REPO, "icon-kranz.svg"), "w", encoding="utf-8").write(svg(False).replace('viewBox="0 0 1024 1024"', 'viewBox="190 190 644 680"'))
print("ok")
