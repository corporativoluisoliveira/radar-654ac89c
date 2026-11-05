// Análises derivadas da base: matriz de concorrência, oportunidades e posicionamento de marca. Sem dependência de Chrome.
import { V, STATUS, inBand, priceRange, caracFreq, brl, diferencial, MOV_TIPOS } from './core.js';
const nums = (s) => (String(s ?? '').match(/\d+/g) || []).map(Number);
const maxDorm = (p) => { const v = V(p); const a = [...nums(v.dorms), ...nums(v.suites), ...(v.tipologias || []).map((t) => +t.dorm).filter(Boolean)]; return a.length ? Math.max(...a) : null; };
const minDorm = (p) => { const v = V(p); const a = [...nums(v.dorms), ...(v.tipologias || []).map((t) => +t.dorm).filter(Boolean)]; return a.length ? Math.min(...a) : null; };
const ano = (s) => { const m = /(20\d{2})/.exec(String(s || '')); return m ? +m[1] : null; };
const principais = (db) => db.projetos.filter((p) => p.cidade === db.cfg.cidade);

// ---------- matriz de concorrência ----------
export function matrizConcorrencia(db, lista, max = 40) {
  const cfg = db.cfg, top = caracFreq(lista).slice(0, 8).map((c) => c[0]), fb = ['Piscina', 'Academia', 'Brinquedoteca', 'Spa / sauna', 'Salão de festas', 'Espaço gourmet / churrasqueira', 'Coworking', 'Pet place'];
  const am = top.length >= 4 ? top : [...new Set([...top, ...fb])].slice(0, 8);
  const cols = [{ k: 'faixa', t: 'Cruza a faixa de interesse' }, { k: 'fm', t: 'Frente-mar' }, { k: 'vm', t: 'Vista-mar' }, { k: 'p200', t: 'Até 200 m da praia' }, ...am.map((a) => ({ k: 'a:' + a, t: a }))];
  const cell = (p, k) => {
    const v = V(p), l = v.lazer || [];
    if (k === 'faixa') return inBand(p, cfg.faixaMin, cfg.faixaMax);
    if (k === 'fm') return v.frenteMar ? v.frenteMar === 'sim' : null;
    if (k === 'vm') return v.frenteMar ? v.frenteMar === 'vista' : null;
    if (k === 'p200') return v.distanciaPraia != null ? v.distanciaPraia <= 200 : v.frenteMar === 'sim' ? true : null;
    return l.length ? l.includes(k.slice(2)) : null;
  };
  const rows = lista.map((p) => { const cells = cols.map((c) => cell(p, c.k)); return { p, cells, score: cells.filter((x) => x === true).length, conhecidos: cells.filter((x) => x != null).length }; })
    .sort((a, b) => b.score - a.score || b.conhecidos - a.conhecidos);
  const totais = cols.map((_, i) => { const kn = rows.filter((r) => r.cells[i] != null).length, sim = rows.filter((r) => r.cells[i] === true).length; return { sim, conhecidos: kn, pct: kn ? Math.round((sim / kn) * 100) : null }; });
  return { cols, rows: rows.slice(0, max), total: rows.length, totais };
}

