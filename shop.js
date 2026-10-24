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
    look[it.kat] = it.id;
    return look;
  }
  const kurz = str => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
  const ck = it => it.key + '#' + kurz(JSON.stringify(lookFuer(it)));
  const bewegt = it => it.kat === 'emote' || it.kat === 'intro';
  function foto(it) {
    const schluessel = ck(it);
    if (cache.has(schluessel)) return Promise.resolve(cache.get(schluessel));
    kette = kette.then(async () => {
      if (cache.has(schluessel)) return cache.get(schluessel);
      const b = await buehne(), T = WF3D.T;
      const look = lookFuer(it);
      const g = new T.Group(), f = Figur.bauen(look, { boese: it.kat === 'intro' });
      f.rotation.y = 0.35; g.add(f);
      let bg = null;
      if (it.kat === 'hg') { bg = Figur.hintergrund(it.id); bg.position.set(0, 0, -4); g.add(bg); f.scale.setScalar(0.85); }
      b.szene.add(g);
      const k = b.kamera;
      if (it.kat === 'kopf') { k.position.set(0, 2.0, 5.2); k.lookAt(0, 1.8, 0); }
      else if (it.kat === 'extra') { k.position.set(0, 1.55, 5.6); k.lookAt(0, 1.4, 0); }
      else { k.position.set(0, 1.5, it.kat === 'emote' ? 8.4 : 7.6); k.lookAt(0, 1.15, 0); }
      const knipsen = t => {
        Figur.haltung(f, bewegt(it) ? it.id : 'idle', t);
        if (bg && bg.userData.tick) bg.userData.tick(1.2);
        b.r.render(b.szene, k);
        return b.r.domElement.toDataURL('image/png');
      };
      let ergebnis;
      if (bewegt(it)) {
        const p = Figur.PERIODE[it.id] || 1.5, n = 10, bilder = [];
        for (let i = 0; i < n; i++) bilder.push(knipsen(p * i / n));
        ergebnis = { bilder, dauer: Math.max(70, p * 1000 / n) };
      } else ergebnis = knipsen(0.3);
      b.szene.remove(g);
      cache.set(schluessel, ergebnis);
      return ergebnis;
    }).catch(() => null);
    return kette;
  }
  // Animierte Karten: ein einziger Takt wechselt die Bilder, nur was im Bild ist
  const laeufer = new Set();
  function zeigen(img, erg) {
    if (!erg) return;
    if (typeof erg === 'string') { img.src = erg; img.classList.add('da'); return; }
    img.src = erg.bilder[0]; img.classList.add('da');
    laeufer.add({ img, bilder: erg.bilder, dauer: erg.dauer, i: 0, next: 0 });
  }
  setInterval(() => {
    if (!laeufer.size || document.hidden) return;
    const jetzt = performance.now(), hoehe = window.innerHeight;
    laeufer.forEach(p => {
      if (!p.img.isConnected) { laeufer.delete(p); return; }
      if (jetzt < p.next) return;
      const r = p.img.getBoundingClientRect(); if (r.bottom < 0 || r.top > hoehe) return;
      p.i = (p.i + 1) % p.bilder.length; p.img.src = p.bilder[p.i]; p.next = jetzt + p.dauer;
    });
  }, 40);
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
      <div id="shTag"></div>
      <button class="sh-rad-karte" data-sh="rad" id="shRadKnopf"><span class="sh-rad-icon">${gem}</span><span><b>Glücksrad</b><small id="shRadText">Einmal am Tag gratis drehen</small></span><i id="shRadI">Drehen</i></button>
      <div class="sh-restock"><span>Neues Sortiment in</span><b id="shUhr">${rest()}</b></div>
      ${highlight(a.highlight)}
      <div class="sh-abschnitt"><h3>Heute</h3></div>
      <div class="sh-raster vier">${a.taeglich.map(i => karte(i, true)).join('')}</div>
      <div class="sh-abschnitt"><h3>Diese Woche</h3></div>
      <div class="sh-woche">${a.woche.map(i => highlight(i, true)).join('')}</div>
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

  /* ---------- Täglicher Login und Tagesaufgaben (Server: wf_login_*, wf_quests, wf_quest_holen) ---------- */
  let tagDaten = null;
  async function tagLaden() {
    const box = el('shTag');
    if (!A.ich()) { if (box) box.innerHTML = ''; return; }
    try { tagDaten = { l: await A.wf().rpc('wf_login_status', A.mit({})), q: await A.wf().rpc('wf_quests', A.mit({})) }; } catch (err) { return; }
    abzeichen();
    if (!box) return;
    const { l, q } = tagDaten;
    const tage = l.belohnungen.map((b, i) => {
      const n = i + 1, fertig = n < l.tag || (n === l.tag && l.geholt);
      return `<span class="${fertig ? 'da' : ''}${n === l.tag ? ' heute' : ''}"><small>Tag ${n}</small>${b.gems ? gem + b.gems : A.coin + b.coins}</span>`;
    }).join('');
    const quest = x => {
      const fertig = x.stand >= x.ziel;
      return `<div class="sh-quest${fertig ? ' fertig' : ''}"><span class="sh-qtext"><b>${e(x.text)}</b><i class="sh-qbalken"><u style="width:${Math.min(100, x.stand / x.ziel * 100)}%"></u></i></span>
        ${x.geholt ? '<span class="so-bot">Erledigt</span>' : fertig ? `<button class="so-mini" data-sh="quest" data-id="${e(x.id)}">+${x.coins} ${A.coin}</button>` : `<span class="sh-lohn">${A.coin}${x.coins}</span>`}</div>`;
    };
    box.innerHTML = `
      <div class="sh-abschnitt"><h3>Tägliche Belohnung</h3></div>
      <div class="sh-login"><div class="sh-tage">${tage}</div>
        ${l.geholt ? '<p class="sh-hinweis">Heute schon abgeholt, morgen wartet die nächste.</p>' : `<button class="ar-knopf breit gold" data-sh="login">Tag ${l.tag} abholen</button>`}</div>
      <div class="sh-abschnitt"><h3>Tagesaufgaben</h3></div>
      <div class="sh-quests">${q.quests.map(quest).join('')}
        <div class="sh-quest bonus${q.bonus_bereit ? ' fertig' : ''}"><span class="sh-qtext"><b>Alle drei geschafft</b></span>
          ${q.bonus_geholt ? '<span class="so-bot">Erledigt</span>' : q.bonus_bereit ? `<button class="so-mini" data-sh="quest" data-id="bonus">+1 ${gem}</button>` : `<span class="sh-lohn">${gem}1</span>`}</div></div>`;
  }
  // roter Punkt am Shop-Symbol, wenn etwas abzuholen ist
  function abzeichen() {
    const b = document.querySelector('.nav [data-tab="shop"]'); if (!b || !tagDaten) return;
    const { l, q } = tagDaten;
    b.classList.toggle('badge', !l.geholt || q.quests.some(x => x.stand >= x.ziel && !x.geholt) || (q.bonus_bereit && !q.bonus_geholt));
  }
  async function tagHolen(was, id) {
    try {
      const r = await A.wf().rpc(was === 'login' ? 'wf_login_holen' : 'wf_quest_holen', was === 'login' ? A.mit({}) : A.mit({ p_quest: id }));
      toast(`${r.coins ? '+' + r.coins + ' Coins' : ''}${r.coins && r.gems ? ' und ' : ''}${r.gems ? '+' + r.gems + ' Gems' : ''}`);
      if (window.Klang) Klang.effekt('muenze');
      await A.figurLaden(); zeichnen();
    } catch (err) { toast(err.message); }
  }
  setTimeout(tagLaden, 2500);
  setTimeout(radPruefen, 3000);
  setInterval(() => { if (!document.hidden && A.ich()) tagLaden(); }, 60000);

  /* ---------- Glücksrad: 1 Gratis-Dreh am Tag, Extra-Drehungen nur mit Coins (Server: wf_spin_*) ---------- */
  let rad = null, dreht = false, radWinkel = 0;
  async function radPruefen() {
    if (!A.ich()) return;
    try { rad = await A.wf().rpc('wf_spin_status', A.mit({})); } catch (err) { return; }
    const t = el('shRadText'), i = el('shRadI'), k = document.getElementById('shRadKnopf');
    if (t) t.textContent = rad.bereit ? 'Dein Gratis-Dreh wartet' : 'Morgen wieder einen Gratis-Dreh';
    if (i) i.textContent = rad.bereit ? 'Drehen' : 'Ansehen';
    if (k) k.classList.toggle('bereit', !!rad.bereit);
  }
  const radName = p => p.art === 'skin' ? 'Skin' : p.art === 'emote' ? 'Tanz' : String(p.wert);
  const radFarbe = (p, i) => p.art === 'gems' ? '#C9F2EC' : p.art === 'skin' ? '#F2C14E' : p.art === 'emote' ? '#DFF3FF' : (i % 2 ? '#F6D8A8' : '#FFF1C4');
  function radSvg(preise) {
    const n = preise.length, w = 360 / n, r = 150, c = 160;
    const pt = (grad, rr) => { const a = (grad - 90) * Math.PI / 180; return [c + rr * Math.cos(a), c + rr * Math.sin(a)]; };
    let h = '';
    preise.forEach((p, i) => {
      const [x1, y1] = pt(i * w, r), [x2, y2] = pt((i + 1) * w, r), mitte = i * w + w / 2, [tx, ty] = pt(mitte, r * 0.68);
      const bild = p.art === 'gems' ? 'gem' : p.art === 'coins' ? 'coin' : '';
      h += `<path d="M${c} ${c} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${radFarbe(p, i)}" stroke="#2B2A33" stroke-width="3"/>
        <g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${mitte})"><text text-anchor="middle" y="${bild ? -4 : 8}" font-family="var(--dick)" font-size="${bild ? 20 : 22}" fill="#2B2A33">${radName(p)}</text>
        ${bild ? `<image href="arena/${bild}.svg" x="-9" y="1" width="18" height="18"/>` : ''}</g>`;
    });
    return `<svg class="sh-rad-svg" viewBox="0 0 320 320" id="shRadSvg"><circle cx="160" cy="160" r="154" fill="#FAF6EB" stroke="#2B2A33" stroke-width="4"/><g id="shRadDreh" style="transform-origin:160px 160px;transform:rotate(${radWinkel}deg)">${h}</g><circle cx="160" cy="160" r="14" fill="#F2B632" stroke="#2B2A33" stroke-width="4"/></svg>`;
  }
  function radAktion() {
    const box = document.getElementById('shRadAktion'); if (!box || !rad) return;
    const coins = A.F().coins;
    box.innerHTML = rad.bereit ? '<button class="ar-knopf breit gold" data-sh="radDrehen">Gratis drehen</button>'
      : rad.extra_rest > 0 ? `<p class="ar-hand">Gratis-Dreh für heute benutzt.</p><button class="ar-knopf breit${coins >= rad.extra_preis ? '' : ' leise2'}" data-sh="radExtra">Nochmal drehen · ${rad.extra_preis} ${A.coin}</button><p class="ar-hand klein">Noch ${rad.extra_rest} Extra-Drehungen heute</p>`
      : '<p class="ar-hand">Heute ist alles gedreht. Morgen gibt es den nächsten Gratis-Dreh.</p>';
  }
  async function radOeffnen() {
    if (!A.ich()) return toast('Erstelle zuerst im Clan-Tab dein Profil');
    await radPruefen();
    if (!rad) return;
    radWinkel = 0;
    const summe = rad.preise.reduce((a, p) => a + p.gewicht, 0);
    const text = p => p.art === 'skin' ? 'Zufälliges Outfit' : p.art === 'emote' ? 'Zufällige Animation' : p.art === 'gems' ? gem + p.wert : A.coin + p.wert;
    const chancen = rad.preise.map(p => `<li><span>${text(p)}</span><b>${(p.gewicht / summe * 100).toFixed(0)} %</b></li>`).join('');
    A.zeigeBlatt(`<button class="ar-zu" data-zu aria-label="Schließen">×</button><h2 class="ar-titel">Glücksrad</h2>
      <div class="sh-rad"><div class="sh-rad-zeiger"></div>${radSvg(rad.preise)}</div>
      <div id="shRadErg" class="sh-rad-erg"></div>
      <div id="shRadAktion"></div>
      <h3 class="ar-h">Gewinnchancen</h3>
      <ul class="ar-liste sh-chancen">${chancen}</ul>
      <p class="ar-hand klein">Jeden Tag ein Dreh gratis. Extra-Drehungen kosten Coins, die du beim Spielen verdienst (max. 5 am Tag). Outfits und Animationen, die du schon hast, kommen nicht doppelt. Hast du alle, gibt es 500 Coins.</p>`, 'rad');
    radAktion();
  }
  async function radDrehen(extra) {
    if (dreht) return; dreht = true;
    const box = document.getElementById('shRadAktion'); if (box) box.innerHTML = '';
    let r;
    try { r = await A.wf().rpc('wf_spin_drehen', A.mit({ p_extra: !!extra })); } catch (err) { dreht = false; radAktion(); return toast(err.message); }
    const n = rad.preise.length, w = 360 / n, g = document.getElementById('shRadDreh'), erg0 = document.getElementById('shRadErg');
    if (erg0) erg0.textContent = '';
    const ziel = -(r.index * w + w / 2) + (Math.random() - 0.5) * w * 0.6;
    radWinkel = radWinkel + 1800 + ((ziel - radWinkel) % 360 + 360) % 360;
    if (g) { g.style.transition = 'transform 4.2s cubic-bezier(.12,.7,.15,1)'; requestAnimationFrame(() => { g.style.transform = `rotate(${radWinkel}deg)`; }); }
    if (window.Klang) Klang.effekt('countdown');
    setTimeout(async () => {
      dreht = false;
      const erg = document.getElementById('shRadErg');
      if (erg) {
        if (r.art === 'skin' || r.art === 'emote') {
          const [kat, id] = r.item.split(':'), name = ((Figur.KATALOG[kat] || []).find(x => x[0] === id) || [0, id])[1];
          erg.innerHTML = `Neu: ${e(name)}<img class="sh-rad-bild" alt="">`;
          const it = alle().find(i => i.key === r.item), img = erg.querySelector('img');
          if (it && img) { await A.figurLaden(); foto(it).then(x => zeigen(img, x)); }
        } else erg.innerHTML = `Gewonnen: ${r.art === 'gems' ? gem + r.wert + ' Gems' : A.coin + r.wert + ' Coins'}`;
      }
      if (window.Klang) Klang.effekt('sieg');
      await A.figurLaden(); zeichnen(); await radPruefen(); radAktion();
    }, 4400);
  }
  document.addEventListener('click', ev => {
    const b = ev.target.closest('#arBlatt [data-sh="radDrehen"], #arBlatt [data-sh="radExtra"]'); if (b) radDrehen(b.dataset.sh === 'radExtra');
  });
  tab.addEventListener('click', ev => {
    const b = ev.target.closest('[data-sh]'); if (!b) return;
    const a = b.dataset.sh;
    if (a === 'rad') radOeffnen();
    else if (a === 'login') tagHolen('login');
    else if (a === 'quest') tagHolen('quest', b.dataset.id);
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
  window.Shop = { zeichnen, auswahl, foto, _test: { cache } };
})();
