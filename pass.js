/* ================= WINTERFORM PASS =================
   Saison-Pass mit 30 Stufen und zwei Spuren (frei und Premium). Erfahrung gibt es fürs Training
   (Wiederholungen, Kilometer, Trainingstage) und für jedes gewertete Rennen und Duell.
   Belohnungen sind nur Kosmetik und Coins, nie Pokale oder Vorteile im Rennen.
   Die Premium-Spur kostet Coins aus dem Spiel, es wird kein Echtgeld verlangt.
   Alles rechnet der Server (wf_pass_*), dieser Teil zeigt nur an und fragt zum Abholen.

   Läuft nach arena.js. Der Chip "Pass" sitzt oben auf dem Startbildschirm neben Coins und Pokalen. */
(function () {
  if (!window.ArenaUI || !window.WF) return;
  const A = window.ArenaUI, W = () => window.WF, ich = () => W().ich();
  const e = s => esc(s);
  const el = id => document.getElementById(id);
  const mit = a => Object.assign({ p_id: ich().id, p_geheim: ich().geheim }, a);
  const KAT = { kopf: 'Kopf', extra: 'Extra', skin: 'Skin', emote: 'Animation', intro: 'Intro', hg: 'Hintergrund' };
  let P = null;

  function itemName(wert) {
    const [k, i] = String(wert).split(':'), x = ((window.Figur && Figur.KATALOG[k]) || []).find(y => y[0] === i);
    return [KAT[k] || k, x ? x[1] : i];
  }

  /* ---------- Chip auf dem Startbildschirm ---------- */
  function chip() {
    const oben = document.querySelector('.ar-oben'); if (!oben) return;
    let c = el('arPass');
    if (!c) {
      c = document.createElement('button'); c.className = 'ar-chip'; c.id = 'arPass'; c.style.minWidth = '74px'; c.setAttribute('aria-label', 'Winterpass');
      c.innerHTML = `${A.rahmen(90, 48, 14, 11, '#fff')}<span class="ps-lab">Pass</span><b id="arPassStufe">0</b>`;
      oben.insertBefore(c, el('arZahn'));
      c.onclick = () => sheet();
    }
    el('arPassStufe').textContent = P && P.aktiv ? P.stufe : '0';
    c.classList.toggle('ps-neu', !!(P && P.aktiv && bereit() > 0));
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

  /* ---------- Pass-Fenster ---------- */
  function box(r) {
    const hat = geholt(r.stufe, r.spur), erreicht = r.stufe <= P.stufe, offen = r.spur === 'frei' || P.premium;
    const zustand = hat ? 'geholt' : erreicht && offen ? 'bereit' : erreicht ? 'premium' : 'zu';
    let inhalt;
    if (r.art === 'coins') inhalt = `${A.coin}<b>${r.wert}</b>`;
    else { const [k, n] = itemName(r.wert); inhalt = `<small>${e(k)}</small><b>${e(n)}</b>`; }
    return `<button class="ps-box ${zustand}${r.spur === 'premium' ? ' prem' : ''}" data-pass="abholen" data-stufe="${r.stufe}" data-spur="${r.spur}"${zustand === 'bereit' ? '' : ' disabled'}>${inhalt}${hat ? '<i class="ps-haken"></i>' : ''}</button>`;
  }

  function sheet(bleiben) {
    if (!ich()) { toast('Erst einen Spitznamen eintragen'); return; }
    const zu = '<button class="ar-zu" data-zu aria-label="Schließen">×</button>';
    if (!P || !P.aktiv) { A.zeigeBlatt(`${zu}<h2 class="ar-titel">Winterpass</h2><p class="ar-hand">Gerade läuft keine Saison. Die nächste kommt bald.</p>`); return; }
    const imStufe = P.xp % P.xp_pro_stufe, max = P.stufe >= P.stufen, n = bereit();
    const reihen = [];
    for (let st = 1; st <= P.stufen; st++) {
      const f = P.belohnungen.find(r => r.stufe === st && r.spur === 'frei'), p = P.belohnungen.find(r => r.stufe === st && r.spur === 'premium');
      reihen.push(`<div class="ps-reihe${st === P.stufe ? ' jetzt' : ''}${st <= P.stufe ? ' erreicht' : ''}"${st === Math.max(1, P.stufe) ? ' id="psJetzt"' : ''}>${f ? box(f) : '<span></span>'}<span class="ps-nr">${st}</span>${p ? box(p) : '<span></span>'}</div>`);
    }
    A.zeigeBlatt(`${zu}
      <h2 class="ar-titel">${e(P.name)}</h2>
      <p class="ar-hand">Noch ${P.tage_rest} ${P.tage_rest === 1 ? 'Tag' : 'Tage'}</p>
      <div class="ps-kopf"><b>Stufe ${P.stufe}${max ? ' (Maximum)' : ''}</b><span>${max ? 'Alles geschafft' : `${imStufe} von ${P.xp_pro_stufe} XP`}</span></div>
      <div class="ar-weg ps-balken"><i style="width:${max ? 100 : imStufe / P.xp_pro_stufe * 100}%"></i></div>
      <p class="ar-hand klein">XP gibt es fürs Training (Wiederholungen, Kilometer, Trainingstage) und für jedes gewertete Rennen und Duell.</p>
      ${n ? `<button class="ar-knopf breit gold" data-pass="alle">Alle abholen (${n})</button>` : ''}
      ${P.premium ? '<p class="ps-prem">Premium-Spur aktiv</p>'
        : `<button class="ar-knopf breit" data-pass="premium">Premium-Spur freischalten · ${P.premium_preis} ${A.coin}</button>
           <p class="ar-hand klein">Nur Kosmetik und Coins, kein Vorteil im Rennen. Bezahlt wird mit Coins, die du im Spiel verdienst.</p>`}
      <div class="ps-kopfzeile"><span>Frei</span><span></span><span>Premium</span></div>
      <div class="ps-liste">${reihen.join('')}</div>`, null, null, bleiben);
    if (!bleiben) setTimeout(() => { const j = el('psJetzt'); if (j && j.scrollIntoView) j.scrollIntoView({ block: 'center' }); }, 60);
  }

  async function nachher(meldung) {
    if (meldung) toast(meldung);
    if (window.Klang) Klang.effekt('muenze');
    await Promise.all([laden(), A.figurLaden()]);
    sheet(true);
  }
  const H = {
    async abholen(b) {
      try {
        const r = await W().rpc('wf_pass_abholen', mit({ p_stufe: +b.stufe, p_spur: b.spur }));
        await nachher(r.art === 'coins' ? `+${r.wert} Coins` : `${itemName(r.wert)[1]} gehört dir`);
      } catch (err) { toast(err.message); }
    },
    async alle() {
      try {
        const r = await W().rpc('wf_pass_alle', mit({}));
        await nachher(`${r.anzahl} Belohnungen: ${r.coins} Coins${r.items.length ? ` und ${r.items.length} Kosmetik` : ''}`);
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