// ---------- avaliação de oportunidades ----------
export function oportunidades(db) {
  const cfg = db.cfg, P = principais(db), out = []; const hoje = new Date().getFullYear();
  const add = (o) => out.push({ tipo: 'Hipótese', forca: 1, ...o });
  const nd = (titulo, faltam) => out.push({ id: 'nd-' + titulo, titulo, tipo: 'Dados insuficientes', forca: 0, evidencia: faltam, base: '', diferencial: '', acao: 'Complete os dados na ficha dos empreendimentos ou capture mais páginas de construtoras.' });
  // 1. faixa de entrada do segmento por bairro
  const lo = cfg.faixaMin, hi = cfg.faixaMin + 1e6, cp = P.filter((p) => priceRange(p) && V(p).bairro);
  if (cp.length >= 5) {
    const por = {}; cp.forEach((p) => { const b = V(p).bairro; por[b] = por[b] || { n: 0, sub: 0 }; por[b].n++; if (inBand(p, lo, hi)) por[b].sub++; });
    const pobres = Object.entries(por).filter(([, x]) => x.n >= 2 && x.sub <= 1);
    if (pobres.length) add({ id: 'faixa-bairro', titulo: `Poucos empreendimentos na faixa de ${brl(lo)} a ${brl(hi)} em ${pobres.map((b) => b[0]).join(', ')}`, evidencia: pobres.map(([b, x]) => `${b}: ${x.sub} de ${x.n} com preço informado`).join('; '), base: `${cp.length} empreendimentos com preço e bairro`, diferencial: 'Produto de entrada no segmento premium: posicionar como acesso ao alto padrão, com metragem eficiente e lazer completo.', acao: 'Confirmar se a escassez é de oferta ou de preço informado e testar campanha geolocalizada.', forca: 2 });
  } else nd('Faixa de entrada do segmento por bairro', `Só ${cp.length} empreendimentos têm preço e bairro; a análise exige 5.`);
  // 2. quatro suítes
  const dm = P.map(maxDorm).filter((x) => x != null);
  if (dm.length >= 8) { const q = dm.filter((x) => x >= 4).length, s = q / dm.length; if (s <= 0.3) add({ id: 'quatro-suites', titulo: 'Baixa oferta de apartamentos com quatro suítes ou mais', evidencia: `${q} de ${dm.length} empreendimentos (${Math.round(s * 100)}%) citam 4 ou mais dormitórios/suítes.`, base: `${dm.length} empreendimentos com dormitórios informados`, diferencial: 'Planta de 4 suítes com metragem generosa para famílias grandes, home office e hóspedes.', acao: 'Levantar tabela de unidades de 4 suítes dos concorrentes e comparar preço por m².', forca: 3 }); }
  else nd('Oferta de apartamentos com quatro suítes', `Só ${dm.length} empreendimentos têm dormitórios informados; a análise exige 8.`);
  // 3. lazer pouco comum
  const comLazer = P.filter((p) => (V(p).lazer || []).length), freq = Object.fromEntries(caracFreq(P));
  if (comLazer.length >= 5) {
    const exp = ['Brinquedoteca', 'Pet place', 'Coworking', 'Cinema', 'Spa / sauna', 'Quadra esportiva', 'Bar / adega', 'Sala de jogos', 'Mirante / rooftop', 'Beach club / prainha', 'Lavanderia', 'Carregador de carro elétrico'];
    const raros = exp.filter((a) => (freq[a] || 0) <= 1);
    if (raros.length) add({ id: 'lazer-raro', titulo: `Poucos empreendimentos com infraestrutura de lazer específica: ${raros.slice(0, 5).join(', ')}`, evidencia: raros.slice(0, 6).map((a) => `${a} (${freq[a] || 0} de ${comLazer.length})`).join('; '), base: `${comLazer.length} empreendimentos com lazer cadastrado (zero pode indicar dado ausente)`, diferencial: 'Eleger 1 ou 2 itens raros como assinatura do projeto (ex.: espaço kids, pet, coworking) e comunicar como estilo de vida.', acao: 'Conferir nas páginas dos concorrentes se o item realmente não existe antes de apostar nele.', forca: 2 });
  } else nd('Infraestrutura de lazer específica', `Só ${comLazer.length} empreendimentos têm áreas comuns cadastradas; a análise exige 5.`);
  // 4. concentração de tipologia entre lançamentos e obras
  const lanc = P.filter((p) => ['lancamento', 'em-construcao'].includes(V(p).status) && minDorm(p) != null);
  if (lanc.length >= 5) { const c = {}; lanc.forEach((p) => (c[minDorm(p)] = (c[minDorm(p)] || 0) + 1)); const [k, n] = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; if (n / lanc.length >= 0.6) add({ id: 'concentracao', titulo: `Concentração de lançamentos e obras na tipologia de ${k} dormitórios`, evidencia: `${n} de ${lanc.length} (${Math.round((n / lanc.length) * 100)}%) têm ${k} dormitório(s) como tipologia de entrada.`, base: `${lanc.length} empreendimentos em lançamento ou construção`, diferencial: 'Oferecer tipologia diferente do que predomina reduz comparação direta de preço.', acao: 'Mapear a tipologia menos ofertada e testar demanda com pesquisa ou lista de interesse.', forca: 2 }); }
  else nd('Concentração de tipologia nos lançamentos', `Só ${lanc.length} lançamentos/obras têm dormitórios informados; a análise exige 5.`);
  // 5. regiões sem novos lançamentos
  const st = P.filter((p) => V(p).status && V(p).status !== 'desconhecido' && V(p).bairro);
  const mv = (db.movimentos || []).filter((m) => m.revisao !== 'descartado' && m.bairro && ['terreno', 'aprovacao', 'alvara', 'eiv'].includes(m.tipo));
  if (st.length >= 6) {
    const por = {}; st.forEach((p) => { const b = V(p).bairro; por[b] = por[b] || { n: 0, l: 0 }; por[b].n++; if (V(p).status === 'lancamento') por[b].l++; });
    const sem = Object.entries(por).filter(([, x]) => x.n >= 2 && x.l === 0);
    if (sem.length) add({ id: 'sem-lancamento', titulo: `Ausência de novos lançamentos em ${sem.map((b) => b[0]).join(', ')}`, evidencia: sem.map(([b, x]) => `${b}: ${x.n} empreendimentos, nenhum em lançamento`).join('; ') + (mv.length ? `. Movimentos oficiais nesses bairros: ${mv.filter((m) => sem.some((s) => s[0] === m.bairro)).length}.` : ''), base: `${st.length} empreendimentos com estágio e bairro`, diferencial: 'Ser o primeiro lançamento da região captura demanda reprimida e define a referência de preço.', acao: 'Cruzar com terrenos e alvarás (aba Terrenos e licenças) para saber se alguém já se movimenta ali.', forca: 3 });
  } else nd('Regiões sem novos lançamentos', `Só ${st.length} empreendimentos têm estágio e bairro; a análise exige 6.`);
  // 6. pronto para morar na faixa
  const faixa = P.filter((p) => inBand(p, cfg.faixaMin, cfg.faixaMax) === true);
  if (faixa.length >= 3) { const pr = faixa.filter((p) => V(p).status === 'pronto').length; if (pr <= 1) add({ id: 'pronto', titulo: 'Poucas opções prontas para morar na faixa de interesse', evidencia: `${pr} de ${faixa.length} empreendimentos que cruzam a faixa estão prontos.`, base: `${faixa.length} empreendimentos na faixa`, diferencial: 'Pronta entrega atende quem quer usar na próxima temporada e compara menos prazo de obra.', acao: 'Verificar estoque de unidades prontas e revendas; avaliar campanha de “mude para a temporada”.', forca: 2 }); }
  // 7. lacuna de metragem
  const ar = P.map((p) => V(p).areaMin).filter(Boolean).sort((a, b) => a - b);
  if (ar.length >= 8) { let g = null; for (let i = 1; i < ar.length; i++) if (ar[i] - ar[i - 1] >= 40 && (!g || ar[i] - ar[i - 1] > g[1] - g[0])) g = [ar[i - 1], ar[i]]; if (g) add({ id: 'metragem', titulo: `Lacuna de metragem entre ${g[0]} e ${g[1]} m²`, evidencia: `Nenhum empreendimento tem metragem mínima entre ${g[0]} e ${g[1]} m².`, base: `${ar.length} empreendimentos com metragem`, diferencial: 'Planta intermediária entre os dois extremos da oferta.', acao: 'Validar demanda dessa metragem com corretores antes de definir o produto.', forca: 2 }); }
  // 8. janelas de entrega
  const ent = P.map((p) => ano(V(p).entrega)).filter(Boolean);
  if (ent.length >= 6) { const vaz = []; for (let y = hoje; y <= hoje + 4; y++) if (!ent.includes(y)) vaz.push(y); if (vaz.length) add({ id: 'entrega', titulo: `Janela de entrega com pouca concorrência: ${vaz.join(', ')}`, evidencia: `Nenhum dos ${ent.length} empreendimentos com previsão informada entrega em ${vaz.join(', ')}.`, base: `${ent.length} empreendimentos com previsão de entrega`, diferencial: 'Prazo de entrega previsível em ano sem oferta concorrente.', acao: 'Conferir previsões de entrega nas páginas oficiais; muitas ainda não foram informadas.', forca: 1 }); }
  // 9. pipeline futuro
  if (mv.length) { const por = {}; mv.forEach((m) => (por[m.bairro] = (por[m.bairro] || 0) + 1)); add({ id: 'pipeline', tipo: 'Fato observado', titulo: `Pipeline futuro: ${mv.length} movimento(s) oficial(is) em ${Object.keys(por).join(', ')}`, evidencia: mv.slice(0, 4).map((m) => `${MOV_TIPOS[m.tipo]}${m.construtora ? ' (' + m.construtora + ')' : ''}`).join('; '), base: 'Aba Terrenos e licenças (revisar antes de agir)', diferencial: 'Antecipar-se a concorrentes futuros nessas regiões.', acao: 'Confirmar cada movimento na fonte oficial e acompanhar o próximo estágio (aprovação, alvará).', forca: 2 }); }
  return out.sort((a, b) => b.forca - a.forca);
}

