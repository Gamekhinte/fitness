/* ================= EXTRAS: kleine Helfer =================
   - Vibration bei Wiederholungen, Fehlern, Sieg und Niederlage (nur wo der Browser es kann, z. B. Android).
     Abschaltbar in den Einstellungen (wf-haptik).
   - Bildschirm bleibt an, solange die Kamera zählt oder ein Kraft-Duell läuft (Wake Lock). Laufen macht das schon selbst.
   Läuft nach klang.js und kraft.js. */
(function () {
  const MUSTER = { wdh: 12, fehler: [40, 50, 40], countdown: 14, los: [70, 40, 70], sieg: [60, 40, 60, 40, 140], niederlage: 200, kauf: [20, 30, 20], muenze: 8, meilenstein: [25, 40, 25] };
  const kann = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  const an = () => store.get('wf-haptik', true) !== false;
  function haptik(name) {
    if (!kann || !an() || !MUSTER[name]) return;
    try { navigator.vibrate(MUSTER[name]); } catch (err) { /* nicht schlimm */ }
  }

  let sperre = null;
  async function wachAn() {
    if (sperre || !('wakeLock' in navigator)) return;
    try { sperre = await navigator.wakeLock.request('screen'); sperre.addEventListener('release', () => { sperre = null; }); } catch (err) { /* abgelehnt */ }
  }
  function wachAus() { if (sperre) { sperre.release().catch(() => {}); sperre = null; } }
  setInterval(() => {
    const noetig = (typeof camOn !== 'undefined' && camOn) || !!(window.KraftUI && KraftUI._test.D);
    if (noetig && !document.hidden) wachAn(); else if (!noetig) wachAus();
  }, 1500);

  window.Extras = { haptik, kann, get haptikAn() { return an(); }, setzeHaptik(v) { store.set('wf-haptik', !!v); if (v) haptik('kauf'); } };
})();
