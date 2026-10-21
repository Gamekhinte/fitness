/* ================= WINTERFORM KRAFT-ARENEN =================
   Zehn Arenen für den Kraft-Modus, als kleine Räume auf schwebenden Inseln (Puppenhaus-Ansicht:
   Rückwand und linke Wand stehen, vorne ist offen). Die Figur trainiert auf ihrer Matte.
   Bausteine kommen aus arena3d.js (bau(g, H)). */
(function () {
  if (!window.Arena3D) return;
  const F = { holz: '#C8A27A', holz2: '#A9825A', dunkelholz: '#7A5535', beton: '#A8A39B', gummi: '#3A3836', fliese: '#D8D2C8',
    weiss: '#FFFFFF', ink: '#2B2826', rot: '#D9643A', blau: '#3FA9E6', eis: '#7CD4FF', gold: '#F2C14E', gruen: '#3E7A55',
    hellgruen: '#8CC084', rosa: '#E86AA6', lila: '#7B5CC4', stahl: '#8E8A84', chrom: '#C9C5BE', sand: '#EAD39C', gras: '#6EA85A' };
  const UEBUNGEN = ['kniebeuge', 'liegestuetz', 'plank'];

  // ---------- kleine Helfer ----------
  function mk(H) {
    const { W, T, teil } = H;
    const h = {};
    h.box = (g, w, hh, d, f, x, y, z, u = 0.03, ry = 0) => { const m = teil(W.box(w, hh, d), f, x, y, z, u); m.rotation.y = ry; g.add(m); return m; };
    h.zyl = (g, r, hh, f, x, y, z, u = 0.03, n = 14, rot) => { const geo = W.rohr(r, hh, n); if (rot === 'x') geo.rotateX(Math.PI / 2); if (rot === 'z') geo.rotateZ(Math.PI / 2); const m = teil(geo, f, x, y, z, u); g.add(m); return m; };
    h.kugel = (g, r, f, x, y, z, u = 0.025) => { const m = teil(W.kugel(r, 14, 10), f, x, y, z, u); g.add(m); return m; };
    // Räume: Boden, Rückwand, linke Wand, Fußleisten
    h.raum = (g, o) => {
      H.sockel(g, 'quadrat', o.boden, o.erde || '#9C7448', o.erde2 || '#7E5B37');
      const hoch = o.hoehe || 3.4;
      if (o.muster === 'dielen') for (let i = -4; i <= 4; i++) h.box(g, 11, 0.01, 0.03, '#9C7448', 0, 0.205, i * 1.1, 0);
      if (o.muster === 'fliesen') { for (let i = -5; i <= 5; i++) h.box(g, 0.03, 0.01, 10, '#B9B4AC', i, 0.205, 0, 0); for (let i = -4; i <= 4; i++) h.box(g, 11, 0.01, 0.03, '#B9B4AC', 0, 0.205, i * 1.1, 0); }
      if (o.waende !== false) {
        h.box(g, 11.2, hoch, 0.3, o.wand, 0, 0.2 + hoch / 2, -4.95, 0.05);
        h.box(g, 0.3, hoch, 10.2, o.wand2 || o.wand, -5.45, 0.2 + hoch / 2, 0, 0.05);
        h.box(g, 11, 0.18, 0.06, o.leiste || '#FFFFFF', 0, 0.29, -4.78, 0.01);
        h.box(g, 0.06, 0.18, 10, o.leiste || '#FFFFFF', -5.28, 0.29, 0, 0.01);
      }
      return hoch;
    };
    h.hantel = (g, x, y, z, ry = 0, f = F.ink) => {
      const grp = new T.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; g.add(grp);
      const stange = W.rohr(0.04, 0.5, 8); stange.rotateZ(Math.PI / 2); grp.add(teil(stange, F.chrom, 0, 0, 0, 0.012));
      [-0.27, 0.27].forEach(dx => { const p = W.rohr(0.13, 0.12, 6); p.rotateZ(Math.PI / 2); grp.add(teil(p, f, dx, 0, 0, 0.02)); });
      return grp;
    };
    h.langhantel = (g, x, y, z, len = 3, platten = [F.rot, F.blau], ry = 0) => {
      const grp = new T.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; g.add(grp);
      const st = W.rohr(0.035, len, 8); st.rotateZ(Math.PI / 2); grp.add(teil(st, F.chrom, 0, 0, 0, 0.012));
      [-1, 1].forEach(s => platten.forEach((f, i) => {
        const r = 0.42 - i * 0.07, p = W.rohr(r, 0.1, 20); p.rotateZ(Math.PI / 2);
        grp.add(teil(p, f, s * (len / 2 - 0.35 - i * 0.11), 0, 0, 0.02));
      }));
      return grp;
    };
    h.kettlebell = (g, x, z, s = 1, f = F.ink) => {
      h.kugel(g, 0.2 * s, f, x, 0.2 + 0.19 * s, z);
      const t = new T.TorusGeometry(0.12 * s, 0.035 * s, 6, 14, Math.PI); g.add(teil(t, f, x, 0.2 + 0.36 * s, z, 0.015, false));
      g.children[g.children.length - 1].position.y = 0.2 + 0.36 * s;
    };
    h.matte = (g, x, z, w, l, f, ry = 0) => h.box(g, w, 0.05, l, f, x, 0.225, z, 0.02, ry);
    h.pflanze = (g, x, z, s = 1) => {
      h.zyl(g, 0.22 * s, 0.4 * s, F.rot, x, 0.2 + 0.2 * s, z, 0.025);
      [[0, 0.75, 0, 0.3], [0.15, 0.62, 0.08, 0.22], [-0.14, 0.6, -0.05, 0.24]].forEach(([dx, dy, dz, r]) => h.kugel(g, r * s, F.gruen, x + dx * s, 0.2 + dy * s, z + dz * s));
    };
    h.poster = (g, x, y, f1, f2, wandX) => {
      if (wandX) { h.box(g, 0.04, 0.9, 0.7, '#FFFFFF', -5.28, y, x, 0.015); h.box(g, 0.02, 0.5, 0.45, f1, -5.25, y + 0.08, x, 0); h.box(g, 0.02, 0.1, 0.45, f2, -5.25, y - 0.3, x, 0); }
      else { h.box(g, 0.7, 0.9, 0.04, '#FFFFFF', x, y, -4.78, 0.015); h.box(g, 0.45, 0.5, 0.02, f1, x, y + 0.08, -4.75, 0); h.box(g, 0.45, 0.1, 0.02, f2, x, y - 0.3, -4.75, 0); }
    };
    h.fenster = (g, x, y, w, hh) => {
      h.box(g, w + 0.2, hh + 0.2, 0.08, '#FFFFFF', x, y, -4.78, 0.02);
      h.box(g, w, hh, 0.03, '#BFE6FF', x, y, -4.73, 0);
      h.box(g, 0.06, hh, 0.04, '#FFFFFF', x, y, -4.71, 0); h.box(g, w, 0.06, 0.04, '#FFFFFF', x, y, -4.71, 0);
      h.box(g, w + 0.4, 0.08, 0.25, '#FFFFFF', x, y - hh / 2 - 0.14, -4.66, 0.015);
    };
    h.bank = (g, x, z, ry = 0, f = F.ink) => {
      const grp = new T.Group(); grp.position.set(x, 0.2, z); grp.rotation.y = ry; g.add(grp);
      grp.add(teil(W.box(0.5, 0.14, 1.6), f, 0, 0.5, 0, 0.025));
      [-0.6, 0.6].forEach(dz => grp.add(teil(W.box(0.35, 0.43, 0.08), F.stahl, 0, 0.22, dz, 0.015)));
      return grp;
    };
    h.rack = (g, x, z, ry = 0) => {
      const grp = new T.Group(); grp.position.set(x, 0.2, z); grp.rotation.y = ry; g.add(grp);
      [[-0.75, -0.6], [0.75, -0.6], [-0.75, 0.6], [0.75, 0.6]].forEach(([dx, dz]) => grp.add(teil(W.box(0.1, 2.6, 0.1), F.ink, dx, 1.3, dz, 0.015)));
      [-0.6, 0.6].forEach(dz => grp.add(teil(W.box(1.6, 0.1, 0.1), F.ink, 0, 2.6, dz, 0.015)));
      [-0.75, 0.75].forEach(dx => grp.add(teil(W.box(0.1, 0.1, 1.3), F.ink, dx, 2.6, 0, 0.015)));
      [-0.75, 0.75].forEach(dx => grp.add(teil(W.box(0.12, 0.08, 0.2), F.rot, dx, 1.45, 0.62, 0.01)));
      const lh = h.langhantel(grp, 0, 1.55, 0.66, 2.3, [F.rot, F.ink]);
      return grp;
    };
    h.laufband = (g, x, z, ry = 0) => {
      const grp = new T.Group(); grp.position.set(x, 0.2, z); grp.rotation.y = ry; g.add(grp);
      grp.add(teil(W.box(0.8, 0.25, 1.9), F.stahl, 0, 0.13, 0, 0.025));
      grp.add(teil(W.box(0.6, 0.03, 1.7), F.ink, 0, 0.27, 0.05, 0));
      [-0.38, 0.38].forEach(dx => grp.add(teil(W.box(0.06, 1.2, 0.06), F.stahl, dx, 0.8, -0.85, 0.015)));
      grp.add(teil(W.box(0.8, 0.3, 0.2), F.ink, 0, 1.4, -0.85, 0.02)); grp.add(teil(W.box(0.5, 0.18, 0.02), F.eis, 0, 1.42, -0.74, 0));
      return grp;
    };
    h.sandsack = (g, x, z, y0 = 3.4, f = F.rot) => {
      h.zyl(g, 0.012, y0 - 2.4, F.stahl, x, (y0 + 2.4) / 2 + 0.2, z, 0);
      const s = h.zyl(g, 0.3, 1.4, f, x, 1.7 + 0.2, z, 0.035, 16);
      h.zyl(g, 0.31, 0.12, F.ink, x, 2.35 + 0.2, z, 0.015, 16);
      return s;
    };
    h.spinde = (g, x, n, f = F.blau) => { for (let i = 0; i < n; i++) { h.box(g, 0.5, 2, 0.5, f, -5.0, 1.2, x + i * 0.55, 0.025); for (let k = 0; k < 3; k++) h.box(g, 0.02, 0.03, 0.3, F.ink, -4.74, 1.9 - k * 0.08, x + i * 0.55, 0); } };
    h.fan = (g, x, z, f = F.ink) => {
      h.zyl(g, 0.04, 1.2, F.stahl, x, 0.8, z, 0.01); h.zyl(g, 0.18, 0.05, F.stahl, x, 0.22, z, 0.01);
      const kopf = h.zyl(g, 0.32, 0.12, f, x, 1.45, z, 0.02, 18, 'x');
      return kopf;
    };
    h.skyline = (g, z0 = -6) => {
      const hoehen = [3.2, 5.4, 4.1, 6.6, 3.6, 4.8, 5.8];
      hoehen.forEach((hh, i) => {
        const x = -4.8 + i * 1.6, f = ['#B5654A', '#8E8A84', '#D8D2C8', '#7E5B37'][i % 4];
        h.box(g, 1.4, hh, 1.2, f, x, -2.4 + hh / 2, z0 - (i % 2) * 0.8, 0.04);
        for (let r = 0; r < Math.floor(hh / 0.8); r++) for (let c = -1; c <= 1; c++) h.box(g, 0.26, 0.32, 0.02, (r + c + i) % 3 ? F.eis : F.gold, x + c * 0.4, -2.1 + r * 0.8, z0 - (i % 2) * 0.8 + 0.61, 0);
      });
    };
    h.fans = (g, positionen) => {
      const farben = [F.rot, F.blau, F.gold, F.gruen, F.weiss, F.rosa];
      const inst = new T.InstancedMesh(W.kugel(0.15, 8, 6), new T.MeshToonMaterial({ color: 0xffffff }), positionen.length);
      const m4 = new T.Matrix4();
      positionen.forEach((p, i) => { m4.makeTranslation(...p); inst.setMatrixAt(i, m4); inst.setColorAt(i, new T.Color(farben[(i * 7) % farben.length])); });
      g.add(inst);
      g.userData.tick.push(t => { positionen.forEach(([x, y, z], i) => { m4.makeTranslation(x, y + Math.max(0, Math.sin(t * 4 + i)) * 0.1, z); inst.setMatrixAt(i, m4); }); inst.instanceMatrix.needsUpdate = true; });
    };
    return h;
  }
  const info = (platz, blick, extra) => Object.assign({ platz, blick, uebungen: UEBUNGEN }, extra || {});
  const wandSeile = hoch => [hoch + 0.2, hoch + 0.2, hoch + 0.2, 0.42];   // hinten links, hinten rechts, vorne links an Wandkanten

  const KRAFT = [
    { name: 'Schlafzimmer', form: 'quadrat', kruemel: '#FFFFFF', bau(g, H) {   // Federn aus dem Kissen
      const h = mk(H), { T, W, teil } = H;
      const hoch = h.raum(g, { boden: F.holz, wand: '#DDE7EE', wand2: '#E9E2F2', muster: 'dielen' });
      h.fenster(g, 1.6, 2.1, 1.8, 1.3);
      // Vorhänge
      [0.45, 2.75].forEach(x => h.box(g, 0.35, 1.9, 0.08, F.rot, x, 2.0, -4.68, 0.02));
      h.box(g, 2.8, 0.06, 0.06, F.dunkelholz, 1.6, 3.0, -4.66, 0.01);
      // Bett mit Decke und Kissen
      h.box(g, 2.2, 0.45, 3.2, F.dunkelholz, -3.9, 0.45, -3.2, 0.04);
      h.box(g, 2.1, 0.3, 3.0, '#FFFFFF', -3.9, 0.8, -3.2, 0.03);
      h.box(g, 2.16, 0.12, 2.0, F.blau, -3.9, 0.98, -2.7, 0.03);
      h.box(g, 1.4, 0.25, 0.6, '#FFFFFF', -3.9, 1.07, -4.3, 0.03);
      h.box(g, 2.2, 1.2, 0.15, F.dunkelholz, -3.9, 0.8, -4.8, 0.03);
      // Nachttisch mit Lampe und Wecker
      h.box(g, 0.7, 0.6, 0.6, F.holz2, -2.4, 0.5, -4.3, 0.03);
      h.zyl(g, 0.05, 0.4, F.ink, -2.5, 1.0, -4.35, 0.01); h.zyl(g, 0.22, 0.25, F.gold, -2.5, 1.3, -4.35, 0.02, 14);
      h.box(g, 0.2, 0.16, 0.1, F.rot, -2.2, 0.88, -4.2, 0.015);
      // Schreibtisch mit Laptop und Stuhl
      h.box(g, 1.8, 0.08, 0.8, F.holz2, 4.2, 1.1, -4.3, 0.025);
      [[-0.8, -0.3], [0.8, -0.3], [-0.8, 0.3], [0.8, 0.3]].forEach(([dx, dz]) => h.box(g, 0.07, 0.9, 0.07, F.ink, 4.2 + dx, 0.65, -4.3 + dz, 0));
      h.box(g, 0.7, 0.04, 0.45, F.stahl, 4.0, 1.17, -4.25, 0.015); const sc = h.box(g, 0.7, 0.45, 0.03, F.ink, 4.0, 1.4, -4.48, 0.015); sc.rotation.x = -0.2;
      h.box(g, 0.6, 0.08, 0.6, F.blau, 4.2, 0.7, -3.4, 0.02); h.box(g, 0.6, 0.7, 0.08, F.blau, 4.2, 1.05, -3.1, 0.02); h.zyl(g, 0.04, 0.5, F.ink, 4.2, 0.42, -3.4, 0);
      // Regal mit Büchern, Wanduhr, Poster
      h.box(g, 0.3, 0.06, 1.8, '#FFFFFF', -5.15, 2.3, 0.4, 0.015);
      ['#D9643A', '#3FA9E6', '#F2C14E', '#3E7A55', '#E86AA6', '#7B5CC4'].forEach((f, i) => h.box(g, 0.24, 0.42 - (i % 3) * 0.06, 0.16, f, -5.12, 2.55 - (i % 3) * 0.03, -0.3 + i * 0.22, 0.012));
      h.zyl(g, 0.32, 0.06, '#FFFFFF', -1.4, 2.6, -4.76, 0.02, 20, 'x'); h.box(g, 0.03, 0.22, 0.02, F.ink, -1.4, 2.66, -4.71, 0); h.box(g, 0.16, 0.03, 0.02, F.ink, -1.34, 2.6, -4.71, 0);
      h.poster(g, 2.4, 2.1, F.blau, F.gold, true); h.poster(g, -2.0, 1.9, F.rot, F.ink, true);
      // Teppich, Yogamatte, kleine Hanteln, Klamotten, Turnschuhe, Pflanze
      h.zyl(g, 1.6, 0.03, '#F7C9B5', 0.6, 0.22, 1.0, 0.015, 30);
      h.matte(g, 0.6, 1.0, 0.9, 2.2, F.rosa, Math.PI / 2);
      h.hantel(g, 2.2, 0.33, 1.7, 0.4, F.rosa); h.hantel(g, 2.4, 0.33, 2.2, 0.2, F.rosa);
      [[F.blau, 0], [F.ink, 0.12], [F.rot, 0.22]].forEach(([f, dy], i) => h.box(g, 0.8 - i * 0.15, 0.1, 0.6 - i * 0.1, f, -3.8, 0.27 + dy, 1.4, 0.015, i * 0.4));
      [[3.6, 3.6], [4.0, 3.7]].forEach(([x, z]) => { h.box(g, 0.25, 0.16, 0.55, '#FFFFFF', x, 0.29, z, 0.02); h.box(g, 0.27, 0.05, 0.57, F.rot, x, 0.22, z, 0.01); });
      h.pflanze(g, 4.6, -1.6, 1.1);
      // Tür in der linken Wand
      h.box(g, 0.1, 2.3, 1.2, F.holz, -5.25, 1.35, 3.4, 0.025); h.kugel(g, 0.06, F.gold, -5.18, 1.3, 2.95, 0.01);
      return info([0.6, 1.0], 0.2, { seilY: wandSeile(hoch) });
    } },
    { name: 'Homegym', form: 'quadrat', kruemel: '#D8D2C8', bau(g, H) {
      const h = mk(H);
      const hoch = h.raum(g, { boden: F.beton, wand: '#B5654A', wand2: '#C9C5BE', leiste: F.ink });
      // Gummimatten-Boden
      for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) h.box(g, 1.18, 0.04, 1.18, F.gummi, -0.6 + i * 1.2, 0.22, -2.6 + k * 1.2, 0.01);
      // Rolltor mit Lamellen auf der Rückwand
      h.box(g, 4.4, 2.8, 0.06, '#D8D2C8', 2.4, 1.6, -4.77, 0.02);
      for (let i = 0; i < 9; i++) h.box(g, 4.3, 0.03, 0.03, F.stahl, 2.4, 0.4 + i * 0.3, -4.72, 0);
      h.box(g, 0.5, 0.08, 0.06, F.ink, 2.4, 0.5, -4.7, 0);
      // Lochwand mit Werkzeug
      h.box(g, 0.05, 1.4, 2.2, '#C8A27A', -5.25, 2.0, -2.6, 0.015);
      for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) h.box(g, 0.02, 0.04, 0.04, F.ink, -5.22, 1.5 + k * 0.32, -3.5 + i * 0.36, 0);
      h.box(g, 0.05, 0.5, 0.08, F.rot, -5.2, 2.0, -3.2, 0.01); h.box(g, 0.05, 0.08, 0.4, F.stahl, -5.2, 2.3, -2.4, 0.01); h.zyl(g, 0.12, 0.04, F.gold, -5.2, 1.7, -2.0, 0.01, 12, 'z');
      // Power Rack, Bank, Hantelablage, Kettlebells, Sandsack, Spiegel, Ventilator
      h.rack(g, -0.4, -2.6);
      h.bank(g, -0.4, -2.0, 0, F.ink);
      h.box(g, 2.2, 0.1, 0.6, F.ink, 3.6, 0.65, -0.6, 0.02, -Math.PI / 2 + 0.1);
      [[-0.2, F.ink], [0.5, F.ink], [1.1, F.rot]].forEach(([dz, f], i) => h.hantel(g, 3.6 + 0.04 * i, 0.82, -0.6 - 0.7 + i * 0.7, Math.PI / 2, f));
      [[3.5, 0.4], [3.9, 0.6]].forEach(([x, z]) => h.box(g, 0.06, 0.6, 0.06, F.stahl, x, 0.5, z, 0));
      h.kettlebell(g, 2.4, 1.2, 1, F.ink); h.kettlebell(g, 2.9, 1.5, 0.8, F.blau); h.kettlebell(g, 1.9, 1.6, 1.2, F.rot);
      h.sandsack(g, -3.6, -1.0, 3.6, F.rot); h.box(g, 1.2, 0.06, 0.06, F.ink, -3.6, 3.45, -1.0, 0.01);
      h.box(g, 0.04, 2.0, 1.6, '#BFE6FF', -5.25, 1.3, 1.6, 0.02);
      h.fan(g, 4.4, 3.4, F.blau);
      h.matte(g, 0.6, 1.4, 0.9, 2.2, F.blau, Math.PI / 2);
      h.zyl(g, 0.1, 0.32, F.eis, 1.6, 0.36, 2.6, 0.015); h.zyl(g, 0.06, 0.06, F.ink, 1.6, 0.55, 2.6, 0);
      // Reifen an der Wand, Kiste mit Bändern
      h.box(g, 0.8, 0.5, 0.6, F.holz2, -4.4, 0.45, 3.4, 0.025);
      ['#D9643A', '#3FA9E6', '#3E7A55'].forEach((f, i) => h.box(g, 0.6, 0.04, 0.08, f, -4.4, 0.72, 3.25 + i * 0.12, 0));
      return info([0.6, 1.4], 0.2, { seilY: wandSeile(hoch) });
    } },
    { name: 'Fitnessstudio', form: 'quadrat', kruemel: '#FFFFFF', bau(g, H) {
      const h = mk(H);
      const hoch = h.raum(g, { boden: '#5F5B55', wand: '#EADCC2', wand2: '#D8D2C8', muster: 'fliesen', leiste: F.ink });
      // Spiegelwand mit Streifen, Uhr
      h.box(g, 6, 2, 0.04, '#BFE6FF', 1.6, 1.4, -4.77, 0.02);
      for (let i = 0; i < 4; i++) h.box(g, 0.04, 2, 0.05, '#FFFFFF', -0.6 + i * 1.5, 1.4, -4.74, 0);
      h.box(g, 11, 0.3, 0.05, F.rot, 0, 2.75, -4.77, 0.01); h.box(g, 11, 0.12, 0.05, F.gold, 0, 2.95, -4.77, 0);
      // Laufbänder, Kabelzug, Bankdrücken, Hantelregal, Scheibenbaum, Spinde, Wasserspender, Handtücher
      h.laufband(g, 3.4, -3.4, 0); h.laufband(g, 4.5, -3.4, 0);
      // Kabelzug
      [-0.7, 0.7].forEach(dx => h.box(g, 0.12, 2.8, 0.12, F.ink, -2.6 + dx, 1.6, -4.2, 0.015)); h.box(g, 1.55, 0.12, 0.12, F.ink, -2.6, 3.0, -4.2, 0.015);
      for (let i = 0; i < 10; i++) h.box(g, 0.5, 0.1, 0.3, i % 2 ? F.stahl : F.chrom, -2.6, 0.32 + i * 0.11, -4.2, 0.01);
      h.zyl(g, 0.12, 0.08, F.stahl, -2.6, 2.85, -3.98, 0.01, 12, 'x'); h.box(g, 0.02, 2.0, 0.02, F.ink, -2.6, 1.85, -3.95, 0);
      h.box(g, 0.5, 0.06, 0.06, F.stahl, -2.6, 0.9, -3.9, 0.01);
      h.bank(g, -0.4, -2.6, Math.PI / 2, F.rot);
      [-0.95, 0.95].forEach(dz => h.box(g, 0.08, 1.2, 0.08, F.ink, -0.4, 0.8, -2.6 + dz * 0.6, 0.01)); h.langhantel(g, -0.4, 1.35, -2.6, 2.4, [F.blau, F.gold], Math.PI / 2);
      h.box(g, 0.6, 0.12, 3.6, F.ink, -4.6, 0.5, 0.5, 0.02); h.box(g, 0.6, 0.12, 3.6, F.ink, -4.6, 0.95, 0.5, 0.02);
      for (let i = 0; i < 6; i++) { h.hantel(g, -4.6, 0.65, -1.0 + i * 0.6, Math.PI / 2, i % 2 ? F.ink : F.stahl); h.hantel(g, -4.6, 1.1, -1.0 + i * 0.6, Math.PI / 2, F.ink); }
      h.zyl(g, 0.06, 1.4, F.ink, 2.4, 0.9, 0.6, 0.015); h.zyl(g, 0.35, 0.06, F.ink, 2.4, 0.23, 0.6, 0.015);
      [[0.5, F.rot], [0.9, F.blau], [1.3, F.gold]].forEach(([y, f]) => h.zyl(g, 0.38, 0.08, f, 2.4, y, 0.6, 0.02, 20));
      h.spinde(g, 2.0, 4, F.blau);
      h.box(g, 0.45, 1.1, 0.45, '#FFFFFF', 4.6, 0.75, 0.0, 0.025); h.zyl(g, 0.17, 0.4, F.eis, 4.6, 1.5, 0.0, 0.02);
      [F.rot, F.blau, F.gold].forEach((f, i) => h.box(g, 0.4, 0.08, 0.3, f, 4.6, 0.25 + i * 0.09, 1.0, 0.012));
      h.kettlebell(g, 1.4, 2.8, 1, F.gold); h.kettlebell(g, 1.9, 3.1, 0.9, F.rot);
      h.matte(g, 0.2, 1.2, 0.9, 2.2, F.ink, Math.PI / 2);
      return info([0.2, 1.2], 0.2, { seilY: wandSeile(hoch) });
    } },
    { name: 'Outdoor-Gym', form: 'quadrat', kruemel: '#8CC084', bau(g, H) {
      const h = mk(H);
      H.sockel(g, 'quadrat', F.gras, '#9C7448', '#7E5B37');
      // Fallschutzmatten
      for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) h.box(g, 0.98, 0.06, 0.98, (i + k) % 2 ? '#C4472D' : '#D9643A', -3.0 + i, 0.23, -3.0 + k, 0.01);
      // Klimmzug-Gestell, Barren, Hangelleiter, Bauchbank
      [-1.6, 0.0].forEach(x => h.zyl(g, 0.07, 2.6, F.blau, x, 1.5, -3.5, 0.015, 10)); h.zyl(g, 0.04, 1.6, F.chrom, -0.8, 2.75, -3.5, 0.01, 8, 'z');
      [[-1.6, 0], [0, 0]].forEach(() => 0);
      [[1.4, -2.1], [1.4, -1.3], [2.2, -2.1], [2.2, -1.3]].forEach(([x, z]) => h.zyl(g, 0.06, 1.2, F.blau, x, 0.8, z, 0.015));
      [-2.1, -1.3].forEach(z => h.zyl(g, 0.045, 1.0, F.chrom, 1.8, 1.4, z, 0.01, 8, 'z'));
      [[-3.2, -1.2], [-3.2, -4.0], [-2.2, -1.2], [-2.2, -4.0]].forEach(([x, z]) => h.zyl(g, 0.07, 2.4, F.gold, x, 1.4, z, 0.015));
      [-3.2, -2.2].forEach(x => h.zyl(g, 0.05, 2.8, F.gold, x, 2.6, -2.6, 0.01, 8, 'x'));
      for (let i = 0; i < 6; i++) h.zyl(g, 0.035, 1.0, F.chrom, -2.7, 2.62, -1.4 - i * 0.48, 0.008, 8, 'z');
      const sb = h.box(g, 0.5, 0.1, 1.6, F.ink, 3.6, 0.65, -3.6, 0.02); sb.rotation.x = 0.35; h.box(g, 0.08, 0.6, 0.08, F.blau, 3.6, 0.5, -4.2, 0.01);
      // Bäume, Zaun, Laterne, Bank, Mülleimer, Wasserspender
      H.laubbaum(g, -4.6, -4.2, 1.1); H.laubbaum(g, 4.6, 4.2, 1); H.laubbaum(g, -4.7, 4.2, 0.9); H.tanne(g, 4.8, -1.0, 0.8, false);
      for (let i = 0; i < 10; i++) h.box(g, 0.08, 0.7, 0.08, F.holz, -4.5 + i, 0.55, -4.8, 0.01);
      h.box(g, 10, 0.08, 0.06, F.holz, 0, 0.75, -4.8, 0.01); h.box(g, 10, 0.08, 0.06, F.holz, 0, 0.45, -4.8, 0.01);
      H.laterne(g, 3.0, 3.6); H.bank(g, 0.6, 4.2, 0);
      h.zyl(g, 0.22, 0.6, F.gruen, -1.6, 0.5, 4.2, 0.02); h.zyl(g, 0.24, 0.06, F.ink, -1.6, 0.82, 4.2, 0.01);
      h.zyl(g, 0.08, 0.9, F.stahl, 4.6, 0.65, 1.6, 0.015); h.box(g, 0.3, 0.12, 0.2, F.stahl, 4.6, 1.15, 1.6, 0.01);
      H.weg(g, [[-4.6, 3.0], [-1, 2.8], [2.6, 3.0], [4.4, 1.0]], 0.8, '#D8C49A');
      h.matte(g, 0.3, 0.8, 0.9, 2.2, F.gruen, Math.PI / 2);
      return info([0.3, 0.8], 0.2);
    } },
    { name: 'Boxhalle', form: 'quadrat', kruemel: '#FFFFFF', bau(g, H) {
      const h = mk(H);
      const hoch = h.raum(g, { boden: F.holz2, wand: '#8E4E3A', wand2: '#B5654A', muster: 'dielen', leiste: F.ink, hoehe: 3.6 });
      // Backsteinfugen
      for (let r = 0; r < 9; r++) h.box(g, 11, 0.025, 0.03, '#D8D2C8', 0, 0.55 + r * 0.38, -4.78, 0);
      // Ring
      h.box(g, 4.6, 0.5, 4.6, F.ink, 1.6, 0.45, -1.6, 0.04); h.box(g, 4.4, 0.06, 4.4, F.eis, 1.6, 0.73, -1.6, 0.015);
      const ecken = [[-0.6, -3.8, F.rot], [3.8, -3.8, F.blau], [-0.6, 0.6, F.blau], [3.8, 0.6, F.rot]];
      ecken.forEach(([x, z, f]) => h.zyl(g, 0.09, 1.5, f, x, 1.45, z, 0.015));
      [1.05, 1.4, 1.75].forEach((y, i) => {
        const f = ['#FFFFFF', F.rot, F.blau][i];
        h.box(g, 4.4, 0.05, 0.05, f, 1.6, y, -3.8, 0); h.box(g, 4.4, 0.05, 0.05, f, 1.6, y, 0.6, 0);
        h.box(g, 0.05, 0.05, 4.4, f, -0.6, y, -1.6, 0); h.box(g, 0.05, 0.05, 4.4, f, 3.8, y, -1.6, 0);
      });
      h.box(g, 0.5, 0.25, 0.5, F.gold, 1.6, 0.88, -1.6, 0.015);
      // Sandsäcke an einem Balken, Birne, Glocke, Handschuhe, Springseile, Bank, Poster
      h.box(g, 0.2, 0.2, 5, F.dunkelholz, -3.4, 3.5, -1.6, 0.02);
      [-3.6, -1.6, 0.4].forEach((z, i) => h.sandsack(g, -3.4, z, 3.4, [F.rot, F.ink, F.blau][i]));
      h.box(g, 0.08, 0.6, 0.6, F.dunkelholz, -5.2, 2.2, 2.4, 0.015); h.kugel(g, 0.16, F.rot, -4.95, 1.85, 2.4, 0.015);
      h.zyl(g, 0.22, 0.12, F.gold, -5.15, 2.8, -0.2, 0.015, 16, 'z');
      [[3.6, 3.4, F.rot], [3.9, 3.5, F.blau]].forEach(([x, z, f]) => h.kugel(g, 0.17, f, x, 0.85, z, 0.015));
      h.box(g, 1.6, 0.1, 0.5, F.dunkelholz, 3.8, 0.62, 3.5, 0.02); [3.2, 4.4].forEach(x => h.box(g, 0.08, 0.4, 0.4, F.ink, x, 0.4, 3.5, 0));
      const seil = new H.T.TorusGeometry(0.3, 0.02, 4, 20); h.box(g, 0.05, 0.05, 0.05, F.ink, 2.2, 0.23, 3.8, 0);
      g.add(H.teil(seil, F.gold, 2.2, 0.24, 3.8, 0, false)); g.children[g.children.length - 1].rotation.x = Math.PI / 2;
      h.poster(g, 1.4, 2.4, F.rot, F.gold, true); h.poster(g, -1.2, 2.4, F.blau, F.ink, true);
      h.matte(g, -1.6, 2.6, 0.9, 2.2, F.ink, Math.PI / 2);
      return info([-1.6, 2.6], 0.2, { seilY: wandSeile(hoch) });
    } },
    { name: 'Turnhalle', form: 'quadrat', kruemel: '#FFFFFF', bau(g, H) {
      const h = mk(H);
      const hoch = h.raum(g, { boden: '#D9B98A', wand: '#E9E2D2', wand2: '#C9DCE8', leiste: F.ink, hoehe: 3.8 });
      // Spielfeldlinien
      [[0, 0.2, 9, 0.05], [0, -3.4, 9, 0.05], [0, 3.8, 9, 0.05]].forEach(([x, z, w, d]) => h.box(g, w, 0.01, d, F.rot, x, 0.206, z, 0));
      h.box(g, 0.05, 0.01, 7.2, F.rot, -4.5, 0.206, 0.2, 0); h.box(g, 0.05, 0.01, 7.2, F.rot, 4.5, 0.206, 0.2, 0);
      const k = new H.T.TorusGeometry(1.0, 0.025, 4, 30); k.rotateX(Math.PI / 2); g.add(H.teil(k, F.rot, 0, 0.21, 0.2, 0));
      // Sprossenwand
      [-1.0, 0.0, 1.0, 2.0, 3.0].forEach(x => { [-0.42, 0.42].forEach(d => h.box(g, 0.08, 3.2, 0.1, F.holz, x + d, 1.8, -4.7, 0.015)); for (let i = 0; i < 12; i++) h.zyl(g, 0.03, 0.84, F.holz, x, 0.5 + i * 0.26, -4.68, 0.008, 8, 'z'); });
      // Ringe am Seil, Kletterseil, Kasten, Matten, Langbank, Basketballkorb, Bälle
      [-0.4, 0.4].forEach(dx => { h.zyl(g, 0.02, 1.5, F.holz, -2.6 + dx, 3.1, -2.0, 0); const r = new H.T.TorusGeometry(0.16, 0.035, 6, 16); g.add(H.teil(r, F.holz, -2.6 + dx, 2.2, -2.0, 0.01)); });
      h.zyl(g, 0.06, 3.2, '#D8B27A', -4.2, 2.3, -3.6, 0.015);
      [0.42, 0.37, 0.32, 0.28].forEach((y, i) => h.box(g, 1.3 - i * 0.08, 0.3, 0.8 - i * 0.04, i === 3 ? '#FFFFFF' : F.holz, 3.4, 0.35 + i * 0.3, -1.6, 0.02));
      h.box(g, 2.2, 0.25, 1.4, F.blau, 3.2, 0.33, 1.2, 0.025); h.box(g, 2.2, 0.25, 1.4, F.blau, 3.2, 0.58, 1.1, 0.025);
      h.box(g, 3.2, 0.1, 0.3, F.holz, -2.8, 0.55, 3.0, 0.02); [-4.0, -1.6].forEach(x => h.box(g, 0.1, 0.35, 0.3, F.holz, x, 0.35, 3.0, 0));
      h.box(g, 0.08, 0.9, 1.3, '#FFFFFF', -5.2, 2.7, 0.2, 0.02); const ring = new H.T.TorusGeometry(0.26, 0.03, 6, 18); ring.rotateX(Math.PI / 2); g.add(H.teil(ring, F.rot, -4.85, 2.45, 0.2, 0));
      [[-1.6, 3.6, F.rot], [-0.8, 4.0, F.gold], [4.6, 3.8, F.blau]].forEach(([x, z, f]) => h.kugel(g, 0.24, f, x, 0.44, z, 0.02));
      h.matte(g, 0.4, 1.6, 0.9, 2.2, F.blau, Math.PI / 2);
      return info([0.4, 1.6], 0.2, { seilY: wandSeile(hoch) });
    } },
    { name: 'Muscle Beach', form: 'quadrat', kruemel: '#EAD39C', bau(g, H) {
      const h = mk(H), { T, W } = H;
      H.sockel(g, 'quadrat', F.sand, '#C9A86A', '#A98E5A');
      const meer = new T.PlaneGeometry(11.2, 3.2, 24, 8); meer.rotateX(-Math.PI / 2);
      const wm = new T.Mesh(meer, W.mat('#5BB8E8')); wm.position.set(0, 0.27, -3.5); g.add(wm);
      const basis = meer.attributes.position.array.slice();
      g.userData.tick.push(t => { const p = meer.attributes.position; for (let i = 0; i < p.count; i++) p.array[i * 3 + 1] = Math.sin(basis[i * 3] * 1.2 + t * 1.6) * 0.05; p.needsUpdate = true; });
      for (let i = 0; i < 3; i++) h.box(g, 11, 0.04, 0.08, '#FFFFFF', 0, 0.32, -2.0 - i * 0.8, 0);
      // Holzplattform mit Langhantel und Scheiben
      h.box(g, 3.6, 0.12, 2.4, F.holz, 1.6, 0.27, 0.0, 0.025);
      for (let i = -1; i <= 1; i++) h.box(g, 3.6, 0.01, 0.03, F.dunkelholz, 1.6, 0.335, i * 0.8, 0);
      h.langhantel(g, 1.6, 0.75, -0.6, 2.6, [F.gold, F.rot]);
      [[3.2, 0.9, F.blau], [3.2, 0.6, F.gold]].forEach(([x, z, f], i) => h.zyl(g, 0.38, 0.1, f, x, 0.38 + i * 0.1, z, 0.02, 20));
      // Klimmzugstange, Barren aus Holz, Palmen, Rettungsturm, Handtuch, Kühlbox, Steg
      [-3.6, -2.0].forEach(x => h.zyl(g, 0.08, 2.6, F.dunkelholz, x, 1.5, -1.0, 0.015)); h.zyl(g, 0.04, 1.6, F.chrom, -2.8, 2.75, -1.0, 0.01, 8, 'z');
      H.palme(g, -4.6, 1.6, 1); H.palme(g, 4.6, 3.6, 0.85); H.palme(g, -1.0, 4.2, 0.75);
      [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].forEach(([dx, dz]) => h.zyl(g, 0.05, 1.6, F.holz, 4.4 + dx, 1.0, -0.8 + dz, 0.01));
      h.box(g, 1, 0.6, 1, F.rot, 4.4, 2.1, -0.8, 0.03); h.box(g, 1.2, 0.08, 1.2, '#FFFFFF', 4.4, 2.45, -0.8, 0.02);
      h.box(g, 0.8, 0.03, 1.5, F.rosa, 2.6, 0.22, 3.4, 0.01); h.box(g, 0.6, 0.4, 0.4, F.blau, 3.4, 0.4, 2.4, 0.025); h.box(g, 0.62, 0.08, 0.42, '#FFFFFF', 3.4, 0.64, 2.4, 0.01);
      h.zyl(g, 0.04, 1.5, F.ink, -3.0, 0.95, 3.4, 0.01); const sch = W.kegel(0.9, 0.4, 10); g.add(H.teil(sch, F.gold, -3.0, 1.8, 3.4, 0.03));
      h.matte(g, -1.0, 1.8, 0.9, 2.2, F.blau, Math.PI / 2);
      return info([-1.0, 1.8], 0.2);
    } },
    { name: 'Crossfit-Box', form: 'quadrat', kruemel: '#FFFFFF', bau(g, H) {  // Kreidestaub
      const h = mk(H);
      const hoch = h.raum(g, { boden: F.gummi, wand: '#8E8A84', wand2: '#5F5B55', leiste: F.gold, hoehe: 3.6 });
      for (let i = -5; i <= 5; i++) h.box(g, 0.02, 0.01, 10, '#4A4440', i, 0.205, 0, 0);
      // Rig (lange Klimmzugstation)
      for (let i = 0; i < 4; i++) { h.box(g, 0.12, 3, 0.12, F.ink, -3.6 + i * 2, 1.7, -4.2, 0.015); h.box(g, 0.12, 3, 0.12, F.ink, -3.6 + i * 2, 1.7, -2.8, 0.015); }
      [-4.2, -2.8].forEach(z => h.box(g, 6.2, 0.12, 0.12, F.ink, -0.6, 3.2, z, 0.015));
      for (let i = 0; i < 4; i++) h.zyl(g, 0.035, 1.4, F.chrom, -3.6 + i * 2, 3.0, -3.5, 0.008, 8, 'x');
      // Wandbälle, Kisten zum Springen, Reifen, Ruderergometer, Battle Ropes, Tafel, Kreideeimer
      [[-4.6, -0.6, F.rot], [-4.6, 0.0, F.blau], [-4.6, 0.6, F.gold]].forEach(([x, z, f]) => h.kugel(g, 0.28, f, x, 0.48, z, 0.02));
      [[3.4, -1.0, 0.8], [3.4, 0.0, 0.6], [4.3, -0.5, 1.0]].forEach(([x, z, hh]) => { h.box(g, 0.8, hh, 0.7, F.holz, x, 0.2 + hh / 2, z, 0.025); h.box(g, 0.3, 0.06, 0.02, F.ink, x, 0.2 + hh * 0.7, z + 0.36, 0); });
      const reifen = new H.T.TorusGeometry(0.7, 0.28, 10, 20); reifen.rotateX(Math.PI / 2); g.add(H.teil(reifen, F.ink, 1.6, 0.48, 2.6, 0.03));
      h.box(g, 0.3, 0.12, 1.8, F.ink, -2.6, 0.32, 1.4, 0.02); h.box(g, 0.35, 0.12, 0.4, F.rot, -2.6, 0.45, 1.6, 0.015); h.zyl(g, 0.3, 0.14, F.ink, -2.6, 0.55, 0.6, 0.02, 18, 'z'); h.box(g, 0.06, 0.06, 0.5, F.chrom, -2.6, 0.75, 1.0, 0);
      const kurve = new H.T.CatmullRomCurve3([[-4.6, 0.35, 3.8], [-3.2, 0.25, 3.4], [-2.0, 0.3, 4.0], [-0.6, 0.25, 3.6]].map(p => new H.T.Vector3(...p)));
      g.add(new H.T.Mesh(new H.T.TubeGeometry(kurve, 30, 0.07, 6), H.W.mat(F.ink)));
      const k2 = new H.T.CatmullRomCurve3([[-4.6, 0.35, 4.2], [-3.0, 0.25, 4.5], [-1.8, 0.3, 4.2], [-0.6, 0.25, 4.4]].map(p => new H.T.Vector3(...p)));
      g.add(new H.T.Mesh(new H.T.TubeGeometry(k2, 30, 0.07, 6), H.W.mat(F.ink)));
      h.box(g, 2.4, 1.4, 0.06, '#FFFFFF', 2.6, 2.0, -4.77, 0.02);
      [[0.5, F.ink], [0.3, F.rot], [0.1, F.blau], [-0.1, F.ink], [-0.3, F.ink]].forEach(([dy, f], i) => h.box(g, 1.6 - i * 0.2, 0.06, 0.02, f, 2.4, 2.0 + dy, -4.73, 0));
      h.zyl(g, 0.22, 0.35, '#FFFFFF', 1.0, 0.38, 0.6, 0.02, 14); h.box(g, 0.2, 0.12, 0.15, '#F4F4F4', 1.0, 0.6, 0.6, 0);
      h.matte(g, 0.0, 1.2, 0.9, 2.2, F.gold, Math.PI / 2);
      return info([0.0, 1.2], 0.2, { seilY: wandSeile(hoch) });
    } },
    { name: 'Dach-Gym', form: 'quadrat', kruemel: '#D8D2C8', bau(g, H) {
      const h = mk(H), { T, W } = H;
      H.sockel(g, 'quadrat', '#9A968F', '#B5654A', '#8E4E3A');
      h.skyline(g, -6.6);
      // Holzdeck, Glasgeländer, Pflanzkübel, Lichterkette, Whirlpool, Plattform, Sonnenliege
      for (let i = 0; i < 9; i++) h.box(g, 5.2, 0.06, 0.5, i % 2 ? F.holz : F.holz2, 2.4, 0.24, -4.2 + i * 0.55, 0.01);
      [[0, -5.0, 11, 0.06], [0, 5.0, 11, 0.06]].forEach(([x, z, w, d]) => { h.box(g, w, 0.9, d, '#BFE6FF', x, 0.65, z, 0.015); h.box(g, w, 0.07, 0.12, F.chrom, x, 1.12, z, 0.01); });
      [-5.5, 5.5].forEach(x => { h.box(g, 0.06, 0.9, 10, '#BFE6FF', x, 0.65, 0, 0.015); h.box(g, 0.12, 0.07, 10, F.chrom, x, 1.12, 0, 0.01); });
      [[-4.6, -4.2], [-4.6, -2.0], [-2.4, -4.2]].forEach(([x, z]) => { h.box(g, 0.9, 0.6, 0.9, F.dunkelholz, x, 0.5, z, 0.025); h.kugel(g, 0.45, F.gruen, x, 1.15, z); h.kugel(g, 0.3, F.hellgruen, x + 0.2, 1.4, z + 0.1); });
      [[-4.8, 2.8, -4.8, 4.6], [4.8, -4.6, 4.8, 4.6]].forEach(([x1, z1, x2, z2], j) => {
        h.zyl(g, 0.04, 2.6, F.ink, x1, 1.5, z1, 0.01); h.zyl(g, 0.04, 2.6, F.ink, x2, 1.5, z2, 0.01);
      });
      const kette = new T.CatmullRomCurve3([[-4.8, 2.8, -4.6], [-1, 2.2, -4.7], [2, 2.3, -4.6], [4.8, 2.8, -4.6], [4.8, 2.2, 0], [4.8, 2.8, 4.6]].map(p => new T.Vector3(...p)));
      g.add(new T.Mesh(new T.TubeGeometry(kette, 60, 0.015, 4), new T.MeshBasicMaterial({ color: 0x2B2826 })));
      const birnen = [];
      for (let i = 0; i <= 24; i++) { const p = kette.getPointAt(i / 24); const b = new T.Mesh(W.kugel(0.07, 8, 6), new T.MeshBasicMaterial({ color: 0xFFE38A })); b.position.copy(p); b.position.y -= 0.08; g.add(b); birnen.push(b); }
      g.userData.tick.push(t => birnen.forEach((b, i) => b.material.color.setHSL(0.13, 1, 0.68 + 0.12 * Math.sin(t * 2 + i))));
      h.box(g, 2.2, 0.6, 2.2, '#FFFFFF', 3.6, 0.5, 3.0, 0.03); h.box(g, 1.9, 0.05, 1.9, '#5BB8E8', 3.6, 0.79, 3.0, 0);
      h.box(g, 2.6, 0.1, 1.8, F.ink, -1.2, 0.27, -3.2, 0.02); h.langhantel(g, -1.2, 0.75, -3.2, 2.2, [F.ink, F.rot]);
      const liege = h.box(g, 0.7, 0.12, 1.8, '#FFFFFF', -4.2, 0.5, 2.2, 0.02); h.box(g, 0.7, 0.08, 0.6, F.blau, -4.2, 0.6, 1.6, 0.01);
      H.fahne(g, 4.8, -1.8, 2.2, 0.2, F.eis);
      h.matte(g, 1.0, 0.6, 0.9, 2.2, F.lila, Math.PI / 2);
      return info([1.0, 0.6], 0.2);
    } },
    { name: 'Olympia-Halle', form: 'quadrat', kruemel: '#F2C14E', bau(g, H) {   // Goldregen
      const h = mk(H);
      const hoch = h.raum(g, { boden: '#2F4A7A', wand: '#1F3358', wand2: '#2A3F66', leiste: F.gold, hoehe: 4.0 });
      // Wettkampfplattform: Holz in der Mitte, Gummi außen
      h.box(g, 4.4, 0.16, 4.4, F.ink, 1.0, 0.28, -0.8, 0.03); h.box(g, 2.2, 0.17, 4.2, F.holz, 1.0, 0.29, -0.8, 0.015);
      h.langhantel(g, 1.0, 0.8, -1.6, 2.8, [F.rot, F.blau, F.gold, F.gruen]);
      // Kampfrichter-Lampen, Tisch, Siegertreppchen, Anzeigetafel, Flaggen, Tribünen mit Publikum, Scheinwerfer
      h.box(g, 2.4, 0.8, 0.6, '#FFFFFF', 1.0, 0.6, 3.6, 0.025);
      [0.3, 1.0, 1.7].forEach((x, i) => { h.box(g, 0.3, 0.3, 0.1, F.ink, x, 1.25, 3.7, 0.01); h.kugel(g, 0.1, i === 1 ? F.rot : '#FFFFFF', x, 1.25, 3.62, 0.01); });
      [[-3.2, 0.6, 2, F.gold], [-4.1, 0.4, 3, '#C9C5BE'], [-2.3, 0.3, 1, '#C98A55']].forEach(([x, hh, n, f]) => { h.box(g, 0.85, hh, 0.85, f, x, 0.2 + hh / 2, 1.6, 0.025); });
      h.box(g, 3.4, 1.4, 0.15, F.ink, 1.0, 3.2, -4.75, 0.03); h.box(g, 3.1, 1.1, 0.04, '#3E7A55', 1.0, 3.2, -4.66, 0);
      [[0.3, F.gold], [1.0, '#FFFFFF'], [1.7, F.gold]].forEach(([x, f]) => h.box(g, 0.4, 0.5, 0.02, f, x, 3.2, -4.63, 0));
      [-3.0, -1.6, 3.4, 4.6].forEach((x, i) => { h.box(g, 0.04, 1.3, 0.04, F.chrom, x, 3.0, -4.7, 0); h.box(g, 0.6, 0.4, 0.02, [F.rot, F.gold, F.blau, F.gruen][i], x + 0.32, 3.45, -4.7, 0.01); });
      for (let r = 0; r < 3; r++) { h.box(g, 0.6, 0.4 + r * 0.4, 9.6, r % 2 ? '#3F5A8A' : '#2F4A7A', -4.95 + r * 0.55, 0.4 + r * 0.2, 0, 0.025); }
      const fans = [];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 14; i++) fans.push([-4.95 + r * 0.55, 0.75 + r * 0.4, -4.4 + i * 0.68]);
      h.fans(g, fans);
      [[-4.6, 3.6], [4.6, 3.6]].forEach(([x, z]) => { h.zyl(g, 0.06, 3.6, F.stahl, x, 2.0, z, 0.015); const s = h.box(g, 0.6, 0.5, 0.3, F.gold, x, 3.9, z, 0.02); s.rotation.x = 0.5; });
      h.matte(g, 3.8, 1.2, 0.9, 2.2, F.rot, Math.PI / 2);
      return info([3.8, 1.2], 0.2, { seilY: wandSeile(hoch) });
    } }
  ];

  Arena3D.sets.kraft = KRAFT;
})();
