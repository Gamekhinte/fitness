# 4 Logo-Konzepte für Gymlimpix, flach, wenige Farben aus der App.
import math, os
HIER = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HIER, "logo-konzepte"); os.makedirs(OUT, exist_ok=True)
INK, PAPIER, EIS, GOLD, ROT, BLAU = "#2B2826", "#F3EFE6", "#7CD4FF", "#F2C14E", "#D9573B", "#1F5FD6"

def pt(cx, cy, r, g): return cx + r * math.cos(math.radians(g)), cy + r * math.sin(math.radians(g))
def bogen(cx, cy, r, g1, g2):
    (x1, y1), (x2, y2) = pt(cx, cy, r, g1), pt(cx, cy, r, g2)
    return f"M{x1:.1f} {y1:.1f} A{r} {r} 0 1 0 {x2:.1f} {y2:.1f}"

# A: Laufbahn-G
cx, cy, r = 512, 512, 290
a = [f'<rect width="1024" height="1024" fill="{BLAU}"/>']
a.append(f'<path d="{bogen(cx, cy, r, -38, 12)} L{cx + 25} {pt(cx, cy, r, 12)[1]:.1f}" fill="none" stroke="{ROT}" stroke-width="170" stroke-linejoin="round"/>')
for rr in (r - 42, r + 42):
    a.append(f'<path d="{bogen(cx, cy, rr, -38, 12)}" fill="none" stroke="{PAPIER}" stroke-width="12"/>')
ye = pt(cx, cy, r, 12)[1]
a.append(f'<path d="M{cx + 25} {ye - 42:.1f} H{pt(cx, cy, r, 12)[0]:.1f} M{cx + 25} {ye + 42:.1f} H{pt(cx, cy, r + 42, 12)[0]:.1f}" stroke="{PAPIER}" stroke-width="12"/>')
# Startlinie am Ende oben rechts
(xs1, ys1), (xs2, ys2) = pt(cx, cy, r - 85, -38), pt(cx, cy, r + 85, -38)
a.append(f'<path d="M{xs1:.1f} {ys1:.1f} L{xs2:.1f} {ys2:.1f}" stroke="{PAPIER}" stroke-width="22"/>')

# B: Mäander-G
b = [f'<rect width="1024" height="1024" fill="{INK}"/>',
     f'<path d="M736 296 H288 V736 H736 V500 H520 V612" fill="none" stroke="{GOLD}" stroke-width="118" stroke-linejoin="miter" stroke-linecap="square"/>']

# C: Maskottchen-Kopf mit Lorbeer
c = [f'<rect width="1024" height="1024" fill="{EIS}"/>',
     f'<circle cx="512" cy="560" r="290" fill="{PAPIER}" stroke="{INK}" stroke-width="30"/>']
for s in (-1, 1):   # Lorbeer als Stirnband, je 3 Blätter
    for i, (x, y, w) in enumerate([(392, 330, -150), (330, 384, -125), (290, 452, -100)]):
        X = 512 + s * (512 - x); W = w if s < 0 else 180 - w
        rad = math.radians(W); L, B = 120, 44; dx, dy = math.cos(rad), math.sin(rad); nx, ny = -dy, dx
        c.append(f'<path d="M{X:.0f} {y} Q{X + dx*L*.5 + nx*B:.0f} {y + dy*L*.5 + ny*B:.0f} {X + dx*L:.0f} {y + dy*L:.0f} Q{X + dx*L*.5 - nx*B:.0f} {y + dy*L*.5 - ny*B:.0f} {X:.0f} {y}Z" fill="{GOLD}" stroke="{INK}" stroke-width="16" stroke-linejoin="round"/>')
c.append(f'<path d="M300 452 Q512 250 724 452" fill="none" stroke="{INK}" stroke-width="18" stroke-linecap="round"/>')
c += [f'<path d="M392 510 L470 540 M632 510 L554 540" stroke="{INK}" stroke-width="26" stroke-linecap="round"/>',   # Brauen, entschlossen
      f'<ellipse cx="440" cy="590" rx="26" ry="36" fill="{INK}"/><ellipse cx="584" cy="590" rx="26" ry="36" fill="{INK}"/>',
      f'<path d="M450 690 Q512 735 574 690" fill="none" stroke="{INK}" stroke-width="24" stroke-linecap="round"/>']

# D: Fackel
d = [f'<rect width="1024" height="1024" fill="{BLAU}"/>',
     f'<path d="M452 520 H572 L540 870 H484 Z" fill="{PAPIER}" stroke="{INK}" stroke-width="26" stroke-linejoin="round"/>',
     f'<rect x="420" y="486" width="184" height="58" rx="14" fill="{GOLD}" stroke="{INK}" stroke-width="26"/>',
     f'<path d="M512 140 C640 260 660 380 588 470 L436 470 C380 390 400 290 470 230 C480 290 500 300 520 300 C500 240 490 200 512 140 Z" fill="{ROT}" stroke="{INK}" stroke-width="26" stroke-linejoin="round"/>',
     f'<path d="M512 300 C568 360 566 420 540 470 L484 470 C462 420 472 370 512 300 Z" fill="{GOLD}"/>']

K = {"A_laufbahn": a, "B_maeander": b, "C_maskottchen": c, "D_fackel": d}
for k, v in K.items():
    open(os.path.join(OUT, k + ".svg"), "w", encoding="utf-8").write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{"".join(v)}</svg>')
zellen = "".join(f'''<div class="c"><img src="{k}.svg"><div class="klein"><img src="{k}.svg" style="width:60px;height:60px;border-radius:14px"><img src="{k}.svg" style="width:30px;height:30px;border-radius:7px"><img class="sw" src="{k}.svg" style="width:60px;height:60px;border-radius:14px"></div><b>{k.split("_")[0]}</b></div>''' for k in K)
open(os.path.join(OUT, "uebersicht.html"), "w", encoding="utf-8").write(f'''<html><head><meta charset="utf-8"><style>
body{{margin:0;padding:24px;background:#fff;font-family:Segoe UI,Arial}} .g{{display:grid;grid-template-columns:repeat(4,250px);gap:22px}}
.c{{text-align:center}} .c>img{{width:230px;height:230px;border-radius:52px;display:block;margin:0 auto}}
.klein{{display:flex;gap:12px;justify-content:center;align-items:center;margin-top:12px}} .sw{{filter:grayscale(1) contrast(1.4)}}
b{{display:block;font-size:26px;margin-top:8px}}</style></head><body><div class="g">{zellen}</div></body></html>''')
print("ok")
