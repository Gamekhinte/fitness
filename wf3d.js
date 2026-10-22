/* ================= WINTERFORM 3D-GRUNDLAGE =================
   Lädt three.js einmal (erst wenn es gebraucht wird) und stellt gemeinsame Bausteine bereit:
   Comic-Material mit harten Schattenstufen, Teile mit dunklem Tusche-Umriss, flache Formen und
   eine "Bühne" (Renderer + Kamera + Schleife), die man in jedes Element hängen kann. */
(function () {
  const QUELLE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  let laden = null;
  const W = window.WF3D = { T: null, INK: 0x2B2826 };

  W.laden = () => laden || (laden = import(QUELLE).then(m => { W.T = m; vorbereiten(); return m; }));

  let grad;
  const mats = {};
  function vorbereiten() {
    const T = W.T;
    grad = new T.DataTexture(new Uint8Array([120, 195, 255]), 3, 1, T.RedFormat);
    grad.minFilter = grad.magFilter = T.NearestFilter; grad.needsUpdate = true;
    W.inkMat = new T.MeshBasicMaterial({ color: W.INK, side: T.BackSide });
  }
  // Comic-Material, gleiche Farben teilen sich ein Material
  W.mat = (c, extra) => {
    const k = String(c) + (extra ? JSON.stringify(extra) : '');
    return mats[k] || (mats[k] = new W.T.MeshToonMaterial(Object.assign({ color: c, gradientMap: grad }, extra || {})));
  };
  // Mesh mit Umriss: dunkle, etwas größere Rückseite wie ein Tuschestrich
  W.teil = (geo, farbe, x = 0, y = 0, z = 0, umriss = 0.05, zentrieren = true) => {
    const T = W.T;
    if (zentrieren) geo.center();
    const m = new T.Mesh(geo, typeof farbe === 'object' ? farbe : W.mat(farbe));
    m.position.set(x, y, z);
    if (umriss) W.umriss(m, umriss);
    return m;
  };
  W.umriss = (m, d = 0.05) => {
    const T = W.T, geo = m.geometry;
    geo.computeBoundingBox();
    const s = new T.Vector3(); geo.boundingBox.getSize(s);
    const c = new T.Vector3(); geo.boundingBox.getCenter(c);
    const o = new T.Mesh(geo, W.inkMat);
    o.scale.set(1 + 2 * d / Math.max(s.x, 0.02), 1 + 2 * d / Math.max(s.y, 0.02), 1 + 2 * d / Math.max(s.z, 0.02));
    o.position.copy(c).multiply(new T.Vector3(1 - o.scale.x, 1 - o.scale.y, 1 - o.scale.z));
    o.userData.umriss = true;
    m.add(o);
    return m;
  };
  W.box = (w, h, d) => new W.T.BoxGeometry(w, h, d);
  W.kugel = (r, a = 16, b = 12) => new W.T.SphereGeometry(r, a, b);
  W.kegel = (r, h, n = 8) => new W.T.ConeGeometry(r, h, n);
  W.rohr = (r, h, n = 10, r2) => new W.T.CylinderGeometry(r, r2 == null ? r : r2, h, n);
  W.rundRechteck = (w, h, r) => {
    const s = new W.T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  W.flach = (form, dicke) => {
    const g = new W.T.ExtrudeGeometry(form, { depth: dicke, bevelEnabled: false, curveSegments: 20 });
    g.rotateX(-Math.PI / 2); return g;
  };
  // Band entlang einer geschlossenen Kurve in der Ebene (Laufwege, Flüsse)
  W.band = (punkte, breite, y = 0, geschlossen = true) => {
    const T = W.T;
    const kurve = new T.CatmullRomCurve3(punkte.map(([x, z]) => new T.Vector3(x, 0, z)), geschlossen, 'centripetal');
    const n = 120, pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = kurve.getPointAt(t % 1), tan = kurve.getTangentAt(t % 1);
      const nx = -tan.z, nz = tan.x;
      pos.push(p.x + nx * breite / 2, y, p.z + nz * breite / 2, p.x - nx * breite / 2, y, p.z - nz * breite / 2);
      if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    g.userData.kurve = kurve;
    return g;
  };

  /* ---------- Bühne: Renderer in einem Element, passt sich der Größe an ---------- */
  W.buehne = (el, opt = {}) => {
    const T = W.T;
    const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opt.foto });
    r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    const szene = new T.Scene();
    szene.add(new T.AmbientLight(0xF5F0E4, 1.4));
    const sonne = new T.DirectionalLight(0xF5F0E4, 2.2); sonne.position.set(-4, 10, 7); szene.add(sonne);
    const kamera = new T.PerspectiveCamera(opt.fov || 30, 1, 0.1, 300);
    const b = { r, szene, kamera, el, jeBild: null, beiGroesse: null };
    b.einhaengen = neu => {
      b.el = neu; neu.appendChild(r.domElement); b.groesse();
    };
    b.groesse = () => {
      const w = b.el.clientWidth, h = b.el.clientHeight; if (!w || !h) return;
      r.setSize(w, h, false); kamera.aspect = w / h; kamera.updateProjectionMatrix();
      if (b.beiGroesse) b.beiGroesse(w, h);
    };
    const ro = new ResizeObserver(() => b.groesse());
    b.einhaengen(el); ro.observe(el);
    b.beobachten = neu => { ro.disconnect(); ro.observe(neu); };
    const uhr = new T.Clock();
    r.setAnimationLoop(() => {
      const dt = Math.min(uhr.getDelta(), 0.05) * (W.zeitlupe || 1);   // zeitlupe nur für Tests
      if (b.pausiert || document.hidden || !b.el.isConnected || !b.el.offsetParent) return;
      if (b.jeBild) b.jeBild(dt, uhr.elapsedTime);
      r.render(szene, kamera);
    });
    return b;
  };
})();
