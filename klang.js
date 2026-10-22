/* ================= WINTERFORM KLANG =================
   Alle Sounds und die Arena-Musik werden live mit der Web-Audio-API erzeugt (keine Dateien, keine Stimmen).
   Musik: Menü-Marsch (überall in der App) und ein schnellerer Runden-Track für Rennen und Duelle.
   Effekte: tipp, wdh (wird mit jeder Wiederholung höher), fehler, countdown, los, gefunden, sieg, niederlage,
   muenze, pokal, meilenstein, plumps, kauf. Musik: fröhlicher Marsch in C-Dur, 8 Takte in Schleife.
   Browser erlauben Ton erst nach dem ersten Antippen, deshalb startet alles beim ersten Touch. */
(function () {
  let ctx = null, master = null, musikGain = null, effektBus = null, hall = null;
  const zustand = { lautMusik: store.get('wf-laut-musik', 0.7), lautEffekte: store.get('wf-laut-effekte', 0.9), musik: true, effekte: true, spielt: false, gewuenscht: false, timer: null, schritt: 0, naechste: 0, titel: 'menue' };

  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9;
    const komp = ctx.createDynamicsCompressor(); komp.threshold.value = -14; komp.ratio.value = 4;
    master.connect(komp); komp.connect(ctx.destination);
    musikGain = ctx.createGain(); musikGain.gain.value = 0.0001; musikGain.connect(master);
    effektBus = ctx.createGain(); effektBus.gain.value = zustand.lautEffekte; effektBus.connect(master);
    // kleiner Hall aus Rauschen für mehr Raum
    hall = ctx.createConvolver(); const len = ctx.sampleRate * 1.2, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    hall.buffer = buf; const hg = ctx.createGain(); hg.gain.value = 0.18; hall.connect(hg); hg.connect(master);
    return true;
  }
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => window.addEventListener(ev, () => { start(); setTimeout(spielen, 50); }, { passive: true }));

  /* ---------- Bausteine ---------- */
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);          // MIDI-Note zu Hertz
  function ton(t, { f = 440, f2, dauer = 0.2, typ = 'sine', laut = 0.3, an = 0.005, ziel = effektBus, filter, q = 1, hallAnteil = 0, detune = 0 }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = typ; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dauer);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(laut, t + an); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    let kette = o;
    if (filter) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(filter, t); fl.frequency.exponentialRampToValueAtTime(Math.max(200, filter / 4), t + dauer); fl.Q.value = q; o.connect(fl); kette = fl; }
    kette.connect(g); g.connect(ziel); if (hallAnteil) { const h = ctx.createGain(); h.gain.value = hallAnteil; g.connect(h); h.connect(hall); }
    o.start(t); o.stop(t + dauer + 0.05);
  }
  function rauschen(t, { dauer = 0.1, laut = 0.2, band = 3000, q = 1, ziel = effektBus, typ = 'bandpass', an = 0.003 }) {
    const len = Math.ceil(ctx.sampleRate * dauer), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const fl = ctx.createBiquadFilter(); fl.type = typ; fl.frequency.value = band; fl.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(laut, t + an); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    s.connect(fl); fl.connect(g); g.connect(ziel); s.start(t);
  }
  // Blechbläser-artiger Akkordton (mehrere leicht verstimmte Sägezähne durch Tiefpass)
  function blech(t, noten, dauer, laut = 0.12, ziel = effektBus) {
    noten.forEach(n => [-7, 7].forEach(dt => ton(t, { f: hz(n), dauer, typ: 'sawtooth', laut: laut / noten.length, an: 0.03, filter: 2600, q: 0.8, ziel, hallAnteil: 0.6, detune: dt })));
  }

  /* ---------- Effekte ---------- */
  const DUR = [0, 2, 4, 5, 7, 9, 11, 12];
  const EFFEKTE = {
    tipp(t) { ton(t, { f: 700, f2: 1100, dauer: 0.07, laut: 0.12 }); },
    wdh(t, n = 1) {   // jede Wiederholung einen Ton höher, alle 5 ein Extra-Funkeln
      const stufe = (n - 1) % 8, okt = Math.floor((n - 1) / 8) % 2, note = 72 + DUR[stufe] + okt * 12;
      ton(t, { f: hz(note), dauer: 0.35, typ: 'triangle', laut: 0.35, hallAnteil: 0.5 });
      ton(t, { f: hz(note + 12), dauer: 0.25, laut: 0.12 });
      rauschen(t, { dauer: 0.05, laut: 0.06, band: 7000, q: 2 });
      if (n % 5 === 0) [0, 4, 7, 12].forEach((s, i) => ton(t + 0.06 * i, { f: hz(note + 12 + s), dauer: 0.3, laut: 0.12, hallAnteil: 0.7 }));
    },
    fehler(t) { ton(t, { f: 180, f2: 110, dauer: 0.22, typ: 'square', laut: 0.16, filter: 900 }); ton(t + 0.12, { f: 140, f2: 90, dauer: 0.22, typ: 'square', laut: 0.12, filter: 700 }); },
    countdown(t) { ton(t, { f: 880, dauer: 0.18, typ: 'square', laut: 0.14, filter: 3000 }); },
    los(t) { blech(t, [60, 64, 67, 72], 0.7, 0.28); rauschen(t, { dauer: 0.5, laut: 0.12, band: 1200, q: 0.5 }); ton(t, { f: 55, f2: 40, dauer: 0.4, laut: 0.4 }); },
    gefunden(t) { rauschen(t, { dauer: 0.45, laut: 0.12, band: 800, q: 0.7, an: 0.3 }); [60, 64, 67].forEach((n, i) => blech(t + 0.35 + i * 0.09, [n, n + 12], 0.3, 0.16)); },
    sieg(t) {
      // Fanfare + Jubel aus Rauschen
      const folge = [[0, [60, 64, 67]], [0.16, [62, 65, 69]], [0.32, [64, 67, 72]], [0.5, [67, 72, 76]]];
      folge.forEach(([dt, n]) => blech(t + dt, n, 0.24, 0.3));
      blech(t + 0.72, [60, 64, 67, 72, 76], 1.6, 0.34);
      ton(t + 0.72, { f: hz(36), dauer: 1.2, typ: 'triangle', laut: 0.4 });
      [0, 0.32, 0.72].forEach(dt => { ton(t + dt, { f: 120, f2: 45, dauer: 0.3, laut: 0.5 }); rauschen(t + dt, { dauer: 0.18, laut: 0.18, band: 1800 }); });
      rauschen(t + 0.6, { dauer: 2.2, laut: 0.09, band: 1400, q: 0.4, an: 0.4 });
      for (let i = 0; i < 10; i++) ton(t + 0.8 + i * 0.07, { f: hz(84 + DUR[i % 8]), dauer: 0.25, laut: 0.07, hallAnteil: 0.8 });
    },
    niederlage(t) { [67, 65, 62, 58].forEach((n, i) => ton(t + i * 0.28, { f: hz(n), f2: hz(n) * (i === 3 ? 0.94 : 1), dauer: i === 3 ? 0.9 : 0.3, typ: 'sawtooth', laut: 0.14, filter: 1400, an: 0.03 })); },
    muenze(t) { ton(t, { f: 1975, dauer: 0.08, laut: 0.14 }); ton(t + 0.06, { f: 2637, dauer: 0.3, laut: 0.14, hallAnteil: 0.4 }); },
    pokal(t, n = 0) { ton(t, { f: 900 + n * 18, dauer: 0.06, typ: 'triangle', laut: 0.14 }); },
    meilenstein(t) { ton(t, { f: 660, dauer: 0.15, typ: 'square', laut: 0.13, filter: 2500 }); ton(t + 0.18, { f: 660, dauer: 0.15, typ: 'square', laut: 0.13, filter: 2500 }); },
    plumps(t, staerke = 1) { ton(t, { f: 140, f2: 50, dauer: 0.25, laut: 0.3 * staerke }); rauschen(t, { dauer: 0.35, laut: 0.1 * staerke, band: 2500, q: 0.6, typ: 'highpass' }); },
    kauf(t) { [0, 0.07, 0.14].forEach((dt, i) => EFFEKTE.muenze(t + dt * 1.5)); [72, 76, 79, 84].forEach((n, i) => ton(t + 0.25 + i * 0.07, { f: hz(n), dauer: 0.35, typ: 'triangle', laut: 0.16, hallAnteil: 0.6 })); }
  };
  function effekt(name, a) {
    if (window.Extras) Extras.haptik(name);
    if (zustand.lautEffekte <= 0.01 || !start() || !EFFEKTE[name]) return;
    EFFEKTE[name](ctx.currentTime + 0.01, a);
  }

  /* ---------- Musik: zwei Tracks, 8 Takte in Schleife ---------- */
  // Menü: fröhlicher Marsch in C-Dur, 112 BPM
  const AKKORDE = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50], [48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
  // Melodie: [Schritt im Takt, Note] pro Takt
  const MELODIE = [
    [[0, 72], [4, 76], [6, 79], [8, 76], [12, 72]], [[0, 69], [4, 72], [6, 76], [10, 74], [12, 72]],
    [[0, 77], [3, 76], [6, 74], [8, 72], [12, 74]], [[0, 74], [2, 76], [4, 79], [8, 74], [14, 71]],
    [[0, 72], [4, 76], [6, 79], [8, 84], [12, 79]], [[0, 81], [4, 79], [6, 76], [8, 72], [12, 76]],
    [[0, 77], [2, 79], [4, 81], [8, 79], [12, 77]], [[0, 76], [4, 74], [8, 71], [10, 74], [12, 79]]
  ];
  function takt(t, nr, s) {
    const ak = AKKORDE[nr], z = musikGain;
    if (s % 8 === 0) ton(t, { f: 110, f2: 45, dauer: 0.22, laut: 0.55, ziel: z });                 // Kick
    if (s % 8 === 4) { rauschen(t, { dauer: 0.14, laut: 0.22, band: 2200, q: 0.8, ziel: z }); ton(t, { f: 220, f2: 150, dauer: 0.08, typ: 'triangle', laut: 0.15, ziel: z }); }   // Snare
    if (s % 2 === 0) rauschen(t, { dauer: 0.03, laut: 0.05, band: 9000, q: 2, ziel: z });           // Hi-Hat
    if ([0, 3, 6, 8, 11, 14].includes(s)) ton(t, { f: hz(ak[0] - 12 + (s === 6 || s === 14 ? 7 : 0)), dauer: 0.22, typ: 'triangle', laut: 0.42, ziel: z });  // Bass
    if (s % 4 === 2) ak.forEach(n => ton(t, { f: hz(n + 12), dauer: 0.12, typ: 'square', laut: 0.045, filter: 1800, ziel: z }));   // Akkord-Stöße
    const m = MELODIE[nr].find(x => x[0] === s);
    if (m) { ton(t, { f: hz(m[1]), dauer: 0.32, typ: 'sawtooth', laut: 0.11, filter: 3200, an: 0.01, ziel: z, hallAnteil: 0.5, detune: -5 }); ton(t, { f: hz(m[1]), dauer: 0.32, typ: 'triangle', laut: 0.12, ziel: z, detune: 5 }); }
  }

  // Runde: treibender Track in A-Moll, 146 BPM, Kick auf jedem Schlag, Achtel-Bass, Arpeggio
  const AK2 = [[57, 60, 64], [57, 60, 64], [53, 57, 60], [53, 57, 60], [48, 52, 55], [48, 52, 55], [55, 59, 62], [55, 59, 62]];
  const WURZEL2 = [45, 45, 41, 41, 48, 48, 43, 43];
  const MEL2 = [
    [[0, 81], [3, 84], [6, 81], [10, 79], [12, 81]], [[0, 76], [3, 79], [6, 81], [10, 84], [14, 81]],
    [[0, 77], [3, 81], [6, 84], [10, 81], [12, 77]], [[0, 79], [4, 77], [8, 76], [12, 77]],
    [[0, 79], [3, 84], [6, 79], [10, 76], [12, 79]], [[0, 84], [4, 79], [8, 76], [12, 79]],
    [[0, 83], [3, 79], [6, 74], [10, 79], [12, 83]], [[0, 86], [4, 83], [8, 79], [10, 83], [12, 81], [14, 83]]
  ];
  function taktRunde(t, nr, s) {
    const ak = AK2[nr], z = musikGain;
    if (s % 4 === 0) ton(t, { f: 130, f2: 42, dauer: 0.2, laut: 0.6, ziel: z });                                  // Kick auf jedem Schlag
    if (s === 4 || s === 12) { rauschen(t, { dauer: 0.16, laut: 0.26, band: 2600, q: 0.7, ziel: z }); ton(t, { f: 240, f2: 160, dauer: 0.09, typ: 'triangle', laut: 0.16, ziel: z }); }   // Snare
    if (s % 4 === 2) rauschen(t, { dauer: 0.07, laut: 0.09, band: 8500, q: 1.5, ziel: z });                       // offene Hi-Hat zwischen den Kicks
    else if (s % 2 === 1) rauschen(t, { dauer: 0.02, laut: 0.035, band: 10000, q: 2, ziel: z });                  // 16tel-Tick
    if (s % 2 === 0) ton(t, { f: hz(WURZEL2[nr] + (s % 8 === 6 ? 12 : 0)), dauer: 0.16, typ: 'sawtooth', laut: 0.3, filter: 650, q: 2, ziel: z });   // Achtel-Bass
    if (s % 2 === 1 || s % 4 === 0) ton(t, { f: hz(ak[(s >> 1) % 3] + 12), dauer: 0.09, typ: 'square', laut: 0.04, filter: 2400, ziel: z });         // Arpeggio
    const m = MEL2[nr].find(x => x[0] === s);
    if (m) { ton(t, { f: hz(m[1]), dauer: 0.26, typ: 'sawtooth', laut: 0.1, filter: 3600, an: 0.008, ziel: z, hallAnteil: 0.4, detune: -6 }); ton(t, { f: hz(m[1]), dauer: 0.26, typ: 'square', laut: 0.05, filter: 2800, ziel: z, detune: 6 }); }
  }
  const TRACKS = { menue: { tempo: 112, fn: takt, pegel: 0.5 }, runde: { tempo: 146, fn: taktRunde, pegel: 0.36 } };
  const schrittDauer = () => 60 / TRACKS[zustand.titel].tempo / 4;       // 16tel
  function planen() {
    const tr = TRACKS[zustand.titel];
    while (zustand.naechste < ctx.currentTime + 0.15) {
      const s = zustand.schritt % 16, nr = Math.floor(zustand.schritt / 16) % 8;
      tr.fn(zustand.naechste, nr, s);
      zustand.naechste += schrittDauer(); zustand.schritt++;
    }
  }
  const pegel = () => TRACKS[zustand.titel].pegel * zustand.lautMusik;
  // spielen(): startet die Schleife, wenn erlaubt; stoppen(): hält sie an. gewuenscht = die Seite will gerade Musik.
  function spielen() {
    if (zustand.lautMusik <= 0.01 || !zustand.gewuenscht || zustand.spielt || document.hidden || !start() || ctx.state !== 'running') return;
    zustand.spielt = true; zustand.schritt = 0; zustand.naechste = ctx.currentTime + 0.1;
    musikGain.gain.cancelScheduledValues(ctx.currentTime); musikGain.gain.setValueAtTime(0.0001, ctx.currentTime); musikGain.gain.setTargetAtTime(pegel(), ctx.currentTime, 0.4);
    zustand.timer = setInterval(planen, 40);
  }
  function stoppen() {
    if (!zustand.spielt) return;
    zustand.spielt = false; clearInterval(zustand.timer);
    musikGain.gain.cancelScheduledValues(ctx.currentTime); musikGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
  }
  // Titel wechseln: kurz ausblenden, dann den neuen Track von vorn
  let wechsel = null;
  const musikAn = titel => {
    titel = TRACKS[titel] ? titel : 'menue';
    zustand.gewuenscht = true;
    if (titel !== zustand.titel) {
      const lief = zustand.spielt;
      stoppen(); zustand.titel = titel; clearTimeout(wechsel);
      if (lief) wechsel = setTimeout(spielen, 220); else spielen();
    } else spielen();
  };
  const musikAus = () => { zustand.gewuenscht = false; clearTimeout(wechsel); stoppen(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stoppen(); else spielen(); });

  window.Klang = {
    effekt, musik: (an, titel) => an ? musikAn(titel) : musikAus(), get titel() { return zustand.titel; }, get spielt() { return zustand.spielt; }, get gewuenscht() { return zustand.gewuenscht; },
    get musikAn() { return zustand.lautMusik > 0.01; },
    laut(art) { return art === 'musik' ? zustand.lautMusik : zustand.lautEffekte; },
    // Lautstärke 0 bis 1 setzen, 0 heißt aus
    setzeLaut(art, v) {
      v = Math.max(0, Math.min(1, v));
      if (art === 'musik') {
        zustand.lautMusik = v; store.set('wf-laut-musik', v);
        if (v <= 0.01) stoppen(); else if (zustand.spielt) musikGain.gain.setTargetAtTime(pegel(), ctx.currentTime, 0.1); else spielen();
      } else {
        zustand.lautEffekte = v; store.set('wf-laut-effekte', v);
        if (effektBus) effektBus.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
      }
    }
  };
})();
