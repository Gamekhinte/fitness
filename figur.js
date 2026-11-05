/* ================= WINTERFORM FIGUR =================
   Jede Figur ist ein fertiger Skin aus Blender (modelle/skins/<id>.glb, Liste in skins.js).
   Frei anpassen geht nicht mehr: Skin, Animation, Intro und Hintergrund sind die ganze Auswahl.
   Die .glb hat dieselben Gelenke wie früher (huefte, rumpf, kopf, armL/R, beinL/R, knieL/R),
   deshalb laufen alle Animationen unverändert. Leuchtende Teile heißen vfx_* und werden hier bewegt,
   dazu Flügel, Umhang, Begleiter und Blinzeln.
   Gekaufte Skins prüft der Server (wf_figur_speichern), die Preise hier sind nur zur Anzeige.
   Preis 'pass' = nur im Winterpass, 'g150' = 150 Gems, Zahl = Coins, 0 = gratis. */
(function () {
  const SKINS = window.WF_SKINS || [];
  const INFO = {}; SKINS.forEach(s => { INFO[s.id] = s; });
  const KLASSEN = { ungewoehnlich: ['Ungewöhnlich', '#7FB77E'], selten: ['Selten', '#4FA3E0'], episch: ['Episch', '#E0663A'],
    legendaer: ['Legendär', '#F2C14E'], spezial: ['Spezial', '#7CD4FF'] };
  const ORDNER = 'modelle/skins/';
  const K = {
    skin: SKINS.map(s => [s.id, s.name, s.preis]),
    kopf: [['nichts', 'Nichts', 0]], extra: [['nichts', 'Nichts', 0]],
    emote: [['winken', 'Winken', 0], ['jubeln', 'Jubeln', 0], ['hampelmann', 'Hampelmann', 200], ['flex', 'Muskeln', 300],
      ['tanzen', 'Tanzen', 400], ['pose', 'Heldenpose', 500], ['robot', 'Roboter', 600], ['salto', 'Salto', 900],
      ['verbeugen', 'Verbeugung', 250], ['kniebeuge', 'Kniebeugen', 350], ['kranich', 'Kranich', 400], ['liegestuetz', 'Liegestütze', 450],
      ['diskus', 'Diskuswurf', 550], ['sirtaki', 'Sirtaki', 650]],
    // Intro: läuft in der Cutscene vor jedem Duell, mit bösem Blick
    intro: [['starren', 'Böse starren', 0], ['zeigen', 'Auf dich zeigen', 0], ['faust', 'Faust ballen', 300], ['muskeln', 'Muskeln zeigen', 350],
      ['trommeln', 'Brust trommeln', 400], ['lachen', 'Auslachen', 450], ['gaehnen', 'Gelangweilt gähnen', 500],
      ['kopfschuetteln', 'Kopf schütteln', 300], ['nacken', 'Nacken knacken', 400], ['blitz', 'Blitz schleudern', 600]],
    // Hintergrund: hinter deiner Figur in Cutscene, Duell, Profil und Ergebnis
    hg: [['eis', 'Eis', 0], ['papier', 'Papier', 0], ['schnee', 'Schneefall', 300], ['sterne', 'Sternennacht', 400], ['sonnenuntergang', 'Sonnenuntergang', 500],
      ['graffiti', 'Graffiti', 600], ['flammen', 'Flammen', 700], ['gold', 'Goldrausch', 1200],
      ['eiskristall', 'Eiskristall', 'pass'], ['polarlicht', 'Polarlicht', 'pass'], ['galaxie', 'Galaxie', 'g80'], ['lavafluss', 'Lavafluss', 'g80'],
      ['olivenhain', 'Olivenhain', 350], ['aegaeis', 'Ägäis', 450], ['tempel', 'Tempel im Mondlicht', 550], ['mosaik', 'Mosaik', 600],
      ['stadion', 'Stadion', 750], ['gewitter', 'Zeus\' Gewitter', 900], ['unterwelt', 'Unterwelt', 'g80'], ['olympwolken', 'Wolken des Olymp', 'g120']]
  };
  const STANDARD = { typ: 'mann', skin: 'olympionike', kopf: 'nichts', extra: 'nichts', emote: 'winken', intro: 'starren', hg: 'eis' };
  const preis = (kat, id) => { const e = (K[kat] || []).find(x => x[0] === id); return e && e[2] ? e[2] : 0; };
  const startSkin = typ => typ === 'frau' ? 'olympionikin' : 'olympionike';

  // Alte Looks (eigene Farben, Mützen, alte Skins) werden zur Startfigur passend zum Typ
  function pruefen(a) {
    const r = Object.assign({}, STANDARD);
    if (a && typeof a === 'object') for (const k in STANDARD) if (typeof a[k] === 'string' && a[k].length < 30) r[k] = a[k];
    if (r.typ !== 'frau') r.typ = 'mann';
    if (!INFO[r.skin]) r.skin = startSkin(r.typ);
    if (INFO[r.skin]) r.typ = INFO[r.skin].g === 'w' ? 'frau' : 'mann';
    r.kopf = 'nichts'; r.extra = 'nichts';
    return r;
  }

  /* ---------- .glb lesen (eigener kleiner Leser: keine Texturen, keine Kompression) ---------- */
  const laden = new Map(), fertig = new Map();
  const OHNE_UMRISS = /^(augeL|augeR|auge|braueL|braueR|braue|mund|nasenring)$/;
  const KLEIN = new Set(['augen', 'pupille', 'glanz', 'mund', 'backen']);
  function holen(id) {
    if (!laden.has(id)) laden.set(id, fetch(ORDNER + id + '.glb')
      .then(r => { if (!r.ok) throw new Error('Skin fehlt: ' + id); return r.arrayBuffer(); })
      .then(lesen).then(d => { fertig.set(id, d); return d; })
      .catch(err => { laden.delete(id); throw err; }));
    return laden.get(id);
  }
  function lesen(buf) {
    const W = WF3D, T = W.T, dv = new DataView(buf);
    const jl = dv.getUint32(12, true), json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)));
    const bin = 20 + jl + 8;
    const TYP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }, ART = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array };
    const acc = i => {
      const a = json.accessors[i], bv = json.bufferViews[a.bufferView], A = ART[a.componentType];
      const start = bin + (bv.byteOffset || 0) + (a.byteOffset || 0), n = a.count * TYP[a.type];
      return new A(buf.slice(start, start + n * A.BYTES_PER_ELEMENT));
    };
    const mats = (json.materials || []).map(m => {
      const c = (m.pbrMetallicRoughness || {}).baseColorFactor || [1, 1, 1, 1];
      const farbe = new T.Color().setRGB(c[0], c[1], c[2]);          // glTF-Farben sind linear, wie three intern rechnet
      const e = m.emissiveFactor, leuchtet = !!e && e[0] + e[1] + e[2] > 0.01;
      return { name: m.name, leuchtet, material: leuchtet ? new T.MeshBasicMaterial({ color: farbe }) : W.mat('#' + farbe.getHexString()) };
    });
    const geos = (json.meshes || []).map(me => me.primitives.map(p => {
      const g = new T.BufferGeometry(), pos = acc(p.attributes.POSITION);
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      const idx = p.indices != null ? acc(p.indices) : null;
      if (idx) g.setIndex(new T.BufferAttribute(idx, 1));
      if (p.attributes.NORMAL != null) g.setAttribute('normal', new T.BufferAttribute(acc(p.attributes.NORMAL), 3)); else g.computeVertexNormals();
      g.computeBoundingSphere();
      const m = mats[p.material] || { name: '', leuchtet: false, material: W.mat('#F5F0E4') };
      // Tusche-Umriss: Kopie, entlang der Normalen etwas aufgeblasen, nur Rückseiten in Dunkel
      let umriss = null;
      if (!m.leuchtet && !KLEIN.has(m.name)) {
        const n = g.getAttribute('normal').array, p2 = new Float32Array(pos.length), d = 0.018;
        for (let i = 0; i < pos.length; i++) p2[i] = pos[i] + n[i] * d;
        umriss = new T.BufferGeometry(); umriss.setAttribute('position', new T.BufferAttribute(p2, 3));
        if (idx) umriss.setIndex(g.getIndex());
        umriss.computeBoundingSphere();
      }
      return { g, m, umriss };
    }));
    return { json, geos };
  }
  function aufbauen(d) {
    const T = WF3D.T;
    const knoten = d.json.nodes.map(n => {
      const g = new T.Group(); g.name = n.name || '';
      if (n.translation) g.position.fromArray(n.translation);
      if (n.rotation) g.quaternion.fromArray(n.rotation);
      if (n.scale) g.scale.fromArray(n.scale);
      const ohne = OHNE_UMRISS.test(g.name) || g.name.startsWith('vfx');
      if (n.mesh != null) d.geos[n.mesh].forEach(p => {
        const mesh = new T.Mesh(p.g, p.m.material); g.add(mesh);
        if (p.umriss && !ohne) { const u = new T.Mesh(p.umriss, WF3D.inkMat); u.userData.umriss = true; mesh.add(u); }
      });
      return g;
    });
    d.json.nodes.forEach((n, i) => (n.children || []).forEach(c => knoten[i].add(knoten[c])));
    const g = new T.Group();
    d.json.scenes[d.json.scene || 0].nodes.forEach(i => g.add(knoten[i]));
    return g;
  }

  /* ---------- Bauen ----------
     Gibt die Figur sofort zurück. Ist der Skin noch nicht geladen, stehen kurz leere Gelenke da,
     die Datei kommt nach und wird eingesetzt (die Animationen merken davon nichts).
     Für Fotos vorher Figur.vorladen(look) abwarten. */
  const VFX_ANIM = [[/^vfx_aura/, 'drehen'], [/^vfx_funken/, 'schweben'], [/^vfx_glitzer/, 'funkeln'],
    [/^vfx_(blaetter|blueten|schnee|federn|konfetti)/, 'fallen'], [/^vfx_(blasen|herzen|dampf)/, 'steigen'],
    [/^vfx_(sterne|eis)/, 'schweben'], [/^vfx_orbs/, 'kreisen'], [/^vfx_(halo|ring)/, 'pulsieren'],
    [/^vfx_(blitz|flamme)/, 'flackern'], [/^vfx_schatten/, 'wabern'], [/^vfx_wasser/, 'drehen'], [/^vfx_strahlen/, 'strahlen']];
  function bauen(aussehen, opt = {}) {
    const T = WF3D.T, a = pruefen(aussehen);
    const aussen = new T.Group(), wurzel = new T.Group(); aussen.add(wurzel);
    const rig = { wurzel, anim: a.emote, aussehen: a, skin: a.skin, extra: null };
    const huefte = new T.Group(); huefte.position.y = 0.85; wurzel.add(huefte); rig.huefte = huefte;
    const rumpf = new T.Group(); huefte.add(rumpf); rig.rumpf = rumpf;
    const kopf = new T.Group(); kopf.position.y = 0.77; rumpf.add(kopf); rig.kopf = kopf;
    [['armL', -0.35, 0.62, rumpf], ['armR', 0.35, 0.62, rumpf], ['beinL', -0.13, 0, huefte], ['beinR', 0.13, 0, huefte]].forEach(([n, x, y, p]) => {
      const g = new T.Group(); g.position.set(x, y, 0); p.add(g); rig[n] = g;
    });
    ['L', 'R'].forEach(s => { const k = new T.Group(); k.position.y = -0.42; rig['bein' + s].add(k); rig['knie' + s] = k; });
    aussen.userData.rig = rig;
    const d = fertig.get(a.skin);
    if (d) einsetzen(rig, d, opt); else holen(a.skin).then(d2 => einsetzen(rig, d2, opt)).catch(() => {});
    return aussen;
  }
  function einsetzen(rig, d, opt) {
    const T = WF3D.T, inst = aufbauen(d);
    const glbW = inst.getObjectByName('wurzel') || inst;
    rig.wurzel.clear();
    [...glbW.children].forEach(c => rig.wurzel.add(c));
    const n = name => rig.wurzel.getObjectByName(name);
    ['huefte', 'rumpf', 'kopf', 'beinL', 'beinR', 'knieL', 'knieR'].forEach(k => { rig[k] = n(k) || rig[k]; });
    // Arme: die A-Pose steckt im Mesh, die Animationen setzen sie selbst. Darum innen zurückdrehen, außen animieren.
    [[-1, 'armL'], [1, 'armR']].forEach(([s, name]) => {
      const arm = n(name); if (!arm) return;
      const g = new T.Group(); g.name = name + '_gelenk'; g.position.copy(arm.position);
      arm.parent.add(g); arm.position.set(0, 0, 0); arm.rotation.z = -s * 0.16; g.add(arm);
      rig[name] = g;
    });
    const ex = { vfx: [], fluegel: [n('fluegelL'), n('fluegelR')].filter(Boolean), augen: [], begleiter: null, umhang: n('umhang') };
    rig.umhang = ex.umhang || null;
    rig.wurzel.traverse(o => {
      if (!o.name) return;
      if (o.name.startsWith('vfx_')) {
        const t = VFX_ANIM.find(([re]) => re.test(o.name));
        ex.vfx.push({ o, anim: t ? t[1] : 'schweben', ph: ex.vfx.length * 1.7, b: o.position.clone() });
      }
      if (/^auge[LR]?$/.test(o.name)) ex.augen.push(o);
    });
    const bg = n('begleiter');
    if (bg) ex.begleiter = { o: bg, b: bg.position.clone(), art: bg.parent === rig.rumpf ? 'schulter' : bg.position.y > 0.6 ? 'schweben' : 'boden' };
    if (opt.boese) [['braueL', -1], ['braueR', 1], ['braue', 0]].forEach(([b, s]) => { const o = n(b); if (o) o.rotation.z = s * 0.35; });
    rig.extra = ex;
  }
  // Leuchtteile, Flügel, Umhang, Begleiter und Blinzeln. Läuft am Ende jeder Haltung.
  function bewegen(r, name, t) {
    const ex = r.extra; if (!ex) return;
    const s = Math.sin;
    ex.vfx.forEach(v => {
      const o = v.o, ph = v.ph;
      switch (v.anim) {
        case 'drehen': o.rotation.y = t * 0.9; break;
        case 'strahlen': o.rotation.z = t * 0.35; break;
        case 'kreisen': o.rotation.y = t * 1.1; break;
        case 'schweben': o.position.y = v.b.y + s(t * 1.3 + ph) * 0.07; o.rotation.y = t * 0.25 * (ph % 2 > 1 ? 1 : -1); break;
        case 'funkeln': o.visible = s(t * 3 + ph) > -0.4; o.rotation.y = t * 0.2; break;
        case 'fallen': o.position.y = v.b.y + s(t * 0.8 + ph) * 0.12; o.rotation.y = t * 0.35 * (ph % 2 > 1 ? 1 : -1); break;
        case 'steigen': o.position.y = v.b.y + s(t * 1.6 + ph) * 0.1; o.rotation.y = -t * 0.3; break;
        case 'pulsieren': o.scale.setScalar(1 + 0.07 * s(t * 3 + ph)); break;
        case 'flackern': o.visible = (t * 12 + ph * 5) % 3 > 0.5; o.scale.y = 0.85 + 0.25 * Math.abs(s(t * 13 + ph)); break;
        case 'wabern': o.rotation.y = t * 0.25; o.scale.set(1 + 0.05 * s(t * 2), 1 + 0.12 * s(t * 2.6), 1 + 0.05 * s(t * 2)); break;
      }
    });
    ex.fluegel.forEach((f, i) => { f.rotation.y = (i ? 1 : -1) * (0.12 + 0.14 * s(t * 3)); });
    if (ex.umhang && name !== 'pose') ex.umhang.rotation.x = (name === 'laufen' ? 0.35 : 0.04) + 0.04 * s(t * 2.2);
    const b = ex.begleiter;
    if (b) {
      if (b.art === 'schweben') { b.o.position.y = b.b.y + s(t * 1.4) * 0.08; b.o.rotation.y = s(t * 0.7) * 0.4; }
      else if (b.art === 'boden') b.o.rotation.y = s(t * 1.5) * 0.25;
      else b.o.rotation.z = s(t * 2) * 0.08;
    }
    const zu = (t % 3.7) < 0.12;
    ex.augen.forEach(a => { a.scale.y = zu ? 0.15 : 1; });
  }

  /* ---------- Animationen ---------- */
  function haltung(fig, name, t, tempo = 1) {
    const r = fig.userData.rig; if (!r) return;
    const s = Math.sin, c = Math.cos;
    // Grundhaltung
    r.wurzel.position.y = 0; r.wurzel.rotation.set(0, r.wurzel.rotation.y, 0);
    r.huefte.position.y = 0.85; r.rumpf.rotation.set(0, 0, 0); r.kopf.rotation.set(0, 0, 0);
    r.armL.rotation.set(0, 0, -0.12); r.armR.rotation.set(0, 0, 0.12);
    r.beinL.rotation.set(0, 0, 0); r.beinR.rotation.set(0, 0, 0);
    r.knieL.rotation.set(0, 0, 0); r.knieR.rotation.set(0, 0, 0);
    r.armL.scale.set(1, 1, 1); r.armR.scale.set(1, 1, 1); r.huefte.position.z = 0; r.wurzel.position.z = 0;
    const atem = s(t * 2) * 0.02;
    switch (name) {
      case 'laufen': {
        const w = t * 9 * tempo;
        r.beinL.rotation.x = s(w) * 0.85; r.beinR.rotation.x = -s(w) * 0.85;
        r.knieL.rotation.x = Math.max(0, s(w)) * 1.2; r.knieR.rotation.x = Math.max(0, -s(w)) * 1.2;
        r.armL.rotation.x = -s(w) * 0.9; r.armR.rotation.x = s(w) * 0.9;
        r.huefte.position.y = 0.85 + Math.abs(c(w)) * 0.08; r.rumpf.rotation.x = 0.18; r.kopf.rotation.x = -0.1;
        break;
      }
      case 'winken': r.armR.rotation.z = 2.6 + s(t * 8) * 0.35; r.kopf.rotation.z = s(t * 2) * 0.08; r.rumpf.rotation.z = -0.05; break;
      case 'jubeln': { const h = Math.abs(s(t * 5)); r.wurzel.position.y = h * 0.35; r.armL.rotation.z = -2.7 - h * 0.2; r.armR.rotation.z = 2.7 + h * 0.2; r.beinL.rotation.z = -h * 0.15; r.beinR.rotation.z = h * 0.15; break; }
      case 'hampelmann': { const h = (s(t * 7) + 1) / 2; r.wurzel.position.y = Math.abs(s(t * 7)) * 0.2; r.armL.rotation.z = -0.15 - h * 2.7; r.armR.rotation.z = 0.15 + h * 2.7; r.beinL.rotation.z = -h * 0.35; r.beinR.rotation.z = h * 0.35; break; }
      case 'flex': { const p = 0.5 + 0.5 * s(t * 3); r.armL.rotation.set(0, 0, -1.6 - p * 0.3); r.armR.rotation.set(0, 0, 1.6 + p * 0.3); r.rumpf.rotation.x = -0.1; r.rumpf.scale.set(1 + p * 0.06, 1, 1 + p * 0.04); r.kopf.rotation.x = -0.15; break; }
      case 'tanzen': { r.huefte.position.y = 0.85 + Math.abs(s(t * 6)) * 0.08; r.rumpf.rotation.z = s(t * 6) * 0.2; r.armL.rotation.z = -1.2 - s(t * 6) * 1.2; r.armR.rotation.z = 1.2 - s(t * 6) * 1.2; r.beinL.rotation.x = Math.max(0, s(t * 6)) * 0.5; r.beinR.rotation.x = Math.max(0, -s(t * 6)) * 0.5; r.kopf.rotation.z = -s(t * 6) * 0.15; break; }
      case 'pose': { r.armL.rotation.set(0.3, 0, -0.9); r.armR.rotation.set(0.3, 0, 0.9); r.rumpf.rotation.x = -0.08; r.kopf.rotation.y = 0.25; r.beinL.rotation.z = -0.15; r.beinR.rotation.z = 0.15; if (r.umhang) r.umhang.rotation.x = 0.3 + s(t * 4) * 0.15; break; }
      case 'robot': { const q = Math.floor(t * 2.5) % 4; r.armL.rotation.x = q < 2 ? -1.57 : 0; r.armR.rotation.x = q < 2 ? 0 : -1.57; r.kopf.rotation.y = [0.4, 0, -0.4, 0][q]; r.beinL.rotation.x = q === 1 ? -0.4 : 0; r.beinR.rotation.x = q === 3 ? -0.4 : 0; r.wurzel.rotation.y += 0; break; }
      case 'salto': { const z = t % 2.4; if (z < 1) { const th = -z * Math.PI * 2; r.wurzel.rotation.x = th; r.wurzel.position.y = s(z * Math.PI) * 1.1 + 0.95 - 0.95 * c(th); r.wurzel.position.z = -0.95 * s(th); r.armL.rotation.z = -2.6; r.armR.rotation.z = 2.6; r.beinL.rotation.x = -0.8; r.beinR.rotation.x = -0.8; } else { r.armL.rotation.z = -2.2; r.armR.rotation.z = 2.2; } break; }
      case 'dehnen': { const p = s(t * 1.6); r.rumpf.rotation.z = p * 0.35; r.armL.rotation.z = p > 0 ? -2.8 : -0.3; r.armR.rotation.z = p < 0 ? 2.8 : 0.3; break; }
      case 'kniebeuge': {
        const p = (1 - c(t * 2.6)) / 2, a = 1.3 * p;
        for (const [b, k] of [[r.beinL, r.knieL], [r.beinR, r.knieR]]) { b.rotation.x = -a; k.rotation.x = a * 1.05; }
        r.huefte.position.y = 0.02 + 0.42 * c(a) + 0.41; r.huefte.position.z = -0.42 * s(a);
        r.rumpf.rotation.x = 0.6 * p; r.kopf.rotation.x = -0.4 * p;
        r.armL.rotation.set(-1.45 * p, 0, -0.12); r.armR.rotation.set(-1.45 * p, 0, 0.12);
        break;
      }
      case 'liegestuetz': case 'plank': {
        const p = name === 'plank' ? 0.55 + s(t * 9) * 0.02 : (1 - c(t * 3)) / 2;
        const th = name === 'plank' ? 1.3 : 1.1 + 0.24 * p;
        r.wurzel.rotation.x = th;
        const schulter = 1.57 * c(th);
        for (const a of [r.armL, r.armR]) { a.rotation.set(-th + (name === 'plank' ? 0.25 : 0), 0, 0); a.scale.y = Math.max(0.35, Math.min(1.1, schulter / 0.7)); }
        r.kopf.rotation.x = -0.55;
        break;
      }
      case 'verbeugen': { const p = Math.max(0, s(t * 2.2)); r.rumpf.rotation.x = p * 0.9; r.kopf.rotation.x = p * 0.3; r.armR.rotation.set(-p * 0.9, 0, -0.3 * p); r.armL.rotation.set(0, 0, -0.9 - p * 0.4); break; }
      case 'kranich': { const w = s(t * 1.6) * 0.06; r.beinL.rotation.x = -1.3; r.knieL.rotation.x = 1.9; r.armL.rotation.z = -2.0 + w; r.armR.rotation.z = 2.0 - w; r.rumpf.rotation.z = w; r.huefte.position.y = 0.85; r.kopf.rotation.x = -0.1; break; }
      case 'diskus': { const z = t % 2.2; r.wurzel.rotation.y = z < 1.3 ? z * Math.PI * 2 / 1.3 : 0; r.armR.rotation.set(0, 0, z < 1.3 ? 1.5 : 1.5 - (z - 1.3) * 1.4); r.armL.rotation.set(0, 0, -1.2); r.rumpf.rotation.x = 0.2; r.beinL.rotation.x = -0.2; r.knieL.rotation.x = 0.3; r.huefte.position.y = 0.82; break; }
      case 'sirtaki': { const w = t * 5; r.armL.rotation.z = -1.5; r.armR.rotation.z = 1.5; r.wurzel.position.x = s(w * 0.5) * 0.3; r.beinL.rotation.x = Math.max(0, s(w)) * -0.9; r.beinR.rotation.x = Math.max(0, -s(w)) * -0.9; r.huefte.position.y = 0.85 + Math.abs(s(w)) * 0.05; r.kopf.rotation.z = s(w * 0.5) * 0.1; break; }
      case 'kopfschuetteln': r.kopf.rotation.y = s(t * 10) * 0.45; r.armL.rotation.set(0, 0, -0.3); r.armR.rotation.set(0, 0, 0.3); r.rumpf.rotation.x = 0.1; break;
      case 'nacken': { const z = t % 3.2, p = z < 1 ? s(z * Math.PI) : 0, q = z > 1.6 && z < 2.6 ? s((z - 1.6) * Math.PI) : 0; r.kopf.rotation.z = (p - q) * 0.5; r.armR.rotation.set(-1.2 * p, 0, 0.8 * p + 0.2); r.armL.rotation.set(-1.2 * q, 0, -0.8 * q - 0.2); r.rumpf.rotation.x = 0.1; break; }
      case 'blitz': { const z = t % 1.8, auf = Math.min(1, z / 0.9), wurf = z > 0.9 ? Math.min(1, (z - 0.9) / 0.25) : 0; r.armR.rotation.set(-wurf * 1.4, 0, 2.7 * auf - wurf * 1.6); r.armL.rotation.set(-0.6, 0, -0.5); r.rumpf.rotation.x = -0.15 * auf + wurf * 0.35; r.kopf.rotation.x = -0.25; r.beinL.rotation.x = -0.35 * wurf; break; }
      // Intros für die Cutscene
      case 'starren': r.rumpf.rotation.x = 0.22 + s(t * 2) * 0.03; r.kopf.rotation.x = -0.25; r.armL.rotation.set(0.2, 0, -0.35); r.armR.rotation.set(0.2, 0, 0.35); r.beinL.rotation.z = -0.12; r.beinR.rotation.z = 0.12; break;
      case 'zeigen': r.armR.rotation.set(-1.45 + s(t * 6) * 0.08, 0, 0.1); r.rumpf.rotation.x = 0.12; r.kopf.rotation.x = -0.15; r.armL.rotation.set(0, 0, -0.35); break;
      case 'faust': { const p = Math.max(0, s(t * 7)); r.armR.rotation.set(-0.6 - p * 1.2, 0, 0.3); r.armL.rotation.set(-0.9, 0, -0.5); r.rumpf.rotation.x = 0.15; r.kopf.rotation.x = -0.2; break; }
      case 'muskeln': { const p = 0.5 + 0.5 * s(t * 5); r.armL.rotation.set(0, 0, -1.7 - p * 0.3); r.armR.rotation.set(0, 0, 1.7 + p * 0.3); r.rumpf.scale.set(1 + p * 0.08, 1, 1 + p * 0.05); r.kopf.rotation.x = -0.2; break; }
      case 'trommeln': { const p = s(t * 12); r.armL.rotation.set(-1.1 + p * 0.25, 0, 0.55); r.armR.rotation.set(-1.1 - p * 0.25, 0, -0.55); r.rumpf.rotation.x = -0.12; r.kopf.rotation.x = -0.3; r.huefte.position.y = 0.85 + Math.abs(p) * 0.04; break; }
      case 'lachen': { const p = s(t * 16); r.rumpf.rotation.x = -0.25 + p * 0.05; r.kopf.rotation.x = -0.4; r.armL.rotation.set(-0.5, 0, -0.2); r.armR.rotation.set(-0.5, 0, 0.2); r.huefte.position.y = 0.85 + Math.abs(p) * 0.05; break; }
      case 'gaehnen': { const p = (s(t * 1.6) + 1) / 2; r.armR.rotation.set(0, 0, 2.6 * p + 0.1); r.armL.rotation.set(-0.3, 0, -0.2); r.kopf.rotation.set(-0.35 * p, 0, 0.2 * p); r.rumpf.rotation.z = -0.1 * p; break; }
      case 'traurig': r.kopf.rotation.x = 0.45; r.rumpf.rotation.x = 0.15; r.armL.rotation.z = -0.05; r.armR.rotation.z = 0.05; break;
      case 'fliegen': r.armL.rotation.z = -2.4 + s(t * 14) * 0.3; r.armR.rotation.z = 2.4 - s(t * 14) * 0.3; r.beinL.rotation.x = 0.4; r.beinR.rotation.x = -0.3; break;
      default: r.rumpf.scale.set(1 + atem, 1 + atem, 1 + atem); r.armL.rotation.z = -0.12 - atem; r.armR.rotation.z = 0.12 + atem;
    }
    if (name !== 'flex' && name !== 'muskeln' && name !== 'idle' && name !== undefined) r.rumpf.scale.set(1, 1, 1);
    bewegen(r, name, t);
  }

  /* ---------- Hintergründe (hinter der Figur in Cutscene, Duell, Profil, Ergebnis) ---------- */
  function hintergrund(id) {
    const W = WF3D, T = W.T, g = new T.Group(), ticks = [], s = Math.sin;
    const flach = (w, h, f, x, y, z = 0) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: f })); m.position.set(x, y, z); g.add(m); return m; };
    const kreis = (r, f, x, y, z = 0.01, n = 24) => { const m = new T.Mesh(new T.CircleGeometry(r, n), new T.MeshBasicMaterial({ color: f })); m.position.set(x, y, z); g.add(m); return m; };
    let k = 7; const zufall = () => (k = (k * 9301 + 49297) % 233280) / 233280;
    switch (id) {
      case 'papier': flach(16, 10, '#F3EFE6', 0, 2); for (let i = 0; i < 9; i++) flach(16, 0.03, '#C9DCE8', 0, -2 + i * 0.7, 0.01); flach(0.04, 10, '#E8A5A5', -3.2, 2, 0.01); break;
      case 'schnee': {
        flach(16, 10, '#9FB8D6', 0, 2); flach(16, 2, '#F5F0E4', 0, -2.2, 0.01);
        const flocken = []; for (let i = 0; i < 60; i++) flocken.push([kreis(0.04 + zufall() * 0.05, '#F5F0E4', zufall() * 12 - 6, 0, 0.02, 8), 0.3 + zufall() * 0.5]);
        ticks.push(t => flocken.forEach(([f, v], i) => { f.position.y = 7 - ((t * v + i * 0.37) % 8); }));
        break;
      }
      case 'sterne': {
        flach(16, 10, '#1F2D4A', 0, 2); kreis(0.7, '#F7EFC8', 3.0, 4.0); kreis(0.62, '#1F2D4A', 3.3, 4.15, 0.02);
        const sterne = []; for (let i = 0; i < 50; i++) sterne.push(kreis(0.02 + zufall() * 0.04, '#F5F0E4', zufall() * 12 - 6, zufall() * 8 - 1, 0.02, 6));
        ticks.push(t => sterne.forEach((s, i) => s.scale.setScalar(0.6 + 0.4 * Math.abs(Math.sin(t * 1.5 + i)))));
        break;
      }
      case 'sonnenuntergang':
        ['#3B4A80', '#7B5CC4', '#E86AA6', '#F28A5B', '#F2C14E'].forEach((f, i) => flach(16, 1.6, f, 0, 6 - i * 1.5, 0.001 * i));
        kreis(1.6, '#FFE38A', 0, -0.2, 0.01, 32); flach(16, 2.8, '#2B2826', 0, -2.6, 0.02);
        break;
      case 'eiskristall': {
        flach(16, 10, '#CFEFFF', 0, 2);
        const kr = []; for (let i = 0; i < 16; i++) kr.push([kreis(0.35 + zufall() * 1.1, i % 2 ? '#F5F0E4' : '#9ED9FF', zufall() * 12 - 6, zufall() * 7 - 1, 0.01 + i * 0.001, 4), 0.5 + zufall()]);
        ticks.push(t => kr.forEach(([m, v], i) => { m.scale.setScalar(0.9 + 0.12 * Math.sin(t * v + i)); }));
        break;
      }
      case 'polarlicht': {
        flach(16, 10, '#0F1A33', 0, 2);
        const st = []; for (let i = 0; i < 40; i++) st.push(kreis(0.02 + zufall() * 0.035, '#F5F0E4', zufall() * 14 - 7, zufall() * 5 + 0.5, 0.02, 6));
        const band = []; [['#3FD08A', 3.6], ['#2BB8A8', 2.7], ['#E86AA6', 1.9]].forEach(([f, y], i) => band.push([flach(18, 0.9, f, 0, y, 0.03 + i * 0.001), i]));
        flach(16, 2.2, '#EAF4FF', 0, -2.4, 0.05);
        for (let i = 0; i < 6; i++) kreis(0.55 + zufall() * 0.3, '#2F5D45', -6 + i * 2.4 + zufall(), -0.9, 0.06, 3).rotation.z = Math.PI / 2;
        ticks.push(t => { band.forEach(([m, i]) => { m.position.x = Math.sin(t * 0.4 + i) * 0.9; m.rotation.z = Math.sin(t * 0.5 + i * 2) * 0.05; m.scale.y = 0.8 + 0.5 * Math.abs(Math.sin(t * 0.6 + i)); }); st.forEach((m, i) => m.scale.setScalar(0.6 + 0.4 * Math.abs(Math.sin(t * 1.4 + i)))); });
        break;
      }
      case 'galaxie': {
        flach(16, 10, '#0B1026', 0, 2);
        const farben = ['#F5F0E4', '#7CD4FF', '#F2C14E', '#E86AA6'], st = [];
        for (let i = 0; i < 70; i++) st.push(kreis(0.02 + zufall() * 0.045, farben[i % 4], zufall() * 14 - 7, zufall() * 8 - 1.5, 0.02, 6));
        const planet = kreis(1.5, '#E86AA6', 3.5, 3.6, 0.03, 32); const ring = kreis(2.3, '#F2C14E', 3.5, 3.6, 0.025, 32); ring.scale.set(1, 0.22, 1); ring.rotation.z = 0.4;
        const mond = kreis(0.6, '#7CD4FF', -3.8, 1.2, 0.03, 24);
        kreis(0.18, '#F5F0E4', -3.5, 1.5, 0.04, 16);
        ticks.push(t => { st.forEach((m, i) => m.scale.setScalar(0.5 + 0.5 * Math.abs(Math.sin(t * 1.3 + i)))); planet.position.y = 3.6 + Math.sin(t * 0.5) * 0.15; ring.position.y = planet.position.y; mond.position.y = 1.2 + Math.sin(t * 0.7 + 1) * 0.12; });
        break;
      }
      case 'lavafluss': {
        flach(16, 10, '#2A0E0E', 0, 2);
        const gluten = []; for (let i = 0; i < 30; i++) gluten.push([kreis(0.04 + zufall() * 0.07, i % 2 ? '#FF7A2E' : '#F2C14E', zufall() * 12 - 6, -2 + zufall() * 6, 0.02, 8), 0.3 + zufall() * 0.6]);
        const strom = []; for (let i = 0; i < 3; i++) strom.push(flach(16, 0.7, ['#FF7A2E', '#F2C14E', '#D9643A'][i], 0, -1.6 - i * 0.6, 0.03 + i * 0.001));
        for (let i = 0; i < 6; i++) kreis(0.7 + zufall() * 0.5, '#120606', -6 + i * 2.4 + zufall(), -0.6, 0.06, 3).rotation.z = Math.PI / 2;
        ticks.push(t => { gluten.forEach(([m, v], i) => { m.position.y = -2 + ((t * v + i * 0.41) % 7); }); strom.forEach((m, i) => { m.position.x = Math.sin(t * 0.6 + i * 1.7) * 0.5; m.scale.y = 0.85 + 0.3 * Math.abs(Math.sin(t + i)); }); });
        break;
      }
      case 'olivenhain': {
        ['#BFE3F2', '#D9EEF5'].forEach((f, i) => flach(16, 5, f, 0, 4.5 - i * 4, 0.001 * i));
        kreis(0.9, '#FFE38A', 3.4, 4.3, 0.01, 32);
        kreis(6, '#A9C47A', -3, -5.2, 0.02, 40); kreis(7, '#8FB061', 4, -6.4, 0.025, 40);
        const baum = (x, y, sc) => { flach(0.18 * sc, 1.2 * sc, '#6B4A2E', x, y, 0.03); [[0, 0.8], [-0.45, 0.55], [0.45, 0.6], [-0.2, 1.1], [0.25, 1.05]].forEach(([dx, dy]) => kreis(0.42 * sc, '#5E7A3A', x + dx * sc, y + dy * sc, 0.031, 12)); };
        baum(-4.2, 0.2, 1.2); baum(-1.6, -0.3, 0.9); baum(2.6, -0.1, 1.1); baum(4.8, 0.6, 0.8);
        const v = []; for (let i = 0; i < 4; i++) v.push(flach(0.25, 0.05, '#2B2826', -5 + i * 2.5, 4 + zufall(), 0.04));
        ticks.push(t => v.forEach((m, i) => { m.position.x = ((t * 0.6 + i * 3) % 14) - 7; m.rotation.z = s(t * 8 + i) * 0.4; }));
        break;
      }
      case 'aegaeis': {
        flach(16, 6, '#7CD4FF', 0, 5); kreis(1.1, '#FFE38A', -3.5, 4.4, 0.01, 32);
        const wellen = []; ['#3D8FD1', '#2F7BC0', '#256AAA'].forEach((f, i) => wellen.push(flach(18, 1.5, f, 0, 1.4 - i * 1.1, 0.02 + i * 0.001)));
        const haus = (x, y, b) => { flach(b, b * 0.8, '#FAF6EB', x, y, 0.04); kreis(b * 0.42, '#2F6FC0', x, y + b * 0.4, 0.039, 20); flach(b * 0.18, b * 0.3, '#2F6FC0', x, y - b * 0.25, 0.041); };
        haus(3.2, 2.4, 1.1); haus(4.6, 2.2, 0.9); haus(2.1, 2.0, 0.8);
        flach(4.5, 0.6, '#E8DCC0', 3.4, 1.7, 0.035);
        const boot = flach(0.9, 0.18, '#D9643A', -2, 1.1, 0.05);
        ticks.push(t => { wellen.forEach((m, i) => { m.position.x = s(t * 0.8 + i) * 0.4; }); boot.position.x = -2 + s(t * 0.3) * 1.5; boot.position.y = 1.1 + s(t * 2) * 0.06; });
        break;
      }
      case 'tempel': {
        flach(16, 10, '#1F2D4A', 0, 2); kreis(0.9, '#F7EFC8', -3.2, 4.4, 0.01, 32);
        const st = []; for (let i = 0; i < 30; i++) st.push(kreis(0.02 + zufall() * 0.03, '#F5F0E4', zufall() * 14 - 7, zufall() * 5 + 1.5, 0.015, 6));
        flach(8, 0.5, '#D9D2C0', 1, -0.8, 0.02); flach(8.6, 0.35, '#C9C0AA', 1, -1.2, 0.021);
        for (let i = 0; i < 6; i++) { flach(0.45, 3.4, '#E8E1CF', -2.2 + i * 1.3, 1.1, 0.022); flach(0.65, 0.2, '#D9D2C0', -2.2 + i * 1.3, 2.9, 0.023); }
        flach(8, 0.45, '#D9D2C0', 1, 3.2, 0.024);
        const giebel = new T.Mesh(new T.CircleGeometry(4.3, 3), new T.MeshBasicMaterial({ color: '#E8E1CF' })); giebel.rotation.z = Math.PI / 2; giebel.scale.set(0.32, 1, 1); giebel.position.set(1, 3.75, 0.022); g.add(giebel);
        flach(16, 2.4, '#141E33', 0, -2.4, 0.03);
        ticks.push(t => st.forEach((m, i) => m.scale.setScalar(0.6 + 0.4 * Math.abs(s(t * 1.3 + i)))));
        break;
      }
      case 'mosaik': {
        flach(16, 10, '#E8DCC0', 0, 2);
        for (let r2 = 0; r2 < 12; r2++) for (let c2 = 0; c2 < 18; c2++) if ((r2 + c2) % 2) flach(0.86, 0.86, '#DCCDA8', -7.6 + c2 * 0.9, -2.5 + r2 * 0.9, 0.01);
        for (let r2 = 0; r2 < 4; r2++) for (let c2 = 0; c2 < 6; c2++) { const m = flach(0.5, 0.5, (r2 + c2) % 2 ? '#2F6FC0' : '#D9643A', -6.75 + c2 * 2.7, -1.6 + r2 * 2.7, 0.015); m.rotation.z = Math.PI / 4; }
        flach(16, 1.1, '#2B2826', 0, 5.2, 0.02); for (let i = 0; i < 18; i++) flach(0.4, 0.4, '#F2C14E', -7.65 + i * 0.9, 5.2, 0.025);
        flach(16, 1.1, '#2B2826', 0, -2.2, 0.02); for (let i = 0; i < 18; i++) flach(0.4, 0.4, '#F2C14E', -7.2 + i * 0.9, -2.2, 0.025);
        break;
      }
      case 'stadion': {
        flach(16, 10, '#9FD4F0', 0, 4);
        ['#C9B28A', '#B59C72', '#A0875E', '#8C744E'].forEach((f, i) => flach(16, 0.7, f, 0, 3.0 - i * 0.7, 0.01 + i * 0.001));
        const fans = []; for (let i = 0; i < 40; i++) fans.push(kreis(0.12, ['#D9643A', '#2F6FC0', '#F2C14E', '#3CBFB0', '#E86AA6'][i % 5], -7 + (i % 20) * 0.72, 3.1 - Math.floor(i / 20) * 0.7, 0.02, 10));
        flach(16, 3.2, '#E3B67A', 0, -1.4, 0.02); for (let i = 0; i < 4; i++) flach(16, 0.05, '#FAF6EB', 0, -0.2 - i * 0.6, 0.025);
        ticks.push(t => fans.forEach((m, i) => { m.position.y = 3.1 - Math.floor(i / 20) * 0.7 + Math.max(0, s(t * 6 + i * 0.7)) * 0.12; }));
        break;
      }
      case 'gewitter': {
        flach(16, 10, '#2A2F45', 0, 2);
        const blitz = flach(16, 10, '#F5F0E4', 0, 2, 0.005); blitz.material.transparent = true; blitz.material.opacity = 0;
        const wolken = []; for (let i = 0; i < 9; i++) wolken.push([kreis(0.9 + zufall() * 0.8, i % 2 ? '#454B66' : '#3A3F58', -7 + i * 1.8, 4.2 + zufall() * 0.8, 0.02, 20), zufall()]);
        const zack = new T.Group(); zack.position.set(2.5, 2.5, 0.03); g.add(zack);
        [[0, 0, -0.5], [0.35, -0.9, 0.6], [0.05, -1.8, -0.5]].forEach(([x, y, r]) => { const m = new T.Mesh(new T.PlaneGeometry(0.22, 1.1), new T.MeshBasicMaterial({ color: '#F2C14E', transparent: true })); m.position.set(x, y, 0); m.rotation.z = r; zack.add(m); });
        flach(16, 2.2, '#1B1F2E', 0, -2.4, 0.04);
        ticks.push(t => { const z = t % 3.1, an = z < 0.12 || (z > 0.22 && z < 0.3); blitz.material.opacity = an ? 0.35 : 0; zack.visible = an; wolken.forEach(([m, v], i) => { m.position.x = -7 + i * 1.8 + s(t * 0.3 + v * 6) * 0.3; }); });
        break;
      }
      case 'unterwelt': {
        flach(16, 10, '#1A0F26', 0, 2);
        flach(16, 1.6, '#2E1A40', 0, -1.6, 0.01); flach(16, 0.6, '#3CBFB0', 0, -0.9, 0.012);
        const seelen = []; for (let i = 0; i < 18; i++) seelen.push([kreis(0.06 + zufall() * 0.1, i % 3 ? '#8AF0D8' : '#C9A8FF', zufall() * 12 - 6, zufall() * 6, 0.02, 10), 0.2 + zufall() * 0.4, zufall() * 6]);
        for (let i = 0; i < 7; i++) kreis(0.6 + zufall() * 0.6, '#0E0816', -6.5 + i * 2.2, -1.3, 0.03, 3).rotation.z = Math.PI / 2;
        ticks.push(t => seelen.forEach(([m, v, p]) => { m.position.y = -1 + ((t * v + p) % 7); m.position.x += s(t * 2 + p) * 0.004; m.scale.setScalar(0.7 + 0.3 * Math.abs(s(t * 2 + p))); }));
        break;
      }
      case 'olympwolken': {
        ['#FBE6A8', '#FFE9C2', '#FFF6E3'].forEach((f, i) => flach(16, 3.4, f, 0, 5.4 - i * 3, 0.001 * i));
        const strahl = new T.Group(); strahl.position.set(0, 3.6, 0.005); g.add(strahl);
        for (let i = 0; i < 10; i++) { const m = new T.Mesh(new T.CircleGeometry(10, 3, 0, Math.PI / 14), new T.MeshBasicMaterial({ color: '#FFF1C4' })); m.rotation.z = i * Math.PI / 5; strahl.add(m); }
        const wolken = []; for (let i = 0; i < 12; i++) wolken.push([kreis(0.7 + zufall() * 0.9, '#FFFFFF', -8 + i * 1.5, -0.9 + zufall() * 0.6 + (i % 3 === 0 ? 2.6 : 0), 0.02 + i * 0.0005, 20), 0.15 + zufall() * 0.2]);
        for (let i = 0; i < 4; i++) { flach(0.4, 2.6, '#F2C14E', -5 + i * 0.9, 0.3, 0.015); }
        ticks.push(t => { strahl.rotation.z = t * 0.15; wolken.forEach(([m, v], i) => { m.position.x = ((-8 + i * 1.5 + t * v + 9) % 18) - 9; }); });
        break;
      }
      case 'leer': break;                // nichts dahinter (Profil zeigt dort das Banner)
      case 'graffiti':
        flach(16, 10, '#B5654A', 0, 2);
        for (let r = 0; r < 14; r++) for (let c = 0; c < 9; c++) flach(1.0, 0.36, (r + c) % 3 ? '#A95A42' : '#C16E52', -6 + c * 1.6 + (r % 2) * 0.8, -1.4 + r * 0.42, 0.005);
        [['#E86AA6', -2.4, 2.4, 1.1], ['#7CD4FF', 2.2, 3.1, 0.9], ['#F2C14E', 0.4, 4.0, 0.7], ['#8CC084', -3.6, 0.6, 0.6], ['#F5F0E4', 3.4, 1.0, 0.5]].forEach(([f, x, y, r]) => kreis(r, f, x, y, 0.02, 9));
        break;
      case 'flammen': {
        flach(16, 10, '#3A1410', 0, 2);
        const fl = []; for (let i = 0; i < 14; i++) { const m = new T.Mesh(new T.ConeGeometry(0.55, 2.4, 3), new T.MeshBasicMaterial({ color: i % 2 ? '#FF7A2E' : '#F2C14E' })); m.position.set(-6.5 + i, -1.2, 0.02 + (i % 2) * 0.01); g.add(m); fl.push(m); }
        ticks.push(t => fl.forEach((m, i) => { m.scale.y = 0.8 + 0.45 * Math.abs(Math.sin(t * 5 + i * 1.3)); m.position.y = -1.6 + m.scale.y * 1.1; }));
        break;
      }
      case 'gold': {
        flach(16, 10, '#E0A400', 0, 2);
        const strahlen = new T.Group(); strahlen.position.set(0, 1.4, 0.01); g.add(strahlen);
        for (let i = 0; i < 12; i++) { const m = new T.Mesh(new T.CircleGeometry(12, 3, 0, Math.PI / 12), new T.MeshBasicMaterial({ color: '#F2C14E' })); m.rotation.z = i * Math.PI / 6; strahlen.add(m); }
        ticks.push(t => { strahlen.rotation.z = t * 0.25; });
        break;
      }
      default: {   // eis
        flach(16, 10, '#7CD4FF', 0, 2);
        for (let i = 0; i < 14; i++) {
          const x = zufall() * 12 - 6, y = zufall() * 7, r = 0.15 + zufall() * 0.2;
          [0, 1, 2].forEach(n => { const b = flach(r * 2, 0.04, '#BFE6FF', x, y, 0.01); b.rotation.z = n * Math.PI / 3; });
        }
      }
    }
    g.userData.tick = t => ticks.forEach(f => f(t));
    return g;
  }

  const PERIODE = { winken: 0.79, jubeln: 0.63, hampelmann: 0.9, flex: 2.1, tanzen: 1.05, pose: 1.6, robot: 1.6, salto: 2.4, starren: 3.14, zeigen: 1.05, faust: 0.9, muskeln: 1.26, trommeln: 0.52, lachen: 0.39, gaehnen: 3.93,
    verbeugen: 2.86, kniebeuge: 2.42, kranich: 3.93, liegestuetz: 2.09, diskus: 2.2, sirtaki: 2.51, kopfschuetteln: 0.63, nacken: 3.2, blitz: 1.8 };
  const vorladen = look => holen(pruefen(typeof look === 'string' ? { skin: look } : look).skin).then(() => true).catch(() => false);
  window.Figur = { PERIODE, KATALOG: K, STANDARD, preis, pruefen, bauen, haltung, hintergrund, vorladen,
    SKINS, KLASSEN, skinInfo: id => INFO[id] || null, bild: id => ORDNER + 'bilder/' + id + '.webp' };

})();
