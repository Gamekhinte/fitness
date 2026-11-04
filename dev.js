/* ================= DEV-MENÜ: WERKSTATT DES OLYMP =================
   Nur für Dev-Konten. Wer das ist, entscheidet der Server (Tabelle wf_devs, Funktion wf_dev_status).
   Normale Spieler sehen kein Icon, und selbst nachgebaute Aufrufe lehnt der Server ab (wf_dev_aktion prüft jedes Mal).

   Für Devs sitzt unten links ein goldener Blitz. Er öffnet die Werkstatt:
   Konto (Coins, Gems), Pokale (Lauf, Kraft, Siege), Freischalten (alles, zurücksetzen, Titel, Pass, Rad),
   Werkzeug (Rad-Show, Tabs, Sounds, Cache) und Log (Fehler auf dem Gerät).
   Läuft nach shop.js. */
(function () {
  const LOG_MAX = 60;
  const e = s => (typeof esc === 'function' ? esc(s) : String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]));
  const zahl = n => Number(n || 0).toLocaleString('de-DE');

  /* ---------- Fehler mitschreiben (läuft immer, kostet nichts) ---------- */
  const log = [];
  const merken = (art, text) => { log.push({ zeit: new Date().toLocaleTimeString('de-DE'), art, text: String(text).slice(0, 400) }); if (log.length > LOG_MAX) log.shift(); if (offen && reiter === 'log') malen(); };
  addEventListener('error', ev => merken('Fehler', `${ev.message}${ev.filename ? ' (' + ev.filename.split('/').pop() + ':' + ev.lineno + ')' : ''}`));
  addEventListener('unhandledrejection', ev => merken('Promise', ev.reason && ev.reason.message || ev.reason));
  const altError = console.error.bind(console), altWarn = console.warn.bind(console);
  console.error = (...a) => { merken('console.error', a.map(x => x && x.message || (typeof x === 'object' ? JSON.stringify(x) : x)).join(' ')); altError(...a); };
  console.warn = (...a) => { merken('console.warn', a.join(' ')); altWarn(...a); };

  /* ---------- Wer ist Dev? Fragt den Server ---------- */
  const A = () => window.ArenaUI;
  let D = null;                                   // Antwort von wf_dev_status, null = unbekannt oder kein Dev
  let offen = false, reiter = 'konto', laeuft = false;
  async function pruefen() {
    const ui = A(); if (!ui || !ui.ich() || !ui.wf()) return;
    try {
      const r = await ui.wf().rpc('wf_dev_status', ui.mit({}));
      D = r && r.dev ? r : null;
    } catch (err) { D = null; }
    knopf.hidden = !D;
    if (!D && offen) zu();
  }
  setTimeout(pruefen, 1500);
  setInterval(() => { if (!D) pruefen(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pruefen(); });

  /* ---------- Oberfläche ---------- */
  const BLITZ = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 5 13.2h5.6L9.4 22 19 9.8h-5.8z" fill="#FAF6EB" stroke="#2B2826" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  const knopf = document.createElement('button');
  knopf.className = 'dev-knopf'; knopf.type = 'button'; knopf.hidden = true; knopf.innerHTML = BLITZ;
  knopf.setAttribute('aria-label', 'Werkstatt des Olymp öffnen');
  document.body.appendChild(knopf);
  const panel = document.createElement('div');
  panel.className = 'dev'; panel.hidden = true;
  document.body.appendChild(panel);

  const RAD = { id: 'klassisch', ergebnis: 'zufall', menge: 1 };
  function auf() { if (!D) return; offen = true; panel.hidden = false; malen(); pruefen().then(() => offen && malen()); }
  function zu() { offen = false; panel.hidden = true; }
  knopf.onclick = () => (offen ? zu() : auf());

  const LAUF = [['Hirtenweide', 0], ['Olivenhain', 300], ['Ägäis-Strand', 600], ['Zypressenpfad', 1000], ['Delphi', 1400], ['Agora', 1800], ['Labyrinth', 2300], ['Unterwelt', 2800], ['Akropolis', 3400], ['Olymp', 4000]];
  const KRAFT = [['Hütte', 0], ['Schmiede', 300], ['Palaistra', 600], ['Olivenhof', 1000], ['Sparta', 1400], ['Gymnasion', 1800], ['Kreta', 2300], ['Gladiatoren', 2800], ['Athene', 3400], ['Olymp', 4000]];
  const versionen = () => Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src')).filter(s => !/^https?:/.test(s)).map(s => s.replace('.js?v=', ' v')).join(', ');
  const SOUNDS = ['tipp', 'muenze', 'kauf', 'countdown', 'los', 'sieg', 'niederlage', 'fehler', 'gefunden', 'radTick', 'radStart', 'radZoom'];
  const tabs = () => Array.from(document.querySelectorAll('.nav [data-tab]')).map(b => [b.dataset.tab, (b.textContent || b.dataset.tab).trim()]);

  // Ein Wert mit Zahlenfeld, Schnellknöpfen und Setzen
  const regler = (aktion, titel, wert, schnell) => `<div class="dev-karte">
      <div class="dev-karte-kopf"><b>${titel}</b><span>${zahl(wert)}</span></div>
      <div class="dev-eingabe"><input type="number" inputmode="numeric" min="0" max="99999999" value="${wert || 0}" data-feld="${aktion}"><button data-dev="setzen" data-wert="${aktion}">Setzen</button></div>
      <div class="dev-reihe">${schnell.map(([t, v]) => `<button data-dev="schnell" data-aktion="${aktion}" data-wert="${v}">${t}</button>`).join('')}</div></div>`;

  function inhalt() {
    if (reiter === 'konto') return regler('coins', 'Coins', D.coins, [['+1.000', '+1000'], ['+10.000', '+10000'], ['Unendlich', 99999999], ['Null', 0]])
      + regler('gems', 'Gems', D.gems, [['+100', '+100'], ['+1.000', '+1000'], ['Unendlich', 99999999], ['Null', 0]]);
    if (reiter === 'pokale') return regler('lauf_pokale', 'Lauf-Pokale', D.lauf_pokale, LAUF.map(([n, v]) => [n, v]).concat([['Max', 9999]]))
      + regler('kraft_pokale', 'Kraft-Pokale', D.kraft_pokale, KRAFT.map(([n, v]) => [n, v]).concat([['Max', 9999]]))
      + regler('siege', 'Siege (für Titel)', D.siege, [['5', 5], ['25', 25], ['100', 100], ['Null', 0]]);
    if (reiter === 'frei') return `
      <div class="dev-stand"><span><b>${D.skins}</b> von ${D.skins_gesamt} Skins</span><span><b>${D.titel}</b> von ${D.titel_gesamt} Titeln</span><span>Pass <b>${D.premium ? 'Premium' : 'Frei'}</b></span></div>
      <button class="dev-gross" data-dev="aktion" data-wert="alles">Alles freischalten</button>
      <p class="dev-hinweis">Alle 100 Skins, Animationen, Intros und Hintergründe.</p>
      <button class="dev-gross weiss" data-dev="aktion" data-wert="titel_alle">Alle Titel freischalten</button>
      <button class="dev-gross weiss" data-dev="aktion" data-wert="premium" data-an="${D.premium ? 'false' : 'true'}">Premium-Pass ${D.premium ? 'aus' : 'an'}</button>
      <button class="dev-gross weiss" data-dev="aktion" data-wert="rad">Gratis-Rad wieder bereit</button>
      <button class="dev-gross rot" data-dev="nichts">Alles zurücksetzen</button>
      <p class="dev-hinweis">Wie ein neuer Spieler: Besitz leer, Startfigur. Coins und Pokale bleiben.</p>`;
    if (reiter === 'werkzeug') {
      const raeder = window.Shop ? Shop.RAEDER : ['klassisch'];
      const opt = (wert, text, akt) => `<option value="${wert}"${wert == akt ? ' selected' : ''}>${e(text)}</option>`;
      return `<h4>Rad-Show ohne Server</h4>
        <label class="dev-feld"><span>Rad</span><select data-rad="id">${raeder.map(id => opt(id, window.Shop ? Shop.radTitel(id) : id, RAD.id)).join('')}</select></label>
        <label class="dev-feld"><span>Ergebnis</span><select data-rad="ergebnis">${[['zufall', 'Zufall nach Chancen'], ['wunsch', 'Wunsch-Skin'], ['duplikat', 'Duplikat'], ['coins', 'Höchste Coins'], ['gems', 'Gems']].map(([w, t]) => opt(w, t, RAD.ergebnis)).join('')}</select></label>
        <label class="dev-feld"><span>Anzahl</span><select data-rad="menge">${[1, 2, 3, 5].map(n => opt(n, 'x' + n, RAD.menge)).join('')}</select></label>
        <button class="dev-gross weiss" data-dev="radShow">Show starten</button>
        <h4>Springen</h4><div class="dev-reihe">${tabs().map(([t, n]) => `<button data-dev="tab" data-wert="${e(t)}">${e(n)}</button>`).join('')}</div>
        <h4>Sounds</h4><div class="dev-reihe">${SOUNDS.map(s => `<button data-dev="sound" data-wert="${s}">${s}</button>`).join('')}</div>
        <h4>App</h4><div class="dev-reihe"><button data-dev="shop">Shop neu</button><button data-dev="bilder">Bild-Cache leeren</button><button data-dev="raster">Raster</button><button data-dev="neu">Neu laden</button></div>
        <p class="dev-hinweis">Skripte: ${e(versionen())}</p>`;
    }
    return `<div class="dev-reihe"><button data-dev="logKopie">Kopieren</button><button data-dev="logLeer">Leeren</button></div>
      ${log.length ? `<ol class="dev-log">${log.slice().reverse().map(x => `<li><small>${x.zeit} · ${e(x.art)}</small>${e(x.text)}</li>`).join('')}</ol>` : '<p class="dev-hinweis">Keine Fehler bisher.</p>'}`;
  }
  function malen() {
    if (!offen || !D) return;
    const alt = panel.querySelector('.dev-inhalt'), scroll = alt ? alt.scrollTop : 0;
    panel.innerHTML = `<div class="dev-in">
      <div class="dev-kopf"><span class="dev-titel">${BLITZ}<b>Werkstatt des Olymp</b></span><button data-dev="zu" aria-label="Schließen">×</button></div>
      <div class="dev-stand oben"><span>${A().coin}<b>${zahl(D.coins)}</b></span><span><img class="ar-gem" src="arena/gem.svg" alt=""><b>${zahl(D.gems)}</b></span><span>Lauf <b>${zahl(D.lauf_pokale)}</b></span><span>Kraft <b>${zahl(D.kraft_pokale)}</b></span></div>
      <div class="dev-reiter">${[['konto', 'Konto'], ['pokale', 'Pokale'], ['frei', 'Freischalten'], ['werkzeug', 'Werkzeug'], ['log', `Log${log.length ? ' ' + log.length : ''}`]].map(([r, n]) => `<button data-dev="reiter" data-wert="${r}" class="${r === reiter ? 'an' : ''}">${n}</button>`).join('')}</div>
      <div class="dev-inhalt${laeuft ? ' laeuft' : ''}">${inhalt()}</div></div>`;
    panel.querySelector('.dev-inhalt').scrollTop = scroll;
  }

  // Aktion auf dem Server ausführen, danach Figur, Coins und Pokale in der App neu laden
  async function aktion(name, wert) {
    if (laeuft) return;
    laeuft = true; malen();
    try {
      const ui = A();
      D = await ui.wf().rpc('wf_dev_aktion', ui.mit({ p_aktion: name, p_wert: wert || null }));
      await Promise.all([ui.figurLaden && ui.figurLaden(), ui.nachDuell && ui.nachDuell()].filter(Boolean));
      if (window.Shop && typeof curTab !== 'undefined' && curTab === 'shop') Shop.zeichnen();
      if (window.Klang) Klang.effekt('muenze');
      toast('Erledigt');
    } catch (err) { toast(err.message || 'Ging nicht'); merken('Dev', err.message); }
    laeuft = false; malen();
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
      case 'reiter': reiter = w; return malen();
      case 'setzen': { const f = panel.querySelector(`[data-feld="${w}"]`); return aktion(w, { zahl: Math.max(0, Math.floor(+f.value || 0)) }); }
      case 'schnell': {
        const a = b.dataset.aktion, akt = Number(D[a] || 0);
        const ziel = String(w).startsWith('+') ? akt + Number(w.slice(1)) : Number(w);
        return aktion(a, { zahl: Math.min(99999999, ziel) });
      }
      case 'aktion': return aktion(w, b.dataset.an ? { an: b.dataset.an === 'true' } : null);
      case 'nichts': if (confirm('Wirklich alles zurücksetzen? Besitz wird geleert.')) return aktion('nichts'); return;
      case 'radShow': if (!window.Shop) return toast('Shop ist nicht geladen'); zu(); await Shop.radDemo(RAD); return auf();
      case 'tab': zu(); return showTab(w);
      case 'sound': if (window.Klang) Klang.effekt(w); return;
      case 'shop': if (window.Shop) Shop.zeichnen(); return toast('Shop neu gezeichnet');
      case 'bilder': if (window.Shop) { Shop._test.cache.clear(); Shop.zeichnen(); } return toast('Bild-Cache leer');
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
    }
  });

  window.Dev = { auf, zu, pruefen, log, ist: () => !!D };
})();
