/* ================= WINTERFORM ARENA 3D =================
   Die Arena als schwebende Insel an vier Seilen, mit deiner Figur drauf.
   Physik: runter- oder hochziehen, loslassen. Die Seile ziehen nur (nie drücken), oben werden sie schlaff.
   Wird die Insel schneller nach unten gerissen als etwas fällt, oder fangen die Seile sie hart ab,
   fliegt der Schnee (oder Sand, Asche, Mondstaub) hoch und plumpst wieder drauf.
   Zehn unterschiedliche Arenen. Kurz tippen: auf die Figur öffnet den Charakter, sonst den Arena-Weg. */
(function () {
  const ANKER_Y = 26;
  const st = { b: null, halter: null, insel: null, nr: -1, set: 'lauf', seile: [], figur: null, aussehen: null, beimTippen: null };
  const phy = { y: 0, vy: 0, yaw: 0, vyaw: 0, sx: 0, vsx: 0, zieh: null, vyAlt: 0, cool: 0 };
  const fig = { y: 0, vy: 0, modus: 'stehen', zeit: 0, weg: 0 };
  const C = { schnee: '#FFFFFF', erde: '#9C7448', erde2: '#7E5B37', bahn: '#D9643A', eis: '#BFE6FF', eis2: '#7CD4FF', wand: '#EADCC2',
    tanne: '#3E7A55', laub: '#5FA35A', stamm: '#6B4A2E', stein: '#B9B4AC', gold: '#F2C14E', gras: '#8CC084', sand: '#EAD39C',
    holz: '#B88C52', wasser: '#5BB8E8', ink: '#2B2826', rot: '#D9643A', grau: '#8E8A84', dunkel: '#4A4440' };

  let W, T;
  const teil = (...a) => W.teil(...a);
  const letztes = g => g.children[g.children.length - 1];

  /* ---------- Grundform der Insel ---------- */
  const FORMEN = {
    quadrat: { geo: (h, s) => W.box(11 * s, h, 10 * s), drin: (x, z) => Math.abs(x) < 5.55 && Math.abs(z) < 5.05, ecken: [[-5.1, -4.6], [5.1, -4.6], [-5.1, 4.6], [5.1, 4.6]] },
    rund: { geo: (h, s) => W.rohr(5.8 * s, h, 40), drin: (x, z) => x * x + z * z < 5.75 * 5.75, ecken: [[-3.75, -3.75], [3.75, -3.75], [-3.75, 3.75], [3.75, 3.75]] },
    sechseck: { geo: (h, s) => { const g = W.rohr(6 * s, h, 6); g.rotateY(Math.PI / 6); return g; }, drin: (x, z) => x * x + z * z < 5.1 * 5.1, ecken: [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]] }
  };
  function sockel(g, form, oben, erde, erde2) {
    const f = FORMEN[form];
    g.add(teil(f.geo(1.4, 1), erde, 0, -0.6, 0, 0.06));
    g.add(teil(f.geo(1.1, 0.84), erde2, 0, -1.75, 0, 0.06));
    g.add(teil(f.geo(0.4, 1.02), oben, 0, 0, 0, 0.05));
    // Felsen unten dran, damit sie wie eine schwebende Insel aussieht
    [[-2, -1, 1.3, 2.2], [1.8, 1.2, 1.1, 1.8], [0.2, -2.2, 0.9, 1.4], [-2.6, 2, 0.8, 1.2], [2.8, -1.8, 0.7, 1.1]].forEach(([x, z, r, h]) => {
      const k = W.kegel(r, h, 6); k.rotateX(Math.PI); g.add(teil(k, erde2, x, -2.3 - h / 2, z, 0.05));
    });
  }
  // Laufweg als Band mit dunkler Kante, gibt die Kurve zurück (darauf joggt die Figur)
  function weg(g, punkte, breite, farbe, linie) {
    const geo = W.band(punkte, breite, 0.23);
    g.add(new T.Mesh(geo, W.mat(farbe)));
    g.add(new T.Mesh(W.band(punkte, breite + 0.16, 0.215), new T.MeshBasicMaterial({ color: C.ink })));
    if (linie) g.add(new T.Mesh(W.band(punkte, 0.07, 0.245), new T.MeshBasicMaterial({ color: linie })));
    return geo.userData.kurve;
  }
  function schneeFlecken(g, form, n = 9) {
    const f = FORMEN[form];
    for (let i = 0; i < n; i++) {
      const w = i / n * Math.PI * 2 + 0.4, r = 4.3 + (i % 3) * 0.35;
      const x = Math.cos(w) * r, z = Math.sin(w) * r * 0.9;
      if (!f.drin(x, z)) continue;
      const geo = W.rohr(0.5 + (i % 3) * 0.25, 0.08, 12); geo.scale(1.3, 1, 1);
      g.add(teil(geo, C.schnee, x, 0.24, z, 0.02));
    }
  }

  /* ---------- Bausteine ---------- */
  function tanne(g, x, z, s = 1, winter = true) {
    g.add(teil(W.rohr(0.12 * s, 0.5 * s, 8, 0.14 * s), C.stamm, x, 0.2 + 0.25 * s, z, 0.03));
    g.add(teil(W.kegel(0.85 * s, 1.2 * s), C.tanne, x, 0.2 + 0.95 * s, z, 0.05));
    g.add(teil(W.kegel(0.62 * s, 1.0 * s), C.tanne, x, 0.2 + 1.55 * s, z, 0.05));
    g.add(teil(W.kegel(winter ? 0.3 * s : 0.36 * s, winter ? 0.45 * s : 0.6 * s), winter ? C.schnee : C.tanne, x, 0.2 + 2.0 * s, z, 0.04));
  }
  function laubbaum(g, x, z, s = 1, winter = false) {
    g.add(teil(W.rohr(0.13 * s, 0.9 * s, 8, 0.17 * s), C.stamm, x, 0.2 + 0.45 * s, z, 0.03));
    [[0, 1.35, 0, 0.62], [-0.35, 1.15, 0.1, 0.45], [0.38, 1.2, -0.1, 0.48]].forEach(([dx, dy, dz, r]) => g.add(teil(W.kugel(r * s, 12, 10), C.laub, x + dx * s, 0.2 + dy * s, z + dz * s, 0.04)));
    if (winter) { g.add(teil(new T.SphereGeometry(0.52 * s, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.32), C.schnee, x, 0.2 + 1.36 * s, z, 0.03, false)); }
  }
  function palme(g, x, z, s = 1) {
    let px = x, py = 0.2;
    for (let i = 0; i < 6; i++) { g.add(teil(W.rohr(0.13 * s, 0.42 * s, 8, 0.16 * s), '#A97A4A', px, py + 0.21 * s, z, 0.03)); px += 0.07 * s; py += 0.4 * s; }
    for (let i = 0; i < 7; i++) {
      const w = i / 7 * Math.PI * 2, b = W.box(0.25 * s, 0.06 * s, 1.3 * s); b.translate(0, 0, 0.65 * s);
      const m = teil(b, '#4E9A4E', px, py + 0.05, z, 0.02, false); m.rotation.set(0.45, w, 0, 'YXZ'); g.add(m);
    }
    [[0.12, 0], [-0.1, 0.1], [0, -0.13]].forEach(([dx, dz]) => g.add(teil(W.kugel(0.11 * s), '#6B4A2E', px + dx, py - 0.08, z + dz, 0.02)));
  }
  function schneemann(g, x, z) {
    g.add(teil(W.kugel(0.45), C.schnee, x, 0.6, z, 0.04)); g.add(teil(W.kugel(0.32), C.schnee, x, 1.25, z, 0.04));
    const n = W.kegel(0.06, 0.28, 8); n.rotateX(Math.PI / 2); g.add(teil(n, C.rot, x, 1.27, z + 0.42, 0.015));
    g.add(teil(W.rohr(0.22, 0.32, 14), C.ink, x, 1.66, z, 0.02)); g.add(teil(W.rohr(0.32, 0.04, 14), C.ink, x, 1.5, z, 0.02));
  }
  function bank(g, x, z, rot = 0) {
    const h = new T.Group(); h.position.set(x, 0.2, z); h.rotation.y = rot; g.add(h);
    h.add(teil(W.box(1.4, 0.1, 0.45), C.holz, 0, 0.42, 0, 0.03)); h.add(teil(W.box(1.4, 0.4, 0.08), C.holz, 0, 0.72, -0.2, 0.03));
    [-0.6, 0.6].forEach(dx => h.add(teil(W.box(0.08, 0.4, 0.4), C.ink, dx, 0.2, 0, 0)));
  }
  function laterne(g, x, z) {
    g.add(teil(W.rohr(0.05, 2, 8), C.ink, x, 1.2, z, 0.02)); g.add(teil(W.kugel(0.18), '#FFE38A', x, 2.25, z, 0.03));
  }
  function haus(g, x, z, w, h, d, wand, dach, winter, rot = 0) {
    const grp = new T.Group(); grp.position.set(x, 0.2, z); grp.rotation.y = rot; g.add(grp);
    grp.add(teil(W.box(w, h, d), wand, 0, h / 2, 0, 0.05));
    const s = new T.Shape(); s.moveTo(-w / 2 - 0.3, 0); s.lineTo(w / 2 + 0.3, 0); s.lineTo(0, h * 0.55); s.closePath();
    grp.add(teil(new T.ExtrudeGeometry(s, { depth: d + 0.4, bevelEnabled: false }), dach, 0, h + h * 0.275, 0, 0.05));
    if (winter) { const s2 = new T.Shape(); s2.moveTo(-w / 2 - 0.1, 0); s2.lineTo(w / 2 + 0.1, 0); s2.lineTo(0, h * 0.47); s2.closePath(); grp.add(teil(new T.ExtrudeGeometry(s2, { depth: d + 0.5, bevelEnabled: false }), C.schnee, 0, h + h * 0.33, 0, 0.03)); }
    return grp;
  }
  function fenster(grp, xs, ys, z, f = C.eis2) { xs.forEach(x => ys.forEach(y => grp.add(teil(W.box(0.42, 0.46, 0.06), f, x, y, z, 0.025)))); }
  function fahne(g, x, z, h = 3.2, y0 = 0.2, farbe = C.eis2) {
    g.add(teil(W.rohr(0.05, h, 8), C.stein, x, y0 + h / 2, z, 0.03));
    const geo = new T.PlaneGeometry(1.1, 0.65, 8, 1); geo.translate(0.55, 0, 0);
    const f = new T.Mesh(geo, W.mat(farbe, { side: T.DoubleSide }));
    f.position.set(x + 0.05, y0 + h - 0.35, z); const basis = geo.attributes.position.array.slice();
    g.add(f);
    g.userData.tick.push(t => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const xx = basis[i * 3]; p.array[i * 3 + 2] = Math.sin(xx * 4 - t * 3) * 0.08 * xx; } p.needsUpdate = true; });
  }
  const ovalPunkte = (cx, cz, rx, rz, n = 16) => Array.from({ length: n }, (_, i) => { const w = i / n * Math.PI * 2; return [cx + Math.cos(w) * rx, cz + Math.sin(w) * rz]; });
  const glut = () => new T.MeshBasicMaterial({ color: 0xFF7A2E });

  /* ---------- Die zehn Arenen ---------- */
  const ARENEN = [
    { name: 'Schulhof', form: 'quadrat', oben: C.schnee, kruemel: C.schnee, bau(g) {
      const kurve = weg(g, [[-3.6, 1], [-2.6, 3.6], [1.6, 3.9], [3.8, 2.4], [3.2, 0.2], [0, -0.4], [-3, -0.5]], 1.25, C.bahn, '#FFFFFF');
      const s = haus(g, 0.3, -3.7, 5, 2.1, 1.5, C.wand, C.rot, true);
      fenster(s, [-1.8, -1.05, 1.05, 1.8], [0.6, 1.5], 0.78); s.add(teil(W.box(0.8, 1.15, 0.08), C.rot, 0, 0.58, 0.78, 0.025));
      s.add(teil(W.box(1.4, 0.15, 0.5), C.stein, 0, 0.07, 1.0, 0.025));
      const uhr = W.rohr(0.27, 0.08, 20); uhr.rotateX(Math.PI / 2); s.add(teil(uhr, C.schnee, 0, 2.55, 0.95, 0.025));
      s.add(teil(W.box(0.4, 0.8, 0.4), C.rot, 1.6, 2.9, -0.2, 0.03));
      g.add(teil(W.rohr(0.06, 2.6, 8), C.ink, -4.6, 1.5, -1.6, 0.02)); g.add(teil(W.box(0.06, 0.7, 1), C.schnee, -4.45, 2.75, -1.6, 0.025));
      const ring = new T.TorusGeometry(0.22, 0.03, 6, 16); ring.rotateX(Math.PI / 2); g.add(teil(ring, C.rot, -4.15, 2.5, -1.6, 0));
      for (let i = 0; i < 3; i++) { const b = new T.TorusGeometry(0.25, 0.04, 6, 14, Math.PI); b.rotateY(Math.PI / 2); g.add(teil(b, C.stein, 3.6 + i * 0.4, 0.2, -1.4, 0.015, false)); }
      schneemann(g, -4.4, 3.8); bank(g, 4.3, 4.3, -0.3);
      tanne(g, -4.6, -3.9); tanne(g, 4.6, -3.7, 0.9); fahne(g, 3.4, -2.8);
      return { kurve, platz: [-0.4, 1.8] };
    } },
    { name: 'Stadtpark', form: 'rund', oben: C.gras, kruemel: C.schnee, bau(g) {
      const kurve = weg(g, [[-3.6, 0.6], [-2.4, 3.4], [0.8, 3.8], [3.6, 2], [3.6, -1.2], [1.2, -1.6], [-0.6, -3.2], [-3.2, -2.6]], 1.0, '#D8C49A');
      const teich = W.rohr(1.5, 0.08, 28); teich.scale(1.3, 1, 0.9); g.add(teil(teich, C.wasser, 0.6, 0.22, 0.6, 0.03));
      [0, 1].forEach(i => {
        const e = new T.Group(); g.add(e);
        e.add(teil(W.kugel(0.16), C.gold, 0, 0, 0, 0.02)); e.add(teil(W.kugel(0.1), C.gold, 0.12, 0.14, 0, 0.02)); e.add(teil(W.box(0.1, 0.04, 0.06), C.rot, 0.24, 0.13, 0, 0));
        g.userData.tick.push(t => { const w = t * 0.3 + i * 3; e.position.set(0.6 + Math.cos(w) * 1.1, 0.33 + Math.sin(t * 2 + i) * 0.025, 0.6 + Math.sin(w) * 0.7); e.rotation.y = -w; });
      });
      g.add(teil(W.rohr(0.7, 0.4, 20), C.stein, -2.6, 0.4, 0.3, 0.03)); g.add(teil(W.rohr(0.55, 0.06, 20), C.wasser, -2.6, 0.62, 0.3, 0)); g.add(teil(W.rohr(0.15, 0.9, 10), C.stein, -2.6, 0.8, 0.3, 0.025)); g.add(teil(W.rohr(0.4, 0.1, 16), C.stein, -2.6, 1.25, 0.3, 0.025));
      laubbaum(g, -3.4, -3.6, 1, true); laubbaum(g, 3.6, -3.2, 1.1, true); laubbaum(g, -4.6, 2.2, 0.9, true); laubbaum(g, 2.6, 4.2, 0.9, true); tanne(g, 0, -4.9, 0.8);
      laterne(g, -1, 2.2); laterne(g, 2.6, -2.2); bank(g, -0.6, -2.0, 0.2);
      schneeFlecken(g, 'rund', 10);
      return { kurve, platz: [-1.2, 3.3] };
    } },
    { name: 'Strand', form: 'quadrat', oben: C.sand, kruemel: C.sand, bau(g) {
      const meer = new T.PlaneGeometry(5.6, 4.4, 20, 14); meer.rotateX(-Math.PI / 2);
      const wm = new T.Mesh(meer, W.mat(C.wasser)); wm.position.set(2.75, 0.27, -2.75); g.add(wm);
      const basis = meer.attributes.position.array.slice();
      g.userData.tick.push(t => { const p = meer.attributes.position; for (let i = 0; i < p.count; i++) p.array[i * 3 + 1] = Math.sin(basis[i * 3] * 1.6 + t * 1.8) * 0.05 + Math.cos(basis[i * 3 + 2] * 1.3 + t) * 0.04; p.needsUpdate = true; });
      for (let i = 0; i < 3; i++) g.add(teil(W.box(5.4, 0.04, 0.1), '#FFFFFF', 2.75, 0.33, -1.0 - i * 1.3, 0));
      const kurve = weg(g, [[-4.4, 4], [-1, 4.2], [2.6, 3.8], [4.4, 2.4], [3, 1.2], [-0.6, 1.3], [-3.8, 0.6], [-4.6, 2.4]], 1.1, C.holz, '#8A6235');
      palme(g, -4.6, -3.8, 1); palme(g, -1.2, -4.2, 0.85); palme(g, 4.7, 4.5, 0.8);
      const h = new T.Group(); h.position.set(-3, 0.2, -1.8); g.add(h);
      for (let i = 0; i < 5; i++) h.add(teil(W.box(0.36, 1.5, 1.4), i % 2 ? '#FFFFFF' : C.eis2, -0.72 + i * 0.36, 0.75, 0, 0.03));
      h.add(teil(W.box(2.1, 0.15, 1.7), C.rot, 0, 1.6, 0, 0.03));
      [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].forEach(([dx, dz]) => g.add(teil(W.rohr(0.05, 1.6, 6), C.holz, 0.8 + dx, 1.0, -1.0 + dz, 0.02)));
      g.add(teil(W.box(1, 0.6, 1), C.rot, 0.8, 2.1, -1.0, 0.03)); g.add(teil(W.box(1.2, 0.08, 1.2), C.schnee, 0.8, 2.45, -1.0, 0.02));
      g.add(teil(W.rohr(0.04, 1.6, 6), C.ink, 3.6, 1.0, 4.4, 0.015)); g.add(teil(W.kegel(0.9, 0.4, 10), C.rot, 3.6, 1.85, 4.4, 0.03));
      g.add(teil(W.box(0.8, 0.03, 1.4), C.eis2, 2.4, 0.22, 4.5, 0.015)); g.add(teil(W.kugel(0.22), C.gold, -2.4, 0.42, 2.6, 0.025));
      return { kurve, platz: [0.4, 2.6] };
    } },
    { name: 'Wald-Trail', form: 'sechseck', oben: '#6E9A5A', kruemel: C.schnee, bau(g) {
      const kurve = weg(g, [[-3.4, 2.2], [-1, 3.8], [2.2, 3.2], [3.6, 0.4], [2.4, -2.6], [-0.6, -2.4], [-1.8, -0.2], [-3.8, -0.6]], 0.95, '#8A6A45');
      g.add(new T.Mesh(W.band([[-5, -3.2], [-2, -1.4], [0.4, -0.6], [2.6, 0.8], [5, 1.8]], 0.8, 0.226, false), W.mat(C.wasser)));
      g.add(teil(W.box(1.4, 0.12, 1.3), C.holz, 2.9, 0.42, 0.95, 0.03)); [-0.6, 0.6].forEach(d => g.add(teil(W.box(1.4, 0.25, 0.06), C.stamm, 2.9, 0.6, 0.95 + d, 0.02)));
      const h = haus(g, -2.4, -3.5, 2.2, 1.4, 1.6, '#8A5A35', C.rot, true, 0.3); fenster(h, [-0.5, 0.5], [0.8], 0.82, C.gold);
      for (let i = 0; i < 6; i++) { const l = W.rohr(0.16, 1.1, 10); l.rotateZ(Math.PI / 2); g.add(teil(l, C.holz, 0.6, 0.38 + Math.floor(i / 3) * 0.3, 4.2 - (i % 3) * 0.32 + Math.floor(i / 3) * 0.16, 0.025)); }
      [[-1.2, 1.4], [1.4, 1.6], [0.2, 0.8]].forEach(([x, z]) => { g.add(teil(W.rohr(0.06, 0.25, 6), C.schnee, x, 0.32, z, 0.015)); g.add(teil(new T.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), C.rot, x, 0.42, z, 0.02, false)); });
      [[-4.4, 1], [-4.2, 3], [-2.6, 4.4], [4.2, -1.6], [4.6, 1.2], [3.6, 3.6], [1, -4.4], [3, -3.8], [-4.2, -2.4], [0.6, 2.2]].forEach(([x, z], i) => tanne(g, x, z, 0.75 + (i % 4) * 0.12));
      schneeFlecken(g, 'sechseck', 8);
      return { kurve, platz: [-2.4, 1.8] };
    } },
    { name: 'Stadion', form: 'quadrat', oben: '#5FA35A', kruemel: '#8CC084', bau(g) {
      const bahn = W.rundRechteck(9.4, 6, 3); bahn.holes.push(W.rundRechteck(6.6, 3.2, 1.6));
      g.add(teil(W.flach(bahn, 0.1), C.rot, 0, 0.26, 0.3, 0.03));
      const weiss = new T.MeshBasicMaterial({ color: 0xffffff });
      for (let i = 1; i < 4; i++) { const w = 6.6 + i * 0.7, h = 3.2 + i * 0.7, r = 1.6 + i * 0.35; const s = W.rundRechteck(w + 0.05, h + 0.05, r); s.holes.push(W.rundRechteck(w - 0.05, h - 0.05, r - 0.03)); const m = new T.Mesh(W.flach(s, 0.02), weiss); m.position.set(0, 0.32, 0.3); g.add(m); }
      const kurve = W.band(ovalPunkte(0, 0.3, 4.05, 2.35, 24), 0.1, 0.3).userData.kurve;
      g.add(new T.Mesh(W.band([[0, -1.3], [0, 1.9]], 0.05, 0.25, false), weiss));
      const kreis = new T.TorusGeometry(0.5, 0.025, 4, 30); kreis.rotateX(Math.PI / 2); const km = new T.Mesh(kreis, weiss); km.position.set(0, 0.25, 0.3); g.add(km);
      [-2.9, 2.9].forEach(x => { [-0.5, 0.5].forEach(dz => g.add(teil(W.rohr(0.04, 0.6, 6), C.schnee, x, 0.55, 0.3 + dz, 0.015))); g.add(teil(W.box(0.06, 0.06, 1.06), C.schnee, x, 0.85, 0.3, 0.015)); });
      // Tribünen mit Fans, die hüpfen
      [-4.35, 4.55].forEach((z, k) => { for (let r = 0; r < 3; r++) g.add(teil(W.box(9.6, 0.35 + r * 0.35, 0.45), r % 2 ? '#D8D2C8' : C.stein, 0, 0.38 + r * 0.17, z + (k ? 1 : -1) * r * 0.0 + (k ? -0.45 : 0.45) * (1 - r) * 0 + (k ? r * 0.15 : -r * 0.15), 0.03)); });
      const farben = ['#D9643A', '#3FA9E6', '#F2C14E', '#3E7A55', '#FFFFFF', '#E86AA6'];
      const inst = new T.InstancedMesh(W.kugel(0.14, 8, 6), new T.MeshToonMaterial({ color: 0xffffff }), 90);
      const m4 = new T.Matrix4(), fans = []; let n = 0;
      [[-4.35, -1], [4.55, 1]].forEach(([z, s]) => { for (let r = 0; r < 3; r++) for (let i = 0; i < 15; i++) { const p = [-4.3 + i * 0.6 + (r % 2) * 0.25, 0.75 + r * 0.35, z + s * r * 0.15]; m4.makeTranslation(...p); inst.setMatrixAt(n, m4); inst.setColorAt(n, new T.Color(farben[(i * 7 + r * 3) % farben.length])); fans.push([...p, i + r * 2]); n++; } });
      g.add(inst);
      g.userData.tick.push(t => { fans.forEach(([x, y, z, k], i) => { m4.makeTranslation(x, y + Math.max(0, Math.sin(t * 4 + k)) * 0.1, z); inst.setMatrixAt(i, m4); }); inst.instanceMatrix.needsUpdate = true; });
      [[-5, -4.4], [5, -4.4], [-5, 4.6], [5, 4.6]].forEach(([x, z]) => { g.add(teil(W.rohr(0.07, 3.6, 8), C.stein, x, 2.0, z, 0.02)); g.add(teil(W.box(0.8, 0.5, 0.2), C.gold, x, 3.9, z, 0.03)); });
      g.add(teil(W.box(2.4, 1.1, 0.25), C.ink, 0, 2.6, -4.85, 0.03)); g.add(teil(W.box(2.1, 0.8, 0.05), '#3E7A55', 0, 2.6, -4.7, 0));
      [-0.8, 0.8].forEach(x => g.add(teil(W.rohr(0.06, 1.6, 6), C.stein, x, 1.3, -4.85, 0.015)));
      return { kurve, platz: [0, 0.3] };
    } },
    { name: 'Dächer', form: 'quadrat', oben: '#9A968F', erde: '#B5654A', erde2: '#8E4E3A', kruemel: '#9A968F', bau(g) {
      for (let i = -3; i <= 3; i++) [-5.52, 5.52].forEach(x => g.add(teil(W.box(0.06, 0.5, 0.55), C.eis2, x, -0.7, i * 1.3, 0.015)));
      for (let i = -3; i <= 3; i++) [-5.02, 5.02].forEach(z => g.add(teil(W.box(0.55, 0.5, 0.06), C.eis2, i * 1.45, -0.7, z, 0.015)));
      [-5.0, 5.0].forEach(z => g.add(teil(W.box(11, 0.35, 0.2), '#7E7A74', 0, 0.37, z, 0.03)));
      [-5.5, 5.5].forEach(x => g.add(teil(W.box(0.2, 0.35, 10), '#7E7A74', x, 0.37, 0, 0.03)));
      const kurve = weg(g, [[-4, 3.6], [0, 4], [3.8, 3.4], [4, 0], [1.4, -0.6], [-1, 0.6], [-4, 0.2]], 0.9, '#5F5B55', C.gold);
      [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach(([dx, dz]) => g.add(teil(W.rohr(0.05, 1.4, 6), C.stamm, -3.4 + dx, 0.9, -3.4 + dz, 0.02)));
      g.add(teil(W.rohr(0.8, 1.2, 16), C.holz, -3.4, 2.2, -3.4, 0.04)); g.add(teil(W.kegel(0.95, 0.6, 16), C.stamm, -3.4, 3.1, -3.4, 0.04));
      [[0.4, -3.6], [1.6, -3.6]].forEach(([x, z]) => { g.add(teil(W.box(0.9, 0.7, 0.9), '#D8D2C8', x, 0.55, z, 0.03)); g.add(teil(W.rohr(0.3, 0.04, 14), C.ink, x, 0.92, z, 0)); });
      [[-1.2, -1.9], [0.4, -1.9]].forEach(([x, z]) => g.add(teil(W.box(1.1, 0.3, 0.8), C.eis2, x, 0.35, z, 0.03)));
      for (let i = 0; i < 3; i++) { const p = teil(W.box(1, 0.06, 0.7), '#2F4A7A', 3.4, 0.6, -3.8 + i * 0.85, 0.02); p.rotation.x = -0.4; g.add(p); }
      g.add(teil(W.rohr(0.03, 2.4, 6), C.ink, 4.6, 1.4, 1.6, 0.01)); g.add(teil(W.box(0.6, 0.04, 0.04), C.ink, 4.6, 2.3, 1.6, 0));
      g.add(teil(W.box(0.5, 1.1, 0.5), '#B5654A', -4.4, 0.75, 1.6, 0.03));
      g.add(teil(W.box(2.4, 1.2, 0.2), '#D8D2C8', 1.8, 0.8, 4.4, 0.03));
      [['#E86AA6', 1.2], ['#3FA9E6', 1.8], [C.gold, 2.4]].forEach(([f, x]) => g.add(teil(W.box(0.5, 0.6, 0.04), f, x, 0.85, 4.28, 0)));
      return { kurve, platz: [-1.8, 2.6] };
    } },
    { name: 'Canyon', form: 'sechseck', oben: '#E3A66B', erde: '#C9733F', erde2: '#A95E33', kruemel: '#E3A66B', bau(g) {
      const kurve = weg(g, [[-3.6, 1.6], [-1.2, 3.6], [2.2, 3.2], [3.4, 0.6], [1.2, -0.8], [-1.2, -0.2], [-3.4, -1.2]], 0.95, '#C98A55');
      [[-2.6, -3.0, 1.6, 2.2], [2.4, -2.8, 1.3, 3], [3.9, 1.4, 0.8, 1.4]].forEach(([x, z, r, h]) => {
        ['#C9733F', '#D98C52', '#E8B07A'].forEach((f, i) => g.add(teil(W.rohr(r * (1 - i * 0.12), h / 3, 7, r * (1 - i * 0.12) + 0.15), f, x, 0.2 + h / 6 + i * h / 3, z, 0.04)));
      });
      g.add(teil(new T.TorusGeometry(1.1, 0.32, 8, 16, Math.PI), '#C9733F', -0.2, 0.2, -1.6, 0.04, false));
      [[-4, 3, 1], [1.6, 1.6, 0.8], [-2.2, 1.0, 0.7], [4.2, -1.2, 0.9]].forEach(([x, z, s]) => {
        g.add(teil(new T.CapsuleGeometry(0.2 * s, 1.1 * s, 4, 10), '#4E9A4E', x, 0.2 + 0.75 * s, z, 0.03));
        g.add(teil(new T.CapsuleGeometry(0.12 * s, 0.4 * s, 4, 8), '#4E9A4E', x + 0.32 * s, 0.2 + 1.0 * s, z, 0.025));
        g.add(teil(new T.CapsuleGeometry(0.12 * s, 0.3 * s, 4, 8), '#4E9A4E', x - 0.32 * s, 0.2 + 0.8 * s, z, 0.025));
        g.add(teil(W.kugel(0.08 * s), '#E86AA6', x, 0.2 + 1.5 * s, z, 0.015));
      });
      const tw = teil(new T.IcosahedronGeometry(0.3, 0), '#B88C52', 0, 0.5, 2.4, 0.02); g.add(tw);
      g.userData.tick.push(t => { tw.position.x = Math.sin(t * 0.5) * 3; tw.rotation.z = -tw.position.x * 1.5; });
      return { kurve, platz: [0.4, 2.2] };
    } },
    { name: 'Vulkan', form: 'rund', oben: C.dunkel, erde: '#3A3533', erde2: '#2A2625', kruemel: '#8E8A84', bau(g) {
      const lavaMat = glut();
      g.add(new T.Mesh(W.band([[-5.4, 1.8], [-2.4, 0.6], [0.4, 1.2], [2.6, 0], [5.4, -0.8]], 0.75, 0.226, false), lavaMat));
      g.userData.tick.push(t => { lavaMat.color.setHSL(0.06, 1, 0.55 + Math.sin(t * 2) * 0.06); });
      g.add(teil(W.box(1.3, 0.14, 1.1), C.stein, -0.9, 0.42, 0.85, 0.03));
      const kurve = weg(g, [[-3.6, 3], [0, 4.2], [3.4, 3], [3.6, 1.6], [0, 2.4], [-3.4, 2.2]], 0.85, '#6E6A66');
      g.add(teil(W.rohr(1.1, 3, 10, 2.8), '#5A524E', 0.4, 1.7, -3.2, 0.05));
      g.add(teil(W.rohr(0.95, 0.1, 14), glut(), 0.4, 3.22, -3.2, 0));
      [[-0.2, 2.5, -2.25], [1.1, 2.1, -2.0]].forEach(([x, y, z]) => g.add(teil(W.box(0.25, 1.2, 0.1), glut(), x, y, z, 0)));
      const rauch = [0, 1, 2, 3].map(() => { const k = new T.Mesh(W.kugel(0.45, 10, 8), new T.MeshToonMaterial({ color: 0x8E8A84, transparent: true })); g.add(k); return k; });
      g.userData.tick.push(t => rauch.forEach((k, i) => { const p = (t * 0.35 + i / 4) % 1; k.position.set(0.4 + Math.sin(p * 4 + i) * 0.3, 3.4 + p * 3, -3.2); k.scale.setScalar(0.5 + p * 1.4); k.material.opacity = 0.9 * (1 - p); }));
      [[-3.8, -1.8, 0.6], [3.8, -2.4, 0.5], [-2.2, -3.6, 0.45], [4.2, 2.4, 0.4], [-4.4, 0.4, 0.35]].forEach(([x, z, r]) => g.add(teil(new T.DodecahedronGeometry(r, 0), '#3A3533', x, 0.2 + r * 0.7, z, 0.03)));
      return { kurve, platz: [0, 3.6] };
    } },
    { name: 'Bergdorf', form: 'quadrat', oben: C.schnee, kruemel: C.schnee, bau(g) {
      [[-3.2, 3.4, 2.0], [0.4, 4.4, 2.4], [3.6, 3.0, 1.9]].forEach(([x, h, r]) => { g.add(teil(W.kegel(r, h, 7), C.stein, x, 0.2 + h / 2, -4, 0.05)); g.add(teil(W.kegel(r * 0.45, h * 0.45, 7), C.schnee, x, 0.2 + h - h * 0.22, -4, 0.04)); });
      const kurve = weg(g, [[-4, 3.6], [-1, 2.4], [2.4, 3.8], [4, 1.6], [1.4, 0.2], [-2.2, 0.8], [-4.2, 0.6]], 0.85, '#D8C49A');
      const h1 = haus(g, -2.6, -1.6, 2, 1.5, 1.6, '#8A5A35', C.rot, true, 0.2); fenster(h1, [-0.5, 0.5], [0.8], 0.82, C.gold);
      h1.add(teil(W.box(2.2, 0.08, 0.5), C.holz, 0, 1.1, 1.0, 0.02));
      const h2 = haus(g, 2.0, -1.2, 1.6, 1.3, 1.4, C.wand, '#3E7A55', true, -0.25); fenster(h2, [-0.4, 0.4], [0.7], 0.72, C.gold);
      [-4.6, 4.6].forEach(x => { g.add(teil(W.rohr(0.09, 3.6, 8), C.stein, x, 2.0, 0.6, 0.02)); g.add(teil(W.box(0.7, 0.12, 0.12), C.stein, x, 3.8, 0.6, 0.02)); });
      g.add(teil(W.box(9.2, 0.035, 0.035), C.ink, 0, 3.75, 0.6, 0));
      const sessel = [0, 1, 2].map(() => { const s = new T.Group(); g.add(s); s.add(teil(W.rohr(0.025, 0.6, 4), C.ink, 0, -0.3, 0, 0)); s.add(teil(W.box(0.55, 0.32, 0.4), C.rot, 0, -0.7, 0, 0.025)); return s; });
      g.userData.tick.push(t => sessel.forEach((s, i) => s.position.set(((t * 0.5 + i * 3) % 9.2) - 4.6, 3.75, 0.6)));
      g.add(teil(W.box(0.5, 0.08, 1), C.rot, -3.8, 0.32, 4.2, 0.02)); [-0.2, 0.2].forEach(d => g.add(teil(W.box(0.05, 0.1, 1.1), C.ink, -3.8 + d, 0.24, 4.2, 0)));
      tanne(g, 4.6, 4.4, 0.9); tanne(g, -4.7, -0.4, 0.8); tanne(g, 4.8, -2.2, 0.75); tanne(g, 0.4, 4.6, 0.6);
      return { kurve, platz: [0.2, 2.6] };
    } },
    { name: 'Mondbasis', form: 'rund', oben: '#C9C5BE', erde: '#8E8A84', erde2: '#6E6A66', kruemel: '#C9C5BE', bau(g) {
      [[-2.6, 2.4, 0.9], [2.8, 2.8, 0.6], [-3.6, -1, 0.5], [1.2, 0.4, 0.45]].forEach(([x, z, r]) => {
        const t = new T.TorusGeometry(r, 0.12, 6, 20); t.rotateX(Math.PI / 2); g.add(teil(t, '#B2ADA6', x, 0.24, z, 0.02));
        g.add(teil(W.rohr(r, 0.04, 20), '#A6A19A', x, 0.22, z, 0));
      });
      const kurve = weg(g, ovalPunkte(0, 1.4, 3.9, 2.6, 18), 0.8, '#A6A19A', '#FFFFFF');
      g.add(teil(W.rohr(1, 0.2, 16), C.grau, -2.6, 0.3, -2.8, 0.03));
      g.add(teil(W.rohr(0.45, 2.4, 16), '#FFFFFF', -2.6, 1.6, -2.8, 0.04)); g.add(teil(W.kegel(0.45, 0.9, 16), C.rot, -2.6, 3.25, -2.8, 0.04));
      const fe = W.rohr(0.16, 0.06, 14); fe.rotateX(Math.PI / 2); g.add(teil(fe, C.eis2, -2.6, 2.1, -2.36, 0.02));
      for (let i = 0; i < 3; i++) { const w = i / 3 * Math.PI * 2, f = teil(W.box(0.06, 0.7, 0.5), C.rot, -2.6 + Math.cos(w) * 0.5, 0.75, -2.8 + Math.sin(w) * 0.5, 0.02); f.rotation.y = -w; g.add(f); }
      const kuppel = new T.Mesh(new T.SphereGeometry(1.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshToonMaterial({ color: 0xBFE6FF, transparent: true, opacity: 0.6 }));
      kuppel.position.set(2.4, 0.2, -2.6); g.add(kuppel);
      g.add(teil(W.box(1.2, 0.4, 0.7), '#FFFFFF', 3.6, 0.55, 0.8, 0.03)); [[-0.4, -0.38], [0.4, -0.38], [-0.4, 0.38], [0.4, 0.38]].forEach(([dx, dz]) => { const r = W.rohr(0.16, 0.1, 12); r.rotateX(Math.PI / 2); g.add(teil(r, C.ink, 3.6 + dx, 0.36, 0.8 + dz, 0)); });
      fahne(g, 0.6, -3.8, 2, 0.2, C.rot);
      const erde = new T.Group(); g.add(erde);
      erde.add(teil(W.kugel(0.9, 20, 14), C.wasser, 0, 0, 0, 0.04)); [[0.3, 0.4, 0.6], [-0.4, -0.2, 0.7], [0.1, -0.5, -0.6]].forEach(([x, y, z]) => erde.add(teil(W.kugel(0.38, 10, 8), C.gras, x, y, z, 0)));
      g.userData.tick.push(t => { erde.rotation.y = t * 0.2; erde.position.set(3.6, 6.2 + Math.sin(t * 0.8) * 0.15, -4); });
      return { kurve, platz: [0, 0.3] };
    } }
  ];

  const SETS = { lauf: ARENEN };
  // Bausteine für andere Arena-Sets (kraft3d.js)
  const hilfen = () => ({ W, T, C, teil, letztes, FORMEN, sockel, weg, schneeFlecken, tanne, laubbaum, palme, schneemann, bank, laterne, haus, fenster, fahne, ovalPunkte, glut });
  function insel(nr, set = st.set) {
    const liste = SETS[set] || ARENEN;
    const def = liste[nr] || liste[0];
    const g = new T.Group(); g.userData.tick = [];
    sockel(g, def.form, def.oben, def.erde || C.erde, def.erde2 || C.erde2);
    const info = def.bau(g, hilfen());
    FORMEN[def.form].ecken.forEach(([x, z], i) => { const o = new T.TorusGeometry(0.22, 0.07, 8, 16); o.rotateY(Math.PI / 4); g.add(teil(o, C.gold, x, (info.seilY || [])[i] || 0.42, z, 0.02)); });
    Object.assign(g.userData, info, { def, form: def.form });
    return g;
  }

  /* ---------- Seile ---------- */
  function seileBauen() {
    const seilMat = W.mat('#D8B27A'), inkMat = new T.MeshBasicMaterial({ color: C.ink, side: T.BackSide });
    st.seile = [0, 1, 2, 3].map(() => {
      const m = new T.Mesh(new T.BufferGeometry(), seilMat), u = new T.Mesh(new T.BufferGeometry(), inkMat);
      st.b.szene.add(m); st.b.szene.add(u);
      return { m, u, anker: new T.Vector3(), lokal: new T.Vector3(), laenge: 0 };
    });
  }
  function seileZeichnen() {
    st.insel.updateMatrixWorld(true);
    for (const s of st.seile) {
      const unten = s.lokal.clone().applyMatrix4(st.insel.matrixWorld);
      const locker = Math.max(0, s.laenge - unten.distanceTo(s.anker));
      const mitte = unten.clone().lerp(s.anker, 0.5);
      mitte.y -= locker * 0.55; mitte.x += locker * 0.3 * Math.sign(s.lokal.x); mitte.z += locker * 0.2 * Math.sign(s.lokal.z);
      const kurve = new T.QuadraticBezierCurve3(unten, mitte, s.anker);
      s.m.geometry.dispose(); s.u.geometry.dispose();
      s.m.geometry = new T.TubeGeometry(kurve, 20, 0.08, 6, false);
      s.u.geometry = new T.TubeGeometry(kurve, 20, 0.13, 6, false);
    }
  }

  /* ---------- Krümel: Schnee, Sand, Asche, Mondstaub ---------- */
  const KR = { n: 90, mesh: null, teile: [], leer: null };
  function kruemelBauen() {
    KR.mesh = new T.InstancedMesh(new T.IcosahedronGeometry(0.2, 0), new T.MeshToonMaterial({ color: 0xffffff }), KR.n);
    KR.rand = new T.InstancedMesh(new T.IcosahedronGeometry(0.27, 0), new T.MeshBasicMaterial({ color: 0x2B2826, side: T.BackSide }), KR.n);
    KR.mesh.frustumCulled = KR.rand.frustumCulled = false; st.b.szene.add(KR.mesh); st.b.szene.add(KR.rand);
    KR.rand.instanceMatrix = KR.mesh.instanceMatrix;
    KR.teile = Array.from({ length: KR.n }, () => ({ zustand: 'aus', p: new T.Vector3(), v: new T.Vector3(), lokal: new T.Vector3(), zeit: 0, gr: 1 }));
    KR.leer = new T.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < KR.n; i++) KR.mesh.setMatrixAt(i, KR.leer);
  }
  // Krümel von der Oberfläche losreißen: Startgeschwindigkeit = Insel + Schubs nach oben
  function losreissen(anzahl, schubs) {
    const drin = FORMEN[st.insel.userData.form].drin;
    st.insel.updateMatrixWorld(true);
    let n = 0;
    for (const k of KR.teile) {
      if (n >= anzahl) break;
      if (k.zustand === 'flug') continue;
      let x, z, versuch = 0;
      do { x = (Math.random() - 0.5) * 11; z = (Math.random() - 0.5) * 10; versuch++; } while (!drin(x, z) && versuch < 10);
      k.p.set(x, 0.27, z).applyMatrix4(st.insel.matrixWorld);
      k.v.set((Math.random() - 0.5) * 3, phy.vy + schubs * (0.7 + Math.random() * 0.7), (Math.random() - 0.5) * 3);
      k.zustand = 'flug'; k.gr = 0.7 + Math.random() * 0.9; k.zeit = 0; n++;
    }
  }
  const _m = { m: null, q: null, s: null, lok: null, inv: null };
  function kruemelSchritt(dt) {
    if (!_m.m) { _m.m = new T.Matrix4(); _m.q = new T.Quaternion(); _m.s = new T.Vector3(); _m.lok = new T.Vector3(); _m.inv = new T.Matrix4(); _m.w = new T.Vector3(); }
    const { m, q, s, lok } = _m;
    _m.inv.copy(st.insel.matrixWorld).invert();
    const drin = FORMEN[st.insel.userData.form].drin;
    let aktiv = false;
    KR.teile.forEach((k, i) => {
      if (k.zustand === 'aus') return;
      aktiv = true;
      if (k.zustand === 'flug') {
        k.v.y -= 28 * dt; k.p.addScaledVector(k.v, dt); k.zeit += dt;
        lok.copy(k.p).applyMatrix4(_m.inv);
        if (lok.y <= 0.26 && lok.y > -0.8 && drin(lok.x, lok.z) && k.zeit > 0.08 && k.v.y < phy.vy + 0.5) { k.zustand = 'liegt'; k.lokal.set(lok.x, 0.25, lok.z); k.zeit = 0; }
        else if (k.p.y < -16) { k.zustand = 'aus'; KR.mesh.setMatrixAt(i, KR.leer); return; }
        s.setScalar(k.gr); m.compose(k.p, q, s);
      } else {
        k.zeit += dt;
        const rest = Math.max(0, 1 - Math.max(0, k.zeit - 1.2) / 0.6);
        if (rest <= 0) { k.zustand = 'aus'; KR.mesh.setMatrixAt(i, KR.leer); return; }
        _m.w.copy(k.lokal).applyMatrix4(st.insel.matrixWorld);
        const platt = k.zeit < 0.12 ? 1 - k.zeit * 3 : 0.6;     // kleiner Plumps beim Aufkommen
        s.set(k.gr * 1.25 * rest, k.gr * platt * rest, k.gr * 1.25 * rest); m.compose(_m.w, q, s);
      }
      KR.mesh.setMatrixAt(i, m);
    });
    if (aktiv) KR.mesh.instanceMatrix.needsUpdate = true;
    KR.aktiv = aktiv;
  }

  /* ---------- Physik ---------- */
  const K = 70, G = 28, S0 = G / K;
  function schritt(dt, t) {
    if (phy.zieh) return;
    const straff = phy.y < S0;
    const ay = straff ? -K * phy.y - 3.2 * phy.vy : -G - 0.2 * phy.vy;
    phy.vy += ay * dt; phy.y += phy.vy * dt;
    phy.vyaw += (-14 * phy.yaw - 1.6 * phy.vyaw) * dt; phy.yaw += phy.vyaw * dt;
    phy.vsx += (-9 * phy.sx - 1.1 * phy.vsx) * dt; phy.sx += phy.vsx * dt;
    phy.yaw += Math.sin(t * 0.7) * 0.0003;
  }
  function anwenden() {
    st.halter.position.set(phy.sx, phy.y, 0);
    st.halter.rotation.set(0, -0.35 + phy.yaw, -phy.sx * 0.07 + Math.max(-0.08, Math.min(0.08, phy.vy * 0.004)));
  }
  // Seile fangen die fallende Insel ab: Krümel und Figur springen hoch
  function stoesse(dt) {
    phy.cool -= dt;
    if (phy.zieh) { phy.vyAlt = phy.vy; return; }
    const a = (phy.vy - phy.vyAlt) / Math.max(dt, 0.001);
    if (phy.cool <= 0 && phy.vyAlt < -4 && a > 60) {
      const staerke = Math.min(1, -phy.vyAlt / 14);
      losreissen(Math.round(30 + 60 * staerke), Math.max(4, -phy.vyAlt * 0.6));
      fig.vy = Math.max(fig.vy, -phy.vyAlt * 0.35); phy.cool = 0.35;
    }
    phy.vyAlt = phy.vy;
  }

  /* ---------- Figur auf der Insel ---------- */
  function figurSetzen(aussehen) {
    st.aussehen = aussehen;
    if (!st.insel || !window.Figur) return;
    if (st.figur) st.insel.remove(st.figur);
    st.figur = Figur.bauen(aussehen); st.figur.scale.setScalar(0.85);
    const [x, z] = st.insel.userData.platz; st.figur.position.set(x, 0.24, z);
    st.insel.add(st.figur);
    Object.assign(fig, { modus: 'stehen', zeit: 0, weg: 0, y: 0, vy: 0 });
  }
  function figurSchritt(dt, t) {
    const f = st.figur; if (!f) return;
    const kurve = st.insel.userData.kurve;
    fig.zeit += dt;
    fig.vy -= 22 * dt; fig.y = Math.max(0, fig.y + fig.vy * dt); if (fig.y === 0 && fig.vy < 0) fig.vy = 0;
    const inLuft = fig.y > 0.05 || (phy.y > S0 + 0.15 && !phy.zieh);
    const uebungen = st.insel.userData.uebungen;
    if (uebungen) {
      // Kraft-Arena: Figur trainiert auf ihrer Matte, danach kurz ihre Animation
      if (fig.modus !== 'emote' && fig.zeit > 7) { fig.weg = (fig.weg + 1) % (uebungen.length + 1); fig.zeit = 0; }
      if (fig.modus === 'emote' && fig.zeit > 3.5) { fig.modus = 'stehen'; fig.zeit = 0; fig.weg = 0; }
      const u = uebungen[fig.weg];
      if (!u && fig.modus !== 'emote') { fig.modus = 'emote'; fig.zeit = 0; }
      f.position.y = 0.24 + fig.y;
      const ziel = u && u !== 'kniebeuge' ? st.insel.userData.blick : 0.6 - phy.yaw;
      f.rotation.y += (ziel - f.rotation.y) * Math.min(1, dt * 5);
      Figur.haltung(f, inLuft ? 'fliegen' : u || (st.aussehen && st.aussehen.emote) || 'winken', t);
      return;
    }
    if (fig.modus === 'stehen' && fig.zeit > 5 && kurve) { fig.modus = 'joggen'; fig.zeit = 0; }
    else if (fig.modus === 'joggen' && fig.zeit > 8) { fig.modus = 'emote'; fig.zeit = 0; }
    else if (fig.modus === 'emote' && fig.zeit > 3.5) { fig.modus = 'stehen'; fig.zeit = 0; }
    if (fig.modus === 'joggen' && kurve) {
      fig.weg = (fig.weg + dt * 0.04) % 1;
      const p = kurve.getPointAt(fig.weg), tan = kurve.getTangentAt(fig.weg);
      f.position.set(p.x, 0.24 + fig.y, p.z); f.rotation.y = Math.atan2(tan.x, tan.z);
      Figur.haltung(f, inLuft ? 'fliegen' : 'laufen', t, 0.8);
    } else {
      f.position.y = 0.24 + fig.y;
      const ziel = 0.6 - phy.yaw;                              // schaut zur Kamera
      f.rotation.y += (ziel - f.rotation.y) * Math.min(1, dt * 4);
      Figur.haltung(f, inLuft ? 'fliegen' : fig.modus === 'emote' ? (st.aussehen && st.aussehen.emote) || 'winken' : 'idle', t);
    }
  }

  /* ---------- Bühne ---------- */
  function aufbauen(el) {
    st.b = W.buehne(el);
    const halter = new T.Group(); st.b.szene.add(halter); st.halter = halter;
    seileBauen(); kruemelBauen();
    st.b.beiGroesse = (w, h) => {
      const k = st.b.kamera, weit = Math.max(1, 0.62 / (w / h));
      k.position.set(13 * weit, 17 * weit, 44 * weit); k.lookAt(0, 6 * weit, 0);
    };
    st.b.groesse();
    const ray = new T.Raycaster(), maus = new T.Vector2();
    let vorher = null;
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId);
      phy.zieh = { x: e.clientX, y: e.clientY, t: performance.now(), yaw: phy.yaw, sx: phy.sx, bewegt: false };
      vorher = { y: phy.y, yaw: phy.yaw, sx: phy.sx, t: performance.now() };
    });
    el.addEventListener('pointermove', e => {
      const z = phy.zieh; if (!z) return;
      const dx = e.clientX - z.x, dy = e.clientY - z.y;
      if (Math.hypot(dx, dy) > 6) z.bewegt = true;
      const jetzt = performance.now(), dt = Math.max(0.008, (jetzt - vorher.t) / 1000);
      // runter: Seile dehnen sich, wird immer schwerer. hoch: geht leichter, Seile werden schlaff
      const ny = dy > 0 ? -2.6 * (1 - Math.exp(-dy / 140)) : 3.4 * (1 - Math.exp(dy / 160));
      const nyaw = Math.max(-1.3, Math.min(1.3, z.yaw + dx * 0.007));
      const nsx = Math.max(-1.2, Math.min(1.2, z.sx + dx * 0.003));
      const vyNeu = (ny - vorher.y) / dt;
      // schnell runtergerissen: der Schnee bleibt kurz in der Luft und fällt dann wieder drauf
      if (vyNeu < -18 && phy.cool <= 0) { phy.vy = vyNeu * 0.3; losreissen(45, -vyNeu * 0.25); fig.vy = Math.max(fig.vy, 2); phy.cool = 0.45; }
      phy.vy = phy.vy * 0.5 + vyNeu * 0.5; phy.vyaw = (nyaw - vorher.yaw) / dt; phy.vsx = (nsx - vorher.sx) / dt;
      phy.y = ny; phy.yaw = nyaw; phy.sx = nsx;
      vorher = { y: ny, yaw: nyaw, sx: nsx, t: jetzt };
    });
    const los = e => {
      const z = phy.zieh; phy.zieh = null;
      if (z && !z.bewegt && performance.now() - z.t < 350 && st.beimTippen) {
        const r = el.getBoundingClientRect();
        maus.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(maus, st.b.kamera);
        const treffer = st.figur && ray.intersectObject(st.figur, true).length > 0;
        st.beimTippen(treffer ? 'figur' : 'insel');
      }
      phy.vy = Math.max(-40, Math.min(40, phy.vy)); phy.vyaw = Math.max(-6, Math.min(6, phy.vyaw)); phy.vsx = Math.max(-5, Math.min(5, phy.vsx));
      phy.vyAlt = phy.vy;
    };
    el.addEventListener('pointerup', los); el.addEventListener('pointercancel', los);
    st.b.jeBild = (dt, t) => {
      if (!st.insel) return;
      for (let n = 0; n < 4; n++) schritt(dt / 4, t);
      stoesse(dt);
      anwenden();
      st.insel.userData.tick.forEach(f => f(t));
      seileZeichnen();
      figurSchritt(dt, t);
      kruemelSchritt(dt);
    };
  }

  function inselSetzen(nr) {
    fotoCache = null;
    if (st.insel) st.halter.remove(st.insel);
    st.insel = insel(nr); st.halter.add(st.insel); st.nr = nr;
    Object.assign(phy, { y: 0, vy: 0, yaw: 0, vyaw: 0, sx: 0, vsx: 0, vyAlt: 0 }); anwenden();
    st.insel.updateMatrixWorld(true);
    FORMEN[st.insel.userData.form].ecken.forEach(([x, z], i) => {
      const s = st.seile[i]; s.lokal.set(x, (st.insel.userData.seilY || [])[i] || 0.42, z);
      const ecke = s.lokal.clone().applyMatrix4(st.insel.matrixWorld);
      s.anker.set(ecke.x * 1.08, ANKER_Y, ecke.z * 1.08); s.laenge = ecke.distanceTo(s.anker);
    });
    KR.mesh.material.color.set(st.insel.userData.def.kruemel);
    KR.teile.forEach((k, i) => { k.zustand = 'aus'; KR.mesh.setMatrixAt(i, KR.leer); });
    if (st.aussehen) figurSetzen(st.aussehen);
    phy.vy = -6;
  }

  /* ---------- Vorschaubilder für den Arena-Weg ---------- */
  let foto = null; const fotos = {};
  let fotoCache = null;
  async function bild(nr, set = 'lauf') {
    const key = set + nr;
    if (fotos[key]) return fotos[key];
    if (!foto) {
      const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setSize(480, 340, false); r.setPixelRatio(1);
      const s = new T.Scene(); s.add(new T.AmbientLight(0xffffff, 1.4));
      const l = new T.DirectionalLight(0xffffff, 2.2); l.position.set(-4, 10, 7); s.add(l);
      const k = new T.PerspectiveCamera(26, 480 / 340, 0.1, 100); k.position.set(10, 14, 25); k.lookAt(0, 1.8, 0);
      foto = { r, s, k };
    }
    const g = insel(nr, set); g.rotation.y = -0.35; g.userData.tick.forEach(f => f(1)); foto.s.add(g);
    foto.r.render(foto.s, foto.k);
    fotos[key] = foto.r.domElement.toDataURL('image/png');
    foto.s.remove(g);
    return fotos[key];
  }
  const bereit = async () => { W = window.WF3D; await W.laden(); T = W.T; };

  window.Arena3D = {
    sets: SETS,
    namen: (set = 'lauf') => (SETS[set] || ARENEN).map(a => a.name),
    async zeigen(el, nr, beimTippen, set = 'lauf') {
      try {
        await bereit();
        if (!st.b) aufbauen(el);
        st.beimTippen = beimTippen || null;
        if (st.nr !== nr || st.set !== set) { st.set = set; inselSetzen(nr); }
        el.classList.add('an');
        return true;
      } catch (err) { console.warn('Arena3D', err); return false; }
    },
    figur(aussehen) { st.aussehen = aussehen; if (st.insel) figurSetzen(aussehen); },
    pause(v) { if (st.b) st.b.pausiert = !!v; },
    bild: async (nr, set) => { await bereit(); return bild(nr, set); },
    // für Tests: Insel loslassen wie nach dem Hochziehen
    stoss(y) { phy.y = y; phy.vy = 0; },
    fliegend: () => KR.teile.filter(k => k.zustand !== 'aus').length
  };
})();
