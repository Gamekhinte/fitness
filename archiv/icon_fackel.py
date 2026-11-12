# Gymlimpix-Logo: olympische Fackel im Lorbeerkranz auf eisblauem Grund.
# Flach, dicke Tusche wie in der App. Alles als Vektor, darum in jeder Größe scharf.
# Aufruf: python archiv/icon_fackel.py
#   -> icon.svg (mit Grund), icon-fackel.svg (ohne Grund, Ladebildschirm), icon-maskable.svg (kleiner, für Android)
import math, os

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
INK, EIS = "#2B2826", "#7CD4FF"
GRUEN, GRUEN_D, ADER = "#5FAE4F", "#3E8A3A", "#9BD77A"
ROT, ORANGE, GELB, KERN = "#E2542F", "#F39A2B", "#FFCB45", "#FFF0B5"
WEISS, CREME = "#FFFFFF", "#ECE6D8"
T = 24  # Tusche

CX, CY, R = 512, 520, 318


def blatt(x, y, w, L, B, farbe):
    a = math.radians(w); dx, dy = math.cos(a), math.sin(a); nx, ny = -dy, dx
    sx, sy = x + dx * L, y + dy * L
    form = (f'<path d="M{x:.1f} {y:.1f} Q{x+dx*L*.45+nx*B:.1f} {y+dy*L*.45+ny*B:.1f} {sx:.1f} {sy:.1f} '
            f'Q{x+dx*L*.45-nx*B:.1f} {y+dy*L*.45-ny*B:.1f} {x:.1f} {y:.1f}Z" fill="{farbe}" stroke="{INK}" stroke-width="14" stroke-linejoin="round"/>')
    ader = (f'<path d="M{x+dx*L*.18:.1f} {y+dy*L*.18:.1f} L{x+dx*L*.72:.1f} {y+dy*L*.72:.1f}" '
            f'stroke="{ADER}" stroke-width="7" stroke-linecap="round" opacity=".9"/>')
    return form + ader


def ast():
    """Linker Zweig, der rechte wird gespiegelt."""
    g0, g1 = 82, 252                       # Grad auf dem Kreis, 90 = unten, 180 = links
    pkt = lambda g: (CX + R * math.cos(math.radians(g)), CY + R * math.sin(math.radians(g)))
    stiel = " ".join(f"{x:.1f},{y:.1f}" for x, y in (pkt(g0 + (g1 - g0) * i / 60) for i in range(61)))
    t = [f'<polyline points="{stiel}" fill="none" stroke="{INK}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>',
         f'<polyline points="{stiel}" fill="none" stroke="{GRUEN_D}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>']
    n = 8
    for i in range(n):
        g = 118 + i * 17
        x, y = pkt(g)
        a = math.radians(g)
        tang = math.degrees(math.atan2(math.cos(a), -math.sin(a)))     # Richtung nach oben am Zweig entlang
        L = 132 - i * 7
        t.append(blatt(x, y, tang - 42, L, L * .36, GRUEN))            # nach außen
        t.append(blatt(x, y, tang + 40, L * .9, L * .33, GRUEN_D))     # nach innen
    x, y = pkt(g1)
    a = math.radians(g1)
    t.append(blatt(x, y, math.degrees(math.atan2(math.cos(a), -math.sin(a))) - 6, 92, 32, GRUEN))
    return "".join(t)


def kranz():
    links = ast()
    return links + f'<g transform="matrix(-1 0 0 1 1024 0)">{links}</g>'


def fackel():
    p = []
    # Flamme
    p.append(f'<path d="M512 236 C584 304 652 362 630 440 C618 478 588 492 560 492 L464 492 C428 492 394 466 396 424 '
             f'C398 380 436 346 452 306 C462 344 478 362 494 368 C482 322 490 280 512 236 Z" '
             f'fill="{ROT}" stroke="{INK}" stroke-width="{T}" stroke-linejoin="round"/>')
    p.append(f'<path d="M518 300 C566 350 602 398 586 446 C576 476 552 488 530 488 L494 488 C466 486 446 466 448 438 '
             f'C450 404 476 386 488 356 C496 380 506 390 516 392 C508 364 508 330 518 300 Z" fill="{ORANGE}"/>')
    p.append(f'<path d="M518 372 C546 400 566 428 556 456 C550 474 536 484 522 484 L502 484 C486 482 474 470 476 452 '
             f'C478 432 494 418 504 400 C508 410 512 414 516 414 C512 400 512 386 518 372 Z" fill="{GELB}"/>')
    p.append(f'<ellipse cx="514" cy="462" rx="20" ry="22" fill="{KERN}"/>')
    # Griff
    p.append(f'<path d="M458 600 L566 600 L540 806 Q512 822 484 806 Z" fill="{CREME}" stroke="{INK}" stroke-width="{T}" stroke-linejoin="round"/>')
    p.append(f'<path d="M474 650 L550 650 M480 704 L544 704 M486 756 L538 756" stroke="{INK}" stroke-width="10" stroke-linecap="round" opacity=".35"/>')
    # Schale mit Gitterband
    p.append(f'<path d="M398 482 L626 482 L590 612 L434 612 Z" fill="{WEISS}" stroke="{INK}" stroke-width="{T}" stroke-linejoin="round"/>')
    p.append(f'<rect x="436" y="524" width="152" height="46" rx="6" fill="{INK}"/>')
    for i in range(4):
        p.append(f'<rect x="{444 + i * 36}" y="532" width="28" height="30" rx="4" fill="{WEISS}"/>')
    # Rand oben
    p.append(f'<rect x="382" y="462" width="260" height="38" rx="14" fill="{WEISS}" stroke="{INK}" stroke-width="{T}"/>')
    return "".join(p)


def inhalt(): return kranz() + fackel()


def svg(grund=True, viewbox="0 0 1024 1024", massstab=1.0):
    g = f'<rect width="1024" height="1024" fill="{EIS}"/>' if grund else ""
    i = inhalt()
    if massstab != 1.0:
        i = f'<g transform="translate(512 520) scale({massstab}) translate(-512 -520)">{i}</g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="1024" height="1024">{g}{i}</svg>'


if __name__ == "__main__":
    open(os.path.join(REPO, "icon.svg"), "w", encoding="utf-8").write(svg(True))
    open(os.path.join(REPO, "icon-maskable.svg"), "w", encoding="utf-8").write(svg(True, massstab=.8))
    open(os.path.join(REPO, "icon-fackel.svg"), "w", encoding="utf-8").write(
        svg(False, viewbox="50 110 924 840").replace('width="1024" height="1024"', 'width="924" height="840"'))
    print("ok")
