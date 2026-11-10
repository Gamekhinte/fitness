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
  const KATS = [['skin', 'Skins'], ['aura', 'Auras'], ['emote', 'Animationen'], ['intro', 'Intros'], ['hg', 'Hintergründe']];
  const REITER = { skin: 'skins', aura: 'aura', emote: 'emotes', intro: 'intro', hg: 'hg' };
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
    // Specials: epische und legendäre Skins. Täglich: zwei Skins, eine Animation oder ein Intro, ein Hintergrund.
    const klasse = i => (Figur.skinInfo(i.id) || {}).klasse;
    const spezialPool = items.filter(i => i.kat === 'skin' && ['episch', 'legendaer', 'spezial'].includes(klasse(i)));
    const specials = [pick(spezialPool, r), pick(spezialPool, r), pick(spezialPool, r)];
    const einfach = items.filter(i => i.kat === 'skin' && ['ungewoehnlich', 'selten'].includes(klasse(i)));
    const taeglich = [pick(einfach, r), pick(einfach, r), pick(pool('emote', 'intro'), r), pick(pool('hg'), r)];
    const woche = [pick(pool('skin'), rw), pick(pool('aura', 'emote', 'intro', 'hg'), rw)];
    return { highlight: specials[0], specials, taeglich, woche, items };
  }

  /* ---------- Vorschaubilder: eine versteckte 3D-Bühne rendert jedes Teil an DEINER Figur ---------- */
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
  // Dein Look mit dem Teil darauf. Kopf und Extra ersetzen den Skin, sonst würde der sie verdecken.
  function lookFuer(it) {
    const look = Object.assign({}, Figur.STANDARD, A.F().aussehen, { hg: 'leer' });
    if (it.kat === 'kopf' || it.kat === 'extra') look.skin = 'nichts';
    if (it.kat === 'emote') look.emote = 'idle';
    if (it.kat === 'hg') look.hg = it.id;
    if (it.kat !== 'aura') look.aura = 'keine';
    look[it.kat] = it.id;
    return look;
  }
  const kurz = str => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const ck = it => it.key + '#' + kurz(JSON.stringify(lookFuer(it)));
  const bewegt = it => it.kat === 'emote' || it.kat === 'intro' || it.kat === 'aura';
  // gross: doppelte Auflösung für Bilder, die fast bildschirmgroß gezeigt werden (Rad-Zoom, "Du erhältst")
  function foto(it, gross) {
    const schluessel = ck(it) + (gross ? '#gross' : '');
    if (cache.has(schluessel)) return Promise.resolve(cache.get(schluessel));
    kette = kette.then(async () => {
      if (cache.has(schluessel)) return cache.get(schluessel);
      const b = await buehne(), T = WF3D.T;
      b.r.setPixelRatio(gross ? 4 : 2); b.groesse();
      const look = lookFuer(it);
      await Figur.vorladen(look);                     // Skin-Datei erst laden, sonst wäre das Foto leer
      const g = new T.Group(), f = Figur.bauen(look, { boese: it.kat === 'intro' });
      f.rotation.y = 0.35; g.add(f);
      let bg = null;
      if (it.kat === 'hg') { bg = Figur.hintergrund(it.id); bg.position.set(0, 0, -4); g.add(bg); f.scale.setScalar(0.85); }
      b.szene.add(g);
      const k = b.kamera;
      if (it.kat === 'kopf') { k.position.set(0, 2.0, 5.2); k.lookAt(0, 1.8, 0); }
      else if (it.kat === 'extra') { k.position.set(0, 1.55, 5.6); k.lookAt(0, 1.4, 0); }
      else { k.position.set(0, 1.5, it.kat === 'emote' || it.kat === 'skin' ? 8.8 : 7.6); k.lookAt(0, 1.05, 0); }
      const knipsen = t => {
        Figur.haltung(f, bewegt(it) ? it.id : 'idle', t);
        if (bg && bg.userData.tick) bg.userData.tick(1.2);
        b.r.render(b.szene, k);
        return b.r.domElement.toDataURL('image/png');
      };
      // Animationen werden nicht als Bilderfolge gespeichert, sondern live gerendert (siehe unten)
      const ergebnis = bewegt(it) ? { live: true, it, look } : knipsen(0.3);
      b.szene.remove(g);
      if (gross) { b.r.setPixelRatio(2); b.groesse(); }
      cache.set(schluessel, ergebnis);
      return ergebnis;
    }).catch(() => null);
    return kette;
  }

  /* ---------- Animierte Karten live mit 30 Bildern pro Sekunde ----------
     Ein eigener kleiner Renderer zeichnet jede sichtbare Animations-Karte reihum auf ihre Leinwand.
     Karten außerhalb des Bildschirms kosten nichts. */
  const live = new Set();
  let L = null, liveZuletzt = 0;
  async function liveBuehne() {
    if (L) return L;
    await WF3D.laden();
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-9999px;top:0;width:180px;height:220px;pointer-events:none';
    document.body.appendChild(host);
    L = WF3D.buehne(host, { fov: 28 }); L.pausiert = true; L.r.setPixelRatio(2); L.groesse();
    return L;
  }
  function zeigen(img, erg) {
    if (!erg) return;
    if (typeof erg === 'string') { img.src = erg; img.classList.add('da'); return; }
    if (!erg.live) return;
    liveBuehne().then(() => {
      if (!img.isConnected) return;
      const c = document.createElement('canvas'); c.width = 360; c.height = 440;
      c.className = img.className + ' da'; c.style.cssText = 'width:100%;height:100%;display:block;object-fit:contain';
      if (img.dataset.foto) c.dataset.foto = img.dataset.foto;
      img.replaceWith(c);
      const g = new WF3D.T.Group(), f = Figur.bauen(erg.look, { boese: erg.it.kat === 'intro' });
      f.rotation.y = 0.35; g.add(f);
      live.add({ c, ctx: c.getContext('2d'), g, f, it: erg.it, start: performance.now() / 1000 });
      if (live.size === 1) requestAnimationFrame(liveSchleife);
    });
  }
  function liveSchleife(jetzt) {
    if (!live.size) return;
    requestAnimationFrame(liveSchleife);
    if (document.hidden || jetzt - liveZuletzt < 31) return;      // höchstens ca. 30 Bilder pro Sekunde
    if (document.querySelector('body > .rs')) return;              // Rad offen: Vorschauen dahinter nicht zeichnen
    liveZuletzt = jetzt;
    const hoehe = window.innerHeight, k = L.kamera;
    live.forEach(p => {
      if (!p.c.isConnected) { live.delete(p); return; }
      const r = p.c.getBoundingClientRect(); if (r.bottom < 0 || r.top > hoehe || !r.width) return;
      k.position.set(0, 1.5, p.it.kat === 'emote' ? 8.8 : 7.6); k.lookAt(0, 1.05, 0);
      L.szene.add(p.g);
      Figur.haltung(p.f, p.it.id, jetzt / 1000 - p.start);
      L.r.render(L.szene, k);
      L.szene.remove(p.g);
      p.ctx.clearRect(0, 0, p.c.width, p.c.height);
      p.ctx.drawImage(L.r.domElement, 0, 0, p.c.width, p.c.height);
    });
  }
  const beobachter = 'IntersectionObserver' in window ? new IntersectionObserver(eintraege => eintraege.forEach(x => {
    if (!x.isIntersecting) return;
    const img = x.target; beobachter.unobserve(img);
    const it = alle().find(i => i.key === img.dataset.foto);
    if (it) foto(it).then(erg => zeigen(img, erg));
  }), { rootMargin: '200px' }) : null;
  function bilderStarten(wurzel) {
    wurzel.querySelectorAll('img[data-foto]').forEach(img => {
      const it = alle().find(i => i.key === img.dataset.foto);
      if (!it) return;
      if (cache.has(ck(it))) zeigen(img, cache.get(ck(it))); else if (beobachter) beobachter.observe(img);
    });
  }

  /* ---------- Oberfläche ---------- */
  const tab = document.createElement('section');
  tab.id = 'tab-shop'; tab.className = 'tab';
  tab.innerHTML = '<div id="shWurzel"></div>';
  document.querySelector('main').appendChild(tab);

  // Skins haben eine feste Klasse, der Rest richtet sich nach dem Preis
  const seltenheit = it => {
    const s = it.kat === 'skin' && Figur.skinInfo(it.id);
    if (s) return s.klasse === 'ungewoehnlich' ? 'gewoehnlich' : s.klasse;
    return it.art === 'gems' ? 'legendaer' : it.wert >= 1500 ? 'legendaer' : it.wert >= 700 ? 'episch' : it.wert >= 300 ? 'selten' : 'gewoehnlich';
  };
  const SELTEN_NAME = { gewoehnlich: 'Ungewöhnlich', selten: 'Selten', episch: 'Episch', legendaer: 'Legendär', spezial: 'Spezial' };
  const preis = it => it.art === 'gems' ? `${gem}${it.wert}` : `${A.coin}${it.wert}`;
  const kategorieName = it => (KATS.find(x => x[0] === it.kat) || [0, ''])[1];
  // Neu dazugekommene Posen, Intros und Hintergründe bekommen ein NEU-Schild
  const NEU = new Set(['aura:funken', 'aura:frost', 'aura:wellen', 'aura:feuer', 'aura:blitz', 'aura:schatten', 'aura:sonne', 'emote:verbeugen', 'emote:kniebeuge', 'emote:kranich', 'emote:liegestuetz', 'emote:diskus', 'emote:sirtaki',
    'intro:kopfschuetteln', 'intro:nacken', 'intro:blitz', 'hg:olivenhain', 'hg:aegaeis', 'hg:tempel', 'hg:mosaik', 'hg:stadion', 'hg:gewitter', 'hg:unterwelt', 'hg:olympwolken']);
  const karte = (it, klein) => `<button class="sh-karte ${it.art}${hat(it) ? ' hat' : ''}${klein ? ' klein' : ''} sel-${seltenheit(it)}" data-sh="anprobe" data-key="${e(it.key)}">
      <span class="sh-bild"><img alt="" data-foto="${e(it.key)}"></span><i class="sh-sel">${SELTEN_NAME[seltenheit(it)]}</i>${NEU.has(it.key) && !hat(it) ? '<i class="sh-neu">NEU</i>' : ''}
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

  /* ---------- Räder im Shop ----------
     Oben ein großes "Rad des Tages" (wechselt um Mitternacht, bevorzugt Räder mit Skins, die du noch nicht hast),
     daneben das Glücksrad mit dem Gratis-Dreh und die anderen Räder. Darunter steht ehrlich, wie weit deine
     Coins reichen. Chancen kommen vom Server (wf_spin_status), nichts ist erfunden. */
  const RAEDER = ['klassisch', 'herakles', 'medusa', 'minotauros', 'nike', 'zyklop'];   // muss zu wf_spin_status passen
  const skinName = id => (Figur.KATALOG.skin.find(x => x[0] === id) || [0, id])[1];
  const radPreis = id => { const r = rad && rad.raeder.find(x => x.id === id); return r ? r.preis : id === 'klassisch' ? 250 : 400; };
  function radDesTages() {
    const themen = RAEDER.filter(id => id !== 'klassisch'), offen = themen.filter(id => !hat({ key: 'skin:' + id }));
    const l = offen.length ? offen : themen;
    return l[Math.floor(rng(heuteSeed() * 13 + 5)() * l.length)];
  }
  function wunschChance(id) {
    const d = rad && rad.raeder.find(r => r.id === id); if (!d) return null;
    const w = d.preise.find(p => p.item), s = d.preise.reduce((a, p) => a + p.gewicht, 0);
    return w ? Math.max(1, Math.round(w.gewicht / s * 100)) : null;
  }
  function raederHtml() {
    const fokus = radDesTages(), frei = !!(rad && rad.bereit), ch = wunschChance(fokus), F = A.F();
    const besitzt = hat({ key: 'skin:' + fokus });
    const karte = id => {
      if (id === 'klassisch') return `<button class="sh-rk${frei ? ' bereit' : ''}" data-sh="rad" data-rad="klassisch" id="shRadKnopf">
          <span class="sh-rk-bild"><span class="sh-rk-faecher"><i></i><i></i><i></i><i></i><i></i></span>${frei ? '<i class="sh-rk-marke">Gratis</i>' : ''}</span>
          <b>Glücksrad</b><span class="sh-preis">${frei ? 'Gratis drehen' : A.coin + radPreis('klassisch')}</span></button>`;
      const h = hat({ key: 'skin:' + id });
      return `<button class="sh-rk${h ? ' hat' : ''}" data-sh="rad" data-rad="${id}"><span class="sh-rk-bild"><img alt="" data-foto="skin:${id}">${h ? '<i class="sh-rk-marke hat">Hast du</i>' : ''}</span>
        <b>${e(skinName(id))}-Rad</b><span class="sh-preis">${A.coin}${radPreis(id)}</span></button>`;
    };
    // Wie weit reichen die Coins? Max. so viele Drehungen, wie heute noch erlaubt sind
    const p = radPreis(fokus), n = Math.floor(F.coins / p);
    const ziel = n >= 1
      ? `<div class="sh-ziel voll">${A.coin}<span><b>Reicht für ${n} ${n === 1 ? 'Dreh' : 'Drehs'}</b><small>am ${e(skinName(fokus))}-Rad</small></span></div>`
      : `<div class="sh-ziel">${A.coin}<span><b>Noch ${p - F.coins} Coins bis zum nächsten Dreh</b><i class="sh-qbalken"><u style="width:${Math.min(100, F.coins / p * 100)}%"></u></i><small>Coins gibt es für Training, Aufgaben und Rennen</small></span></div>`;
    return `<div class="sh-abschnitt"><h3>Räder</h3><small>Skins erdrehen</small></div>
      <button class="sh-rf${besitzt ? ' hat' : ''}" data-sh="rad" data-rad="${fokus}">
        <span class="sh-rf-bild"><img alt="" data-foto="skin:${fokus}"></span>
        <span class="sh-rf-text"><em>Rad des Tages</em><b>${e(skinName(fokus))}-Rad</b>
          <small>${besitzt ? 'Den Skin hast du schon, du drehst um Coins und Gems' : ch ? `${ch} % Chance pro Dreh auf ${e(skinName(fokus))}` : `Mit Glück gehört ${e(skinName(fokus))} dir`}</small>
          <span class="sh-rf-knopf">Drehen · ${A.coin}${p}</span></span>
      </button>
      <div class="sh-raeder">${RAEDER.filter(id => id !== fokus).map(karte).join('')}</div>
      ${A.ich() ? ziel : ''}`;
  }
  function raederMalen() { const b = el('shRaeder'); if (b) { b.innerHTML = raederHtml(); bilderStarten(b); } }

  /* ---------- Kontostand: zählt hoch, Münzen fliegen hinein ---------- */
  const anzeige = { coins: null, gems: null };
  function kontoZeigen(huepfen) {
    const F = A.F();
    [['coins', 'shCoins', 'arCoinZahl'], ['gems', 'shGems', 'arGemZahl']].forEach(([k, id, arId]) => {
      const ziel = k === 'coins' ? F.coins : F.gems || 0, z = el(id), arZ = el(arId);
      if (arZ) arZ.textContent = ziel;
      if (!z) return;
      const von = anzeige[k] == null ? ziel : anzeige[k];
      anzeige[k] = ziel;
      if (von === ziel) { z.textContent = ziel; return; }
      const t0 = performance.now(), dauer = 600;
      (function schritt(jetzt) {
        const t = Math.min(1, (jetzt - t0) / dauer);
        z.textContent = Math.round(von + (ziel - von) * (1 - Math.pow(1 - t, 3)));
        if (t < 1) requestAnimationFrame(schritt);
      })(t0);
      if (huepfen) { const c = z.parentNode; c.classList.remove('huepf'); void c.offsetWidth; c.classList.add('huepf'); }
    });
  }
  function muenzenFliegen(von, art, fertig) {
    const ziel = el(art === 'gems' ? 'shGems' : 'shCoins');
    if (!von || !ziel || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return fertig();
    const zr = ziel.parentNode.getBoundingClientRect();
    const zx = zr.top > -10 ? zr.left + 14 : window.innerWidth - 60, zy = zr.top > -10 ? zr.top + zr.height / 2 : 20;
    const n = 7, src = art === 'gems' ? 'arena/gem.svg' : 'arena/coin.svg';
    let rest = n;
    for (let i = 0; i < n; i++) {
      const m = document.createElement('img');
      m.src = src; m.alt = ''; m.className = 'sh-flug';
      const sx = von.left + von.width / 2 + (Math.random() - 0.5) * 60, sy = von.top + von.height / 2 + (Math.random() - 0.5) * 20;
      m.style.left = sx + 'px'; m.style.top = sy + 'px';
      document.body.appendChild(m);
      const bx = (Math.random() - 0.5) * 120, by = -60 - Math.random() * 60;
      m.animate([
        { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
        { transform: `translate(calc(-50% + ${bx}px), calc(-50% + ${by}px)) scale(1.1)`, opacity: 1, offset: 0.3 },
        { transform: `translate(calc(-50% + ${zx - sx}px), calc(-50% + ${zy - sy}px)) scale(.7)`, opacity: 1 }
      ], { duration: 750, delay: i * 55, easing: 'cubic-bezier(.5,0,.6,1)', fill: 'both' }).onfinish = () => {
        m.remove();
        if (window.Klang && i % 2 === 0) Klang.effekt('pokal', i);
        if (--rest === 0) fertig();
      };
    }
  }

  // Neue zuerst, dann was du noch nicht hast, dann nach Preis (Gems zählen wie 15 Coins)
  const sortiert = l => l.slice().sort((x, y) => (NEU.has(y.key) && !hat(y)) - (NEU.has(x.key) && !hat(x)) || hat(x) - hat(y)
    || (x.art === 'gems' ? x.wert * 15 : x.wert) - (y.art === 'gems' ? y.wert * 15 : y.wert));
  let zuletztTag = heuteSeed();
  function zeichnen() {
    const w = el('shWurzel'); if (!w) return;
    const a = auswahl(), F = A.F();
    zuletztTag = heuteSeed();
    anzeige.coins = F.coins; anzeige.gems = F.gems || 0;
    w.innerHTML = `
      <div class="sh-kopf">
        <h2>Shop</h2>
        <span class="sh-konto"><span>${A.coin}<b id="shCoins">${F.coins}</b></span><span>${gem}<b id="shGems">${F.gems || 0}</b></span></span>
      </div>
      <div id="shTag">${tagHtml()}</div>
      <div id="shRaeder">${raederHtml()}</div>
      <div class="sh-spezial-kopf"><h3>Special</h3><span>Neu in <b id="shUhr">${rest()}</b></span></div>
      <div class="sh-spezial">${a.specials.map(i => karte(i, true).replace('class="sh-karte', 'class="sh-karte spezial')).join('')}</div>
      <div class="sh-abschnitt"><h3>Tagesangebote</h3></div>
      <div class="sh-raster vier">${a.taeglich.map(i => karte(i, true)).join('')}</div>
      <div class="sh-abschnitt"><h3>Diese Woche</h3></div>
      <div class="sh-woche">${a.woche.map(i => highlight(i, true)).join('')}</div>
      <div class="sh-abschnitt"><h3>Auras</h3><small>Sieht auch dein Gegner</small></div>
      <div class="sh-raster drei sh-kosmetik">${sortiert(a.items.filter(i => i.kat === 'aura')).map(i => karte(i, true)).join('')}</div>
      <div class="sh-abschnitt"><h3>Posen & Intros</h3><small>Immer im Shop</small></div>
      <div class="sh-raster vier sh-kosmetik">${sortiert(a.items.filter(i => i.kat === 'emote' || i.kat === 'intro')).map(i => karte(i, true)).join('')}</div>
      <div class="sh-abschnitt"><h3>Hintergründe</h3><small>Immer im Shop</small></div>
      <div class="sh-raster drei sh-kosmetik">${sortiert(a.items.filter(i => i.kat === 'hg')).map(i => karte(i, true)).join('')}</div>
      <div class="sh-abschnitt"><h3>Diamanten-Outfits</h3><small>Immer im Shop</small></div>
      <div class="sh-raster drei">${a.items.filter(i => i.art === 'gems').sort((x, y) => x.wert - y.wert).map(i => karte(i, true)).join('')}</div>
      <div class="sh-unten">
        <button class="sh-pass" data-sh="pass"><span class="sh-pass-gem">${gem}</span><span><b>Winterpass</b><small>Belohnungen, Gems und Outfits</small></span><i>Ansehen</i></button>
        <button class="ar-knopf breit leise2" data-sh="alle">Alle Teile ansehen</button>
      </div>`;
    bilderStarten(w);
    tagLaden();
    radPruefen();
  }

  /* ---------- Täglicher Login und Tagesaufgaben (Server: wf_login_*, wf_quests, wf_quest_holen) ----------
     Abholen zeigt alles sofort an (Münzen fliegen, Zahl zählt hoch) und fragt den Server im Hintergrund.
     Sagt der Server nein, wird zurückgedreht. Der Shop wird dabei nicht neu gebaut, nichts springt. */
  let tagDaten = null, holt = false;
  function tagHtml() {
    if (!A.ich() || !tagDaten) return '';
    const { l, q } = tagDaten;
    const tage = l.belohnungen.map((b, i) => {
      const n = i + 1, fertig = n < l.tag || (n === l.tag && l.geholt);
      return `<span class="${fertig ? 'da' : ''}${n === l.tag ? ' heute' : ''}"><small>Tag ${n}</small>${b.gems ? gem + b.gems : A.coin + b.coins}</span>`;
    }).join('');
    const quest = x => {
      const fertig = x.stand >= x.ziel;
      return `<div class="sh-quest${fertig ? ' fertig' : ''}${x.geholt ? ' geholt' : ''}"><span class="sh-qtext"><b>${e(x.text)}</b><i class="sh-qbalken"><u style="width:${Math.min(100, x.stand / x.ziel * 100)}%"></u></i></span>
        ${x.geholt ? '<span class="sh-erledigt">Erledigt</span>' : fertig ? `<button class="so-mini sh-hol" data-sh="quest" data-id="${e(x.id)}">+${x.coins} ${A.coin}</button>` : `<span class="sh-lohn">${A.coin}${x.coins}</span>`}</div>`;
    };
    const offen = q.quests.filter(x => !x.geholt).length;
    return `
      <div class="sh-login${l.geholt ? ' fertig' : ''}">
        <div class="sh-login-kopf"><h3>Tägliche Belohnung</h3>${l.geholt ? '<small>Morgen geht es weiter</small>' : '<small>Jeden Tag mehr</small>'}</div>
        <div class="sh-tage">${tage}</div>
        ${l.geholt ? '' : `<button class="ar-knopf breit gold sh-hol" data-sh="login">Tag ${l.tag} abholen</button>`}</div>
      <div class="sh-abschnitt"><h3>Tagesaufgaben</h3><small>${offen ? `${offen} offen` : 'Alles geschafft'}</small></div>
      <div class="sh-quests">${q.quests.map(quest).join('')}
        <div class="sh-quest bonus${q.bonus_bereit ? ' fertig' : ''}"><span class="sh-qtext"><b>Alle drei geschafft</b></span>
          ${q.bonus_geholt ? '<span class="sh-erledigt">Erledigt</span>' : q.bonus_bereit ? `<button class="so-mini sh-hol" data-sh="quest" data-id="bonus">+1 ${gem}</button>` : `<span class="sh-lohn">${gem}1</span>`}</div></div>`;
  }
  function tagMalen() { const b = el('shTag'); if (b) b.innerHTML = tagHtml(); }
  async function tagLaden() {
    if (!A.ich()) { tagDaten = null; tagMalen(); return; }
    let neu;
    try { const [l, q] = await Promise.all([A.wf().rpc('wf_login_status', A.mit({})), A.wf().rpc('wf_quests', A.mit({}))]); neu = { l, q }; } catch (err) { return; }
    if (holt) return;                                                 // während des Abholens nicht dazwischenfunken
    const vorher = JSON.stringify(tagDaten);
    tagDaten = neu; abzeichen();
    if (JSON.stringify(neu) !== vorher) tagMalen();
  }
  // roter Punkt am Shop-Symbol, wenn etwas abzuholen ist oder der Gratis-Dreh wartet
  function abzeichen() {
    const b = document.querySelector('.nav [data-tab="shop"]'); if (!b) return;
    const t = tagDaten, tag = !!t && (!t.l.geholt || t.q.quests.some(x => x.stand >= x.ziel && !x.geholt) || (t.q.bonus_bereit && !t.q.bonus_geholt));
    b.classList.toggle('badge', tag || !!(rad && rad.bereit));
  }
  async function tagHolen(was, id, knopf) {
    if (holt || !tagDaten) return;
    holt = true;
    const { l, q } = tagDaten, F = A.F();
    let coins = 0, gems = 0;
    if (was === 'login') { const b = l.belohnungen[l.tag - 1] || {}; coins = b.coins || 0; gems = b.gems || 0; l.geholt = true; }
    else if (id === 'bonus') { gems = 1; q.bonus_geholt = true; }
    else { const x = q.quests.find(y => y.id === id); if (x) { coins = x.coins; x.geholt = true; } }
    const von = knopf && knopf.getBoundingClientRect();
    F.coins += coins; F.gems = (F.gems || 0) + gems;
    tagMalen(); abzeichen();
    if (window.Klang) Klang.effekt(gems ? 'kauf' : 'muenze');
    muenzenFliegen(von, gems && !coins ? 'gems' : 'coins', () => { kontoZeigen(true); raederMalen(); });
    try {
      await A.wf().rpc(was === 'login' ? 'wf_login_holen' : 'wf_quest_holen', was === 'login' ? A.mit({}) : A.mit({ p_quest: id }));
    } catch (err) {
      F.coins -= coins; F.gems -= gems; holt = false;
      toast(err.message); kontoZeigen(); tagLaden(); return;
    }
    holt = false;
    // Mit dem Server abgleichen, ohne den Shop neu zu bauen
    A.figurLaden().then(() => { kontoZeigen(); raederMalen(); });
    tagLaden();
  }
  setTimeout(tagLaden, 2500);
  setTimeout(radPruefen, 3000);
  setInterval(() => { if (!document.hidden && A.ich()) tagLaden(); }, 60000);

  /* ---------- Räder (klassisch: 1 Gratis-Dreh am Tag, Themen-Räder mit Wunsch-Skin, alles nur mit Coins) ----------
     Ablauf wie bei Stumble Guys: Kaufblatt mit Chancen und Menge, dann eine Vollbild-Show. Ein Bogen aus Karten
     dreht unter dem Zeiger durch, jede Karte am Zeiger tickt und schubst ihn, am Ende zoomt die Kamera auf die
     Gewinnkarte und es kommt der "Du erhältst"-Bildschirm. */
  let rad = null, dreht = false, radId = 'klassisch';
  const itemName = key => { const [kat, id] = String(key).split(':'); return ((Figur.KATALOG[kat] || []).find(x => x[0] === id) || [0, id])[1]; };
  const radDaten = () => (rad && rad.raeder.find(r => r.id === radId)) || (rad && rad.raeder[0]);
  const radTitel = id => id === 'klassisch' ? 'Glücksrad' : itemName('skin:' + id) + '-Rad';
  async function radPruefen() {
    if (!A.ich()) return;
    const alt = JSON.stringify(rad);
    try { rad = await A.wf().rpc('wf_spin_status', A.mit({})); } catch (err) { return; }
    if (JSON.stringify(rad) !== alt) raederMalen();
    abzeichen();
  }
  const radSel = p => p.art === 'coins' ? (p.wert >= 1000 ? 'legendaer' : p.wert >= 500 ? 'episch' : p.wert >= 200 ? 'selten' : 'gewoehnlich')
    : p.art === 'gems' ? (p.wert >= 5 ? 'legendaer' : p.wert >= 2 ? 'episch' : 'selten') : p.item ? 'legendaer' : 'episch';
  const ziehen = preise => { const sum = preise.reduce((a, p) => a + p.gewicht, 0); let w = Math.random() * sum; for (const p of preise) { w -= p.gewicht; if (w < 0) return p; } return preise[0]; };
  const istDuplikat = (d, x) => x.art === 'coins' && d.preise[x.index] && (d.preise[x.index].art === 'skin' || d.preise[x.index].art === 'emote');

  function radAktion() {
    const box = document.getElementById('shRadAktion'); if (!box || !rad) return;
    const d = radDaten(), coins = A.F().coins, frei = radId === 'klassisch' && rad.bereit;
    // Bezahlte Drehungen haben kein Tageslimit mehr, nur die Coins begrenzen (höchstens 10 auf einmal)
    const max = frei ? 1 : Math.max(1, Math.min(10, Math.floor(coins / d.preis)));
    box.innerHTML = `${frei ? '' : `<div class="ar-regler"><span>Menge</span><input type="range" id="shMenge" min="1" max="${max}" step="1" value="1" style="--w:0%" ${max < 2 ? 'disabled' : ''}><b id="shMengeZahl">x1</b></div>`}
      <button class="ar-knopf breit${frei || coins >= d.preis ? ' gold' : ' leise2'}" data-sh="${frei ? 'radDrehen' : 'radExtra'}" id="shRadGo">${frei ? 'Gratis drehen' : `Drehen · <span id="shRadSumme">${d.preis}</span> ${A.coin}`}</button>
      ${frei ? '<p class="ar-hand klein">Dein Gratis-Dreh für heute.</p>' : `<p class="ar-hand klein">Reicht für ${Math.floor(coins / d.preis)} ${Math.floor(coins / d.preis) === 1 ? 'Dreh' : 'Drehs'}</p>`}`;
  }
  function radMalen(bleiben) {
    const d = radDaten(), summe = d.preise.reduce((a, p) => a + p.gewicht, 0), thema = radId !== 'klassisch';
    const text = p => p.art === 'skin' ? (p.item ? e(itemName(p.item)) : 'Zufälliges Outfit') : p.art === 'emote' ? 'Zufällige Animation' : p.art === 'gems' ? gem + p.wert : A.coin + p.wert;
    const zeile = p => `<li class="sel-${radSel(p)}"><span>${text(p)}</span><b>${(p.gewicht / summe * 100).toFixed(0)} %</b></li>`;
    const top = d.preise.slice().sort((x, y) => x.gewicht - y.gewicht).slice(0, 4).map(zeile).join('');
    const alle_ = d.preise.map(zeile).join('');
    const wunsch = thema ? d.preise.find(p => p.item) : null;
    A.zeigeBlatt(`<button class="ar-zu" data-zu aria-label="Schließen">×</button><h2 class="ar-titel">${e(radTitel(radId))}</h2>
      <div class="ar-reiter sh-radwahl">${rad.raeder.map(r => `<button data-sh="radWahl" data-rad="${r.id}" class="${r.id === radId ? 'an' : ''}">${r.id === 'klassisch' ? 'Klassisch' : e(itemName('skin:' + r.id))}</button>`).join('')}</div>
      <div class="sh-rad-held${thema ? ' thema' : ''}">
        <div class="sh-rad-held-bild">${wunsch ? `<img alt="" data-foto="${e(wunsch.item)}">` : `<span class="sh-rad-mini">${d.preise.slice(0, 5).map(p => `<i class="sel-${radSel(p)}"></i>`).join('')}</span>`}</div>
        <div class="sh-rad-held-text"><b>${wunsch ? 'Hol dir ' + e(itemName(wunsch.item)) : 'Dreh dein Glück'}</b><small>${wunsch ? 'Garantiert ein Preis, mit Glück der Wunsch-Skin' : 'Coins, Gems, Outfits und Animationen'}</small></div>
      </div>
      <div id="shRadErg" class="sh-rad-erg"></div>
      <div id="shRadAktion"></div>
      <h3 class="ar-h">Top-Chancen</h3>
      <ul class="ar-liste sh-chancen">${top}</ul>
      <details class="sh-alle"><summary>Alle Gewinnchancen</summary><ul class="ar-liste sh-chancen">${alle_}</ul></details>
      ${wunsch && hat({ key: wunsch.item }) ? `<p class="ar-hand">${e(itemName(wunsch.item))} hast du schon. Ziehst du ihn nochmal, gibt es 500 Coins.</p>` : ''}
      <p class="ar-hand klein">Jeden Tag ein Dreh am klassischen Rad gratis. Alle anderen Drehungen kosten Coins, die du beim Spielen verdienst (zusammen max. 8 am Tag). Teile, die du schon hast, kommen nicht doppelt.</p>`, 'rad', {}, bleiben);
    bilderStarten(el('arBlatt'));
    radAktion();
  }
  async function radOeffnen(id) {
    if (!A.ich()) return toast('Erstelle zuerst im Clan-Tab dein Profil');
    await radPruefen();
    if (!rad) return;
    radId = id || 'klassisch';
    radMalen(false);
  }
  const radText = r => r.art === 'skin' || r.art === 'emote' ? `Neu: ${e(itemName(r.item))}` : r.art === 'gems' ? `${gem}${r.wert} Gems` : `${A.coin}${r.wert} Coins`;

  /* ---------- Die Show ---------- */
  const SHOW = { tempo: 1 };                                           // das Dev-Menü dreht hier für Zeitlupe oder Schnelldurchlauf
  const ruhig = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function bogenKarte(p) {
    const sel = radSel(p);
    let bild;
    if (p.art === 'coins') bild = `${A.coin}<em>${p.wert}</em>`;
    else if (p.art === 'gems') bild = `${gem}<em>${p.wert}</em>`;
    else if (p.item) bild = `<img alt="" data-foto="${e(p.item)}">`;
    else bild = `<em class="gross">?</em><small>${p.art === 'skin' ? 'Outfit' : 'Animation'}</small>`;
    return `<div class="rs-karte sel-${sel}"><i>${SELTEN_NAME[sel]}</i><span class="rs-kbild">${bild}</span></div>`;
  }
  // Was der "Du erhältst"-Bildschirm zeigt
  function gewinnInfo(d, x) {
    const p = d.preise[x.index] || {}, dupl = istDuplikat(d, x);
    if (dupl) return { key: p.item || null, name: p.item ? itemName(p.item) : 'Schon vorhanden', marke: 'Duplikat', zusatz: `+${x.wert} ${A.coin}`, sel: 'legendaer', klang: 'muenze' };
    if (x.art === 'skin' || x.art === 'emote') return { key: x.item, name: itemName(x.item), marke: 'Neu', zusatz: x.art === 'skin' ? 'Outfit' : 'Animation', sel: radSel(p), klang: 'sieg' };
    if (x.art === 'gems') return { icon: gem, name: `${x.wert} Gems`, marke: '+' + x.wert, zusatz: 'Gems', sel: radSel(p), klang: 'kauf' };
    return { icon: A.coin, name: `${x.wert} Coins`, marke: '+' + x.wert, zusatz: 'Coins', sel: radSel(p), klang: 'kauf' };
  }
  // quelle: Liste der Ergebnisse oder ein Promise darauf. Die Show geht sofort auf und läuft an,
  // die Server-Antwort kommt währenddessen. So gibt es nach dem Tippen keine Wartepause.
  function radShow(d, quelle, titel, anzahl) {
    anzahl = anzahl || (Array.isArray(quelle) ? quelle.length : 1);
    let ergebnisse = [];
    return new Promise((fertig, fehler) => {
      const N = 20, SCHRITT = 360 / N;
      const breite = Math.min(window.innerWidth, 560);
      // Karten wachsen mit der Bildschirmhöhe, damit der Bogen auf langen Handys nicht verloren wirkt
      const R = Math.round(breite * 1.12), KW = Math.round(2 * Math.PI * R / N - 8), KH = Math.round(Math.min(KW * 1.9, Math.max(KW * 1.6, window.innerHeight * 0.27))), OBEN = 56;
      const summe = d.preise.reduce((a, p) => a + p.gewicht, 0);
      const chance = p => { const c = p.gewicht / summe * 100; return c < 1 ? '<1' : c.toFixed(0); };
      const topPreise = d.preise.slice().sort((x, y) => x.gewicht - y.gewicht).slice(0, 3);
      const ov = document.createElement('div');
      ov.className = 'rs';
      ov.style.cssText = `--r:${R}px;--kw:${KW}px;--kh:${KH}px;--oben:${OBEN}px`;
      ov.innerHTML = `<div class="rs-welt">
          <div class="rs-titel">${e(titel)}</div>
          <div class="rs-bogen"><div class="rs-rad"><div class="rs-rand"></div></div><div class="rs-zeiger"><i></i></div></div>
          <div class="rs-boden">
            <div class="rs-top"><small>Top-Preise</small><div>${topPreise.map(p => `<div class="rs-tp">${bogenKarte(p)}<b>${chance(p)} %</b></div>`).join('')}</div></div>
            <div class="rs-meine"><small>${anzahl > 1 ? 'Deine Preise' : 'Dein Preis'}</small><div>${'<span class="rs-slot"><em>?</em></span>'.repeat(anzahl)}</div></div>
            <p class="rs-info">Tippen zum Überspringen</p>
          </div>
        </div>
        <div class="rs-enth" hidden></div>`;
      document.body.appendChild(ov);
      requestAnimationFrame(() => ov.classList.add('da'));
      const radEl = ov.querySelector('.rs-rad'), zeiger = ov.querySelector('.rs-zeiger'), welt = ov.querySelector('.rs-welt');
      // Bolzen auf dem Rand zwischen den Karten
      radEl.insertAdjacentHTML('beforeend', Array.from({ length: N }, (_, k) => `<b class="rs-bolzen" style="transform:rotate(${k * SCHRITT + SCHRITT / 2}deg) translateY(calc(-1 * var(--r) - 10px))"></b>`).join(''));
      const karten = [];
      for (let k = 0; k < N; k++) karten.push(ziehen(d.preise));
      radEl.insertAdjacentHTML('beforeend', karten.map((p, k) => `<div class="rs-platz" style="transform:rotate(${k * SCHRITT}deg) translate(-50%, calc(-1 * var(--r)))">${bogenKarte(p)}</div>`).join(''));
      const plaetze = Array.from(radEl.querySelectorAll('.rs-platz'));
      bilderStarten(ov);

      let phi = -SCHRITT * 2.5 + Math.random() * SCHRITT, nr = 0, skip = null, letzterTick = 0, letzteW = 0;
      radEl.style.transform = `rotate(${phi}deg)`;
      const karteOben = () => (((Math.round(-phi / SCHRITT)) % N) + N) % N;

      function drehe(x) {
        return new Promise(gedreht => {
          // Gewinnkarte sitzt gerade unten (unsichtbar) und kommt nach ein paar Runden oben am Zeiger an
          const w = (karteOben() + N / 2) % N;
          letzteW = w;
          plaetze[w].innerHTML = bogenKarte(d.preise[x.index] || karten[w]);
          bilderStarten(plaetze[w]);
          // Großes Bild für Zoom und "Du erhältst" schon während des Drehens vorbereiten
          const gKey = x.item || (d.preise[x.index] || {}).item, gIt = gKey && alle().find(i => i.key === gKey);
          if (gIt) foto(gIt, true);
          const jitter = (Math.random() * 0.45 - 0.3) * SCHRITT, ueber = SCHRITT * 0.22;
          const zielMod = ((-w * SCHRITT + jitter - phi) % 360 + 360) % 360;
          const D = 360 * (nr === 0 ? 3 : 2) + zielMod, start = phi;
          const T = (ruhig() ? 1400 : nr === 0 ? 5600 : 4200) / SHOW.tempo;
          let t0 = performance.now();
          skip = () => { const jetzt = performance.now(); if (jetzt - t0 < T * 0.82) t0 = jetzt - T * 0.82; };
          let tickNr = Math.floor((phi + SCHRITT / 2) / SCHRITT);
          if (window.Klang) Klang.effekt('radStart');
          (function bild(jetzt) {
            const t = Math.min(1, (jetzt - t0) / T);
            // schnell los, lange auslaufen, am Ende ein kleines Stück zu weit und zurück einrasten
            const a = t < 0.9 ? (1 - Math.pow(1 - t / 0.9, 4)) * (D + ueber) : D + ueber - ueber * (1 - Math.pow(1 - (t - 0.9) / 0.1, 2));
            phi = start + a;
            radEl.style.transform = `rotate(${phi}deg)`;
            const n = Math.floor((phi + SCHRITT / 2) / SCHRITT);
            if (n !== tickNr) {
              tickNr = n;
              zeiger.animate([{ transform: 'rotate(-26deg)' }, { transform: 'rotate(6deg)', offset: 0.6 }, { transform: 'rotate(0)' }], { duration: 220, easing: 'ease-out' });
              if (window.Klang && jetzt - letzterTick > 45) { letzterTick = jetzt; Klang.effekt('radTick'); }
            }
            if (t < 1) requestAnimationFrame(bild); else { skip = null; gedreht(plaetze[w]); }
          })(t0);
        });
      }
      const warte = ms => new Promise(r => setTimeout(r, ms / SHOW.tempo));
      // Zoom: Der Hintergrund wird nur leicht mitvergrößert. Die Gewinnkarte selbst ist eine eigene Karte,
      // die von Anfang an in Endgröße gezeichnet und nur kleiner gestartet wird. So bleibt sie am Ende gestochen scharf.
      function zoomAuf(platz) {
        const k = platz.firstElementChild, rw = welt.getBoundingClientRect(), rk = k.getBoundingClientRect();
        const cx = rk.left + rk.width / 2 - rw.left, cy = rk.top + rk.height / 2 - rw.top;
        const zielX = rw.width / 2, zielY = rw.height * 0.44;
        welt.style.transformOrigin = `${cx}px ${cy}px`;
        welt.style.setProperty('--zx', zielX - cx + 'px'); welt.style.setProperty('--zy', zielY - cy + 'px');
        welt.style.transitionDuration = 700 / SHOW.tempo + 'ms';
        welt.classList.add('zoom');
        const s = Math.min(2, rw.width * 0.64 / KW, rw.height * 0.6 / KH);
        const winkel = (((letzteW * SCHRITT + phi) % 360) + 540) % 360 - 180;
        const fokus = document.createElement('div');
        fokus.className = 'rs-fokus';
        fokus.style.cssText = `--s:${s};width:${KW * s}px;height:${KH * s}px;left:${zielX - KW * s / 2}px;top:${zielY - KH * s / 2}px`;
        fokus.innerHTML = k.outerHTML;
        fokus.firstElementChild.classList.add('gewinn');
        ov.appendChild(fokus);
        k.style.visibility = 'hidden';
        const img = fokus.querySelector('img[data-foto]'), it = img && alle().find(i => i.key === img.dataset.foto);
        if (it) foto(it, true).then(erg => { if (fokus.isConnected) zeigen(img, erg); });
        fokus.animate([
          { transform: `translate(${cx - zielX}px, ${cy - zielY}px) rotate(${winkel}deg) scale(${1 / s})` },
          { transform: 'none' }
        ], { duration: 650 / SHOW.tempo, easing: 'cubic-bezier(.25,.9,.3,1.15)', fill: 'backwards' });
        if (window.Klang) Klang.effekt('radZoom');
      }
      function zoomZurueck() {
        welt.classList.remove('zoom');
        ov.querySelectorAll('.rs-fokus').forEach(f => f.remove());
        ov.querySelectorAll('.rs-platz .rs-karte').forEach(k => { k.style.visibility = ''; });
      }
      function enthuellen(x, mehr) {
        return new Promise(weiter => {
          const g = gewinnInfo(d, x), box = ov.querySelector('.rs-enth');
          box.className = `rs-enth sel-${g.sel}`;
          box.innerHTML = `<div class="rs-strahlen"></div>
            <div class="rs-enth-in">
              <div class="rs-figur">${g.key ? `<img alt="" data-foto="${e(g.key)}">` : `<span class="rs-icon">${g.icon || ''}</span>`}</div>
              <div class="rs-schild"><small>Du erhältst:</small><b>${e(g.name)}</b></div>
              <div class="rs-marke${g.marke === 'Duplikat' ? ' dupl' : ''}">${e(g.marke)}<small>${g.zusatz}</small></div>
              ${ergebnisse.length > 1 ? `<p class="rs-zaehler">${nr} von ${ergebnisse.length}</p>` : ''}
              <button class="ar-knopf breit gold rs-weiter">${mehr ? 'Weiter drehen' : 'Einsammeln'}</button>
            </div>`;
          box.hidden = false;
          const img = box.querySelector('img[data-foto]');
          if (img) { const it = alle().find(i => i.key === g.key); if (it) foto(it, true).then(erg => zeigen(img, erg)); }
          void box.offsetWidth; box.classList.add('auf');
          if (window.Klang) Klang.effekt(g.klang);
          box.querySelector('.rs-weiter').onclick = ev => { ev.stopPropagation(); box.classList.remove('auf'); setTimeout(() => { box.hidden = true; weiter(); }, 220 / SHOW.tempo); };
        });
      }
      ov.addEventListener('click', () => { if (skip) skip(); });

      (async () => {
        try { [ergebnisse] = await Promise.all([Promise.resolve(quelle), warte(450)]); }
        catch (err) { ov.classList.remove('da'); setTimeout(() => ov.remove(), 250); return fehler(err); }
        if (!ergebnisse.length) { ov.remove(); return fertig(ergebnisse); }
        ov.querySelectorAll('.rs-slot').forEach((x, i) => { if (i >= ergebnisse.length) x.remove(); });
        for (let i = 0; i < ergebnisse.length; i++) {
          const platz = await drehe(ergebnisse[i]); nr++;
          await warte(260);
          zoomAuf(platz);
          await warte(900);
          await enthuellen(ergebnisse[i], i < ergebnisse.length - 1);
          zoomZurueck();
          // Gewonnene Karte wandert unten in "Deine Preise"
          const slot = ov.querySelectorAll('.rs-slot')[i], x = ergebnisse[i];
          if (slot) {
            slot.innerHTML = bogenKarte(Object.assign({}, d.preise[x.index] || x, x.item ? { item: x.item } : {}));
            slot.classList.add('voll'); bilderStarten(slot);
          }
          if (i < ergebnisse.length - 1) await warte(500);
        }
        ov.classList.remove('da');
        setTimeout(() => { ov.remove(); fertig(ergebnisse); }, 250);
      })();
    });
  }

  async function radDrehen(extra, menge) {
    if (dreht) return; dreht = true;
    const box = document.getElementById('shRadAktion'); if (box) box.innerHTML = '';
    const d = radDaten(), n = menge || 1;
    const anfragen = (async () => {
      const liste = [];
      try { for (let i = 0; i < n; i++) liste.push(await A.wf().rpc('wf_spin_drehen', A.mit({ p_rad: radId, p_extra: !!extra }))); }
      catch (err) { if (!liste.length) throw err; toast(err.message); }
      return liste;
    })();
    let ergebnisse;
    try { ergebnisse = await radShow(d, anfragen, radTitel(radId), n); }
    catch (err) { dreht = false; radAktion(); return toast(err.message); }
    dreht = false;
    const erg = document.getElementById('shRadErg');
    if (erg) erg.innerHTML = `<b>Zuletzt gewonnen</b>${ergebnisse.map(x => `<div>${istDuplikat(d, x) ? `Schon vorhanden, dafür ${A.coin}${x.wert} Coins` : radText(x)}</div>`).join('')}`;
    await A.figurLaden(); zeichnen(); await radPruefen(); radAktion();
  }

  /* ---------- Rad-Show ohne Server, für das Dev-Menü ---------- */
  const DEMO_PREISE = id => id === 'klassisch'
    ? [{ art: 'coins', wert: 50, gewicht: 30 }, { art: 'coins', wert: 100, gewicht: 25 }, { art: 'coins', wert: 250, gewicht: 14 }, { art: 'coins', wert: 500, gewicht: 7 }, { art: 'coins', wert: 1000, gewicht: 2 },
       { art: 'gems', wert: 1, gewicht: 10 }, { art: 'gems', wert: 3, gewicht: 5 }, { art: 'gems', wert: 5, gewicht: 1 }, { art: 'emote', gewicht: 4 }, { art: 'skin', gewicht: 2 }]
    : [{ art: 'skin', item: 'skin:' + id, gewicht: 3 }, { art: 'coins', wert: 100, gewicht: 25 }, { art: 'coins', wert: 250, gewicht: 20 }, { art: 'coins', wert: 500, gewicht: 10 },
       { art: 'gems', wert: 1, gewicht: 12 }, { art: 'gems', wert: 3, gewicht: 5 }, { art: 'emote', gewicht: 8 }, { art: 'skin', gewicht: 4 }];
  function radDemo({ id = 'klassisch', ergebnis = 'zufall', menge = 1 } = {}) {
    const echt = rad && rad.raeder.find(r => r.id === id);
    const d = { preise: echt ? echt.preise : DEMO_PREISE(id) };
    const zufallsTeil = kat => { const l = (Figur.KATALOG[kat] || []).filter(x => x[0] !== 'nichts'); return kat + ':' + l[Math.floor(Math.random() * l.length)][0]; };
    const idx = f => Math.max(0, d.preise.findIndex(f));
    const machen = () => {
      let i;
      if (ergebnis === 'wunsch' || ergebnis === 'duplikat') i = idx(p => p.item) || idx(p => p.art === 'skin');
      else if (ergebnis === 'coins') i = d.preise.reduce((b, p, k) => p.art === 'coins' && p.wert > (d.preise[b].art === 'coins' ? d.preise[b].wert : -1) ? k : b, 0);
      else if (ergebnis === 'gems') i = idx(p => p.art === 'gems');
      else i = d.preise.indexOf(ziehen(d.preise));
      const p = d.preise[i];
      if (ergebnis === 'duplikat') return { art: 'coins', wert: 500, index: i };
      if (p.art === 'skin' || p.art === 'emote') return { art: p.art, item: p.item || zufallsTeil(p.art), index: i };
      return { art: p.art, wert: p.wert, index: i };
    };
    return radShow(d, Array.from({ length: Math.max(1, Math.min(5, menge)) }, machen), radTitel(id) + ' (Test)');
  }
  document.addEventListener('input', ev => {
    if (ev.target.id !== 'shMenge') return;
    const n = +ev.target.value, d = radDaten(), max = +ev.target.max;
    ev.target.style.setProperty('--w', (max > 1 ? (n - 1) / (max - 1) * 100 : 0) + '%');
    const z = document.getElementById('shMengeZahl'), sum = document.getElementById('shRadSumme');
    if (z) z.textContent = 'x' + n; if (sum) sum.textContent = d.preis * n;
  });
  document.addEventListener('click', ev => {
    const b = ev.target.closest('#arBlatt [data-sh="radDrehen"], #arBlatt [data-sh="radExtra"], #arBlatt [data-sh="radWahl"]'); if (!b) return;
    if (b.dataset.sh === 'radWahl') { if (dreht || b.dataset.rad === radId) return; radId = b.dataset.rad; radMalen(true); }
    else { const m = document.getElementById('shMenge'); radDrehen(b.dataset.sh === 'radExtra', m ? +m.value : 1); }
  });
  tab.addEventListener('click', ev => {
    const b = ev.target.closest('[data-sh]'); if (!b) return;
    const a = b.dataset.sh;
    if (a === 'rad') radOeffnen(b.dataset.rad);
    else if (a === 'login') tagHolen('login', null, b);
    else if (a === 'quest') tagHolen('quest', b.dataset.id, b);
    else if (a === 'alle') A.editor('skins');
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
  window.Shop = { zeichnen, auswahl, foto, radDemo, SHOW, RAEDER, radTitel, _test: { cache } };
})();
