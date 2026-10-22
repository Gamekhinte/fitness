/* ================= SHOP =================
   Tab "Shop" (statt "Heute") im Stil von Fall Guys: ein Highlight, täglich wechselnde Angebote,
   zwei Wochen-Angebote und danach alles nach Kategorien. Jedes Teil zeigt ein 3D-Vorschaubild
   an einer neutralen Figur. Antippen öffnet die Anprobe (der Editor) mit dem Teil an deiner Figur,
   dort wird gekauft. Preise und Besitz prüft der Server (wf_kaufen, wf_kaufen_gems).

   Die Auswahl wechselt um Mitternacht (Gerätezeit) und ist für alle gleich, weil sie nur vom Datum abhängt.

   Außerdem zieht dieses Skript die Inhalte von "Heute" (Wochenplan, Aufgaben, Lauf, Erinnerungen) oben in den
   Training-Tab, damit beides an einem Ort liegt. Alle Elemente behalten ihre ids, die Skripte darunter laufen weiter.

   Läuft nach arena.js (nutzt ArenaUI, Figur, WF3D). */
(function () {
  if (!window.ArenaUI || !window.Figur || !window.WF3D) return;
  const A = window.ArenaUI, e = s => esc(s), el = id => document.getElementById(id);
  const K = Figur.KATALOG;
  const gem = '<img class="ar-gem" src="arena/gem.svg" alt="Gems">';

  /* ---------- Heute zieht in Training ---------- */
  const heute = el('tab-today'), training = el('tab-catalog');
  if (heute && training) {
    Array.from(heute.children).reverse().forEach(c => training.insertBefore(c, training.firstChild));
    heute.hidden = true; heute.classList.remove('active');
  }
  const altShow = showTab;
  showTab = function (t) {
    if (t === 'today') t = 'catalog';
    altShow(t);
    if (t === 'shop') zeichnen();
  };

  /* ---------- Katalog ---------- */
  const KATS = [['skin', 'Outfits'], ['kopf', 'Köpfe'], ['extra', 'Extras'], ['emote', 'Animationen'], ['intro', 'Intros'], ['hg', 'Hintergründe']];
  const REITER = { skin: 'skins', kopf: 'extras', extra: 'extras', emote: 'emotes', intro: 'intro', hg: 'hg' };
  function alle() {
    const l = [];
    KATS.forEach(([k]) => (K[k] || []).forEach(([id, name, preis]) => {
      const art = typeof preis === 'number' ? (preis > 0 ? 'coins' : null) : /^g\d+$/.test(preis) ? 'gems' : null;      // 'pass' und gratis gehören nicht in den Shop
      if (art) l.push({ kat: k, id, name, art, wert: art === 'coins' ? preis : +preis.slice(1), key: k + ':' + id });
    }));
    return l;
  }
  const hat = it => (A.F().besitz || []).includes(it.key);

  /* ---------- Tägliche Auswahl: hängt nur vom Datum ab ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const heuteSeed = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };
  const wocheSeed = () => { const d = new Date(), t = new Date(d.getFullYear(), 0, 1); return d.getFullYear() * 100 + Math.floor((d - t) / 6048e5); };
  function auswahl() {
    const items = alle(), r = rng(heuteSeed()), rw = rng(wocheSeed() * 7 + 3);
    const pool = (...kats) => items.filter(i => kats.includes(i.kat));
    // Bevorzugt Teile, die du noch nicht hast, damit das Sortiment jeden Tag etwas Neues zeigt
    const nimm = (liste, zufall, ausser) => {
      let f = liste.filter(i => !ausser.has(i.key) && !hat(i));
      if (!f.length) f = liste.filter(i => !ausser.has(i.key));
      if (!f.length) f = liste;
      return f[Math.floor(zufall() * f.length)];
    };
    const benutzt = new Set(), pick = (liste, z) => { const i = nimm(liste, z, benutzt); benutzt.add(i.key); return i; };
    const highlight = pick(items.filter(i => i.kat === 'skin' && (i.art === 'gems' || i.wert >= 900)), r);
    const taeglich = [pick(pool('skin'), r), pick(pool('kopf', 'extra'), r), pick(pool('emote', 'intro'), r), pick(pool('hg'), r)];
    const woche = [pick(pool('kopf', 'extra', 'skin'), rw), pick(pool('emote', 'intro', 'hg'), rw)];
    return { highlight, taeglich, woche, items };
  }

  /* ---------- Vorschaubilder: eine versteckte 3D-Bühne rendert jedes Teil einmal ---------- */
  let B = null, kette = Promise.resolve();
  const cache = new Map();
  async function buehne() {
    if (B) return B;
    await WF3D.laden();
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-9999px;top:0;width:180px;height:220px;pointer-events:none';
    document.body.appendChild(host);
    B = WF3D.buehne(host, { foto: true, fov: 28 }); B.pausiert = true; B.r.setPixelRatio(2); B.groesse();
    return B;
  }
  function foto(it) {
    if (cache.has(it.key)) return Promise.resolve(cache.get(it.key));
    kette = kette.then(async () => {
      if (cache.has(it.key)) return cache.get(it.key);
      const b = await buehne(), T = WF3D.T;
      const look = Object.assign({}, Figur.STANDARD, { skin: 'nichts', kopf: 'nichts', extra: 'nichts', hg: 'leer', emote: 'idle' });
      look[it.kat] = it.id;
      const g = new T.Group(), f = Figur.bauen(look, { boese: it.kat === 'intro' });
      f.rotation.y = 0.35; g.add(f);
      let bg = null;
      if (it.kat === 'hg') { bg = Figur.hintergrund(it.id); bg.position.set(0, 0, -4); g.add(bg); f.scale.setScalar(0.85); }
      const rig = f.userData.rig;
      if (it.kat === 'emote') Figur.haltung(f, it.id, 0.7); else if (it.kat === 'intro') Figur.haltung(f, it.id, 0.9); else Figur.haltung(f, 'idle', 0.3);
      if (bg && bg.userData.tick) bg.userData.tick(1.2);
      b.szene.add(g);
      const k = b.kamera;
      if (it.kat === 'kopf') { k.position.set(0, 2.0, 5.2); k.lookAt(0, 1.8, 0); }
      else if (it.kat === 'extra') { k.position.set(0, 1.55, 5.6); k.lookAt(0, 1.4, 0); }
      else { k.position.set(0, 1.5, 7.6); k.lookAt(0, 1.15, 0); }
      b.r.render(b.szene, k);
      const url = b.r.domElement.toDataURL('image/png');
      b.szene.remove(g); cache.set(it.key, url);
      return url;
    }).catch(() => null);
    return kette;
  }
  const beobachter = 'IntersectionObserver' in window ? new IntersectionObserver(eintraege => eintraege.forEach(x => {
    if (!x.isIntersecting) return;
    const img = x.target; beobachter.unobserve(img);
    const it = alle().find(i => i.key === img.dataset.foto);
    if (it) foto(it).then(url => { if (url) { img.src = url; img.classList.add('da'); } });
  }), { rootMargin: '200px' }) : null;
  function bilderStarten(wurzel) {
    wurzel.querySelectorAll('img[data-foto]').forEach(img => {
      const it = alle().find(i => i.key === img.dataset.foto);
      if (it && cache.has(it.key)) { img.src = cache.get(it.key); img.classList.add('da'); } else if (beobachter) beobachter.observe(img);
    });
  }

  /* ---------- Oberfläche ---------- */
  const tab = document.createElement('section');
  tab.id = 'tab-shop'; tab.className = 'tab';
  tab.innerHTML = '<div id="shWurzel"></div>';
  document.querySelector('main').appendChild(tab);

  const preis = it => it.art === 'gems' ? `${gem}${it.wert}` : `${A.coin}${it.wert}`;
  const kategorieName = it => (KATS.find(x => x[0] === it.kat) || [0, ''])[1];
  const karte = (it, klein) => `<button class="sh-karte ${it.art}${hat(it) ? ' hat' : ''}${klein ? ' klein' : ''}" data-sh="anprobe" data-key="${e(it.key)}">
      <span class="sh-bild"><img alt="" data-foto="${e(it.key)}"></span>
      <b>${e(it.name)}</b>
      <span class="sh-preis">${hat(it) ? 'Gekauft' : preis(it)}</span></button>`;
  const highlight = (it, klein) => `<button class="sh-hl ${it.art}${hat(it) ? ' hat' : ''}${klein ? ' klein' : ''}" data-sh="anprobe" data-key="${e(it.key)}">
      <span class="sh-bild"><img alt="" data-foto="${e(it.key)}"></span>
      <span class="sh-hl-text"><em>${klein ? 'Woche' : 'Highlight'}</em><b>${e(it.name)}</b><small>${e(kategorieName(it))}</small><span class="sh-preis">${hat(it) ? 'Gekauft' : preis(it)}</span></span></button>`;

  function rest() {
    const d = new Date(), n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1) - d;
    const h = Math.floor(n / 36e5), m = Math.floor(n % 36e5 / 6e4), s = Math.floor(n % 6e4 / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  let zuletztTag = heuteSeed();
  function zeichnen() {
    const w = el('shWurzel'); if (!w) return;
    const a = auswahl(), F = A.F();
    zuletztTag = heuteSeed();
    w.innerHTML = `
      <div class="sh-kopf">
        <h2>Shop</h2>
        <span class="sh-konto"><span>${A.coin}<b>${F.coins}</b></span><span>${gem}<b>${F.gems || 0}</b></span></span>
      </div>
      <div class="sh-restock"><span>Neues Sortiment in</span><b id="shUhr">${rest()}</b></div>
      ${highlight(a.highlight)}
      <div class="sh-abschnitt"><h3>Heute</h3></div>
      <div class="sh-raster vier">${a.taeglich.map(i => karte(i, true)).join('')}</div>
      <div class="sh-abschnitt"><h3>Diese Woche</h3></div>
      <div class="sh-woche">${a.woche.map(i => highlight(i, true)).join('')}</div>
      <div class="sh-unten">
        <button class="sh-pass" data-sh="pass"><span class="sh-pass-gem">${gem}</span><span><b>Winterpass</b><small>Belohnungen, Gems und Outfits</small></span><i>Ansehen</i></button>
        <button class="ar-knopf breit leise2" data-sh="alle">Alle Teile ansehen</button>
      </div>`;
    bilderStarten(w);
  }
  tab.addEventListener('click', ev => {
    const b = ev.target.closest('[data-sh]'); if (!b) return;
    const a = b.dataset.sh;
    if (a === 'alle') A.editor('skins');
    else if (a === 'pass') { if (window.Pass) Pass.sheet(); }
    else if (a === 'anprobe') {
      const it = alle().find(i => i.key === b.dataset.key);
      if (it) A.shopVorschau(it.kat, it.id, REITER[it.kat]);
    }
  });
  // Countdown, und um Mitternacht automatisch ein neues Sortiment
  setInterval(() => {
    if (typeof curTab === 'undefined' || curTab !== 'shop') return;
    if (heuteSeed() !== zuletztTag) return zeichnen();
    const u = el('shUhr'); if (u) u.textContent = rest();
  }, 1000);
  window.Shop = { zeichnen, auswahl, foto, _test: { cache } };
})();
