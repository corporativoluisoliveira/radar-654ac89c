// Núcleo sem dependência de Chrome: testável em Node.
export const TZ = 'America/Sao_Paulo';
export const nowISO = () => new Date().toISOString();
const dtf = (o) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...o });
export const fmtDT = (i) => (i ? dtf({ dateStyle: 'short', timeStyle: 'short' }).format(new Date(i)) : '—');
export const fmtD = (i) => (i ? dtf({ dateStyle: 'short' }).format(new Date(i)) : '—');
export const brl = (n) => (n == null || isNaN(n) ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const normName = (s) =>
  norm(s).replace(/\b(by|por)\s+[a-z0-9]+$/, '').replace(/\b(residencial|residence|edificio|empreendimento)\b/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export const DEFAULT_CFG = {
  faixaMin: 2000000, faixaMax: 4500000, cidade: 'Balneário Piçarras', limiarPreco: 3,
  freq: { oficial: 24, lista: 24, noticia: 24, preco: 24, consolidacao: 168 },
  notificacoes: true, telegram: { ativo: false, token: '', chatId: '' },
  tema: { logo: null, cor1: '#D8001F', cor2: '#0B0B0C', cor3: '#F4F4F5', cor4: '#141414', fonte: '', fonteData: null },
};
export const STATUS = { estudo: 'Estudo', lancamento: 'Lançamento / pré-lançamento', 'em-construcao': 'Em construção', pronto: 'Pronto para morar', desconhecido: 'Desconhecido' };
export const CLASSES = { oficial: 'Lançamento oficial', 'pre-divulgado': 'Pré-lançamento divulgado', indicio: 'Indício de lançamento', 'nao-confirmado': 'Informação não confirmada' };

// ---------- valores efetivos (coletado + correção manual, sempre separados) ----------
export const V = (p) => ({ ...p.dados, ...Object.fromEntries(Object.entries(p.manual || {}).map(([k, o]) => [k, o.valor])) });
const KEYF = ['construtora', 'bairro', 'endereco', 'linkOficial', 'status', 'entrega', 'areaMin', 'areaMax', 'dorms', 'vagas', 'precoInicial', 'lazer', 'unidadesTotal', 'lancamentoData'];
export const completude = (p) => { const v = V(p); const ok = KEYF.filter((k) => v[k] != null && v[k] !== '' && v[k] !== 'desconhecido' && !(Array.isArray(v[k]) && !v[k].length)).length; return Math.round((ok / KEYF.length) * 100); };
export const priceRange = (p) => { const v = V(p); const a = [v.precoInicial, v.precoMax, ...(v.tipologias || []).map((t) => t.preco)].filter((x) => x > 0); return a.length ? [Math.min(...a), Math.max(...a)] : null; };
export const inBand = (p, min, max) => { const r = priceRange(p); return r ? r[0] <= max && r[1] >= min : null; };
export const precoM2 = (p) => { const v = V(p); return v.precoInicial > 0 && v.precoAreaRef > 0 ? Math.round(v.precoInicial / v.precoAreaRef) : null; };
export const mediana = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
export const media = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);

// ---------- extração de texto de páginas ----------
export function parsePrices(text) {
  const out = []; const re = /R\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{2})?|\d+(?:,\d+)?)\s*(milh(?:ão|ões|ao|oes)|mi\b|mil\b)?/gi; let m;
  while ((m = re.exec(text))) {
    const raw = m[1], u = (m[2] || '').toLowerCase(); let v;
    v = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw) ? parseFloat(raw.replace(/\./g, '').replace(',', '.')) : parseFloat(raw.replace(',', '.'));
    if (u.startsWith('milh') || u === 'mi') v *= 1e6; else if (u === 'mil') v *= 1e3;
    if (v >= 100000 && v <= 5e7) out.push({ valor: Math.round(v), trecho: text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 20).replace(/\s+/g, ' ').trim() });
  }
  return out;
}
export function parseStartPrice(text) {
  const m = /(?:a\s+partir\s+de|partem\s+de|partir\s+de)\s+(R\$\s*[\d.,]+\s*(?:milh(?:ão|ões|ao|oes)|mi\b|mil\b)?)/i.exec(text);
  const r = m && parsePrices(m[1]); return r && r[0] ? r[0].valor : null;
}
export function parseAreas(text) { const o = []; const re = /(\d{2,3}(?:,\d+)?)\s*m²/gi; let m; while ((m = re.exec(text))) { const v = parseFloat(m[1].replace(',', '.')); if (v >= 20 && v <= 1000) o.push(v); } return o; }
export function parseEntrega(text) {
  const m = /entrega[^.\n]{0,40}?(?:(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*[\/\s.de]*)?(20\d{2})/i.exec(text);
  return m ? (m[1] ? m[1].toLowerCase() + '/' + m[2] : m[2]) : null;
}
export function detectStatus(t) {
  t = norm(t);
  if (/pre[- ]?lancamento|breve lancamento|lancamento/.test(t)) return 'lancamento';
  if (/pronto para morar|prontos? pra morar|entregue/.test(t)) return 'pronto';
  if (/em construcao|em obras/.test(t)) return 'em-construcao';
  return null;
}
const dec = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&quot;/g, '"');
const strip = (s) => dec(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
export function htmlToDoc(html, url) {
  const jsonld = []; html.replace(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi, (_, j) => { try { jsonld.push(JSON.parse(j)); } catch {} return ''; });
  const g = (re) => { const m = re.exec(html); return m ? strip(m[1]) : ''; };
  const heads = []; html.replace(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi, (_, h) => { heads.push(strip(h)); return ''; });
  const links = []; html.replace(/<a\s[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, h, t) => { try { links.push({ url: new URL(h, url).href, texto: strip(t) }); } catch {} return ''; });
  const social = {}; links.forEach((l) => { const m = /(instagram|facebook|youtube|linkedin|tiktok|wa\.me|whatsapp)/i.exec(l.url); if (m) social[m[1].toLowerCase().replace('wa.me', 'whatsapp')] = l.url; });
  const ogImage = (/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i.exec(html) || [])[1] || null, imgCount = (html.match(/<img\b/gi) || []).length, videoCount = (html.match(/<video\b|youtube\.com\/embed|player\.vimeo/gi) || []).length;
  const body = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ');
  return { social, ogImage, imgCount, videoCount, url, title: g(/<title[^>]*>([\s\S]*?)<\/title>/i), desc: (/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i.exec(html) || [])[1] || '', headings: heads.slice(0, 10), links: links.slice(0, 400), text: strip(body).slice(0, 80000), jsonld };
}
export function robotsAllows(txt, path) {
  const rules = []; let on = false, seen = false;
  for (const raw of txt.split(/\r?\n/)) {
    const l = raw.replace(/#.*/, '').trim(); const i = l.indexOf(':'); if (i < 0) continue;
    const k = l.slice(0, i).trim().toLowerCase(), v = l.slice(i + 1).trim();
    if (k === 'user-agent') { if (seen && rules.length && !on) {} on = v === '*'; seen = true; }
    else if (on && (k === 'disallow' || k === 'allow') && v) rules.push({ allow: k === 'allow', v });
  }
  let best = null;
  for (const r of rules) {
    const re = new RegExp('^' + r.v.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(path) && (!best || r.v.length > best.v.length)) best = r;
  }
  return !best || best.allow;
}
export const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); };

