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
  const MODELL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
  const UEB = {
    liegestuetze: { name: 'Liegestütze', einheit: 'Wdh.', anim: 'liegestuetz', aufbau: 'Handy seitlich auf den Boden stellen, 2 Meter weg. Kamera sieht dich von der Seite, Kopf bis Füße.' },
    squats: { name: 'Squats', einheit: 'Wdh.', anim: 'kniebeuge', aufbau: 'Handy auf Hüfthöhe hinstellen, 2 bis 3 Meter weg, schräg von der Seite. Ganzer Körper im Bild.' },
    plank: { name: 'Plank', einheit: 's', anim: 'plank', aufbau: 'Handy seitlich auf den Boden stellen, 2 Meter weg. Unterarme auf den Boden, Körper gerade wie ein Brett.' }
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
      if (!lm || !welt) return this.kein(t, 'Ich sehe dich nicht. Ganzer Körper ins Bild.');
      const sicht = s => [s.schulter, s.ellbogen, s.hand, s.huefte, s.knie, s.knoechel].map(i => lm[i].visibility ?? 1);
      const vl = sicht(L), vr = sicht(R), ml = vl.reduce((a, b) => a + b) / 6, mr = vr.reduce((a, b) => a + b) / 6;
      const S = ml >= mr ? L : R, vis = ml >= mr ? vl : vr;
      const noetig = this.u === 'squats' ? [0, 3, 4, 5] : [0, 1, 2, 3, 5];   // welche der 6 Punkte sicher sichtbar sein müssen
      if (noetig.some(i => vis[i] < 0.55)) return this.kein(t, 'Ganzer Körper muss ins Bild, Kopf bis Füße.');
      const w = i => welt[i], p = i => lm[i];
      const beide = Math.min(ml, mr) > 0.75;
      const arm = this.glaetten('arm', beide ? (winkel(w(11), w(13), w(15)) + winkel(w(12), w(14), w(16))) / 2 : winkel(w(S.schulter), w(S.ellbogen), w(S.hand)));
      const koerper = this.glaetten('koerper', winkel(w(S.schulter), w(S.huefte), w(S.knoechel)));
      const knie = this.glaetten('knie', beide ? (winkel(w(23), w(25), w(27)) + winkel(w(24), w(26), w(28))) / 2 : winkel(w(S.huefte), w(S.knie), w(S.knoechel)));
      const lage = neigung(p(S.schulter), p(S.knoechel), asp);           // Körper waagrecht im Bild?
      const oberkoerper = 90 - neigung(p(S.huefte), p(S.schulter), asp);  // Squat: Abweichung von senkrecht
      // Hüfte durchhängen (positiv) oder Po hoch (negativ), im Bild gemessen
      const sx = p(S.schulter), ax = p(S.knoechel), hx = p(S.huefte);
      const anteil = (hx.x - sx.x) / ((ax.x - sx.x) || 1e-6), linieY = sx.y + (ax.y - sx.y) * anteil, durchhang = hx.y - linieY;
      this.mess = { arm, koerper, knie, lage, oberkoerper, durchhang };
      if (this.u === 'liegestuetze') return this.liegestuetz(t, arm, koerper, lage, durchhang, knie);
      if (this.u === 'squats') return this.squat(t, knie, oberkoerper, p(S.schulter), p(S.huefte), p(S.knoechel));
      return this.plank(t, dt, arm, koerper, lage, durchhang, knie);
    }
    kein(t, text) { this.hinweis = text; this.gueltig = false; if (this.u === 'plank') this.plankFehler(t); return this; }
    haltungsText(durchhang) { return durchhang > 0 ? 'Hüfte nicht durchhängen lassen' : 'Po runter, Körper gerade'; }
    liegestuetz(t, arm, koerper, lage, durchhang, knie) {
      if (lage > 40) { this.phase = 'start'; return this.kein(t, 'Leg dich in Liegestütz-Position, Handy seitlich.'); }
      if (knie < 140) { this.hinweis = 'Knie gestreckt lassen'; this.gueltig = false; }
      if (this.phase === 'start') { if (arm > 150 && koerper > 155) { this.phase = 'oben'; this.hinweis = 'Los!'; } else this.hinweis = arm > 150 ? this.haltungsText(durchhang) : 'Arme ganz strecken'; return this; }
      if (this.phase === 'oben') {
        this.gueltig = koerper > 155 && knie >= 140;
        if (!this.gueltig) this.hinweis = knie < 140 ? 'Knie gestreckt lassen' : this.haltungsText(durchhang);
        if (arm < 135) { this.phase = 'runter'; this.repStart = t; this.minArm = arm; this.minKoerper = koerper; this.minKnie = knie; this.fehler = null; }
        return this;
      }
      // in der Bewegung
      this.minArm = Math.min(this.minArm, arm); this.minKoerper = Math.min(this.minKoerper, koerper); this.minKnie = Math.min(this.minKnie, knie);
      if (this.minKoerper < 155 && !this.fehler) this.fehler = this.haltungsText(durchhang);
      if (this.minKnie < 140 && !this.fehler) this.fehler = 'Knie gestreckt lassen';
      if (arm > 150) {
        const dauer = t - this.repStart;
        if (this.minArm > 95) this.wertung(false, 'Tiefer runter, Brust fast bis zum Boden');
        else if (this.fehler) this.wertung(false, this.fehler);
        else if (dauer < 350) this.wertung(false, 'Zu schnell, sauber ausführen');
        else this.wertung(true, 'Sauber!');
        this.phase = 'oben';
      }
      return this;
    }
    squat(t, knie, oberkoerper, schulter, huefte, knoechel) {
      const aufrecht = schulter.y < huefte.y && huefte.y < knoechel.y;
      if (!aufrecht) { this.phase = 'start'; return this.kein(t, 'Stell dich hin, Gesicht oder Seite zur Kamera.'); }
      if (this.phase === 'start') { if (knie > 160) { this.phase = 'oben'; this.hinweis = 'Los!'; } else this.hinweis = 'Gerade hinstellen'; return this; }
      if (this.phase === 'oben') {
        this.gueltig = true;
        if (knie < 145) { this.phase = 'runter'; this.repStart = t; this.minKnie = knie; this.maxLage = oberkoerper; this.fehler = null; }
        return this;
      }
      this.minKnie = Math.min(this.minKnie, knie); this.maxLage = Math.max(this.maxLage, oberkoerper);
      if (this.maxLage > 55 && !this.fehler) this.fehler = 'Oberkörper aufrechter, Brust raus';
      if (knie > 160) {
        const dauer = t - this.repStart;
        if (this.minKnie > 100) this.wertung(false, 'Tiefer in die Hocke, Oberschenkel waagrecht');
        else if (this.fehler) this.wertung(false, this.fehler);
        else if (dauer < 450) this.wertung(false, 'Zu schnell, sauber ausführen');
        else this.wertung(true, 'Sauber!');
        this.phase = 'oben';
      }
      return this;
    }
    plank(t, dt, arm, koerper, lage, durchhang, knie) {
      let fehler = null;
      if (lage > 35) fehler = 'Runter in die Plank, Körper waagrecht';
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
  async function erkennerLaden() {
    if (K.pl) return K.pl;
    const v = await import(VISION + '/vision_bundle.mjs');
    const dateien = await v.FilesetResolver.forVisionTasks(VISION + '/wasm');
    const opt = d => ({ baseOptions: { modelAssetPath: MODELL, delegate: d }, runningMode: 'VIDEO', numPoses: 1,
      minPoseDetectionConfidence: 0.6, minPosePresenceConfidence: 0.6, minTrackingConfidence: 0.6 });
    try { K.pl = await v.PoseLandmarker.createFromOptions(dateien, opt('GPU')); }
    catch (err) { K.pl = await v.PoseLandmarker.createFromOptions(dateien, opt('CPU')); }
    return K.pl;
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
    try { r = K.pl.detectForVideo(v, jetzt); } catch (err) { return; }
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
      const [x, y] = P(i); g.fillStyle = '#FFFFFF'; g.strokeStyle = '#2B2826'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke();
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
        `<button data-uebung="${id}">${ui.rahmen(300, 74, 14, 61 + k, '#fff')}<b>${u.name}</b><span>${id === 'plank' ? 'Länger halten gewinnt' : '60 Sekunden'}<br><small>Sieg ca. +30 Pokale</small></span></button>`).join('')}</div>`);
    document.querySelectorAll('[data-uebung]').forEach(b => b.onclick = () => aufbau(b.dataset.uebung));
  }

  // Kamera an, Körper prüfen, dann Gegner suchen. Die Kamera bleibt bis zum Ergebnis an.
  async function aufbau(uebung) {
    const ui = A();
    D = { uebung, id: null, phase: 'aufbau', bereit: 0, stand: null, t0: 0, startAt: 0, gemeldet: 0, fertig: false, gesagt: {}, seite: 'a' };
    D.z = new Zaehler(uebung); K.zaehler = D.z;
    ui.zeigeBlatt(`
      <div class="kr-kamera" id="krKamera"><video playsinline muted></video><canvas></canvas>
        <div class="kr-uhr" id="krUhr"></div><div class="kr-zahl" id="krZahl"></div><div class="kr-mitte" id="krMitte"></div>
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
    info(`<div class="kr-kurz"><b>${u.name}</b><p>${u.aufbau}</p>
      <div class="kr-reihe"><button class="ar-knopf leise" data-ende>Abbrechen</button><button class="ar-knopf" id="krSuchen" ${D.bereit >= 1 ? '' : 'disabled'}>Gegner suchen</button></div></div>`);
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
      const z = new Zaehler(D.uebung); z.schritt(lm, welt, t, asp);
      const erkannt = lm && !/Ganzer Körper|sehe dich nicht/.test(z.hinweis);
      D.bereit = erkannt ? Math.min(1, D.bereit + 0.04) : Math.max(0, D.bereit - 0.08);
      const c = document.getElementById('krCheck');
      if (c) { c.textContent = D.bereit >= 1 ? 'Ganzer Körper erkannt. Passt!' : erkannt ? 'Gut, kurz so bleiben…' : z.hinweis; c.dataset.ok = D.bereit >= 1 ? '1' : ''; }
      const b = document.getElementById('krSuchen'); if (b) b.disabled = D.bereit < 1;
      hinweis(D.bereit >= 1 ? 'Passt! Du kannst starten' : erkannt ? 'Gut, kurz so bleiben' : (lm ? z.hinweis : 'Ganzer Körper ins Bild'), D.bereit >= 1 ? 'ok' : erkannt ? 'warn' : '');
      return;
    }
    if (D.fertig) return;
    const z = D.z; z.schritt(lm, welt, t, asp);
    if (z.ereignis === 'wdh') { window.Klang && Klang.effekt('wdh', z.wert); const zz = document.getElementById('krZahl'); if (zz) { zz.classList.remove('pop'); void zz.offsetWidth; zz.classList.add('pop'); } }
    if (z.ereignis === 'fehler') { K.fehlerFarbe = performance.now(); window.Klang && Klang.effekt('fehler'); }
    if (z.ereignis === 'sekunde' && z.wert % 10 === 0) window.Klang && Klang.effekt('wdh', z.wert / 10);
    if (z.ereignis === 'vorbei') { window.Klang && Klang.effekt('countdown'); satzEnde(); }
    hinweis(z.hinweis, z.ereignis === 'fehler' ? 'fehler' : z.gueltig ? 'ok' : 'warn');
    const zahl = document.getElementById('krZahl'); if (zahl) zahl.textContent = z.wert;
  }

  async function suchen() {
    const ui = A();
    try { D.id = await ui.wf().rpc('wf_kraft_suchen', ui.mit({ p_uebung: D.uebung })); }
    catch (err) { return toast(err.message); }
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
    if (s.status === 'suche' && !D.gefragt && Date.now() - D.t0 > 15000) {
      D.gefragt = true;
      ui.wf().rpc('wf_kraft_aufzeichnung', ui.mit({ p_duell: D.id })).then(abfragen).catch(() => { if (D) D.gefragt = false; });
    }
    if (s.status === 'bereit' && s.start_in != null && !D.startAt) D.startAt = Date.now() + s.start_in * 1000;
    if (s.status === 'fertig' || s.status === 'abgebrochen') return ergebnis(s);
  }
  const gName = (s, seite) => s.aufzeichnung ? (s.geist_name === 'Trainingsgeist' ? 'Trainingspartner' : s.geist_name) : (seite === 'a' ? s.b_name : s.a_name);
  const gegnerName = s => gName(s, D.seite);
  const gegnerWert = s => s.aufzeichnung ? (s.geist_wert || 0) : (D.seite === 'a' ? s.b_wert : s.a_wert);
  const gegnerFertig = s => s.aufzeichnung ? s.geist_fertig : (D.seite === 'a' ? (s.b_fertig || s.b_auf) : (s.a_fertig || s.a_auf));

  function uhr() {
    if (!D) return;
    const ui = A(), u = UEB[D.uebung], s = D.stand;
    if (D.phase === 'suche' && (!s || s.status === 'suche')) {
      const sek = Math.floor((Date.now() - D.t0) / 1000);
      mitte('');
      info(`<div class="kr-kurz"><b>Suche Gegner${'.'.repeat(1 + sek % 3)}</b><p>${u.name} · ${sek} s · bleib in Position</p>
        <div class="kr-reihe"><button class="ar-knopf leise" id="krAufgeben">Abbrechen</button></div></div>`);
      return;
    }
    if (s && s.status === 'bereit' && D.startAt && D.phase !== 'satz' && D.phase !== 'warten') {
      const rest = Math.ceil((D.startAt - Date.now()) / 1000);
      if (rest > 0) {
        if (D.phase !== 'countdown') { D.phase = 'countdown'; }
        if (rest <= 3 && !D.gesagt[rest]) { D.gesagt[rest] = 1; window.Klang && Klang.effekt('countdown'); }
        if (D.phase === 'countdown' && !D.gefundenTon) { D.gefundenTon = true; window.Klang && Klang.effekt('gefunden'); }
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
    D = null; K.aufFrame = null; kameraAus(); store.set('wf-kraft', null);
    A().schliessen();
  }
  async function ergebnis(s, aufgabeDelta) {
    const ui = A(), war = D;
    if (!war) return;
    clearInterval(war.uhr); clearInterval(war.poll);
    D = null; K.aufFrame = null; kameraAus(); store.set('wf-kraft', null);
    if (s && s.status === 'abgebrochen') return ui.schliessen();
    const u = UEB[war.uebung], F = ui.F();
    const vorher = F.coins; await ui.figurLaden(); const coins = Math.max(0, ui.F().coins - vorher);
    let titel, delta, text = '', anim;
    if (aufgabeDelta != null) { titel = 'Aufgegeben'; delta = aufgabeDelta; anim = 'traurig'; }
    else {
      const seite = war.seite, sieg = s.sieger === seite, remis = s.ergebnis === 'remis';
      delta = seite === 'a' ? s.a_delta : s.b_delta;
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
      ${text}<button class="ar-knopf breit" data-zu>Weiter</button>`, 'ergebnis', { aussehen: F.aussehen, anim, konfetti: titel === 'Gewonnen!' });
    ui.feiern(titel === 'Gewonnen!', delta || 0, coins);
    ui.nachDuell();
  }

  window.KraftUI = { battle, Zaehler, UEB, abbrechen, _test: { K, get D() { return D; }, suchen: () => suchen() } };
})();
