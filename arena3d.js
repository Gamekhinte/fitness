/* ================= WINTERFORM ARENA 3D =================
   Die Arena als kleine schwebende 3D-Insel (three.js, wird erst beim ersten Anzeigen geladen).
   Comic-Look: flache Farben mit harten Schattenstufen und dunklem Umriss wie die Zeichnungen.
   Mit dem Finger lässt sich die Insel drehen. Ohne WebGL bleibt das flache Bild stehen. */
(function () {
  const QUELLE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const F = { ink: 0x2B2826, schnee: 0xFFFFFF, erde: 0x9C7448, erde2: 0x7E5B37, bahn: 0xD9643A, eis: 0xBFE6FF, eis2: 0x7CD4FF,
    wand: 0xEADCC2, tanne: 0x3E7A55, stamm: 0x6B4A2E, stein: 0xB9B4AC, gold: 0xF2C14E, nacht: 0x3B4A63 };
  let T = null, laden = null;
  const st = { renderer: null, kamera: null, szene: null, insel: null, fahne: null, el: null, nr: -1, dreh: 0, ziel: 0 };

  function holen() { return laden || (laden = import(QUELLE).then(m => { T = m; })); }

  /* ---------- Bausteine ---------- */
  let grad, inkMat;
  const mats = {};
  function mat(c) {
    if (!grad) {
      grad = new T.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, T.RedFormat);
      grad.minFilter = grad.magFilter = T.NearestFilter; grad.needsUpdate = true;
      inkMat = new T.MeshBasicMaterial({ color: F.ink, side: T.BackSide });
    }
    return mats[c] || (mats[c] = new T.MeshToonMaterial({ color: c, gradientMap: grad }));
  }
  // Teil mit Umriss (dunkle, leicht vergrößerte Rückseite, wie ein Tuschestrich)
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
  function ring(aw, ah, ar, iw, ih, ir) {
    const s = rundRechteck(aw, ah, ar); s.holes.push(rundRechteck(iw, ih, ir)); return s;
  }

  function tanne(g, x, z, s = 1) {
    g.add(teil(new T.CylinderGeometry(0.12 * s, 0.14 * s, 0.5 * s, 8), F.stamm, x, 0.45 * s, z, 0.03));
    g.add(teil(new T.ConeGeometry(0.85 * s, 1.2 * s, 8), F.tanne, x, 1.15 * s, z, 0.05));
    g.add(teil(new T.ConeGeometry(0.62 * s, 1.0 * s, 8), F.tanne, x, 1.75 * s, z, 0.05));
    g.add(teil(new T.ConeGeometry(0.3 * s, 0.45 * s, 8), F.schnee, x, 2.2 * s, z, 0.04));
  }
  function huerde(g, x, z) {
    g.add(teil(box(0.08, 0.5, 0.08), F.schnee, x, 0.5, z - 0.45, 0.025));
    g.add(teil(box(0.08, 0.5, 0.08), F.schnee, x, 0.5, z + 0.45, 0.025));
    g.add(teil(box(0.1, 0.16, 1.05), F.bahn, x, 0.78, z, 0.03));
  }
  function fahne(g, x, z) {
    g.add(teil(new T.CylinderGeometry(0.05, 0.05, 3.4, 8), F.stein, x, 1.9, z, 0.03));
    const geo = new T.PlaneGeometry(1.1, 0.65, 8, 1);
    geo.translate(0.55, 0, 0);
    const f = new T.Mesh(geo, new T.MeshToonMaterial({ color: F.eis2, gradientMap: grad, side: T.DoubleSide }));
    f.position.set(x + 0.05, 3.25, z);
    f.userData.basis = geo.attributes.position.array.slice();
    g.add(f); st.fahne = f;
  }
  function schule(g) {
    g.add(teil(box(5.2, 2.2, 1.6), F.wand, 0, 1.3, -3.6));
    const dreieck = new T.Shape(); dreieck.moveTo(-2.9, 0); dreieck.lineTo(2.9, 0); dreieck.lineTo(0, 1.2); dreieck.closePath();
    g.add(teil(new T.ExtrudeGeometry(dreieck, { depth: 2, bevelEnabled: false }), F.bahn, 0, 3.0, -3.6));
    const kappe = new T.Shape(); kappe.moveTo(-2.4, 0); kappe.lineTo(2.4, 0); kappe.lineTo(0, 0.95); kappe.closePath();
    g.add(teil(new T.ExtrudeGeometry(kappe, { depth: 2.1, bevelEnabled: false }), F.schnee, 0, 3.22, -3.6, 0.03));
    for (const x of [-1.9, -1.1, 1.1, 1.9]) for (const y of [0.85, 1.75])
      g.add(teil(box(0.5, 0.55, 0.06), F.eis2, x, y, -2.79, 0.03));
    g.add(teil(box(0.8, 1.2, 0.06), F.bahn, 0, 0.8, -2.79, 0.03));
    const uhr = new T.CylinderGeometry(0.28, 0.28, 0.08, 20); uhr.rotateX(Math.PI / 2);
    g.add(teil(uhr, F.schnee, 0, 3.0, -2.55, 0.03));
  }
  function berge(g, farbe) {
    [[-3.4, 2.6, 1.9], [0, 3.6, 2.4], [3.4, 2.8, 2.0]].forEach(([x, h, r]) => {
      g.add(teil(new T.ConeGeometry(r, h, 7), farbe, x, 0.2 + h / 2, -3.8, 0.05));
      g.add(teil(new T.ConeGeometry(r * 0.42, h * 0.42, 7), F.schnee, x, 0.2 + h - h * 0.21, -3.8, 0.04));
    });
  }

  /* ---------- Arenen ---------- */
  function insel(nr) {
    const g = new T.Group();
    const nacht = nr === 5;
    g.add(teil(box(11, 1.4, 10), nacht ? F.nacht : F.erde, 0, -0.6, 0, 0.06));
    g.add(teil(box(9.4, 1.1, 8.4), nacht ? 0x2A3446 : F.erde2, 0, -1.7, 0, 0.06));
    g.add(teil(box(11.2, 0.4, 10.2), nacht ? 0xDCE8F5 : F.schnee, 0, 0, 0, 0.05));
    const bahn = teil(flach(ring(8.6, 5.6, 2.8, 6.2, 3.2, 1.6), 0.1), F.bahn, 0, 0.25, 0.9, 0.03);
    g.add(bahn);
    g.add(teil(flach(ring(7.44, 4.44, 2.2, 7.32, 4.32, 2.14), 0.02), F.schnee, 0, 0.31, 0.9, 0));
    const innen = nr === 2 || nr >= 4 ? F.eis : nr === 1 ? 0xCFE3C8 : F.schnee;
    g.add(teil(flach(rundRechteck(6.2, 3.2, 1.6), 0.06), innen, 0, 0.23, 0.9, 0));
    huerde(g, -1, 3.1); huerde(g, 1.2, 3.1);
    if (nr === 0) { schule(g); fahne(g, 3.4, -3.3); [[-4.6, -3.8], [4.7, -4.1], [-4.8, 4.1], [4.8, 4.2]].forEach(([x, z]) => tanne(g, x, z)); }
    else if (nr === 1) {
      g.add(teil(flach(rundRechteck(3.6, 2.2, 1.1), 0.06), F.eis2, -2.2, 0.24, -3.4, 0.03));
      [[-4.6, -3.8], [1.2, -3.9], [3, -3.6], [4.7, -4.1], [-4.8, 4.1], [4.8, 4.2], [4.9, 1.2]].forEach(([x, z], k) => tanne(g, x, z, 0.8 + (k % 3) * 0.15));
      fahne(g, -4.6, 1.5);
    } else if (nr === 2) {
      [[-4.9, -4.4], [4.9, -4.4], [-4.9, 4.5], [4.9, 4.5]].forEach(([x, z]) => {
        g.add(teil(new T.CylinderGeometry(0.07, 0.07, 3, 8), F.stein, x, 1.7, z, 0.03));
        g.add(teil(box(0.6, 0.3, 0.3), F.gold, x, 3.3, z, 0.03));
      });
      g.add(teil(box(6, 0.9, 1), F.eis2, 0, 0.65, -4, 0.04));
      fahne(g, 0, -4.4);
    } else {
      berge(g, nr === 5 ? 0x6E7E99 : F.stein);
      fahne(g, 4.4, -1.8);
      [[-4.8, 4.1], [4.8, 4.2]].forEach(([x, z]) => tanne(g, x, z, nr === 6 ? 0.7 : 0.9));
    }
    return g;
  }

  /* ---------- Bühne ---------- */
  function aufbauen(el) {
    const r = new T.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    el.appendChild(r.domElement);
    const k = new T.PerspectiveCamera(26, 1, 0.1, 100);
    k.position.set(7.2, 14.5, 21); k.lookAt(0, 0.6, 0.2);
    const s = new T.Scene();
    s.add(new T.AmbientLight(0xffffff, 1.4));
    const sonne = new T.DirectionalLight(0xffffff, 2.2); sonne.position.set(-4, 10, 7); s.add(sonne);
    Object.assign(st, { renderer: r, kamera: k, szene: s, el });
    const groesse = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      r.setSize(w, h, false); k.aspect = w / h; k.updateProjectionMatrix();
    };
    new ResizeObserver(groesse).observe(el); groesse();

    // Mit dem Finger drehen, lässt man los, dreht sie langsam zurück
    let start = null;
    el.addEventListener('pointerdown', e => { start = { x: e.clientX, d: st.dreh }; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (start) st.ziel = st.dreh = Math.max(-0.9, Math.min(0.9, start.d + (e.clientX - start.x) * 0.01)); });
    const los = () => { start = null; st.ziel = 0; };
    el.addEventListener('pointerup', los); el.addEventListener('pointercancel', los);

    const uhr = new T.Clock();
    r.setAnimationLoop(() => {
      if (document.hidden || !el.offsetParent || !st.insel) return;
      const t = uhr.getElapsedTime();
      if (!start) st.dreh += (st.ziel - st.dreh) * 0.06;
      st.insel.rotation.y = -0.35 + st.dreh;
      if (st.fahne) {
        const p = st.fahne.geometry.attributes.position, b = st.fahne.userData.basis;
        for (let i = 0; i < p.count; i++) { const x = b[i * 3]; p.array[i * 3 + 2] = Math.sin(x * 4 - t * 3) * 0.08 * x; }
        p.needsUpdate = true;
      }
      r.render(s, k);
    });
  }

  window.Arena3D = {
    async zeigen(el, nr) {
      try {
        await holen();
        if (!st.renderer) aufbauen(el);
        if (st.nr !== nr) {
          if (st.insel) st.szene.remove(st.insel);
          st.fahne = null;
          st.insel = insel(nr); st.szene.add(st.insel); st.nr = nr;
        }
        el.classList.add('an');
        return true;
      } catch (err) { return false; }
    }
  };
})();
