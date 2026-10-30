/* ================= DEV-MENÜ =================
   Werkzeuge zum Testen, ohne am Code zu drehen. Nur für dich, normale Spieler sehen nichts davon.

   Einschalten: an die Adresse ?dev hängen (bleibt dann gespeichert), oder 7x schnell auf die Shop-Überschrift tippen.
   Dann sitzt links ein kleiner DEV-Knopf. Ausschalten geht unten im Menü oder mit ?dev=0.

   Alles hier läuft nur auf deinem Gerät. Coins oder Gems kann das Menü nicht verteilen, die prüft der Server.
   Läuft nach shop.js. */
(function () {
  const KEY = 'wf-dev', LOG_MAX = 60;
  const el = id => document.getElementById(id);
  const e = s => (typeof esc === 'function' ? esc(s) : String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]));

  /* ---------- Fehler mitschreiben (läuft immer, kostet nichts) ---------- */
  const log = [];
  const merken = (art, text) => { log.push({ zeit: new Date().toLocaleTimeString('de-DE'), art, text: String(text).slice(0, 400) }); if (log.length > LOG_MAX) log.shift(); if (offen) malen(); };
  addEventListener('error', ev => merken('Fehler', `${ev.message}${ev.filename ? ' (' + ev.filename.split('/').pop() + ':' + ev.lineno + ')' : ''}`));
  addEventListener('unhandledrejection', ev => merken('Promise', ev.reason && ev.reason.message || ev.reason));
  const altError = console.error.bind(console), altWarn = console.warn.bind(console);
  console.error = (...a) => { merken('console.error', a.map(x => x && x.message || (typeof x === 'object' ? JSON.stringify(x) : x)).join(' ')); altError(...a); };
  console.warn = (...a) => { merken('console.warn', a.join(' ')); altWarn(...a); };

  /* ---------- An und aus ---------- */
  const q = new URLSearchParams(location.search);
  if (q.has('dev')) localStorage.setItem(KEY, q.get('dev') === '0' ? '0' : '1');
  const an = () => localStorage.getItem(KEY) === '1';
  function schalten(wert) {
    localStorage.setItem(KEY, wert ? '1' : '0');
    knopfZeigen();
    toast(wert ? 'Dev-Modus an' : 'Dev-Modus aus');
    if (!wert) zu();
  }
  // 7x auf die Shop-Überschrift tippen
  let tipps = [];
  document.addEventListener('click', ev => {
    if (!ev.target.closest('.sh-kopf h2')) return;
    const jetzt = Date.now();
    tipps = tipps.filter(t => jetzt - t < 2500); tipps.push(jetzt);
    if (tipps.length >= 7) { tipps = []; schalten(!an()); }
  });

  /* ---------- Oberfläche ---------- */
  const knopf = document.createElement('button');
  knopf.className = 'dev-knopf'; knopf.type = 'button'; knopf.textContent = 'DEV'; knopf.setAttribute('aria-label', 'Dev-Menü öffnen');
  document.body.appendChild(knopf);
  const panel = document.createElement('div');
  panel.className = 'dev'; panel.hidden = true;
  document.body.appendChild(panel);
  function knopfZeigen() { knopf.hidden = !an(); }
  knopfZeigen();

  let offen = false, reiter = 'rad';
  const RAD = { id: 'klassisch', ergebnis: 'zufall', menge: 1 };
  function auf() { offen = true; panel.hidden = false; malen(); }
  function zu() { offen = false; panel.hidden = true; }
  knopf.onclick = () => (offen ? zu() : auf());

  const A = () => window.ArenaUI;
  const versionen = () => Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src')).filter(s => !/^https?:/.test(s)).map(s => s.replace('.js?v=', ' v')).join(', ');
  const SOUNDS = ['tipp', 'muenze', 'kauf', 'countdown', 'los', 'sieg', 'niederlage', 'fehler', 'gefunden', 'radTick', 'radStart', 'radZoom'];
  const tabs = () => Array.from(document.querySelectorAll('.nav [data-tab]')).map(b => [b.dataset.tab, (b.textContent || b.dataset.tab).trim()]);

  function inhalt() {
    if (reiter === 'rad') {
      const raeder = window.Shop ? Shop.RAEDER : ['klassisch'];
      const opt = (wert, text, akt) => `<option value="${wert}"${wert == akt ? ' selected' : ''}>${e(text)}</option>`;
      return `<p class="dev-hinweis">Spielt die komplette Rad-Show ab, ohne Server und ohne Coins. Nichts davon wird gespeichert.</p>
        <label class="dev-feld"><span>Rad</span><select data-rad="id">${raeder.map(id => opt(id, window.Shop ? Shop.radTitel(id) : id, RAD.id)).join('')}</select></label>
        <label class="dev-feld"><span>Ergebnis</span><select data-rad="ergebnis">${[['zufall', 'Zufall nach Chancen'], ['wunsch', 'Wunsch-Skin (neu)'], ['duplikat', 'Duplikat (500 Coins)'], ['coins', 'Höchste Coins'], ['gems', 'Gems']].map(([w, t]) => opt(w, t, RAD.ergebnis)).join('')}</select></label>
        <label class="dev-feld"><span>Anzahl</span><select data-rad="menge">${[1, 2, 3, 5].map(n => opt(n, 'x' + n, RAD.menge)).join('')}</select></label>
        <div class="dev-feld"><span>Tempo</span><div class="dev-reihe">${[[0.25, '0,25x'], [0.5, '0,5x'], [1, '1x'], [2, '2x'], [4, '4x']].map(([t, n]) => `<button data-dev="tempo" data-wert="${t}" class="${window.Shop && Shop.SHOW.tempo === t ? 'an' : ''}">${n}</button>`).join('')}</div></div>
        <button class="dev-gross" data-dev="radShow">Show starten</button>
        <button class="dev-leise" data-dev="radEcht">Echtes Rad öffnen (braucht Profil)</button>`;
    }
    if (reiter === 'status') {
      const ich = A() && A().ich(), F = A() && A().F();
      const sw = 'serviceWorker' in navigator ? (navigator.serviceWorker.controller ? 'aktiv' : 'nicht aktiv') : 'nicht verfügbar';
      const zeilen = [
        ['Profil', ich ? e(ich.name) : 'nicht eingeloggt'],
        ['Coins / Gems', F ? `${F.coins} / ${F.gems || 0}` : '?'],
        ['Teile im Besitz', F ? (F.besitz || []).length : '?'],
        ['Tab', typeof curTab !== 'undefined' ? e(curTab) : '?'],
        ['Bildschirm', `${innerWidth} x ${innerHeight}, DPR ${devicePixelRatio}`],
        ['Service Worker', sw],
        ['Installiert', matchMedia('(display-mode: standalone)').matches ? 'ja' : 'nein, im Browser'],
        ['Speicher', `${localStorage.length} Einträge`],
        ['Skripte', e(versionen())]
      ];
      return `<dl class="dev-liste">${zeilen.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
        <button class="dev-leise" data-dev="figur">Figur und Coins neu vom Server laden</button>`;
    }
    if (reiter === 'werkzeug') {
      return `<h4>Springen</h4><div class="dev-reihe">${tabs().map(([t, n]) => `<button data-dev="tab" data-wert="${e(t)}">${e(n)}</button>`).join('')}</div>
        <h4>Sounds</h4><div class="dev-reihe">${SOUNDS.map(s => `<button data-dev="sound" data-wert="${s}">${s}</button>`).join('')}</div>
        <h4>Oberfläche</h4><div class="dev-reihe">
          <button data-dev="toast">Toast</button><button data-dev="shop">Shop neu zeichnen</button><button data-dev="bilder">Bild-Cache leeren</button>
          <button data-dev="profil">Profil-Fenster</button><button data-dev="raster">Raster</button></div>
        <h4>App</h4><div class="dev-reihe">
          <button data-dev="neu">Cache leeren und neu laden</button></div>`;
    }
    return `<div class="dev-reihe"><button data-dev="logKopie">Kopieren</button><button data-dev="logLeer">Leeren</button><button data-dev="logTest">Testfehler</button></div>
      ${log.length ? `<ol class="dev-log">${log.slice().reverse().map(x => `<li><small>${x.zeit} · ${e(x.art)}</small>${e(x.text)}</li>`).join('')}</ol>` : '<p class="dev-hinweis">Keine Fehler bisher.</p>'}`;
  }
  function malen() {
    if (!offen) return;
    const scroll = panel.querySelector('.dev-inhalt') ? panel.querySelector('.dev-inhalt').scrollTop : 0;
    panel.innerHTML = `<div class="dev-in">
      <div class="dev-kopf"><b>Dev-Menü</b><button data-dev="zu" aria-label="Schließen">×</button></div>
      <div class="dev-reiter">${[['rad', 'Rad'], ['status', 'Status'], ['werkzeug', 'Werkzeug'], ['log', `Log${log.length ? ' (' + log.length + ')' : ''}`]].map(([r, n]) => `<button data-dev="reiter" data-wert="${r}" class="${r === reiter ? 'an' : ''}">${n}</button>`).join('')}</div>
      <div class="dev-inhalt">${inhalt()}</div>
      <button class="dev-aus" data-dev="aus">Dev-Modus ausschalten</button></div>`;
    panel.querySelector('.dev-inhalt').scrollTop = scroll;
  }

  panel.addEventListener('change', ev => {
    const s = ev.target.closest('[data-rad]'); if (!s) return;
    RAD[s.dataset.rad] = s.dataset.rad === 'menge' ? +s.value : s.value;
  });
  panel.addEventListener('click', async ev => {
    if (ev.target === panel) return zu();
    const b = ev.target.closest('[data-dev]'); if (!b) return;
    const w = b.dataset.wert;
    switch (b.dataset.dev) {
      case 'zu': return zu();
      case 'aus': return schalten(false);
      case 'reiter': reiter = w; return malen();
      case 'tempo': if (window.Shop) Shop.SHOW.tempo = +w; return malen();
      case 'radShow':
        if (!window.Shop) return toast('Shop ist nicht geladen');
        zu(); await Shop.radDemo(RAD); return auf();
      case 'radEcht': zu(); showTab('shop'); { const k = document.querySelector(`[data-sh="rad"][data-rad="${RAD.id}"]`); if (k) k.click(); } return;
      case 'figur': if (A()) { await A().figurLaden(); toast('Neu geladen'); } return malen();
      case 'tab': zu(); return showTab(w);
      case 'sound': if (window.Klang) Klang.effekt(w); return;
      case 'toast': return toast('Test-Toast ' + new Date().toLocaleTimeString('de-DE'));
      case 'shop': if (window.Shop) Shop.zeichnen(); return toast('Shop neu gezeichnet');
      case 'bilder': if (window.Shop) Shop._test.cache.clear(); if (window.Shop) Shop.zeichnen(); return toast('Bild-Cache leer');
      case 'profil': zu(); if (typeof openProfile === 'function') openProfile(); return;
      case 'raster': document.body.classList.toggle('dev-raster'); return;
      case 'neu':
        // Den Service Worker nicht abmelden, sonst gehen die Push-Erinnerungen verloren
        try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (err) { merken('Fehler', err.message); }
        { const u = new URL(location.href); u.searchParams.set('neu', Date.now()); location.replace(u); }
        return;
      case 'logKopie':
        try { await navigator.clipboard.writeText(log.map(x => `${x.zeit} [${x.art}] ${x.text}`).join('\n')); toast('Log kopiert'); } catch (err) { toast('Kopieren ging nicht'); }
        return;
      case 'logLeer': log.length = 0; return malen();
      case 'logTest': setTimeout(() => { throw new Error('Testfehler aus dem Dev-Menü'); }); return;
    }
  });

  window.Dev = { auf, zu, schalten, log };
})();
