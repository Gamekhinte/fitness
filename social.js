/* ================= WINTERFORM SOCIAL =================
   Clan-Tab wie "Social" in Clash Royale: oben ein Holzschild mit Profil, Clan und Duell,
   darunter die Freundesliste (online zuerst). Jeder Spieler hat eine eigene ID (#ABCD2345).

   Profil mit Banner (Farbe und Muster), Clan mit Emblem (Form, Symbol, zwei Farben),
   Rollen Leiter, Admin und Mitglied. Der erste Clan ist gratis, jeder weitere kostet 1000 Coins.
   Alles Schreiben läuft über die Server-Funktionen (wf_freund_*, wf_gruppe_*, wf_banner_speichern).

   Läuft nach arena.js und crew.js. Nutzt window.WF (Identität, rpc) und window.ArenaUI (Fenster, Coins). */
(function () {
  if (!window.ArenaUI || !window.WF) return;
  const A = window.ArenaUI, W = () => window.WF, ich = () => W().ich();
  const e = s => esc(s);
  const el = id => document.getElementById(id);          // $() liefert bei fehlendem Element einen Platzhalter, hier brauchen wir null
  const rpc = (n, a) => W().rpc(n, a);
  const mit = a => Object.assign({ p_id: ich().id, p_geheim: ich().geheim }, a);
  const INK = '#2B2826';
  const pokal = '<img class="so-ico" src="arena/pokal.svg" alt="">';
  const S = { info: null, liste: null, blockiert: [], laedt: false, nochmal: false, pendingTag: null };
  let C = null, B = null;                         // Clan-Editor, Banner-Editor

  /* ---------- Farben, Banner, Avatar, Emblem ---------- */
  const FARBEN = ['#D9643A', '#F2C14E', '#7CD4FF', '#3E7A55', '#3FA9E6', '#E86AA6', '#2B2826', '#FAF6EB', '#F08A3A', '#3CBFB0', '#9C7448', '#1F3A5F'];
  const ganz = (v, max, std) => { v = Number(v); return Number.isInteger(v) ? Math.max(0, Math.min(max, v)) : std; };
  const bannerOk = b => ({ farbe: ganz(b && b.farbe, 11, 0), muster: ganz(b && b.muster, 5, 0) });
  const emblemOk = m => ({ form: ganz(m && m.form, 3, 0), symbol: ganz(m && m.symbol, 15, 0), c1: ganz(m && m.c1, 11, 0), c2: ganz(m && m.c2, 11, 1) });

  const MUSTER = [
    '',
    '<path d="M-6 6l12-12M0 24L24 0M18 30l12-12" stroke="#FAF6EB" stroke-opacity=".35" stroke-width="5"/>',
    '<circle cx="6" cy="6" r="3" fill="#FAF6EB" fill-opacity=".35"/><circle cx="18" cy="18" r="3" fill="#FAF6EB" fill-opacity=".35"/>',
    '<path d="M0 12l6-6 6 6 6-6 6 6" fill="none" stroke="#FAF6EB" stroke-opacity=".35" stroke-width="3"/>',
    '<path d="M0 12q6-8 12 0t12 0" fill="none" stroke="#FAF6EB" stroke-opacity=".35" stroke-width="3"/>',
    '<rect width="12" height="12" fill="#FAF6EB" fill-opacity=".25"/><rect x="12" y="12" width="12" height="12" fill="#FAF6EB" fill-opacity=".25"/>'
  ];
  const MUSTER_NAMEN = ['Schlicht', 'Streifen', 'Punkte', 'Zickzack', 'Wellen', 'Karo'];
  function bannerBg(b) {
    b = bannerOk(b);
    const m = MUSTER[b.muster];
    const bild = m ? ` url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">${m}</svg>`).replace(/'/g, '%27')}')` : '';
    return FARBEN[b.farbe] + bild;
  }

  // Kleines Gesicht für Listen (die 3D-Figur wäre dafür zu schwer): Haut, Haar und Oberteil aus dem Aussehen
  function avatar(look, banner, px) {
    const a = look || {}, haut = a.haut || '#EBC199', haar = a.haarfarbe || '#5A3A22', top = a.oberteil || '#3FA9E6';
    return `<span class="so-av" style="width:${px}px;height:${px}px;background:${bannerBg(banner)}"><svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 48c0-9 7-14 17-14s17 5 17 14z" fill="${top}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="24" cy="22" r="10.5" fill="${haut}" stroke="${INK}" stroke-width="2.5"/>
      <path d="M13.5 21c-.5-8 4-12.5 10.5-12.5S34.5 13 34.5 21c-3-4.5-6.5-5.5-10.5-5.500S16.5 16.5 13.5 21z" fill="${haar}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="20.2" cy="23.5" r="1.5" fill="${INK}"/><circle cx="27.8" cy="23.5" r="1.5" fill="${INK}"/></svg></span>`;
  }

  const fl = (d, F, O) => `<path d="${d}" fill="${F}" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/>`;
  const pg = (p, F, O) => `<polygon points="${p}" fill="${F}" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/>`;
  const li = (d, F, O) => `<path d="${d}" fill="none" stroke="${O}" stroke-width="4.6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${F}" stroke-width="2" stroke-linecap="round"/>`;
  const SYM = [
    (F, O) => pg('12,2.5 14.9,8.6 21.5,9.4 16.6,14 17.9,20.6 12,17.3 6.1,20.6 7.4,14 2.5,9.4 9.1,8.6', F, O),            // Stern
    (F, O) => pg('13.5,2 5,13.5 11,13.5 9.5,22 19,9.5 12.5,9.5', F, O),                                                              // Blitz
    (F, O) => fl('M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-2.5 1.2-4 2.6-5.3.2 1.4.8 2.3 1.6 2.800C10 8.5 10.5 5 12 2z', F, O),            // Flamme
    (F, O) => pg('3,18.5 3,7 8,12 12,5 16,12 21,7 21,18.5', F, O),                                                                           // Krone
    (F, O) => li('M12 3v18M4.2 7.500l15.6 9M19.8 7.500l-15.6 9', F, O),                                                                      // Schneeflocke
    (F, O) => pg('2,20 9,7 13,13 16,9 22,20', F, O),                                                                                              // Berg
    (F, O) => fl('M12 21C4 14.5 3 10 3 8a4.5 4.5 0 0 1 9-1.500A4.5 4.5 0 0 1 21 8c0 2-1 6.5-9 13z', F, O),                                // Herz
    (F, O) => fl('M2 9h2v6H2zM4 7h3v10H4zM7 11h10v2H7zM17 7h3v10h-3zM20 9h2v6h-2z', F, O),                                                       // Hantel
    (F, O) => fl('M7 3h10v6a5 5 0 0 1-10 0zM7 5H3.500v1.500A3.5 3.5 0 0 0 7 10zM17 5h3.500v1.500A3.5 3.5 0 0 1 17 10zM11 14h2v4h-2zM8 18h8v3H8z', F, O),   // Pokal
    (F, O) => fl('M12 2l2.2 3v11h-4.400V5zM7 16h10v2.400H7zM10.8 18.400h2.400V22h-2.400z', F, O),                                                   // Schwert
    (F, O) => `<circle cx="12" cy="12" r="4.6" fill="${F}" stroke="${O}" stroke-width="1.5"/>` + li('M12 2.500v3M12 18.500v3M2.5 12h3M18.5 12h3M5.3 5.300l2.1 2.100M16.6 16.600l2.1 2.100M18.7 5.300l-2.1 2.100M7.4 16.600l-2.1 2.1', F, O),   // Sonne
    (F, O) => fl('M20 14.500A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.500z', F, O),                                                              // Mond
    (F, O) => [[12, 16, 5, 4], [6, 10, 2.2, 2.6], [10, 6.5, 2.2, 2.6], [14, 6.5, 2.2, 2.6], [18, 10, 2.2, 2.6]]
      .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${F}" stroke="${O}" stroke-width="1.5"/>`).join(''),        // Tatze
    (F, O) => pg('12,21.5 2.5,9.5 6.5,4 17.5,4 21.5,9.5', F, O) + `<path d="M2.5 9.500h19M9 4l3 17.500L15 4" fill="none" stroke="${O}" stroke-width="1.2" stroke-linejoin="round"/>`,   // Diamant
    (F, O) => pg('12,2 18,10 15,10 20,17 13.5,17 13.5,22 10.5,22 10.5,17 4,17 9,10 6,10', F, O),                                              // Tanne
    (F, O) => fl('M12 2c3 3 4 7 4 11l-2 3h-4l-2-3c0-4 1-8 4-11zM8 14l-3 4 4-1zM16 14l3 4-4-1z', F, O) + `<circle cx="12" cy="9" r="1.8" fill="${O}"/>`   // Rakete
  ];
  const SYM_NAMEN = ['Stern', 'Blitz', 'Flamme', 'Krone', 'Flocke', 'Berg', 'Herz', 'Hantel', 'Pokal', 'Schwert', 'Sonne', 'Mond', 'Tatze', 'Diamant', 'Tanne', 'Rakete'];
  const FORMEN = [
    'M8 8h48v26c0 12-10 19-24 24C18 53 8 46 8 34z',                       // Schild
    'M32 6a26 26 0 1 0 .01 0z',                                           // Rund
    'M7 10l12 4 13-6 13 6 12-4v24c0 12-11 19-25 23C18 53 7 46 7 34z',     // Wappen
    'M32 5L56 18v28L32 59 8 46V18z'                                       // Sechseck
  ];
  const FORM_NAMEN = ['Schild', 'Rund', 'Wappen', 'Sechseck'];
  function emblem(m, px) {
    m = emblemOk(m);
    const f = FORMEN[m.form], c1 = FARBEN[m.c1], c2 = FARBEN[m.c2];
    return `<svg class="so-emb" style="width:${px}px;height:${Math.round(px * 68 / 64)}px" viewBox="0 0 64 68" aria-hidden="true">
      <path d="${f}" fill="${INK}" transform="translate(0 4)"/>
      <path d="${f}" fill="${c1}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
      <path d="${f}" fill="none" stroke="${c2}" stroke-width="2" transform="translate(32 32) scale(.82) translate(-32 -32)"/>
      <g transform="translate(14.6 14.2) scale(1.45)">${SYM[m.symbol](c2, INK)}</g></svg>`;
  }
  const keinClan = px => `<svg class="so-emb" style="width:${px}px;height:${Math.round(px * 68 / 64)}px" viewBox="0 0 64 68" aria-hidden="true">
    <path d="${FORMEN[0]}" fill="${INK}" transform="translate(0 4)"/><path d="${FORMEN[0]}" fill="#E9E3D6" stroke="${INK}" stroke-width="3" stroke-dasharray="6 5" stroke-linejoin="round"/>
    <path d="M32 21v22M21 32h22" stroke="${INK}" stroke-width="5" stroke-linecap="round"/></svg>`;
  const schwerter = px => `<svg class="so-emb" style="width:${px}px;height:${Math.round(px * 68 / 64)}px" viewBox="0 0 64 68" aria-hidden="true"><g transform="translate(6 6) scale(2)">
    <g transform="rotate(42 12 12)">${SYM[9]('#FAF6EB', INK)}</g><g transform="rotate(-42 12 12)">${SYM[9]('#F2C14E', INK)}</g></g></svg>`;

  /* ---------- Hilfen ---------- */
  function vor(zuletzt) {
    if (!zuletzt) return 'lange nicht da';
    const m = Math.max(0, (Date.now() - new Date(zuletzt)) / 60000);
    if (m < 60) return `vor ${Math.max(1, Math.round(m))} Min`;
    if (m < 1440) return `vor ${Math.round(m / 60)} Std`;
    const d = Math.round(m / 1440); return `vor ${d} ${d === 1 ? 'Tag' : 'Tagen'}`;
  }
  const zeit = s => s == null ? '–' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const coinBild = () => A.coin;
  async function kopieren(text, meldung) {
    try { await navigator.clipboard.writeText(text); toast(meldung || 'Kopiert'); }
    catch { prompt('Zum Kopieren:', text); }
  }
  const fehler = err => toast(err && err.message ? err.message : 'Das hat nicht geklappt');

  /* ---------- Daten ---------- */
  async function infoLaden() {
    const i = await rpc('wf_spieler_info', { p_spieler: ich().id });
    if (!i) return;
    S.info = i;
    const c = i.clan;
    W().setCrew(c ? { id: c.id, code: c.code, name: c.name } : null);
  }
  async function listeLaden() {
    const [l, b] = await Promise.all([rpc('wf_freunde_liste', mit({})), rpc('wf_blockliste', mit({})).catch(() => S.blockiert)]);
    S.liste = l; S.blockiert = b || [];
  }

  let letzte = 0;
  async function zeichnen() {
    if (!el('soWurzel')) return;
    if (!ich()) { malen(); return; }
    if (S.laedt) { S.nochmal = true; return; }
    S.laedt = true;
    try { await Promise.all([infoLaden(), listeLaden()]); letzte = Date.now(); titelPruefen(true); } catch (err) { /* offline: alter Stand bleibt */ }
    S.laedt = false;
    malen();
    if (S.nochmal) { S.nochmal = false; zeichnen(); }
  }

  /* ---------- Startseite des Tabs ---------- */
  function malen() {
    const root = el('soWurzel'); if (!root) return;
    if (!ich()) {
      if (el('soName')) return;                          // Namensfeld nicht unter den Fingern austauschen
      const vorCode = W().vorCode && W().vorCode();
      root.innerHTML = `<div class="so-panel so-erst">
        <h2 class="ar-titel">Wie heißt du?</h2>
        <p class="ar-hand">Ein Spitzname oder dein Vorname, ohne Nachnamen und Kontaktdaten. Du bekommst eine eigene ID, über die dich deine Freunde finden.${vorCode ? ' Danach trittst du dem Clan bei.' : ''}</p>
        <div class="ar-zeile"><input id="soName" maxlength="20" placeholder="Spitzname" autocomplete="off"><button class="ar-knopf" data-so="los">Los</button></div>
        <button class="so-spaeter" data-konto="anmelden">Schon ein Konto? Anmelden</button></div>`;
      return;
    }
    const info = S.info || {}, l = S.liste || { freunde: [], anfragen: [], gesendet: [] };
    const clan = info.clan, tag = info.tag || '';
    const on = l.freunde.filter(f => f.online), off = l.freunde.filter(f => !f.online);
    const zeile = f => `<button class="so-zeile${f.online ? '' : ' aus'}" data-so="profil" data-id="${f.id}">
        <span class="so-avwrap">${avatar(f.aussehen, f.banner, 48)}${f.online ? '<i class="so-punkt"></i>' : ''}</span>
        <span class="so-text"><b>${e(f.name)}</b><small class="${f.clan ? 'so-clan' : ''}">${f.clan ? e(f.clan.name) : (f.online ? 'Online' : vor(f.zuletzt))}</small></span>
        <span class="so-pk">${f.clan ? emblem(f.clan.emblem, 30) : ''}${pokal}<b>${f.pokale}</b></span></button>`;
    const anfr = l.anfragen.map(a => `<div class="so-zeile so-anfrage"><span class="so-avwrap">${avatar(null, null, 48)}</span>
        <span class="so-text"><b>${e(a.name)}</b><small>#${e(a.tag)} will dein Freund sein</small></span>
        <span class="so-ja"><button class="so-mini" data-so="ja" data-id="${a.id}">Ja</button><button class="so-mini aus" data-so="nein" data-id="${a.id}">Nein</button></span></div>`).join('');
    const liste = (l.anfragen.length ? `<div class="so-trenner"><span>Anfragen</span></div>${anfr}` : '')
      + (on.length ? `<div class="so-trenner"><span>Online</span></div>${on.map(zeile).join('')}` : '')
      + (off.length ? `<div class="so-trenner"><span>Freunde</span></div>${off.map(zeile).join('')}` : '')
      + (!l.freunde.length && !l.anfragen.length ? `<p class="ar-hand so-leer">Noch keine Freunde. Schick ihnen deine ID oder den Einladungslink.</p>` : '');
    root.innerHTML = `
      <div class="so-schild">
        <button class="so-knopf" data-so="profil" data-id="${ich().id}">${avatar(info.aussehen, info.banner, 54)}<b>${e(ich().name)}</b></button>
        <button class="so-knopf" data-so="clan">${clan ? emblem(clan.emblem, 52) : keinClan(52)}<b>${clan ? e(clan.name) : 'Kein Clan'}</b></button>
        <button class="so-knopf" data-so="duell">${schwerter(52)}<b>Duell</b></button>
      </div>
      <div class="so-panel">
        <div class="so-kopf"><h2>Freunde</h2><small>${on.length} online</small></div>
        <div class="so-liste">${liste}</div>
        ${l.gesendet.length ? `<p class="so-gesendet">Anfrage gesendet an ${l.gesendet.map(g => e(g.name)).join(', ')}</p>` : ''}
        <div class="so-fuss"><button class="ar-knopf" data-so="einladen">Einladen</button><button class="ar-knopf gruen" data-so="hinzu">Freund hinzufügen</button></div>
      </div>
      <button class="ar-knopf breit gold so-weltknopf" data-so="welt">Weltrangliste</button>
      <p class="so-id">Deine ID <button data-so="idkopie" data-tag="${e(tag)}">#${e(tag)}</button></p>`;
  }

  /* ---------- Fenster: Hilfen ---------- */
  const blatt = () => $('arBlatt');
  const zu = '<button class="ar-zu" data-zu aria-label="Schließen">×</button>';
  const werkZurueck = () => { const w = el('wfWerk'), s = el('soWerkSlot'); if (w && s) Array.from(s.children).forEach(c => w.appendChild(c)); };
  A.vorBlatt.push(werkZurueck);

  /* ---------- Duell und Lauf-Match (Bausteine aus crew.js) ---------- */
  function duellOeffnen() {
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">Herausfordern</h2><button class="ar-knopf breit leise2" data-so="matches">Letzte Matches</button><div id="soWerkSlot"></div>`);
    const slot = el('soWerkSlot');
    ['wfWerkDuell', 'wfWerkMatch', 'wfWerkRueck'].forEach(id => el(id) && slot.appendChild(el(id)));
  }

  /* ---------- Profil ---------- */
  async function profil(id, bleiben) {
    id = id || (ich() && ich().id);
    if (!id) return;
    let info, lauf, kraft, serie;
    try {
      [info, lauf, kraft, serie] = await Promise.all([rpc('wf_spieler_info', { p_spieler: id }), rpc('wf_profil', { p_spieler: id }).catch(() => null),
        rpc('wf_kraft_profil', { p_spieler: id }).catch(() => null), rpc('wf_serie', { p_spieler: id }).catch(() => null)]);
    } catch (err) { return fehler(err); }
    if (!info) return toast('Spieler nicht gefunden');
    lauf = lauf || {}; kraft = kraft || {}; serie = serie && serie[0];
    const ich_ = !!ich() && id === ich().id, l = S.liste || { freunde: [], anfragen: [], gesendet: [] };
    const freund = l.freunde.some(f => f.id === id), angefragt = l.gesendet.some(f => f.id === id), anfrageDa = l.anfragen.some(f => f.id === id);
    const c = info.clan;
    const look = Object.assign({}, info.aussehen && Object.keys(info.aussehen).length ? info.aussehen : A.F().aussehen, { hg: 'leer' });
    const rolleText = r => r === 'leiter' ? 'Leiter' : r === 'admin' ? 'Admin' : 'Mitglied';
    const wert = (n, t) => `<div>${A.rahmen(100, 64, 12, 21 + String(t).length)}<b>${n}</b><span>${t}</span></div>`;
    const aktionen = ich_ ? `<button class="ar-knopf breit" data-so="matches">Letzte Matches</button>
        <button class="ar-knopf breit leise2" data-so="titel">Titel ändern</button>
        <button class="ar-knopf breit leise2" data-so="banner">Banner ändern</button>`
      : freund ? `<button class="ar-knopf breit gold" data-so="einsVsEins" data-id="${id}" data-name="${e(info.name)}">1 gegen 1</button>
        <button class="ar-knopf breit leise2" data-so="freundWeg" data-id="${id}">Freundschaft beenden</button>`
      : angefragt ? '<button class="ar-knopf breit leise2" disabled>Anfrage gesendet</button>'
      : anfrageDa ? `<button class="ar-knopf breit gruen" data-so="ja" data-id="${id}" data-zurueck="1">Anfrage annehmen</button>`
      : `<button class="ar-knopf breit gruen" data-so="freundNeu" data-id="${id}" data-tag="${e(info.tag)}">Freund hinzufügen</button>`;
    A.zeigeBlatt(`${zu}
      <div class="so-plakette">
        <h2>${e(info.name)}</h2>
        ${info.titel ? `<span class="so-titel ${info.titel_seltenheit || 'normal'}">${e(info.titel)}</span>` : ''}
        <button class="so-tag" data-so="idkopie" data-tag="${e(info.tag)}">#${e(info.tag)}</button>
        ${c ? `<button class="so-clanzeile" data-so="clanAnsicht" data-id="${c.id}">${emblem(c.emblem, 34)}<span><b>${e(c.name)}</b><small>${rolleText(c.rolle)}</small></span></button>`
            : '<p class="so-kein">Kein Clan</p>'}
        <p class="so-status">${info.online ? '<i class="so-punkt in"></i>Online' : `Zuletzt ${vor(info.zuletzt).replace('vor ', 'vor ')}`}${serie ? ` · Serie ${serie.eingefroren ? 'eingefroren' : serie.serie + (serie.serie === 1 ? ' Tag' : ' Tage')}` : ''}</p>
      </div>
      <div class="so-werte">${wert(lauf.pokale || 0, 'Lauf-Pokale')}${wert(kraft.pokale || 0, 'Kraft-Pokale')}${wert(lauf.siege || 0, 'Siege')}${wert(lauf.niederlagen || 0, 'Niederlagen')}</div>
      <h3 class="ar-h">Bestzeiten</h3>
      <ul class="ar-liste">${[[1000, '1 km'], [3000, '3 km'], [10000, '10 km']].map(([m, t]) => `<li><span>${t}</span><b>${zeit(lauf['best_' + m])}</b></li>`).join('')}</ul>
      <h3 class="ar-h">Bestwerte Kraft</h3>
      <ul class="ar-liste"><li><span>Liegestütze in 60 s</span><b>${kraft.best_liegestuetze ?? '–'}</b></li><li><span>Squats in 60 s</span><b>${kraft.best_squats ?? '–'}</b></li>
        <li><span>Plank</span><b>${kraft.best_plank != null ? zeit(kraft.best_plank) : '–'}</b></li></ul>
      ${aktionen}${ich_ ? '' : verwaltung(info)}
      ${ich_ || !ich() ? '' : `<div class="so-reihe so-sicher">
        <button class="ar-knopf leise2" data-so="melden" data-art="spieler" data-wer="${id}" data-name="${e(info.name)}">Melden</button>
        ${S.blockiert.some(x => x.id === id) ? `<button class="ar-knopf leise2" data-so="entblocken" data-id="${id}">Entblocken</button>` : `<button class="ar-knopf leise2" data-so="blockieren" data-id="${id}" data-name="${e(info.name)}">Blockieren</button>`}</div>`}`, 'profil', { aussehen: look }, bleiben);
    $('arB3d').style.background = bannerBg(info.banner);
  }

  function verwaltung(info) {
    const c = info.clan, meins = S.info && S.info.clan;
    if (!c || !meins || c.id !== meins.id || info.id === ich().id) return '';
    const b = (aktion, text, extra) => `<button class="ar-knopf breit leise2" data-so="${aktion}" data-id="${info.id}" ${extra || ''}>${text}</button>`;
    let h = '';
    if (meins.rolle === 'leiter') {
      h += c.rolle === 'admin' ? b('rolle', 'Admin entziehen', 'data-rolle="mitglied"') : b('rolle', 'Zum Admin machen', 'data-rolle="admin"');
      h += b('rolle', 'Zum Leiter machen', 'data-rolle="leiter"') + b('rauswerfen', 'Aus dem Clan werfen');
    } else if (meins.rolle === 'admin' && c.rolle === 'mitglied') h += b('rauswerfen', 'Aus dem Clan werfen');
    return h ? `<h3 class="ar-h">Clan-Verwaltung</h3>${h}` : '';
  }

  /* ---------- Banner ändern ---------- */
  function bannerEditor(bleiben) {
    if (!B) B = bannerOk(S.info && S.info.banner);
    const look = Object.assign({}, A.F().aussehen, { hg: 'leer' });
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">Dein Banner</h2>
      <p class="ar-hand">So sehen dich die anderen in deinem Profil und in der Freundesliste.</p>
      <h3 class="ar-h">Farbe</h3>
      <div class="ar-farben">${FARBEN.map((c, i) => `<button data-so="bFarbe" data-wert="${i}" class="${B.farbe === i ? 'an' : ''}" style="background:${c}" aria-label="Farbe ${i + 1}"></button>`).join('')}</div>
      <h3 class="ar-h">Muster</h3>
      <div class="ar-wahl">${MUSTER_NAMEN.map((n, i) => `<button data-so="bMuster" data-wert="${i}" class="${B.muster === i ? 'an' : ''}">${n}</button>`).join('')}</div>
      <button class="ar-knopf breit" data-so="bannerSpeichern">Speichern</button>`, 'profil', { aussehen: look }, bleiben);
    $('arB3d').style.background = bannerBg(B);
  }

  /* ---------- Freunde hinzufügen ---------- */
  function hinzuSheet(tag) {
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">Freund hinzufügen</h2>
      <p class="ar-hand">Gib die ID deines Freundes ein. Du findest sie in seinem Profil.</p>
      <div class="ar-zeile"><input id="soTagIn" maxlength="10" placeholder="#ABCD2345" autocapitalize="characters" autocomplete="off" value="${tag ? '#' + e(tag) : ''}"><button class="ar-knopf" data-so="hinzuSenden">Senden</button></div>
      <p class="ar-hand klein">Oder schick ihm deinen Einladungslink. Wer ihn öffnet, sieht dein Profil und kann dich mit einem Tipp hinzufügen.</p>
      <button class="ar-knopf breit leise2" data-so="einladen">Einladungslink schicken</button>`);
  }
  async function anfragen(tag) {
    if (!ich()) { S.pendingTag = tag; A.schliessen(); showTab('crew'); return toast('Erst einen Spitznamen eintragen, dann geht die Anfrage raus'); }
    try {
      const r = await rpc('wf_freund_anfragen', mit({ p_tag: tag }));
      toast(r === 'befreundet' ? 'Ihr seid jetzt Freunde' : 'Anfrage gesendet');
      await listeLaden(); malen(); return true;
    } catch (err) { fehler(err); }
  }

  /* ---------- Clan ---------- */
  const neuC = (gratis) => ({ modus: 'neu', gruppe: null, gratis, name: '', beschr: '', em: { form: 0, symbol: 0, c1: 0, c2: 1 } });

  async function clanStart() {
    let n = 1;
    try { const [r] = await W().lesen(`wf_spieler?id=eq.${ich().id}&select=clans_gegruendet`); n = r ? r.clans_gegruendet : 0; } catch (err) { /* Server entscheidet sowieso */ }
    C = neuC(n === 0);
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">Clan</h2>
      <p class="ar-hand">Du bist in keinem Clan. Such dir Leute, mit denen du zusammen Punkte sammelst.</p>
      <h3 class="ar-h">Mit Code beitreten</h3>
      <div class="ar-zeile"><input id="soCode" maxlength="6" placeholder="Code, z.B. H5AMYQ" autocapitalize="characters" autocomplete="off"><button class="ar-knopf" data-so="clanBeitreten">Los</button></div>
      <h3 class="ar-h">Eigenen Clan gründen</h3>
      <p class="ar-hand">${C.gratis ? 'Dein erster Clan ist gratis.' : `Ein weiterer Clan kostet 1000 ${A.coin}. Du hast ${A.F().coins}.`}</p>
      <button class="ar-knopf breit gold" data-so="clanEditor">Clan gründen</button>`);
  }

  function clanEditor(bleiben) {
    const m = C.em, neu = C.modus === 'neu';
    const reihe = (feld, titel) => `<h3 class="ar-h">${titel}</h3><div class="ar-farben">${FARBEN.map((c, i) =>
      `<button data-so="cFeld" data-feld="${feld}" data-wert="${i}" class="${m[feld] === i ? 'an' : ''}" style="background:${c}" aria-label="${titel} ${i + 1}"></button>`).join('')}</div>`;
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">${neu ? 'Clan gründen' : 'Clan bearbeiten'}</h2>
      <div class="so-vorschau">${emblem(m, 96)}<b id="soVorName">${e(C.name || 'Name')}</b></div>
      <h3 class="ar-h">Name</h3>
      <div class="ar-zeile"><input id="soClanName" maxlength="24" placeholder="Name des Clans" autocomplete="off" value="${e(C.name)}"></div>
      <h3 class="ar-h">Beschreibung</h3>
      <div class="ar-zeile"><input id="soClanBeschr" maxlength="120" placeholder="Worum geht es bei euch?" autocomplete="off" value="${e(C.beschr)}"></div>
      <h3 class="ar-h">Form</h3>
      <div class="so-formen">${FORMEN.map((_, i) => `<button data-so="cFeld" data-feld="form" data-wert="${i}" class="${m.form === i ? 'an' : ''}" aria-label="${FORM_NAMEN[i]}">${emblem(Object.assign({}, m, { form: i }), 46)}</button>`).join('')}</div>
      <h3 class="ar-h">Symbol</h3>
      <div class="so-symbole">${SYM.map((_, i) => `<button data-so="cFeld" data-feld="symbol" data-wert="${i}" class="${m.symbol === i ? 'an' : ''}" aria-label="${SYM_NAMEN[i]}">${emblem(Object.assign({}, m, { symbol: i }), 40)}</button>`).join('')}</div>
      ${reihe('c1', 'Farbe des Wappens')}${reihe('c2', 'Farbe des Symbols')}
      <div class="ar-fuss"><button class="ar-knopf breit gold" data-so="clanSpeichern">${neu ? `Gründen · ${C.gratis ? 'gratis' : `1000 ${A.coin}`}` : 'Speichern'}</button></div>`, null, null, bleiben);
  }
  const clanFelderLesen = () => { const n = el('soClanName'), b = el('soClanBeschr'); if (n && C) C.name = n.value; if (b && C) C.beschr = b.value; };

  async function clanAnsicht(id) {
    let g, m;
    try { [g, m] = await Promise.all([rpc('wf_gruppe_info', { p_gruppe: id }), rpc('wf_clan_mitglieder', { p_gruppe: id })]); } catch (err) { return fehler(err); }
    if (!g) return toast('Diesen Clan gibt es nicht mehr');
    const ichM = m.find(x => x.spieler_id === ich().id), admin = !!ichM && (ichM.rolle === 'leiter' || ichM.rolle === 'admin');
    const serien = {};
    if (ichM) await Promise.all(m.map(async x => { try { serien[x.spieler_id] = (await rpc('wf_serie', { p_spieler: x.spieler_id }))[0]; } catch (err) { /* ohne Serie */ } }));
    const frei = !(S.info && S.info.clan);
    const rolle = r => r === 'leiter' ? '<em class="so-rolle leiter">Leiter</em>' : r === 'admin' ? '<em class="so-rolle">Admin</em>' : '';
    const zeilen = m.map((x, i) => {
      const s = serien[x.spieler_id] || {}, bin = x.spieler_id === ich().id;
      return `<div class="so-zeile so-rang${bin ? ' ich' : ''}"><span class="so-nr">${i + 1}</span>
        <button class="so-rangknopf" data-so="profil" data-id="${x.spieler_id}"><span class="so-avwrap">${avatar(x.aussehen, null, 42)}${x.online ? '<i class="so-punkt"></i>' : ''}</span>
          <span class="so-text"><b>${e(x.name)}${bin ? ' (du)' : ''}</b><small>${s.eingefroren ? 'eingefroren' : x.pokale + ' Pokale'}${rolle(x.rolle)}</small></span></button>
        ${ichM && s.eingefroren && !bin ? `<button class="so-mini" data-so="auftauen" data-id="${x.spieler_id}">Auftauen</button>` : ''}
        <span class="so-punkte">${x.punkte}<small>Punkte</small></span></div>`;
    }).join('');
    A.zeigeBlatt(`${zu}
      <div class="so-plakette so-clankopf">
        ${emblem(g.emblem, 96)}
        <h2>${e(g.name)}</h2>
        ${g.beschreibung ? `<p class="ar-hand">${e(g.beschreibung)}</p>` : ''}
        <p class="so-status">${g.mitglieder} von 50 Mitgliedern · Code <button class="so-tag klein" data-so="codekopie" data-code="${e(g.code)}">${e(g.code)}</button></p>
      </div>
      <div class="so-reihe">
        ${ichM ? '<button class="ar-knopf" data-so="clanEinladen">Einladen</button>' : ''}
        ${admin ? `<button class="ar-knopf gold" data-so="clanBearbeiten" data-id="${g.id}">Bearbeiten</button>` : ''}
        ${!ichM && frei ? `<button class="ar-knopf gruen" data-so="clanBeitreten" data-code="${e(g.code)}">Beitreten</button>` : ''}
      </div>
      ${ichM ? `<button class="ar-knopf breit" data-so="chat" data-id="${g.id}">Clan-Chat</button>` : ''}
      <h3 class="ar-h">Diese Woche</h3>
      <div class="so-rangliste">${zeilen}</div>
      <p class="ar-hand klein">Punkte: 1 pro Wiederholung, 1 pro 20 m Laufen, 20 pro Trainingstag.</p>
      ${ichM ? '<button class="ar-knopf breit leise2" data-so="clanVerlassen">Clan verlassen</button>' : ''}
      ${ichM && ichM.rolle === 'leiter' ? '' : `<button class="ar-knopf breit leise2" data-so="melden" data-art="clan" data-gruppe="${g.id}" data-name="${e(g.name)}">Clan melden</button>`}`);
    C = Object.assign(C || {}, { gruppeInfo: g });
  }

  /* ---------- Weltrangliste: echte Spieler und gekennzeichnete Bots (abschaltbar) ---------- */
  const WELT = { art: 'pokale', zeit: 'woche', bots: store.get('wf-welt-bots', true) !== false };
  const WELT_ARTEN = [['pokale', 'Pokale'], ['wdh', 'Wiederholungen'], ['km', 'Kilometer'], ['siege', 'Siege']];
  const weltWert = (art, w) => art === 'km' ? `${(w / 1000).toFixed(1).replace('.', ',')} km` : art === 'wdh' ? `${w} Wdh.` : art === 'siege' ? `${w} Siege` : `${w}`;
  async function welt() {
    const gesamtNur = WELT.art === 'pokale' || WELT.art === 'siege';
    let r;
    try { r = await rpc('wf_weltrangliste', { p_art: WELT.art, p_zeitraum: gesamtNur ? 'gesamt' : WELT.zeit, p_spieler: ich() ? ich().id : null, p_bots: WELT.bots }); } catch (err) { return fehler(err); }
    const zeile = x => x.bot ? `<div class="so-zeile so-rang so-weltzeile so-weltbot">
        <span class="so-nr m${x.rang <= 3 ? x.rang : 0}">${x.rang}</span>
        <span class="so-text"><b>${e(x.name)}</b><small>Simulierter Bot</small></span>
        <span class="so-bot">Bot</span><span class="so-punkte">${e(weltWert(WELT.art, x.wert))}</span></div>`
      : `<button class="so-zeile so-rang so-weltzeile${ich() && x.id === ich().id ? ' ich' : ''}" data-so="profil" data-id="${x.id}">
        <span class="so-nr m${x.rang <= 3 ? x.rang : 0}">${x.rang}</span>
        <span class="so-text"><b>${e(x.name)}</b><small>${x.titel ? e(x.titel) : ''}${x.clan ? `${x.titel ? ' · ' : ''}${e(x.clan.name)}` : ''}</small></span>
        <span class="so-punkte">${e(weltWert(WELT.art, x.wert))}</span></button>`;
    const imTop = r.ich && r.liste.some(x => ich() && x.id === ich().id);
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">Weltrangliste</h2>
      <div class="ar-reiter so-weltreiter">${WELT_ARTEN.map(([id, n]) => `<button data-so="weltArt" data-art="${id}" class="${WELT.art === id ? 'an' : ''}">${n}</button>`).join('')}</div>
      ${gesamtNur ? '' : `<div class="so-weltzeit"><button data-so="weltZeit" data-zeit="woche" class="${WELT.zeit === 'woche' ? 'an' : ''}">Diese Woche</button><button data-so="weltZeit" data-zeit="gesamt" class="${WELT.zeit === 'gesamt' ? 'an' : ''}">Gesamt</button></div>`}
      ${r.liste.length ? r.liste.map(zeile).join('') : '<p class="ar-hand">Noch niemand drin. Du kannst der Erste sein.</p>'}
      ${r.ich && !imTop ? `<div class="so-weltich">Du bist auf Platz ${r.ich.rang} mit ${e(weltWert(WELT.art, r.ich.wert))}</div>` : ''}
      ${ich() && !r.ich && !r.versteckt ? '<p class="ar-hand klein">Du hast hier noch keinen Wert. Training und Battles zählen.</p>' : ''}
      <p class="ar-hand klein">${r.teilnehmer} echte Spieler${WELT.bots ? ` und ${r.bots} Bots (simulierte Werte, mit Bot markiert)` : ''} in dieser Liste.</p>
      <button class="ar-knopf breit leise2" data-so="weltBots">${WELT.bots ? 'Bots ausblenden' : 'Bots anzeigen'}</button>
      ${ich() ? `<button class="ar-knopf breit leise2" data-so="weltSichtbar" data-an="${r.versteckt ? '1' : '0'}">${r.versteckt ? 'Wieder in der Rangliste zeigen' : 'Mich in der Rangliste ausblenden'}</button>` : ''}`);
  }

  /* ---------- Titel: freischalten und tragen ---------- */
  let titelZeit = 0;
  async function titelPruefen(still) {
    if (!ich() || (still && Date.now() - titelZeit < 300000)) return null;
    titelZeit = Date.now();
    try {
      const r = await rpc('wf_titel_liste', mit({}));
      r.titel.filter(t => t.neu && t.id !== 'neuling').slice(0, 2).forEach(t => toast(`Neuer Titel: ${t.name}`));
      return r;
    } catch (err) { return null; }
  }
  async function titelSheet() {
    const r = await titelPruefen(false);
    if (!r) return toast('Titel konnten nicht geladen werden');
    const SELT = { normal: 'Normal', selten: 'Selten', episch: 'Episch', legendaer: 'Legendär' };
    const frei = r.titel.filter(t => t.frei).length;
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">Titel</h2>
      <p class="ar-hand">${frei} von ${r.titel.length} freigeschaltet. Dein Titel steht unter deinem Namen, andere sehen ihn im Profil und im Chat.</p>
      ${r.titel.map(t => `<div class="so-zeile so-titelzeile${t.frei ? '' : ' aus'}"><span class="so-text"><b>${e(t.name)} <em class="so-titel ${t.seltenheit}">${SELT[t.seltenheit]}</em></b><small>${e(t.beschreibung)}</small></span>
        ${t.frei ? (t.id === r.gewaehlt ? '<span class="so-bot">Getragen</span>' : `<button class="so-mini" data-so="titelWaehlen" data-id="${t.id}">Tragen</button>`) : '<span class="so-bot">Gesperrt</span>'}</div>`).join('')}`);
  }

  /* ---------- Matchverlauf: letzte Rennen und Duelle, Gegner direkt hinzufügen ---------- */
  const ZEIT_UEB = { liegestuetze: 'Liegestütze', squats: 'Squats', plank: 'Plank' };
  const datum = z => { const d = new Date(z), h = new Date(), gestern = new Date(h - 864e5); const t = x => x.toDateString();
    return t(d) === t(h) ? 'Heute' : t(d) === t(gestern) ? 'Gestern' : d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }); };
  async function matches() {
    if (!ich()) return toast('Erst einen Spitznamen eintragen');
    let m;
    try { m = await rpc('wf_matches', mit({})); await listeLaden(); } catch (err) { return fehler(err); }
    const freunde = new Set((S.liste ? S.liste.freunde : []).map(f => f.id)), gesendet = new Set((S.liste ? S.liste.gesendet : []).map(f => f.id));
    const zeile = x => {
      const art = x.art === 'lauf' ? `${x.klasse / 1000} km` : (ZEIT_UEB[x.uebung] || x.uebung);
      const wert = v => v == null ? '–' : x.art === 'lauf' ? zeit(v) : (x.uebung === 'plank' ? zeit(v) : v + ' Wdh.');
      const ergebnis = x.sieg == null ? 'Remis' : x.sieg ? 'Sieg' : 'Niederlage';
      const g = x.gegner, name = g ? g.name : (x.bot_name || 'Gegner');
      const aktion = !g ? '<span class="so-bot">Bot</span>' : freunde.has(g.id) ? '<span class="so-bot">Freund</span>'
        : gesendet.has(g.id) ? '<span class="so-bot">Angefragt</span>' : `<button class="so-mini" data-so="matchFreund" data-tag="${e(g.tag)}">Hinzufügen</button>`;
      return `<div class="so-zeile so-match ${x.sieg == null ? '' : x.sieg ? 'sieg' : 'nied'}">
        <span class="so-erg">${ergebnis}</span>
        <button class="so-rangknopf" ${g ? `data-so="profil" data-id="${g.id}"` : 'disabled'}><span class="so-text"><b>${e(name)}</b><small>${datum(x.zeit)} · ${art} · du ${wert(x.meine)}, ${e(g ? g.name : 'Gegner')} ${wert(x.seine)}${x.delta ? ` · ${x.delta > 0 ? '+' : ''}${x.delta} Pokale` : ''}</small></span></button>
        ${aktion}</div>`;
    };
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">Matchverlauf</h2>
      <p class="ar-hand klein">Deine letzten Rennen und Duelle. Tippe auf einen Gegner für sein Profil oder füge ihn als Freund hinzu.</p>
      ${m.length ? m.map(zeile).join('') : '<p class="ar-hand">Noch keine Matches. Starte dein erstes Battle.</p>'}`);
  }

  /* ---------- Chat im Clan: Regeln, Wortfilter (Server), Melden, Blockieren ---------- */
  const CHAT = { gruppe: null, liste: [], timer: null, auswahl: null };
  const stopChat = () => { clearInterval(CHAT.timer); CHAT.timer = null; };
  A.vorBlatt.push(stopChat);
  const uhrzeit = z => new Date(z).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const istAdmin = () => { const c = S.info && S.info.clan; return !!c && (c.rolle === 'leiter' || c.rolle === 'admin'); };

  function regeln(gruppeId) {
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">Chat-Regeln</h2>
      <ul class="so-regeln">
        <li>Sei freundlich. Kein Mobbing, keine Beleidigungen, keine Drohungen.</li>
        <li>Keine Kontaktdaten, Links oder Treffpunkte. Schreib keine Nachnamen, Adressen oder Nummern.</li>
        <li>Schimpfwörter werden automatisch rausgefiltert, manche Nachrichten gehen gar nicht erst raus.</li>
        <li>Jede Nachricht und jeden Spieler kannst du melden oder blockieren. Meldungen prüfen wir innerhalb von 24 Stunden.</li>
        <li>Wer sich nicht daran hält, wird stumm geschaltet oder aus dem Clan geworfen.</li>
      </ul>
      <button class="ar-knopf breit gold" data-so="regelnOk" data-id="${gruppeId}">Verstanden, Chat öffnen</button>
      <a class="ar-knopf breit leise2 so-link" href="regeln.html" target="_blank" rel="noopener">Alle Regeln und Kontakt</a>`);
  }

  function chat(gruppeId) {
    const c = S.info && S.info.clan;
    if (!c || c.id !== gruppeId) return toast('Den Chat gibt es nur für Clan-Mitglieder');
    if (store.get('wf-chat-aus', false)) return toast('Du hast den Chat in den Einstellungen ausgeblendet');
    if (!store.get('wf-regeln', false)) return regeln(gruppeId);
    CHAT.gruppe = gruppeId; CHAT.liste = []; CHAT.auswahl = null;
    A.zeigeBlatt(`${zu}
      <div class="so-chatkopf">${emblem(c.emblem, 34)}<h2>${e(c.name)}</h2></div>
      <div class="so-chat" id="soChatListe"><p class="ar-hand klein">Lade...</p></div>
      <div class="ar-zeile so-chatzeile"><input id="soChatIn" maxlength="200" placeholder="Nachricht" autocomplete="off" enterkeyhint="send"><button class="ar-knopf" data-so="chatSenden">Senden</button></div>
      <p class="ar-hand klein">Tippe auf eine Nachricht, um sie zu melden oder den Spieler zu blockieren.</p>`);
    chatHolen(true);
    stopChat(); CHAT.timer = setInterval(() => chatHolen(false), 4000);
  }
  async function chatHolen(runter) {
    if (!el('soChatListe') || document.querySelector('.ar-blatt').hidden) return stopChat();
    try { CHAT.liste = await rpc('wf_chat_lesen', mit({ p_gruppe: CHAT.gruppe, p_nach: 0 })); chatMalen(runter); }
    catch (err) { if (/Clan/.test(err.message)) { stopChat(); toast(err.message); } }
  }
  function chatMalen(runter) {
    const box = el('soChatListe'); if (!box) return;
    const unten = box.scrollHeight - box.scrollTop - box.clientHeight < 70, admin = istAdmin();
    box.innerHTML = CHAT.liste.length ? CHAT.liste.map(m => {
      const rolle = m.rolle === 'leiter' ? 'Leiter' : m.rolle === 'admin' ? 'Admin' : '';
      const aktion = CHAT.auswahl === m.id ? `<div class="so-msgaktion">${m.ich ? '' :
        `<button class="so-mini aus" data-so="melden" data-art="nachricht" data-nachricht="${m.id}" data-wer="${m.spieler}" data-name="${e(m.name)}">Melden</button><button class="so-mini aus" data-so="blockieren" data-id="${m.spieler}" data-name="${e(m.name)}">Blockieren</button>`}${m.ich || admin ? `<button class="so-mini aus" data-so="msgWeg" data-id="${m.id}">Löschen</button>` : ''}</div>` : '';
      return `<div class="so-msg${m.ich ? ' ich' : ''}"><button class="so-blase" data-so="msgWahl" data-id="${m.id}">${m.ich ? '' : `<b>${e(m.name)}${rolle ? `<em class="so-rolle${m.rolle === 'leiter' ? ' leiter' : ''}">${rolle}</em>` : ''}</b>${m.titel ? `<small class="so-chattitel">${e(m.titel)}</small>` : ''}`}<span>${e(m.text)}</span><small>${uhrzeit(m.zeit)}</small></button>${aktion}</div>`;
    }).join('') : '<p class="ar-hand klein">Noch nichts geschrieben. Sag Hallo.</p>';
    if (runter || unten) box.scrollTop = box.scrollHeight;
  }

  const GRUENDE = [['beleidigung', 'Beleidigung oder Mobbing'], ['belaestigung', 'Belästigung oder Drohung'], ['unangemessen', 'Unangemessener Inhalt'], ['kontaktdaten', 'Fragt nach Kontaktdaten'], ['spam', 'Spam'], ['sonstiges', 'Etwas anderes']];
  let REP = null;
  function meldeSheet(m) {
    REP = Object.assign({ block: m.art !== 'clan' }, m);
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">Melden</h2>
      <p class="ar-hand">${m.art === 'clan' ? 'Clan' : 'Spieler'} ${e(m.name || '')}: Was ist passiert?</p>
      <div class="so-gruende">${GRUENDE.map(([id, t]) => `<button class="ar-knopf breit leise2" data-so="meldeSenden" data-grund="${id}">${t}</button>`).join('')}</div>
      ${m.art !== 'clan' ? `<button class="so-schalter an" data-so="meldeBlock" id="soMeldeBlock"><i></i>Zusätzlich blockieren</button>` : ''}
      <p class="ar-hand klein">Meldungen sind anonym. Wir prüfen sie innerhalb von 24 Stunden.</p>`);
  }
  function blockliste() {
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">Geblockte Spieler</h2>
      ${S.blockiert.length ? S.blockiert.map(b => `<div class="so-zeile"><span class="so-text"><b>${e(b.name)}</b><small>#${e(b.tag)}</small></span><button class="so-mini aus" data-so="entblocken" data-id="${b.id}" data-liste="1">Entblocken</button></div>`).join('')
        : '<p class="ar-hand">Du hast niemanden blockiert.</p>'}`);
  }
  function einstellungenHtml() {
    const aus = store.get('wf-chat-aus', false);
    return `<h3 class="ar-h">Sicherheit</h3>
      ${window.Extras && Extras.kann ? `<button class="ar-knopf breit leise2" data-so="haptik">Vibration: ${Extras.haptikAn ? 'an' : 'aus'}</button>` : ''}
      <button class="ar-knopf breit leise2" data-konto="oeffnen">Konto und Login</button>
      <button class="ar-knopf breit leise2" data-so="chatToggle">Chat: ${aus ? 'ausgeblendet' : 'an'}</button>
      ${ich() ? '<button class="ar-knopf breit leise2" data-so="blockliste">Geblockte Spieler</button>' : ''}
      <a class="ar-knopf breit leise2 so-link" href="regeln.html" target="_blank" rel="noopener">Regeln und Kontakt</a>
      ${ich() ? '<button class="ar-knopf breit leise2 so-gefahr" data-so="kontoWeg">Konto löschen</button>' : ''}`;
  }


  /* ---------- 1 gegen 1 mit Freunden: alles, was es auch im Wettkampf gibt ---------- */
  const EINS = [['lauf', '1000', '1 km Lauf'], ['lauf', '3000', '3 km Lauf'], ['lauf', '10000', '10 km Lauf'],
    ['kraft', 'liegestuetze', 'Liegestütze'], ['kraft', 'squats', 'Squats'], ['kraft', 'plank', 'Plank']];
  const eins = (art, wert) => (EINS.find(x => x[0] === art && x[1] === String(wert)) || [0, 0, wert])[2];
  function einsWahl(id, name) {
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">1 gegen 1</h2>
      <p class="ar-hand">${e(name)} bekommt eine Einladung. Das zählt nicht für Pokale und kostet nichts.</p>
      <div class="so-einsliste">${EINS.map(([art, wert, text]) => `<button class="ar-knopf breit leise2" data-so="herausfordern" data-art="${art}" data-wert="${wert}" data-id="${id}" data-name="${e(name)}">${text}</button>`).join('')}</div>
      <p class="ar-hand klein">Beim Lauf geht es sofort los, bei Kraft stellst du zuerst die Kamera ein.</p>`);
  }
  async function herausfordern(b) {
    if (b.art === 'kraft') { A.schliessen(); return window.KraftUI.herausfordern(b.wert, b.id, b.name); }
    const r = await rpc('wf_herausfordern', mit({ p_an: b.id, p_art: 'lauf', p_wert: b.wert }));
    A.schliessen(); A.rennenStarten(r.id, +b.wert, true);
  }
  let einladungen = [];
  const banner = document.createElement('div');
  banner.id = 'soEinladung'; banner.hidden = true; document.body.appendChild(banner);
  function bannerMalen() {
    const x = einladungen[0];
    banner.hidden = !x;
    if (!x) return;
    banner.innerHTML = `<b>${e(x.von.name)} fordert dich heraus</b><span>${e(eins(x.art, x.wert))}${einladungen.length > 1 ? ` · +${einladungen.length - 1} weitere` : ''}</span>
      <div><button class="ar-knopf gruen" data-so="einAnnehmen" data-id="${x.id}">Annehmen</button><button class="ar-knopf leise2" data-so="einAblehnen" data-id="${x.id}">Nein</button></div>`;
  }
  function beschaeftigt() {
    return !!store.get('wf-rennen', null) || !!(window.KraftUI && KraftUI._test.D);
  }
  async function einladungenHolen() {
    if (!ich() || document.hidden) return;
    try { einladungen = await rpc('wf_herausforderungen', mit({})) || []; } catch (err) { return; }
    if (beschaeftigt()) { banner.hidden = true; return; }
    bannerMalen();
  }
  banner.addEventListener('click', klick);
  setInterval(einladungenHolen, 7000);
  setTimeout(einladungenHolen, 3000);

  /* ---------- Klicks (Startseite und Fenster) ---------- */
  const H = {
    async los() {
      const n = (el('soName').value || '').trim();
      if (n.length < 2) return toast('Mindestens 2 Zeichen');
      try {
        await W().registrieren(n);
        A.figurLaden(); if (window.Pass) Pass.laden();
        if (S.pendingTag) { const t = S.pendingTag; S.pendingTag = null; await anfragen(t); }
        await zeichnen();
      } catch (err) { fehler(err); }
    },
    profil: b => profil(b.id),
    einsVsEins: b => einsWahl(b.id, b.name),
    herausfordern: b => herausfordern(b),
    async einAnnehmen(b) {
      const x = einladungen.find(i => i.id === b.id); if (!x) return;
      einladungen = einladungen.filter(i => i.id !== b.id); bannerMalen();
      if (x.art === 'kraft') { A.schliessen(); return window.KraftUI.annehmen(x.wert, x.id); }
      const r = await rpc('wf_herausforderung_annehmen', mit({ p_art: 'lauf', p_match: x.id }));
      A.schliessen(); A.rennenStarten(r.id, r.klasse, true);
    },
    async einAblehnen(b) {
      const x = einladungen.find(i => i.id === b.id); einladungen = einladungen.filter(i => i.id !== b.id); bannerMalen();
      if (x) await rpc('wf_herausforderung_ablehnen', mit({ p_art: x.art, p_match: x.id }));
    },
    clan: () => S.info && S.info.clan ? clanAnsicht(S.info.clan.id) : clanStart(),
    clanAnsicht: b => clanAnsicht(b.id),
    duell: () => duellOeffnen(),
    hinzu: () => hinzuSheet(),
    einladen: () => W().teilen(`${ich().name} auf Winterform: Füg mich als Freund hinzu`, W().linkMit('freund', S.info.tag)),
    idkopie: b => kopieren('#' + b.tag, 'ID kopiert'),
    codekopie: b => kopieren(b.code, 'Code kopiert'),
    async hinzuSenden() { const t = el('soTagIn').value; if (await anfragen(t)) A.schliessen(); },
    freundNeu: async b => { if (await anfragen(b.tag)) profil(b.id); },
    async ja(b) {
      try { await rpc('wf_freund_antwort', mit({ p_von: b.id, p_ja: true })); toast('Ihr seid jetzt Freunde'); await listeLaden(); malen(); if (b.zurueck) profil(b.id); }
      catch (err) { fehler(err); }
    },
    async nein(b) { try { await rpc('wf_freund_antwort', mit({ p_von: b.id, p_ja: false })); await listeLaden(); malen(); } catch (err) { fehler(err); } },
    async freundWeg(b) {
      if (!confirm('Freundschaft wirklich beenden?')) return;
      try { await rpc('wf_freund_entfernen', mit({ p_wer: b.id })); await listeLaden(); malen(); A.schliessen(); } catch (err) { fehler(err); }
    },
    /* Banner */
    banner: () => { B = bannerOk(S.info && S.info.banner); bannerEditor(); },
    bFarbe: b => { B.farbe = +b.wert; bannerEditor(true); },
    bMuster: b => { B.muster = +b.wert; bannerEditor(true); },
    async bannerSpeichern() {
      try { await rpc('wf_banner_speichern', mit({ p_banner: B })); S.info.banner = B; toast('Banner gespeichert'); await listeLaden(); malen(); profil(); }
      catch (err) { fehler(err); }
    },
    figur: () => A.editor(),
    /* Clan */
    clanEditor: () => { clanEditor(); },
    cFeld(b) { clanFelderLesen(); C.em[b.feld] = +b.wert; clanEditor(true); },
    async clanSpeichern() {
      clanFelderLesen();
      if ((C.name || '').trim().length < 2) return toast('Der Clan braucht einen Namen');
      try {
        if (C.modus === 'neu') {
          if (!C.gratis && A.F().coins < 1000) return toast(`Ein neuer Clan kostet 1000 Coins. Dir fehlen ${1000 - A.F().coins}.`);
          const r = await rpc('wf_gruppe_erstellen', mit({ p_name: C.name.trim(), p_emblem: C.em, p_beschreibung: C.beschr }));
          W().setCrew({ id: r.id, code: r.code, name: C.name.trim() });
          toast('Clan gegründet. Lade jetzt deine Leute ein.');
          A.figurLaden(); await zeichnen(); clanAnsicht(r.id);
        } else {
          await rpc('wf_gruppe_aendern', mit({ p_gruppe: C.gruppe, p_name: C.name.trim(), p_emblem: C.em, p_beschreibung: C.beschr }));
          toast('Clan gespeichert'); await zeichnen(); clanAnsicht(C.gruppe);
        }
      } catch (err) { fehler(err); }
    },
    clanBearbeiten() {
      const g = C && C.gruppeInfo; if (!g) return;
      C = { modus: 'aendern', gruppe: g.id, gratis: false, name: g.name, beschr: g.beschreibung || '', em: emblemOk(g.emblem), gruppeInfo: g };
      clanEditor();
    },
    async clanBeitreten(b) {
      const code = b.code || (el('soCode') && el('soCode').value) || '';
      await W().beitreten(code);
      await zeichnen();
      if (S.info && S.info.clan) clanAnsicht(S.info.clan.id);
    },
    clanEinladen() { const c = S.info.clan; W().teilen(`Komm in meinen Winterform-Clan "${c.name}"`, W().linkMit('crew', c.code)); },
    async clanVerlassen() {
      const c = S.info && S.info.clan; if (!c) return;
      if (!confirm(`${c.name} wirklich verlassen?`)) return;
      try { await rpc('wf_gruppe_verlassen', mit({ p_gruppe: c.id })); } catch (err) { return fehler(err); }
      W().setCrew(null); await zeichnen(); A.schliessen();
    },
    async rolle(b) {
      if (b.rolle === 'leiter' && !confirm('Wirklich zum Leiter machen? Du wirst dann Admin.')) return;
      try { await rpc('wf_gruppe_rolle', mit({ p_gruppe: S.info.clan.id, p_ziel: b.id, p_rolle: b.rolle })); toast('Gespeichert'); await zeichnen(); profil(b.id); } catch (err) { fehler(err); }
    },
    async rauswerfen(b) {
      if (!confirm('Diesen Spieler wirklich aus dem Clan werfen?')) return;
      try { await rpc('wf_gruppe_rauswerfen', mit({ p_gruppe: S.info.clan.id, p_ziel: b.id })); toast('Rausgeworfen'); await zeichnen(); clanAnsicht(S.info.clan.id); } catch (err) { fehler(err); }
    },
    async auftauen(b) { await W().auftauen(b.id); if (S.info && S.info.clan) clanAnsicht(S.info.clan.id); },
    matches: () => matches(),
    welt: () => welt(),
    weltBots() { WELT.bots = !WELT.bots; store.set('wf-welt-bots', WELT.bots); return welt(); },
    weltArt(b) { WELT.art = b.art; return welt(); },
    weltZeit(b) { WELT.zeit = b.zeit; return welt(); },
    async weltSichtbar(b) { try { await rpc('wf_bestenliste_sichtbar', mit({ p_sichtbar: b.an === '1' })); toast(b.an === '1' ? 'Du bist wieder in der Rangliste' : 'Du bist ausgeblendet'); welt(); } catch (err) { fehler(err); } },
    haptik() { Extras.setzeHaptik(!Extras.haptikAn); A.einstellungen(); },
    teilen: b => W().teilen(b.text, location.origin + location.pathname),
    titel: () => titelSheet(),
    async titelWaehlen(b) { try { await rpc('wf_titel_waehlen', mit({ p_titel: b.id })); await titelSheet(); } catch (err) { fehler(err); } },
    async matchFreund(b) { if (await anfragen(b.tag)) matches(); },
    /* Chat, Melden, Blockieren */
    chat: b => chat(b.id),
    async regelnOk(b) { try { await rpc('wf_regeln_ok', mit({})); store.set('wf-regeln', true); chat(b.id); } catch (err) { fehler(err); } },
    async chatSenden() {
      const inp = el('soChatIn'), t = inp ? inp.value.trim() : '';
      if (!t) return;
      try { await rpc('wf_chat_senden', mit({ p_gruppe: CHAT.gruppe, p_text: t })); inp.value = ''; await chatHolen(true); }
      catch (err) { if (/Chat-Regeln/.test(err.message)) { store.set('wf-regeln', false); return regeln(CHAT.gruppe); } toast(err.message); }
    },
    msgWahl(b) { CHAT.auswahl = CHAT.auswahl === +b.id ? null : +b.id; chatMalen(false); },
    async msgWeg(b) { try { await rpc('wf_chat_loeschen', mit({ p_nachricht: +b.id })); CHAT.auswahl = null; await chatHolen(false); } catch (err) { fehler(err); } },
    melden: b => meldeSheet({ art: b.art, nachricht: b.nachricht ? +b.nachricht : null, wer: b.wer || null, gruppe: b.gruppe || null, name: b.name }),
    meldeBlock() { REP.block = !REP.block; el('soMeldeBlock').classList.toggle('an', REP.block); },
    async meldeSenden(b) {
      try {
        await rpc('wf_melden', mit({ p_art: REP.art, p_grund: b.grund, p_wer: REP.wer, p_nachricht: REP.nachricht, p_gruppe: REP.gruppe }));
        if (REP.block && REP.wer) { await rpc('wf_blockieren', mit({ p_wer: REP.wer })); await zeichnen(); }
        toast('Danke. Wir prüfen die Meldung.'); A.schliessen();
      } catch (err) { fehler(err); }
    },
    async blockieren(b) {
      if (!confirm(`${b.name || 'Diesen Spieler'} blockieren? Du siehst seine Nachrichten nicht mehr und ihr könnt euch keine Anfragen schicken.`)) return;
      try { await rpc('wf_blockieren', mit({ p_wer: b.id })); await zeichnen(); toast('Blockiert'); if (el('soChatListe')) chatHolen(false); else A.schliessen(); } catch (err) { fehler(err); }
    },
    async entblocken(b) {
      try { await rpc('wf_entblocken', mit({ p_wer: b.id })); await zeichnen(); toast('Nicht mehr blockiert'); if (b.liste) blockliste(); else A.schliessen(); } catch (err) { fehler(err); }
    },
    blockliste: () => blockliste(),
    chatToggle() { store.set('wf-chat-aus', !store.get('wf-chat-aus', false)); A.einstellungen(); },
    async kontoWeg() {
      if (!confirm('Konto wirklich löschen? Profil, Coins, Pokale, Freunde und Clan-Mitgliedschaft sind dann für immer weg.')) return;
      if (!confirm('Ganz sicher? Das kann nicht rückgängig gemacht werden.')) return;
      try {
        await rpc('wf_konto_loeschen', mit({}));
        ['wf-ich', 'wf-crew', 'wf-figur', 'wf-pokale', 'wf-kpokale', 'wf-match', 'wf-rennen', 'wf-regeln', 'wf-modus'].forEach(k => { try { localStorage.removeItem(k); } catch (err) { /* egal */ } });
        location.href = location.pathname;
      } catch (err) { fehler(err); }
    }
  };

  function klick(ev) {
    const b = ev.target.closest('[data-so]');
    if (!b || b.disabled) return;
    const f = H[b.dataset.so];
    if (f) { ev.preventDefault(); Promise.resolve(f(b.dataset)).catch(fehler); }
  }
  const root = () => el('soWurzel');
  root().addEventListener('click', klick);
  blatt().addEventListener('click', klick);
  // Live-Vorschau im Clan-Editor: Name im Wappen-Bild mittippen
  blatt().addEventListener('input', ev => {
    if (ev.target.id === 'soClanName' && el('soVorName')) el('soVorName').textContent = ev.target.value || 'Name';
    if (ev.target.id === 'soClanName' && C) C.name = ev.target.value;
    if (ev.target.id === 'soClanBeschr' && C) C.beschr = ev.target.value;
  });
  blatt().addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.id === 'soChatIn') H.chatSenden(); });
  root().addEventListener('keydown', ev => { if (ev.key === 'Enter' && ev.target.id === 'soName') H.los(); });

  /* ---------- Hintergrund: Anwesenheit und Auffrischen ---------- */
  setInterval(() => { if (ich() && !document.hidden) rpc('wf_ping', mit({})).catch(() => {}); }, 60000);
  setInterval(() => { if (ich() && typeof curTab !== 'undefined' && curTab === 'crew' && !document.hidden && Date.now() - letzte > 20000) zeichnen(); }, 5000);

  window.Social = { welt, matches, einstellungenHtml, zeichnen, duellOeffnen, profil, clanAnsicht, anfragen, emblem, avatar, bannerBg, _test: { S, H, get C() { return C; } } };

  /* ---------- Einladungslink ?freund=ID ---------- */
  const q = new URLSearchParams(location.search);
  if (q.get('freund')) {
    const tag = q.get('freund');
    showTab('crew');
    rpc('wf_spieler_info', { p_tag: tag }).then(i => {
      if (!i) return toast('Diese ID gibt es nicht');
      if (!ich()) S.pendingTag = tag;
      if (ich() && i.id === ich().id) return;
      profil(i.id);
    }).catch(fehler);
  } else if (typeof curTab !== 'undefined' && curTab === 'crew') zeichnen();
})();
