/* ================= WINTERFORM CREW =================
   Crew (Gruppe mit Code und Wochenrangliste), Serie mit Einfrieren und Auftauen,
   Duell per Link (60 Sekunden, die Kamera zählt), Lauf-Match live, Wochen-Rückblick als Bild.

   Kein Login: Das Gerät bekommt eine zufällige Geheim-ID (nur hier gespeichert).
   Der Server (Supabase, Tabellen wf_*) speichert nur deren Prüfsumme und lässt Schreiben
   nur über Funktionen zu, die diese ID prüfen. Gelesen werden nur Spitznamen und Zahlen.

   Läuft nach dem Haupt-Skript und nutzt dessen Funktionen: launch, startCam, stopCam,
   toggleRun, afterProgress, finishRun, isDone, showTab und die Variablen reps, runOn, runMeters. */
(function () {
  const API = SUPABASE_URL + '/rest/v1';
  const KOPF = { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON, 'Content-Type': 'application/json' };
  const ICH_KEY = 'wf-ich', CREW_KEY = 'wf-crew';
  const UEBUNGEN = { 'Liegestütze': ['Klassische Liegestütze', 'elbow'], 'Squats': ['Klassische Squats', 'knee'] };
  const e = s => esc(s);

  let ich = store.get(ICH_KEY, null);            // {id, geheim, name}
  let crew = store.get(CREW_KEY, null);          // {id, code, name}
  let vorCode = null;                            // Code aus einem Einladungslink, bis der Spitzname da ist

  /* ---------- Server ---------- */
  async function rpc(name, args) {
    const r = await fetch(`${API}/rpc/${name}`, { method: 'POST', headers: KOPF, body: JSON.stringify(args || {}) });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && j.message) || 'Serverfehler ' + r.status);
    return j;
  }
  async function lesen(pfad) {
    const r = await fetch(`${API}/${pfad}`, { headers: KOPF });
    if (!r.ok) throw new Error('Serverfehler ' + r.status);
    return r.json();
  }
  const mit = args => Object.assign({ p_id: ich.id, p_geheim: ich.geheim }, args);

  function neuesGeheimnis() {
    const b = new Uint8Array(24); crypto.getRandomValues(b);
    return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  }
  async function sicherIch() {
    if (ich) return ich;
    const name = ($('wfName').value || '').trim();
    if (name.length < 2) { $('wfName').focus(); throw new Error('Erst einen Spitznamen eintragen'); }
    const geheim = neuesGeheimnis();
    const id = await rpc('wf_registrieren', { p_name: name, p_geheim: geheim });
    ich = { id, geheim, name }; store.set(ICH_KEY, ich);
    return ich;
  }

  /* ---------- Punkte melden: fertige Übung, fertiger Lauf ---------- */
  function melden(wdh, meter, training) {
    if (!ich) return;
    rpc('wf_aktivitaet_melden', mit({ p_wdh: Math.round(wdh), p_meter: Math.round(meter), p_training: !!training }))
      .then(() => { if (curTab === 'crew') zeichnen(); })
      .catch(() => {});
  }
  const altAfter = afterProgress;
  afterProgress = function (t, was) {
    altAfter(t, was);
    if (!was && t && t.type === 'ex' && isDone(t)) {
      const proSatz = /^\d+$/.test(String(t.reps)) ? +t.reps : 10;     // Zeit-Übungen zählen pauschal 10
      melden(t.goal * proSatz, 0, true);
    }
  };
  const altFinish = finishRun;
  finishRun = function (km, sec) {
    const m = altFinish(km, sec);
    if (km >= 0.3) melden(0, km * 1000, true);
    if (match.id) matchMeter(true);
    return m;
  };

  /* ---------- Oberfläche ---------- */
  const tab = document.createElement('section');
  tab.id = 'tab-crew'; tab.className = 'tab';
  tab.innerHTML = `
    <div class="card">
      <span class="label">Du</span>
      <div class="fields"><input id="wfName" type="text" maxlength="20" placeholder="Spitzname (kein echter Name)" autocomplete="off"></div>
      <p class="kmline" id="wfSerie"></p>
      <div id="wfFrost"></div>
    </div>
    <div class="card">
      <span class="label">Crew</span>
      <div id="wfCrew"></div>
    </div>
    <div class="card">
      <span class="label">Duell</span>
      <p class="muted">60 Sekunden, so viele wie du schaffst. Die Kamera zählt mit, dann schickst du den Link.</p>
      <div id="wfDuellIn"></div>
      <div class="fields"><select id="wfUebung"><option>Liegestütze</option><option>Squats</option></select>
        <button class="send" id="wfDuellLos" aria-label="Duell starten"><svg><use href="#i-plus"/></svg></button></div>
      <div id="wfDuellOut"></div>
    </div>
    <div class="card">
      <span class="label">Lauf-Match</span>
      <p class="muted">Ihr lauft gleichzeitig, jeder wo er will. Wer zuerst die Strecke hat, gewinnt.</p>
      <div id="wfMatch"></div>
    </div>
    <div class="card">
      <span class="label">Wochen-Rückblick</span>
      <p class="muted">Deine Woche als Bild für die Story.</p>
      <button class="ghost" id="wfRueckblick">Bild erstellen</button>
    </div>`;
  document.querySelector('main').appendChild(tab);

  const knopf = document.createElement('button');
  knopf.dataset.tab = 'crew';
  knopf.innerHTML = '<svg><use href="#i-crew"/></svg>Crew';
  const nav = document.querySelector('.nav');
  nav.insertBefore(knopf, nav.querySelector('[data-tab="coach"]'));
  knopf.onclick = () => showTab('crew');
  TABORDER.splice(3, 0, 'crew');
  document.querySelector('svg defs').insertAdjacentHTML('beforeend',
    '<symbol id="i-crew" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="9.5" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M14.5 14.6c.8-.4 1.6-.6 2.5-.6 2 0 3.6 1.4 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>');
  const heuteKarte = $('todayFocus');
  if (heuteKarte && heuteKarte.parentNode) heuteKarte.insertAdjacentHTML('beforebegin', '<p class="kmline" id="wfSerieHeute" hidden></p>');

  const altShow = showTab;
  showTab = function (t) { altShow(t); if (t === 'crew') zeichnen(); };

  $('wfName').value = ich ? ich.name : '';
  $('wfName').addEventListener('change', async () => {
    const n = $('wfName').value.trim();
    if (n.length < 2) return;
    try {
      if (!ich) await sicherIch();
      else if (n !== ich.name) { await rpc('wf_name_aendern', mit({ p_name: n })); ich.name = n; store.set(ICH_KEY, ich); }
      if (vorCode && !crew) { const c = vorCode; vorCode = null; return beitreten(c); }   // Einladungslink: direkt beitreten
      toast('Gespeichert');
      zeichnen();
    } catch (err) { toast(err.message); }
  });

  /* ---------- Serie und Crew zeichnen ---------- */
  async function serieZeigen() {
    if (!ich) { $('wfSerie').textContent = 'Trag einen Spitznamen ein, dann zählt deine Serie.'; return; }
    try {
      const [s] = await rpc('wf_serie', { p_spieler: ich.id });
      const txt = s.eingefroren
        ? 'Du bist eingefroren. Jemand aus deiner Crew kann dich heute auftauen, oder du startest neu.'
        : `Serie: ${s.serie} ${s.serie === 1 ? 'Tag' : 'Tage'}${s.heute_aktiv ? '' : ', heute noch nichts'}`;
      $('wfSerie').textContent = txt;
      const h = $('wfSerieHeute'); h.hidden = false; h.textContent = txt;
    } catch (err) { $('wfSerie').textContent = ''; }
  }

  async function crewZeigen() {
    const box = $('wfCrew');
    if (!crew) {
      box.innerHTML = `<p class="muted">Gründe eine Crew mit deiner Klasse oder deinen Freunden, oder tritt mit einem Code bei.</p>
        <div class="fields"><input id="wfCrewName" maxlength="30" placeholder="Name der Crew"><button class="send" id="wfGruenden" aria-label="Gründen"><svg><use href="#i-plus"/></svg></button></div>
        <div class="fields"><input id="wfCode" maxlength="6" placeholder="Code, z.B. H5AMYQ" autocapitalize="characters" value="${e(vorCode || '')}"><button class="send" id="wfBeitreten" aria-label="Beitreten"><svg><use href="#i-send"/></svg></button></div>`;
      $('wfGruenden').onclick = gruenden;
      $('wfBeitreten').onclick = () => beitreten($('wfCode').value);
      $('wfFrost').innerHTML = '';
      return;
    }
    let liste = [], serien = {};
    try {
      liste = await rpc('wf_rangliste', { p_gruppe: crew.id });
      await Promise.all(liste.map(async m => { try { serien[m.spieler_id] = (await rpc('wf_serie', { p_spieler: m.spieler_id }))[0]; } catch {} }));
    } catch (err) { box.innerHTML = `<p class="muted">${e(err.message)}</p>`; return; }
    box.innerHTML = `<p class="muted"><b style="color:var(--txt)">${e(crew.name)}</b> · Code <b style="color:var(--volt)">${e(crew.code)}</b> · diese Woche</p>
      <table class="tbl"><thead><tr><th>#</th><th>Name</th><th>Punkte</th><th></th></tr></thead><tbody>${
        liste.map((m, i) => {
          const s = serien[m.spieler_id] || {}, bin = ich && m.spieler_id === ich.id;
          const frost = s.eingefroren ? `<button class="exinfo" data-auftauen="${m.spieler_id}">Auftauen</button>` : '';
          return `<tr><td>${i + 1}</td><td><b>${e(m.name)}${bin ? ' (du)' : ''}</b><span>${s.eingefroren ? 'eingefroren' : `Serie ${s.serie || 0}`} · ${m.wdh} Wdh · ${(m.meter / 1000).toFixed(1).replace('.', ',')} km</span>${bin ? '' : frost}</td><td>${m.punkte}</td><td></td></tr>`;
        }).join('')}</tbody></table>
      <p class="muted small">Punkte: 1 pro Wiederholung, 1 pro 20 m Laufen, 20 pro Trainingstag.</p>
      <div class="btnrow"><button class="ghost" id="wfEinladen">Freunde einladen</button><button class="ghost" id="wfVerlassen">Crew verlassen</button></div>`;
    $('wfEinladen').onclick = () => teilen(`Komm in meine Winterform-Crew "${crew.name}"`, linkMit('crew', crew.code));
    $('wfVerlassen').onclick = verlassen;
    box.querySelectorAll('[data-auftauen]').forEach(b => b.onclick = () => auftauen(b.dataset.auftauen));
  }

  async function zeichnen() {
    await Promise.all([serieZeigen(), crewZeigen()]);
    matchZeigen();
  }

  async function gruenden() {
    try {
      await sicherIch();
      const name = $('wfCrewName').value.trim();
      if (name.length < 2) return toast('Name der Crew fehlt');
      const code = await rpc('wf_gruppe_erstellen', mit({ p_name: name }));
      const [g] = await lesen(`wf_gruppen?code=eq.${code}&select=id,code,name`);
      crew = g; store.set(CREW_KEY, crew); zeichnen();
      toast('Crew gegründet. Lade jetzt deine Leute ein.');
    } catch (err) { toast(err.message); }
  }
  async function beitreten(code) {
    try {
      await sicherIch();
      code = String(code || '').trim().toUpperCase();
      const id = await rpc('wf_gruppe_beitreten', mit({ p_code: code }));
      const [g] = await lesen(`wf_gruppen?id=eq.${id}&select=id,code,name`);
      crew = g; store.set(CREW_KEY, crew); zeichnen();
      toast(`Willkommen in ${g.name}`);
    } catch (err) { toast(err.message === 'code unbekannt' ? 'Diesen Code gibt es nicht' : err.message); }
  }
  async function verlassen() {
    if (!confirm('Crew wirklich verlassen?')) return;
    try { await rpc('wf_gruppe_verlassen', mit({ p_gruppe: crew.id })); } catch {}
    crew = null; store.set(CREW_KEY, null); zeichnen();
  }
  async function auftauen(fuer) {
    try { await rpc('wf_auftauen', mit({ p_fuer: fuer })); toast('Aufgetaut. Die Serie lebt weiter.'); zeichnen(); }
    catch (err) { toast(err.message === 'erst selbst trainieren' ? 'Erst selbst heute trainieren, dann kannst du auftauen' : err.message); }
  }

  /* ---------- Links und Teilen ---------- */
  const linkMit = (art, wert) => `${location.origin}${location.pathname}?${art}=${encodeURIComponent(wert)}`;
  async function teilen(text, url) {
    try {
      if (navigator.share) { await navigator.share({ title: 'Winterform', text, url }); return; }
    } catch (err) { if (err.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(`${text}: ${url}`); toast('Link kopiert'); }
    catch { prompt('Link kopieren:', url); }
  }

  /* ---------- Duell: 60 Sekunden, die Kamera zählt ---------- */
  let duell = null;                                         // {art:'neu'|'antwort', id, uebung, gegnerErgebnis, von}
  const leiste = document.createElement('div');
  leiste.id = 'wfLeiste'; leiste.hidden = true;
  document.body.appendChild(leiste);

  $('wfDuellLos').onclick = async () => {
    try { await sicherIch(); } catch (err) { return toast(err.message); }
    duellStarten({ art: 'neu', uebung: $('wfUebung').value });
  };

  async function duellStarten(d) {
    duell = d;
    const [name, modus] = UEBUNGEN[d.uebung] || UEBUNGEN['Squats'];
    launch(name, modus, '1 × 999');                         // Ziel hoch, damit kein Satz vorher "fertig" ist
    await startCam();
    if (!camOn) { duell = null; return toast('Ohne Kamera kein Duell'); }
    leiste.hidden = false;
    let rest = 3;
    leiste.innerHTML = `<span>Seitlich hinstellen, ganzer Körper ins Bild. Start in ${rest}</span>`;
    const vor = setInterval(() => {
      rest--;
      if (rest > 0) { leiste.querySelector('span').textContent = `Seitlich hinstellen, ganzer Körper ins Bild. Start in ${rest}`; return; }
      clearInterval(vor);
      reps = 0; updCam(); say('Los', true);
      const ende = Date.now() + 60000;
      const lauf = setInterval(() => {
        const s = Math.max(0, Math.ceil((ende - Date.now()) / 1000));
        leiste.innerHTML = `<b>${reps}</b><span>${d.uebung} · noch ${s} s</span>`;
        if (s <= 0) { clearInterval(lauf); duellEnde(reps); }
      }, 200);
    }, 1000);
  }

  async function duellEnde(ergebnis) {
    stopCam(); say(`Zeit. ${ergebnis}`, true);
    leiste.hidden = true;
    const d = duell; duell = null;
    try {
      if (d.art === 'neu') {
        const id = await rpc('wf_duell_erstellen', mit({ p_uebung: d.uebung, p_ergebnis: ergebnis }));
        melden(ergebnis, 0, true);
        $('wfDuellOut').innerHTML = `<p class="kmline">Dein Ergebnis: ${ergebnis} ${e(d.uebung)}. Jetzt jemanden herausfordern.</p>
          <button class="primary" id="wfDuellTeilen">Duell-Link schicken</button>`;
        $('wfDuellTeilen').onclick = () => teilen(`${ich.name} schafft ${ergebnis} ${d.uebung} in 60 Sekunden. Schaffst du mehr?`, linkMit('duell', id));
        showTab('crew');
      } else {
        await rpc('wf_duell_antworten', mit({ p_duell: d.id, p_ergebnis: ergebnis }));
        melden(ergebnis, 0, true);
        const sieg = ergebnis > d.gegnerErgebnis, gleich = ergebnis === d.gegnerErgebnis;
        $('wfDuellIn').innerHTML = `<p class="kmline">${gleich ? 'Unentschieden' : sieg ? 'Gewonnen' : 'Verloren'}: du ${ergebnis}, ${e(d.von)} ${d.gegnerErgebnis}.</p>`;
        showTab('crew');
      }
    } catch (err) { toast(err.message); showTab('crew'); }
  }

  async function duellLaden(id) {
    try {
      const [d] = await lesen(`wf_duelle?id=eq.${encodeURIComponent(id)}&select=id,von,uebung,ergebnis_von,gegner,ergebnis_gegner`);
      if (!d) return toast('Duell nicht gefunden');
      const [v] = await lesen(`wf_spieler?id=eq.${d.von}&select=name`);
      const vonName = v ? v.name : 'Jemand';
      showTab('crew');
      if (ich && d.von === ich.id) {
        $('wfDuellIn').innerHTML = d.gegner ? `<p class="kmline">Dein Duell ist beantwortet: ${d.ergebnis_gegner} gegen deine ${d.ergebnis_von}.</p>` : '<p class="muted">Noch keiner hat geantwortet.</p>';
        return;
      }
      if (d.gegner) { $('wfDuellIn').innerHTML = `<p class="muted">Dieses Duell wurde schon beantwortet.</p>`; return; }
      $('wfDuellIn').innerHTML = `<p class="kmline">${e(vonName)} fordert dich heraus: ${d.ergebnis_von} ${e(d.uebung)} in 60 Sekunden.</p>
        <button class="primary" id="wfAnnehmen">Annehmen</button>`;
      $('wfAnnehmen').onclick = async () => {
        try { await sicherIch(); } catch (err) { return toast(err.message); }
        duellStarten({ art: 'antwort', id: d.id, uebung: d.uebung, gegnerErgebnis: d.ergebnis_von, von: vonName });
      };
    } catch (err) { toast(err.message); }
  }

  /* ---------- Lauf-Match live (Abfrage alle 3 Sekunden) ---------- */
  const match = { id: store.get('wf-match', null), daten: null, timer: null, gesendet: 0 };

  function matchZeigen() {
    const box = $('wfMatch');
    const m = match.daten;
    if (!match.id || !m) {
      box.innerHTML = `<div class="fields"><select id="wfZiel"><option value="1000">1 km</option><option value="2000" selected>2 km</option><option value="3000">3 km</option><option value="5000">5 km</option></select>
        <button class="send" id="wfMatchNeu" aria-label="Match erstellen"><svg><use href="#i-plus"/></svg></button></div>`;
      $('wfMatchNeu').onclick = matchNeu;
      return;
    }
    const binA = ich && m.a === ich.id;
    const ich_m = binA ? m.a_m : m.b_m, gegner_m = binA ? m.b_m : m.a_m;
    const balken = (x, farbe) => `<div class="bar"><i style="width:${Math.min(100, x / m.ziel_m * 100)}%;background:${farbe}"></i></div>`;
    let status;
    if (m.sieger) status = m.sieger === (ich && ich.id) ? 'Gewonnen!' : 'Verloren. Nächstes Mal.';
    else if (!m.b) status = 'Warte auf deinen Gegner. Schick den Link.';
    else if (!m.start_at) status = 'Beide da. Wer bereit ist, drückt Start.';
    else if (new Date(m.start_at) > new Date()) status = `Start in ${Math.ceil((new Date(m.start_at) - new Date()) / 1000)} s`;
    else status = 'Läuft';
    box.innerHTML = `<p class="kmline">${status}</p>
      <p class="muted small">Du: ${(ich_m / 1000).toFixed(2).replace('.', ',')} km von ${(m.ziel_m / 1000).toFixed(0)} km</p>${balken(ich_m, 'var(--volt)')}
      <p class="muted small">Gegner: ${(gegner_m / 1000).toFixed(2).replace('.', ',')} km</p>${balken(gegner_m, 'var(--mut)')}
      <div class="btnrow">${!m.b ? '<button class="primary" id="wfMatchTeilen">Match-Link schicken</button>' : ''}
      ${m.b && !m.start_at ? '<button class="primary" id="wfMatchStart">Start</button>' : ''}
      <button class="ghost" id="wfMatchWeg">${m.sieger ? 'Schließen' : 'Abbrechen'}</button></div>`;
    if ($('wfMatchTeilen')) $('wfMatchTeilen').onclick = () => teilen(`Lauf-Match gegen ${ich.name}: Wer schafft ${m.ziel_m / 1000} km zuerst?`, linkMit('match', m.id));
    if ($('wfMatchStart')) $('wfMatchStart').onclick = () => rpc('wf_match_starten', mit({ p_match: m.id })).then(matchHolen).catch(err => toast(err.message));
    $('wfMatchWeg').onclick = () => { match.id = null; match.daten = null; store.set('wf-match', null); clearInterval(match.timer); matchZeigen(); };
  }

  async function matchHolen() {
    if (!match.id) return;
    try {
      const [m] = await lesen(`wf_matches?id=eq.${match.id}&select=*`);
      const vorher = match.daten;
      match.daten = m || null;
      if (!m) { match.id = null; store.set('wf-match', null); }
      else {
        const gestartet = m.start_at && new Date(m.start_at) <= new Date();
        if (gestartet && !m.sieger && !runOn && !(vorher && vorher._laeuft)) {
          m._laeuft = true; showTab('lung'); toggleRun(); say('Match läuft. Los!', true);
        } else if (vorher) m._laeuft = vorher._laeuft;
        if (gestartet && !m.sieger) matchMeter(false);
        if (m.sieger && !(vorher && vorher.sieger)) {
          say(m.sieger === ich.id ? 'Du hast das Match gewonnen' : 'Dein Gegner war schneller', true);
          toast(m.sieger === ich.id ? 'Match gewonnen!' : 'Match verloren');
        }
      }
    } catch {}
    if (curTab === 'crew') matchZeigen();
  }
  function matchMeter(sofort) {
    if (!match.id || !ich) return;
    if (!sofort && Date.now() - match.gesendet < 4000) return;
    match.gesendet = Date.now();
    rpc('wf_match_meter', mit({ p_match: match.id, p_meter: Math.round(runMeters) })).catch(() => {});
  }
  function matchBeobachten() {
    clearInterval(match.timer);
    if (!match.id) return;
    matchHolen();
    match.timer = setInterval(matchHolen, 3000);
  }
  async function matchNeu() {
    try {
      await sicherIch();
      match.id = await rpc('wf_match_erstellen', mit({ p_ziel: +$('wfZiel').value }));
      store.set('wf-match', match.id); matchBeobachten();
    } catch (err) { toast(err.message); }
  }
  async function matchBeitreten(id) {
    showTab('crew');
    try {
      await sicherIch();
      await rpc('wf_match_beitreten', mit({ p_match: id }));
      match.id = id; store.set('wf-match', id); matchBeobachten();
      toast('Match beigetreten. Drück Start, wenn ihr beide bereit seid.');
    } catch (err) { toast(err.message === 'match voll' ? 'Das Match ist schon voll' : err.message); }
  }

  /* ---------- Wochen-Rückblick als Story-Bild ---------- */
  $('wfRueckblick').onclick = async () => {
    try {
      await sicherIch();
      const heute = new Date(), mo = new Date(heute); mo.setDate(heute.getDate() - ((heute.getDay() + 6) % 7));
      const von = mo.toLocaleDateString('sv-SE');
      const akt = await lesen(`wf_aktivitaet?spieler_id=eq.${ich.id}&tag=gte.${von}&select=tag,wdh,meter,training`);
      const wdh = akt.reduce((s, a) => s + a.wdh, 0), km = akt.reduce((s, a) => s + a.meter, 0) / 1000;
      const tage = new Set(akt.filter(a => a.wdh || a.meter || a.training).map(a => a.tag)).size;
      const [s] = await rpc('wf_serie', { p_spieler: ich.id });
      let platz = '';
      if (crew) {
        const r = await rpc('wf_rangliste', { p_gruppe: crew.id });
        const i = r.findIndex(x => x.spieler_id === ich.id);
        if (i >= 0) platz = `Platz ${i + 1} von ${r.length} in ${crew.name}`;
      }
      const bild = rueckblickZeichnen({ wdh, km, tage, serie: s.serie, platz, von: mo, bis: heute });
      const blob = await new Promise(f => bild.toBlob(f, 'image/png'));
      const datei = new File([blob], 'winterform-woche.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [datei] })) await navigator.share({ files: [datei], title: 'Meine Woche' });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = datei.name; a.click(); }
    } catch (err) { if (err.name !== 'AbortError') toast(err.message); }
  };

  function rueckblickZeichnen(w) {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
    const g = c.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const BG = css.getPropertyValue('--bg').trim() || '#0A1220', EIS = css.getPropertyValue('--volt').trim() || '#7CD4FF';
    const TXT = '#EAF6FF', MUT = '#8EA3C0', LINIE = '#1F2D45';
    g.fillStyle = BG; g.fillRect(0, 0, 1080, 1920);
    // Schneeflocke oben
    g.save(); g.translate(540, 300); g.strokeStyle = EIS; g.lineCap = 'round'; g.lineWidth = 16;
    for (let k = 0; k < 6; k++) {
      g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -120); g.stroke();
      g.beginPath(); g.moveTo(0, -70); g.lineTo(-30, -100); g.moveTo(0, -70); g.lineTo(30, -100); g.stroke();
    }
    g.restore();
    const schrift = (gr, w2 = 800) => `${w2} ${gr}px -apple-system, Segoe UI, Roboto, sans-serif`;
    g.textAlign = 'center';
    g.font = schrift(64, 900); g.textAlign = 'left';
    const bw = g.measureText('WINTER').width, bf = g.measureText('FORM').width, x0 = 540 - (bw + bf) / 2;
    g.fillStyle = TXT; g.fillText('WINTER', x0, 540);
    g.fillStyle = EIS; g.fillText('FORM', x0 + bw, 540);
    g.textAlign = 'center';
    g.fillStyle = MUT; g.font = schrift(40, 600);
    const f = d => d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
    g.fillText(`Meine Woche · ${f(w.von)} bis ${f(w.bis)}`, 540, 620);
    const zeilen = [[String(w.wdh), 'Wiederholungen'], [w.km.toFixed(1).replace('.', ','), 'Kilometer gelaufen'], [String(w.tage), w.tage === 1 ? 'Trainingstag' : 'Trainingstage'], [String(w.serie), 'Tage Serie']];
    zeilen.forEach(([zahl, text], i) => {
      const y = 800 + i * 220;
      g.strokeStyle = LINIE; g.lineWidth = 3; g.beginPath(); g.moveTo(120, y - 120); g.lineTo(960, y - 120); g.stroke();
      g.textAlign = 'left'; g.fillStyle = EIS; g.font = schrift(130, 900); g.fillText(zahl, 120, y + 20);
      g.fillStyle = TXT; g.font = schrift(44, 700); g.textAlign = 'right'; g.fillText(text, 960, y);
    });
    g.textAlign = 'center';
    if (w.platz) { g.fillStyle = TXT; g.font = schrift(48, 800); g.fillText(w.platz, 540, 1700); }
    g.fillStyle = MUT; g.font = schrift(34, 600); g.fillText('gamekhinte.github.io/fitness', 540, 1810);
    return c;
  }

  /* ---------- Start: Links auswerten ---------- */
  const q = new URLSearchParams(location.search);
  if (q.get('crew') && !crew) {
    vorCode = q.get('crew').toUpperCase();
    if (ich) { const c = vorCode; vorCode = null; beitreten(c); }
    else { showTab('crew'); toast('Trag deinen Spitznamen ein, dann bist du in der Crew'); }
  }
  if (q.get('duell')) duellLaden(q.get('duell'));
  if (q.get('match')) matchBeitreten(q.get('match'));
  if (match.id) matchBeobachten();
  if (ich) serieZeigen();

  // Für die Arena: gleiche Identität, gleicher Server
  window.WF = {
    rpc, ich: () => ich,
    async registrieren(name) {
      $('wfName').value = name;
      if (!ich) await sicherIch();
      else if (name !== ich.name) { await rpc('wf_name_aendern', mit({ p_name: name })); ich.name = name; store.set(ICH_KEY, ich); }
      return ich;
    }
  };
})();
