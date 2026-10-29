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
    corpo.produto_novo = {
      nome: String(n.nome ?? '').trim(), marca: String(n.marca ?? '').trim() || null, categoria: n.categoria ?? '', subcategoria: n.subcategoria || null,
      gtin: n.gtin || null, embalagem: { quantidade, unidade: n.unidade || 'un' },
    };
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