// ---------- banco ----------
export function newDB(seed) {
  const t = nowISO();
  return { versao: 3, movimentos: (seed.movimentos || []).map((m) => ({ ...m, identificadoEm: nowISO() })), marcas: {}, termos: {}, paginasAvaliadas: 0, demanda: { ...JSON.parse(JSON.stringify(seed.demanda)), leads: [], tendencias: [] }, cfg: JSON.parse(JSON.stringify(DEFAULT_CFG)), projetos: seed.projetos.map((p) => ({ ...p, criadoEm: t })), anuncios: [], capturas: [], eventos: seed.eventos.map((e) => ({ ...e, identificadoEm: t })), fontes: seed.fontes.map((f) => ({ ...f })), coletas: [], alertas: [], indicadores: [], ultimaAtualizacao: null };
}
export function addAlert(db, a) {
  const al = { id: uid('al'), data: nowISO(), lido: false, ...a };
  if (db.alertas.some((x) => x.tipo === al.tipo && x.titulo === al.titulo && x.projetoId === al.projetoId && Date.now() - new Date(x.data) < 864e5)) return null;
  db.alertas.unshift(al); db.alertas = db.alertas.slice(0, 500); return al;
}
export function matchProject(db, nome, construtora) {
  const n = normName(nome); if (!n) return null; const toks = new Set(n.split(' '));
  for (const p of db.projetos) { if (normName(p.dados.nome) === n || (p.aliases || []).some((a) => normName(a) === n)) return { p, tipo: 'exato' }; }
  let best = null;
  for (const p of db.projetos) {
    for (const nm of [p.dados.nome, ...(p.aliases || [])]) {
      const t2 = new Set(normName(nm).split(' ')); const inter = [...toks].filter((x) => t2.has(x)).length; const j = inter / (toks.size + t2.size - inter);
      const okB = !construtora || !p.dados.construtora || norm(construtora) === norm(p.dados.construtora);
      if (j >= 0.6 && okB && (!best || j > best.j)) best = { p, tipo: 'provavel', j };
    }
  }
  return best;
}
export function findOrCreate(db, dados, fonte, forcar = false) {
  const m = matchProject(db, dados.nome, dados.construtora);
  if (m && m.tipo === 'exato' && !forcar) return { p: m.p, novo: false };
  const p = { id: uid('emp'), cidade: dados.cidade || db.cfg.cidade, dados: { status: 'desconhecido', ...dados }, manual: {}, fontes: [], historico: [], aliases: [], confianca: 'baixa', validado: null, revisao: 'pendente', criadoEm: nowISO(), ultimaVerificacao: null };
  if (m) p.possivelDuplicataDe = m.p.id;
  db.projetos.push(p);
  addAlert(db, { tipo: 'novo-empreendimento', titulo: 'Novo empreendimento identificado: ' + dados.nome, descricao: 'Cadastrado com confiança baixa; revisar duplicidade e dados.' + (m ? ' Possível duplicata de ' + m.p.dados.nome + '.' : ''), projetoId: p.id, fonte: fonte.url, link: fonte.url });
  return { p, novo: true };
}
export function addSourceRef(p, fonte, campos) {
  const f = p.fontes.find((x) => x.url === fonte.url);
  if (f) { f.data = nowISO(); f.campos = [...new Set([...(f.campos || []), ...campos])]; } else p.fontes.push({ nome: fonte.nome, url: fonte.url, data: nowISO(), campos });
}
// Registra mudança do valor coletado preservando histórico. Retorna true se mudou.
export function applyObs(db, p, campo, novo, fonte) {
  const ant = p.dados[campo]; if (novo == null || ant === novo) return false;
  const bandaAntes = inBand(p, db.cfg.faixaMin, db.cfg.faixaMax);
  p.dados[campo] = novo; p.historico.push({ data: nowISO(), campo, anterior: ant ?? null, novo, fonte: fonte.url, origem: 'coleta' });
  const base = { projetoId: p.id, fonte: fonte.url, link: fonte.url }; const nm = p.dados.nome;
  if (campo === 'precoInicial' || campo === 'precoMax') {
    if (ant > 0 && Math.abs(novo - ant) / ant * 100 >= db.cfg.limiarPreco) addAlert(db, { ...base, tipo: 'preco', titulo: 'Alteração de preço: ' + nm, descricao: `${campo}: ${brl(ant)} → ${brl(novo)}` });
    if (bandaAntes === false && inBand(p, db.cfg.faixaMin, db.cfg.faixaMax)) addAlert(db, { ...base, tipo: 'faixa', titulo: 'Entrou na faixa de interesse: ' + nm, descricao: `Preço observado ${brl(novo)}` });
  } else if (campo === 'status' || campo === 'entrega') addAlert(db, { ...base, tipo: 'status', titulo: `Alteração de ${campo === 'status' ? 'status' : 'previsão de entrega'}: ${nm}`, descricao: `${ant ?? 'n/d'} → ${novo}` });
  return true;
}
// Processa um documento (de coleta automática ou captura manual).
export function processDoc(db, src, doc) {
  const res = { itens: 0, novos: 0, eventos: 0 }; addTerms(db, doc.text); const fonte = { nome: src.nome, url: doc.url || src.url };
  const heads = [doc.title, doc.desc, ...doc.headings].join(' . ');
  if (src.tipo === 'empreendimento' || src.tipo === 'captura') {
    let p = src.empId && db.projetos.find((x) => x.id === src.empId);
    if (!p) {
      const nome = (doc.headings[0] || doc.title || '').split(/\s[|\-–—]\s/)[0].trim(); if (!nome) return res;
      const r = findOrCreate(db, { nome, linkOficial: src.confiavel === 'oficial' ? doc.url : null }, fonte); p = r.p; if (r.novo) res.novos++;
    }
    const campos = [];
    const sp = parseStartPrice(doc.text); if (sp && applyObs(db, p, 'precoInicial', sp, fonte)) { campos.push('precoInicial'); p.dados.precoInicialTipo = 'inicial anunciado'; p.dados.precoAreaRef = null; res.itens++; }
    const st = detectStatus(doc.title + ' ' + doc.desc + ' ' + doc.headings.join(' ')); if (st && applyObs(db, p, 'status', st, fonte)) { campos.push('status'); res.itens++; }
    const en = parseEntrega(doc.text); if (en && applyObs(db, p, 'entrega', en, fonte)) { campos.push('entrega'); res.itens++; }
    const am = extractAmenities(doc.text); if (am.length) { const antes = new Set(V(p).lazer || []); const novos = am.filter((a) => !antes.has(a)); if (novos.length) { p.dados.lazer = [...(p.dados.lazer || []), ...novos.filter((a) => !(p.dados.lazer || []).includes(a))]; campos.push('lazer'); res.itens++; p.lazerAuto = true; } }
    p.observacoes = [{ data: nowISO(), fonte: fonte.url, precos: parsePrices(doc.text).slice(0, 12), areas: [...new Set(parseAreas(doc.text))].slice(0, 12) }, ...(p.observacoes || [])].slice(0, 20);
    p.ultimaVerificacao = nowISO(); addSourceRef(p, fonte, campos); registrarSinaisMarca(db, V(p).construtora, doc);
    if (src.tipo === 'captura' && p.confianca === 'baixa') p.revisao = 'pendente';
  } else if (src.tipo === 'movimentos') {
    const mv = extrairMovimentos(db, doc, src); mv.forEach((m) => { db.movimentos.unshift(m); if (['alvara', 'aprovacao', 'eiv'].includes(m.tipo) || m.construtora) addAlert(db, { tipo: 'movimento', titulo: 'Movimento oficial: ' + (MOV_TIPOS[m.tipo] || m.tipo) + (m.construtora ? ' (' + m.construtora + ')' : ''), descricao: m.titulo, projetoId: m.projetoId, fonte: m.fonte, link: m.url }); }); res.eventos += mv.length;
  } else {
    const known = db.projetos.map((p) => normName(p.dados.nome));
    for (const l of doc.links) {
      if (!/lan[cç]amento|pr[eé]-?lan[cç]amento|em breve|lista de interesse|reserv/i.test(l.texto) || l.texto.length < 8 || l.texto.length > 140) continue;
      if (db.eventos.some((e) => e.url === l.url || norm(e.titulo) === norm(l.texto))) continue;
      const jaConhecido = known.some((k) => k && normName(l.texto).includes(k));
      const pre = /pr[eé]-?lan[cç]amento|em breve/i.test(l.texto);
      const cls = src.confiavel === 'oficial' && pre ? 'pre-divulgado' : src.tipo === 'noticia' ? 'nao-confirmado' : 'indicio';
      db.eventos.unshift({ id: uid('ev'), titulo: l.texto, construtora: null, projetoId: null, identificadoEm: nowISO(), publicadoEm: null, classe: cls, evidencia: `Link com termo de lançamento em ${src.nome}${jaConhecido ? ' (menciona empreendimento já cadastrado)' : ''}`, fonte: src.nome, url: l.url, faixa: null, tipologias: null, confianca: 'baixa', revisao: 'pendente', acao: acaoPara(cls) });
      addAlert(db, { tipo: cls === 'pre-divulgado' ? 'pre-lancamento' : 'indicio', titulo: 'Possível lançamento: ' + l.texto, descricao: CLASSES[cls] + ' — requer revisão humana.', fonte: src.nome, link: l.url }); res.eventos++;
    }
  }
  return res;
}
export const acaoPara = (c) => ({ oficial: 'Contatar a construtora e levantar tabela de preços e tipologias', 'pre-divulgado': 'Confirmar no site/canais oficiais e registrar lista de interesse', indicio: 'Buscar confirmação em fonte oficial da construtora', 'nao-confirmado': 'Não agir; monitorar por nova evidência' }[c]);

