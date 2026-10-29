// Lógica pura do painel do operador (sem DOM): converte o que a pessoa digita no que a API espera. Testada em src/painel.test.ts.

/** "49,90", "49.90", "1.299,90" ou "50" → centavos inteiros; null se não for um valor em reais com até 2 casas. */
export function reaisParaCentavos(texto) {
  const t = String(texto ?? '').trim().replace(/^R\$\s*/i, '');
  const m = /^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(t) ?? /^(\d+)(?:\.(\d{1,2}))?$/.exec(t);
  if (m === null) return null;
  const inteiro = m[1].replace(/\./g, '');
  const centavos = Number(inteiro) * 100 + Number((m[2] ?? '').padEnd(2, '0') || '0');
  return Number.isSafeInteger(centavos) && centavos > 0 ? centavos : null;
}

export function centavosParaReais(centavos) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Valor de <input type="datetime-local"> (hora do computador) → ISO em UTC; vazio → null; inválido → undefined. */
export function dataLocalParaIso(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Quantidade com vírgula ou ponto ("0,4" ou "0.4") → número maior que zero; senão null. */
export function lerQuantidade(texto) {
  const n = Number(String(texto ?? '').trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Formulário da oferta manual → corpo do POST. Devolve { corpo } ou { erros: { campo: mensagem } } (campos com o mesmo nome da API),
 * sem falar com o servidor: a API confere tudo de novo.
 */
export function montarPedidoOfertaManual(f) {
  const erros = {};
  const corpo = {};
  if (f.produtoModo === 'existente') {
    if (!f.produtoId) erros.produto_id = 'Escolha um produto da busca.';
    else corpo.produto_id = f.produtoId;
  } else {
    const n = f.novo ?? {};
    const quantidade = lerQuantidade(n.quantidade);
    if (!String(n.nome ?? '').trim()) erros['produto_novo.nome'] = 'Informe o nome.';
    if (!n.categoria) erros['produto_novo.categoria'] = 'Escolha a categoria.';
    if (quantidade === null) erros['produto_novo.embalagem'] = 'Informe a quantidade da embalagem (maior que zero).';
    if (n.gtin && !/^\d{8,14}$/.test(n.gtin)) erros['produto_novo.gtin'] = 'O código de barras tem de 8 a 14 dígitos.';
    const imagem = String(n.imagem ?? '').trim();
    if (imagem !== '' && !/^https:\/\/\S+$/.test(imagem)) erros['produto_novo.imagem_url'] = 'O endereço da foto começa por https://';
    corpo.produto_novo = {
      nome: String(n.nome ?? '').trim(), marca: String(n.marca ?? '').trim() || null, categoria: n.categoria ?? '', subcategoria: n.subcategoria || null,
      gtin: n.gtin || null, embalagem: { quantidade, unidade: n.unidade || 'un' },
    };
    if (String(n.imagem ?? '').trim() !== '') corpo.produto_novo.imagem_url = String(n.imagem).trim();
  }
  if (!f.lojaId) erros.loja_id = 'Escolha a loja.';
  corpo.loja_id = f.lojaId;
  const preco = reaisParaCentavos(f.preco);
  if (preco === null) erros.preco_centavos = 'Informe o preço em reais, por exemplo 49,90.';
  corpo.preco_centavos = preco;

  const c = f.condicao ?? { tipo: '' };
  if (c.tipo === 'leve_pague') {
    const leve = Number(c.leve), pague = Number(c.pague);
    if (!Number.isInteger(leve) || !Number.isInteger(pague) || pague < 1 || leve <= pague) erros.condicao = 'Leve N pague M: N maior que M.';
    corpo.condicao = { tipo: 'leve_pague', leve, pague };
  } else if (c.tipo === 'quantidade_minima') {
    const q = Number(c.quantidade);
    if (!Number.isInteger(q) || q < 2) erros.condicao = 'A quantidade mínima é de 2 em diante.';
    corpo.condicao = { tipo: 'quantidade_minima', quantidade: q };
  } else if (c.tipo === 'cartao_fidelidade') {
    if (!String(c.programa ?? '').trim()) erros.condicao = 'Informe o nome do programa de fidelidade.';
    corpo.condicao = { tipo: 'cartao_fidelidade', programa: String(c.programa ?? '').trim() };
  } else if (c.tipo === 'app_da_rede') corpo.condicao = { tipo: 'app_da_rede' };
  else corpo.condicao = null;

  if (f.frete?.status === 'conhecido') {
    const v = f.frete.valor === '' || f.frete.valor === undefined ? 0 : reaisParaCentavos(f.frete.valor);
    if (v === null) erros.frete = 'Informe o frete em reais (ou 0).';
    corpo.frete = { status: 'conhecido', centavos: v };
  } else corpo.frete = { status: f.frete?.status === 'nao_se_aplica' ? 'nao_se_aplica' : 'a_confirmar', centavos: null };

  const de = dataLocalParaIso(f.validaDe);
  const ate = dataLocalParaIso(f.validaAte);
  if (de === undefined) erros.valida_de = 'Data inválida.';
  if (ate === undefined) erros.valida_ate = 'Data inválida.';
  corpo.valida_de = de ?? null;
  if (ate) corpo.valida_ate = ate;
  if (de && ate && de > ate) erros.valida_ate = 'O fim não pode ser antes do começo.';

  const link = String(f.link ?? '').trim();
  if (!/^https:\/\/\S+$/.test(link)) erros.link = 'Cole o link da oferta, começando por https://';
  corpo.link = link;
  corpo.link_afiliado = f.linkAfiliado === true;
  return Object.keys(erros).length > 0 ? { erros } : { corpo };
}

/** Resposta de erro da API → { campo: mensagem } mais uma mensagem geral. */
export function errosDaApi(resposta) {
  const campos = {};
  for (const c of resposta?.campos ?? []) campos[c.campo] = c.mensagem;
  return { campos, geral: resposta?.mensagem ?? 'Algo deu errado.' };
}

export const ROTULO_CODIGO = {
  NBCAL_VEDADO: 'Vedado pela NBCAL (mamadeira, bico, chupeta)',
  NBCAL_CAUTELA: 'Cautela da NBCAL (protetor de mamilo e similares)',
  TERMO_DE_VENDA_CONTROLADA: 'Texto de venda controlada de medicamento',
  MEDICAMENTO_SEM_REFERENCIA: 'Medicamento sem referência na lista',
  MEDICAMENTO_DESLIGADO: 'Medicamento (o app não vende medicamento)',
  MEDICAMENTO_COM_PRESCRICAO: 'Medicamento com prescrição',
  SUBSTANCIA_CONTROLADA: 'Substância controlada',
  PROMOCAO_PROIBIDA_PARA_MEDICAMENTO: 'Promoção de medicamento (proibida)',
};

// ------------------------------------------------------------------------------------------------ versão final (DECISIONS 98)

/** Minúsculas, sem acento e com espaços simples: para buscar "farmácia" digitando "farmacia". */
export function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Itens cujo texto (o que `texto(item)` devolve) contém todas as palavras do termo, sem ligar para acento e maiúscula. */
export function filtrarPorTexto(itens, termo, texto) {
  const palavras = normalizar(termo).split(' ').filter(Boolean);
  if (palavras.length === 0) return itens;
  return itens.filter((i) => { const t = normalizar(texto(i)); return palavras.every((p) => t.includes(p)); });
}

/** "14020-260", "14.020-260" ou "14020260" → "14020260"; outra coisa → null. */
export function lerCep(texto) {
  const so = String(texto ?? '').replace(/[\s.\-]/g, '');
  return /^[0-9]{8}$/.test(so) ? so : null;
}
export const formatarCep = (cep) => (/^[0-9]{8}$/.test(cep ?? '') ? `${cep.slice(0, 5)}-${cep.slice(5)}` : String(cep ?? ''));

/** Faixas já prontas para um clique (o operador ainda confere a entrega com a loja). */
export const FAIXAS_PRONTAS = [
  { rotulo: 'Brasil inteiro', cep_inicio: '01000000', cep_fim: '99999999' },
  { rotulo: 'Estado de SP', cep_inicio: '01000000', cep_fim: '19999999' },
  { rotulo: 'Capital de SP', cep_inicio: '01000000', cep_fim: '05999999' },
  { rotulo: 'Estado do RJ', cep_inicio: '20000000', cep_fim: '28999999' },
  { rotulo: 'Estado de MG', cep_inicio: '30000000', cep_fim: '39999999' },
];

/** Linhas do editor de área ({inicio, fim, prazo} como digitados) → { areas } ou { erros: { 'areas_entrega[i].campo': msg } }. */
export function montarAreas(linhas) {
  const erros = {};
  const areas = (linhas ?? []).map((l, i) => {
    const ini = lerCep(l.inicio), fim = lerCep(l.fim);
    const prazo = Number(String(l.prazo ?? '').trim());
    if (ini === null) erros[`areas_entrega[${i}].cep_inicio`] = 'CEP com 8 dígitos.';
    if (fim === null) erros[`areas_entrega[${i}].cep_fim`] = 'CEP com 8 dígitos.';
    else if (ini !== null && ini > fim) erros[`areas_entrega[${i}].cep_fim`] = 'O CEP final não pode ser menor que o inicial.';
    if (String(l.prazo ?? '').trim() === '' || !Number.isInteger(prazo) || prazo < 0 || prazo > 90) erros[`areas_entrega[${i}].prazo_dias`] = 'Prazo de 0 a 90 dias.';
    return { cep_inicio: ini, cep_fim: fim, prazo_dias: prazo };
  });
  return Object.keys(erros).length > 0 ? { erros } : { areas };
}

/** Formulário de loja nova → corpo do POST /v1/admin/lojas, ou { erros }. */
export function montarPedidoLoja(f) {
  const erros = {};
  const nome = String(f.nome ?? '').trim();
  if (nome === '' || nome.length > 120) erros.nome = 'Informe o nome da loja (até 120 caracteres).';
  const cnpj = String(f.cnpj ?? '').replace(/[.\-/\s]/g, '');
  if (cnpj !== '' && !/^[0-9]{14}$/.test(cnpj)) erros.cnpj = 'O CNPJ tem 14 dígitos (ou deixe em branco).';
  const reputacao = Number(String(f.reputacao ?? '0.5').replace(',', '.'));
  if (!Number.isFinite(reputacao) || reputacao < 0 || reputacao > 1) erros.reputacao = 'Reputação de 0 a 1.';
  const a = montarAreas(f.areas);
  if (a.erros) Object.assign(erros, a.erros);
  else if (a.areas.length === 0) erros.areas_entrega = 'Informe ao menos uma faixa de CEP em que a loja entrega.';
  if (Object.keys(erros).length > 0) return { erros };
  return {
    corpo: {
      nome, rede: String(f.rede ?? '').trim() || null, cnpj: cnpj || null, autorizacao_sanitaria: String(f.autorizacao ?? '').trim() || null,
      status: f.status === 'aprovada' ? 'aprovada' : 'em_observacao', reputacao: Math.round(reputacao * 100) / 100, areas_entrega: a.areas,
    },
  };
}

export const FONTES_RECEITA = [
  ['afiliado_lomadee', 'Afiliado · Lomadee'], ['afiliado_outros', 'Afiliado · outras redes'], ['assinatura_google_play', 'Assinatura · Google Play'],
  ['assinatura_app_store', 'Assinatura · App Store'], ['anuncios', 'Anúncios'], ['outros', 'Outras receitas'],
];
export const STATUS_RECEITA = [['prevista', 'Prevista'], ['confirmada', 'Confirmada'], ['recebida', 'Recebida'], ['cancelada', 'Cancelada']];
export const rotuloFonteReceita = (f) => (FONTES_RECEITA.find(([v]) => v === f)?.[1] ?? f);
export const rotuloStatusReceita = (s) => (STATUS_RECEITA.find(([v]) => v === s)?.[1] ?? s);

/** "31/10/2026" ou "2026-10-31" → "2026-10-31" (data que existe); senão null. */
export function lerData(texto) {
  const t = String(texto ?? '').trim();
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const iso = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : (/^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null);
  if (iso === null) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}

/** Formulário de lançamento → corpo do POST /v1/admin/receitas, ou { erros }. */
export function montarPedidoReceita(f) {
  const erros = {};
  if (!FONTES_RECEITA.some(([v]) => v === f.fonte)) erros.fonte = 'Escolha a fonte da receita.';
  if (!STATUS_RECEITA.some(([v]) => v === f.status)) erros.status = 'Escolha a situação.';
  const competencia = lerData(f.competencia);
  if (competencia === null) erros.competencia = 'Informe a data (dia da venda ou do mês).';
  const valor = reaisParaCentavos(f.valor);
  if (valor === null) erros.valor_centavos = 'Informe o valor em reais, por exemplo 158,90.';
  const descricao = String(f.descricao ?? '').trim(), referencia = String(f.referencia ?? '').trim();
  if (descricao.length > 300) erros.descricao = 'Até 300 caracteres.';
  if (referencia.length > 120) erros.referencia = 'Até 120 caracteres.';
  if (Object.keys(erros).length > 0) return { erros };
  return { corpo: { fonte: f.fonte, competencia, valor_centavos: valor, status: f.status, descricao: descricao || null, referencia: referencia || null } };
}

const APELIDOS_FONTE = {
  lomadee: 'afiliado_lomadee', afiliado_lomadee: 'afiliado_lomadee', afiliado: 'afiliado_outros', afiliados: 'afiliado_outros', afiliado_outros: 'afiliado_outros',
  'google play': 'assinatura_google_play', google_play: 'assinatura_google_play', assinatura_google_play: 'assinatura_google_play',
  'app store': 'assinatura_app_store', app_store: 'assinatura_app_store', apple: 'assinatura_app_store', assinatura_app_store: 'assinatura_app_store',
  anuncio: 'anuncios', anuncios: 'anuncios', admob: 'anuncios', outros: 'outros', outra: 'outros', outras: 'outros',
};
const APELIDOS_STATUS = {
  prevista: 'prevista', pendente: 'prevista', pending: 'prevista', em_analise: 'prevista', 'em analise': 'prevista',
  confirmada: 'confirmada', aprovada: 'confirmada', approved: 'confirmada', validada: 'confirmada',
  recebida: 'recebida', paga: 'recebida', pago: 'recebida', paid: 'recebida',
  cancelada: 'cancelada', cancelado: 'cancelada', recusada: 'cancelada', reprovada: 'cancelada', cancelled: 'cancelada', canceled: 'cancelada',
};
const COLUNAS_CSV = {
  data: 'competencia', competencia: 'competencia', 'data da venda': 'competencia', dia: 'competencia',
  fonte: 'fonte', origem: 'fonte', valor: 'valor', 'valor (r$)': 'valor', comissao: 'valor', status: 'status', situacao: 'status',
  descricao: 'descricao', produto: 'descricao', referencia: 'referencia', id: 'referencia', transacao: 'referencia', pedido: 'referencia',
};

/** Divide uma linha de CSV respeitando aspas. */
function dividirLinha(linha, sep) {
  const out = []; let atual = ''; let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (aspas) {
      if (c === '"' && linha[i + 1] === '"') { atual += '"'; i++; } else if (c === '"') aspas = false; else atual += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) { out.push(atual); atual = ''; } else atual += c;
  }
  out.push(atual);
  return out.map((v) => v.trim());
}

/**
 * Texto de um CSV de receitas → { itens, erros: [{ linha, mensagem }] }. Primeira linha = cabeçalho (data, fonte, valor, status,
 * descricao, referencia; aceita alguns sinônimos e ; ou , como separador). `fontePadrao` vale quando não há coluna de fonte.
 */
export function lerCsvReceitas(texto, fontePadrao = 'afiliado_lomadee') {
  const linhas = String(texto ?? '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (linhas.length < 2) return { itens: [], erros: [{ linha: 1, mensagem: 'O arquivo precisa de um cabeçalho e ao menos uma linha.' }] };
  const sep = (linhas[0].match(/;/g)?.length ?? 0) >= (linhas[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const cab = dividirLinha(linhas[0], sep).map((c) => COLUNAS_CSV[normalizar(c)] ?? null);
  const erros = [];
  for (const obrig of ['competencia', 'valor']) if (!cab.includes(obrig)) erros.push({ linha: 1, mensagem: `Falta a coluna "${obrig === 'competencia' ? 'data' : 'valor'}" no cabeçalho.` });
  if (erros.length > 0) return { itens: [], erros };
  const itens = [];
  linhas.slice(1).forEach((l, i) => {
    const n = i + 2;
    const v = Object.fromEntries(dividirLinha(l, sep).map((x, j) => [cab[j], x]).filter(([k]) => k !== null));
    const fonte = v.fonte === undefined || v.fonte === '' ? fontePadrao : APELIDOS_FONTE[normalizar(v.fonte)] ?? null;
    const status = v.status === undefined || v.status === '' ? 'confirmada' : APELIDOS_STATUS[normalizar(v.status)] ?? null;
    const p = montarPedidoReceita({ fonte, status, competencia: v.competencia, valor: v.valor, descricao: v.descricao, referencia: v.referencia });
    if (p.erros) {
      const motivos = [];
      if (fonte === null) motivos.push(`fonte "${v.fonte}" desconhecida`);
      if (status === null) motivos.push(`situação "${v.status}" desconhecida`);
      if (p.erros.competencia) motivos.push(`data "${v.competencia ?? ''}" inválida`);
      if (p.erros.valor_centavos) motivos.push(`valor "${v.valor ?? ''}" inválido`);
      if (p.erros.descricao || p.erros.referencia) motivos.push('texto longo demais');
      erros.push({ linha: n, mensagem: motivos.join('; ') || 'linha inválida' });
    } else itens.push(p.corpo);
  });
  return { itens, erros };
}

/** "há 5 min", "há 3 h", "há 2 dias", "agora". */
export function tempoRelativo(iso, agora = new Date()) {
  if (!iso) return '—';
  const s = Math.round((agora.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 0) { const f = -s; return f < 3600 ? `em ${Math.max(1, Math.round(f / 60))} min` : f < 86400 ? `em ${Math.round(f / 3600)} h` : `em ${Math.round(f / 86400)} dias`; }
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

/** Valor em reais abreviado para eixo e cartão: R$ 950, R$ 1,2 mil, R$ 3,4 mi. */
export function reaisCompactos(centavos) {
  const r = centavos / 100;
  const fmt = (n, casas) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
  if (Math.abs(r) >= 1e6) return `R$ ${fmt(r / 1e6, 1)} mi`;
  if (Math.abs(r) >= 1e3) return `R$ ${fmt(r / 1e3, 1)} mil`;
  return `R$ ${fmt(r, r % 1 === 0 ? 0 : 2)}`;
}

/** Marcas "redondas" do eixo de 0 até cobrir `maximo` (3 a 6 marcas). */
export function marcasDoEixo(maximo, alvo = 4) {
  if (!(maximo > 0)) return [0, 1];
  const bruto = maximo / alvo;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? 10 * pot;
  const out = [];
  for (let v = 0; v < maximo + passo * 0.999; v += passo) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

export const NOMES_MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** "2026-10" → "out/26". */
export const rotuloMes = (mes) => `${NOMES_MES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;

export const ROTULO_ACAO = {
  operador_entrou: 'Entrou no painel', alerta_revisado: 'Revisou um alerta', loja_status_definido: 'Mudou o status de uma loja', fonte_status_definido: 'Mudou uma fonte',
  fonte_credencial_gravada: 'Gravou credencial de fonte', denuncia_resolvida: 'Resolveu uma denúncia', triagem_revisada: 'Revisou a triagem', triagem_liberada: 'Liberou item da triagem',
  oferta_manual_criada: 'Cadastrou oferta manual', oferta_manual_encerrada: 'Encerrou oferta manual', loja_criada: 'Cadastrou uma loja', loja_editada: 'Editou dados de loja',
  loja_areas_definidas: 'Mudou a área de entrega', receita_lancada: 'Lançou receita', receita_editada: 'Editou receita', receitas_importadas: 'Importou receitas',
};

const ROTULO_VALOR = {
  aprovada: 'aprovada', em_observacao: 'em observação', bloqueada: 'bloqueada', aprovado: 'aprovado', rejeitado: 'rejeitado', pendente: 'pendente', nao_exigida: 'sem revisão',
  restaurar: 'restaurar', manter_escondida: 'manter escondida', bloqueio_correto: 'bloqueio correto', falso_positivo: 'falso positivo', liberado: 'liberado', true: 'sim', false: 'não',
  ...Object.fromEntries(STATUS_RECEITA), ...Object.fromEntries(FONTES_RECEITA),
};
const ROTULO_CAMPO = {
  status: 'status', status_confianca: 'confiança', ativa: 'ativa', revisao: 'revisão', nome: 'nome', rede: 'rede', cnpj: 'CNPJ', reputacao: 'reputação',
  autorizacao_sanitaria: 'autorização sanitária', areas_entrega: 'área de entrega', valor_centavos: 'valor', competencia: 'data', fonte: 'fonte', descricao: 'descrição', referencia: 'referência',
};
const valorLegivel = (k, v) => {
  if (v === null || v === undefined || v === '') return '—';
  if (k === 'valor_centavos' || k === 'preco_centavos') return centavosParaReais(Number(v));
  if (Array.isArray(v)) return v.length === 0 ? 'nenhuma' : `${v.length} faixa(s)`;
  return ROTULO_VALOR[String(v)] ?? String(v);
};

/** Detalhe da auditoria em frases curtas: "status: em observação → aprovada", "observação: …". Nunca mostra id cru. */
export function descreverDetalhe(detalhe) {
  const out = [];
  for (const [k, v] of Object.entries(detalhe ?? {})) {
    if (v === null || v === undefined) continue;
    if (k === 'observacao') { out.push(`observação: "${v}"`); continue; }
    if (typeof v === 'object' && !Array.isArray(v) && 'de' in v && 'para' in v) out.push(`${ROTULO_CAMPO[k] ?? k}: ${valorLegivel(k, v.de)} → ${valorLegivel(k, v.para)}`);
    else if (k === 'campos' && Array.isArray(v)) out.push(`campos: ${v.join(', ')}`);
    else if (/_id$/.test(k) || typeof v === 'object') continue;
    else out.push(`${ROTULO_CAMPO[k] ?? k.replace(/_/g, ' ')}: ${valorLegivel(k, v)}`);
  }
  return out;
}

/** Saudação pela hora local. */
export const saudacao = (agora = new Date()) => (agora.getHours() < 12 ? 'Bom dia' : agora.getHours() < 18 ? 'Boa tarde' : 'Boa noite');
