/* ================= WINTERFORM KRAFT-ARENEN =================
   Zehn Arenen für den Kraft-Modus, als kleine Räume auf schwebenden Inseln (Puppenhaus-Ansicht:
   Rückwand und linke Wand stehen, vorne ist offen). Die Figur trainiert auf ihrer Matte.
   Bausteine kommen aus arena3d.js (bau(g, H)). */
(function () {
  if (!window.Arena3D) return;
  const F = { holz: '#C8A27A', holz2: '#A9825A', dunkelholz: '#7A5535', beton: '#A8A39B', gummi: '#3A3836', fliese: '#D8D2C8',
    weiss: '#F5F0E4', ink: '#2B2826', rot: '#D9643A', blau: '#3FA9E6', eis: '#7CD4FF', gold: '#F2C14E', gruen: '#3E7A55',
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
        h.box(g, 11, 0.18, 0.06, o.leiste || '#F5F0E4', 0, 0.29, -4.78, 0.01);
        h.box(g, 0.06, 0.18, 10, o.leiste || '#F5F0E4', -5.28, 0.29, 0, 0.01);
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
      if (wandX) { h.box(g, 0.04, 0.9, 0.7, '#F5F0E4', -5.28, y, x, 0.015); h.box(g, 0.02, 0.5, 0.45, f1, -5.25, y + 0.08, x, 0); h.box(g, 0.02, 0.1, 0.45, f2, -5.25, y - 0.3, x, 0); }
      else { h.box(g, 0.7, 0.9, 0.04, '#F5F0E4', x, y, -4.78, 0.015); h.box(g, 0.45, 0.5, 0.02, f1, x, y + 0.08, -4.75, 0); h.box(g, 0.45, 0.1, 0.02, f2, x, y - 0.3, -4.75, 0); }
    };
    h.fenster = (g, x, y, w, hh) => {
      h.box(g, w + 0.2, hh + 0.2, 0.08, '#F5F0E4', x, y, -4.78, 0.02);
      h.box(g, w, hh, 0.03, '#BFE6FF', x, y, -4.73, 0);
      h.box(g, 0.06, hh, 0.04, '#F5F0E4', x, y, -4.71, 0); h.box(g, w, 0.06, 0.04, '#F5F0E4', x, y, -4.71, 0);
      h.box(g, w + 0.4, 0.08, 0.25, '#F5F0E4', x, y - hh / 2 - 0.14, -4.66, 0.015);
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
      const inst = new T.InstancedMesh(W.kugel(0.15, 8, 6), new T.MeshToonMaterial({ color: 0xF5F0E4 }), positionen.length);
      const m4 = new T.Matrix4();
      positionen.forEach((p, i) => { m4.makeTranslation(...p); inst.setMatrixAt(i, m4); inst.setColorAt(i, new T.Color(farben[(i * 7) % farben.length])); });
      g.add(inst);
      g.userData.tick.push(t => { positionen.forEach(([x, y, z], i) => { m4.makeTranslation(x, y + Math.max(0, Math.sin(t * 4 + i)) * 0.1, z); inst.setMatrixAt(i, m4); }); inst.instanceMatrix.needsUpdate = true; });
    };
    return h;
  }
  const info = (platz, blick, extra) => Object.assign({ platz, blick, uebungen: UEBUNGEN }, extra || {});
  const wandSeile = hoch => [hoch + 0.2, hoch + 0.2, hoch + 0.2, 0.42];   // hinten links, hinten rechts, vorne links an Wandkanten

  // Antike Trainingsgeräte: Halteres (Steingewichte mit Griff), Steinkugeln, Rundschilde, Speere
  function antik(H, h) {
    const { W, T, teil, G } = H;
    h.halteres = (g, x, y, z, ry = 0, f = G.stein2) => {
      const grp = new T.Group(); grp.position.set(x, y, z); grp.rotation.y = ry; g.add(grp);
      [-0.24, 0.24].forEach(dx => grp.add(teil(W.box(0.2, 0.26, 0.26), f, dx, 0, 0, 0.02)));
      const st = W.rohr(0.035, 0.32, 6); st.rotateZ(Math.PI / 2); grp.add(teil(st, '#7A5A3A', 0, 0, 0, 0.01));
      return grp;
    };
    h.steinkugel = (g, x, z, r = 0.3, f = G.stein2) => h.kugel(g, r, f, x, 0.2 + r, z, 0.025);
    h.schild = (g, x, y, z, wandX, f = G.bronze, zeichen = '#C4472D') => {
      const geo = W.rohr(0.42, 0.08, 18); if (wandX) geo.rotateZ(Math.PI / 2); else geo.rotateX(Math.PI / 2);
      g.add(teil(geo, f, x, y, z, 0.025));
      const ring = W.rohr(0.12, 0.1, 12); if (wandX) ring.rotateZ(Math.PI / 2); else ring.rotateX(Math.PI / 2);
      g.add(teil(ring, zeichen, x + (wandX ? 0.04 : 0), y, z + (wandX ? 0 : 0.04), 0.015));
    };
    h.speer = (g, x, z, neig = 0.12) => {
      const s = teil(W.rohr(0.025, 2.6, 6), '#7A5A3A', x, 1.5, z, 0.01); s.rotation.z = neig; g.add(s);
      const sp = teil(W.kegel(0.06, 0.3, 4), G.bronze, x - Math.sin(neig) * 1.4, 2.95, z, 0.01); sp.rotation.z = neig; g.add(sp);
    };
    h.saeulenWand = (g, n, hoch, f = G.marmor) => { for (let i = 0; i < n; i++) H.saeule(g, -4.4 + i * (9.4 / (n - 1)), -4.45, hoch - 0.6, 0.18, f); };
    h.fries = (g, hoch, f = G.terra) => { h.box(g, 11, 0.2, 0.06, f, 0, hoch - 0.05, -4.78, 0.01); h.box(g, 0.06, 0.2, 10, f, -5.28, hoch - 0.05, 0, 0.01); };
  }

  const KRAFT = [
    { name: 'Hirtenhütte', form: 'quadrat', kruemel: '#D9B85A', bau(g, H) {   // Strohhalme fliegen
      const h = mk(H); antik(H, h); const { G } = H;
      const hoch = h.raum(g, { boden: '#C8A27A', wand: '#D8C49A', wand2: '#CDB88A', leiste: '#A98E5A' });
      h.fenster(g, 1.6, 2.1, 1.6, 1.1);
      // Strohbett mit Wolldecke
      h.box(g, 2.2, 0.35, 3.0, '#D9B85A', -3.9, 0.38, -3.2, 0.04); h.box(g, 2.1, 0.1, 2.0, '#F5F0E4', -3.9, 0.6, -2.8, 0.02); h.box(g, 1.2, 0.2, 0.5, '#E9D6B0', -3.9, 0.65, -4.3, 0.02);
      H.feuerschale(g, 3.9, -3.7);
      H.amphore(g, 4.5, -1.6, 1.1); H.amphore(g, 4.1, -1.2, 0.85); H.amphore(g, 4.6, -0.9, 0.7, G.marmor2);
      const stab = H.teil(H.W.rohr(0.03, 2.2, 6), '#7A5A3A', -5.0, 1.3, -1.2, 0.01); stab.rotation.x = 0.15; g.add(stab);
      h.box(g, 1.4, 0.08, 0.8, '#A9825A', 2.0, 0.9, -4.2, 0.02); [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]].forEach(([dx, dz]) => h.box(g, 0.07, 0.7, 0.07, '#7A5535', 2.0 + dx, 0.55, -4.2 + dz, 0));
      h.kugel(g, 0.13, '#C98A45', 1.8, 1.04, -4.2); h.zyl(g, 0.08, 0.16, G.terra, 2.3, 1.02, -4.1, 0.01);
      h.halteres(g, 2.2, 0.33, 1.7, 0.4); h.steinkugel(g, 2.8, 2.4, 0.22); h.steinkugel(g, -3.6, 1.6, 0.26);
      h.matte(g, 0.6, 1.0, 0.9, 2.2, '#F5F0E4', Math.PI / 2);
      H.schaf(g, -3.4, 3.4, 0.6);
      return info([0.6, 1.0], 0.2, { seilY: wandSeile(hoch), innen: true });
    } },
    { name: 'Schmiede des Hephaistos', form: 'quadrat', kruemel: '#FF9A2E', bau(g, H) {   // Funken
      const h = mk(H); antik(H, h); const { G, T, W } = H;
      const hoch = h.raum(g, { boden: '#6E6A66', wand: '#5A524E', wand2: '#4A4440', leiste: G.bronze, hoehe: 3.6 });
      // Esse mit Glut, die pulsiert
      h.box(g, 2.4, 1.3, 1.6, '#4A4440', -3.8, 0.85, -3.8, 0.04); h.box(g, 1.2, 2.2, 1.0, '#4A4440', -3.8, 2.6, -4.1, 0.03);
      const glut = new T.Mesh(W.box(1.4, 0.35, 0.05), new T.MeshBasicMaterial({ color: 0xFF7A2E })); glut.position.set(-3.8, 0.95, -2.98); g.add(glut);
      g.userData.tick.push(t => glut.material.color.setHSL(0.06, 1, 0.5 + 0.08 * Math.sin(t * 5)));
      // Amboss mit Hammer
      h.box(g, 0.5, 0.6, 0.5, '#2B2826', -1.4, 0.5, -2.6, 0.02); h.box(g, 1.0, 0.25, 0.4, '#3A3836', -1.4, 0.92, -2.6, 0.02);
      const stiel = h.box(g, 0.06, 0.06, 0.7, '#7A5A3A', -1.2, 1.12, -2.5, 0); stiel.rotation.y = 0.5; h.box(g, 0.2, 0.14, 0.14, '#2B2826', -1.5, 1.12, -2.7, 0.01);
      // Bronzeschilde an der Wand, Speere
      [[-1.0, F.rot], [0.2, G.aegaeis], [1.4, F.rot]].forEach(([x, f]) => h.schild(g, x, 2.3, -4.72, false, G.bronze, f));
      h.speer(g, 3.4, -4.4, 0.1); h.speer(g, 3.8, -4.4, -0.08);
      // Funken springen aus der Esse
      const funken = [0, 1, 2, 3, 4, 5].map(() => { const m = new T.Mesh(W.box(0.06, 0.06, 0.06), new T.MeshBasicMaterial({ color: 0xFFD54A })); g.add(m); return m; });
      g.userData.tick.push(t => funken.forEach((m, i) => { const p = (t * 0.8 + i / 6) % 1; m.position.set(-3.8 + Math.sin(i * 2.1) * p * 0.9, 1.2 + p * 1.4 - p * p * 1.2, -2.9 + p * 0.6); m.visible = p < 0.9; }));
      h.zyl(g, 0.4, 0.7, '#7A5A3A', 4.2, 0.55, -1.8, 0.03, 14); h.zyl(g, 0.36, 0.05, '#5BB8E8', 4.2, 0.92, -1.8, 0);
      h.halteres(g, 2.6, 0.33, 1.5, 0.3, G.bronze); h.halteres(g, 3.2, 0.33, 2.2, -0.4, G.bronze); h.steinkugel(g, -3.4, 1.8, 0.3, '#3A3836');
      h.matte(g, 0.4, 1.4, 0.9, 2.2, '#7A5A3A', Math.PI / 2);
      return info([0.4, 1.4], 0.2, { seilY: wandSeile(hoch), innen: true });
    } },
    { name: 'Palaistra', form: 'quadrat', kruemel: '#EAD39C', bau(g, H) {   // Sand
      const h = mk(H); antik(H, h); const { G } = H;
      const hoch = h.raum(g, { boden: '#EAD39C', wand: G.marmor, wand2: G.marmor2, leiste: G.terra, hoehe: 3.8 });
      h.saeulenWand(g, 6, hoch); h.fries(g, hoch);
      // Ringplatz aus Sand, Öl-Amphoren, Diskus, Speere, Statue eines Ringers
      h.zyl(g, 2.0, 0.04, '#E3C58C', 1.4, 0.22, -1.8, 0.015, 30);
      H.amphore(g, -4.6, -2.6, 1.1); H.amphore(g, -4.6, -1.9, 0.9); H.amphore(g, -4.3, -3.3, 0.8);
      h.zyl(g, 0.22, 0.05, G.bronze, 3.4, 0.24, 2.4, 0.015, 18); h.zyl(g, 0.22, 0.05, G.bronze, 3.9, 0.24, 2.1, 0.015, 18);
      h.speer(g, 4.8, -0.6, 0.15); h.speer(g, 4.8, -0.2, 0.05);
      H.statue(g, -3.6, 2.6, 1.0, G.marmor, 0.6);
      h.halteres(g, 2.4, 0.33, 1.2, 0.2); h.halteres(g, 2.9, 0.33, 1.6, -0.3);
      h.matte(g, -1.0, 1.4, 0.9, 2.2, G.terra, Math.PI / 2);
      return info([-1.0, 1.4], 0.2, { seilY: wandSeile(hoch), innen: true });
    } },
    { name: 'Olivenhof', form: 'quadrat', kruemel: '#A7B86E', bau(g, H) {
      const h = mk(H); antik(H, h); const { G, T, W } = H;
      H.sockel(g, 'quadrat', '#A7B86E', '#9C7448', '#7E5B37');
      // Steinplatz zum Trainieren, Steine in drei Größen
      for (let i = 0; i < 5; i++) for (let k = 0; k < 3; k++) h.box(g, 0.98, 0.05, 0.98, (i + k) % 2 ? '#CFC5AE' : '#BFB49A', -2.0 + i, 0.22, -3.0 + k, 0.01);
      [[1.6, -2.4, 0.35], [2.4, -2.0, 0.28], [2.9, -2.6, 0.22]].forEach(([x, z, r]) => h.steinkugel(g, x, z, r));
      // Ölmühle, Mauer, Olivenbäume, Amphoren, Zaun
      h.zyl(g, 0.9, 0.35, G.stein, -3.6, 0.38, 0.6, 0.03, 18); const ms = h.zyl(g, 0.4, 0.22, G.stein2, -3.2, 0.82, 0.6, 0.03, 16, 'z');
      g.userData.tick.push(t => { ms.position.set(-3.6 + Math.cos(t * 0.6) * 0.45, 0.82, 0.6 + Math.sin(t * 0.6) * 0.45); ms.rotation.y = -t * 0.6; });
      H.mauer(g, [-5.0, -4.6], [5.0, -4.6], 0.6); H.mauer(g, [-5.1, -4.4], [-5.1, 2.6], 0.6);
      H.olivenbaum(g, -4.4, -3.6, 1.0); H.olivenbaum(g, 4.5, -3.6, 1.1); H.olivenbaum(g, 4.5, 4.2, 0.9); H.olivenbaum(g, -4.5, 4.2, 0.85);
      H.amphore(g, 4.5, 0.4, 1.0); H.amphore(g, 4.2, 0.9, 0.8);
      H.weg(g, [[-4.6, 3.0], [-1, 2.8], [2.6, 3.0], [4.4, 1.6]], 0.8, '#D8C49A');
      h.matte(g, 0.3, 0.8, 0.9, 2.2, '#8B5A2B', Math.PI / 2);
      return info([0.3, 0.8], 0.2);
    } },
    { name: 'Kampfschule von Sparta', form: 'quadrat', kruemel: '#C9A86A', bau(g, H) {
      const h = mk(H); antik(H, h); const { G } = H;
      const hoch = h.raum(g, { boden: '#B5966A', wand: '#A9573A', wand2: '#8E4E3A', leiste: G.bronze, hoehe: 3.6 });
      // Schilde mit Lambda-Zeichen an beiden Wänden, rote Tücher
      [-3.4, -1.6, 0.2, 2.0, 3.8].forEach(x => h.schild(g, x, 2.2, -4.72, false, G.bronze, '#C4472D'));
      [-3.0, -1.2, 0.6].forEach(z => h.schild(g, -5.22, 2.2, z, true, G.bronze, '#C4472D'));
      [-4.4, 4.4].forEach(x => h.box(g, 0.9, 2.2, 0.04, '#C4472D', x, 2.2, -4.74, 0.015));
      // Speerständer, Holzpfosten zum Schlagen, Helme auf dem Regal
      for (let i = 0; i < 5; i++) h.speer(g, 3.4 + i * 0.3, -3.6, 0.05 - i * 0.03);
      h.zyl(g, 0.12, 2.2, '#8B5A2B', -2.6, 1.3, -1.4, 0.02, 8); h.zyl(g, 0.3, 1.0, '#D9B85A', -2.6, 1.5, -1.4, 0.03, 12);
      [1.15, 1.85].forEach(y => h.zyl(g, 0.31, 0.06, '#7A5535', -2.6, y, -1.4, 0.01, 12));
      h.box(g, 0.35, 0.06, 2.4, '#7A5535', -5.12, 1.5, 2.4, 0.015);
      [1.6, 2.4, 3.2].forEach(z => { h.kugel(g, 0.18, G.bronze, -5.05, 1.68, z, 0.015); h.box(g, 0.05, 0.16, 0.26, '#C4472D', -5.05, 1.9, z, 0); });
      h.halteres(g, 2.4, 0.33, 1.6, 0.4, G.bronze); h.steinkugel(g, 3.2, 2.4, 0.3); h.steinkugel(g, 3.8, 1.8, 0.24);
      h.matte(g, 0.2, 1.2, 0.9, 2.2, '#C4472D', Math.PI / 2);
      return info([0.2, 1.2], 0.2, { seilY: wandSeile(hoch), innen: true });
    } },
    { name: 'Gymnasion von Athen', form: 'quadrat', kruemel: '#F5F0E4', bau(g, H) {
      const h = mk(H); antik(H, h); const { G } = H;
      const hoch = h.raum(g, { boden: '#E9E2D2', wand: G.marmor, wand2: '#DCD3C1', muster: 'fliesen', leiste: G.gold, hoehe: 4.0 });
      h.saeulenWand(g, 7, hoch); h.fries(g, hoch, G.aegaeis);
      // Mosaik im Boden, Statuen, Steinbank mit Halteres, Lorbeerkranz an der Wand
      h.zyl(g, 1.5, 0.02, G.aegaeis, 1.6, 0.215, -2.0, 0, 30); h.zyl(g, 1.2, 0.025, G.marmor, 1.6, 0.22, -2.0, 0, 30); h.zyl(g, 0.5, 0.03, G.terra, 1.6, 0.225, -2.0, 0, 20);
      H.statue(g, -3.8, -3.4, 1.1, G.marmor, 0.3); H.statue(g, 4.4, -3.2, 1.0, G.bronze, -0.3);
      h.box(g, 0.6, 0.45, 3.0, G.marmor2, -4.7, 0.42, 1.2, 0.03);
      for (let i = 0; i < 4; i++) h.halteres(g, -4.7, 0.78, 0.2 + i * 0.65, Math.PI / 2, i % 2 ? G.bronze : G.stein2);
      const kranz = new H.T.TorusGeometry(0.4, 0.07, 6, 20); g.add(H.teil(kranz, G.gold, -5.2, 2.6, 1.2, 0.02)); g.children[g.children.length - 1].rotation.y = Math.PI / 2;
      H.amphore(g, 4.6, 1.6, 1.0, G.terra); H.amphore(g, 4.6, 2.3, 0.8, G.aegaeis);
      h.matte(g, 0.6, 1.4, 0.9, 2.2, G.aegaeis, Math.PI / 2);
      return info([0.6, 1.4], 0.2, { seilY: wandSeile(hoch), innen: true });
    } },
    { name: 'Strand von Kreta', form: 'quadrat', kruemel: '#EAD39C', bau(g, H) {
      const h = mk(H); antik(H, h); const { T, W, G } = H;
      H.sockel(g, 'quadrat', F.sand, '#C9A86A', '#A98E5A');
      const meer = new T.PlaneGeometry(11.2, 3.2, 24, 8); meer.rotateX(-Math.PI / 2);
      const wm = new T.Mesh(meer, W.mat(G.meer)); wm.position.set(0, 0.27, -3.5); g.add(wm);
      const basis = meer.attributes.position.array.slice();
      g.userData.tick.push(t => { const p = meer.attributes.position; for (let i = 0; i < p.count; i++) p.array[i * 3 + 1] = Math.sin(basis[i * 3] * 1.2 + t * 1.6) * 0.05; p.needsUpdate = true; });
      for (let i = 0; i < 3; i++) h.box(g, 11, 0.04, 0.08, '#F5F0E4', 0, 0.32, -2.0 - i * 0.8, 0);
      // Felsbrocken zum Heben, Holzplattform, Boot am Ufer, weißes Haus, Olivenbaum
      [[2.6, 0.2, 0.4], [3.4, -0.4, 0.3], [3.8, 0.6, 0.24]].forEach(([x, z, r]) => g.add(H.teil(new T.DodecahedronGeometry(r, 0), G.stein2, x, 0.2 + r * 0.8, z, 0.03)));
      h.box(g, 3.0, 0.12, 2.0, F.holz, -1.6, 0.27, 0.0, 0.025);
      h.halteres(g, -2.2, 0.48, -0.3, 0.2); h.halteres(g, -1.0, 0.48, -0.4, -0.3);
      const boot = W.kugel(0.5, 12, 8); boot.scale(2.2, 0.55, 0.9); g.add(H.teil(boot, '#7A5A3A', -3.6, 0.32, -1.4, 0.03));
      H.weissesHaus(g, 4.2, 3.4, 1.6, 1.4, 1.4, true, -0.3); H.olivenbaum(g, -4.4, 3.6, 0.9); H.zypresse(g, -4.7, 1.4, 0.75);
      h.matte(g, 0.4, 2.0, 0.9, 2.2, G.aegaeis, Math.PI / 2);
      return info([0.4, 2.0], 0.2);
    } },
    { name: 'Arena der Gladiatoren', form: 'quadrat', kruemel: '#E3C58C', bau(g, H) {
      const h = mk(H); antik(H, h); const { G } = H;
      H.sockel(g, 'quadrat', '#E3C58C', '#B5654A', '#8E4E3A');
      // Rundmauer mit Bögen hinten, oben jubelt das Publikum
      for (let i = 0; i < 9; i++) {
        const w = Math.PI * (1.08 + i * 0.105), x = Math.cos(w) * 5.0, z = Math.sin(w) * 4.6 * 0.95;
        const m = h.box(g, 1.15, 2.6, 0.5, '#D9B98A', x, 1.5, z, 0.04, -w - Math.PI / 2);
        const tor = h.box(g, 0.5, 1.2, 0.52, '#5A3A2A', x, 0.9, z, 0, -w - Math.PI / 2);
      }
      const fans = [];
      for (let i = 0; i < 18; i++) { const w = Math.PI * (1.08 + i * 0.05); fans.push([Math.cos(w) * 5.0, 3.0, Math.sin(w) * 4.6 * 0.95]); }
      h.fans(g, fans);
      // Waffenständer, rote Langschilde, Säulen am Eingang
      for (let i = 0; i < 4; i++) h.speer(g, 3.6 + i * 0.28, 1.6, 0.06 - i * 0.04);
      [[-4.2, 2.2], [-3.4, 2.6]].forEach(([x, z]) => { h.box(g, 0.7, 1.1, 0.1, '#C4472D', x, 0.75, z, 0.02, 0.4); h.kugel(g, 0.1, G.gold, x + 0.03, 0.75, z + 0.06, 0.01); });
      H.saeule(g, -1.6, 4.4, 2.0, 0.18); H.saeule(g, 1.6, 4.4, 2.0, 0.18);
      H.feuerschale(g, -4.2, -0.6); H.feuerschale(g, 4.2, -0.6);
      h.halteres(g, 2.4, 0.33, 0.6, 0.4, G.bronze); h.steinkugel(g, 2.6, -1.0, 0.3);
      h.matte(g, 0.0, 0.8, 0.9, 2.2, '#C4472D', Math.PI / 2);
      return info([0.0, 0.8], 0.2);
    } },
    { name: 'Tempel der Athene', form: 'quadrat', kruemel: '#F2C14E', bau(g, H) {
      const h = mk(H); antik(H, h); const { G } = H;
      const hoch = h.raum(g, { boden: '#E9E2D2', wand: '#D6CDBA', wand2: '#E9E2D2', muster: 'fliesen', leiste: G.gold, hoehe: 4.2 });
      h.fries(g, hoch, G.aegaeis);
      // Große goldene Athene, Säulen rechts und links, Feuerschalen, Eule, Opfergaben
      h.box(g, 1.6, 0.6, 1.4, G.marmor2, 1.0, 0.5, -4.0, 0.03);
      H.statue(g, 1.0, -4.0, 1.9, G.gold, 0);
      const st = g.children[g.children.length - 1]; st.position.y = 0.8;
      [-1.4, 3.4].forEach(x => { H.saeule(g, x, -3.4, 3.2, 0.22); H.saeule(g, x, -1.4, 3.2, 0.22); });
      H.feuerschale(g, -0.4, -2.6); H.feuerschale(g, 2.4, -2.6);
      h.kugel(g, 0.2, '#8B6A45', -4.6, 2.3, -2.0, 0.015); h.kugel(g, 0.16, '#8B6A45', -4.6, 2.62, -2.0, 0.015); h.box(g, 0.5, 0.06, 0.6, G.marmor2, -4.9, 2.0, -2.0, 0.01);
      H.amphore(g, -4.5, 1.0, 0.9, G.gold); H.amphore(g, -4.5, 1.6, 0.7, G.terra);
      h.schild(g, -5.22, 2.4, 0.2, true, G.gold, G.aegaeis);
      h.halteres(g, 3.4, 0.33, 1.6, 0.2, G.gold);
      h.matte(g, 1.0, 1.4, 0.9, 2.2, G.aegaeis, Math.PI / 2);
      return info([1.0, 1.4], 0.2, { seilY: wandSeile(hoch), innen: true });
    } },
    { name: 'Halle des Olymp', form: 'quadrat', kruemel: '#F2C14E', bau(g, H) {   // Goldregen
      const h = mk(H); antik(H, h); const { G } = H;
      const hoch = h.raum(g, { boden: '#F5F0E4', wand: '#F2E3B8', wand2: '#EADCB0', leiste: G.gold, hoehe: 4.2 });
      h.saeulenWand(g, 6, hoch, G.gold); h.fries(g, hoch, G.gold);
      // Wettkampfpodest aus Marmor mit goldenen Halteres, Throne der Götter, Wolken
      h.box(g, 4.4, 0.16, 4.4, G.marmor2, 1.0, 0.28, -0.8, 0.03); h.box(g, 2.2, 0.17, 4.2, G.marmor, 1.0, 0.29, -0.8, 0.015);
      h.halteres(g, 0.6, 0.5, -1.6, 0, G.gold); h.halteres(g, 1.4, 0.5, -1.2, 0.5, G.gold);
      [[-3.2, -3.6], [-1.6, -3.9], [3.6, -3.6]].forEach(([x, z]) => {
        h.box(g, 1.0, 0.5, 0.9, G.gold, x, 0.45, z, 0.03); h.box(g, 1.0, 1.5, 0.2, G.gold, x, 1.2, z - 0.4, 0.03); h.box(g, 0.8, 0.1, 0.7, '#C4472D', x, 0.75, z + 0.05, 0.01);
      });
      H.wolke(g, -3.6, 3.4, -2.0, 0.7); H.wolke(g, 3.8, 3.6, -1.0, 0.6); H.wolke(g, -4.4, 0.4, 2.8, 0.6);
      // Publikum auf Marmorstufen
      for (let r = 0; r < 3; r++) h.box(g, 0.6, 0.4 + r * 0.4, 6.0, r % 2 ? G.marmor : G.marmor2, -4.95 + r * 0.55, 0.4 + r * 0.2, 1.8, 0.025);
      const fans = []; for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) fans.push([-4.95 + r * 0.55, 0.75 + r * 0.4, -1.0 + i * 0.68]);
      h.fans(g, fans);
      h.matte(g, 3.8, 1.2, 0.9, 2.2, '#C4472D', Math.PI / 2);
      return info([3.8, 1.2], 0.2, { seilY: wandSeile(hoch), innen: true });
    } }
  ];

  Arena3D.sets.kraft = KRAFT;
})();
