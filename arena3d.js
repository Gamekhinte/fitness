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
  const C = { schnee: '#F5F0E4', erde: '#9C7448', erde2: '#7E5B37', bahn: '#D9643A', eis: '#BFE6FF', eis2: '#7CD4FF', wand: '#EADCC2',
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
  // Kegelstumpf in der Form der Insel: oben breit, unten schmal
  function stumpf(form, oben, unten, h) {
    let geo;
    if (form === 'quadrat') { geo = new T.CylinderGeometry(7.1 * oben, 7.1 * unten, h, 4, 1); geo.rotateY(Math.PI / 4); geo.scale(1.1, 1, 1); }
    else if (form === 'rund') geo = new T.CylinderGeometry(5.8 * oben, 5.8 * unten, h, 40, 1);
    else { geo = new T.CylinderGeometry(6 * oben, 6 * unten, h, 6, 1); geo.rotateY(Math.PI / 6); }
    return geo;
  }
  function sockel(g, form, oben, erde, erde2) {
    const f = FORMEN[form];
    g.add(teil(f.geo(1.2, 1), erde, 0, -0.5, 0, 0.06));
    g.add(teil(f.geo(0.4, 1.02), oben, 0, 0, 0, 0.05));
    // Felsbrocken darunter: wird nach unten schmaler, unregelmäßige Steine hängen dran
    g.add(teil(stumpf(form, 0.99, 0.62, 1.6), erde2, 0, -1.9, 0, 0.06));
    g.add(teil(stumpf(form, 0.62, 0.3, 1.2), erde2, 0, -3.3, 0, 0.06));
    [[0, 0, 1.35, 1.45], [-1.7, -0.8, 0.95, 1.5], [1.6, 0.9, 0.85, 1.4], [0.9, -1.5, 0.7, 1.1], [-1.2, 1.5, 0.75, 1.2], [2.6, -0.6, 0.55, 0.9], [-2.6, 0.5, 0.5, 0.8]].forEach(([x, z, r, st], i) => {
      const stein = new T.IcosahedronGeometry(r, 0); stein.scale(1, st, 1); stein.rotateY(i * 0.7);
      g.add(teil(stein, i % 2 ? erde2 : erde, x, -3.6 - r * st * 0.55 + (i ? 0.5 : 0), z, 0.05));
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

  /* ---------- Griechische Bausteine ---------- */
  const GR = { marmor: '#EDE6D6', marmor2: '#D6CDBA', terra: '#C4683A', terra2: '#A9573A', oliv: '#8FA06A', oliv2: '#6F8450', zyp: '#3E6B45',
    aegaeis: '#2F6FA8', meer: '#4F9FD8', weiss: '#FAF6EB', lehm: '#D8C49A', stein: '#B9B4AC', stein2: '#8E8A84', gold: '#F2C14E',
    bronze: '#B5803A', nacht: '#3A3540', styx: '#3FD0B8' };
  // Säule mit Fuß und Kapitell, gibt die Höhe der Oberkante zurück. kaputt: halbe Säule, Trommel liegt daneben.
  function saeule(g, x, z, h = 2.2, r = 0.2, f = GR.marmor, y0 = 0.2, kaputt = false) {
    g.add(teil(W.box(r * 2.7, 0.16, r * 2.7), f, x, y0 + 0.08, z, 0.03));
    const hh = kaputt ? h * 0.5 : h;
    g.add(teil(W.rohr(r, hh, 10, r * 1.1), f, x, y0 + 0.16 + hh / 2, z, 0.035));
    if (kaputt) { const s = W.rohr(r * 1.05, 0.34, 10); s.rotateZ(1.35); g.add(teil(s, f, x + 0.55, y0 + 0.22, z + 0.2, 0.03)); return y0 + 0.16 + hh; }
    g.add(teil(W.box(r * 2.9, 0.18, r * 2.9), f, x, y0 + 0.16 + hh + 0.09, z, 0.03));
    return y0 + 0.16 + hh + 0.18;
  }
  // Tempel: zwei Stufen, Säulen vorne und hinten, Gebälk, Fries, Giebeldach
  function tempel(g, x, z, w, d, h, o = {}) {
    const f = o.farbe || GR.marmor, grp = new T.Group(); grp.position.set(x, o.y0 || 0.2, z); grp.rotation.y = o.rot || 0; g.add(grp);
    grp.add(teil(W.box(w + 0.7, 0.2, d + 0.7), o.farbe2 || GR.marmor2, 0, 0.1, 0, 0.03));
    grp.add(teil(W.box(w + 0.35, 0.2, d + 0.35), f, 0, 0.3, 0, 0.03));
    const n = o.n || 4, r = o.r || 0.17; let top = 0;
    for (const zz of [-d / 2 + 0.25, d / 2 - 0.25]) for (let i = 0; i < n; i++) top = saeule(grp, -w / 2 + 0.25 + i * (w - 0.5) / (n - 1), zz, h, r, f, 0.4);
    if (o.cella) grp.add(teil(W.box(w - 1.0, h, d - 0.9), o.cella, 0, 0.4 + h / 2, 0, 0.03));
    grp.add(teil(W.box(w + 0.15, 0.26, d + 0.15), f, 0, top + 0.13, 0, 0.03));
    grp.add(teil(W.box(w + 0.2, 0.14, d + 0.2), o.fries || GR.terra, 0, top + 0.33, 0, 0.025));
    const gh = Math.min(0.9, w * 0.22), s = new T.Shape(); s.moveTo(-w / 2 - 0.25, 0); s.lineTo(w / 2 + 0.25, 0); s.lineTo(0, gh); s.closePath();
    grp.add(teil(new T.ExtrudeGeometry(s, { depth: d + 0.4, bevelEnabled: false }), o.dach || f, 0, top + 0.4 + gh / 2, 0, 0.04));
    grp.add(teil(W.kugel(0.12), GR.gold, 0, top + 0.45 + gh, d / 2 + 0.15, 0.02));
    return grp;
  }
  function olivenbaum(g, x, z, s = 1) {
    const st = teil(W.rohr(0.09 * s, 1.0 * s, 7, 0.17 * s), '#7A5A3A', x, 0.2 + 0.5 * s, z, 0.03); st.rotation.z = 0.15; g.add(st);
    [[0.12, 1.15, 0, 0.6], [-0.4, 1.0, 0.18, 0.45], [0.5, 0.98, -0.2, 0.42], [0, 1.4, -0.15, 0.4]].forEach(([dx, dy, dz, r], i) => {
      const k = W.kugel(r * s, 10, 8); k.scale(1, 0.68, 1); g.add(teil(k, i % 2 ? GR.oliv : GR.oliv2, x + dx * s, 0.2 + dy * s, z + dz * s, 0.04));
    });
  }
  function zypresse(g, x, z, s = 1) {
    g.add(teil(W.rohr(0.07 * s, 0.3 * s, 6), '#6B4A2E', x, 0.2 + 0.15 * s, z, 0.02));
    const k = W.kugel(0.38 * s, 10, 10); k.scale(1, 3.4, 1); g.add(teil(k, GR.zyp, x, 0.2 + 0.3 * s + 1.29 * s, z, 0.04));
  }
  function amphore(g, x, z, s = 1, f = GR.terra, y0 = 0.2) {
    const pts = [[0, 0], [0.1, 0.02], [0.19, 0.14], [0.22, 0.3], [0.17, 0.48], [0.08, 0.6], [0.07, 0.68], [0.11, 0.72], [0, 0.72]].map(([a, b]) => new T.Vector2(a * s, b * s));
    g.add(teil(new T.LatheGeometry(pts, 12), f, x, y0 + 0.36 * s, z, 0.025));
    const band = new T.TorusGeometry(0.21 * s, 0.025 * s, 4, 14); band.rotateX(Math.PI / 2); g.add(teil(band, C.ink, x, y0 + 0.3 * s, z, 0));
  }
  // Statue auf Sockel mit erhobenem Arm (Marmor, Gold oder Bronze)
  function statue(g, x, z, s = 1, f = GR.marmor, rot = 0) {
    const grp = new T.Group(); grp.position.set(x, 0.2, z); grp.rotation.y = rot; g.add(grp);
    grp.add(teil(W.box(0.7 * s, 0.5 * s, 0.7 * s), GR.marmor2, 0, 0.25 * s, 0, 0.03));
    grp.add(teil(new T.CapsuleGeometry(0.2 * s, 0.55 * s, 4, 10), f, 0, 0.98 * s, 0, 0.03));
    grp.add(teil(W.kugel(0.17 * s, 12, 10), f, 0, 1.58 * s, 0, 0.03));
    const a = teil(new T.CapsuleGeometry(0.07 * s, 0.45 * s, 4, 8), f, 0.3 * s, 1.5 * s, 0, 0.02); a.rotation.z = -0.45; grp.add(a);
    const a2 = teil(new T.CapsuleGeometry(0.07 * s, 0.4 * s, 4, 8), f, -0.26 * s, 1.1 * s, 0, 0.02); a2.rotation.z = 0.2; grp.add(a2);
    return grp;
  }
  function wolke(g, x, y, z, s = 1) {
    const grp = new T.Group(); grp.position.set(x, y, z); g.add(grp);
    [[0, 0, 0, 0.55], [0.55, -0.1, 0.1, 0.42], [-0.55, -0.1, -0.05, 0.45], [0.2, 0.25, -0.1, 0.4]].forEach(([dx, dy, dz, r]) => grp.add(teil(W.kugel(r * s, 12, 10), GR.weiss, dx * s, dy * s, dz * s, 0.03)));
    return grp;
  }
  // Weißes Haus mit blauer Kuppel, Tür und Fenster wie auf den Inseln der Ägäis
  function weissesHaus(g, x, z, w, h, d, kuppel = true, rot = 0) {
    const grp = new T.Group(); grp.position.set(x, 0.2, z); grp.rotation.y = rot; g.add(grp);
    grp.add(teil(W.box(w, h, d), GR.weiss, 0, h / 2, 0, 0.04));
    grp.add(teil(W.box(w + 0.1, 0.1, d + 0.1), GR.weiss, 0, h + 0.05, 0, 0.02));
    const r = Math.min(w, d) * 0.38;
    if (kuppel) grp.add(teil(new T.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), GR.aegaeis, 0, h + 0.1 + r / 2, 0, 0.03));
    grp.add(teil(W.box(0.4, 0.7, 0.05), GR.aegaeis, -w * 0.2, 0.35, d / 2 + 0.01, 0.02));
    grp.add(teil(W.box(0.3, 0.3, 0.05), GR.aegaeis, w * 0.22, h * 0.62, d / 2 + 0.01, 0.015));
    return grp;
  }
  function schaf(g, x, z, rot = 0) {
    const grp = new T.Group(); grp.position.set(x, 0.2, z); grp.rotation.y = rot; g.add(grp);
    [[0, 0.42, 0, 0.3], [0.22, 0.4, 0.05, 0.22], [-0.22, 0.4, -0.02, 0.22], [0, 0.55, 0.05, 0.22]].forEach(([dx, dy, dz, r]) => grp.add(teil(W.kugel(r, 10, 8), GR.weiss, dx, dy, dz, 0.03)));
    grp.add(teil(W.kugel(0.13, 10, 8), C.ink, 0.42, 0.5, 0, 0.015));
    [[-0.15, -0.1], [0.15, -0.1], [-0.15, 0.1], [0.15, 0.1]].forEach(([dx, dz]) => grp.add(teil(W.rohr(0.035, 0.24, 6), C.ink, dx, 0.12, dz, 0)));
    return grp;
  }
  function mauer(g, a, b, h = 0.6, f = GR.stein, dicke = 0.35) {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    const m = teil(W.box(len + dicke, h, dicke), f, (a[0] + b[0]) / 2, 0.2 + h / 2, (a[1] + b[1]) / 2, 0.035); m.rotation.y = -Math.atan2(dz, dx); g.add(m); return m;
  }
  // Feuerschale auf drei Beinen, die Flamme flackert
  function feuerschale(g, x, z, farbe = 0xFF8A2E, y0 = 0.2) {
    [0, 1, 2].forEach(i => { const w = i / 3 * Math.PI * 2, b = teil(W.rohr(0.035, 0.75, 5), C.ink, x + Math.cos(w) * 0.14, y0 + 0.37, z + Math.sin(w) * 0.14, 0); b.rotation.set(Math.sin(w) * 0.22, 0, -Math.cos(w) * 0.22); g.add(b); });
    g.add(teil(W.rohr(0.3, 0.16, 12, 0.18), GR.bronze, x, y0 + 0.8, z, 0.025));
    const fl = new T.Mesh(W.kegel(0.22, 0.55, 7), new T.MeshBasicMaterial({ color: farbe })); fl.position.set(x, y0 + 1.15, z); g.add(fl);
    const fl2 = new T.Mesh(W.kegel(0.12, 0.35, 6), new T.MeshBasicMaterial({ color: 0xFFE38A })); fl2.position.set(x, y0 + 1.05, z); g.add(fl2);
    const ph = x * 3 + z;
    g.userData.tick.push(t => { const k = 0.85 + 0.25 * Math.abs(Math.sin(t * 9 + ph)); fl.scale.set(1, k, 1); fl2.scale.set(1, 1.95 - k, 1); });
  }
  const blumen = (g, liste) => liste.forEach(([x, z], i) => g.add(teil(W.kugel(0.09), [GR.gold, '#E86AA6', GR.weiss, '#D9643A'][i % 4], x, 0.28, z, 0.01)));

  /* ---------- Die zehn Lauf-Arenen: von der Hirtenweide bis auf den Olymp ---------- */
  const ARENEN = [
    { name: 'Hirtenweide', form: 'quadrat', oben: '#9CC27A', kruemel: '#9CC27A', bau(g) {
      const kurve = weg(g, [[-3.6, 1], [-2.6, 3.6], [1.6, 3.9], [3.8, 2.4], [3.2, 0.2], [0, -0.4], [-3, -0.5]], 1.15, GR.lehm, '#F5F0E4');
      const h = haus(g, 0.4, -3.6, 3.4, 1.8, 1.6, GR.lehm, GR.terra, false);
      h.add(teil(W.box(0.7, 1.1, 0.08), '#7A5A3A', 0, 0.55, 0.82, 0.02)); fenster(h, [-1.1, 1.1], [1.0], 0.82, '#7A5A3A');
      mauer(g, [-5.0, -2.2], [-5.0, 3.0], 0.55); mauer(g, [-5.0, 3.0], [-3.4, 4.6], 0.55);
      schaf(g, 1.4, 1.8, 0.4); schaf(g, 2.2, 1.0, -0.6); schaf(g, 0.9, 0.9, 2.2);
      olivenbaum(g, -4.3, -3.9); olivenbaum(g, 4.5, -3.6, 0.9); zypresse(g, 4.7, 4.4, 0.8); zypresse(g, 3.0, -4.5, 0.7);
      amphore(g, 2.6, -2.5, 1.1); amphore(g, 3.05, -2.65, 0.85);
      g.add(teil(W.rohr(0.55, 0.55, 14), GR.stein, -4.2, 0.47, -2.0, 0.03)); g.add(teil(W.rohr(0.42, 0.06, 14), C.wasser, -4.2, 0.76, -2.0, 0));
      [-0.45, 0.45].forEach(d => g.add(teil(W.rohr(0.04, 1.1, 6), '#7A5A3A', -4.2 + d, 1.25, -2.0, 0.01))); g.add(teil(W.box(1.1, 0.08, 0.5), GR.terra, -4.2, 1.82, -2.0, 0.02));
      blumen(g, [[-1.8, 2.4], [2.6, 3.0], [-0.6, 4.6], [4.6, 1.0], [-2.2, 1.6], [0.6, 2.8]]);
      return { kurve, platz: [-0.4, 1.8] };
    } },
    { name: 'Olivenhain', form: 'rund', oben: '#A7B86E', kruemel: '#A7B86E', bau(g) {
      const kurve = weg(g, [[-3.6, 0.6], [-2.4, 3.4], [0.8, 3.8], [3.6, 2], [3.6, -1.2], [1.2, -1.6], [-0.6, -3.2], [-3.2, -2.6]], 1.0, GR.lehm);
      // Ölmühle: der Mühlstein dreht sich im Kreis
      g.add(teil(W.rohr(1.0, 0.35, 18), GR.stein, 0.6, 0.38, 0.6, 0.03));
      const muehle = new T.Group(); muehle.position.set(0.6, 0.55, 0.6); g.add(muehle);
      const ms = W.rohr(0.42, 0.22, 16); ms.rotateZ(Math.PI / 2); muehle.add(teil(ms, GR.stein2, 0.45, 0.3, 0, 0.03));
      const achse = W.rohr(0.05, 1.4, 6); achse.rotateZ(Math.PI / 2); muehle.add(teil(achse, '#7A5A3A', 0.2, 0.3, 0, 0.01));
      g.userData.tick.push(t => { muehle.rotation.y = t * 0.6; });
      [[-2.6, 0.3], [-2.2, -0.2], [-2.9, -0.3]].forEach(([x, z], i) => amphore(g, x, z, 1 - i * 0.15));
      [[-3.4, -3.6], [3.6, -3.2], [-4.6, 2.2], [2.6, 4.2], [0.2, -4.6], [-1.6, -4.4], [4.7, 0.6], [-4.6, -1.2], [1.9, -3.7]].forEach(([x, z], i) => olivenbaum(g, x, z, 0.85 + (i % 3) * 0.12));
      bank(g, -0.6, -2.0, 0.2);
      feuerschale(g, -1, 2.2); feuerschale(g, 2.6, -2.2);
      return { kurve, platz: [-1.2, 3.3] };
    } },
    { name: 'Ägäis-Strand', form: 'quadrat', oben: C.sand, kruemel: C.sand, bau(g) {
      const meer = new T.PlaneGeometry(5.6, 4.4, 20, 14); meer.rotateX(-Math.PI / 2);
      const wm = new T.Mesh(meer, W.mat(GR.meer)); wm.position.set(2.75, 0.27, -2.75); g.add(wm);
      const basis = meer.attributes.position.array.slice();
      g.userData.tick.push(t => { const p = meer.attributes.position; for (let i = 0; i < p.count; i++) p.array[i * 3 + 1] = Math.sin(basis[i * 3] * 1.6 + t * 1.8) * 0.05 + Math.cos(basis[i * 3 + 2] * 1.3 + t) * 0.04; p.needsUpdate = true; });
      for (let i = 0; i < 3; i++) g.add(teil(W.box(5.4, 0.04, 0.1), '#F5F0E4', 2.75, 0.33, -1.0 - i * 1.3, 0));
      const kurve = weg(g, [[-4.4, 4], [-1, 4.2], [2.6, 3.8], [4.4, 2.4], [3, 1.2], [-0.6, 1.3], [-3.8, 0.6], [-4.6, 2.4]], 1.1, C.holz, '#8A6235');
      weissesHaus(g, -3.4, -1.9, 1.6, 1.3, 1.4, true); weissesHaus(g, -1.9, -3.4, 1.4, 1.0, 1.2, false); weissesHaus(g, -4.3, -3.8, 1.2, 1.7, 1.1, true);
      // Segelboot schaukelt vor der Küste
      const boot = new T.Group(); g.add(boot);
      const rumpf = W.kugel(0.5, 12, 8); rumpf.scale(2.2, 0.55, 0.9); boot.add(teil(rumpf, '#7A5A3A', 0, 0.05, 0, 0.03));
      boot.add(teil(W.box(1.9, 0.08, 0.7), '#A97A4A', 0, 0.28, 0, 0.02));
      boot.add(teil(W.rohr(0.04, 1.6, 6), '#7A5A3A', 0, 1.0, 0, 0.01));
      boot.add(teil(W.box(0.05, 1.0, 1.1), GR.weiss, 0.05, 1.15, 0, 0.02)); boot.add(teil(W.box(0.06, 0.18, 1.12), GR.terra, 0.06, 1.15, 0, 0));
      g.userData.tick.push(t => { boot.position.set(2.9 + Math.sin(t * 0.3) * 1.2, 0.3 + Math.sin(t * 1.6) * 0.05, -3.1); boot.rotation.z = Math.sin(t * 1.3) * 0.06; });
      olivenbaum(g, -0.6, -4.3, 0.8); zypresse(g, 4.7, 4.5, 0.8);
      amphore(g, -2.4, 2.6, 1.1); amphore(g, -2.0, 2.8, 0.8);
      g.add(teil(W.rohr(0.04, 1.6, 6), C.ink, 3.6, 1.0, 4.4, 0.015)); g.add(teil(W.kegel(0.9, 0.4, 10), '#D8B27A', 3.6, 1.85, 4.4, 0.03));
      g.add(teil(W.box(0.8, 0.03, 1.4), GR.aegaeis, 2.4, 0.22, 4.5, 0.015));
      return { kurve, platz: [0.4, 2.6] };
    } },
    { name: 'Zypressenpfad', form: 'sechseck', oben: '#8DB36A', kruemel: '#8DB36A', bau(g) {
      const kurve = weg(g, [[-3.4, 2.2], [-1, 3.8], [2.2, 3.2], [3.6, 0.4], [2.4, -2.6], [-0.6, -2.4], [-1.8, -0.2], [-3.8, -0.6]], 0.95, GR.lehm);
      g.add(new T.Mesh(W.band([[-5, -3.2], [-2, -1.4], [0.4, -0.6], [2.6, 0.8], [5, 1.8]], 0.8, 0.226, false), W.mat(C.wasser)));
      g.add(teil(W.box(1.4, 0.14, 1.3), GR.stein, 2.9, 0.42, 0.95, 0.03)); [-0.6, 0.6].forEach(d => g.add(teil(W.box(1.4, 0.22, 0.12), GR.marmor2, 2.9, 0.58, 0.95 + d, 0.02)));
      tempel(g, -2.4, -3.5, 2.0, 1.4, 1.2, { n: 3, r: 0.13, rot: 0.3 });
      statue(g, 0.6, 4.4, 0.8, GR.marmor, Math.PI);
      [[-4.4, 1], [-4.2, 3], [-2.6, 4.4], [4.2, -1.6], [4.6, 1.2], [3.6, 3.6], [1, -4.4], [3, -3.8], [-4.4, -2.2], [0.6, 2.0]].forEach(([x, z], i) => zypresse(g, x, z, 0.7 + (i % 4) * 0.1));
      blumen(g, [[-1.2, 1.4], [1.4, 1.6], [0.2, 0.8], [-2.2, 1.2]]);
      return { kurve, platz: [-2.4, 1.8] };
    } },
    { name: 'Stadion von Delphi', form: 'quadrat', oben: '#7FAE62', kruemel: '#E3C58C', bau(g) {
      const bahn = W.rundRechteck(9.4, 6, 3); bahn.holes.push(W.rundRechteck(6.6, 3.2, 1.6));
      g.add(teil(W.flach(bahn, 0.1), '#E3C58C', 0, 0.26, 0.3, 0.03));
      const weiss = new T.MeshBasicMaterial({ color: 0xF5F0E4 });
      for (let i = 1; i < 4; i++) { const w = 6.6 + i * 0.7, h = 3.2 + i * 0.7, r = 1.6 + i * 0.35; const s = W.rundRechteck(w + 0.05, h + 0.05, r); s.holes.push(W.rundRechteck(w - 0.05, h - 0.05, r - 0.03)); const m = new T.Mesh(W.flach(s, 0.02), weiss); m.position.set(0, 0.32, 0.3); g.add(m); }
      const kurve = W.band(ovalPunkte(0, 0.3, 4.05, 2.35, 24), 0.1, 0.3).userData.kurve;
      g.add(new T.Mesh(W.band([[0, -1.3], [0, 1.9]], 0.05, 0.25, false), weiss));
      // Steinerne Ränge mit Zuschauern, die hüpfen
      [-4.35, 4.55].forEach((z, k) => { for (let r = 0; r < 3; r++) g.add(teil(W.box(9.6, 0.35 + r * 0.35, 0.45), r % 2 ? GR.marmor : GR.marmor2, 0, 0.38 + r * 0.17, z + (k ? r * 0.15 : -r * 0.15), 0.03)); });
      const farben = ['#D9643A', '#3FA9E6', '#F2C14E', '#3E7A55', '#F5F0E4', '#E86AA6'];
      const inst = new T.InstancedMesh(W.kugel(0.14, 8, 6), new T.MeshToonMaterial({ color: 0xF5F0E4 }), 90);
      const m4 = new T.Matrix4(), fans = []; let n = 0;
      [[-4.35, -1], [4.55, 1]].forEach(([z, s]) => { for (let r = 0; r < 3; r++) for (let i = 0; i < 15; i++) { const p = [-4.3 + i * 0.6 + (r % 2) * 0.25, 0.75 + r * 0.35, z + s * r * 0.15]; m4.makeTranslation(...p); inst.setMatrixAt(n, m4); inst.setColorAt(n, new T.Color(farben[(i * 7 + r * 3) % farben.length])); fans.push([...p, i + r * 2]); n++; } });
      g.add(inst);
      g.userData.tick.push(t => { fans.forEach(([x, y, z, k], i) => { m4.makeTranslation(x, y + Math.max(0, Math.sin(t * 4 + k)) * 0.1, z); inst.setMatrixAt(i, m4); }); inst.instanceMatrix.needsUpdate = true; });
      // Säulen mit Feuer an den Ecken, Siegertor mit Lorbeerkranz am Ziel
      [[-5, -4.4], [5, -4.4], [-5, 4.6], [5, 4.6]].forEach(([x, z]) => { const top = saeule(g, x, z, 2.6, 0.18); feuerschale(g, x, z, 0xFF8A2E, top - 0.2); });
      [-1.1, 1.1].forEach(x => saeule(g, x, -4.85, 2.3, 0.16));
      g.add(teil(W.box(2.8, 0.26, 0.5), GR.marmor, 0, 3.0, -4.85, 0.03));
      const kranz = new T.TorusGeometry(0.42, 0.07, 6, 20); g.add(teil(kranz, GR.gold, 0, 3.6, -4.8, 0.02));
      return { kurve, platz: [0, 0.3] };
    } },
    { name: 'Agora', form: 'quadrat', oben: '#DCC9A0', erde: GR.terra, erde2: GR.terra2, kruemel: '#DCC9A0', bau(g) {
      for (let i = -4; i <= 4; i++) g.add(teil(W.box(0.03, 0.01, 10), '#C8B488', i * 1.2, 0.206, 0, 0));
      const kurve = weg(g, [[-4, 3.6], [0, 4], [3.8, 3.4], [4, 0], [1.4, -0.6], [-1, 0.6], [-4, 0.2]], 0.9, GR.marmor2, GR.terra);
      // Stoa: Säulenhalle hinten
      g.add(teil(W.box(10.6, 2.4, 0.3), GR.marmor2, 0, 1.4, -4.7, 0.04));
      let top = 0; for (let i = 0; i < 9; i++) top = saeule(g, -4.6 + i * 1.15, -3.8, 2.0, 0.16);
      g.add(teil(W.box(10.4, 0.24, 1.3), GR.marmor, 0, top + 0.12, -4.2, 0.03));
      g.add(teil(W.box(10.5, 0.14, 1.35), GR.terra, 0, top + 0.31, -4.2, 0.02));
      // Marktstände mit gestreiften Sonnendächern
      [[2.9, -2.2, '#D9643A'], [4.5, -2.4, '#2F6FA8']].forEach(([x, z, f]) => {
        [[-0.55, -0.4], [0.55, -0.4], [-0.55, 0.4], [0.55, 0.4]].forEach(([dx, dz]) => g.add(teil(W.rohr(0.04, 1.5, 6), '#7A5A3A', x + dx, 0.95, z + dz, 0.01)));
        for (let k = 0; k < 4; k++) g.add(teil(W.box(0.32, 0.06, 1.0), k % 2 ? GR.weiss : f, x - 0.48 + k * 0.32, 1.72, z, 0.015));
        g.add(teil(W.box(1.2, 0.08, 0.8), '#A97A4A', x, 0.75, z, 0.02));
        [[-0.3, GR.gold], [0, '#D9643A'], [0.3, '#8CC084']].forEach(([dx, c]) => g.add(teil(W.kugel(0.1), c, x + dx, 0.88, z, 0.01)));
      });
      amphore(g, 3.7, -1.3, 0.9); amphore(g, 4.1, -1.2, 0.7);
      // Brunnen mit Wasserstrahl
      g.add(teil(W.rohr(0.85, 0.4, 18), GR.marmor, -2.0, 0.4, -1.8, 0.03)); g.add(teil(W.rohr(0.72, 0.06, 18), C.wasser, -2.0, 0.6, -1.8, 0));
      g.add(teil(W.rohr(0.14, 1.0, 10), GR.marmor, -2.0, 1.0, -1.8, 0.02)); g.add(teil(W.rohr(0.35, 0.1, 12), GR.marmor, -2.0, 1.52, -1.8, 0.02));
      const strahl = new T.Mesh(W.kegel(0.1, 0.4, 6), new T.MeshBasicMaterial({ color: 0xBFE6FF })); strahl.position.set(-2.0, 1.8, -1.8); g.add(strahl);
      g.userData.tick.push(t => { strahl.scale.y = 0.8 + 0.3 * Math.abs(Math.sin(t * 4)); });
      statue(g, -4.5, -2.4, 0.9, GR.bronze, 0.6);
      return { kurve, platz: [-1.8, 2.6] };
    } },
    { name: 'Labyrinth von Kreta', form: 'sechseck', oben: '#D9C79A', erde: '#A98E5A', erde2: '#8A7448', kruemel: '#D9C79A', bau(g) {
      const kurve = weg(g, [[-3.6, 1.6], [-1.2, 3.6], [2.2, 3.2], [3.4, 0.6], [1.2, -0.8], [-1.2, -0.2], [-3.4, -1.2]], 0.95, '#C9A86A');
      // Steinmauern des Labyrinths, hinten auf der Insel
      const MW = '#BFA676';
      [[[-4.0, -2.2], [-1.0, -2.2]], [[0.2, -2.2], [3.4, -2.2]], [[-3.0, -3.2], [2.4, -3.2]], [[-2.0, -4.2], [1.6, -4.2]],
       [[-1.0, -2.2], [-1.0, -3.2]], [[3.4, -2.2], [3.4, -3.4]], [[-3.0, -3.2], [-3.0, -4.0]], [[1.6, -4.2], [2.6, -3.9]]].forEach(([a, b]) => mauer(g, a, b, 1.0, MW, 0.3));
      // Statue des Minotauros in der Mitte
      const m = statue(g, 0.2, -3.7, 0.75, GR.bronze);
      [-1, 1].forEach(s => { const horn = W.kegel(0.06, 0.32, 6); const h = teil(horn, GR.weiss, s * 0.16, 1.42, 0, 0.01); h.rotation.z = -s * 0.9; m.add(h); });
      // Ariadnes roter Faden führt hinein
      const faden = new T.CatmullRomCurve3([[-3.6, 0.24, -0.2], [-3.0, 0.24, -1.6], [-1.6, 0.24, -1.8], [-0.4, 0.24, -2.7], [0.2, 0.24, -3.3]].map(p => new T.Vector3(...p)));
      g.add(new T.Mesh(new T.TubeGeometry(faden, 40, 0.03, 5), W.mat('#C4472D')));
      feuerschale(g, 4.1, -1.4); feuerschale(g, -4.3, -1.0);
      saeule(g, 4.3, 2.4, 1.8, 0.18, GR.marmor, 0.2, true); saeule(g, -2.2, 1.2, 1.6, 0.16, GR.marmor, 0.2, true);
      return { kurve, platz: [0.4, 2.2] };
    } },
    { name: 'Unterwelt', form: 'rund', oben: GR.nacht, erde: '#2A2630', erde2: '#1E1B22', kruemel: '#6E6A75', bau(g) {
      // Der Fluss Styx leuchtet, Charons Boot fährt darauf
      const styxMat = new T.MeshBasicMaterial({ color: 0x3FD0B8 });
      const fluss = W.band([[-5.4, 1.8], [-2.4, 0.6], [0.4, 1.2], [2.6, 0], [5.4, -0.8]], 0.75, 0.226, false);
      g.add(new T.Mesh(fluss, styxMat));
      g.userData.tick.push(t => { styxMat.color.setHSL(0.47, 0.6, 0.5 + Math.sin(t * 1.5) * 0.06); });
      const boot = new T.Group(); g.add(boot);
      const rumpf = W.kugel(0.35, 10, 8); rumpf.scale(2.0, 0.5, 0.9); boot.add(teil(rumpf, '#2A2625', 0, 0, 0, 0.02));
      boot.add(teil(W.rohr(0.025, 0.9, 5), '#2A2625', 0.45, 0.45, 0, 0));
      const laterne = new T.Mesh(W.kugel(0.09, 8, 6), new T.MeshBasicMaterial({ color: 0x9FF4E8 })); laterne.position.set(0.45, 0.92, 0); boot.add(laterne);
      const k = fluss.userData.kurve;
      g.userData.tick.push(t => { const u = (t * 0.04) % 1, p = k.getPointAt(u), q = k.getTangentAt(u); boot.position.set(p.x, 0.32 + Math.sin(t * 2) * 0.03, p.z); boot.rotation.y = -Math.atan2(q.z, q.x); });
      g.add(teil(W.box(1.3, 0.14, 1.1), GR.stein2, -0.9, 0.42, 0.85, 0.03));
      const kurve = weg(g, [[-3.6, 3], [0, 4.2], [3.4, 3], [3.6, 1.6], [0, 2.4], [-3.4, 2.2]], 0.85, '#5A5560');
      // Tor zur Unterwelt mit blauem Feuer, dahinter der Palast des Hades
      tempel(g, 0.4, -3.7, 3.4, 1.6, 1.7, { n: 4, farbe: '#4A4552', farbe2: '#3A3540', fries: '#2A2630', dach: '#2E2A33' });
      [-1.2, 2.0].forEach(x => { const top = saeule(g, x, -1.8, 1.8, 0.2, '#4A4552'); feuerschale(g, x, -1.8, 0x4FC8FF, top - 0.2); });
      g.add(teil(W.box(3.8, 0.3, 0.5), '#4A4552', 0.4, 2.45, -1.8, 0.03));
      // Kahle schwarze Bäume
      [[-3.8, -1.8], [3.9, -2.4], [-4.4, 0.4]].forEach(([x, z], i) => {
        g.add(teil(W.rohr(0.08, 1.6, 6, 0.14), '#1E1B22', x, 1.0, z, 0.02));
        [[0.35, 1.5, 0.6], [-0.3, 1.3, -0.7], [0.1, 1.75, 0.2]].forEach(([dx, y, rz]) => { const a = teil(W.rohr(0.03, 0.7, 5), '#1E1B22', x + dx, y, z, 0); a.rotation.z = rz; g.add(a); });
      });
      const rauch = [0, 1, 2, 3].map(() => { const r = new T.Mesh(W.kugel(0.4, 10, 8), new T.MeshToonMaterial({ color: 0x5A5560, transparent: true })); g.add(r); return r; });
      g.userData.tick.push(t => rauch.forEach((r, i) => { const p = (t * 0.3 + i / 4) % 1; r.position.set(0.4 + Math.sin(p * 4 + i) * 0.4, 3.0 + p * 2.6, -3.7); r.scale.setScalar(0.5 + p * 1.3); r.material.opacity = 0.8 * (1 - p); }));
      [[4.2, 2.4, 0.4], [-2.2, -3.6, 0.45]].forEach(([x, z, r]) => g.add(teil(new T.DodecahedronGeometry(r, 0), '#2A2625', x, 0.2 + r * 0.7, z, 0.03)));
      return { kurve, platz: [0, 3.6] };
    } },
    { name: 'Akropolis', form: 'quadrat', oben: '#CFC5AE', erde: '#A98E5A', erde2: '#8A7448', kruemel: '#CFC5AE', bau(g) {
      const kurve = weg(g, [[-4, 3.6], [-1, 2.4], [2.4, 3.8], [4, 1.6], [1.4, 0.2], [-2.2, 0.8], [-4.2, 0.6]], 0.85, GR.marmor2);
      // Felsen mit Stufen, oben der große Tempel
      g.add(teil(W.box(10.6, 0.4, 3.4), '#B9AD92', 0, 0.4, -3.2, 0.04));
      g.add(teil(W.box(8.4, 0.4, 2.8), '#C9BEA4', 0.2, 0.8, -3.4, 0.04));
      for (let i = 0; i < 4; i++) g.add(teil(W.box(1.6, 0.2, 0.3), GR.marmor2, 0.2, 0.3 + i * 0.2, -1.35 - i * 0.15, 0.02));
      tempel(g, 0.2, -3.45, 5.0, 2.2, 1.6, { n: 6, y0: 1.0, cella: GR.marmor2 });
      statue(g, -4.0, -0.9, 1.35, GR.gold, 0.4);
      olivenbaum(g, 4.6, -0.6, 0.9); olivenbaum(g, -4.7, 4.5, 0.8); zypresse(g, 4.7, 4.4, 0.7);
      saeule(g, 3.6, -1.2, 1.6, 0.17, GR.marmor, 0.2, true); saeule(g, -2.6, -1.3, 1.6, 0.17, GR.marmor, 0.2, true);
      return { kurve, platz: [0.2, 2.6] };
    } },
    { name: 'Olymp', form: 'rund', oben: '#F5F0E4', erde: '#E9E2D2', erde2: '#D6CDBA', kruemel: '#FAF6EB', bau(g) {
      const kurve = weg(g, ovalPunkte(0, 1.4, 3.9, 2.6, 18), 0.8, GR.gold, '#F5F0E4');
      // Goldener Tempel der Götter, Throne, Wolken
      tempel(g, 0, -3.8, 4.2, 1.8, 1.8, { n: 5, fries: GR.gold, dach: GR.weiss, cella: '#F2E3B8' });
      [[-4.1, -2.0, 0.5], [4.1, -2.0, -0.5]].forEach(([x, z, r]) => {
        const t = new T.Group(); t.position.set(x, 0.2, z); t.rotation.y = r; g.add(t);
        t.add(teil(W.box(1.0, 0.5, 0.9), GR.gold, 0, 0.25, 0, 0.03)); t.add(teil(W.box(1.0, 1.4, 0.2), GR.gold, 0, 1.0, -0.4, 0.03));
        [-0.45, 0.45].forEach(dx => t.add(teil(W.box(0.12, 0.3, 0.8), GR.gold, dx, 0.65, 0, 0.02)));
        t.add(teil(W.box(0.8, 0.12, 0.7), '#C4472D', 0, 0.56, 0.05, 0.01));
      });
      [[-4.4, 2.6], [4.4, 2.6]].forEach(([x, z]) => saeule(g, x, z, 2.2, 0.17, GR.gold));
      [[-4.9, 0.3, 0.6, 0.9], [4.9, 0.2, -0.6, 0.8], [-2.8, 0.25, 4.7, 0.7], [3.0, 0.3, 4.6, 0.75], [0, 0.3, 5.2, 0.6]].forEach(([x, y, z, s]) => wolke(g, x, y, z, s));
      const schweben = [[-3.2, 4.6, -1.2, 0.8], [3.4, 5.2, -0.6, 0.9], [0.6, 6.0, 1.8, 0.7]].map(([x, y, z, s]) => [wolke(g, x, y, z, s), y]);
      g.userData.tick.push(t => schweben.forEach(([w, y], i) => { w.position.y = y + Math.sin(t * 0.7 + i * 2) * 0.2; }));
      // Ab und zu zuckt ein Blitz über dem Tempel
      const zick = new T.CatmullRomCurve3([[-0.8, 7.2, -3.8], [-0.3, 6.4, -3.8], [-0.7, 6.0, -3.8], [0.1, 5.2, -3.8], [-0.2, 4.9, -3.8], [0.3, 4.2, -3.8]].map(p => new T.Vector3(...p)), false, 'catmullrom', 0);
      const blitz = new T.Mesh(new T.TubeGeometry(zick, 30, 0.06, 5), new T.MeshBasicMaterial({ color: 0xFFE066 })); g.add(blitz);
      g.userData.tick.push(t => { blitz.visible = (t % 4.3) < 0.18 || ((t % 4.3) > 0.3 && (t % 4.3) < 0.4); });
      return { kurve, platz: [0, 0.3] };
    } }
  ];

  const SETS = { lauf: ARENEN };
  // Bausteine für andere Arena-Sets (kraft3d.js)
  const hilfen = () => ({ W, T, C, G: GR, teil, letztes, FORMEN, sockel, weg, schneeFlecken, tanne, laubbaum, palme, schneemann, bank, laterne, haus, fenster, fahne, ovalPunkte, glut,
    saeule, tempel, olivenbaum, zypresse, amphore, statue, wolke, weissesHaus, schaf, mauer, feuerschale, blumen });
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
    KR.mesh = new T.InstancedMesh(new T.IcosahedronGeometry(0.2, 0), new T.MeshToonMaterial({ color: 0xF5F0E4 }), KR.n);
    KR.rand = new T.InstancedMesh(new T.IcosahedronGeometry(0.27, 0), new T.MeshBasicMaterial({ color: 0x2B2826, side: T.BackSide }), KR.n);
    KR.mesh.frustumCulled = KR.rand.frustumCulled = false; st.b.szene.add(KR.mesh); st.b.szene.add(KR.rand);
    KR.rand.instanceMatrix = KR.mesh.instanceMatrix;
    KR.teile = Array.from({ length: KR.n }, () => ({ zustand: 'aus', p: new T.Vector3(), v: new T.Vector3(), lokal: new T.Vector3(), zeit: 0, gr: 1 }));
    KR.leer = new T.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < KR.n; i++) KR.mesh.setMatrixAt(i, KR.leer);
  }
  // Krümel von der Oberfläche losreißen: Startgeschwindigkeit = Insel + Schubs nach oben
  function losreissen(anzahl, schubs) {
    if (st.insel.userData.innen) return;                 // in Räumen fliegt kein Schnee
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
      if (window.Klang) Klang.effekt('plumps', staerke);
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
      const k = st.b.kamera, weit = Math.max(1, 0.62 / (w / h)) * 0.8;      // 0,8 = näher ran, die Insel füllt den Bildschirm
      k.position.set(13 * weit, 17 * weit, 44 * weit); k.lookAt(0, 4.6 * weit, 0);
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
      const s = new T.Scene(); s.add(new T.AmbientLight(0xF5F0E4, 1.4));
      const l = new T.DirectionalLight(0xF5F0E4, 2.2); l.position.set(-4, 10, 7); s.add(l);
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
    _insel: (nr, set) => insel(nr, set),
    fliegend: () => KR.teile.filter(k => k.zustand !== 'aus').length
  };
})();