// ---------- posicionamento de marca ----------
export const MARCA_CRITERIOS = [
  { k: 'identidade', t: 'Qualidade da identidade visual', nota: true, guia: '1 = amadora ou inconsistente; 3 = correta, mas genérica; 5 = sistema visual sofisticado, coerente e reconhecível.' },
  { k: 'linguagem', t: 'Linguagem de comunicação', guia: 'Tom (formal, aspiracional, técnico, afetivo), vocabulário recorrente, uso de narrativa.' },
  { k: 'foto', t: 'Padrão fotográfico e audiovisual', nota: true, guia: '1 = imagens fracas ou de banco; 3 = renders corretos; 5 = produção própria, renders, fotos e vídeos de alto nível.' },
  { k: 'argumentos', t: 'Argumentos comerciais', guia: 'Por que comprar: localização, valorização, exclusividade, prazo, condições de pagamento.' },
  { k: 'diferenciais', t: 'Diferenciais destacados', guia: 'O que a marca coloca em primeiro plano nas peças e na página.' },
  { k: 'publico', t: 'Público-alvo aparente', guia: 'Perfil que a comunicação parece buscar (família, investidor, segunda residência, idade, renda).' },
  { k: 'digital', t: 'Presença e consistência digital', nota: true, guia: 'Site, redes sociais, frequência, e coerência de mensagem e visual entre canais.' },
];
export const estrelas = (n) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '—');
export const marcaMedia = (m) => { const k = ['identidade', 'foto', 'digital'].map((x) => +(m || {})[x]).filter(Boolean); return k.length ? +(k.reduce((a, b) => a + b, 0) / k.length).toFixed(1) : null; };
export function listaConstrutoras(db) { const c = {}; db.projetos.forEach((p) => { const n = V(p).construtora; if (n) c[n] = (c[n] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([nome, n]) => ({ nome, n })); }
export function marcaResumo(db, nome) {
  const P = db.projetos.filter((p) => V(p).construtora === nome), rg = P.map(priceRange).filter(Boolean);
  const mn = rg.length ? Math.min(...rg.map((r) => r[0])) : null, mx = rg.length ? Math.max(...rg.map((r) => r[1])) : null, s = ((db.marcas || {})[nome] || {}).sinais || null;
  return {
    n: P.length, faixa: mn != null ? [mn, mx] : null, bairros: [...new Set(P.map((p) => V(p).bairro).filter(Boolean))], estagios: [...new Set(P.map((p) => STATUS[V(p).status]).filter(Boolean))],
    dorms: [...new Set(P.map((p) => V(p).dorms).filter(Boolean))], diferenciais: P.map((p) => diferencial(db, p).t).filter(Boolean).slice(0, 4), lazer: caracFreq(P).slice(0, 6).map((c) => c[0]),
    publico: mn == null ? null : mn >= 3e6 ? 'Alto e altíssimo padrão: famílias de alta renda, segunda residência e investidores.' : mn >= 1.5e6 ? 'Médio-alto padrão: famílias e investidores com ticket entre R$ 1,5 e R$ 3 mi.' : 'Ticket mais acessível: primeira ou segunda residência e investidores.',
    digital: { siteOficial: P.some((p) => V(p).linkOficial || V(p).linkConstrutora), redes: s ? Object.keys(s.social) : [], paginas: s ? s.urls.length : 0, videos: s ? s.videos : 0, og: s ? s.og : false, textos: s ? s.textos : [] },
  };
}