export function health(src) {
  if (!src.ativa) return 'inativa'; if (!src.ultimaColeta) return 'sem-coleta';
  if (src.falhas >= 3) return 'falha'; if (src.falhas > 0) return 'atencao';
  const lim = (src.freqHoras || 24) * 2 * 36e5; return Date.now() - new Date(src.ultimaColetaOk || 0) > lim ? 'desatualizada' : 'ok';
}
export function snapshotKPIs(db) {
  const k = kpis(db, db.projetos.filter((p) => p.cidade === db.cfg.cidade));
  db.indicadores.push({ data: nowISO(), total: k.total, naFaixa: k.naFaixa, precoM2: k.precoM2?.valor ?? null, anuncios: db.anuncios.length }); db.indicadores = db.indicadores.slice(-300);
}
const cnt = (arr, f) => { const o = {}; arr.forEach((x) => { const k = f(x) || 'n/d'; o[k] = (o[k] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
export function kpis(db, lista) {
  const { faixaMin: a, faixaMax: b } = db.cfg; const faixa = lista.filter((p) => inBand(p, a, b) === true);
  const ids = new Set(lista.map((p) => p.id)); const an = db.anuncios.filter((x) => ids.has(x.projetoId) && x.preco >= a && x.preco <= b && x.ativo !== false);
  const m2 = lista.map(precoM2).filter(Boolean);
  const porEmp = {}; an.forEach((x) => (porEmp[x.projetoId] = (porEmp[x.projetoId] || 0) + 1));
  return {
    total: lista.length, naFaixa: faixa.length, semPreco: lista.filter((p) => !priceRange(p)).length,
    lancPre: lista.filter((p) => V(p).status === 'lancamento').length,
    novos30: db.eventos.filter((e) => Date.now() - new Date(e.identificadoEm) < 30 * 864e5).length,
    unidadesFaixa: db.anuncios.length ? an.length : null,
    precoMedio: an.length >= 5 ? { valor: media(an.map((x) => x.preco)), n: an.length } : { valor: null, n: an.length },
    precoM2: m2.length >= 3 ? { valor: media(m2), mediana: mediana(m2), n: m2.length } : { valor: null, n: m2.length },
    porBairro: cnt(lista, (p) => V(p).bairro), porConstrutora: cnt(lista, (p) => V(p).construtora), porStatus: cnt(lista, (p) => STATUS[V(p).status]),
    topAnuncios: Object.entries(porEmp).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([id, n]) => [db.projetos.find((p) => p.id === id)?.dados.nome, n]),
    construtorasFaixa: cnt(faixa, (p) => V(p).construtora),
  };
}

// ---------- características (áreas comuns e lazer) ----------
export const AMEN = [
  ['Piscina', /piscin/i], ['Piscina aquecida', /piscin\w*[^.,;|]{0,25}(aquecid|climatiz)|(aquecid|climatiz)\w*[^.,;|]{0,25}piscin/i],
  ['Academia', /academia|fitness/i], ['Brinquedoteca', /brinquedoteca/i], ['Espaço kids / playground', /playground|espa[cç]o kids|\bkids\b/i],
  ['Salão de festas', /sal[aã]o de festas/i], ['Espaço gourmet / churrasqueira', /espa[cç]o gourmet|sal[aã]o gourmet|churrasqueira|quiosque/i],
  ['Spa / sauna', /\bspa\b|sauna|sala de massagem/i], ['Coworking', /cowork/i], ['Cinema', /cinema|sala de proje/i], ['Pet place', /pet\s?(place|care)|espa[cç]o pet/i],
  ['Bicicletário', /biciclet/i], ['Carregador de carro elétrico', /carros? el[eé]tricos?|recarga de ve[ií]culo|carregador/i], ['Quadra esportiva', /quadra|beach tennis|padel|bocha/i],
  ['Sala de jogos', /sala de jogos|poker|bilhar|sinuca/i], ['Mirante / rooftop', /mirante|rooftop/i], ['Beach club / prainha', /beach club|prainha/i],
  ['Bar / adega', /bar molhado|adega|whisky/i], ['Lavanderia', /lavanderia/i], ['Portaria / segurança 24h', /portaria 24|seguran[cç]a 24|controle de acesso/i],
  ['Gerador', /gerador/i], ['Redário / deck', /red[aá]rio|\bdeck\b/i], ['Praça do fogo', /pra[cç]a do fogo|fire ?pit/i], ['Trilha ecológica', /trilha/i],
];
export const extractAmenities = (t) => AMEN.filter(([, re]) => re.test(t || '')).map((a) => a[0]);
const STOP = new Set(('para com uma uns umas esse essa este esta isso isto mais menos muito pelo pela pelos pelas como mas por que nao sim tambem sobre entre apos ate sem seu sua seus suas nosso nossa quando onde qual quais todo toda todos todas cada outro outra ser estar foi sao estao tem tinha ter pode podem fazer faz cookies cookie politica privacidade termos contato whatsapp clique saiba fale conosco menu entrar cadastre direitos reservados copyright site pagina inicio home voce voces ainda aqui apenas assim seja disponivel imoveis imovel anuncio anuncios resultados resultado ordenar filtrar buscar busca pesquisar login conta email telefone ligue enviar mensagem acesse veja confira conheca nossa nossos nossas sobre empresa quem somos trabalhe blog noticias galeria fotos foto video videos mapa compartilhar').split(' '));
export function addTerms(db, text) {
  db.termos = db.termos || {}; const seen = {};
  for (const w of String(text || '').toLowerCase().match(/[a-zà-ú]{4,}/g) || []) { if (STOP.has(norm(w))) continue; seen[w] = (seen[w] || 0) + 1; }
  for (const [w, n] of Object.entries(seen)) db.termos[w] = (db.termos[w] || 0) + Math.min(n, 3);
  db.paginasAvaliadas = (db.paginasAvaliadas || 0) + 1;
  const ks = Object.keys(db.termos); if (ks.length > 1500) { ks.sort((a, b) => db.termos[b] - db.termos[a]).slice(800).forEach((k) => delete db.termos[k]); }
}
export function caracFreq(lista) { const o = {}; lista.forEach((p) => (V(p).lazer || []).forEach((a) => (o[a] = (o[a] || 0) + 1))); return Object.entries(o).sort((a, b) => b[1] - a[1]); }
export function nuvem(db, lista) {
  if (db.paginasAvaliadas > 0 && Object.keys(db.termos).length) return { origem: 'paginas', n: db.paginasAvaliadas, itens: Object.entries(db.termos).sort((a, b) => b[1] - a[1]).slice(0, 60) };
  const o = {}; lista.forEach((p) => { const v = V(p); [...(v.lazer || []), v.frenteMar === 'sim' ? 'frente-mar' : null, v.frenteMar === 'vista' ? 'vista-mar' : null, v.status ? STATUS[v.status] : null].filter(Boolean).forEach((t) => (o[t] = (o[t] || 0) + 1)); });
  return { origem: 'cadastro', n: 0, itens: Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 40) };
}
// Principal diferencial: valor do cadastro/manual, ou sugestão automática por regras simples e transparentes.
export function diferencial(db, p) {
  const v = V(p); if (v.diferencial) return { t: v.diferencial, origem: p.manual && p.manual.diferencial ? 'manual' : 'cadastro (anúncio/fonte)' };
  const P = db.projetos.filter((x) => x.cidade === p.cidade); const freq = {}; let comLazer = 0;
  P.forEach((x) => { const l = V(x).lazer || []; if (l.length) comLazer++; l.forEach((a) => (freq[a] = (freq[a] || 0) + 1)); });
  const parts = [];
  if (v.frenteMar === 'sim') parts.push('Frente-mar'); else if (v.distanciaPraia != null && v.distanciaPraia <= 100) parts.push(`A ${v.distanciaPraia} m da praia`); else if (v.frenteMar === 'vista') parts.push('Vista-mar');
  if (comLazer >= 5) { const r = (v.lazer || []).filter((a) => freq[a] <= 2); if (r.length) parts.push('Lazer pouco comum: ' + r.slice(0, 2).join(', ')); }
  const areas = P.map((x) => V(x).areaMax).filter(Boolean).sort((a, b) => a - b); if (areas.length >= 5 && v.areaMax >= areas[Math.floor(areas.length * 0.9)]) parts.push(`Metragens de até ${v.areaMax} m²`);
  return parts.length ? { t: parts.slice(0, 2).join(' · '), origem: 'sugestão automática' } : { t: null, origem: 'dados insuficientes' };
}
// ---------- demanda ----------
export function sinalDemanda(d) {
  const s = d.serieIDI || []; const out = []; let cor = 'warn', titulo = 'Dados insuficientes para afirmar aumento ou queda';
  if (s.length >= 2) { const a = s[0].pos, b = s[s.length - 1].pos; const m = s.reduce((x, y) => (y.pos < x.pos ? y : x)); if (b < a) { cor = 'ok'; titulo = 'Sinal de aumento relativo da procura'; } else if (b > a) { cor = 'bad'; titulo = 'Sinal de queda relativa da procura'; } else titulo = 'Posição estável no ranking'; out.push(`Posição no ranking IDI Brasil: ${s.map((x) => `${x.pos}º (${x.periodo})`).join(' → ')}. Quanto menor o número, maior a procura relativa.`); }
  const g = {}; (d.tendencias || []).forEach((t) => (g[t.termo] = g[t.termo] || []).push(t));
  Object.entries(g).forEach(([termo, l]) => { l.sort((x, y) => x.periodo.localeCompare(y.periodo)); if (l.length < 2) return; const a = l[l.length - 2].valor, b = l[l.length - 1].valor, v = a ? (b / a - 1) * 100 : null; out.push(`Pesquisas por “${termo}”: ${a} → ${b} (${v == null ? 'n/d' : (v > 5 ? 'aumento ' : v < -5 ? 'queda ' : 'estável ') + v.toFixed(0) + '%'}) entre ${l[l.length - 2].periodo} e ${l[l.length - 1].periodo}.`); });
  return { titulo, cor, linhas: out };
}
// ---------- insights ----------
export function insights(db) {
  const cfg = db.cfg, P = db.projetos.filter((p) => p.cidade === cfg.cidade), I = []; const add = (sec, tipo, texto, base, acao) => I.push({ sec, tipo, texto, base, acao });
  const cf = caracFreq(P), comLazer = P.filter((p) => (V(p).lazer || []).length).length, faixa = P.filter((p) => inBand(p, cfg.faixaMin, cfg.faixaMax) === true);
  if (comLazer >= 5) {
    add('Posicionamento', 'Fato observado', `Diferenciais mais repetidos: ${cf.slice(0, 3).map(([a, n]) => `${a} (${n} de ${comLazer})`).join('; ')}.`, `${comLazer} empreendimentos com lazer cadastrado`, 'Evite usar esses itens como argumento principal; trate-os como “obrigatórios” e destaque o que é raro.');
    const raros = AMEN.map((a) => a[0]).filter((a) => !cf.some((c) => c[0] === a)); if (raros.length) add('Posicionamento', 'Hipótese', `Itens do catálogo que ninguém na base cita: ${raros.slice(0, 6).join(', ')}. Pode ser espaço para diferenciação ou apenas ausência de dado.`, 'Comparação com o catálogo de áreas comuns', 'Validar nas páginas dos concorrentes e, se de fato ausente, testar como mensagem de destaque.');
  } else add('Posicionamento', 'Dados insuficientes', `Só ${comLazer} empreendimentos têm áreas comuns cadastradas; a análise de saturação exige pelo menos 5.`, 'Cadastro de características', 'Capture páginas de empreendimentos (ícone da extensão) ou complete a ficha.');
  const fm = P.filter((p) => V(p).frenteMar === 'sim').length, vm = P.filter((p) => V(p).frenteMar === 'vista').length;
  add('Posicionamento', 'Fato observado', `${fm} empreendimentos classificados como frente-mar e ${vm} como vista-mar, em ${P.length} cadastrados (${P.filter((p) => !V(p).frenteMar).length} sem classificação).`, 'Campo “Mar” da ficha', 'Completar a classificação para comparar preço por m² entre categorias.');
  const bc = {}; faixa.forEach((p) => (bc[V(p).construtora || 'n/d'] = (bc[V(p).construtora || 'n/d'] || 0) + 1)); const bt = Object.entries(bc).sort((a, b) => b[1] - a[1]);
  if (bt.length) add('Concorrência', 'Fato observado', `Na faixa de ${brl(cfg.faixaMin)}–${brl(cfg.faixaMax)}: ${bt.slice(0, 3).map(([k, n]) => `${k} (${n})`).join(', ')}.`, `${faixa.length} empreendimentos cruzam a faixa`, 'Priorizar monitoramento de preço e campanhas dessas construtoras.');
  const pend = db.eventos.filter((e) => e.revisao === 'pendente').length; if (pend) add('Concorrência', 'Ação', `${pend} possíveis lançamentos aguardam revisão.`, 'Fila de lançamentos', 'Confirmar em fontes oficiais antes de reagir em mídia ou preço.');
  const dm = {}; faixa.forEach((p) => V(p).dorms && (dm[V(p).dorms] = (dm[V(p).dorms] || 0) + 1)); const dt = Object.entries(dm).sort((a, b) => b[1] - a[1]); if (dt.length) add('Posicionamento', 'Fato observado', `Tipologias mais citadas na faixa: ${dt.slice(0, 3).map(([k, n]) => `${k} dorm. (${n})`).join('; ')}.`, 'Campo dormitórios', 'Alinhar a mensagem da campanha à tipologia que domina a busca e a oferta.');
  const dd = db.demanda || {}, ps = dd.pesquisas || [];
  const top = ps.find((x) => x.id === 'idi-alto'); if (top) add('Demanda e timing', 'Fato (fonte externa)', `${top.valor}. ${top.nota}`, `${top.fonte}, ${top.periodo}`, 'Pode embasar uma mensagem como “Piçarras entra na primeira rodada de análise de quem busca alto padrão”, citando a fonte e sem prometer valorização.');
  const sd = sinalDemanda(dd); add('Demanda e timing', sd.cor === 'ok' ? 'Estimativa' : 'Dados insuficientes', sd.titulo + '. ' + sd.linhas.join(' '), 'Série IDI Brasil e leituras manuais de pesquisa', 'Se o sinal for positivo, avaliar reforço de topo de funil (alcance e vídeo) antes de campanhas de conversão.');
  const og = (dd.origens || []).filter((o) => o.regiao); const leads = {}; (dd.leads || []).forEach((l) => (leads[l.origem] = (leads[l.origem] || 0) + (+l.qtd || 0)));
  const lt = Object.entries(leads).sort((a, b) => b[1] - a[1]);
  add('Campanhas patrocinadas', 'Hipótese', `Geotargeting inicial: ${og.map((o) => o.regiao).join('; ')}. Faixa etária citada: 35–60 anos, em boa parte proprietários de outros imóveis.`, 'Relatos de imobiliárias e matérias (não são dados quantitativos)', 'Testar públicos por região em paralelo e comparar custo por lead; ajustar com os leads reais.');
  if (lt.length) add('Campanhas patrocinadas', 'Fato observado', `Origem dos seus leads: ${lt.slice(0, 5).map(([k, n]) => `${k} (${n})`).join(', ')}.`, 'Leads registrados na aba Demanda', 'Usar como base de públicos semelhantes e de orçamento por praça.');
  const nomes = faixa.map((p) => V(p).nome).slice(0, 6); const am = cf.slice(0, 3).map((c) => c[0].toLowerCase());
  add('Campanhas patrocinadas', 'Hipótese', `Palavras-chave de partida: “apartamento frente mar Balneário Piçarras”, “apartamento alto padrão Piçarras”, “lançamento Balneário Piçarras”${am[0] ? `, “apartamento com ${am[0]} Piçarras”` : ''}. Negativas: aluguel, temporada, diária, Airbnb, terreno.`, 'Regras de intenção de busca (sem volume medido)', 'Validar volume e CPC no Planejador de Palavras-chave do Google antes de investir.');
  if (nomes.length) add('Campanhas patrocinadas', 'Ação', `Campanhas de marca de concorrentes (${nomes.join(', ')}) exigem checar políticas da plataforma e normas de publicidade imobiliária.`, 'Concorrentes na faixa', 'Decidir com jurídico; priorizar termos genéricos e de categoria.');
  add('Posicionamento digital', 'Recomendação', 'Uma página de destino por empreendimento, com preço “a partir de” somente quando confirmado, diferenciais verificáveis e data de atualização.', 'Boa prática', 'Evita atrito com anúncios que divergem entre portais (há divergências na base).');
  add('Posicionamento digital', 'Fato (fonte externa)', 'Notícias citam o Selo Bandeira Azul e a localização entre Curitiba e Florianópolis como atrativos; urbanistas alertam para a necessidade de infraestrutura acompanhar o crescimento.', 'NSC Total e Gazeta do Povo', 'Conteúdo de localização e estilo de vida; tratar infraestrutura com transparência.');
  add('Posicionamento digital', 'Atenção', 'Dados de valorização divulgados por incorporadoras (por exemplo, 20,4% ao ano no The Wave) são da própria empresa. O IDI mede intenção de compra, não tamanho de mercado nem retorno.', 'Gazeta do Povo, 15/08/2026', 'Não replicar como promessa; citar fonte e período.');
  return I;
}
// ---------- migração de bases antigas ----------
export function migrate(db, seed) {
  if ((db.versao || 1) >= 2) return db;
  db.projetos.forEach((p) => { if (p.dados.status === 'pre-lancamento') p.dados.status = 'lancamento'; if (p.manual && p.manual.status && p.manual.status.valor === 'pre-lancamento') p.manual.status.valor = 'lancamento'; });
  db.termos = db.termos || {}; db.paginasAvaliadas = db.paginasAvaliadas || 0;
  db.demanda = db.demanda || { ...JSON.parse(JSON.stringify(seed.demanda)), leads: [], tendencias: [] };
  db.cfg.tema = db.cfg.tema || { ...DEFAULT_CFG.tema };
  const ids = new Set(db.projetos.map((p) => p.id));
  seed.projetos.forEach((sp) => { if (!ids.has(sp.id)) db.projetos.push({ ...JSON.parse(JSON.stringify(sp)), criadoEm: nowISO() }); });
  seed.projetos.forEach((sp) => { const p = db.projetos.find((x) => x.id === sp.id); if (p && p.seed) for (const [k, v] of Object.entries(sp.dados)) if (p.dados[k] == null) p.dados[k] = v; });
  (seed.patches || []).forEach((pt) => { const p = db.projetos.find((x) => x.id === pt.id); if (p && p.seed && !p.validado) Object.assign(p.dados, pt.set); });
  const urls = new Set(db.fontes.map((f) => f.url)); (seed.fontes || []).forEach((f) => { if (!urls.has(f.url)) db.fontes.push({ ...f, id: uid('f') }); });
  db.versao = 2; return db;
}

// ---------- capturas de página: sugerir cadastro existente, associar ou criar ----------
export function nomesCandidatos(doc) {
  const set = new Set(); const add = (x) => { x = (x || '').replace(/\s+/g, ' ').trim(); if (x.length >= 3 && x.length <= 70) set.add(x); };
  (doc.title || '').split(/\s[|\-–—•·]\s/).forEach(add); (doc.headings || []).slice(0, 3).forEach((h) => add(h.split(/\s[|\-–—]\s/)[0]));
  return [...set].slice(0, 6);
}
export function candidatosCaptura(db, doc) {
  const nomes = nomesCandidatos(doc); const hay = ' ' + norm([doc.title, ...(doc.headings || []), (doc.url || '')].join(' ')).replace(/[^a-z0-9]+/g, ' ') + ' '; const out = [];
  for (const p of db.projetos) {
    let best = 0, motivo = '';
    if ((p.fontes || []).some((f) => f.url === doc.url) || p.dados.linkOficial === doc.url) { best = 1; motivo = 'mesma URL já associada a este cadastro'; }
    for (const nm of [p.dados.nome, ...(p.aliases || [])]) {
      const n = normName(nm); if (!n) continue;
      if (hay.includes(' ' + n + ' ') && best < 0.95) { best = 0.95; motivo = 'o nome aparece no título ou na URL da página'; }
      for (const c of nomes) { const t1 = new Set(n.split(' ')), t2 = new Set(normName(c).split(' ')); const i = [...t1].filter((x) => t2.has(x)).length; const j = i / ((t1.size + t2.size - i) || 1); if (j > best) { best = j; motivo = `nome parecido com “${c}”`; } }
    }
    if (best >= 0.4) out.push({ id: p.id, nome: p.dados.nome, cidade: p.cidade, score: +best.toFixed(2), motivo });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}
export function previewDoc(doc) {
  return { precoInicial: parseStartPrice(doc.text || ''), precos: parsePrices(doc.text || '').slice(0, 5).map((x) => x.valor), entrega: parseEntrega(doc.text || ''), status: detectStatus([doc.title, doc.desc, ...(doc.headings || [])].join(' ')), lazer: extractAmenities(doc.text || '') };
}
export function aplicarCaptura(db, cap, esc) {
  const doc = cap.doc, fonte = { nome: 'Captura manual', url: doc.url }; let p, novo = false;
  if (esc.modo === 'mov') {
    const src = { nome: 'Captura manual (fonte oficial)', url: doc.url }; let mv = extrairMovimentos(db, doc, src);
    if (!mv.length) mv = [{ id: uid('mv'), chave: uid('k'), tipo: 'outro', titulo: (doc.title || doc.url).slice(0, 110), construtora: null, projetoId: null, bairro: null, endereco: null, data: null, descricao: String(doc.text || '').slice(0, 500), fonte: src.nome, url: doc.url, confianca: 'baixa', revisao: 'pendente', origem: 'captura', identificadoEm: nowISO() }];
    mv.forEach((m) => { m.origem = 'captura'; db.movimentos.unshift(m); }); return { itens: 0, novos: 0, eventos: mv.length, movimentos: mv.length, projetoId: null, novo: false };
  }
  if (esc.modo === 'assoc') {
    p = db.projetos.find((x) => x.id === esc.projetoId); if (!p) throw new Error('Escolha o empreendimento existente.');
    if (esc.alias) { const a = (nomesCandidatos(doc)[0] || '').trim(); if (a && normName(a) !== normName(p.dados.nome) && !(p.aliases || []).some((x) => normName(x) === normName(a))) (p.aliases = p.aliases || []).push(a); }
  } else {
    const nome = (esc.nome || '').trim(); if (!nome) throw new Error('Informe o nome do novo empreendimento.');
    const r = findOrCreate(db, { nome, construtora: (esc.construtora || '').trim() || null, bairro: (esc.bairro || '').trim() || null }, fonte, true); p = r.p; novo = r.novo;
  }
  const res = processDoc(db, { nome: 'Captura manual', url: doc.url, tipo: 'captura', empId: p.id, confiavel: 'baixa' }, doc);
  if (esc.oficial && !V(p).linkOficial) { applyObs(db, p, 'linkOficial', doc.url, fonte); res.itens++; }
  p.ultimaVerificacao = nowISO(); return { ...res, projetoId: p.id, novo };
}

// ---------- terrenos, alvarás e aprovações (fontes oficiais) ----------
export const MOV_TIPOS = { terreno: 'Terreno / parcelamento', eiv: 'Estudo de impacto / audiência pública', aprovacao: 'Aprovação de projeto', alvara: 'Alvará', 'licenca-ambiental': 'Licenciamento ambiental', habitese: 'Habite-se', outro: 'Outro' };
const MOV_RE = [['alvara', /alvar[áa]/i], ['aprovacao', /aprova[çc][ãa]o d[eo]s? projetos?|projetos? (arquitet[ôo]nicos? )?aprovados?|aprov(ou|aram|ado|ada|ados) (o |a |os |as )?projetos?|an[áa]lise (e aprova[çc][ãa]o )?de projetos?/i], ['eiv', /impacto de vizinhan[çc]a|\bEIV\b|\bRIV\b|\bEGT\b|\bRIT\b|audi[êe]ncia p[úu]blica/i], ['licenca-ambiental', /licen[çc]a ambiental|licenciamento ambiental|autoriza[çc][ãa]o ambiental/i], ['terreno', /desmembramento|unifica[çc][ãa]o de (lotes|terrenos|[áa]reas)|parcelamento do solo|aquisi[çc][ãa]o de (im[óo]vel|terreno|[áa]rea)|compra (e venda )?de (im[óo]vel|terreno|[áa]rea)/i], ['habitese', /habite-se|certificado de conclus[ãa]o/i]];
const CONTEXTO = /edif[íi]cio|residencial|condom[íi]nio|multifamiliar|\btorres?\b|apartamentos?|empreendimento|incorpora[çc][ãa]o|constru[çc][ãa]o/i;
export function extrairMovimentos(db, doc, src) {
  db.movimentos = db.movimentos || [];
  const known = [...new Set(db.projetos.map((p) => p.dados.construtora).filter(Boolean))], bairros = [...new Set(db.projetos.map((p) => p.dados.bairro).filter(Boolean))];
  const segs = String(doc.text || '').split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length >= 40 && s.length <= 600);
  const vistos = new Set(db.movimentos.map((m) => m.chave)), out = [];
  for (const s of segs) {
    const tp = MOV_RE.find(([, re]) => re.test(s)); if (!tp) continue;
    const b = known.find((k) => norm(s).includes(norm(k))); if (!b && !CONTEXTO.test(s)) continue;
    const chave = hash(norm(s).slice(0, 160) + '|' + (doc.url || '')); if (vistos.has(chave)) continue; vistos.add(chave);
    const d = /(\d{2})\/(\d{2})\/(20\d{2})/.exec(s), end = /\b(rua|avenida|av\.|rodovia|travessa|alameda)\s[^,.;\n]{3,50}/i.exec(s), pj = db.projetos.find((p) => normName(p.dados.nome).length > 3 && norm(s).includes(normName(p.dados.nome)));
    out.push({ id: uid('mv'), chave, tipo: tp[0], titulo: s.slice(0, 110) + (s.length > 110 ? '…' : ''), construtora: b || (pj && pj.dados.construtora) || null, projetoId: pj ? pj.id : null, bairro: bairros.find((x) => norm(s).includes(norm(x))) || null, endereco: end ? end[0].trim() : null, data: d ? `${d[3]}-${d[2]}-${d[1]}` : null, descricao: s, fonte: src.nome, url: doc.url || src.url, confianca: 'baixa', revisao: 'pendente', origem: 'coleta', identificadoEm: nowISO() });
    if (out.length >= 25) break;
  }
  return out;
}
export function registrarSinaisMarca(db, construtora, doc) {
  if (!construtora) return; db.marcas = db.marcas || {};
  const m = (db.marcas[construtora] = db.marcas[construtora] || {}), s = (m.sinais = m.sinais || { urls: [], social: {}, videos: 0, imgs: 0, og: false, textos: [] });
  if (doc.url && !s.urls.includes(doc.url)) s.urls.push(doc.url); Object.assign(s.social, doc.social || {}); s.videos = Math.max(s.videos, doc.videoCount || 0); s.imgs = Math.max(s.imgs, doc.imgCount || 0); s.og = s.og || !!doc.ogImage;
  const t = (doc.desc || '').trim(); if (t && !s.textos.includes(t)) s.textos = [t, ...s.textos].slice(0, 6);
}
// ---------- localização ----------
export function coordsOf(p) { const v = V(p); if (v.lat != null && v.lng != null && v.lat !== '' && v.lng !== '') return { lat: +v.lat, lng: +v.lng, tipo: 'confirmada' }; if (p.geo && p.geo.lat != null) return { lat: p.geo.lat, lng: p.geo.lng, tipo: 'estimada', origem: p.geo.origem }; return null; }
export const dentroDaRegiao = (lat, lng) => lat > -26.9 && lat < -26.62 && lng > -48.8 && lng < -48.55;
export const consultaEndereco = (p) => { const v = V(p); return v.endereco ? `${v.endereco}, ${v.bairro ? v.bairro + ', ' : ''}${p.cidade}, SC, Brasil` : null; };
// ---------- migração para a v3 ----------
export function migrate3(db, seed) {
  if ((db.versao || 1) >= 3) return db;
  db.movimentos = db.movimentos || []; db.marcas = db.marcas || {}; db.capturas = db.capturas || [];
  const t = db.cfg.tema = db.cfg.tema || { ...DEFAULT_CFG.tema };
  if (t.cor1 === '#0b6e8a' || !t.cor1) Object.assign(t, { cor1: DEFAULT_CFG.tema.cor1, cor2: DEFAULT_CFG.tema.cor2, cor3: DEFAULT_CFG.tema.cor3, cor4: DEFAULT_CFG.tema.cor4 });
  const chaves = new Set(db.movimentos.map((m) => m.chave)); (seed.movimentos || []).forEach((m) => { if (!chaves.has(m.chave)) db.movimentos.push({ ...m, identificadoEm: nowISO() }); });
  const urls = new Set(db.fontes.map((f) => f.url)); (seed.fontes || []).forEach((f) => { if (!urls.has(f.url)) db.fontes.push({ ...f, id: uid('f') }); });
  db.versao = 3; return db;
}
