/* ================= WINTERFORM ARENA =================
   Startbildschirm: Insel an Seilen (arena3d.js) mit deiner Figur, Coins, Pokale, Einstellungen, BATTLE.
   Charakter-Editor und Shop (figur.js), Coins und Käufe prüft der Server (wf_figur_*, wf_kaufen).

   Ranked-Rennen über 1, 3 oder 10 km. Es werden nur Meter und Sekunden an den Server geschickt,
   nie ein Standort. Findet sich kein Gegner, läuft man gegen den gespeicherten Lauf eines anderen
   Spielers mit ähnlich vielen Pokalen. Suche, Gegner, Rennen und Ergebnis zeigen beide Figuren in 3D.
   Läuft nach crew.js und nutzt window.WF (Identität, rpc). */
(function () {
  const ARENEN = [
    { ab: 0, name: 'Schulhof', bild: 'arena/arena_schulhof.svg' }, { ab: 300, name: 'Stadtpark' }, { ab: 600, name: 'Strand' },
    { ab: 1000, name: 'Wald-Trail' }, { ab: 1400, name: 'Stadion' }, { ab: 1800, name: 'Dächer' }, { ab: 2300, name: 'Canyon' },
    { ab: 2800, name: 'Vulkan' }, { ab: 3400, name: 'Bergdorf' }, { ab: 4000, name: 'Mondbasis' }
  ];
  const KLASSEN = [[1000, '1 km', 'Sprint'], [3000, '3 km', 'Mittel'], [10000, '10 km', 'Lang']];
  const TIPPS = ['Locker loslaufen, die ersten 200 m entscheiden nichts.', 'Handy in die Tasche, Bildschirm bleibt an.',
    'Bei jedem Meilenstein vom Gegner sag ich Bescheid.', 'Sieg bringt Pokale und 25 Coins, Niederlage immerhin 8 Coins.',
    'Mit Coins kaufst du Skins und Animationen für deine Figur.', 'Schneller als Fahrrad zählt nicht, also wirklich laufen.'];
  const e = s => esc(s);
  const wf = () => window.WF;
  const ich = () => wf() && wf().ich();
  const mit = a => Object.assign({ p_id: ich().id, p_geheim: ich().geheim }, a);
  let pokale = store.get('wf-pokale', 0);
  let profilDaten = null;
  let F = store.get('wf-figur', null) || { aussehen: Figur.STANDARD, coins: 150, besitz: [] };
  F.aussehen = Figur.pruefen(F.aussehen);

  const arenaZu = p => { let i = 0; ARENEN.forEach((a, k) => { if (p >= a.ab) i = k; }); return i; };
  const zeit = s => s == null ? '–' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const meter = m => m >= 1000 ? (m / 1000).toFixed(2).replace('.', ',') + ' km' : Math.round(m) + ' m';
  const coin = '<img class="ar-coin" src="arena/coin.svg" alt="Coins">';

  /* ---------- Handgezeichneter Rahmen ---------- */
  function wackelPfad(w, h, r, saat) {
    let s = saat;
    const z = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
    const p = [];
    const ecke = (cx, cy, a0) => { for (let k = 0; k <= 3; k++) { const a = (a0 + k * 30) * Math.PI / 180; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    const linie = (x0, y0, x1, y1) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 22)); for (let k = 1; k < n; k++) p.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]); };
    ecke(r, r, 180); linie(r, 0, w - r, 0); ecke(w - r, r, 270); linie(w, r, w, h - r);
    ecke(w - r, h - r, 0); linie(w - r, h, r, h); ecke(r, h - r, 90); linie(0, h - r, 0, r);
    const q = p.map(([x, y]) => [x + z() * 1.3, y + z() * 1.3]);
    let d = `M${q[0][0].toFixed(1)} ${q[0][1].toFixed(1)}`;
    for (let k = 1; k < q.length; k++) { const m = [(q[k - 1][0] + q[k][0]) / 2, (q[k - 1][1] + q[k][1]) / 2]; d += ` Q${q[k - 1][0].toFixed(1)} ${q[k - 1][1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`; }
    return d + ' Z';
  }
  function rahmen(w, h, r, saat, farbe) {
    const d = wackelPfad(w, h, r, saat);
    return `<svg class="ar-rand" viewBox="-4 -4 ${w + 8} ${h + 10}" preserveAspectRatio="none" aria-hidden="true">
      <path class="schatten" d="${d}" transform="translate(0 4)"/><path d="${d}" style="fill:${farbe || 'var(--papier)'}"/></svg>`;
  }

  /* ---------- Startbildschirm ---------- */
  const tab = document.createElement('section');
  tab.id = 'tab-arena'; tab.className = 'tab';
  tab.innerHTML = `
    <div class="ar-buehne">
      <div class="ar-oben">
        <button class="ar-chip" id="arCoins" aria-label="Shop und Charakter">${rahmen(120, 48, 14, 7, '#fff')}${coin}<b id="arCoinZahl">0</b></button>
        <button class="ar-chip" data-profil aria-label="Profil öffnen">${rahmen(120, 48, 14, 3, '#fff')}<img src="arena/pokal.svg" alt="Pokale"><b id="arPokale">0</b></button>
        <button class="ar-zahn" id="arZahn" aria-label="Einstellungen">${rahmen(60, 60, 14, 5, '#fff')}<img src="arena/zahnrad.svg" alt=""></button>
      </div>
      <div class="ar-3d" id="ar3d"><img id="arBild" src="arena/arena_schulhof.svg" alt=""></div>
      <div class="ar-unten">
        <button class="ar-name" id="arName"></button>
        <div class="ar-weg"><i id="arWeg"></i></div>
        <small id="arWegText"></small>
      </div>
      <button class="ar-battle" id="arBattle" aria-label="Battle starten">${rahmen(260, 72, 18, 9, 'var(--marker)')}<span>BATTLE</span></button>
    </div>`;
  document.querySelector('main').appendChild(tab);

  /* ---------- Blatt (Fenster) mit optionaler 3D-Bühne oben ---------- */
  const blatt = document.createElement('div');
  blatt.className = 'ar-blatt'; blatt.hidden = true;
  blatt.innerHTML = '<div class="ar-blatt-in" id="arBlattIn"><div class="ar-b3d" id="arB3d"></div><div id="arBlatt"></div></div>';
  document.body.appendChild(blatt);
  function zeigeBlatt(html, modus3d, opt, bleiben) {
    const y = blatt.scrollTop;
    $('arBlatt').innerHTML = html;
    blatt.hidden = false;
    blatt.scrollTop = bleiben ? y : 0;
    $('arBlattIn').classList.toggle('mit3d', !!modus3d);
    $('arBlattIn').dataset.modus = modus3d || '';
    if (window.Arena3D) Arena3D.pause(true);
    if (modus3d) b3(modus3d, opt || {});
  }
  const schliessen = () => {
    blatt.hidden = true; E = null;
    if (window.Arena3D) Arena3D.pause(false);
  };
  blatt.addEventListener('click', ev => {
    if (ev.target.closest('[data-zu]')) schliessen();
    else if (ev.target === blatt && !R) schliessen();
  });

  /* ---------- Navigation: Heute, Training, Arena (Mitte), Crew, Coach ---------- */
  const nav = document.querySelector('.nav');
  const lauf = nav.querySelector('[data-tab="lung"]'); if (lauf) lauf.remove();
  const ak = document.createElement('button');
  ak.dataset.tab = 'arena'; ak.className = 'mitte'; ak.textContent = 'Arena';
  nav.insertBefore(ak, nav.querySelector('[data-tab="crew"]') || nav.querySelector('[data-tab="coach"]'));
  ak.onclick = () => showTab('arena');
  const ICONS = { today: 'heute', catalog: 'training', arena: 'arena', crew: 'crew', coach: 'coach' };
  nav.querySelectorAll('button').forEach(b => {
    const n = ICONS[b.dataset.tab]; if (!n) return;
    const alt = b.querySelector('svg'); if (alt) alt.remove();
    b.insertAdjacentHTML('afterbegin', `<span class="ar-icon" style="--bild:url(arena/nav_${n}.svg)"></span>`);
  });
  TABORDER.splice(0, TABORDER.length, 'today', 'catalog', 'arena', 'crew', 'coach');

  const altShow = showTab;
  showTab = function (t) {
    altShow(t);
    document.body.classList.toggle('papier', t === 'arena'); document.documentElement.classList.toggle('papier', t === 'arena');
    if (t === 'arena') zeichnen();
  };

  function zeichnen() {
    const i = arenaZu(pokale), a = ARENEN[i], n = ARENEN[i + 1];
    $('arPokale').textContent = pokale;
    $('arCoinZahl').textContent = F.coins;
    $('arName').textContent = `Arena ${i + 1} · ${a.name}`;
    if (window.Arena3D) {
      Arena3D.figur(F.aussehen);
      Arena3D.zeigen($('ar3d'), i, was => was === 'figur' ? editor() : arenaWeg());
    }
    $('arWeg').style.width = n ? Math.min(100, (pokale - a.ab) / (n.ab - a.ab) * 100) + '%' : '100%';
    $('arWegText').textContent = n ? `noch ${n.ab - pokale} Pokale bis ${n.name}` : 'Letzte Arena erreicht';
    profilLaden();
  }
  async function profilLaden() {
    if (!ich()) return;
    try {
      profilDaten = await wf().rpc('wf_profil', { p_spieler: ich().id });
      if (profilDaten && profilDaten.pokale !== pokale) { pokale = profilDaten.pokale; store.set('wf-pokale', pokale); zeichnen(); }
    } catch (err) { /* offline: alter Stand bleibt */ }
  }
  // Figur, Coins und Besitz vom Server. Hat der Server noch keine Figur, wird die vom Gerät hochgeladen.
  async function figurLaden() {
    if (!ich()) return;
    try {
      const r = await wf().rpc('wf_figur_holen', { p_spieler: ich().id });
      if (!r) return;
      const leer = !r.aussehen || !Object.keys(r.aussehen).length;
      F = { aussehen: leer ? F.aussehen : Figur.pruefen(r.aussehen), coins: r.coins, besitz: r.besitz || [] };
      store.set('wf-figur', F);
      if (leer) wf().rpc('wf_figur_speichern', mit({ p_aussehen: F.aussehen })).catch(() => {});
      $('arCoinZahl').textContent = F.coins;
      if (window.Arena3D) Arena3D.figur(F.aussehen);
    } catch (err) { /* offline */ }
  }

  /* ---------- 3D-Bühne im Fenster: Podest, Gegenüberstellung, Rennbahn ---------- */
  const B3 = { b: null, gruppe: null, modus: null, opt: {}, setzen: null, tick: null, dreh: 0 };
  async function b3(modus, opt) {
    if (!window.WF3D) return;
    try { await WF3D.laden(); } catch (err) { return; }
    const W = WF3D, T = W.T, el = $('arB3d');
    if (!B3.b) {
      B3.b = W.buehne(el);
      let zieh = null;
      el.addEventListener('pointerdown', ev => { zieh = { x: ev.clientX, d: B3.dreh }; el.setPointerCapture(ev.pointerId); });
      el.addEventListener('pointermove', ev => { if (zieh) B3.dreh = zieh.d + (ev.clientX - zieh.x) * 0.012; });
      el.addEventListener('pointerup', () => { zieh = null; });
      B3.b.jeBild = (dt, t) => { if (B3.tick) B3.tick(dt, t); };
    }
    if (B3.modus === modus && B3.gruppe) { B3.opt = opt; if (B3.setzen) B3.setzen(opt); return; }
    B3.modus = modus; B3.opt = opt; B3.dreh = 0; B3.setzen = null; B3.tick = null;
    if (B3.gruppe) B3.b.szene.remove(B3.gruppe);
    const g = B3.gruppe = new T.Group(); B3.b.szene.add(g);
    if (modus === 'bahn') bahnBauen(g, T, W); else podestBauen(g, modus, T, W);
    B3.b.groesse();
  }

  function podest(g, x, T, W) {
    const p = new T.Group(); p.position.x = x; g.add(p);
    p.add(W.teil(W.rohr(0.95, 0.24, 32), '#FFFFFF', 0, -0.12, 0, 0.05));
    p.add(W.teil(W.rohr(0.85, 0.4, 32, 0.55), '#9C7448', 0, -0.44, 0, 0.05));
    return p;
  }
  function podestBauen(g, modus, T, W) {
    const k = B3.b.kamera, zwei = modus === 'vs';
    const plaetze = zwei ? [-1.45, 1.45] : [0];
    const figs = plaetze.map(x => ({ p: podest(g, x, T, W), f: null, aussehen: null }));
    const setzen = opt => {
      const looks = zwei ? [opt.ich, opt.gegner] : [opt.aussehen];
      figs.forEach((s, i) => {
        const json = JSON.stringify(looks[i] || {});
        if (s.aussehen === json) return;
        if (s.f) s.p.remove(s.f);
        s.f = Figur.bauen(looks[i]); s.f.scale.setScalar(zwei ? 0.8 : 0.95); s.p.add(s.f); s.aussehen = json;
      });
    };
    setzen(B3.opt); B3.setzen = setzen;
    // Suche: Ringe, die sich ausbreiten. Ergebnis bei Sieg: Konfetti
    const ringe = modus === 'suche' ? [0, 1, 2].map(() => { const r = new T.Mesh(new T.TorusGeometry(1, 0.03, 6, 40), new T.MeshBasicMaterial({ color: 0x2B2826, transparent: true })); r.rotation.x = Math.PI / 2; g.add(r); return r; }) : [];
    const konfetti = [];
    if (modus === 'ergebnis' && B3.opt.konfetti) {
      const farben = ['#D9643A', '#3FA9E6', '#F2C14E', '#3E7A55', '#E86AA6'];
      for (let i = 0; i < 60; i++) { const m = new T.Mesh(W.box(0.09, 0.02, 0.06), W.mat(farben[i % 5], { side: T.DoubleSide })); m.position.set((Math.random() - 0.5) * 4, 2 + Math.random() * 4, (Math.random() - 0.5) * 2); m.userData.v = 0.6 + Math.random() * 0.8; m.userData.w = Math.random() * 6; g.add(m); konfetti.push(m); }
    }
    B3.b.beiGroesse = (w, h) => {
      const breit = zwei ? 6.4 : 4.2, weit = Math.max(1, (breit / 6.4) * 0.9 / (w / h) * (zwei ? 1.6 : 1.1));
      k.position.set(0, 1.7 * weit + 0.5, 6.4 * weit); k.lookAt(0, 1.15, 0);
    };
    B3.tick = (dt, t) => {
      const o = B3.opt;
      figs.forEach((s, i) => {
        if (!s.f) return;
        const anim = zwei ? (i ? 'idle' : 'winken') : o.anim || (modus === 'suche' ? 'dehnen' : 'idle');
        Figur.haltung(s.f, anim, t + i * 0.7);
        const basis = zwei ? (i ? -0.5 : 0.5) : 0.25;
        s.p.rotation.y = basis + (zwei ? 0 : B3.dreh + (modus === 'suche' ? Math.sin(t * 0.4) * 0.5 : 0));
      });
      ringe.forEach((r, i) => { const p = (t * 0.5 + i / 3) % 1; r.scale.setScalar(1.2 + p * 2.2); r.material.opacity = 0.6 * (1 - p); r.position.y = -0.02; });
      konfetti.forEach(m => { m.position.y -= m.userData.v * dt; m.rotation.x += dt * 3; m.rotation.z += dt * m.userData.w; if (m.position.y < -0.5) m.position.y = 5; });
    };
  }

  // Rennbahn: du bist immer in der Mitte, der Gegner vor oder hinter dir. 1 m sind 0,25 Einheiten.
  function bahnBauen(g, T, W) {
    const k = B3.b.kamera, M = 0.25, P = 10;
    const welt = new T.Group(); g.add(welt);
    g.add(W.teil(W.box(80, 0.2, 3.2), '#D9643A', 0, -0.1, 0, 0.04));
    g.add(W.teil(W.box(80, 0.18, 4), '#8CC084', 0, -0.12, 3.6, 0)); g.add(W.teil(W.box(80, 0.18, 4), '#8CC084', 0, -0.12, -3.6, 0));
    const weiss = new T.MeshBasicMaterial({ color: 0xffffff });
    [-1.55, 0, 1.55].forEach(z => { const l = new T.Mesh(W.box(80, 0.02, 0.06), weiss); l.position.set(0, 0.01, z); g.add(l); });
    for (let x = -40; x <= 40; x += P) {
      const q = new T.Mesh(W.box(0.12, 0.02, 3.1), weiss); q.position.set(x, 0.015, 0); welt.add(q);
      const baum = new T.Group(); baum.position.set(x + 4, 0, -3.4); welt.add(baum);
      baum.add(W.teil(W.rohr(0.1, 0.5, 6), '#6B4A2E', 0, 0.25, 0, 0.02)); baum.add(W.teil(W.kegel(0.6, 1.1, 8), '#3E7A55', 0, 0.95, 0, 0.04)); baum.add(W.teil(W.kegel(0.45, 0.8, 8), '#3E7A55', 0, 1.45, 0, 0.04));
      const fahne = W.teil(W.box(0.05, 1.1, 0.05), '#2B2826', x + 7, 0.55, 2.0, 0.015); welt.add(fahne);
      welt.add(W.teil(W.box(0.5, 0.3, 0.03), ['#3FA9E6', '#F2C14E', '#D9643A'][(x / P + 40) % 3], x + 7.25, 0.95, 2.0, 0.015));
    }
    const ziel = new T.Group(); g.add(ziel);
    [-1.7, 1.7].forEach(z => ziel.add(W.teil(W.rohr(0.06, 2.4, 8), '#2B2826', 0, 1.2, z, 0.015)));
    ziel.add(W.teil(W.box(0.1, 0.45, 3.5), '#FFFFFF', 0, 2.3, 0, 0.03));
    for (let i = 0; i < 7; i++) ziel.add(W.teil(W.box(0.11, 0.22, 0.5), '#2B2826', 0, 2.3 + (i % 2 ? 0.11 : -0.11), -1.5 + i * 0.5, 0));
    const ichF = { f: null, aussehen: null }, gegF = { f: null, aussehen: null };
    const anz = { mm: 0, gm: 0 };
    B3.setzen = opt => {
      [[ichF, opt.ich, -0.75], [gegF, opt.gegner, 0.75]].forEach(([s, look, z]) => {
        const json = JSON.stringify(look || {}); if (s.aussehen === json) return;
        if (s.f) g.remove(s.f);
        s.f = Figur.bauen(look); s.f.scale.setScalar(0.55); s.f.rotation.y = Math.PI / 2; s.f.position.z = z; g.add(s.f); s.aussehen = json;
      });
    };
    B3.setzen(B3.opt);
    B3.b.beiGroesse = (w, h) => { const weit = Math.max(1, 1.3 / (w / h)); k.position.set(0.5 * weit, 4.6 * weit, 10.5 * weit); k.lookAt(0.8, 0.4, 0); };
    B3.tick = (dt, t) => {
      const o = B3.opt; if (!ichF.f) return;
      anz.mm += ((o.mm || 0) - anz.mm) * Math.min(1, dt * 1.5);
      anz.gm += ((o.gm || 0) - anz.gm) * Math.min(1, dt * 1.5);
      welt.position.x = -((anz.mm * M) % P);
      ichF.f.position.x = 0;
      if (gegF.f) { const d = (anz.gm - anz.mm) * M; gegF.f.position.x = Math.max(-7, Math.min(12, d)); gegF.f.visible = d > -7 && d < 12; }
      const zielX = ((o.klasse || 1000) - anz.mm) * M; ziel.position.x = zielX; ziel.visible = zielX < 30;
      Figur.haltung(ichF.f, (o.tempoIch || 0) > 0.4 ? 'laufen' : 'idle', t, Math.min(1.4, 0.6 + (o.tempoIch || 0) / 4));
      if (gegF.f) Figur.haltung(gegF.f, (o.tempoGegner || 0) > 0.4 ? 'laufen' : 'idle', t + 0.4, Math.min(1.4, 0.6 + (o.tempoGegner || 0) / 4));
    };
  }

  /* ---------- Profil (Pokale antippen) ---------- */
  function profil() {
    const p = profilDaten || { pokale, max_pokale: pokale, siege: 0, niederlagen: 0 };
    const i = arenaZu(p.pokale);
    zeigeBlatt(`
      <button class="ar-zu" data-zu aria-label="Schließen">×</button>
      ${ich() ? `<h2>${e(ich().name)}</h2>` : '<h2>Neu hier</h2>'}
      <p class="ar-hand">Arena ${i + 1} · ${ARENEN[i].name}${p.platz ? ` · Platz ${p.platz}` : ''}</p>
      <button class="ar-knopf breit" id="arZumEditor">Charakter bearbeiten</button>
      ${ich() ? '' : `<p class="ar-hand">Wie sollen dich die anderen sehen? Kein echter Name.</p>
        <div class="ar-zeile"><input id="arNameIn" maxlength="20" placeholder="Spitzname" autocomplete="off"><button class="ar-knopf" id="arNameOk">Los</button></div>`}
      <div class="ar-werte">
        <div>${rahmen(100, 70, 12, 21)}<b>${p.pokale}</b><span>Pokale</span></div>
        <div>${rahmen(100, 70, 12, 23)}<b>${p.siege}</b><span>Siege</span></div>
        <div>${rahmen(100, 70, 12, 25)}<b>${F.coins}</b><span>Coins</span></div>
      </div>
      <h3 class="ar-h">Bestzeiten</h3>
      <ul class="ar-liste">${KLASSEN.map(([m, l]) => `<li><span>${l}</span><b>${zeit(p['best_' + m])}</b></li>`).join('')}</ul>
      <button class="ar-knopf breit leise2" id="arKoerper">Größe, Gewicht und Ziel ändern</button>`, 'profil', { aussehen: F.aussehen });
    const ok = $('arNameOk');
    if (ok && ok.addEventListener) ok.onclick = async () => {
      const n = $('arNameIn').value.trim();
      if (n.length < 2) return toast('Mindestens 2 Zeichen');
      try { await wf().registrieren(n); toast('Gespeichert'); await profilLaden(); await figurLaden(); zeichnen(); profil(); }
      catch (err) { toast(err.message); }
    };
    $('arZumEditor').onclick = () => editor();
    $('arKoerper').onclick = () => { schliessen(); openProfile(); };
  }
  tab.querySelectorAll('[data-profil]').forEach(b => b.onclick = profil);
  $('arName').onclick = () => arenaWeg();
  $('arZahn').onclick = () => openProfile();
  $('arCoins').onclick = () => editor('skins');

  /* ---------- Charakter-Editor und Shop ---------- */
  const REITER = [['gesicht', 'Gesicht'], ['haare', 'Haare'], ['kleidung', 'Kleidung'], ['extras', 'Extras'], ['skins', 'Skins'], ['emotes', 'Animationen']];
  let E = null;
  const besitzt = (kat, id) => !Figur.preis(kat, id) || F.besitz.includes(kat + ':' + id);
  function gesperrt(a) {
    return ['kopf', 'extra', 'skin', 'emote'].filter(k => !besitzt(k, a[k]))
      .map(k => ({ kat: k, id: a[k], name: (Figur.KATALOG[k].find(x => x[0] === a[k]) || [])[1], preis: Figur.preis(k, a[k]) }));
  }
  function editor(reiter) {
    E = { a: Object.assign({}, F.aussehen), reiter: reiter || 'gesicht' };
    editorMalen(false);
  }
  function editorMalen(bleiben) {
    const K = Figur.KATALOG, a = E.a;
    const farbe = (feld, liste, titel) => `<h3 class="ar-h">${titel}</h3><div class="ar-farben">${liste.map(c =>
      `<button data-feld="${feld}" data-wert="${c}" class="${a[feld] === c ? 'an' : ''}" style="background:${c}" aria-label="${titel}"></button>`).join('')}</div>`;
    const wahl = (feld, liste, titel) => `<h3 class="ar-h">${titel}</h3><div class="ar-wahl">${liste.map(([id, name, preis]) => {
      const hab = besitzt(feld, id);
      return `<button data-feld="${feld}" data-wert="${id}" class="${a[feld] === id ? 'an' : ''}${hab ? '' : ' zu'}">${name}${hab ? '' : `<small>${coin}${preis}</small>`}</button>`;
    }).join('')}</div>`;
    const inhalt = {
      gesicht: () => farbe('haut', K.haut, 'Hautfarbe') + wahl('augen', K.augen, 'Augen') + wahl('brauen', K.brauen, 'Augenbrauen') + wahl('mund', K.mund, 'Mund') + wahl('gesicht', K.gesicht, 'Im Gesicht'),
      haare: () => wahl('haare', K.haare, 'Frisur') + farbe('haarfarbe', K.haarfarbe, 'Haarfarbe'),
      kleidung: () => farbe('oberteil', K.farben, 'Oberteil') + farbe('hose', K.hosen, 'Hose') + farbe('schuhe', K.schuhe, 'Schuhe'),
      extras: () => wahl('kopf', K.kopf, 'Auf dem Kopf') + wahl('extra', K.extra, 'Extra'),
      skins: () => '<p class="ar-hand">Ein Skin ersetzt Kleidung und Kopf. Gesicht bleibt deins.</p>' + wahl('skin', K.skin, 'Skins'),
      emotes: () => '<p class="ar-hand">Deine Figur zeigt sie auf der Insel und nach jedem Sieg.</p>' + wahl('emote', K.emote, 'Animationen')
    }[E.reiter]();
    const zu = gesperrt(a);
    zeigeBlatt(`
      <button class="ar-zu" data-zu aria-label="Schließen">×</button>
      <div class="ar-coinzeile">${coin}<b>${F.coins}</b><span>Coins</span></div>
      <div class="ar-reiter">${REITER.map(([id, n]) => `<button data-reiter="${id}" class="${E.reiter === id ? 'an' : ''}">${n}</button>`).join('')}</div>
      ${inhalt}
      <div class="ar-fuss">
        ${zu.length ? `<button class="ar-knopf breit gold" id="arKaufen">${e(zu[0].name)} kaufen · ${zu[0].preis} ${coin}</button>` : ''}
        <button class="ar-knopf breit" id="arFigurOk">${zu.length ? 'Erst kaufen, dann speichern' : 'Speichern'}</button>
      </div>`, 'editor', { aussehen: a, anim: E.reiter === 'emotes' ? a.emote : 'idle' }, bleiben);
    $('arBlatt').querySelectorAll('[data-feld]').forEach(b => b.onclick = () => { E.a[b.dataset.feld] = b.dataset.wert; editorMalen(true); });
    $('arBlatt').querySelectorAll('[data-reiter]').forEach(b => b.onclick = () => { E.reiter = b.dataset.reiter; editorMalen(true); });
    const kauf = $('arKaufen');
    if (kauf && kauf.addEventListener) kauf.onclick = () => kaufen(zu[0]);
    $('arFigurOk').onclick = speichern;
  }
  async function kaufen(teil) {
    if (!ich()) { toast('Erst Spitznamen eintragen, dann kannst du kaufen'); return profil(); }
    if (F.coins < teil.preis) return toast(`Dir fehlen ${teil.preis - F.coins} Coins. Rennen und Training bringen welche.`);
    try {
      const r = await wf().rpc('wf_kaufen', mit({ p_item: teil.kat + ':' + teil.id }));
      F.coins = r.coins; F.besitz = r.besitz || []; store.set('wf-figur', F);
      $('arCoinZahl').textContent = F.coins;
      toast(`${teil.name} gehört jetzt dir`);
      editorMalen(true);
    } catch (err) { toast(err.message); }
  }
  async function speichern() {
    if (gesperrt(E.a).length) return toast('Erst kaufen');
    F.aussehen = Figur.pruefen(E.a); store.set('wf-figur', F);
    if (window.Arena3D) Arena3D.figur(F.aussehen);
    if (ich()) { try { await wf().rpc('wf_figur_speichern', mit({ p_aussehen: F.aussehen })); } catch (err) { return toast(err.message); } }
    toast('Gespeichert'); schliessen();
  }

  /* ---------- Arena-Weg ---------- */
  function arenaWeg() {
    const jetzt = arenaZu(pokale);
    zeigeBlatt(`
      <button class="ar-zu" data-zu aria-label="Schließen">×</button>
      <h2 class="ar-titel">Arenen</h2>
      <p class="ar-hand">Gewinn Rennen, sammel Pokale, schalte neue Arenen frei.</p>
      <div class="ar-wegliste">${ARENEN.map((a, k) => {
        const offen = pokale >= a.ab, hier = k === jetzt;
        return `<div class="ar-station${offen ? ' offen' : ''}${hier ? ' hier' : ''}" id="arSt${k}">
          <div class="ar-st-bild"><img data-nr="${k}" alt=""></div>
          <div class="ar-st-text"><small>Arena ${k + 1}</small><b>${a.name}</b>
            <span><img src="arena/pokal.svg" alt="">${a.ab}</span>
            <em>${hier ? 'Hier bist du' : offen ? 'Freigeschaltet' : `noch ${a.ab - pokale} Pokale`}</em></div></div>`;
      }).join('')}</div>`);
    const ziel = $('arSt' + jetzt); if (ziel && ziel.scrollIntoView) setTimeout(() => ziel.scrollIntoView({ block: 'center' }), 50);
    if (!window.Arena3D) return;
    (async () => {
      for (const img of $('arBlatt').querySelectorAll('img[data-nr]')) {
        try { img.src = await Arena3D.bild(+img.dataset.nr); } catch (err) { img.src = ARENEN[0].bild; }
        await new Promise(r => setTimeout(r, 30));
      }
    })();
  }

  /* ---------- BATTLE: Klasse wählen, Gegner suchen, rennen ---------- */
  let R = null;
  $('arBattle').onclick = () => {
    if (!ich()) { profil(); return toast('Erst Spitznamen eintragen'); }
    zeigeBlatt(`
      <button class="ar-zu" data-zu aria-label="Schließen">×</button>
      <h2 class="ar-titel">Welche Strecke?</h2>
      <p class="ar-hand">Du läufst draußen, wo du willst. Dein Gegner sieht nur deine Meter, nie wo du bist.</p>
      <div class="ar-klassen">${KLASSEN.map(([m, l, t], k) =>
        `<button data-klasse="${m}">${rahmen(300, 74, 14, 31 + k, '#fff')}<b>${l}</b><span>${t}</span></button>`).join('')}</div>
      <p class="ar-hand klein">Wichtig: draußen laufen, App offen lassen, Bildschirm bleibt an.</p>`);
    $('arBlatt').querySelectorAll('[data-klasse]').forEach(b => b.onclick = () => suchen(+b.dataset.klasse));
  };

  async function suchen(klasse) {
    try { starten(await wf().rpc('wf_rennen_suchen', mit({ p_klasse: klasse })), klasse); }
    catch (err) { toast(err.message); }
  }
  function starten(id, klasse) {
    R = { id, klasse, t0: Date.now(), gefragt: false, startAt: 0, los: false, gemeldet: 0, gegnerStufe: 0, stand: null,
      gesagt: {}, tempoIch: 0, tempoGegner: 0, letzt: { m: 0, g: 0, t: Date.now() } };
    store.set('wf-rennen', id);
    malen();
    clearInterval(starten.uhr); clearInterval(starten.poll);
    starten.uhr = setInterval(uhr, 1000);
    starten.poll = setInterval(abfragen, 2000);
    abfragen();
  }

  async function abfragen() {
    if (!R) return;
    let s;
    try { s = await wf().rpc('wf_rennen_stand', { p_rennen: R.id }); } catch (err) { return; }
    if (!s || !R || s.id !== R.id) return;
    R.stand = s;
    R.seite = s.a === ich().id ? 'a' : 'b';
    if (s.status === 'suche' && !R.gefragt && Date.now() - R.t0 > 20000) {
      R.gefragt = true;
      wf().rpc('wf_rennen_aufzeichnung', mit({ p_rennen: R.id })).then(abfragen).catch(() => { R && (R.gefragt = false); });
    }
    if (s.status === 'bereit' && s.start_in != null && !R.startAt) R.startAt = Date.now() + s.start_in * 1000;
    if (s.status === 'bereit' && R.los) {
      const g = gegnerMeter(s), stufe = R.klasse <= 1000 ? 500 : 1000;
      const st = Math.floor(g / stufe);
      if (st > R.gegnerStufe && g < R.klasse) { R.gegnerStufe = st; say(`${gegnerName(s)} hat ${meter(st * stufe).replace(',00', '')} geschafft`, true); }
    }
    if (s.status === 'fertig' || s.status === 'abgebrochen') return beenden(s);
    malen();
  }
  function uhr() {
    if (!R || !R.stand) return;
    const s = R.stand;
    if (s.status === 'bereit' && R.startAt) {
      const rest = Math.ceil((R.startAt - Date.now()) / 1000);
      if (rest >= 1 && rest <= 3 && !R.gesagt[rest]) { R.gesagt[rest] = 1; say(String(rest), true); }
      if (rest <= 0 && !R.los) { R.los = true; say('Los!', true); if (!runOn) toggleRun(); }
      if (R.los) {
        const jetzt = Date.now(), dt = (jetzt - R.letzt.t) / 1000;
        if (dt >= 2) {
          const g = gegnerMeter(s);
          R.tempoIch = Math.max(0, (runMeters - R.letzt.m) / dt); R.tempoGegner = Math.max(0, (g - R.letzt.g) / dt);
          R.letzt = { m: runMeters, g, t: jetzt };
        }
        if (jetzt - R.gemeldet > 4000) {
          R.gemeldet = jetzt;
          wf().rpc('wf_rennen_meter', mit({ p_rennen: R.id, p_meter: Math.round(runMeters) })).catch(() => {});
        }
      }
    }
    malen();
  }

  const gegnerMeter = s => s.aufzeichnung ? (s.geist_m || 0) : (R.seite === 'a' ? s.b_m : s.a_m);
  const gegnerName = (s, seite = R && R.seite) => s.aufzeichnung ? (s.geist_name === 'Trainingsgeist' ? 'Pace-Läufer' : s.geist_name) : (seite === 'a' ? s.b_name : s.a_name);
  const gegnerPokale = s => s.aufzeichnung ? s.geist_pokale : (R.seite === 'a' ? s.b_pokale : s.a_pokale);
  const PACE_LOOK = { haut: '#D19F74', haare: 'stachel', haarfarbe: '#2B2826', augen: 'froh', mund: 'grinsen', oberteil: '#F2C14E', hose: '#2F4A7A', schuhe: '#D9643A', kopf: 'stirnband' };
  function gegnerFigur(s, seite = R && R.seite) {
    const f = s.aufzeichnung ? s.geist_figur : (seite === 'a' ? s.b_figur : s.a_figur);
    return Figur.pruefen(f && Object.keys(f).length ? f : PACE_LOOK);
  }

  function malen() {
    if (!R) return;
    const s = R.stand, k = KLASSEN.find(x => x[0] === R.klasse);
    const aufgeben = '<button class="ar-knopf leise" id="arAufgeben">Aufgeben</button>';
    if (!s || s.status === 'suche') {
      const sek = Math.floor((Date.now() - R.t0) / 1000);
      zeigeBlatt(`<h2 class="ar-titel">Suche Gegner<span class="ar-punkte">${'.'.repeat(1 + sek % 3)}</span></h2>
        <p class="ar-hand gross">${k[1]} · ${sek} s</p>
        <div class="ar-einsatz"><span><img src="arena/pokal.svg" alt="">ca. +30</span><span>${coin}+25</span></div>
        <p class="ar-tipp">${TIPPS[Math.floor(sek / 5) % TIPPS.length]}</p>
        <button class="ar-knopf leise" id="arAufgeben">Abbrechen</button>`, 'suche', { aussehen: F.aussehen }, true);
    } else if (!R.los) {
      const rest = R.startAt ? Math.max(0, Math.ceil((R.startAt - Date.now()) / 1000)) : '';
      zeigeBlatt(`<div class="ar-vs"><div><b>${e(ich().name)}</b><span><img src="arena/pokal.svg" alt="">${pokale}</span></div><em>VS</em>
        <div><b>${e(gegnerName(s) || '')}</b><span><img src="arena/pokal.svg" alt="">${gegnerPokale(s) ?? 0}</span></div></div>
        <p class="ar-countdown">${rest}</p>
        <p class="ar-hand">${k[1]}. Geh raus, GPS an, Handy in die Tasche.</p>${aufgeben}`, 'vs', { ich: F.aussehen, gegner: gegnerFigur(s) }, true);
    } else {
      const sek = Math.max(0, Math.floor((Date.now() - R.startAt) / 1000));
      const mm = Math.min(runMeters, R.klasse), gm = gegnerMeter(s), d = Math.round(mm - gm);
      const abstand = Math.abs(d) < 3 ? 'Kopf an Kopf' : d > 0 ? `Du führst mit ${meter(d)}` : `${meter(-d)} hinter ${e(gegnerName(s))}`;
      const zeile = (name, m, ichs) => `<div class="ar-renn-zeile${ichs ? ' ich' : ''}"><span>${e(name)}</span><div class="ar-mini"><i style="width:${Math.min(100, m / R.klasse * 100)}%"></i></div><b>${meter(m)}</b></div>`;
      zeigeBlatt(`<div class="ar-hud"><p class="ar-uhr">${zeit(sek)}</p><p class="ar-abstand${d >= 3 ? ' vorne' : d <= -3 ? ' hinten' : ''}">${abstand}</p>
        ${zeile('Du', mm, true)}${zeile(gegnerName(s) || 'Gegner', gm, false)}
        <p class="ar-hand klein">${k[1]} · noch ${meter(Math.max(0, R.klasse - mm))}</p></div>${aufgeben}`,
        'bahn', { ich: F.aussehen, gegner: gegnerFigur(s), mm, gm, klasse: R.klasse, tempoIch: R.tempoIch, tempoGegner: R.tempoGegner }, true);
    }
    const ab = $('arAufgeben');
    if (ab && ab.addEventListener) ab.onclick = async () => {
      if (R.los && !confirm('Wirklich aufgeben? Das zählt als Niederlage.')) return;
      try { await wf().rpc('wf_rennen_aufgeben', mit({ p_rennen: R.id })); } catch (err) {}
      abfragen();
    };
  }

  function beenden(s) {
    clearInterval(starten.uhr); clearInterval(starten.poll);
    store.set('wf-rennen', null);
    const war = R; R = null;
    if (runOn) toggleRun();
    if (s.status === 'abgebrochen') { schliessen(); return; }
    const seite = war.seite, sieg = s.sieger === seite;
    const delta = seite === 'a' ? s.a_delta : s.b_delta, meineZeit = seite === 'a' ? s.a_zeit : s.b_zeit;
    const ungueltig = s.ergebnis === 'ungueltig';
    const coins = ungueltig ? 0 : sieg ? 25 : 8;
    zeigeBlatt(`
      <button class="ar-zu" data-zu aria-label="Schließen">×</button>
      <h2 class="ar-titel">${ungueltig ? 'Zählt nicht' : sieg ? 'Gewonnen' : 'Verloren'}</h2>
      ${ungueltig ? '<p class="ar-hand">Das war schneller als ein Mensch läuft. Fahrrad oder Auto? Keine Pokale.</p>'
        : `<div class="ar-beute"><span><img src="arena/pokal.svg" alt="">${delta > 0 ? '+' : ''}${delta || 0}</span><span>${coin}+${coins}</span></div>`}
      <ul class="ar-liste"><li><span>Deine Zeit</span><b>${meineZeit ? zeit(meineZeit) : 'nicht fertig'}</b></li>
        <li><span>Gegner</span><b>${e(gegnerName(s, seite) || '')}</b></li></ul>
      <button class="ar-knopf breit" data-zu>Weiter</button>`, 'ergebnis',
      { aussehen: F.aussehen, anim: ungueltig ? 'idle' : sieg ? F.aussehen.emote : 'traurig', konfetti: sieg && !ungueltig });
    say(ungueltig ? 'Das Rennen zählt nicht.' : sieg ? `Gewonnen. Plus ${delta} Pokale.` : `Verloren. ${delta} Pokale.`, true);
    profilLaden().then(zeichnen); figurLaden();
  }

  // Ein laufendes Rennen nach dem Neuladen wieder aufnehmen
  const offen = store.get('wf-rennen', null);
  if (offen && ich()) wf().rpc('wf_rennen_stand', { p_rennen: offen }).then(s => {
    if (s && (s.status === 'suche' || s.status === 'bereit')) starten(s.id, s.klasse);
    else store.set('wf-rennen', null);
  }).catch(() => {});

  figurLaden();
  const q = new URLSearchParams(location.search);
  if (!q.get('crew') && !q.get('duell') && !q.get('match')) showTab('arena');
  else zeichnen();

  // für Tests
  window.ArenaUI = { editor, profil, arenaWeg, F: () => F };
})();
