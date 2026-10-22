/* ================= WINTERFORM KONTO (Login) =================
   Bisher ist dein Konto an dieses Gerät gebunden. Hier wird es an deine E-Mail gebunden (Supabase Auth, Code per E-Mail):
   - Konto sichern: E-Mail bestätigen, danach gehört das Spielerkonto zu dieser Adresse.
   - Anmelden: auf einem neuen Gerät mit der E-Mail ein neues Geräte-Geheimnis für das Konto bekommen.
   Passwörter gibt es nicht. Der Server kennt weiter nur Prüfsummen der Geräte-Geheimnisse (siehe crew.js).

   Läuft nach social.js. Der Server braucht in Supabase: Auth, E-Mail-Anbieter an, Site-URL der App, und eine Vorlage,
   die {{ .Token }} enthält (Code). Für fremde Adressen braucht es eigenes SMTP (der Standard sendet nur ans Team). */
(function () {
  if (!window.ArenaUI || !window.WF) return;
  const A = window.ArenaUI, W = () => window.WF, ich = () => W().ich();
  const e = s => esc(s);
  const el = id => document.getElementById(id);
  const mit = a => Object.assign({ p_id: ich().id, p_geheim: ich().geheim }, a);
  const AUTH = SUPABASE_URL + '/auth/v1';
  const KOPF = { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' };
  const MODUS_KEY = 'wf-auth-modus';
  const zu = '<button class="ar-zu" data-zu aria-label="Schließen">×</button>';
  const gueltig = m => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m);

  async function auth(pfad, body, senden) {
    const r = await fetch(AUTH + pfad, { method: 'POST', headers: KOPF, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const m = j.msg || j.error_description || j.message || ('Fehler ' + r.status);
      if (/rate limit|too many|seconds/i.test(m)) throw new Error('Zu viele Versuche, warte kurz und probier es nochmal');
      if (senden) throw new Error('Der Code konnte nicht gesendet werden: ' + m);
      throw new Error(/expired|invalid/i.test(m) ? 'Der Code stimmt nicht oder ist abgelaufen' : m);
    }
    return j;
  }
  const neuesGeheimnis = () => { const b = new Uint8Array(24); crypto.getRandomValues(b); return Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); };

  /* ---------- Fenster ---------- */
  function eingabe(modus, email, schritt) {
    const sichern = modus === 'sichern';
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">${sichern ? 'Konto sichern' : 'Anmelden'}</h2>
      <p class="ar-hand">${sichern ? 'Mit deiner E-Mail gehört dein Konto dir, auch wenn du das Handy wechselst oder die App neu installierst.' : 'Gib die E-Mail ein, mit der du dein Konto gesichert hast.'}</p>
      ${schritt === 1 ? `<div class="ar-zeile"><input id="koMail" type="email" inputmode="email" autocomplete="email" maxlength="80" placeholder="E-Mail" value="${e(email || '')}"><button class="ar-knopf" data-konto="senden" data-modus="${modus}">Code senden</button></div>
        <p class="ar-hand klein">Wir schicken dir einen Code. Es gibt kein Passwort.</p>`
      : `<p class="ar-hand">Code an <b>${e(email)}</b> gesendet. Schau auch im Spam-Ordner.</p>
        <div class="ar-zeile"><input id="koCode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="Code"><button class="ar-knopf" data-konto="pruefen" data-modus="${modus}" data-mail="${e(email)}">Bestätigen</button></div>
        <button class="so-spaeter" data-konto="${sichern ? 'sichern' : 'anmelden'}">Andere E-Mail</button>`}`);
  }
  async function status() {
    if (!ich()) return eingabe('anmelden', '', 1);
    let i = { verknuepft: false };
    try { i = await W().rpc('wf_konto_info', mit({})); } catch (err) { /* offline */ }
    if (i.verknuepft) {
      A.zeigeBlatt(`${zu}<h2 class="ar-titel">Konto</h2>
        <p class="ar-hand">Dein Konto ist gesichert mit <b>${e(i.email || '')}</b>.</p>
        <p class="ar-hand klein">Auf einem neuen Handy: Winterform öffnen, im Clan-Tab "Schon ein Konto? Anmelden" und die E-Mail eingeben.</p>`);
    } else {
      A.zeigeBlatt(`${zu}<h2 class="ar-titel">Konto</h2>
        <p class="ar-hand">Dein Konto hängt gerade nur an diesem Gerät. Geht das Handy kaputt oder löschst du die App, ist alles weg: Pokale, Coins, Outfits, Pass.</p>
        <button class="ar-knopf breit gold" data-konto="sichern">Konto sichern</button>`);
    }
  }

  /* ---------- Abschluss nach bestätigtem Code (oder Link) ---------- */
  async function abschliessen(modus, token) {
    if (modus === 'sichern') {
      await W().rpcToken(token, 'wf_konto_verknuepfen', mit({}));
      store.set(MODUS_KEY, null); toast('Konto gesichert'); status();
    } else {
      const geheim = neuesGeheimnis();
      const r = await W().rpcToken(token, 'wf_anmelden', { p_geheim: geheim });
      store.set('wf-ich', { id: r.id, geheim, name: r.name });
      ['wf-crew', 'wf-figur', 'wf-pokale', 'wf-kpokale', 'wf-match', 'wf-rennen', 'wf-kraft'].forEach(k => { try { localStorage.removeItem(k); } catch (err) { /* egal */ } });
      store.set(MODUS_KEY, null);
      location.href = location.pathname;
    }
  }

  const H = {
    oeffnen: () => status(),
    sichern: () => eingabe('sichern', '', 1),
    anmelden: () => eingabe('anmelden', '', 1),
    async senden(b) {
      const mail = (el('koMail').value || '').trim().toLowerCase();
      if (!gueltig(mail)) return toast('Das sieht nicht nach einer E-Mail aus');
      try { await auth('/otp', { email: mail, create_user: true }, true); store.set(MODUS_KEY, { modus: b.modus, mail }); eingabe(b.modus, mail, 2); }
      catch (err) { toast(err.message); }
    },
    async pruefen(b) {
      const code = (el('koCode').value || '').replace(/\s/g, '');
      if (code.length < 4) return toast('Gib den Code aus der E-Mail ein');
      try { const j = await auth('/verify', { type: 'email', email: b.mail, token: code }); await abschliessen(b.modus, j.access_token); }
      catch (err) { toast(err.message); }
    }
  };
  function klick(ev) {
    const b = ev.target.closest('[data-konto]');
    if (!b || !H[b.dataset.konto]) return;
    ev.preventDefault(); Promise.resolve(H[b.dataset.konto](b.dataset)).catch(err => toast(err.message));
  }
  $('arBlatt').addEventListener('click', klick);
  const wurzel = el('soWurzel'); if (wurzel) wurzel.addEventListener('click', klick);

  // Kam man über den Link in der E-Mail zurück? (Token steht im Teil nach dem #)
  if (location.hash.includes('access_token=')) {
    const p = new URLSearchParams(location.hash.slice(1)), token = p.get('access_token'), merk = store.get(MODUS_KEY, null);
    history.replaceState(null, '', location.pathname + location.search);
    if (token && merk) abschliessen(merk.modus, token).catch(err => toast(err.message));
  }
  window.Konto = { status, eingabe };
})();
