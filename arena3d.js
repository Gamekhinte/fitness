/* ================= WINTERFORM ARENA 3D =================
   Die Arena als schwebende Insel, die an vier Seilen von oben hängt (three.js, lädt erst beim Anzeigen).
   Physik: Runterziehen spannt die Seile, loslassen lässt die Insel hochfedern (oben werden die Seile schlaff
   und sie fällt zurück). Seitlich ziehen verdreht und schaukelt sie, die Seile drehen sie zurück.
   Kurz antippen öffnet den Arena-Weg. Ohne WebGL bleibt das flache Bild stehen. */
(function () {
  const QUELLE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const F = { ink: 0x2B2826, schnee: 0xFFFFFF, erde: 0x9C7448, erde2: 0x7E5B37, bahn: 0xD9643A, eis: 0xBFE6FF, eis2: 0x7CD4FF,
    wand: 0xEADCC2, tanne: 0x3E7A55, stamm: 0x6B4A2E, stein: 0xB9B4AC, gold: 0xF2C14E, nacht: 0x3B4A63, seil: 0xD8B27A,
    gruen: 0x58C49A, tuerkis: 0x5FD3D0 };
  const ECKEN = [[-5.4, -4.9], [5.4, -4.9], [-5.4, 4.9], [5.4, 4.9]];
  const ANKER_Y = 26;
  let T = null, laden = null;
  const st = { renderer: null, kamera: null, szene: null, insel: null, halter: null, fahne: null, el: null, nr: -1, seile: [], beimTippen: null };
  const phy = { y: 0, vy: 0, yaw: 0, vyaw: 0, sx: 0, vsx: 0, zieh: null };

  function holen() { return laden || (laden = import(QUELLE).then(m => { T = m; })); }

  /* ---------- Bausteine ---------- */
  let grad, inkMat;
  const mats = {};
  function mat(c, extra) {
    if (!grad) {
      grad = new T.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, T.RedFormat);
      grad.minFilter = grad.magFilter = T.NearestFilter; grad.needsUpdate = true;
      inkMat = new T.MeshBasicMaterial({ color: F.ink, side: T.BackSide });
    }
    const k = c + (extra ? JSON.stringify(extra) : '');
    return mats[k] || (mats[k] = new T.MeshToonMaterial(Object.assign({ color: c, gradientMap: grad }, extra || {})));
  }
  function teil(geo, farbe, x, y, z, umriss = 0.05) {
    geo.center();
    const m = new T.Mesh(geo, mat(farbe));
    m.position.set(x, y, z);
    if (umriss) {
      geo.computeBoundingBox();
      const s = new T.Vector3(); geo.boundingBox.getSize(s);
      const o = new T.Mesh(geo, inkMat);
      o.scale.set(1 + 2 * umriss / Math.max(s.x, 0.02), 1 + 2 * umriss / Math.max(s.y, 0.02), 1 + 2 * umriss / Math.max(s.z, 0.02));
      m.add(o);
    }
    return m;
  }
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  const kegel = (r, h, n = 8) => new T.ConeGeometry(r, h, n);
  const rohr = (r, h, n = 10) => new T.CylinderGeometry(r, r, h, n);
  function rundRechteck(w, h, r) {
    const s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function flach(form, dicke) {
    const g = new T.ExtrudeGeometry(form, { depth: dicke, bevelEnabled: false, curveSegments: 18 });
    g.rotateX(-Math.PI / 2); return g;
  }
  function ring(aw, ah, ar, iw, ih, ir) { const s = rundRechteck(aw, ah, ar); s.holes.push(rundRechteck(iw, ih, ir)); return s; }
  const prisma = (b, h, t) => { const s = new T.Shape(); s.moveTo(-b / 2, 0); s.lineTo(b / 2, 0); s.lineTo(0, h); s.closePath(); return new T.ExtrudeGeometry(s, { depth: t, bevelEnabled: false }); };

  function tanne(g, x, z, s = 1) {
    g.add(teil(new T.CylinderGeometry(0.12 * s, 0.14 * s, 0.5 * s, 8), F.stamm, x, 0.45 * s, z, 0.03));
    g.add(teil(kegel(0.85 * s, 1.2 * s), F.tanne, x, 1.15 * s, z, 0.05));
    g.add(teil(kegel(0.62 * s, 1.0 * s), F.tanne, x, 1.75 * s, z, 0.05));
    g.add(teil(kegel(0.3 * s, 0.45 * s), F.schnee, x, 2.2 * s, z, 0.04));
  }
  function huerde(g, x, z) {
    g.add(teil(box(0.08, 0.5, 0.08), F.schnee, x, 0.5, z - 0.45, 0.025));
    g.add(teil(box(0.08, 0.5, 0.08), F.schnee, x, 0.5, z + 0.45, 0.025));
    g.add(teil(box(0.1, 0.16, 1.05), F.bahn, x, 0.78, z, 0.03));
  }
  function fahne(g, x, z, h = 3.4, y0 = 0.2) {
    g.add(teil(rohr(0.05, h, 8), F.stein, x, y0 + h / 2, z, 0.03));
    const geo = new T.PlaneGeometry(1.1, 0.65, 8, 1);
    geo.translate(0.55, 0, 0);
    const f = new T.Mesh(geo, mat(F.eis2, { side: T.DoubleSide }));
    f.position.set(x + 0.05, y0 + h - 0.35, z);
    f.userData.basis = geo.attributes.position.array.slice();
    g.add(f); g.userData.fahne = f;
  }
  function schule(g) {
    g.add(teil(box(5.2, 2.2, 1.6), F.wand, 0, 1.3, -3.6));
    g.add(teil(prisma(5.8, 1.2, 2), F.bahn, 0, 3.0, -3.6));
    g.add(teil(prisma(4.8, 0.95, 2.1), F.schnee, 0, 3.22, -3.6, 0.03));
    for (const x of [-1.9, -1.1, 1.1, 1.9]) for (const y of [0.85, 1.75]) g.add(teil(box(0.5, 0.55, 0.06), F.eis2, x, y, -2.79, 0.03));
    g.add(teil(box(0.8, 1.2, 0.06), F.bahn, 0, 0.8, -2.79, 0.03));
    const uhr = new T.CylinderGeometry(0.28, 0.28, 0.08, 20); uhr.rotateX(Math.PI / 2);
    g.add(teil(uhr, F.schnee, 0, 3.0, -2.55, 0.03));
  }
  function berge(g, farbe, liste = [[-3.4, 2.6, 1.9], [0, 3.6, 2.4], [3.4, 2.8, 2.0]]) {
    liste.forEach(([x, h, r]) => {
      g.add(teil(kegel(r, h, 7), farbe, x, 0.2 + h / 2, -3.8, 0.05));
      g.add(teil(kegel(r * 0.42, h * 0.42, 7), F.schnee, x, 0.2 + h - h * 0.21, -3.8, 0.04));
    });
  }
  function turm(g, x, z, h, r, farbe, dach) {
    g.add(teil(rohr(r, h, 12), farbe, x, 0.2 + h / 2, z, 0.05));
    g.add(teil(kegel(r * 1.25, h * 0.45, 12), dach, x, 0.2 + h + h * 0.22, z, 0.05));
  }

  /* ---------- Die zehn Arenen ---------- */
  function insel(nr) {
    const g = new T.Group();
    const nacht = nr === 5;
    g.add(teil(box(11, 1.4, 10), nacht ? F.nacht : F.erde, 0, -0.6, 0, 0.06));
    g.add(teil(box(9.4, 1.1, 8.4), nacht ? 0x2A3446 : F.erde2, 0, -1.7, 0, 0.06));
    g.add(teil(box(11.2, 0.4, 10.2), nacht ? 0xDCE8F5 : F.schnee, 0, 0, 0, 0.05));
    g.add(teil(flach(ring(8.6, 5.6, 2.8, 6.2, 3.2, 1.6), 0.1), F.bahn, 0, 0.25, 0.9, 0.03));
    g.add(teil(flach(ring(7.44, 4.44, 2.2, 7.32, 4.32, 2.14), 0.02), F.schnee, 0, 0.31, 0.9, 0));
    const innen = [F.schnee, 0xCFE3C8, F.eis, F.schnee, F.eis, F.eis, F.schnee, F.schnee, F.eis, F.schnee][nr] || F.schnee;
    g.add(teil(flach(rundRechteck(6.2, 3.2, 1.6), 0.06), innen, 0, 0.23, 0.9, 0));
    huerde(g, -1, 3.1); huerde(g, 1.2, 3.1);
    // Ösen an den Ecken, dort hängen die Seile
    ECKEN.forEach(([x, z]) => { const o = new T.TorusGeometry(0.22, 0.07, 8, 16); o.rotateY(Math.PI / 4); g.add(teil(o, F.gold, x, 0.42, z, 0.02)); });
    const baeume = (l, s = 1) => l.forEach(([x, z], k) => tanne(g, x, z, s * (0.85 + (k % 3) * 0.1)));
    switch (nr) {
      case 0: schule(g); fahne(g, 3.4, -3.3); baeume([[-4.4, -3.6], [4.5, -3.9], [-4.6, 3.9], [4.5, 4.0]]); break;
      case 1: // Stadtpark: zugefrorener Teich, Bank, viele Tannen
        g.add(teil(flach(rundRechteck(3.6, 2.2, 1.1), 0.06), F.eis2, -2.2, 0.24, -3.4, 0.03));
        g.add(teil(box(1.6, 0.12, 0.5), F.stamm, 2.2, 0.6, -3.6, 0.03)); g.add(teil(box(1.6, 0.5, 0.1), F.stamm, 2.2, 0.85, -3.85, 0.03));
        baeume([[-4.4, -3.6], [0.4, -4.0], [4.5, -3.9], [-4.6, 3.9], [4.5, 4.0], [4.6, 1.0]], 0.9); fahne(g, -4.6, 1.4); break;
      case 2: // Eisbahn: Flutlicht, Bande
        [[-4.6, -4.2], [4.6, -4.2], [-4.6, 4.3], [4.6, 4.3]].forEach(([x, z]) => {
          g.add(teil(rohr(0.07, 3), F.stein, x, 1.7, z, 0.03)); g.add(teil(box(0.6, 0.3, 0.3), F.gold, x, 3.3, z, 0.03));
        });
        g.add(teil(box(6, 0.9, 1), F.eis2, 0, 0.65, -4, 0.04)); fahne(g, 0, -4.4); break;
      case 3: // Skipiste: Berge und Lift
        berge(g, F.stein);
        [-4.4, 4.4].forEach(x => { g.add(teil(rohr(0.1, 3.4), F.stein, x, 1.9, -1.4, 0.03)); g.add(teil(box(0.8, 0.12, 0.12), F.stein, x, 3.6, -1.4, 0.03)); });
        g.add(teil(box(8.8, 0.04, 0.04), F.ink, 0, 3.55, -1.4, 0));
        [-2, 1.5].forEach(x => { g.add(teil(rohr(0.03, 0.6), F.ink, x, 3.25, -1.4, 0)); g.add(teil(box(0.6, 0.35, 0.4), F.bahn, x, 2.85, -1.4, 0.03)); });
        baeume([[-4.6, 3.9], [4.5, 4.0]]); break;
      case 4: // Gletscher: Eiskristalle
        berge(g, 0x9FD3F0);
        [[-4.2, 3.6, 0.8], [4.3, 3.8, 0.7], [-4.5, -1, 0.6], [4.4, -0.8, 0.9], [3.2, 4.3, 0.5]].forEach(([x, z, s]) => {
          const k = new T.OctahedronGeometry(s); k.scale(0.7, 1.4, 0.7); g.add(teil(k, F.eis2, x, 0.2 + s * 1.3, z, 0.04));
        });
        fahne(g, -4.6, 1.4); break;
      case 5: { // Polarnacht: dunkle Insel, Nordlicht
        berge(g, 0x6E7E99);
        [[F.gruen, -4.6, 5.4], [F.tuerkis, -5.4, 4.8]].forEach(([c, z, y]) => {
          const geo = new T.PlaneGeometry(10, 1.1, 24, 1);
          const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 0.8) * 0.5);
          const b = new T.Mesh(geo, mat(c, { side: T.DoubleSide, transparent: true, opacity: 0.75 })); b.position.set(0, y, z); g.add(b);
        });
        baeume([[-4.6, 3.9], [4.5, 4.0]], 0.9); break;
      }
      case 6: // Gipfel: ein großer Berg mit Fahne oben
        berge(g, F.stein, [[-3.6, 2.2, 1.6], [0.6, 5.2, 3.0], [4, 2.4, 1.7]]);
        fahne(g, 0.6, -3.8, 1.6, 5.3); baeume([[-4.6, 3.9], [4.5, 4.0]], 0.8); break;
      case 7: { // Sprungschanze
        const rampe = box(2.2, 0.6, 7.2); rampe.rotateX(-0.55);
        g.add(teil(rampe, F.schnee, 2.8, 2.1, -1.6, 0.05));
        g.add(teil(box(1.8, 4.6, 1.4), F.bahn, 2.8, 2.5, -4.3, 0.05));
        g.add(teil(box(2.2, 0.3, 1.8), F.wand, 2.8, 4.95, -4.3, 0.04));
        [0.6, 1.6].forEach(dz => g.add(teil(rohr(0.1, 2.4), F.stein, 2.8, 1.3, -1.6 - dz, 0.03)));
        baeume([[-4.4, -3.6], [-1.6, -4.0], [-4.6, 3.9], [4.5, 4.0]]); fahne(g, -4.6, 1.4); break;
      }
      case 8: // Eispalast
        g.add(teil(box(5, 2.4, 1.6), F.eis, 0, 1.4, -3.7, 0.05));
        turm(g, -2.8, -3.7, 3.4, 0.7, F.eis, F.eis2); turm(g, 2.8, -3.7, 3.4, 0.7, F.eis, F.eis2); turm(g, 0, -3.9, 4.4, 0.8, F.eis, F.eis2);
        g.add(teil(box(1, 1.3, 0.06), F.eis2, 0, 0.85, -2.88, 0.03));
        baeume([[-4.6, 3.9], [4.5, 4.0]]); break;
      case 9: // Nordpol: gestreifter Pol und Iglu
        for (let k = 0; k < 6; k++) g.add(teil(rohr(0.25, 0.6, 14), k % 2 ? F.schnee : F.bahn, -2.6, 0.5 + k * 0.6, -3.4, 0.03));
        g.add(teil(new T.SphereGeometry(0.4, 14, 10), F.gold, -2.6, 4.2, -3.4, 0.03));
        { const ig = new T.SphereGeometry(1.5, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2); g.add(teil(ig, F.schnee, 2.4, 0.95, -3.4, 0.05)); }
        { const tuer = new T.CylinderGeometry(0.5, 0.5, 0.9, 14, 1, false, 0, Math.PI); tuer.rotateX(Math.PI / 2); g.add(teil(tuer, F.schnee, 2.4, 0.5, -2.0, 0.04)); }
        baeume([[-4.6, 3.9], [4.5, 4.0], [4.6, -4.0]], 0.8); break;
    }
    return g;
  }

  /* ---------- Seile ---------- */
  const seilMat = () => mat(F.seil);
  function seileBauen() {
    st.seile = ECKEN.map(([x, z]) => {
      const m = new T.Mesh(new T.BufferGeometry(), seilMat());
      const u = new T.Mesh(new T.BufferGeometry(), inkMat);
      st.szene.add(m); st.szene.add(u);
      return { m, u, anker: new T.Vector3(), lokal: new T.Vector3(x, 0.42, z), laenge: 0 };
    });
  }
  function seileZeichnen() {
    if (!st.insel) return;
    st.insel.updateMatrixWorld(true);
    for (const s of st.seile) {
      const unten = s.lokal.clone().applyMatrix4(st.insel.matrixWorld);
      const dist = unten.distanceTo(s.anker);
      const locker = Math.max(0, s.laenge - dist);           // Seil hängt durch, wenn die Insel höher ist als normal
      const mitte = unten.clone().lerp(s.anker, 0.5);
      mitte.y -= locker * 0.55; mitte.x += locker * 0.25 * Math.sign(s.lokal.x);
      const kurve = new T.QuadraticBezierCurve3(unten, mitte, s.anker);
      s.m.geometry.dispose(); s.u.geometry.dispose();
      s.m.geometry = new T.TubeGeometry(kurve, 20, 0.08, 6, false);
      s.u.geometry = new T.TubeGeometry(kurve, 20, 0.13, 6, false);
    }
  }

  /* ---------- Physik ---------- */
  const K = 70, G = 28, S0 = G / K;                         // Seil-Federkraft, Schwerkraft, Dehnung im Ruhezustand
  function schritt(dt, t) {
    if (phy.zieh) return;
    // Hoch und runter: Seile ziehen nur, sie drücken nie. Ist die Insel zu hoch, fällt sie frei.
    const straff = phy.y < S0;
    const ay = straff ? -K * phy.y - 3.2 * phy.vy : -G - 0.2 * phy.vy;
    phy.vy += ay * dt; phy.y += phy.vy * dt;
    // Verdrehen und Schaukeln: die schrägen Seile ziehen zurück in die Mitte
    phy.vyaw += (-14 * phy.yaw - 1.6 * phy.vyaw) * dt; phy.yaw += phy.vyaw * dt;
    phy.vsx += (-9 * phy.sx - 1.1 * phy.vsx) * dt; phy.sx += phy.vsx * dt;
    // ganz leichter Wind, damit sie nicht wie festgeklebt wirkt
    phy.yaw += Math.sin(t * 0.7) * 0.0004;
  }
  function anwenden() {
    const i = st.halter;
    i.position.set(phy.sx, phy.y, 0);
    i.rotation.set(0, -0.35 + phy.yaw, -phy.sx * 0.07 + Math.max(-0.08, Math.min(0.08, phy.vy * 0.004)));
  }

  /* ---------- Bühne ---------- */
  function aufbauen(el) {
    const r = new T.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    el.appendChild(r.domElement);
    const k = new T.PerspectiveCamera(30, 1, 0.1, 200);
    const s = new T.Scene();
    s.add(new T.AmbientLight(0xffffff, 1.4));
    const sonne = new T.DirectionalLight(0xffffff, 2.2); sonne.position.set(-4, 10, 7); s.add(sonne);
    const halter = new T.Group(); s.add(halter);
    Object.assign(st, { renderer: r, kamera: k, szene: s, el, halter });
    seileBauen();
    const groesse = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      r.setSize(w, h, false); k.aspect = w / h;
      // Insel im unteren Teil, Seile laufen nach oben aus dem Bild
      const weit = Math.max(1, 0.62 / k.aspect);
      k.position.set(13 * weit, 17 * weit, 44 * weit); k.lookAt(0, 6 * weit, 0);
      k.updateProjectionMatrix();
    };
    new ResizeObserver(groesse).observe(el); groesse();

    // Ziehen: runter spannt die Seile, seitlich verdreht. Kurz tippen öffnet den Arena-Weg.
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
      const ny = dy > 0 ? -2.6 * (1 - Math.exp(-dy / 140)) : -dy * 0.002;       // gummiartig, je weiter desto schwerer
      const nyaw = Math.max(-1.3, Math.min(1.3, z.yaw + dx * 0.007));
      const nsx = Math.max(-1.2, Math.min(1.2, z.sx + dx * 0.003));
      phy.vy = (ny - vorher.y) / dt; phy.vyaw = (nyaw - vorher.yaw) / dt; phy.vsx = (nsx - vorher.sx) / dt;
      phy.y = ny; phy.yaw = nyaw; phy.sx = nsx;
      vorher = { y: ny, yaw: nyaw, sx: nsx, t: jetzt };
    });
    const los = () => {
      const z = phy.zieh; phy.zieh = null;
      if (z && !z.bewegt && performance.now() - z.t < 350 && st.beimTippen) st.beimTippen();
      phy.vy = Math.max(-40, Math.min(40, phy.vy)); phy.vyaw = Math.max(-6, Math.min(6, phy.vyaw)); phy.vsx = Math.max(-5, Math.min(5, phy.vsx));
    };
    el.addEventListener('pointerup', los); el.addEventListener('pointercancel', los);

    const uhr = new T.Clock();
    r.setAnimationLoop(() => {
      const dt = Math.min(uhr.getDelta(), 0.05), t = uhr.elapsedTime;
      if (document.hidden || !el.offsetParent || !st.insel) return;
      for (let n = 0; n < 4; n++) schritt(dt / 4, t);
      anwenden();
      const f = st.insel.userData.fahne;
      if (f) {
        const p = f.geometry.attributes.position, b = f.userData.basis;
        for (let i = 0; i < p.count; i++) { const x = b[i * 3]; p.array[i * 3 + 2] = Math.sin(x * 4 - t * 3) * 0.08 * x; }
        p.needsUpdate = true;
      }
      seileZeichnen();
      r.render(s, k);
    });
  }

  /* ---------- Vorschaubilder für den Arena-Weg ---------- */
  let foto = null; const fotos = {};
  async function bild(nr) {
    await holen();
    if (fotos[nr]) return fotos[nr];
    if (!foto) {
      const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setSize(480, 340, false); r.setPixelRatio(1);
      const s = new T.Scene();
      s.add(new T.AmbientLight(0xffffff, 1.4));
      const l = new T.DirectionalLight(0xffffff, 2.2); l.position.set(-4, 10, 7); s.add(l);
      const k = new T.PerspectiveCamera(26, 480 / 340, 0.1, 100); k.position.set(10, 14, 25); k.lookAt(0, 1.8, 0);
      foto = { r, s, k };
    }
    const g = insel(nr); g.rotation.y = -0.35; foto.s.add(g);
    foto.r.render(foto.s, foto.k);
    fotos[nr] = foto.r.domElement.toDataURL('image/png');
    foto.s.remove(g);
    return fotos[nr];
  }

  window.Arena3D = {
    anzahl: 10,
    async zeigen(el, nr, beimTippen) {
      try {
        await holen();
        if (!st.renderer) aufbauen(el);
        st.beimTippen = beimTippen || null;
        if (st.nr !== nr) {
          if (st.insel) st.halter.remove(st.insel);
          st.insel = insel(nr); st.halter.add(st.insel); st.nr = nr;
          // Ruhelage: Anker senkrecht über den Ecken, daraus die Seillänge
          Object.assign(phy, { y: 0, vy: 0, yaw: 0, vyaw: 0, sx: 0, vsx: 0 }); anwenden();
          st.insel.updateMatrixWorld(true);
          st.seile.forEach(s => {
            const ecke = s.lokal.clone().applyMatrix4(st.insel.matrixWorld);
            s.anker.set(ecke.x * 1.08, ANKER_Y, ecke.z * 1.08);
            s.laenge = ecke.distanceTo(s.anker);
          });
          phy.vy = -6;                                      // kleiner Plumps beim Laden
        }
        el.classList.add('an');
        return true;
      } catch (err) { console.warn('Arena3D', err); return false; }
    },
    bild
  };
})();
