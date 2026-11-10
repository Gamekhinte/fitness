/* ================= GYMLIMPIX PASS =================
   Saison-Pass mit 30 Stufen und zwei Spuren (frei und Premium). Erfahrung gibt es fürs Training
   (Wiederholungen, Kilometer, Trainingstage) und für jedes gewertete Rennen und Duell.
   Zwei Währungen: Coins (Alltag) und Gems (besondere Outfits). Der Pass bringt beides, dazu Kosmetik.
   Belohnungen sind nur Kosmetik und Währung, nie Pokale oder Vorteile im Rennen.
   Premium kostet 7,99 Euro und wird nur über Google Play gekauft (Digital Goods API in der Store-App).
   Den Kauf prüft der Server (Function "kauf"), erst dann wird Premium freigeschaltet.
   Oben im Fenster steht der Hauptpreis in 3D, jede Kosmetik lässt sich antippen und anschauen.
   Alles rechnet der Server (wf_pass_*), dieser Teil zeigt nur an und fragt zum Abholen.

   Läuft nach arena.js. Der Pass-Knopf hängt als Fahne oben rechts am Startbildschirm. */
(function () {
  if (!window.ArenaUI || !window.WF) return;
  const A = window.ArenaUI, W = () => window.WF, ich = () => W().ich();
  const e = s => esc(s);
  const el = id => document.getElementById(id);
  const mit = a => Object.assign({ p_id: ich().id, p_geheim: ich().geheim }, a);
  const KAT = { kopf: 'Kopf', extra: 'Extra', skin: 'Skin', emote: 'Animation', intro: 'Intro', hg: 'Hintergrund' };
  const gem = '<img class="ar-gem" src="arena/gem.svg" alt="Gems">';
  const HAUPTPREIS = 'skin:eiszeus';
  let P = null, VORSCHAU = HAUPTPREIS;

  /* ---------- Kauf über Google Play ---------- */
  const PRODUKT = 'premium_pass', PLAY = 'https://play.google.com/billing';
  let storePreis = '';
  const preis = () => storePreis || (P && typeof P.premium_preis === 'string' ? P.premium_preis : '7,99 €');
  const imStore = () => 'getDigitalGoodsService' in window && window.PaymentRequest;
  async function dienst() { try { return imStore() ? await window.getDigitalGoodsService(PLAY) : null; } catch (err) { return null; } }
  async function kaufMelden(token) {
    const r = await fetch(SUPABASE_URL + '/functions/v1/kauf', { method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON },
      body: JSON.stringify(mit({ token, produkt: PRODUKT })) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.fehler || 'Der Kauf konnte nicht geprüft werden.');
    return j;
  }
  // Käufe, die bezahlt aber noch nicht gutgeschrieben sind (z. B. App zu früh geschlossen), nachholen
  async function offeneKaeufe() {
    const d = await dienst(); if (!d || !ich()) return;
    try {
      const det = await d.getDetails([PRODUKT]);
      if (det && det[0] && det[0].price) storePreis = new Intl.NumberFormat('de-DE', { style: 'currency', currency: det[0].price.currency }).format(+det[0].price.value);
      const liste = await d.listPurchases();
      for (const k of liste || []) if (k.itemId === PRODUKT) { await kaufMelden(k.purchaseToken); await nachher('Premium freigeschaltet'); }
    } catch (err) { /* nächster Start versucht es wieder */ }
  }
  async function kaufen() {
    if (!imStore()) {
      const zu = '<button class="ar-zu" data-zu aria-label="Schließen">×</button>';
      A.zeigeBlatt(`${zu}<h2 class="ar-titel">Premium</h2><p class="ar-hand">Premium kostet ${e(preis())} und gilt für die ganze Saison. Kaufen kannst du es in der Gymlimpix-App aus dem Google Play Store.</p>`);
      return;
    }
    const req = new PaymentRequest([{ supportedMethods: PLAY, data: { sku: PRODUKT } }],
      { total: { label: 'Premium', amount: { currency: 'EUR', value: '0' } } });
    let antw;
    try { antw = await req.show(); } catch (err) { return; }   // abgebrochen
    try {
      await kaufMelden(antw.details.purchaseToken);
      await antw.complete('success');
      await nachher('Premium freigeschaltet');
    } catch (err) {
      try { await antw.complete('fail'); } catch (x) {}
      toast(err.message);
    }
  }
  setTimeout(offeneKaeufe, 4000);

  function itemName(wert) {
    const [k, i] = String(wert).split(':'), x = ((window.Figur && Figur.KATALOG[k]) || []).find(y => y[0] === i);
    return [KAT[k] || k, x ? x[1] : i];
  }
  // Seltenheit nur zur Anzeige: Outfits sind episch, der Eiskönig legendär, der Rest selten
  // Skins zeigen ihre echte Klasse, der Rest gilt als selten
  const seltenheit = wert => {
    const s = String(wert).startsWith('skin:') && window.Figur && Figur.skinInfo(String(wert).slice(5));
    return s ? (s.klasse === 'ungewoehnlich' ? 'selten' : s.klasse === 'spezial' ? 'legendaer' : s.klasse) : 'selten';
  };
  const SELT_NAME = { legendaer: 'Legendär', episch: 'Episch', selten: 'Selten' };

  /* ---------- Pass-Knopf oben rechts unter der Kopfleiste (wie in Clash Royale), BATTLE bleibt allein in der Mitte ---------- */
  function chip() {
    const kopf = document.querySelector('#tab-arena .ar-kopf'); if (!kopf) return;
    let c = el('arPass');
    if (!c) {
      c = document.createElement('button'); c.className = 'ar-passknopf'; c.id = 'arPass'; c.setAttribute('aria-label', 'Pass öffnen');
      kopf.appendChild(c);
      c.onclick = () => sheet();
    }
    const n = bereit(), lv = P && P.aktiv ? P.stufe : 0, anteil = P && P.aktiv ? (P.stufe >= P.stufen ? 100 : (P.xp % P.xp_pro_stufe) / P.xp_pro_stufe * 100) : 0;
    c.innerHTML = `<svg class="pk-fahne" viewBox="0 0 80 112" preserveAspectRatio="none" aria-hidden="true"><path class="pk-schatten" d="M3 0H77V98L40 86L3 98Z" transform="translate(0 4)"/><path class="pk-tuch" d="M3 0H77V98L40 86L3 98Z"/><path class="pk-saum" d="M3 9H77"/></svg>`
      + `<span class="pk-glanz" aria-hidden="true"></span><span class="pk-gem"><i class="pk-strahl" aria-hidden="true"></i>${gem}</span><b>PASS</b><span class="pk-stufe">${lv}</span><i class="pk-balken"><u style="width:${anteil}%"></u></i>${n > 0 ? `<em class="pk-punkt">${n}</em>` : ''}`;
    c.setAttribute('aria-label', `Pass öffnen, Stufe ${lv}${n > 0 ? `, ${n} Belohnungen bereit` : ''}`);
    c.classList.toggle('ps-neu', n > 0);
  }
  const geholt = (st, sp) => P.abgeholt.some(a => a.stufe === st && a.spur === sp);
  const bereit = () => P && P.aktiv ? P.belohnungen.filter(r => r.stufe <= P.stufe && (r.spur === 'frei' || P.premium) && !geholt(r.stufe, r.spur)).length : 0;

  async function laden() {
    if (!ich()) return;
    try {
      const alt = P && P.stufe;
      P = await W().rpc('wf_pass_status', { p_spieler: ich().id });
      const gemerkt = store.get('wf-pass-stufe', null);
      if (P && P.aktiv) {
        if (gemerkt != null && P.stufe > gemerkt && alt != null) toast(`Pass Stufe ${P.stufe} erreicht. Belohnung wartet.`);
        store.set('wf-pass-stufe', P.stufe);
      }
    } catch (err) { /* offline: alter Stand bleibt */ }
    chip(); coachSperre();
  }

  /* ---------- Konfetti ---------- */
  function feier() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const farben = ['#F2C14E', '#7CD4FF', '#D9643A', '#3CBFB0', '#E86AA6', '#FAF6EB'];
    const box = document.createElement('div'); box.className = 'ps-konfetti';
    for (let i = 0; i < 36; i++) {
      const k = document.createElement('i');
      k.style.cssText = `left:${Math.random() * 100}%;background:${farben[i % 6]};animation-delay:${Math.random() * 0.4}s;animation-duration:${1.1 + Math.random() * 0.9}s;transform:rotate(${Math.random() * 360}deg)`;
      box.appendChild(k);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 2600);
  }


  /* ---------- Premium-Angebot: poppt ab und zu auf, wie in Clash Royale ----------
     Nur auf dem Startbildschirm, nicht beim ersten Start, frühestens nach 30 Minuten Nutzung
     und danach höchstens alle 20 Stunden. "Später" schließt es, nichts nervt mehr. */
  const ERST_KEY = 'wf-erststart', ANGEBOT_KEY = 'wf-angebot-zeit';
  if (!store.get(ERST_KEY, null)) store.set(ERST_KEY, Date.now());
  const angebotFaellig = () => !!(ich() && P && P.aktiv && !P.premium && curTab === 'arena' && !document.hidden
    && document.querySelector('.ar-blatt').hidden && !el('lade')
    && Date.now() - store.get(ERST_KEY, Date.now()) > 30 * 60000 && Date.now() - store.get(ANGEBOT_KEY, 0) > 20 * 3600000);

  function angebot(manuell) {
    if (!P || !P.aktiv) return;
    store.set(ANGEBOT_KEY, Date.now());
    const zu = '<button class="ar-zu" data-zu aria-label="Schließen">×</button>';
    const prem = P.belohnungen.filter(r => r.spur === 'premium');
    const gems = prem.filter(r => r.art === 'gems').reduce((s, r) => s + (+r.wert), 0), items = prem.filter(r => r.art === 'item').length;
    A.zeigeBlatt(`${zu}
      <div class="ps-hero legendaer"><span>Premium</span><b>Eis-Zeus und mehr</b><small>${P.tage_rest} Tage übrig in dieser Saison</small></div>
      <ul class="ps-vorteile">
        <li><b>Coach</b>Dein KI-Trainer baut dir Pläne und beantwortet Fragen.</li>
        <li><b>Essensscanner</b>Foto machen, die KI schätzt Kalorien und Eiweiß. 15 Scans am Tag.</li>
        <li><b>${items} Kosmetik-Teile</b>Eis-Zeus, Chione, Siegesgöttin und mehr, nur in der Premium-Spur.</li>
        <li><b>${gems} ${gem}</b>Extra Gems für besondere Outfits.</li>
        <li><b>Fair</b>Keine Vorteile im Rennen, Pokale gibt es nie zu kaufen.</li>
      </ul>
      <button class="ar-knopf breit gold" data-pass="premium">Premium freischalten · ${e(preis())}</button>
      <button class="ar-knopf breit leise2" data-pass="oeffnen">Alle Belohnungen ansehen</button>
      ${manuell ? '' : '<button class="so-spaeter" data-pass="spaeter">Später</button>'}`, 'profil',
      { aussehen: Object.assign({}, A.F().aussehen, { skin: 'eiszeus', hg: 'leer' }) });
    $('arB3d').style.background = '#1F3A5F';
  }
  setInterval(() => { if (angebotFaellig()) angebot(false); }, 20000);

  /* ---------- Coach nur für Premium ---------- */
  function coachSperre() {
    const t = el('tab-coach'); if (!t) return;
    const bekannt = !ich() || P !== null, frei = !!(P && P.aktiv && P.premium);
    t.classList.toggle('gesperrt', bekannt && !frei);
    let k = t.querySelector('.coach-sperre');
    if (!bekannt || frei) { if (k) k.remove(); return; }
    if (!k) {
      k = document.createElement('div'); k.className = 'coach-sperre'; t.prepend(k);
      k.addEventListener('click', ev => {
        const b = ev.target.closest('[data-coach]'); if (!b) return;
        if (!ich()) { showTab('crew'); return; }
        showTab('arena'); setTimeout(() => angebot(true), 150);
      });
    }
    k.innerHTML = `<h2>Coach</h2>
      <p>Der KI-Coach und der Essensscanner gehören zu Premium. Der Coach kennt dein Profil, baut dir Wochenpläne und beantwortet Fragen. Der Scanner schätzt Kalorien und Eiweiß von einem Foto.</p>
      <button class="ar-knopf breit gold" data-coach="1">${ich() ? 'Premium ansehen' : 'Erst Spitznamen eintragen'}</button>`;
  }

  /* ---------- Pass-Fenster ---------- */
  const SCHLOSS = '<i class="ps-schloss" aria-hidden="true"></i>';
  function box(r) {
    const hat = geholt(r.stufe, r.spur), erreicht = r.stufe <= P.stufe, offen = r.spur === 'frei' || P.premium;
    const zustand = hat ? 'geholt' : erreicht && offen ? 'bereit' : erreicht ? 'premium' : 'zu';
    let inhalt, art = '', aktion = 'abholen', klick = zustand === 'bereit';
    if (r.art === 'coins') { inhalt = `<span class="ps-symbol">${A.coin}</span><b>${r.wert}</b>`; art = ' coins'; }
    else if (r.art === 'gems') { inhalt = `<span class="ps-symbol">${gem}</span><b>${r.wert}</b>`; art = ' gems'; }
    else {
      const [k, n] = itemName(r.wert), [kat, id] = String(r.wert).split(':');
      const bild = kat === 'skin' && window.Figur && Figur.bild && Figur.skinInfo(id) ? `<img class="ps-skin" src="${Figur.bild(id)}" alt="" loading="lazy" decoding="async">` : '';
      inhalt = `${bild}<small>${e(k)}</small><b>${e(n)}</b>`; art = ' item ' + seltenheit(r.wert) + (bild ? ' mitbild' : '');
      if (zustand !== 'bereit') { aktion = 'vorschau'; klick = true; }
    }
    const marke = zustand === 'bereit' ? '<em class="ps-hol">Abholen</em>' : hat ? '<i class="ps-haken"></i>' : (zustand === 'premium' || (r.spur === 'premium' && !P.premium)) ? SCHLOSS : '';
    return `<button class="ps-box ${zustand}${art}${r.spur === 'premium' ? ' prem' : ''}${r.art === 'item' && VORSCHAU === r.wert ? ' gewaehlt' : ''}" data-pass="${aktion}" data-stufe="${r.stufe}" data-spur="${r.spur}" data-item="${r.art === 'item' ? e(r.wert) : ''}"${klick ? '' : ' disabled'}>${inhalt}${marke}</button>`;
  }
  // kleine Ansicht einer Belohnung (nächste Stufe, Bilanz)
  function mini(r) {
    if (!r) return '<span class="ps-mini leer">–</span>';
    const zu = r.spur === 'premium' && !P.premium;
    if (r.art === 'coins') return `<span class="ps-mini${zu ? ' zu' : ''}">${A.coin}<b>${r.wert}</b></span>`;
    if (r.art === 'gems') return `<span class="ps-mini${zu ? ' zu' : ''}">${gem}<b>${r.wert}</b></span>`;
    const [, id] = String(r.wert).split(':');
    const bild = window.Figur && Figur.skinInfo && Figur.skinInfo(id) ? `<img src="${Figur.bild(id)}" alt="">` : '';
    return `<span class="ps-mini item ${seltenheit(r.wert)}${zu ? ' zu' : ''}">${bild}<b>${e(itemName(r.wert)[1])}</b></span>`;
  }
  // Restzeit der Saison: Tage, am letzten Tag Stunden bis Mitternacht
  function restzeit() {
    if (P.tage_rest > 1) return `${P.tage_rest} Tage`;
    const m = new Date(); m.setHours(24, 0, 0, 0);
    return `${Math.max(1, Math.ceil((m - Date.now()) / 3600000))} Std`;
  }

  // 3D-Look für die Vorschau: dein Charakter mit dem angeschauten Teil
  function vorschauLook(wert) {
    const [k, i] = String(wert).split(':'), l = Object.assign({}, A.F().aussehen, { hg: 'leer' });
    if (k === 'hg') l.hg = i; else l[k] = i;
    if (k === 'kopf' || k === 'extra') l.skin = 'nichts';
    return l;
  }

  function sheet(bleiben, nachOben) {
    if (!ich()) { toast('Erst einen Spitznamen eintragen'); return; }
    const zu = '<button class="ar-zu" data-zu aria-label="Schließen">×</button>';
    if (!P || !P.aktiv) { A.zeigeBlatt(`${zu}<div class="ps-pause"><span class="ps-pause-gem">${gem}</span><h2 class="ar-titel">Winterpass</h2><p class="ar-hand">Gerade läuft keine Saison. Die nächste kommt bald. Training zählt trotzdem für deine Bestwerte.</p></div>`); return; }
    const imStufe = P.xp % P.xp_pro_stufe, max = P.stufe >= P.stufen, n = bereit();
    const anteil = max ? 100 : imStufe / P.xp_pro_stufe * 100;
    const prem = P.belohnungen.filter(r => r.spur === 'premium');
    const premGems = prem.filter(r => r.art === 'gems').reduce((s, r) => s + (+r.wert), 0);
    const premItems = prem.filter(r => r.art === 'item');
    // Bilanz: was schon abgeholt ist, und was Premium bis jetzt gebracht hätte
    const abg = P.belohnungen.filter(r => geholt(r.stufe, r.spur));
    const sum = art => abg.filter(r => r.art === art).reduce((s, r) => s + (+r.wert), 0);
    const verpasst = P.premium ? [] : prem.filter(r => r.stufe <= P.stufe);
    const nextF = P.belohnungen.find(r => r.stufe === P.stufe + 1 && r.spur === 'frei'), nextP = P.belohnungen.find(r => r.stufe === P.stufe + 1 && r.spur === 'premium');
    // nächster großer Preis (Kosmetik) über der aktuellen Stufe
    const ziel = P.belohnungen.filter(r => r.art === 'item' && r.stufe > P.stufe && (r.spur === 'frei' || P.premium)).sort((x, y) => x.stufe - y.stufe)[0];
    const reihen = [];
    for (let st = 1; st <= P.stufen; st++) {
      const f = P.belohnungen.find(r => r.stufe === st && r.spur === 'frei'), p = P.belohnungen.find(r => r.stufe === st && r.spur === 'premium');
      const meilen = st % 5 === 0;
      reihen.push(`<div class="ps-reihe${st === Math.max(1, P.stufe) ? ' jetzt' : ''}${st <= P.stufe ? ' erreicht' : ''}${st === P.stufe + 1 ? ' naechste' : ''}${meilen ? ' meilen' : ''}${st % 10 === 0 ? ' gross' : ''}"${st === Math.max(1, P.stufe) ? ' id="psJetzt"' : ''}>${f ? box(f) : '<span></span>'}<span class="ps-nr"><b>${st}</b></span>${p ? box(p) : '<span></span>'}</div>`);
    }
    const vn = itemName(VORSCHAU), sel = seltenheit(VORSCHAU);
    const vorBelohnung = P.belohnungen.find(r => r.art === 'item' && r.wert === VORSCHAU);
    A.zeigeBlatt(`${zu}
      <div class="ps-hero ${sel}"><span>${SELT_NAME[sel]}</span><b>${e(vn[1])}</b><small>${vorBelohnung ? `Stufe ${vorBelohnung.stufe}${vorBelohnung.spur === 'premium' ? ' · Premium' : ' · Frei'}` : e(vn[0])}</small></div>
      <div class="ps-saison">
        <div class="ps-saison-name"><small>Saison</small><b>${e(P.name)}</b></div>
        <span class="ps-uhr"><i aria-hidden="true"></i>${restzeit()}</span>
      </div>
      <div class="ps-stand">
        <div class="ps-medaille" style="--p:${anteil}"><span><small>Stufe</small><b>${P.stufe}</b></span></div>
        <div class="ps-stand-text">
          <b>${max ? 'Maximum erreicht' : `${imStufe} / ${P.xp_pro_stufe} XP`}</b>
          <div class="ps-xpbalken"><u style="width:${anteil}%"></u></div>
          <small>${max ? 'Alle Stufen geschafft, stark!' : `Noch ${P.xp_pro_stufe - imStufe} XP bis Stufe ${P.stufe + 1}`}</small>
        </div>
      </div>
      ${max ? '' : `<div class="ps-next"><span class="ps-next-titel">Stufe ${P.stufe + 1} bringt</span><div class="ps-next-reihe">${mini(nextF)}<i class="ps-plus">+</i>${mini(nextP)}</div>
        ${ziel ? `<p class="ps-ziel">Nächster großer Preis: <b>${e(itemName(ziel.wert)[1])}</b> in ${ziel.stufe - P.stufe} ${ziel.stufe - P.stufe === 1 ? 'Stufe' : 'Stufen'}</p>` : ''}</div>`}
      ${n ? `<button class="ar-knopf breit gold ps-alle" data-pass="alle"><span>Alle abholen</span><em>${n}</em></button>` : ''}
      <div class="ps-wege">
        <span><i class="w-hantel"></i><b>Training</b><small>Wdh. und Tage</small></span>
        <span><i class="w-lauf"></i><b>Laufen</b><small>jeder Kilometer</small></span>
        <span><i class="w-schwert"></i><b>Battles</b><small>Rennen, Duelle</small></span>
      </div>
      <div class="ps-bilanz">
        <span>${A.coin}<b>${sum('coins')}</b></span><span>${gem}<b>${sum('gems')}</b></span><span><i class="ps-kiste"></i><b>${abg.filter(r => r.art === 'item').length}</b></span>
        <small>schon diese Saison geholt</small>
      </div>
      ${P.premium ? '<div class="ps-prem-an"><b>Premium aktiv</b><small>Beide Spuren gehören dir</small></div>'
        : `<button class="ps-werbung" data-pass="premium">
            <span class="ps-werbung-bild">${premItems.slice(-1).map(r => { const id = String(r.wert).split(':')[1]; return window.Figur && Figur.skinInfo(id) ? `<img src="${Figur.bild(id)}" alt="">` : ''; }).join('')}</span>
            <span class="ps-werbung-text"><small>Premium-Spur</small><b>${premItems.length} Kosmetik + ${premGems} ${gem}</b>
            ${verpasst.length ? `<em>${verpasst.length} Belohnungen warten schon auf dich</em>` : `<em>${e(premItems.slice(-2).reverse().map(r => itemName(r.wert)[1]).join(', '))}</em>`}</span>
          </button>`}
      <p class="ar-hand klein ps-tipp">Tippe auf ein Outfit, um es oben anzuschauen.</p>
      <div class="ps-kopfzeile"><span>Frei</span><span></span><span class="${P.premium ? '' : 'zu'}">Premium</span></div>
      <div class="ps-liste" style="--fort:${Math.min(P.stufe, P.stufen) / P.stufen}">${reihen.join('')}</div>
      ${P.premium ? '' : `<div class="ar-fuss"><button class="ar-knopf breit gold" data-pass="premium">Premium freischalten · ${e(preis())}</button></div>`}`, 'profil', { aussehen: vorschauLook(VORSCHAU) }, bleiben);
    $('arB3d').style.background = 'radial-gradient(circle at 50% 70%,#3B6EA5 0,#1F3A5F 70%)';
    if (!bleiben && P.stufe >= 4) setTimeout(() => { const j = el('psJetzt'); if (j && j.scrollIntoView) j.scrollIntoView({ block: 'center' }); }, 60);   // ab Stufe 4 zur aktuellen Stufe, sonst oben beim Hauptpreis
    if (nachOben) { const b = document.querySelector('.ar-blatt'); if (b) b.scrollTop = 0; }
  }

  async function nachher(meldung) {
    if (meldung) toast(meldung);
    if (window.Klang) Klang.effekt('kauf');
    feier();
    await Promise.all([laden(), A.figurLaden()]);
    sheet(true);
  }
  /* Abholen zeigt sofort alles an (Haken, Konfetti, Kontostand) und fragt den Server im Hintergrund.
     Sagt der Server nein, holt laden() den echten Stand und das Fenster wird korrigiert. */
  let holt = false;
  async function sofortAbholen(liste, anfrage) {
    if (holt || !liste.length) return;
    holt = true;
    const F = A.F();
    let coins = 0, gems = 0;
    liste.forEach(r => {
      P.abgeholt.push({ stufe: r.stufe, spur: r.spur });
      if (r.art === 'coins') coins += +r.wert; else if (r.art === 'gems') gems += +r.wert;
      else { VORSCHAU = r.wert; F.besitz = (F.besitz || []).concat(r.wert); }
    });
    F.coins += coins; F.gems = (F.gems || 0) + gems;
    const items = liste.filter(r => r.art === 'item');
    toast(liste.length === 1
      ? (coins ? `+${coins} Coins` : gems ? `+${gems} Gems` : `${itemName(items[0].wert)[1]} gehört dir`)
      : `${liste.length} Belohnungen: ${coins} Coins, ${gems} Gems${items.length ? ` und ${items.length} Kosmetik` : ''}`);
    if (window.Klang) Klang.effekt('kauf');
    feier();
    sheet(true, items.length > 0); chip();
    const z1 = el('arCoinZahl'), z2 = el('arGemZahl'); if (z1) z1.textContent = F.coins; if (z2) z2.textContent = F.gems;
    let ok = true;
    try { await anfrage(); } catch (err) { ok = false; toast(err.message); }
    holt = false;
    // Abgleich mit dem Server. Das Fenster wird nur neu gebaut, wenn etwas schiefging.
    await Promise.all([laden(), A.figurLaden()]);
    if (!ok && !document.querySelector('.ar-blatt').hidden) sheet(true);
  }
  const H = {
    spaeter() { A.schliessen(); },
    oeffnen() { sheet(); },
    vorschau(b) { if (b.item) { VORSCHAU = b.item; sheet(true, true); } },
    abholen(b) {
      const r = P.belohnungen.find(x => x.stufe === +b.stufe && x.spur === b.spur);
      return sofortAbholen(r ? [r] : [], () => W().rpc('wf_pass_abholen', mit({ p_stufe: +b.stufe, p_spur: b.spur })));
    },
    alle() {
      const liste = P.belohnungen.filter(r => r.stufe <= P.stufe && (r.spur === 'frei' || P.premium) && !geholt(r.stufe, r.spur));
      return sofortAbholen(liste, () => W().rpc('wf_pass_alle', mit({})));
    },
    async premium() { await kaufen(); }
  };
  $('arBlatt').addEventListener('click', ev => {
    const b = ev.target.closest('[data-pass]');
    if (!b || b.disabled || !H[b.dataset.pass]) return;
    Promise.resolve(H[b.dataset.pass](b.dataset)).catch(err => toast(err.message));
  });

  setTimeout(() => { laden(); coachSperre(); }, 1200);
  const altShowCoach = showTab;
  showTab = function (t) { altShowCoach(t); if (t === 'coach') coachSperre(); };
  setInterval(() => { if (!document.hidden) laden(); }, 45000);
  window.Pass = { angebot, laden, sheet, coachSperre, _test: { get P() { return P; } } };
})();
