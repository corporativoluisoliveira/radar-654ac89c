// Parte compartilhada do "espelho": criptografia, snapshot sem dados sensíveis e link. Sem dependência de Chrome.
export const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
export const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const b64u = (u8) => b64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64u = (s) => unb64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
export const novaChave = () => b64u(crypto.getRandomValues(new Uint8Array(32)));
const pipe = async (u8, stream) => { const w = stream.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(stream.readable).arrayBuffer()); };
export async function hashHex(texto) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)); return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
export async function cifrar(obj, chave) {
  const raw = await pipe(new TextEncoder().encode(JSON.stringify(obj)), new CompressionStream('gzip'));
  const k = await crypto.subtle.importKey('raw', unb64u(chave), 'AES-GCM', false, ['encrypt']); const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, raw));
  return { v: 1, alg: 'AES-256-GCM+gzip', iv: b64(iv), ct: b64(ct), publicadoEm: obj.__espelho && obj.__espelho.publicadoEm };
}
export async function decifrar(env, chave) {
  const k = await crypto.subtle.importKey('raw', unb64u(chave), 'AES-GCM', false, ['decrypt']);
  const raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, k, unb64(env.ct)));
  return JSON.parse(new TextDecoder().decode(await pipe(raw, new DecompressionStream('gzip'))));
}
export const ESP_PADRAO = { owner: '', repo: '', token: '', key: '', auto: true, titulo: '', incluirNotas: false, incluirAnuncios: true, incluirFontes: true, incluirLeads: false,
  secoes: { painel: true, emp: true, mapa: true, lanc: false, mov: false, conc: true, marcas: false, demanda: true, insights: false, rel: true } };
export const mescla = (e) => ({ ...ESP_PADRAO, ...(e || {}), secoes: { ...ESP_PADRAO.secoes, ...((e && e.secoes) || {}) } });
export function linkEspelho(e) {
  if (!e || !e.owner || !e.repo || !e.key) return null;
  const base = e.pagesUrl || `https://${e.owner.toLowerCase()}.github.io${e.repo.toLowerCase() === e.owner.toLowerCase() + '.github.io' ? '' : '/' + e.repo}/`;
  return base.replace(/\/?$/, '/') + '#k=' + e.key;
}
// Tudo o que não for exibido ao cliente NÃO entra no arquivo publicado.
export function snapshot(db, e0) {
  const e = mescla(e0), sec = e.secoes, S = JSON.parse(JSON.stringify(db)), c = S.cfg;
  const vazio = { pesquisas: [], origens: [], serieIDI: [], tendencias: [], leads: [] };
  return {
    versao: 3,
    cfg: { faixaMin: c.faixaMin, faixaMax: c.faixaMax, cidade: c.cidade, limiarPreco: c.limiarPreco, freq: c.freq, notificacoes: false, telegram: { ativo: false, token: '', chatId: '' }, tema: c.tema },
    projetos: S.projetos.map((p) => {
      const q = { id: p.id, cidade: p.cidade, dados: { ...p.dados }, manual: { ...(p.manual || {}) }, fontes: e.incluirFontes ? (p.fontes || []) : [], historico: p.historico || [], aliases: p.aliases || [], confianca: p.confianca, validado: p.validado, revisao: p.revisao, criadoEm: p.criadoEm, ultimaVerificacao: p.ultimaVerificacao, seed: p.seed };
      if (!e.incluirNotas) { delete q.dados.notas; delete q.manual.notas; }
      if (sec.mapa) { if (p.geo) q.geo = p.geo; } else { delete q.dados.lat; delete q.dados.lng; delete q.manual.lat; delete q.manual.lng; }
      return q;
    }),
    anuncios: e.incluirAnuncios ? S.anuncios : [],
    eventos: sec.lanc ? S.eventos : S.eventos.map((v) => ({ id: v.id, titulo: '(oculto)', identificadoEm: v.identificadoEm, classe: 'nao-confirmado', revisao: v.revisao, evidencia: '', fonte: '', url: null, acao: '' })),
    movimentos: sec.mov ? (S.movimentos || []).map((m) => { const x = { ...m }; if (!e.incluirNotas) delete x.nota; return x; }) : [], marcas: sec.marcas ? (S.marcas || {}) : {},
    fontes: [], coletas: [], alertas: [], capturas: [], indicadores: S.indicadores || [], termos: S.termos || {}, paginasAvaliadas: S.paginasAvaliadas || 0, ultimaAtualizacao: S.ultimaAtualizacao,
    demanda: sec.demanda ? { pesquisas: S.demanda.pesquisas, origens: S.demanda.origens, serieIDI: S.demanda.serieIDI, tendencias: S.demanda.tendencias || [], leads: e.incluirLeads ? (S.demanda.leads || []) : [] } : vazio,
    __espelho: { titulo: e.titulo || '', secoes: sec, publicadoEm: null },
  };
}
