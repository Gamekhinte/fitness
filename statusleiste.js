/* ================= GYMLIMPIX STATUSLEISTE =================
   Die Leiste oben am Handy (Uhrzeit, Akku) nimmt die Farbe aus <meta name="theme-color">.
   Liegt ein Vollbild-Fenster über der App (Rad, Pass, VS-Bildschirm ...), bekommt die Leiste
   dessen Farbe, damit oben kein andersfarbiger Streifen bleibt. */
(function () {
  'use strict';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const BASIS = meta.getAttribute('content') || '#F3EFE6';

  const rgb = s => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(',').map(x => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const basisRgb = (() => { const h = BASIS.replace('#', ''); return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 }; })();
  const mischen = (oben, unten) => ({ r: oben.r * oben.a + unten.r * (1 - oben.a), g: oben.g * oben.a + unten.g * (1 - oben.a), b: oben.b * oben.a + unten.b * (1 - oben.a), a: 1 });

  function deckt(el, cs) {
    if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || el.hidden) return false;
    if (parseFloat(cs.opacity) < 0.5) return false;
    const r = el.getBoundingClientRect();
    return r.top <= 1 && r.left <= 1 && r.width >= window.innerWidth - 2 && r.height >= window.innerHeight * 0.6;
  }

  function aktualisieren() {
    let farbe = basisRgb, z = -Infinity;
    for (const el of document.body.children) {
      const cs = getComputedStyle(el);
      if (!deckt(el, cs)) continue;
      const c = rgb(cs.backgroundColor);
      if (!c || c.a < 0.05) continue;
      const zi = parseInt(cs.zIndex, 10) || 0;
      if (zi >= z) { z = zi; farbe = c.a >= 0.99 ? c : mischen(c, basisRgb); }
    }
    const neu = hex(farbe);
    if (meta.getAttribute('content') !== neu) meta.setAttribute('content', neu);
  }

  // zweimal prüfen: sofort und nach dem Einblenden (Übergänge dauern bis 0,3 s)
  let t1 = 0, t2 = 0;
  const bald = () => { clearTimeout(t1); clearTimeout(t2); t1 = setTimeout(aktualisieren, 40); t2 = setTimeout(aktualisieren, 340); };
  new MutationObserver(bald).observe(document.body, { childList: true, attributes: true, subtree: false, attributeFilter: ['class', 'hidden', 'style'] });
  // Kinder des body (Fenster) ändern oft nur ihre eigene Klasse, z. B. "da" oder "auf"
  new MutationObserver(bald).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'hidden'] });
  window.addEventListener('resize', bald);
  bald();
})();
