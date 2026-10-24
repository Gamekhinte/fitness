/* ================= WINTERFORM FIGUR =================
   Eigener Charakter wie ein Mii: Hautfarbe, Augen, Brauen, Mund, Gesicht, Haare, Haarfarbe,
   Oberteil, Hose, Schuhe, Kopfbedeckung, Extra, Skin und Lieblings-Animation.
   Das Gesicht wird auf eine Leinwand gezeichnet (Tusche-Look) und auf den Kopf gelegt.
   Gekaufte Sachen prüft der Server (wf_figur_speichern), die Preise hier sind nur zur Anzeige.
   Preis 'pass' heißt: gibt es nur im Winterpass (Server: Tabelle wf_pass_items).
   Preis 'g120' heißt: 120 Gems (Server: wf_shop_gems). Zahl = Coins. */
(function () {
  const K = {
    haut: ['#F6D7B8', '#EBC199', '#D19F74', '#A9744E', '#7A4E31', '#4E3221'],
    haarfarbe: ['#2B2826', '#5A3A22', '#8B5A2B', '#D9A441', '#F1E3B0', '#C4472D', '#3FA9E6', '#E8E8E8'],
    farben: ['#3FA9E6', '#D9643A', '#3E7A55', '#F2C14E', '#2B2826', '#F5F0E4', '#E86AA6', '#7B5CC4', '#8CC084', '#B9B4AC'],
    hosen: ['#2B2826', '#2F4A7A', '#6B4A2E', '#B9B4AC', '#3E7A55', '#D9643A'],
    schuhe: ['#F5F0E4', '#2B2826', '#D9643A', '#3FA9E6', '#F2C14E', '#3E7A55'],
    augen: [['punkt', 'Punkte'], ['rund', 'Rund'], ['froh', 'Fröhlich'], ['muede', 'Müde'], ['zwinker', 'Zwinkern'], ['wach', 'Hellwach']],
    brauen: [['normal', 'Normal'], ['dick', 'Dick'], ['hoch', 'Überrascht'], ['boese', 'Entschlossen'], ['keine', 'Keine']],
    mund: [['laecheln', 'Lächeln'], ['grinsen', 'Grinsen'], ['offen', 'Offen'], ['neutral', 'Neutral'], ['zunge', 'Zunge']],
    gesicht: [['nichts', 'Nichts'], ['backen', 'Rote Backen'], ['sommersprossen', 'Sommersprossen'], ['pflaster', 'Pflaster']],
    haare: [['kurz', 'Kurz'], ['stachel', 'Stacheln'], ['lang', 'Lang'], ['locken', 'Locken'], ['dutt', 'Dutt'], ['zopf', 'Zopf'], ['bob', 'Bob'], ['seite', 'Seitenscheitel'], ['glatze', 'Glatze']],
    kopf: [['nichts', 'Nichts', 0], ['muetze', 'Mütze', 0], ['cap', 'Cap', 0], ['stirnband', 'Stirnband', 0],
      ['hasenohren', 'Hasenohren', 300], ['kopfhoerer', 'Kopfhörer', 350], ['helm', 'Radhelm', 400], ['krone', 'Krone', 800],
      ['eismuetze', 'Eismütze', 'pass'], ['eiskrone', 'Eiskrone', 'pass']],
    extra: [['nichts', 'Nichts', 0], ['brille', 'Brille', 0], ['schal', 'Schal', 0],
      ['sonnenbrille', 'Sonnenbrille', 250], ['medaille', 'Medaille', 300], ['umhang', 'Umhang', 600]],
    skin: [['nichts', 'Eigener Look', 0], ['skifahrer', 'Skifahrer', 700], ['ninja', 'Ninja', 900], ['eisbaer', 'Eisbär', 1200],
      ['astronaut', 'Astronaut', 1500], ['dino', 'Dino', 1800], ['gold', 'Goldstatue', 3000],
      ['ritter', 'Silberritter', 'g120'], ['cyber', 'Cyber-Läufer', 'g150'], ['drache', 'Feuerdrache', 'g200'], ['eiskoenig', 'Eiskönig', 'pass']],
    emote: [['winken', 'Winken', 0], ['jubeln', 'Jubeln', 0], ['hampelmann', 'Hampelmann', 200], ['flex', 'Muskeln', 300],
      ['tanzen', 'Tanzen', 400], ['pose', 'Heldenpose', 500], ['robot', 'Roboter', 600], ['salto', 'Salto', 900]],
    // Intro: läuft in der Cutscene vor jedem Duell, mit bösem Blick
    intro: [['starren', 'Böse starren', 0], ['zeigen', 'Auf dich zeigen', 0], ['faust', 'Faust ballen', 300], ['muskeln', 'Muskeln zeigen', 350],
      ['trommeln', 'Brust trommeln', 400], ['lachen', 'Auslachen', 450], ['gaehnen', 'Gelangweilt gähnen', 500]],
    // Hintergrund: hinter deiner Figur in Cutscene, Duell, Profil und Ergebnis
    hg: [['eis', 'Eis', 0], ['papier', 'Papier', 0], ['schnee', 'Schneefall', 300], ['sterne', 'Sternennacht', 400], ['sonnenuntergang', 'Sonnenuntergang', 500],
      ['graffiti', 'Graffiti', 600], ['flammen', 'Flammen', 700], ['gold', 'Goldrausch', 1200],
      ['eiskristall', 'Eiskristall', 'pass'], ['polarlicht', 'Polarlicht', 'pass'], ['galaxie', 'Galaxie', 'g80'], ['lavafluss', 'Lavafluss', 'g80']]
  };
  const STANDARD = { typ: 'mann', haut: '#EBC199', augen: 'punkt', brauen: 'normal', mund: 'laecheln', gesicht: 'nichts', haare: 'kurz',
    haarfarbe: '#5A3A22', oberteil: '#3FA9E6', hose: '#2B2826', schuhe: '#F5F0E4', kopf: 'nichts', extra: 'nichts', skin: 'nichts', emote: 'winken', intro: 'starren', hg: 'eis' };
  const preis = (kat, id) => { const e = (K[kat] || []).find(x => x[0] === id); return e && e[2] ? e[2] : 0; };

  function pruefen(a) {
    const r = Object.assign({}, STANDARD);
    if (a && typeof a === 'object') for (const k in STANDARD) if (typeof a[k] === 'string' && a[k].length < 30) r[k] = /^#f{3,6}$/i.test(a[k]) ? '#F5F0E4' : a[k];   // kein reines Weiß
    if (r.typ !== 'frau') r.typ = 'mann';
    return r;
  }

  /* ---------- Gesicht auf Leinwand ---------- */
  function gesichtMalen(a, skin) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), INK = '#2B2826';
    g.lineCap = g.lineJoin = 'round'; g.strokeStyle = INK; g.fillStyle = INK;
    const ex = [96, 160], ey = 112;
    if (skin === 'ninja') { g.fillStyle = '#1E1C1B'; g.fillRect(0, 140, 256, 116); g.fillStyle = INK; }
    // Augen
    for (const [k, x] of ex.entries()) {
      const typ = a.augen === 'zwinker' && k === 1 ? 'froh' : a.augen;
      g.lineWidth = 7;
      if (typ === 'punkt') { g.beginPath(); g.ellipse(x, ey, 9, 12, 0, 0, 7); g.fill(); }
      else if (typ === 'rund' || typ === 'wach' || typ === 'zwinker') {
        const rx = typ === 'wach' ? 19 : 15, ry = typ === 'wach' ? 23 : 17;
        g.fillStyle = '#F5F0E4'; g.beginPath(); g.ellipse(x, ey, rx, ry, 0, 0, 7); g.fill(); g.stroke();
        g.fillStyle = INK; g.beginPath(); g.ellipse(x + 2, ey + 3, rx * 0.5, ry * 0.55, 0, 0, 7); g.fill();
        g.fillStyle = '#F5F0E4'; g.beginPath(); g.arc(x + 5, ey - 3, 3.5, 0, 7); g.fill(); g.fillStyle = INK;
      } else if (typ === 'froh') { g.beginPath(); g.arc(x, ey + 8, 14, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
      else if (typ === 'muede') { g.beginPath(); g.moveTo(x - 14, ey); g.lineTo(x + 14, ey); g.stroke(); g.beginPath(); g.arc(x, ey, 12, 0.1, Math.PI - 0.1); g.fill(); }
    }
    if (a.typ === 'frau' && skin !== 'ninja') {
      g.lineWidth = 5;
      for (const [k, x] of ex.entries()) {
        const sd = k ? 1 : -1;
        for (const [dx, dy] of [[16, -6], [22, -14], [14, -17]]) { g.beginPath(); g.moveTo(x + sd * 10, ey - 8); g.lineTo(x + sd * dx - sd * 0, ey + dy - 6); g.stroke(); }
      }
    }
    // Brauen
    g.lineWidth = a.brauen === 'dick' ? 12 : 7;
    if (a.brauen !== 'keine') for (const [k, x] of ex.entries()) {
      const s = k ? 1 : -1, hoch = a.brauen === 'hoch' ? -10 : 0, boese = a.brauen === 'boese' ? 14 : 0;
      g.beginPath(); g.moveTo(x - 15, ey - 30 + hoch + (s < 0 ? -boese * 0.3 : boese)); g.quadraticCurveTo(x, ey - 38 + hoch, x + 15, ey - 30 + hoch + (s < 0 ? boese : -boese * 0.3)); g.stroke();
    }
    // Gesicht-Extras
    if (a.gesicht === 'backen') { g.fillStyle = 'rgba(232,106,106,.45)'; [70, 186].forEach(x => { g.beginPath(); g.ellipse(x, 150, 17, 10, 0, 0, 7); g.fill(); }); g.fillStyle = INK; }
    if (a.gesicht === 'sommersprossen') { g.fillStyle = 'rgba(122,78,49,.7)'; [[70, 145], [80, 155], [62, 156], [186, 145], [176, 155], [194, 156]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }); g.fillStyle = INK; }
    if (a.gesicht === 'pflaster') { g.save(); g.translate(180, 150); g.rotate(-0.5); g.fillStyle = '#F2D2A6'; g.fillRect(-20, -8, 40, 16); g.lineWidth = 4; g.strokeRect(-20, -8, 40, 16); g.restore(); }
    // Mund
    if (skin !== 'ninja') {
      g.lineWidth = 7; const mx = 128, my = 168;
      if (a.mund === 'laecheln') { g.beginPath(); g.arc(mx, my - 14, 22, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); }
      else if (a.mund === 'grinsen') { g.beginPath(); g.moveTo(mx - 26, my - 4); g.quadraticCurveTo(mx, my + 34, mx + 26, my - 4); g.closePath(); g.fillStyle = '#F5F0E4'; g.fill(); g.stroke(); g.fillStyle = INK; }
      else if (a.mund === 'offen') { g.beginPath(); g.ellipse(mx, my + 2, 11, 14, 0, 0, 7); g.fill(); }
      else if (a.mund === 'neutral') { g.beginPath(); g.moveTo(mx - 16, my); g.lineTo(mx + 16, my); g.stroke(); }
      else if (a.mund === 'zunge') { g.beginPath(); g.arc(mx, my - 12, 20, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); g.fillStyle = '#E86A6A'; g.beginPath(); g.ellipse(mx + 6, my + 10, 9, 11, 0, 0, 7); g.fill(); g.lineWidth = 4; g.stroke(); g.fillStyle = INK; }
    }
    return c;
  }

  /* ---------- Bauen ---------- */
  function bauen(aussehen, opt = {}) {
    const W = WF3D, T = W.T, a = pruefen(aussehen);
    const sk = a.skin, frau = a.typ === 'frau';
    // Skins legen Farben fest
    let haut = a.haut, ober = a.oberteil, hose = a.hose, schuh = a.schuhe, haare = a.haare, hf = a.haarfarbe, kopf = a.kopf, extra = a.extra;
    if (sk === 'ninja') { ober = '#1E1C1B'; hose = '#1E1C1B'; schuh = '#1E1C1B'; kopf = 'stirnband_rot'; haare = 'kurz'; hf = '#1E1C1B'; }
    if (sk === 'skifahrer') { ober = '#D9643A'; hose = '#2F4A7A'; schuh = '#2B2826'; kopf = 'muetze'; extra = 'skibrille'; }
    if (sk === 'eisbaer') { haut = '#F5F0E4'; ober = '#F5F0E4'; hose = '#F5F0E4'; schuh = '#F5F0E4'; haare = 'glatze'; kopf = 'baerohren'; }
    if (sk === 'astronaut') { ober = '#F4F4F4'; hose = '#F4F4F4'; schuh = '#B9B4AC'; kopf = 'raumhelm'; }
    if (sk === 'dino') { haut = '#8CC084'; ober = '#3E7A55'; hose = '#3E7A55'; schuh = '#3E7A55'; haare = 'glatze'; kopf = 'dino'; }
    if (sk === 'ritter') { ober = '#B9C2CC'; hose = '#8D98A5'; schuh = '#6E7782'; kopf = 'ritterhelm'; extra = 'nichts'; }
    if (sk === 'cyber') { ober = '#1F2D4A'; hose = '#0F1A33'; schuh = '#0F1A33'; haare = 'glatze'; kopf = 'visier'; extra = 'nichts'; }
    if (sk === 'drache') { ober = '#C4472D'; hose = '#8F2F1C'; schuh = '#F2C14E'; haare = 'glatze'; kopf = 'drachenhoerner'; extra = 'nichts'; }
    if (sk === 'eiskoenig') { ober = '#BFE9FF'; hose = '#7CD4FF'; schuh = '#F5F0E4'; kopf = 'eiskrone'; extra = 'nichts'; }
    if (sk === 'gold') { haut = '#F2C14E'; ober = '#F2C14E'; hose = '#E0A400'; schuh = '#E0A400'; hf = '#E0A400'; }

    // aussen: Platz in der Welt (setzt der Aufrufer), wurzel: wird von den Animationen bewegt
    const aussen = new T.Group(), wurzel = new T.Group(); aussen.add(wurzel);
    const rig = { wurzel };
    const huefte = new T.Group(); huefte.position.y = 0.85; wurzel.add(huefte); rig.huefte = huefte;
    const rumpf = new T.Group(); huefte.add(rumpf); rig.rumpf = rumpf;
    rumpf.add(W.teil(new T.CapsuleGeometry(frau ? 0.32 : 0.36, 0.42, 6, 14), ober, 0, 0.42, 0, 0.045));
    rumpf.add(W.teil(new T.CylinderGeometry(frau ? 0.34 : 0.37, frau ? 0.41 : 0.35, 0.22, 14), hose, 0, 0.04, 0, 0.04));
    // Beine
    for (const s of [-1, 1]) {
      const bein = new T.Group(); bein.position.set(s * 0.17, 0.02, 0); huefte.add(bein);
      bein.add(W.teil(new T.CapsuleGeometry(0.135, 0.2, 4, 10), hose, 0, -0.21, 0, 0.04));
      const knie = new T.Group(); knie.position.y = -0.42; bein.add(knie);
      knie.add(W.teil(new T.CapsuleGeometry(0.12, 0.18, 4, 10), hose, 0, -0.17, 0, 0.04));
      knie.add(W.teil(W.box(0.26, 0.16, 0.38), schuh, 0, -0.36, 0.06, 0.035));
      rig[s < 0 ? 'beinL' : 'beinR'] = bein; rig[s < 0 ? 'knieL' : 'knieR'] = knie;
    }
    // Arme
    for (const s of [-1, 1]) {
      const arm = new T.Group(); arm.position.set(s * (frau ? 0.41 : 0.45), 0.72, 0); rumpf.add(arm);
      arm.add(W.teil(new T.CapsuleGeometry(frau ? 0.09 : 0.1, 0.42, 4, 10), ober, 0, -0.3, 0, 0.035));
      arm.add(W.teil(W.kugel(0.12), haut, 0, -0.62, 0, 0.03));
      arm.rotation.z = s * 0.12;
      rig[s < 0 ? 'armL' : 'armR'] = arm;
    }
    // Kopf
    const k = new T.Group(); k.position.y = 1.32; rumpf.add(k); rig.kopf = k;
    const R = 0.52;
    k.add(W.teil(W.kugel(R, 28, 20), haut, 0, 0, 0, 0.045));
    const gesicht = opt.boese ? Object.assign({}, a, { brauen: 'boese', mund: a.mund === 'grinsen' || a.mund === 'zunge' ? 'grinsen' : 'neutral', augen: a.augen === 'froh' || a.augen === 'zwinker' ? 'punkt' : a.augen }) : a;
    const tex = new T.CanvasTexture(gesichtMalen(gesicht, sk)); tex.colorSpace = T.SRGBColorSpace;
    const gGeo = new T.SphereGeometry(R * 1.008, 28, 20, Math.PI / 2 - 1.05, 2.1, 0.62, 1.55);
    k.add(new T.Mesh(gGeo, new T.MeshBasicMaterial({ map: tex, transparent: true })));
    // Ohren
    if (kopf !== 'raumhelm') for (const s of [-1, 1]) k.add(W.teil(W.kugel(0.1), haut, s * R * 0.98, -0.02, 0, 0.02));
    haarBauen(k, haare, hf, R);
    kopfBauen(k, kopf, R, a);
    extraBauen(rig, extra, R);
    if (sk === 'dino') {
      for (let i = 0; i < 5; i++) rumpf.add(W.teil(W.kegel(0.09, 0.22, 4), '#8CC084', 0, 0.85 - i * 0.2, -0.36, 0.02));
      const schwanz = W.kegel(0.2, 0.8, 8); schwanz.rotateX(-Math.PI / 2 - 0.4);
      huefte.add(W.teil(schwanz, '#3E7A55', 0, 0.0, -0.6, 0.03));
    }
    if (sk === 'astronaut') rumpf.add(W.teil(W.box(0.5, 0.6, 0.25), '#D0D0D0', 0, 0.5, -0.42, 0.03));
    if (sk === 'eisbaer') { k.add(W.teil(W.kugel(0.14), '#F1EDE4', 0, -0.17, R * 0.9, 0.02)); k.add(W.teil(W.kugel(0.05), '#2B2826', 0, -0.13, R * 1.02, 0)); }
    const neon = new T.MeshBasicMaterial({ color: 0x3FE0FF });
    if (sk === 'ritter') {
      for (const sd of [-1, 1]) rumpf.add(W.teil(W.kugel(0.17, 14, 10), '#B9C2CC', sd * 0.45, 0.8, 0, 0.03));
      rumpf.add(W.teil(W.box(0.1, 0.34, 0.04), '#D9643A', 0, 0.55, 0.375, 0.02)); rumpf.add(W.teil(W.box(0.3, 0.1, 0.04), '#D9643A', 0, 0.6, 0.375, 0.02));
      const schild = W.rohr(0.26, 0.06, 6); schild.rotateX(Math.PI / 2); rig.armL.add(W.teil(schild, '#D9643A', -0.1, -0.35, 0.16, 0.03));
      const mitte = W.rohr(0.1, 0.08, 6); mitte.rotateX(Math.PI / 2); rig.armL.add(W.teil(mitte, '#F2C14E', -0.1, -0.35, 0.2, 0.02));
    }
    if (sk === 'cyber') {
      const streifen = (b, x, y, z, w, h) => { const m = new T.Mesh(W.box(w, h, 0.02), neon); m.position.set(x, y, z); b.add(m); };
      streifen(rumpf, 0, 0.45, 0.375, 0.08, 0.5); streifen(rumpf, -0.2, 0.5, 0.35, 0.05, 0.3); streifen(rumpf, 0.2, 0.5, 0.35, 0.05, 0.3);
      for (const sd of [-1, 1]) { streifen(sd < 0 ? rig.armL : rig.armR, 0, -0.3, 0.1, 0.04, 0.4); streifen(sd < 0 ? rig.beinL : rig.beinR, 0, -0.25, 0.14, 0.05, 0.4); }
    }
    if (sk === 'drache') {
      for (const sd of [-1, 1]) {
        const fluegel = new T.Group(); fluegel.position.set(sd * 0.28, 0.8, -0.36); fluegel.rotation.set(0, sd * 0.55, sd * -0.5); rumpf.add(fluegel);
        fluegel.add(W.teil(W.box(0.7, 0.05, 0.55), '#F08A3A', sd * 0.35, 0.05, 0, 0.03));
        fluegel.add(W.teil(W.box(0.74, 0.07, 0.07), '#8F2F1C', sd * 0.37, 0.07, 0.28, 0.02));
        fluegel.add(W.teil(W.box(0.07, 0.07, 0.6), '#8F2F1C', sd * 0.02, 0.07, 0, 0.02));
      }
      const schwanz = W.kegel(0.2, 0.9, 8); schwanz.rotateX(-Math.PI / 2 - 0.4);
      huefte.add(W.teil(schwanz, '#C4472D', 0, 0.0, -0.62, 0.03));
      huefte.add(W.teil(W.kegel(0.13, 0.25, 4), '#F2C14E', 0, 0.2, -1.05, 0.02));
    }
    if (sk === 'eiskoenig') {
      rumpf.add(W.teil(W.box(0.82, 1.1, 0.06), '#7CD4FF', 0, 0.35, -0.42, 0.035));
      const kragen = new T.TorusGeometry(0.36, 0.1, 8, 20); kragen.rotateX(Math.PI / 2); rumpf.add(W.teil(kragen, '#F5F0E4', 0, 0.92, 0, 0.025));
      for (const sd of [-1, 1]) { const kr = rumpf.add(W.teil(W.kegel(0.1, 0.32, 4), '#BFE9FF', sd * 0.5, 0.95, 0, 0.02)); }
    }
    rig.anim = a.emote; rig.aussehen = a;
    aussen.userData.rig = rig;
    return aussen;
  }

  function haarBauen(k, typ, f, R) {
    const W = WF3D, T = W.T;
    const kappe = (anteil = 0.45, s = 1.06) => new T.SphereGeometry(R * s, 24, 12, 0, Math.PI * 2, 0, Math.PI * anteil);
    const add = (geo, x, y, z, u = 0.035) => { const m = W.teil(geo, f, x, y, z, u, false); k.add(m); return m; };
    if (typ === 'glatze') return;
    if (typ === 'kurz') { const m = add(kappe(0.38), 0, 0, 0); m.rotation.x = -0.25; }
    if (typ === 'seite') { const m = add(kappe(0.4), 0, 0, 0); m.rotation.set(-0.2, 0, 0.25); const tolle = W.kugel(0.2, 14, 10); tolle.scale(1.7, 0.55, 1.1); add(tolle, -0.12, R * 0.88, R * 0.3).rotation.z = 0.3; }
    if (typ === 'stachel') {
      add(kappe(0.36), 0, 0, 0).rotation.x = -0.2;
      for (let i = 0; i < 8; i++) { const w = i / 8 * Math.PI * 2; const c = add(W.kegel(0.12, 0.34, 6), Math.cos(w) * 0.26, R * 0.95, Math.sin(w) * 0.26 - 0.05, 0.025); c.rotation.set(Math.sin(w) * 0.6, 0, -Math.cos(w) * 0.6); }
      add(W.kegel(0.13, 0.4, 6), 0, R * 1.12, -0.02, 0.025);
    }
    if (typ === 'lang') { add(kappe(0.42), 0, 0, 0).rotation.x = -0.2; const hinten = W.kugel(R * 1.02, 22, 16); hinten.scale(1, 1.3, 0.62); add(hinten, 0, -0.2, -R * 0.42); }
    if (typ === 'locken') { add(kappe(0.36), 0, 0, 0); for (let i = 0; i < 11; i++) { const w = i / 11 * Math.PI * 2; add(W.kugel(0.15, 10, 8), Math.cos(w) * R * 0.85, R * 0.55 + (i % 2) * 0.08, Math.sin(w) * R * 0.85 - 0.08, 0.025); } }
    if (typ === 'zopf') { add(kappe(0.42), 0, 0, 0).rotation.x = -0.2; add(W.kugel(0.13, 12, 10), 0, R * 0.5, -R * 0.95); add(new T.CapsuleGeometry(0.1, 0.5, 4, 8), 0, R * 0.05, -R * 1.12); }
    if (typ === 'bob') { add(kappe(0.44), 0, 0, 0).rotation.x = -0.2; const h = W.kugel(R * 1.05, 22, 16); h.scale(1, 0.85, 0.72); add(h, 0, -0.1, -R * 0.3); }
    if (typ === 'dutt') { add(kappe(0.4), 0, 0, 0).rotation.x = -0.25; add(W.kugel(0.22, 12, 10), 0, R * 0.85, -R * 0.55); }
  }

  function kopfBauen(k, typ, R, a) {
    const W = WF3D, T = W.T;
    const add = (geo, f, x, y, z, u = 0.035) => { const m = W.teil(geo, f, x, y, z, u, false); k.add(m); return m; };
    const kappe = (s, anteil = 0.5) => new T.SphereGeometry(R * s, 24, 12, 0, Math.PI * 2, 0, Math.PI * anteil);
    if (typ === 'muetze') { add(kappe(1.1, 0.34), a.skin === 'skifahrer' ? '#2F4A7A' : '#D9643A', 0, 0.02, 0).rotation.x = -0.15; const t = new T.TorusGeometry(R * 0.9, 0.08, 8, 24); t.rotateX(Math.PI / 2 - 0.15); add(t, '#F5F0E4', 0, R * 0.52, 0, 0.02); add(W.kugel(0.15), '#F5F0E4', 0, R * 1.12, 0, 0.02); }
    if (typ === 'eismuetze') { add(kappe(1.1, 0.34), '#7CD4FF', 0, 0.02, 0).rotation.x = -0.15; const t = new T.TorusGeometry(R * 0.9, 0.08, 8, 24); t.rotateX(Math.PI / 2 - 0.15); add(t, '#F5F0E4', 0, R * 0.52, 0, 0.02); add(W.kugel(0.15), '#F5F0E4', 0, R * 1.12, 0, 0.02); }
    if (typ === 'eiskrone') { const r = new T.CylinderGeometry(R * 0.72, R * 0.72, 0.22, 16, 1, true); add(r, '#BFE9FF', 0, R * 1.0, 0, 0.025); for (let i = 0; i < 7; i++) { const w = i / 7 * Math.PI * 2; add(W.kegel(0.11, i % 2 ? 0.34 : 0.52, 4), '#7CD4FF', Math.cos(w) * R * 0.68, R * (i % 2 ? 1.2 : 1.28), Math.sin(w) * R * 0.68, 0.02); } }
    if (typ === 'ritterhelm') {
      add(kappe(1.14, 0.48), '#B9C2CC', 0, 0.02, 0).rotation.x = -0.1;
      add(W.box(0.07, 0.3, 0.05), '#8D98A5', 0, R * 0.25, R * 1.02, 0.02);
      add(W.kegel(0.1, 0.55, 6), '#D9643A', 0, R * 1.08, -0.12, 0.02).rotation.x = -0.4;
      for (const sd of [-1, 1]) add(W.box(0.07, 0.4, 0.3), '#8D98A5', sd * R * 1.02, -0.08, 0.05, 0.02);
    }
    if (typ === 'visier') {
      const v = new T.Mesh(W.box(0.86, 0.2, 0.1), new T.MeshBasicMaterial({ color: 0x3FE0FF, transparent: true, opacity: 0.85 })); v.position.set(0, 0.08, R * 0.93); k.add(v);
      add(kappe(1.08, 0.36), '#1F2D4A', 0, 0.02, 0).rotation.x = -0.15;
    }
    if (typ === 'drachenhoerner') {
      for (const sd of [-1, 1]) { const h = add(W.kegel(0.1, 0.5, 6), '#F2C14E', sd * 0.3, R * 0.9, -0.02, 0.025); h.rotation.z = -sd * 0.45; }
      for (let i = 0; i < 4; i++) add(W.kegel(0.07, 0.18, 4), '#C4472D', 0, R * (1.0 - i * 0.14), -R * (0.1 + i * 0.28), 0.02).rotation.x = -0.5;
    }
    if (typ === 'cap') { add(kappe(1.08, 0.4), '#D9643A', 0, 0.02, 0); const s = new T.CylinderGeometry(0.42, 0.42, 0.05, 20, 1, false, -Math.PI / 2, Math.PI); add(s, '#D9643A', 0, R * 0.45, R * 0.55, 0.02); }
    if (typ === 'stirnband' || typ === 'stirnband_rot') { const t = new T.TorusGeometry(R * 1.0, 0.07, 8, 28); t.rotateX(Math.PI / 2 - 0.15); add(t, typ === 'stirnband_rot' ? '#D9643A' : '#F5F0E4', 0, R * 0.45, 0, 0.02); if (typ === 'stirnband_rot') { add(W.box(0.08, 0.35, 0.04), '#D9643A', 0.1, R * 0.2, -R * 1.0).rotation.z = 0.4; } }
    if (typ === 'krone') { const r = new T.CylinderGeometry(R * 0.62, R * 0.62, 0.22, 16, 1, true); add(r, '#F2C14E', 0, R * 1.0, 0, 0.025); for (let i = 0; i < 5; i++) { const w = i / 5 * Math.PI * 2; add(W.kegel(0.07, 0.2, 4), '#F2C14E', Math.cos(w) * R * 0.58, R * 1.2, Math.sin(w) * R * 0.58, 0.02); } }
    if (typ === 'helm') { add(kappe(1.14, 0.38), '#3FA9E6', 0, 0.03, 0).rotation.x = -0.15; const kamm = new T.SphereGeometry(R * 1.17, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.3); kamm.scale(0.3, 1, 1); add(kamm, '#2B2826', 0, 0.03, 0, 0).rotation.x = -0.15; }
    if (typ === 'hasenohren') for (const s of [-1, 1]) { const o = add(new T.CapsuleGeometry(0.1, 0.5, 4, 8), '#F5F0E4', s * 0.2, R * 1.35, -0.05, 0.025); o.rotation.z = -s * 0.2; }
    if (typ === 'kopfhoerer') { const t = new T.TorusGeometry(R * 1.05, 0.05, 8, 24, Math.PI); add(t, '#2B2826', 0, 0, 0, 0.015); for (const s of [-1, 1]) { const c = W.rohr(0.17, 0.12, 16); c.rotateZ(Math.PI / 2); add(c, '#D9643A', s * R * 1.02, 0, 0, 0.02); } }
    if (typ === 'baerohren') for (const s of [-1, 1]) add(W.kugel(0.15), '#F5F0E4', s * R * 0.65, R * 0.8, 0, 0.025);
    if (typ === 'dino') { add(kappe(1.1, 0.36), '#3E7A55', 0, 0, -0.02).rotation.x = -0.35; for (let i = 0; i < 4; i++) add(W.kegel(0.08, 0.2, 4), '#8CC084', 0, R * (1.05 - i * 0.18), -R * (0.15 + i * 0.3), 0.02); }
    if (typ === 'raumhelm') { const glas = new T.Mesh(W.kugel(R * 1.32, 24, 18), new T.MeshBasicMaterial({ color: 0xBFE6FF, transparent: true, opacity: 0.16, depthWrite: false })); glas.renderOrder = 2; k.add(glas); const rand = new T.TorusGeometry(R * 1.05, 0.06, 8, 28); rand.rotateX(Math.PI / 2); k.add(W.teil(rand, '#D0D0D0', 0, -R * 0.85, 0, 0.02)); }
  }

  function extraBauen(rig, typ, R) {
    const W = WF3D, T = W.T, k = rig.kopf;
    if (typ === 'brille' || typ === 'sonnenbrille' || typ === 'skibrille') {
      if (typ === 'skibrille') { const t = new T.TorusGeometry(R * 1.04, 0.045, 8, 28); t.rotateX(Math.PI / 2 - 0.25); k.add(W.teil(t, '#2B2826', 0, R * 0.5, 0, 0, false)); const glas = W.kugel(0.16, 14, 10); glas.scale(1.9, 0.75, 0.6); k.add(W.teil(glas, '#F2C14E', 0, R * 0.66, R * 0.78, 0.025)); return; }
      for (const s of [-1, 1]) {
        if (typ === 'brille') { const t = new T.TorusGeometry(0.11, 0.025, 6, 16); k.add(W.teil(t, '#2B2826', s * 0.17, 0.1, R * 0.97, 0)); }
        else k.add(W.teil(W.rohr(0.13, 0.04, 16).rotateX(Math.PI / 2), '#2B2826', s * 0.17, 0.1, R * 0.97, 0.015));
      }
      k.add(W.teil(W.box(0.12, 0.03, 0.03), '#2B2826', 0, 0.12, R * 1.0, 0));
    }
    if (typ === 'schal') { const t = new T.TorusGeometry(0.33, 0.1, 8, 20); t.rotateX(Math.PI / 2); rig.rumpf.add(W.teil(t, '#D9643A', 0, 0.9, 0, 0.025)); rig.rumpf.add(W.teil(W.box(0.16, 0.42, 0.08), '#D9643A', 0.16, 0.66, 0.36, 0.025)); }
    if (typ === 'medaille') { rig.rumpf.add(W.teil(W.rohr(0.13, 0.04, 18).rotateX(Math.PI / 2), '#F2C14E', 0, 0.55, 0.38, 0.02)); }
    if (typ === 'umhang') { const g = new T.PlaneGeometry(0.85, 1.1, 6, 6); g.translate(0, -0.55, 0); const m = new T.Mesh(g, W.mat('#D9643A', { side: T.DoubleSide })); m.position.set(0, 0.95, -0.38); m.rotation.x = 0.12; rig.rumpf.add(m); rig.umhang = m; }
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
  }

  /* ---------- Hintergründe (hinter der Figur in Cutscene, Duell, Profil, Ergebnis) ---------- */
  function hintergrund(id) {
    const W = WF3D, T = W.T, g = new T.Group(), ticks = [];
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

  const PERIODE = { winken: 0.79, jubeln: 0.63, hampelmann: 0.9, flex: 2.1, tanzen: 1.05, pose: 1.6, robot: 1.6, salto: 2.4, starren: 3.14, zeigen: 1.05, faust: 0.9, muskeln: 1.26, trommeln: 0.52, lachen: 0.39, gaehnen: 3.93 };
  window.Figur = { PERIODE, KATALOG: K, STANDARD, preis, pruefen, bauen, haltung, hintergrund };

})();
