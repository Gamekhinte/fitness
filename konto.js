/* ================= WINTERFORM KONTO (Login) =================
   Bisher ist dein Konto an dieses Gerät gebunden. Hier wird es an deine E-Mail gebunden:
   - Konto sichern: E-Mail bestätigen, danach gehört das Spielerkonto zu dieser Adresse.
   - Anmelden: auf einem neuen Gerät mit der E-Mail ein neues Geräte-Geheimnis für das Konto bekommen (bis 5 Geräte).
   Passwörter gibt es nicht. Der Code (6 Ziffern, 10 Minuten, 5 Versuche) kommt automatisch per E-Mail.
   Der Server verschickt ihn selbst (Funktion wf_code_senden, Versand über Resend, Schlüssel im Supabase-Vault),
   Prüfung in wf_code_pruefen. Mit Limits pro E-Mail, pro Adresse und pro Tag gegen Missbrauch.

   Läuft nach social.js. Nutzt window.WF (rpc) und window.ArenaUI (Fenster). */
(function () {
  if (!window.ArenaUI || !window.WF) return;
  const A = window.ArenaUI, W = () => window.WF, ich = () => W().ich();
  const e = s => esc(s);
  const el = id => document.getElementById(id);
  const mit = a => Object.assign({ p_id: ich().id, p_geheim: ich().geheim }, a);
  const zu = '<button class="ar-zu" data-zu aria-label="Schließen">×</button>';
  const gueltig = m => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m);
  const neuesGeheimnis = () => { const b = new Uint8Array(24); crypto.getRandomValues(b); return Array.from(b, x => x.toString(16).padStart(2, '0')).join(''); };

  /* ---------- Fenster ---------- */
  function eingabe(modus, email, schritt) {
    const sichern = modus === 'sichern';
    A.zeigeBlatt(`${zu}<h2 class="ar-titel">${sichern ? 'Konto sichern' : 'Anmelden'}</h2>
      <p class="ar-hand">${sichern ? 'Mit deiner E-Mail gehört dein Konto dir, auch wenn du das Handy wechselst oder die App neu installierst.' : 'Gib die E-Mail ein, mit der du dein Konto gesichert hast.'}</p>
      ${schritt === 1 ? `<div class="ar-zeile"><input id="koMail" type="email" inputmode="email" autocomplete="email" maxlength="80" placeholder="E-Mail" value="${e(email || '')}"><button class="ar-knopf" data-konto="senden" data-modus="${modus}">Code senden</button></div>
        <p class="ar-hand klein">${sichern ? 'Wir schicken dir einen Code. Es gibt kein Passwort.' : 'Gehört zu der E-Mail ein Konto, schicken wir dir einen Code. Es gibt kein Passwort.'}</p>`
      : `<p class="ar-hand">${sichern ? `Code an <b>${e(email)}</b> gesendet.` : `Wenn zu <b>${e(email)}</b> ein Konto gehört, ist ein Code unterwegs.`} Schau auch im Spam-Ordner. Er gilt 10 Minuten.</p>
        <div class="ar-zeile"><input id="koCode" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="6-stelliger Code"><button class="ar-knopf" data-konto="pruefen" data-modus="${modus}" data-mail="${e(email)}">Bestätigen</button></div>
        <button class="so-spaeter" data-konto="${sichern ? 'sichern' : 'anmelden'}">Andere E-Mail oder neuer Code</button>`}`);
  }
  async function status() {
    if (!ich()) return eingabe('anmelden', '', 1);
    let i = { verknuepft: false };
    try { i = await W().rpc('wf_konto_info', mit({})); } catch (err) { /* offline */ }
    if (i.verknuepft) {
      A.zeigeBlatt(`${zu}<h2 class="ar-titel">Konto</h2>
        <p class="ar-hand">Dein Konto ist gesichert mit <b>${e(i.email || '')}</b>.</p>
        <p class="ar-hand klein">Auf einem neuen Handy: App öffnen, im Clan-Tab "Schon ein Konto? Anmelden" und die E-Mail eingeben.</p>`);
    } else {
      A.zeigeBlatt(`${zu}<h2 class="ar-titel">Konto</h2>
        <p class="ar-hand">Dein Konto hängt gerade nur an diesem Gerät. Geht das Handy kaputt oder löschst du die App, ist alles weg: Pokale, Coins, Outfits, Pass.</p>
        <button class="ar-knopf breit gold" data-konto="sichern">Konto sichern</button>`);
    }
  }

  const H = {
    oeffnen: () => status(),
    sichern: () => eingabe('sichern', '', 1),
    anmelden: () => eingabe('anmelden', '', 1),
    async senden(b) {
      const mail = (el('koMail').value || '').trim().toLowerCase();
      if (!gueltig(mail)) return toast('Das sieht nicht nach einer E-Mail aus');
      const args = { p_zweck: b.modus, p_email: mail };
      if (b.modus === 'sichern') Object.assign(args, mit({}));
      try { await W().rpc('wf_code_senden', args); eingabe(b.modus, mail, 2); }
      catch (err) { toast(err.message); }
    },
    async pruefen(b) {
      const code = (el('koCode').value || '').replace(/\s/g, '');
      if (code.length < 6) return toast('Gib den 6-stelligen Code aus der E-Mail ein');
      const args = { p_zweck: b.modus, p_email: b.mail, p_code: code };
      const geheim = b.modus === 'anmelden' ? neuesGeheimnis() : null;
      if (b.modus === 'sichern') Object.assign(args, mit({})); else args.p_neues_geheim = geheim;
      try {
        const r = await W().rpc('wf_code_pruefen', args);
        if (!r.ok) return toast(r.fehler || 'Das hat nicht geklappt');
        if (b.modus === 'sichern') { toast('Konto gesichert'); status(); return; }
        store.set('wf-ich', { id: r.id, geheim, name: r.name });
        ['wf-crew', 'wf-figur', 'wf-pokale', 'wf-kpokale', 'wf-match', 'wf-rennen', 'wf-kraft'].forEach(k => { try { localStorage.removeItem(k); } catch (err) { /* egal */ } });
        location.href = location.pathname;
      } catch (err) { toast(err.message); }
    }
  };
  function klick(ev) {
    const b = ev.target.closest('[data-konto]');
    if (!b || !H[b.dataset.konto]) return;
    ev.preventDefault(); Promise.resolve(H[b.dataset.konto](b.dataset)).catch(err => toast(err.message));
  }
  $('arBlatt').addEventListener('click', klick);
  const wurzel = el('soWurzel'); if (wurzel) wurzel.addEventListener('click', klick);
  window.Konto = { status, eingabe };
})();
