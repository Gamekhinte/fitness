/* ================= GYMLIMPIX STATUSLEISTE =================
   Android: Die Leiste oben nimmt die Farbe aus <meta name="theme-color">. Liegt ein Vollbild-Fenster
   über der App (Rad, Pass, VS-Bildschirm ...), bekommt die Leiste dessen Farbe.
   iPhone als App vom Home-Bildschirm: Die App reicht bis unter die Statusleiste (black-translucent).
   Dort liegt im Normalfall ein dunkler Streifen (#statusdeckel), Vollbild-Fenster decken ihn einfach ab.
   Bewusst sparsam: beobachtet nur die direkten Kinder von <body>, damit Animationen nicht ruckeln. */
(function () {
  'use strict';
  const html = document.documentElement;
  if (window.navigator.standalone === true) html.classList.add('ios-app');
  if (!document.getElementById('statusdeckel')) {
    const d = document.createElement('div');
    d.id = 'statusdeckel'; d.setAttribute('aria-hidden', 'true');
    document.body.appendChild(d);
  }

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
  const mischen = (o, u) => ({ r: o.r * o.a + u.r * (1 - o.a), g: o.g * o.a + u.g * (1 - o.a), b: o.b * o.a + u.b * (1 - o.a), a: 1 });

  function aktualisieren() {
    const bw = html.clientWidth || window.innerWidth, bh = html.clientHeight || window.innerHeight;
    let farbe = basisRgb, z = -Infinity;
    for (const el of document.body.children) {
      if (el.hidden || el.id === 'statusdeckel') continue;
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' || cs.display === 'none' || parseFloat(cs.opacity) < 0.5) continue;
      const c = rgb(cs.backgroundColor);
      if (!c || c.a < 0.05) continue;
      const r = el.getBoundingClientRect();
      if (r.top > 1 || r.left > 1 || r.width < bw - 2 || r.height < bh * 0.6) continue;
      const zi = parseInt(cs.zIndex, 10) || 0;
      if (zi >= z) { z = zi; farbe = c.a >= 0.99 ? c : mischen(c, basisRgb); }
    }
    const neu = hex(farbe);
    if (meta.getAttribute('content') !== neu) meta.setAttribute('content', neu);
  }

  let t1 = 0, t2 = 0;
  const bald = () => { clearTimeout(t1); clearTimeout(t2); t1 = setTimeout(aktualisieren, 60); t2 = setTimeout(aktualisieren, 380); };
  new MutationObserver(liste => {
    // nur Fenster direkt im body zählen, Änderungen tief in einer Animation werden ignoriert
    for (const m of liste) if (m.type === 'childList' ? m.target === document.body : m.target.parentNode === document.body) { bald(); return; }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  window.addEventListener('resize', bald);
  bald();
})();
