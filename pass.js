/* ================= WINTERFORM PASS =================
   Saison-Pass mit 30 Stufen und zwei Spuren (frei und Premium). Erfahrung gibt es fürs Training
   (Wiederholungen, Kilometer, Trainingstage) und für jedes gewertete Rennen und Duell.
   Zwei Währungen: Coins (Alltag) und Gems (besondere Outfits). Der Pass bringt beides, dazu Kosmetik.
   Belohnungen sind nur Kosmetik und Währung, nie Pokale oder Vorteile im Rennen.
   Die Premium-Spur kostet Coins aus dem Spiel, es wird kein Echtgeld verlangt.
   Oben im Fenster steht der Hauptpreis in 3D, jede Kosmetik lässt sich antippen und anschauen.
   Alles rechnet der Server (wf_pass_*), dieser Teil zeigt nur an und fragt zum Abholen.

   Läuft nach arena.js. Der Pass-Knopf sitzt auf dem Startbildschirm neben BATTLE. */
(function () {
  if (!window.ArenaUI || !window.WF) return;
  const A = window.ArenaUI, W = () => window.WF, ich = () => W().ich();
  const e = s => esc(s);
  const el = id => document.getElementById(id);
  const mit = a => Object.assign({ p_id: ich().id, p_geheim: ich().geheim }, a);
  const KAT = { kopf: 'Kopf', extra: 'Extra', skin: 'Outfit', emote: 'Animation', intro: 'Intro', hg: 'Hintergrund' };
  const gem = '<img class="ar-gem" src="arena/gem.svg" alt="Gems">';
  const HAUPTPREIS = 'skin:eiskoenig';
  let P = null, VORSCHAU = HAUPTPREIS;

  function itemName(wert) {
    const [k, i] = String(wert).split(':'), x = ((window.Figur && Figur.KATALOG[k]) || []).find(y => y[0] === i);
    return [KAT[k] || k, x ? x[1] : i];
  }
  // Seltenheit nur zur Anzeige: Outfits sind episch, der Eiskönig legendär, der Rest selten
  const seltenheit = wert => wert === HAUPTPREIS ? 'legendaer' : String(wert).startsWith('skin:') ? 'episch' : 'selten';
  const SELT_NAME = { legendaer: 'Legendär', episch: 'Episch', selten: 'Selten' };

  /* ---------- Pass-Knopf neben BATTLE ---------- */
  function chip() {
    const battle = el('arBattle'); if (!battle) return;
    let c = el('arPass');
    if (!c) {
      let reihe = battle.parentNode;
      if (!reihe.classList.contains('ar-aktion')) {
        reihe = document.createElement('div'); reihe.className = 'ar-aktion';
        battle.parentNode.insertBefore(reihe, battle); reihe.appendChild(battle);
      }
      c = document.createElement('button'); c.className = 'ar-passknopf'; c.id = 'arPass'; c.setAttribute('aria-label', 'Winterpass öffnen');
      reihe.appendChild(c);
      c.onclick = () => sheet();
    }
    const n = bereit(), lv = P && P.aktiv ? P.stufe : 0, anteil = P && P.aktiv ? (P.stufe >= P.stufen ? 100 : (P.xp % P.xp_pro_stufe) / P.xp_pro_stufe * 100) : 0;
    c.innerHTML = `<span class="pk-gem">${gem}</span><b>Pass ${lv}</b><i class="pk-balken"><u style="width:${anteil}%"></u></i>${n > 0 ? `<em class="pk-punkt">${n}</em>` : ''}`;
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
    chip();
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

  /* ---------- Pass-Fenster ---------- */
  function box(r) {
    const hat = geholt(r.stufe, r.spur), erreicht = r.stufe <= P.stufe, offen = r.spur === 'frei' || P.premium;
    const zustand = hat ? 'geholt' : erreicht && offen ? 'bereit' : erreicht ? 'premium' : 'zu';
    let inhalt, art = '', aktion = 'abholen', klick = zustand === 'bereit';
    if (r.art === 'coins') inhalt = `${A.coin}<b>${r.wert}</b>`;
    else if (r.art === 'gems') { inhalt = `${gem}<b>${r.wert}</b>`; art = ' gems'; }
    else {
      const [k, n] = itemName(r.wert);
      inhalt = `<small>${e(k)}</small><b>${e(n)}</b>`; art = ' item ' + seltenheit(r.wert);
      if (zustand !== 'bereit') { aktion = 'vorschau'; klick = true; }
    }
    return `<button class="ps-box ${zustand}${art}${r.spur === 'premium' ? ' prem' : ''}${r.art === 'item' && VORSCHAU === r.wert ? ' gewaehlt' : ''}" data-pass="${aktion}" data-stufe="${r.stufe}" data-spur="${r.spur}" data-item="${r.art === 'item' ? e(r.wert) : ''}"${klick ? '' : ' disabled'}>${inhalt}${hat ? '<i class="ps-haken"></i>' : ''}</button>`;
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
    if (!P || !P.aktiv) { A.zeigeBlatt(`${zu}<h2 class="ar-titel">Winterpass</h2><p class="ar-hand">Gerade läuft keine Saison. Die nächste kommt bald.</p>`); return; }
    const imStufe = P.xp % P.xp_pro_stufe, max = P.stufe >= P.stufen, n = bereit();
    const prem = P.belohnungen.filter(r => r.spur === 'premium');
    const premGems = prem.filter(r => r.art === 'gems').reduce((s, r) => s + (+r.wert), 0);
    const premItems = prem.filter(r => r.art === 'item').map(r => itemName(r.wert)[1]);
    const freiGems = P.belohnungen.filter(r => r.spur === 'frei' && r.art === 'gems').reduce((s, r) => s + (+r.wert), 0);
    const reihen = [];
    for (let st = 1; st <= P.stufen; st++) {
      const f = P.belohnungen.find(r => r.stufe === st && r.spur === 'frei'), p = P.belohnungen.find(r => r.stufe === st && r.spur === 'premium');
      reihen.push(`<div class="ps-reihe${st === P.stufe ? ' jetzt' : ''}${st <= P.stufe ? ' erreicht' : ''}${st % 10 === 0 ? ' gross' : ''}"${st === Math.max(1, P.stufe) ? ' id="psJetzt"' : ''}>${f ? box(f) : '<span></span>'}<span class="ps-nr">${st}</span>${p ? box(p) : '<span></span>'}</div>`);
    }
    const vn = itemName(VORSCHAU), sel = seltenheit(VORSCHAU);
    const vorBelohnung = P.belohnungen.find(r => r.art === 'item' && r.wert === VORSCHAU);
    A.zeigeBlatt(`${zu}
      <div class="ps-hero ${sel}"><span>${SELT_NAME[sel]}</span><b>${e(vn[1])}</b><small>${vorBelohnung ? `Stufe ${vorBelohnung.stufe}${vorBelohnung.spur === 'premium' ? ' · Premium' : ' · Frei'}` : e(vn[0])}</small></div>
      <h2 class="ar-titel">${e(P.name)}</h2>
      <p class="ar-hand">Noch ${P.tage_rest} ${P.tage_rest === 1 ? 'Tag' : 'Tage'}</p>
      <div class="ps-konto"><span>${A.coin}<b>${A.F().coins}</b></span><span>${gem}<b>${A.F().gems || 0}</b></span></div>
      ${P.premium ? '<p class="ps-prem">Premium-Spur aktiv</p>'
        : `<div class="ps-werbung"><b>Premium-Spur</b><span>${e(premItems.slice(-3).reverse().join(', '))} und ${premGems} ${gem}</span></div>`}
      <div class="ps-kopf"><b>Stufe ${P.stufe}${max ? ' (Maximum)' : ''}</b><span>${max ? 'Alles geschafft' : `${imStufe} von ${P.xp_pro_stufe} XP`}</span></div>
      <div class="ar-weg ps-balken"><i style="width:${max ? 100 : imStufe / P.xp_pro_stufe * 100}%"></i></div>
      <p class="ar-hand klein">XP gibt es fürs Training (Wiederholungen, Kilometer, Trainingstage) und für jedes gewertete Rennen und Duell.</p>
      ${n ? `<button class="ar-knopf breit gold" data-pass="alle">Alle abholen (${n})</button>` : ''}
      <p class="ar-hand klein">Tippe auf ein Outfit oder eine Kosmetik, um sie oben anzuschauen.</p>
      <div class="ps-kopfzeile"><span>Frei</span><span></span><span>Premium</span></div>
      <div class="ps-liste">${reihen.join('')}</div>
      ${P.premium ? '' : `<div class="ar-fuss"><button class="ar-knopf breit gold" data-pass="premium">Premium-Spur freischalten · ${P.premium_preis} ${A.coin}</button></div>`}`, 'profil', { aussehen: vorschauLook(VORSCHAU) }, bleiben);
    $('arB3d').style.background = '#1F3A5F';
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
  const H = {
    vorschau(b) { if (b.item) { VORSCHAU = b.item; sheet(true, true); } },
    async abholen(b) {
      try {
        const r = await W().rpc('wf_pass_abholen', mit({ p_stufe: +b.stufe, p_spur: b.spur }));
        if (r.art === 'item') VORSCHAU = r.wert;
        await nachher(r.art === 'coins' ? `+${r.wert} Coins` : r.art === 'gems' ? `+${r.wert} Gems` : `${itemName(r.wert)[1]} gehört dir`);
      } catch (err) { toast(err.message); }
    },
    async alle() {
      try {
        const r = await W().rpc('wf_pass_alle', mit({}));
        if (r.items.length) VORSCHAU = r.items[r.items.length - 1];
        await nachher(`${r.anzahl} Belohnungen: ${r.coins} Coins, ${r.gems || 0} Gems${r.items.length ? ` und ${r.items.length} Kosmetik` : ''}`);
      } catch (err) { toast(err.message); }
    },
    async premium() {
      if (!confirm(`Premium-Spur für ${P.premium_preis} Coins freischalten?`)) return;
      try { await W().rpc('wf_pass_premium', mit({})); await nachher('Premium-Spur freigeschaltet'); }
      catch (err) { toast(err.message); }
    }
  };
  $('arBlatt').addEventListener('click', ev => {
    const b = ev.target.closest('[data-pass]');
    if (!b || b.disabled || !H[b.dataset.pass]) return;
    Promise.resolve(H[b.dataset.pass](b.dataset)).catch(err => toast(err.message));
  });

  setTimeout(laden, 1200);
  setInterval(() => { if (!document.hidden) laden(); }, 45000);
  window.Pass = { laden, sheet, _test: { get P() { return P; } } };
})();
