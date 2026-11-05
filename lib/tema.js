// Aplica a identidade visual (cores, fonte, logo) definida em Configurações.
export function aplicaTema(cfg) {
  const t = (cfg && cfg.tema) || {}, r = document.documentElement.style;
  [['--sea', t.cor1], ['--deep', t.cor2], ['--bg', t.cor3], ['--ink', t.cor4]].forEach(([k, v]) => v && r.setProperty(k, v));
  let st = document.getElementById('tema-font');
  if (!st) { st = document.createElement('style'); st.id = 'tema-font'; document.head.appendChild(st); }
  st.textContent = t.fonteData ? `@font-face{font-family:'FonteMarca';src:url(${t.fonteData});font-display:swap}` : '';
  const fam = t.fonteData ? "'FonteMarca'" : t.fonte ? `'${String(t.fonte).replace(/'/g, '')}'` : '';
  r.setProperty('--font', (fam ? fam + ', ' : '') + "'Segoe UI', system-ui, sans-serif");
}
