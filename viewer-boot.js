// Inicializa a visão somente leitura: lê a chave do link, busca e decifra os dados, e simula o armazenamento da extensão em memória.
import { decifrar } from './lib/espelho-base.js';
const E = globalThis.__ESP || {}, msg = (t) => { document.querySelector('#main').innerHTML = `<div class="card"><p>${t}</p></div>`; };
let chave = null; const CH = 'radar_k_' + (E.repo || '');
try { const m = /[#&]k=([A-Za-z0-9_-]+)/.exec(location.hash); if (m) { chave = m[1]; localStorage.setItem(CH, chave); history.replaceState(null, '', location.pathname + location.search + '#painel'); } else chave = localStorage.getItem(CH); } catch {}
const store = {}, ouvintes = []; let ultimo = null;
async function buscar() {
  try { const r = await fetch(`https://api.github.com/repos/${E.owner}/${E.repo}/contents/data.enc.json`, { headers: { Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' }); if (r.ok) return await r.json(); } catch {}
  const r2 = await fetch('data.enc.json?t=' + Date.now(), { cache: 'no-store' }); if (!r2.ok) throw new Error('indisponivel'); return r2.json();
}
async function carregar() { const env = await buscar(); if (env.publicadoEm && env.publicadoEm === ultimo) return false; store.radar = await decifrar(env, chave); ultimo = env.publicadoEm; return true; }
if (!chave) msg('Link incompleto. Peça ao remetente o link completo, que termina com <b>#k=…</b>.');
else {
  globalThis.__RADAR_RO = true;
  globalThis.chrome = { storage: { local: { get: async (k) => ({ [k]: store[k] === undefined ? undefined : structuredClone(store[k]) }), set: async () => {}, remove: async () => {} }, onChanged: { addListener: (f) => ouvintes.push(f) } }, runtime: { sendMessage: async () => ({}) }, permissions: { request: (o, cb) => cb && cb(false) } };
  let ok = false;
  try { await carregar(); ok = true; } catch (e) { msg(e && e.name === 'OperationError' ? 'Não foi possível abrir: a chave do link não confere (o link pode ter sido substituído por um novo).' : 'O espelho ainda não está disponível. Se acabou de ser configurado, aguarde 1 a 3 minutos e recarregue a página.'); }
  if (ok) { await import('./app.js'); setInterval(async () => { try { if (await carregar()) ouvintes.forEach((f) => f({ radar: {} })); } catch {} }, E.poll || 120000); }
}
