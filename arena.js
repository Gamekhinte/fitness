/* ================= WINTERFORM ARENA =================
   Startbildschirm aus Jeremos Skizze: Seil, Stickman, Pokale, Zahnrad, Arena-Karte, BATTLE.
   Alle Zeichnungen sind aus dem Foto der Skizze freigestellt (Ordner arena/).

   Ranked-Rennen über 1, 3 oder 10 km. Es werden nur Meter und Sekunden an den Server geschickt,
   nie ein Standort. Findet sich kein Gegner, läuft man gegen den gespeicherten Lauf eines anderen
   Spielers mit ähnlich vielen Pokalen. Läuft nach crew.js und nutzt window.WF (Identität, rpc). */
(function () {
  const ARENEN = [
    { ab: 0, name: 'Schulhof', bild: 'arena/arena_schulhof.svg' },
    { ab: 300, name: 'Stadtpark' }, { ab: 600, name: 'Eisbahn' }, { ab: 1000, name: 'Skipiste' },
    { ab: 1400, name: 'Gletscher' }, { ab: 1800, name: 'Polarnacht' }, { ab: 2300, name: 'Gipfel' }
  ];
  const KLASSEN = [[1000, '1 km', 'Sprint'], [3000, '3 km', 'Mittel'], [10000, '10 km', 'Lang']];
  const e = s => esc(s);
  const wf = () => window.WF;
  const ich = () => wf() && wf().ich();
  const mit = a => Object.assign({ p_id: ich().id, p_geheim: ich().geheim }, a);
  let pokale = store.get('wf-pokale', 0);
  let profilDaten = null;

  const arenaZu = p => { let i = 0; ARENEN.forEach((a, k) => { if (p >= a.ab) i = k; }); return i; };
  const zeit = s => s == null ? '–' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const meter = m => m >= 1000 ? (m / 1000).toFixed(2).replace('.', ',') + ' km' : Math.round(m) + ' m';

  /* ---------- Bleistift-Rahmen (wackelige Linie wie von Hand) ---------- */
  function wackelPfad(w, h, r, saat, schwanz) {
    let s = saat;
    const z = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
    const p = [];
    const ecke = (cx, cy, a0) => { for (let k = 0; k <= 3; k++) { const a = (a0 + k * 30) * Math.PI / 180; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    const linie = (x0, y0, x1, y1) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 22)); for (let k = 1; k < n; k++) p.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]); };
    ecke(r, r, 180); linie(r, 0, w - r, 0);
    ecke(w - r, r, 270); linie(w, r, w, h - r);
    ecke(w - r, h - r, 0);
    if (schwanz) { linie(w - r, h, w * 0.32, h); p.push([w * 0.32, h], [w * 0.1, h + 18], [w * 0.2, h]); linie(w * 0.2, h, r, h); }
    else linie(w - r, h, r, h);
    ecke(r, h - r, 90); linie(0, h - r, 0, r);
    const q = p.map(([x, y]) => [x + z() * 1.3, y + z() * 1.3]);
    let d = `M${q[0][0].toFixed(1)} ${q[0][1].toFixed(1)}`;
    for (let k = 1; k < q.length; k++) { const m = [(q[k - 1][0] + q[k][0]) / 2, (q[k - 1][1] + q[k][1]) / 2]; d += ` Q${q[k - 1][0].toFixed(1)} ${q[k - 1][1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`; }
    return d + ' Z';
  }
  function rahmen(w, h, r, saat, schwanz, farbe) {
    const d = wackelPfad(w, h, r, saat, schwanz);
    return `<svg class="ar-rand" viewBox="-4 -4 ${w + 8} ${h + (schwanz ? 28 : 10)}" preserveAspectRatio="none" aria-hidden="true">
      <path class="schatten" d="${d}" transform="translate(0 4)"/><path d="${d}" style="fill:${farbe || 'var(--papier)'}"/></svg>`;
  }

  /* ---------- Oberfläche ---------- */
  const tab = document.createElement('section');
  tab.id = 'tab-arena'; tab.className = 'tab';
  tab.innerHTML = `
    <div class="ar-buehne">
      <button class="ar-seil" data-profil aria-label="Profil öffnen"><img src="arena/seil.svg" alt=""></button>
      <div class="ar-chip">${rahmen(150, 52, 14, 3, false, '#fff')}<img src="arena/pokal.svg" alt="Pokale"><b id="arPokale">0</b></div>
      <button class="ar-zahn" id="arZahn" aria-label="Einstellungen">${rahmen(60, 60, 14, 5, false, '#fff')}<img src="arena/zahnrad.svg" alt=""></button>
      <button class="ar-schild" data-profil aria-label="Profil öffnen">${rahmen(96, 40, 10, 13, false, '#fff')}<span id="arHi">Profil</span></button>
      <div class="ar-karte">
        <div class="ar-3d" id="ar3d"><img id="arBild" src="arena/arena_schulhof.svg" alt=""></div>
        <p id="arName"></p>
        <div class="ar-weg"><i id="arWeg"></i></div>
        <small id="arWegText"></small>
      </div>
      <button class="ar-battle" id="arBattle" aria-label="Battle starten">
        ${rahmen(260, 74, 18, 9, false, 'var(--marker)')}<span>BATTLE</span>
      </button>
    </div>`;
  document.querySelector('main').appendChild(tab);

  const blatt = document.createElement('div');
  blatt.className = 'ar-blatt'; blatt.hidden = true;
  blatt.innerHTML = '<div class="ar-blatt-in" id="arBlatt"></div>';
  document.body.appendChild(blatt);
  const zeigeBlatt = html => { $('arBlatt').innerHTML = html; blatt.hidden = false; blatt.scrollTop = 0; };
  const schliessen = () => { blatt.hidden = true; };
  blatt.addEventListener('click', ev => { if (ev.target === blatt && !R) schliessen(); });

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

  /* ---------- Startbildschirm füllen ---------- */
  function zeichnen() {
    const i = arenaZu(pokale), a = ARENEN[i], n = ARENEN[i + 1];
    $('arPokale').textContent = pokale;
    $('arName').textContent = `Arena ${i + 1} · ${a.name}`;
    $('arBild').src = a.bild || ARENEN[0].bild;
    if (window.Arena3D) Arena3D.zeigen($('ar3d'), i);
    $('arWeg').style.width = n ? Math.min(100, (pokale - a.ab) / (n.ab - a.ab) * 100) + '%' : '100%';
    $('arWegText').textContent = n ? `noch ${n.ab - pokale} Pokale bis ${n.name}` : 'Letzte Arena erreicht';
    $('arHi').textContent = ich() ? ich().name : 'Profil';
    profilLaden();
  }
  async function profilLaden() {
    if (!ich()) return;
    try {
      profilDaten = await wf().rpc('wf_profil', { p_spieler: ich().id });
      if (profilDaten && profilDaten.pokale !== pokale) { pokale = profilDaten.pokale; store.set('wf-pokale', pokale); zeichnen(); }
    } catch (err) { /* offline: alter Stand bleibt */ }
  }

  /* ---------- Profil (Seil oder Namensschild antippen) ---------- */
  function profil() {
    const p = profilDaten || { pokale, max_pokale: pokale, siege: 0, niederlagen: 0 };
    const i = arenaZu(p.pokale);
    zeigeBlatt(`
      <button class="ar-zu" data-zu aria-label="Schließen">×</button>
      <div class="ar-kopf"><img src="arena/mann_offen.png" alt=""><div>
        ${ich() ? `<h2>${e(ich().name)}</h2>` : '<h2>Neu hier</h2>'}
        <p>Arena ${i + 1} · ${ARENEN[i].name}${p.platz ? ` · Platz ${p.platz}` : ''}</p></div></div>
      ${ich() ? '' : `<p class="ar-hand">Wie sollen dich die anderen sehen? Kein echter Name.</p>
        <div class="ar-zeile"><input id="arNameIn" maxlength="20" placeholder="Spitzname" autocomplete="off"><button class="ar-knopf" id="arNameOk">Los</button></div>`}
      <div class="ar-werte">
        <div>${rahmen(100, 70, 12, 21)}<b>${p.pokale}</b><span>Pokale</span></div>
        <div>${rahmen(100, 70, 12, 23)}<b>${p.siege}</b><span>Siege</span></div>
        <div>${rahmen(100, 70, 12, 25)}<b>${p.niederlagen}</b><span>Niederlagen</span></div>
      </div>
      <h3 class="ar-h">Bestzeiten</h3>
      <ul class="ar-liste">${KLASSEN.map(([m, l]) => `<li><span>${l}</span><b>${zeit(p['best_' + m])}</b></li>`).join('')}</ul>
      <h3 class="ar-h">Arenen</h3>
      <ul class="ar-liste stufen">${ARENEN.map((a, k) => `<li class="${p.pokale >= a.ab ? 'an' : ''}"><span>${k + 1}. ${a.name}</span><b>${a.ab}</b></li>`).join('')}</ul>
      <button class="ar-knopf breit" id="arKoerper">Größe, Gewicht und Ziel ändern</button>`);
    const ok = $('arNameOk');
    if (ok && ok.addEventListener) ok.onclick = async () => {
      const n = $('arNameIn').value.trim();
      if (n.length < 2) return toast('Mindestens 2 Zeichen');
      try { await wf().registrieren(n); toast('Gespeichert'); await profilLaden(); zeichnen(); profil(); }
      catch (err) { toast(err.message); }
    };
    $('arKoerper').onclick = () => { schliessen(); openProfile(); };
  }
  tab.querySelectorAll('[data-profil]').forEach(b => b.onclick = profil);
  $('arZahn').onclick = () => openProfile();
  blatt.addEventListener('click', ev => { if (ev.target.closest('[data-zu]')) schliessen(); });

  /* ---------- BATTLE: Klasse wählen, Gegner suchen, rennen ---------- */
  let R = null;
  $('arBattle').onclick = () => {
    if (!ich()) { profil(); return toast('Erst Spitznamen eintragen'); }
    zeigeBlatt(`
      <button class="ar-zu" data-zu aria-label="Schließen">×</button>
      <h2 class="ar-titel">Welche Strecke?</h2>
      <p class="ar-hand">Du läufst draußen, wo du willst. Dein Gegner sieht nur deine Meter, nie wo du bist.</p>
      <div class="ar-klassen">${KLASSEN.map(([m, l, t], k) =>
        `<button data-klasse="${m}">${rahmen(300, 74, 14, 31 + k)}<b>${l}</b><span>${t}</span></button>`).join('')}</div>`);
    $('arBlatt').querySelectorAll('[data-klasse]').forEach(b => b.onclick = () => suchen(+b.dataset.klasse));
  };

  async function suchen(klasse) {
    try {
      const id = await wf().rpc('wf_rennen_suchen', mit({ p_klasse: klasse }));
      starten(id, klasse);
    } catch (err) { toast(err.message); }
  }
  function starten(id, klasse) {
    R = { id, klasse, t0: Date.now(), gefragt: false, startAt: 0, los: false, gemeldet: 0, gegnerStufe: 0, stand: null };
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
      if (rest <= 0 && !R.los) {
        R.los = true;
        if (!runOn) toggleRun();
      }
      if (R.los && Date.now() - R.gemeldet > 4000) {
        R.gemeldet = Date.now();
        wf().rpc('wf_rennen_meter', mit({ p_rennen: R.id, p_meter: Math.round(runMeters) })).catch(() => {});
      }
    }
    malen();
  }

  const gegnerMeter = s => s.aufzeichnung ? (s.geist_m || 0) : (R.seite === 'a' ? s.b_m : s.a_m);
  const gegnerName = (s, seite = R && R.seite) => s.aufzeichnung ? (s.geist_name === 'Trainingsgeist' ? 'Pace-Läufer' : s.geist_name) : (seite === 'a' ? s.b_name : s.a_name);
  const gegnerPokale = s => s.aufzeichnung ? s.geist_pokale : (R.seite === 'a' ? s.b_pokale : s.a_pokale);

  function bahn(name, m, klasse, ich) {
    const x = Math.min(100, m / klasse * 100);
    return `<div class="ar-bahn${ich ? ' ich' : ''}"><div class="ar-bahn-kopf"><span>${e(name)}</span><b>${meter(m)}</b></div>
      <div class="ar-strecke">${rahmen(300, 24, 10, ich ? 41 : 43)}<i style="width:${x}%"></i>
      <img src="arena/mann_offen.png" style="left:${x}%" alt=""></div></div>`;
  }

  function malen() {
    if (!R) return;
    const s = R.stand, k = KLASSEN.find(x => x[0] === R.klasse);
    const aufgeben = '<button class="ar-knopf leise" id="arAufgeben">Aufgeben</button>';
    let html;
    if (!s || s.status === 'suche') {
      const sek = Math.floor((Date.now() - R.t0) / 1000);
      html = `<h2 class="ar-titel">Suche Gegner</h2><p class="ar-hand gross">${k[1]} · ${sek} s</p>
        <p class="ar-hand">Jemand mit ungefähr ${pokale} Pokalen</p>
        <button class="ar-knopf leise" id="arAufgeben">Abbrechen</button>`;
    } else if (!R.los) {
      const rest = R.startAt ? Math.max(0, Math.ceil((R.startAt - Date.now()) / 1000)) : '';
      html = `<h2 class="ar-titel">Gegner gefunden</h2>
        <div class="ar-gegner">${rahmen(300, 90, 16, 51)}<b>${e(gegnerName(s) || '')}</b><span>${gegnerPokale(s) ?? 0} Pokale</span></div>
        <p class="ar-hand">${k[1]}. Geh raus, GPS an, Handy in die Tasche.</p>
        <p class="ar-countdown">${rest}</p>${aufgeben}`;
    } else {
      const sek = Math.max(0, Math.floor((Date.now() - R.startAt) / 1000));
      html = `<h2 class="ar-titel">${k[1]} · ${zeit(sek)}</h2>
        ${bahn('Du', Math.min(runMeters, R.klasse), R.klasse, true)}
        ${bahn(gegnerName(s) || 'Gegner', gegnerMeter(s), R.klasse, false)}
        <p class="ar-hand">Lass die App offen. Bei jedem Meilenstein vom Gegner sag ich Bescheid.</p>${aufgeben}`;
    }
    zeigeBlatt(html);
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
    zeigeBlatt(`
      <button class="ar-zu" data-zu aria-label="Schließen">×</button>
      <h2 class="ar-titel">${ungueltig ? 'Zählt nicht' : sieg ? 'Gewonnen' : 'Verloren'}</h2>
      <img class="ar-ergebnis-mann" src="arena/mann_offen.png" alt="">
      ${ungueltig ? '<p class="ar-hand">Das war schneller als ein Mensch läuft. Fahrrad oder Auto? Keine Pokale.</p>'
        : `<p class="ar-delta">${delta > 0 ? '+' : ''}${delta || 0}<img src="arena/pokal.svg" alt="Pokale"></p>`}
      <ul class="ar-liste"><li><span>Deine Zeit</span><b>${meineZeit ? zeit(meineZeit) : 'nicht fertig'}</b></li>
        <li><span>Gegner</span><b>${e(gegnerName(s, seite) || '')}</b></li></ul>
      <button class="ar-knopf breit" data-zu>Weiter</button>`);
    say(ungueltig ? 'Das Rennen zählt nicht.' : sieg ? `Gewonnen. Plus ${delta} Pokale.` : `Verloren. ${delta} Pokale.`, true);
    profilLaden().then(zeichnen);
  }

  // Ein laufendes Rennen nach dem Neuladen wieder aufnehmen
  const offen = store.get('wf-rennen', null);
  if (offen && ich()) wf().rpc('wf_rennen_stand', { p_rennen: offen }).then(s => {
    if (s && (s.status === 'suche' || s.status === 'bereit')) { starten(s.id, s.klasse); }
    else store.set('wf-rennen', null);
  }).catch(() => {});

  // Startbildschirm ist die Arena, außer ein Einladungslink will woandershin
  const q = new URLSearchParams(location.search);
  if (!q.get('crew') && !q.get('duell') && !q.get('match')) showTab('arena');
  else { zeichnen(); }
})();
