/* ================= WINTERFORM KRAFT-MODUS =================
   Duelle in Liegestütze, Squats (60 Sekunden, mehr saubere Wiederholungen gewinnt) und Plank (länger halten gewinnt).
   Die Kamera zählt mit MediaPipe Pose Landmarker (Modell "full", 3D-Gelenkpunkte in Metern):
   * nur wenn der ganze Körper sicher erkannt wird,
   * nur volle Bewegung: Arme oben fast gestreckt und unten tief genug, bei Squats Oberschenkel waagrecht,
   * nur mit sauberer Haltung: Körper gerade (Liegestütz, Plank), Oberkörper nicht zu weit vorne (Squat),
   * nicht schneller als ein Mensch kann (min. 0,35 s pro Wiederholung).
   Ungültige Wiederholungen zählen nicht, die App sagt warum. Der Server prüft zusätzlich die Höchstwerte. */
(function () {
  const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
  // heavy erkennt Arme und Beine besser (auch dunkle Kleidung), ist aber langsamer. Ist das Handy zu langsam, nehmen wir full.
  const MODELLE = { heavy: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
    full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task' };
  const UEB = {
    liegestuetze: { name: 'Liegestütze', einheit: 'Wdh.', anim: 'liegestuetz', aufbau: 'Handy vor dich auf den Boden (ca. 1 Meter vor dem Kopf) oder seitlich, 2 Meter weg. Beide Hände müssen im Bild sein.' },
    squats: { name: 'Squats', einheit: 'Wdh.', anim: 'kniebeuge', aufbau: 'Handy auf Hüfthöhe hinstellen, 2 bis 3 Meter weg, schräg von der Seite. Ganzer Körper im Bild.' },
    plank: { name: 'Plank', einheit: 's', anim: 'plank', aufbau: 'Handy vor dich oder seitlich auf den Boden. Unterarme auf den Boden, Körper gerade wie ein Brett.' }
  };
  const L = { schulter: 11, ellbogen: 13, hand: 15, huefte: 23, knie: 25, knoechel: 27 };
  const R = { schulter: 12, ellbogen: 14, hand: 16, huefte: 24, knie: 26, knoechel: 28 };
  const VERBINDUNGEN = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32]];

  /* ---------- Mathe ---------- */
  const grad = r => r * 180 / Math.PI;
  function winkel(a, b, c) {
    const v = [a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0)], w = [c.x - b.x, c.y - b.y, (c.z || 0) - (b.z || 0)];
    const d = v[0] * w[0] + v[1] * w[1] + v[2] * w[2], n = Math.hypot(...v) * Math.hypot(...w);
    return n ? grad(Math.acos(Math.max(-1, Math.min(1, d / n)))) : 180;
  }
  // Neigung einer Linie im Bild gegen die Waagrechte (0 = waagrecht, 90 = senkrecht)
  const neigung = (a, b, asp) => grad(Math.atan2(Math.abs(b.y - a.y), Math.abs((b.x - a.x) * asp) || 1e-6));

  /* ---------- Zähler (reine Logik, ohne Kamera testbar) ---------- */
  class Zaehler {
    constructor(uebung) {
      this.u = uebung; this.wert = 0; this.phase = 'start'; this.glatt = {}; this.hinweis = ''; this.gueltig = false;
      this.repStart = 0; this.minArm = 180; this.minKoerper = 180; this.minKnie = 180; this.maxLage = 0; this.fehler = null;
      this.halteMs = 0; this.letzt = 0; this.ungueltigSeit = 0; this.plankLief = false; this.vorbei = false; this.ereignis = null;
    }
    glaetten(k, v) { const a = this.glatt[k]; this.glatt[k] = a == null ? v : a + (v - a) * 0.45; return this.glatt[k]; }
    // lm: 33 Bildpunkte (x, y 0..1, visibility), welt: 33 Weltpunkte (Meter), t: ms, asp: Breite/Höhe des Bildes
    schritt(lm, welt, t, asp = 16 / 9) {
      this.ereignis = null;
      const dt = this.letzt ? Math.min(200, t - this.letzt) : 0; this.letzt = t;
      this._ctx = { lm, dt, asp };
      if (!lm || !welt) return this.kein(t, 'Ich sehe dich nicht. Ganzer Körper ins Bild.');
      // Füße erkennt die Kamera oft schlecht. Deshalb: Knöchel, sonst Ferse, sonst Zehen.
      // Fehlt alles, wird mit dem Knie weitergerechnet und trotzdem sauber gezählt.
      const sicht = s => [s.schulter, s.ellbogen, s.hand, s.huefte, s.knie].map(i => lm[i].visibility ?? 1);
      const vl = sicht(L), vr = sicht(R), ml = vl.reduce((a, b) => a + b) / 5, mr = vr.reduce((a, b) => a + b) / 5;
      const S = ml >= mr ? L : R, vis = ml >= mr ? vl : vr;
      const fussVon = seite => (seite === L ? [27, 29, 31] : [28, 30, 32]).reduce((b, i) => ((lm[i].visibility ?? 1) > (lm[b].visibility ?? 1) ? i : b));
      const fuss = fussVon(S), fussDa = (lm[fuss].visibility ?? 1) >= 0.3;
      // Handy VOR dem Körper (von vorne gefilmt): Schultern im Bild weit auseinander, Rumpf kurz.
      // Dann zählen wir über den Abstand Schultern zu Händen und den Armwinkel beider Arme.
      if (this.u !== 'squats') {
        const v = i => lm[i].visibility ?? 1;
        if (v(11) > 0.45 && v(12) > 0.45) {
          const sb = Math.abs(lm[11].x - lm[12].x) * asp;
          const hv = v(23) > 0.3 || v(24) > 0.3;
          const hy = hv ? (v(23) >= v(24) ? lm[23] : lm[24]) : null;
          const rumpf2 = hy ? Math.hypot((((lm[11].x + lm[12].x) / 2) - hy.x) * asp, ((lm[11].y + lm[12].y) / 2) - hy.y) : 0;
          // Hände links und rechts weit auseinander = von vorne gefilmt (von der Seite liegen sie im Bild übereinander)
          const handSpreiz = v(15) > 0.3 && v(16) > 0.3 ? Math.abs(lm[15].x - lm[16].x) * asp : 0;
          if (handSpreiz > 0.12 || (sb > 0.12 && (!hy || sb > rumpf2 * 0.8))) return this.front(t, dt, lm, asp, Math.max(sb, 0.08));
        }
      }
      // Pflicht: Liegestütz und Plank Schulter, Ellbogen, Hand, Hüfte. Squat Schulter, Hüfte, Knie. Knie und Füße sonst nur, wenn sichtbar.
      const NAMEN = ['Schultern', 'Ellbogen', 'Hände', 'Hüfte', 'Knie'];
      const noetig = this.u === 'squats' ? [[0, 0.4], [3, 0.3], [4, 0.3]] : this.u === 'plank' ? [[0, 0.4], [1, 0.35], [3, 0.3]] : [[0, 0.4], [1, 0.35], [2, 0.35], [3, 0.3]];
      const fehlt = noetig.filter(([i, g]) => vis[i] < g).map(([i]) => NAMEN[i]);
      if (fehlt.length) return this.kein(t, `Ich sehe deine ${fehlt.join(' und ')} nicht. Ganz ins Bild, mehr Licht hilft.`);
      const knieDa = vis[4] >= 0.3;
      this.fussFehlt = !fussDa;
      const w = i => welt[i], p = i => lm[i];
      const ende = fussDa ? fuss : knieDa ? S.knie : null;              // Endpunkt der Körperlinie (null: nur Oberkörper sichtbar)
      // Winkel im Kamerabild (2D, Seitenverhältnis korrigiert) und in 3D, immer von der Seite, die die Kamera sieht.
      // Von der Seite gefilmt ist 2D meist genauer, 3D schätzt die Tiefe. Wir nehmen das jeweils günstigere,
      // die anderen Prüfungen (Körper gerade, Tempo, ganzer Bereich) bleiben streng.
      const q = i => ({ x: lm[i].x * asp, y: lm[i].y, z: 0 });
      // Seitlich gefilmt (Liegestütz und Plank immer, Squat wenn die Schultern im Bild eng zusammen sind): Winkel aus dem Bild.
      // Frontal (Squat von vorne): 3D, weil im Bild das Knie von vorne immer gestreckt aussieht.
      const schulterBreite = Math.abs(lm[11].x - lm[12].x) * asp, rumpf = Math.hypot((lm[S.schulter].x - lm[S.huefte].x) * asp, lm[S.schulter].y - lm[S.huefte].y) || 1e-6;
      const seitlich = this.u !== 'squats' || schulterBreite < rumpf * 0.55;
      const wink = (a, b, c) => seitlich ? winkel(q(a), q(b), q(c)) : winkel(w(a), w(b), w(c));
      const armO = this.glaetten('arm', wink(S.schulter, S.ellbogen, S.hand)), armU = armO, arm = armO;
      const koerper = this.glaetten('koerper', ende != null ? wink(S.schulter, S.huefte, ende) : 180);
      let knieO;
      if (fussDa && knieDa) knieO = wink(S.huefte, S.knie, fuss);
      else if (this.u === 'squats') knieO = 180 - (90 - neigung(p(S.huefte), p(S.knie), asp)) * 1.4;   // ohne Fuß: aus dem Oberschenkel
      else knieO = 180;
      knieO = this.glaetten('knie', knieO); const knieU = knieO;
      const knie = knieO;
      const lage = neigung(p(S.schulter), p(ende != null ? ende : S.huefte), asp);   // Körper waagrecht im Bild?
      const oberkoerper = 90 - neigung(p(S.huefte), p(S.schulter), asp);  // Squat: Abweichung von senkrecht
      // Hüfte durchhängen (positiv) oder Po hoch (negativ), im Bild gemessen
      const sx = p(S.schulter), ax = p(ende != null ? ende : S.huefte), hx = p(S.huefte);
      const anteil = (hx.x - sx.x) / ((ax.x - sx.x) || 1e-6), linieY = sx.y + (ax.y - sx.y) * anteil, durchhang = hx.y - linieY;
      this.mess = { arm: armO, armU, koerper, knie: knieO, knieU, lage, oberkoerper, durchhang };
      if (this.u === 'liegestuetze') return this.liegestuetz(t, armO, armU, koerper, lage, durchhang, knie);
      if (this.u === 'squats') return this.squat(t, knieO, knieU, oberkoerper, p(S.schulter), p(S.huefte), p(fussDa ? fuss : S.knie));
      return this.plank(t, dt, arm, koerper, lage, durchhang, knie);
    }
    vonVorne(t) {
      const { lm, dt, asp } = this._ctx, v = i => lm[i].visibility ?? 1;
      if (v(11) < 0.3 && v(12) < 0.3) return this.kein(t, 'Ich sehe deine Schultern nicht.');
      const sb = Math.max(0.08, Math.abs(lm[11].x - lm[12].x) * asp);
      return this.front(t, dt, lm, asp, sb);
    }
    front(t, dt, lm, asp, sb) {
      const v = i => lm[i].visibility ?? 1;
      const arme = [[11, 13, 15], [12, 14, 16]].filter(([a, b, c]) => v(b) > 0.35 && v(c) > 0.35);
      if (!arme.length) return this.kein(t, 'Ich sehe deine Hände nicht. Hände ins Bild.');
      const q = i => ({ x: lm[i].x * asp, y: lm[i].y, z: 0 });
      const armRoh = arme.reduce((s, [a, b, c]) => s + winkel(q(a), q(b), q(c)), 0) / arme.length;
      const schulterY = (lm[11].y + lm[12].y) / 2;
      const untenY = this.u === 'plank' ? arme.reduce((s, [, b]) => s + lm[b].y, 0) / arme.length : arme.reduce((s, [, , c]) => s + lm[c].y, 0) / arme.length;
      const r = this.glaetten('r', (untenY - schulterY) / sb);       // wie weit die Schultern über den Händen sind, relativ zur Schulterbreite
      const arm = this.glaetten('armF', armRoh);
      this.rmax = Math.max(r, (this.rmax || r) * 0.9993);
      this.mess = { front: true, r, rmax: this.rmax, arm };
      if (this.u === 'plank') {
        // Plank von vorne: Ellbogen unter den Schultern und ruhig halten
        if (r < 0.15) { this.hinweis = 'Ellbogen unter die Schultern'; this.gueltig = false; this.plankFehler(t); return this; }
        if (!this.basis) this.basis = r;
        if (Math.abs(r - this.basis) > this.basis * 0.35) { this.hinweis = 'Ruhig halten, nicht hochdrücken oder absacken'; this.gueltig = false; this.plankFehler(t); return this; }
        this.basis += (r - this.basis) * 0.01;
        this.gueltig = true; this.ungueltigSeit = 0; this.plankLief = true; this.hinweis = 'Halten!';
        this.halteMs += dt; const neu = Math.floor(this.halteMs / 1000);
        if (neu > this.wert) { this.wert = neu; this.ereignis = 'sekunde'; }
        return this;
      }
      if (this.phase === 'start') {
        if (r > 0.45 && arm > 120) { this.phase = 'oben'; this.hinweis = 'Los!'; } else this.hinweis = 'Arme strecken, Hände unter die Schultern';
        return this;
      }
      if (this.phase === 'oben') {
        this.gueltig = true;
        if (r < this.rmax * 0.8) { this.phase = 'runter'; this.repStart = t; this.minR = r; this.minArm = arm; }
        return this;
      }
      this.minR = Math.min(this.minR, r); this.minArm = Math.min(this.minArm, arm);
      if (r > this.rmax * 0.86 && arm > 120) {
        const dauer = t - this.repStart, tief = this.minR < this.rmax * 0.5 || this.minArm < 100;
        if (!tief) this.wertung(false, 'Tiefer runter, Brust fast bis zum Boden');
        else if (dauer < 350) this.wertung(false, 'Zu schnell, sauber ausführen');
        else this.wertung(true, 'Sauber!');
        this.phase = 'oben';
      }
      return this;
    }
    kein(t, text) { this.hinweis = text; this.gueltig = false; if (this.u === 'plank') this.plankFehler(t); return this; }
    haltungsText(durchhang) { return durchhang > 0 ? 'Hüfte nicht durchhängen lassen' : 'Po runter, Körper gerade'; }
    liegestuetz(t, armO, armU, koerper, lage, durchhang, knie) {
      if (lage > 45) return this.vonVorne(t);            // Körper steht im Bild senkrecht: Handy liegt vor dir
      if (this.phase === 'start') { if (armO > 145 && koerper > 150) { this.phase = 'oben'; this.hinweis = 'Los!'; } else this.hinweis = armO > 145 ? this.haltungsText(durchhang) : 'Arme ganz strecken'; return this; }
      if (this.phase === 'oben') {
        this.gueltig = koerper > 150 && knie >= 135;
        if (!this.gueltig) this.hinweis = knie < 135 ? 'Knie gestreckt lassen' : this.haltungsText(durchhang);
        if (armU < 130) { this.phase = 'runter'; this.repStart = t; this.minArm = armU; this.minKoerper = koerper; this.minKnie = knie; this.fehler = null; }
        return this;
      }
      // in der Bewegung
      this.minArm = Math.min(this.minArm, armU); this.minKoerper = Math.min(this.minKoerper, koerper); this.minKnie = Math.min(this.minKnie, knie);
      if (this.minKoerper < 148 && !this.fehler) this.fehler = this.haltungsText(durchhang);
      if (this.minKnie < 135 && !this.fehler) this.fehler = 'Knie gestreckt lassen';
      if (armO > 145) {
        const dauer = t - this.repStart;
        if (this.minArm > 100) this.wertung(false, 'Tiefer runter, Brust fast bis zum Boden');
        else if (this.fehler) this.wertung(false, this.fehler);
        else if (dauer < 350) this.wertung(false, 'Zu schnell, sauber ausführen');
        else this.wertung(true, 'Sauber!');
        this.phase = 'oben';
      }
      return this;
    }
    squat(t, knieO, knieU, oberkoerper, schulter, huefte, knoechel) {
      const aufrecht = schulter.y < huefte.y && huefte.y < knoechel.y;
      if (!aufrecht) { this.phase = 'start'; return this.kein(t, 'Stell dich hin, Seite zur Kamera.'); }
      if (this.phase === 'start') { if (knieO > 155) { this.phase = 'oben'; this.hinweis = 'Los!'; } else this.hinweis = 'Gerade hinstellen'; return this; }
      if (this.phase === 'oben') {
        this.gueltig = true;
        if (knieU < 145) { this.phase = 'runter'; this.repStart = t; this.minKnie = knieU; this.maxLage = oberkoerper; this.fehler = null; }
        return this;
      }
      this.minKnie = Math.min(this.minKnie, knieU); this.maxLage = Math.max(this.maxLage, oberkoerper);
      if (this.maxLage > 58 && !this.fehler) this.fehler = 'Oberkörper aufrechter, Brust raus';
      if (knieO > 155) {
        const dauer = t - this.repStart;
        if (this.minKnie > 105) this.wertung(false, 'Tiefer in die Hocke, Oberschenkel waagrecht');
        else if (this.fehler) this.wertung(false, this.fehler);
        else if (dauer < 450) this.wertung(false, 'Zu schnell, sauber ausführen');
        else this.wertung(true, 'Sauber!');
        this.phase = 'oben';
      }
      return this;
    }
    plank(t, dt, arm, koerper, lage, durchhang, knie) {
      let fehler = null;
      if (lage > 35) return this.vonVorne(t);
      else if (knie < 150) fehler = 'Knie vom Boden, Beine gestreckt';
      else if (koerper < 158) fehler = this.haltungsText(durchhang);
      else if (!(arm > 60 && arm < 115) && !(arm > 150)) fehler = 'Ellbogen unter die Schultern';
      if (fehler) { this.hinweis = fehler; this.gueltig = false; this.plankFehler(t); return this; }
      this.gueltig = true; this.ungueltigSeit = 0; this.plankLief = true; this.hinweis = 'Halten!';
      this.halteMs += dt; const neu = Math.floor(this.halteMs / 1000);
      if (neu > this.wert) { this.wert = neu; this.ereignis = 'sekunde'; }
      return this;
    }
    // Plank: kurz ungültig ist erlaubt (1,5 s), danach ist der Satz vorbei
    plankFehler(t) {
      if (!this.plankLief) return;
      if (!this.ungueltigSeit) this.ungueltigSeit = t;
      if (t - this.ungueltigSeit > 1500 && !this.vorbei) { this.vorbei = true; this.ereignis = 'vorbei'; }
    }
    wertung(ok, text) { this.hinweis = text; if (ok) { this.wert++; this.ereignis = 'wdh'; } else this.ereignis = 'fehler'; }
  }

  /* ---------- Kamera und Erkennung ---------- */
  const K = { pl: null, stream: null, video: null, canvas: null, laeuft: false, zaehler: null, letzteZeit: 0, aufFrame: null, fehlerFarbe: 0 };
  async function erkennerLaden(art) {
    art = art || store.get('wf-posemodell', 'heavy');
    if (K.pl && K.art === art) return K.pl;
    const v = await import(VISION + '/vision_bundle.mjs');
    const dateien = K.dateien || (K.dateien = await v.FilesetResolver.forVisionTasks(VISION + '/wasm'));
    const opt = d => ({ baseOptions: { modelAssetPath: MODELLE[art], delegate: d }, runningMode: 'VIDEO', numPoses: 1,
      minPoseDetectionConfidence: 0.4, minPosePresenceConfidence: 0.4, minTrackingConfidence: 0.4 });
    let neu;
    try { neu = await v.PoseLandmarker.createFromOptions(dateien, opt('GPU')); K.gpu = true; }
    catch (err) { neu = await v.PoseLandmarker.createFromOptions(dateien, opt('CPU')); K.gpu = false; if (art === 'heavy') { neu.close && neu.close(); return erkennerLaden('full'); } }
    if (K.pl && K.pl.close) K.pl.close();
    K.pl = neu; K.art = art; K.messungen = [];
    return K.pl;
  }
  // Dunkles Bild aufhellen, bevor die Erkennung es sieht (dunkler Raum, schwarze Kleidung)
  const HELL = { c: null, g: null, mess: null, mg: null, lut: null, dunkel: false, zaehler: 0 };
  function aufbereiten(v) {
    const w = 480, h = Math.round(480 * (v.videoHeight || 9) / (v.videoWidth || 16));
    if (!HELL.c) {
      HELL.c = document.createElement('canvas'); HELL.g = HELL.c.getContext('2d', { willReadFrequently: true });
      HELL.mess = document.createElement('canvas'); HELL.mess.width = 32; HELL.mess.height = 18; HELL.mg = HELL.mess.getContext('2d', { willReadFrequently: true });
      HELL.lut = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) HELL.lut[i] = Math.min(255, Math.round(255 * Math.pow(i / 255, 0.55) * 1.08));   // Gamma hebt dunkle Stellen stark an
    }
    if (HELL.c.width !== w || HELL.c.height !== h) { HELL.c.width = w; HELL.c.height = h; }
    // alle 15 Bilder messen, wie hell es ist
    if (HELL.zaehler++ % 15 === 0) {
      HELL.mg.drawImage(v, 0, 0, 32, 18);
      const d = HELL.mg.getImageData(0, 0, 32, 18).data; let summe = 0;
      for (let i = 0; i < d.length; i += 4) summe += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      HELL.dunkel = summe / (d.length / 4) < 95;
    }
    if (!HELL.dunkel) return v;
    HELL.g.drawImage(v, 0, 0, w, h);
    const bild = HELL.g.getImageData(0, 0, w, h), d = bild.data, lut = HELL.lut;
    for (let i = 0; i < d.length; i += 4) { d[i] = lut[d[i]]; d[i + 1] = lut[d[i + 1]]; d[i + 2] = lut[d[i + 2]]; }
    HELL.g.putImageData(bild, 0, 0);
    return HELL.c;
  }
  async function kameraAn(box) {
    K.video = box.querySelector('video'); K.canvas = box.querySelector('canvas');
    if (!K.stream) K.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    K.video.srcObject = K.stream; await K.video.play().catch(() => {});
    await erkennerLaden();
    K.laeuft = true; schleife();
  }
  function kameraAus() {
    K.laeuft = false;
    if (K.stream) { K.stream.getTracks().forEach(t => t.stop()); K.stream = null; }
  }
  function schleife() {
    if (!K.laeuft) return;
    requestAnimationFrame(schleife);
    const v = K.video; if (!v || v.readyState < 2) return;
    const jetzt = performance.now(); if (jetzt - K.letzteZeit < 30) return; K.letzteZeit = jetzt;
    let r = null;
    const t0 = performance.now();
    try { r = K.pl.detectForVideo(aufbereiten(v), jetzt); } catch (err) { return; }
    // heavy zu langsam (über 110 ms pro Bild)? Dann auf full wechseln und merken
    if (K.art === 'heavy' && K.messungen) {
      K.messungen.push(performance.now() - t0);
      if (K.messungen.length === 20) {
        const schnitt = K.messungen.slice(5).reduce((a, b) => a + b) / 15; K.messungen = null;
        if (schnitt > 110) { store.set('wf-posemodell', 'full'); K.laeuft = false; erkennerLaden('full').then(() => { K.laeuft = true; schleife(); }); return; }
      }
    }
    const lm = r && r.landmarks && r.landmarks[0], welt = r && r.worldLandmarks && r.worldLandmarks[0];
    zeichnen(lm);
    if (K.aufFrame) K.aufFrame(lm, welt, jetzt, (v.videoWidth || 16) / (v.videoHeight || 9));
  }
  function zeichnen(lm) {
    const c = K.canvas, v = K.video; if (!c) return;
    const w = c.clientWidth, h = c.clientHeight; if (c.width !== w * 2) { c.width = w * 2; c.height = h * 2; }
    const g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, w, h);
    if (!lm) return;
    // object-fit: cover umrechnen
    const vw = v.videoWidth || 16, vh = v.videoHeight || 9, s = Math.max(w / vw, h / vh), ox = (w - vw * s) / 2, oy = (h - vh * s) / 2;
    const P = i => [lm[i].x * vw * s + ox, lm[i].y * vh * s + oy];
    const ok = K.zaehler ? K.zaehler.gueltig : true, rot = performance.now() - K.fehlerFarbe < 500;
    g.lineCap = 'round';
    for (const [a, b] of VERBINDUNGEN) {
      if ((lm[a].visibility ?? 1) < 0.4 || (lm[b].visibility ?? 1) < 0.4) continue;
      const [x1, y1] = P(a), [x2, y2] = P(b);
      g.strokeStyle = '#2B2826'; g.lineWidth = 10; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      g.strokeStyle = rot ? '#D9643A' : ok ? '#7CD4FF' : '#F2C14E'; g.lineWidth = 5; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    }
    for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
      if ((lm[i].visibility ?? 1) < 0.4) continue;
      const [x, y] = P(i); g.fillStyle = '#FAF6EB'; g.strokeStyle = '#2B2826'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke();
    }
  }

  /* ---------- Duell-Ablauf ---------- */
  let D = null;
  const A = () => window.ArenaUI;
  const e = s => esc(s);
  const zeit = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function battle() {
    const ui = A();
    if (!ui.ich()) { ui.profil(); return toast('Erst Spitznamen eintragen'); }
    ui.zeigeBlatt(`
      <button class="ar-zu" data-zu aria-label="Schließen">×</button>
      <h2 class="ar-titel">Welche Übung?</h2>
      <p class="ar-hand">Die Kamera zählt nur saubere Wiederholungen. Dein Bild bleibt auf deinem Handy, es wird nichts hochgeladen.</p>
      <div class="ar-klassen">${Object.entries(UEB).map(([id, u], k) =>
        `<button data-uebung="${id}">${ui.rahmen(300, 74, 14, 61 + k, '#FAF6EB')}<b>${u.name}</b><span>${id === 'plank' ? 'Länger halten gewinnt' : '60 Sekunden'}<br><small>Sieg ca. +30 Pokale</small></span></button>`).join('')}</div>`);
    document.querySelectorAll('[data-uebung]').forEach(b => b.onclick = () => aufbau(b.dataset.uebung));
  }

  // Kamera an, Körper prüfen, dann Gegner suchen. Die Kamera bleibt bis zum Ergebnis an.
  async function aufbau(uebung, privat) {
    const ui = A();
    D = { privat: privat || null, uebung, id: null, phase: 'aufbau', bereit: 0, stand: null, t0: 0, startAt: 0, gemeldet: 0, fertig: false, gesagt: {}, seite: 'a' };
    D.z = new Zaehler(uebung); K.zaehler = D.z;
    ui.zeigeBlatt(`
      <div class="kr-kamera" id="krKamera"><video playsinline muted></video><canvas></canvas>
        <div class="kr-uhr" id="krUhr"></div><div class="kr-zahl" id="krZahl"></div><div class="kr-mess" id="krMess"></div><div class="kr-pip" id="krPip" hidden><span id="krPipZahl">0</span></div><div class="kr-mitte" id="krMitte"></div>
        <div class="kr-hinweis" id="krHinweis">Kamera startet…</div></div>
      <div id="krInfo"></div>`);
    document.getElementById('arBlattIn').classList.add('kraft-voll');
    infoAufbau();
    try { await kameraAn(document.getElementById('krKamera')); }
    catch (err) { info(`<p class="ar-hand">Kamera geht nicht: ${e(err.message || 'keine Erlaubnis')}. Erlaube die Kamera in den Einstellungen.</p><button class="ar-knopf breit" data-ende>Zurück</button>`); return; }
    K.aufFrame = (lm, welt, t, asp) => rahmenVerarbeiten(lm, welt, t, asp);
  }
  function info(html) { const el = document.getElementById('krInfo'); if (el) el.innerHTML = html; bindKnoepfe(); }
  function bindKnoepfe() {
    const ende = document.querySelector('[data-ende]'); if (ende) ende.onclick = () => abbrechen();
    const auf = document.getElementById('krAufgeben'); if (auf) auf.onclick = () => aufgeben();
    const los = document.getElementById('krSuchen'); if (los) los.onclick = () => suchen();
  }
  function infoAufbau() {
    const u = UEB[D.uebung];
    info(`<div class="kr-kurz"><b>${u.name}: probier ein paar Wiederholungen</b><p>${u.aufbau} Die Zahl oben zählt schon zum Testen.</p>
      <div class="kr-reihe"><button class="ar-knopf leise" data-ende>Abbrechen</button><button class="ar-knopf" id="krSuchen" ${D.bereit >= 1 ? '' : 'disabled'}>${D.privat ? (D.privat.an ? 'Freund einladen' : 'Annehmen und starten') : 'Gegner suchen'}</button></div></div>`);
  }
  // kleine Messanzeige unten links im Bild, hilft beim Einstellen (und mir bei Fehlern)
  function messen(z) {
    const m = document.getElementById('krMess'); if (!m) return;
    const v = z.mess; if (!v) { m.textContent = ''; return; }
    const r = x => Math.round(x);
    if (v.front) { m.textContent = `V8 · von vorne · Arm ${r(v.arm)}° · Tiefe ${Math.round(100 - v.r / (v.rmax || 1) * 100)} % · ${z.phase}`; return; }
    m.textContent = 'V8 · ' + (D.uebung === 'squats' ? `Knie ${r(v.knieU)}°  Oberkörper ${r(v.oberkoerper)}°  ${z.phase}` : `Arm ${r(v.armU)} bis ${r(v.arm)}°  Körper ${r(v.koerper)}°  Lage ${r(v.lage)}°  ${z.phase}`);
  }
  function mitte(text) {
    const m = document.getElementById('krMitte'); if (!m || m.textContent === text) return;
    m.textContent = text; m.classList.remove('pop'); void m.offsetWidth; if (text) m.classList.add('pop');
  }
  function hinweis(text, art) {
    const h = document.getElementById('krHinweis'); if (!h) return;
    h.textContent = text || ''; h.dataset.art = art || '';
  }
  function rahmenVerarbeiten(lm, welt, t, asp) {
    if (!D) return;
    // Aufbau und Wartezeit: nur prüfen, ob die Haltung erkannt wird
    if (D.phase !== 'satz') {
      if (!D.uebZ) D.uebZ = new Zaehler(D.uebung);
      const z = D.uebZ; z.schritt(lm, welt, t, asp);
      if (D.phase === 'aufbau') {
        if (z.ereignis === 'wdh') { window.Klang && Klang.effekt('wdh', z.wert); }
        if (z.ereignis === 'fehler') { K.fehlerFarbe = performance.now(); window.Klang && Klang.effekt('fehler'); }
        const zz = document.getElementById('krZahl'); if (zz) zz.textContent = z.wert ? z.wert : '';
        messen(z);
      }
      const erkannt = lm && !/Ganzer Körper|sehe dich nicht|müssen ins Bild|Ich sehe deine/.test(z.hinweis);
      D.bereit = erkannt ? Math.min(1, D.bereit + 0.04) : Math.max(0, D.bereit - 0.08);
      const c = document.getElementById('krCheck');
      if (c) { c.textContent = D.bereit >= 1 ? 'Ganzer Körper erkannt. Passt!' : erkannt ? 'Gut, kurz so bleiben…' : z.hinweis; c.dataset.ok = D.bereit >= 1 ? '1' : ''; }
      const b = document.getElementById('krSuchen'); if (b) b.disabled = D.bereit < 1;
      if (D.phase === 'aufbau' && z.ereignis === 'fehler') { hinweis(z.hinweis, 'fehler'); return; }
      hinweis(D.bereit >= 1 ? (z.fussFehlt ? 'Passt! Füße schlecht zu sehen, mehr Licht hilft' : 'Passt! Du kannst starten') : erkannt ? 'Gut, kurz so bleiben' : (lm ? z.hinweis : 'Ganzer Körper ins Bild'), D.bereit >= 1 ? 'ok' : erkannt ? 'warn' : '');
      return;
    }
    if (D.fertig) return;
    const z = D.z; z.schritt(lm, welt, t, asp); messen(z);
    if (z.ereignis === 'wdh') { window.Klang && Klang.effekt('wdh', z.wert); const zz = document.getElementById('krZahl'); if (zz) { zz.classList.remove('pop'); void zz.offsetWidth; zz.classList.add('pop'); } }
    if (z.ereignis === 'fehler') { K.fehlerFarbe = performance.now(); window.Klang && Klang.effekt('fehler'); }
    if (z.ereignis === 'sekunde' && z.wert % 10 === 0) window.Klang && Klang.effekt('wdh', z.wert / 10);
    if (z.ereignis === 'vorbei') { window.Klang && Klang.effekt('countdown'); satzEnde(); }
    hinweis(z.hinweis, z.ereignis === 'fehler' ? 'fehler' : z.gueltig ? 'ok' : 'warn');
    const zahl = document.getElementById('krZahl'); if (zahl) zahl.textContent = z.wert;
  }

  async function suchen() {
    const ui = A();
    try {
      if (D.privat && D.privat.an) D.id = (await ui.wf().rpc('wf_herausfordern', ui.mit({ p_an: D.privat.an, p_art: 'kraft', p_wert: D.uebung }))).id;
      else if (D.privat) D.id = (await ui.wf().rpc('wf_herausforderung_annehmen', ui.mit({ p_art: 'kraft', p_match: D.privat.match }))).id;
      else D.id = await ui.wf().rpc('wf_kraft_suchen', ui.mit({ p_uebung: D.uebung }));
    }
    catch (err) { toast(err.message); if (D && D.privat) abbrechen(); return; }
    D.phase = 'suche'; D.t0 = Date.now();
    store.set('wf-kraft', D.id);
    clearInterval(D.uhr); clearInterval(D.poll);
    D.uhr = setInterval(uhr, 500); D.poll = setInterval(abfragen, 2000);
    abfragen(); uhr();
  }
  async function abfragen() {
    if (!D || !D.id) return;
    const ui = A(); let s;
    try { s = await ui.wf().rpc('wf_kraft_stand', { p_duell: D.id }); } catch (err) { return; }
    if (!s || !D || s.id !== D.id) return;
    D.stand = s; D.seite = s.a === ui.ich().id ? 'a' : 'b';
    if (s.status === 'suche' && D.privat && !D.gefragt && Date.now() - D.t0 > 180000) {
      D.gefragt = true;
      ui.wf().rpc('wf_kraft_aufgeben', ui.mit({ p_duell: D.id })).then(abfragen).catch(() => {});
    }
    if (s.status === 'suche' && !D.privat && !D.gefragt && Date.now() - D.t0 > 15000) {
      D.gefragt = true;
      ui.wf().rpc('wf_kraft_aufzeichnung', ui.mit({ p_duell: D.id })).then(abfragen).catch(() => { if (D) D.gefragt = false; });
    }
    if (s.status === 'bereit' && s.start_in != null && !D.startAt) D.startAt = Date.now() + s.start_in * 1000;
    if (s.status === 'fertig' || s.status === 'abgebrochen') return ergebnis(s);
  }
  const gName = (s, seite) => s.aufzeichnung ? (String(s.geist_name).startsWith('Trainingsgeist') ? 'Trainingspartner' + String(s.geist_name).slice(14) : s.geist_name) : (seite === 'a' ? s.b_name : s.a_name);
  const gegnerName = s => gName(s, D.seite);
  const gegnerWert = s => s.aufzeichnung ? (s.geist_wert || 0) : (D.seite === 'a' ? s.b_wert : s.a_wert);
  const PACE = { haut: '#A9744E', haare: 'locken', haarfarbe: '#2B2826', augen: 'wach', mund: 'grinsen', oberteil: '#D9643A', hose: '#2B2826', schuhe: '#FAF6EB', kopf: 'stirnband', hg: 'graffiti' };
  const gegnerFigur = s => { const f = s.aufzeichnung ? s.geist_figur : (D.seite === 'a' ? s.b_figur : s.a_figur); return Figur.pruefen(f && Object.keys(f).length ? f : PACE); };

  /* ---------- Gegner-Avatar im Kamerabild: macht seine Wiederholungen mit (nur die Figur, nie der echte Gegner) ---------- */
  const PIP = { b: null, g: null, f: null, hg: null, gezeigt: 0, ziel: 0, q: -1, uebung: null, fertig: false };
  async function pipStart(look, uebung) {
    const el = document.getElementById('krPip'); if (!el || !window.WF3D) return;
    try { await WF3D.laden(); } catch (err) { return; }
    const W = WF3D, T = W.T;
    el.hidden = false;
    if (!PIP.b) PIP.b = W.buehne(el, { fov: 30 }); else { PIP.b.einhaengen(el); PIP.b.beobachten(el); }
    PIP.b.pausiert = false;
    if (PIP.g) PIP.b.szene.remove(PIP.g);
    const g = PIP.g = new T.Group(); PIP.b.szene.add(g);
    PIP.hg = Figur.hintergrund(Figur.pruefen(look).hg); PIP.hg.position.set(0, 0, -4); g.add(PIP.hg);
    g.add(W.teil(W.box(4.2, 0.08, 1.4), '#2B2826', 1.0, -0.04, 0, 0));
    PIP.f = Figur.bauen(look); PIP.f.rotation.y = Math.PI / 2; g.add(PIP.f);
    Object.assign(PIP, { gezeigt: 0, ziel: 0, q: -1, uebung, fertig: false });
    const k = PIP.b.kamera;
    PIP.b.beiGroesse = () => { if (uebung === 'squats') { k.position.set(0.2, 1.5, 6.4); k.lookAt(0.2, 1.15, 0); } else { k.position.set(1.15, 1.5, 6.2); k.lookAt(1.15, 0.65, 0); } };
    PIP.b.groesse();
    PIP.b.jeBild = (dt, t) => {
      PIP.hg.userData.tick(t);
      const anim = { liegestuetze: 'liegestuetz', squats: 'kniebeuge', plank: 'plank' }[uebung];
      if (uebung === 'plank') { Figur.haltung(PIP.f, PIP.fertig ? 'traurig' : PIP.ziel > 0 ? 'plank' : 'idle', t); return; }
      // eine Wiederholung pro gemeldeter Zahl, Tempo passt sich an, wenn er weit vorne ist
      if (PIP.q < 0 && PIP.gezeigt < PIP.ziel) PIP.q = 0;
      if (PIP.q >= 0) {
        PIP.q += dt / Math.max(0.35, 0.7 - (PIP.ziel - PIP.gezeigt) * 0.08);
        if (PIP.q >= 1) { PIP.q = -1; PIP.gezeigt++; }
      }
      if (PIP.q < 0) Figur.haltung(PIP.f, PIP.fertig ? 'idle' : anim, 0);
      else Figur.haltung(PIP.f, anim, PIP.q * Math.PI * 2 / (anim === 'kniebeuge' ? 2.6 : 3));
      if (PIP.fertig && PIP.q < 0) PIP.f.rotation.y = Math.PI / 2;
    };
  }
  function pipWert(n, fertig) {
    PIP.ziel = Math.max(PIP.ziel, n || 0); PIP.fertig = !!fertig;
    const z = document.getElementById('krPipZahl'); if (z) z.textContent = n || 0;
  }
  function pipStopp() { if (PIP.b) { PIP.b.jeBild = null; PIP.b.pausiert = true; } }

  const gegnerFertig = s => s.aufzeichnung ? s.geist_fertig : (D.seite === 'a' ? (s.b_fertig || s.b_auf) : (s.a_fertig || s.a_auf));

  function uhr() {
    if (!D) return;
    const ui = A(), u = UEB[D.uebung], s = D.stand;
    if (D.phase === 'suche' && (!s || s.status === 'suche')) {
      const sek = Math.floor((Date.now() - D.t0) / 1000);
      mitte('');
      info(`<div class="kr-kurz"><b>${D.privat ? 'Warte auf deinen Freund' : 'Suche Gegner'}${'.'.repeat(1 + sek % 3)}</b><p>${u.name} · ${sek} s · bleib in Position</p>
        <div class="kr-reihe"><button class="ar-knopf leise" id="krAufgeben">Abbrechen</button></div></div>`);
      return;
    }
    if (s && s.status === 'bereit' && D.startAt && D.phase !== 'satz' && D.phase !== 'warten') {
      const rest = Math.ceil((D.startAt - Date.now()) / 1000);
      if (rest > 0) {
        if (D.phase !== 'countdown') { D.phase = 'countdown'; }
        if (rest <= 3 && !D.gesagt[rest]) { D.gesagt[rest] = 1; window.Klang && Klang.effekt('countdown'); }
        if (D.phase === 'countdown' && !D.gefundenTon) { D.gefundenTon = true; ui.cutscene(ui.F().aussehen, gegnerFigur(s), ui.ich().name, gegnerName(s)); pipStart(gegnerFigur(s), D.uebung); }
        mitte(String(rest));
        info(`<div class="kr-kurz"><div class="ar-vs"><div><b>${e(ui.ich().name)}</b></div><em>VS</em><div><b>${e(gegnerName(s) || '')}</b><span><img src="arena/pokal.svg" alt="">${(s.aufzeichnung ? s.geist_pokale : (D.seite === 'a' ? s.b_pokale : s.a_pokale)) ?? 0}</span></div></div>
          <div class="kr-reihe"><button class="ar-knopf leise" id="krAufgeben">Aufgeben</button></div></div>`);
        return;
      }
      // Los geht's
      mitte('LOS!'); setTimeout(() => mitte(''), 900);
      D.phase = 'satz'; D.z = new Zaehler(D.uebung); K.zaehler = D.z; D.satzStart = Date.now(); window.Klang && Klang.effekt('los');
    }
    if (D.phase === 'satz' || D.phase === 'warten') {
      const sek = Math.floor((Date.now() - D.startAt) / 1000), dauer = s ? s.dauer : 60;
      if (D.phase === 'satz' && D.uebung !== 'plank' && sek >= dauer) { window.Klang && Klang.effekt('countdown'); satzEnde(); }
      if (D.phase === 'satz' && D.uebung === 'plank' && sek >= dauer) satzEnde();
      if (Date.now() - D.gemeldet > 2000 && D.phase === 'satz') { D.gemeldet = Date.now(); ui.wf().rpc('wf_kraft_wert', ui.mit({ p_duell: D.id, p_wert: D.z.wert, p_fertig: false })).catch(() => {}); }
      const g = s ? gegnerWert(s) : 0, ich = D.z.wert;
      pipWert(g, s && gegnerFertig(s));
      const rest = D.uebung === 'plank' ? sek : Math.max(0, dauer - sek);
      const uh = document.getElementById('krUhr'); if (uh) uh.textContent = D.uebung === 'plank' ? zeit(rest) : rest;
      info(`<div class="kr-kurz ar-hud">
        <div class="ar-renn-zeile ich"><span>Du</span><div class="ar-mini"><i style="width:${Math.min(100, ich / Math.max(ich, g, 1) * 100)}%"></i></div><b>${ich} ${u.einheit}</b></div>
        <div class="ar-renn-zeile"><span>${e(s ? gegnerName(s) || 'Gegner' : 'Gegner')}</span><div class="ar-mini"><i style="width:${Math.min(100, g / Math.max(ich, g, 1) * 100)}%"></i></div><b>${g} ${u.einheit}${s && gegnerFertig(s) ? ' fertig' : ''}</b></div>
        ${D.phase === 'warten' ? '<p class="ar-abstand">Fertig! Warte auf deinen Gegner…</p>' : '<div class="kr-reihe"><button class="ar-knopf leise" id="krAufgeben">Aufgeben</button></div>'}</div>`);
    }
  }
  async function satzEnde() {
    if (!D || D.fertig) return;
    D.fertig = true; D.phase = 'warten';
    const ui = A();
    try { await ui.wf().rpc('wf_kraft_wert', ui.mit({ p_duell: D.id, p_wert: D.z.wert, p_fertig: true })); } catch (err) {}
    abfragen();
  }
  async function aufgeben() {
    if (!D) return;
    const ui = A();
    if (!D.id) return abbrechen();
    if (D.phase === 'satz' && !confirm('Wirklich aufgeben? Das zählt als Niederlage.')) return;
    let r = null;
    try { r = await ui.wf().rpc('wf_kraft_aufgeben', ui.mit({ p_duell: D.id })); } catch (err) {}
    if (r && r.abgebrochen) return abbrechen();
    abfragen();
    if (r && r.delta != null && D && D.stand && !D.stand.aufzeichnung) ergebnis(null, r.delta);
  }
  function abbrechen() {
    if (D) { clearInterval(D.uhr); clearInterval(D.poll); }
    D = null; K.aufFrame = null; kameraAus(); pipStopp(); store.set('wf-kraft', null);
    A().schliessen();
  }
  async function ergebnis(s, aufgabeDelta) {
    const ui = A(), war = D;
    if (!war) return;
    clearInterval(war.uhr); clearInterval(war.poll);
    D = null; K.aufFrame = null; kameraAus(); pipStopp(); store.set('wf-kraft', null);
    if (s && s.status === 'abgebrochen') return ui.schliessen();
    const u = UEB[war.uebung], F = ui.F();
    const vorher = F.coins; await ui.figurLaden(); const coins = Math.max(0, ui.F().coins - vorher);
    let titel, delta, text = '', anim, bot = false;
    if (aufgabeDelta != null) { titel = 'Aufgegeben'; delta = aufgabeDelta; anim = 'traurig'; }
    else {
      const seite = war.seite, sieg = s.sieger === seite, remis = s.ergebnis === 'remis';
      delta = seite === 'a' ? s.a_delta : s.b_delta; bot = !!s.aufzeichnung && ui.istBotName(s.geist_name);
      titel = s.ergebnis === 'ungueltig' ? 'Zählt nicht' : remis ? 'Unentschieden' : sieg ? 'Gewonnen!' : 'Verloren';
      anim = sieg ? F.aussehen.emote : remis ? 'idle' : 'traurig';
      const ich = seite === 'a' ? s.a_wert : s.b_wert, er = s.aufzeichnung ? s.geist_endwert : (seite === 'a' ? s.b_wert : s.a_wert);
      text = `<ul class="ar-liste"><li><span>Du</span><b>${ich} ${u.einheit}</b></li><li><span>${e(gName(s, war.seite) || 'Gegner')}</span><b>${er ?? '–'} ${u.einheit}</b></li></ul>`;
      if (s.ergebnis === 'ungueltig') text = '<p class="ar-hand">Mehr Wiederholungen als ein Mensch schaffen kann. Das Duell zählt nicht.</p>';
    }
    ui.zeigeBlatt(`
      <button class="ar-zu" data-zu aria-label="Schließen">×</button>
      <h2 class="ar-titel ar-pop${titel === 'Gewonnen!' ? ' sieg' : ''}">${titel}</h2>
      ${titel === 'Zählt nicht' ? '' : ui.beuteHtml()}
      ${text}${titel === 'Gewonnen!' && window.Social && s ? `<button class="ar-knopf breit leise2" data-so="teilen" data-text="${e(`Ich habe ein Duell gewonnen: ${(war.seite === 'a' ? s.a_wert : s.b_wert)} ${u.einheit}. Schaffst du mehr?`)}">Sieg teilen</button>` : ''}${window.Social ? '<button class="ar-knopf breit leise2" data-so="matches">Matchverlauf ansehen</button>' : ''}<button class="ar-knopf breit" data-zu>Weiter</button>`, 'ergebnis', { aussehen: F.aussehen, anim, konfetti: titel === 'Gewonnen!' });
    ui.feiern(titel === 'Gewonnen!', delta || 0, coins);
    ui.nachDuell();
  }

  window.KraftUI = { herausfordern: (uebung, an, name) => aufbau(uebung, { an, name }), annehmen: (uebung, match) => aufbau(uebung, { match }), battle, Zaehler, UEB, abbrechen, _test: { K, get D() { return D; }, suchen: () => suchen() } };
})();
