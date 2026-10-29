// Painel financeiro. Receita só aparece lançada ou importada pelo operador (o sistema não estima receita); ao lado, o que o sistema
// mede de verdade: cliques nos links de afiliado e assinaturas ativas.
import { pedir, todas } from '/operador/api.js';
import { barrasHorizontais, colunasEmpilhadas, linhas } from '/operador/graficos.js';
import {
  centavosParaReais, errosDaApi, FONTES_RECEITA, lerCsvReceitas, montarPedidoReceita, reaisCompactos, rotuloFonteReceita, rotuloMes, rotuloStatusReceita, STATUS_RECEITA,
} from '/operador/logica.js';
import { anexar, abas, avisar, botao, caixa, campo, carregando, confirmar, dataCurta, dialogo, entrada, h, icone, limpar, marcarErros, numero, seletor, selo, trocar, vazio } from '/operador/ui.js';

// Cor por fonte, em ordem fixa (nunca por posição no gráfico): .serie-1 … .serie-6.
const CLASSE_FONTE = Object.fromEntries(FONTES_RECEITA.map(([f], i) => [f, `serie-${i + 1}`]));
const TIPO_STATUS = { prevista: 'alerta', confirmada: '', recebida: 'ok', cancelada: 'ruim' };
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const nomeMesLongo = (mes) => new Date(`${mes}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

function tile(rotulo, valor, { detalhe, variacao, destaque } = {}) {
  return h('div', { class: `cartao tile${destaque ? ' destaque' : ''}` }, h('div', { class: 'tile-rotulo' }, rotulo), h('div', { class: 'tile-valor' }, valor),
    variacao !== undefined && variacao !== null ? h('div', { class: `tile-variacao ${variacao >= 0 ? 'sobe' : 'desce'}` }, `${variacao >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(variacao * 100))}% sobre o mês anterior`) : null,
    detalhe ? h('div', { class: 'dica' }, detalhe) : null);
}

/** Diálogo de lançamento (novo ou edição). Resolve com a receita gravada. */
function dialogoReceita(atual) {
  return dialogo(atual ? 'Editar lançamento' : 'Lançar receita', (fechar) => {
    const fonte = seletor([['', 'Escolha…'], ...FONTES_RECEITA], { id: 'r_fonte' }, atual?.fonte ?? '');
    const status = seletor(STATUS_RECEITA, { id: 'r_status' }, atual?.status ?? 'confirmada');
    const data = entrada({ id: 'r_data', type: 'date', value: atual?.competencia ?? hojeLocal() });
    const valor = entrada({ id: 'r_valor', inputmode: 'decimal', placeholder: '158,90', value: atual ? (atual.valor_centavos / 100).toFixed(2).replace('.', ',') : '' });
    const descricao = entrada({ id: 'r_desc', maxlength: '300', value: atual?.descricao ?? '', placeholder: 'ex.: Comissões de outubro na Lomadee' });
    const referencia = entrada({ id: 'r_ref', maxlength: '120', value: atual?.referencia ?? '', placeholder: 'id da transação ou do relatório (opcional)' });
    const resp = h('div', { 'aria-live': 'polite' });
    const ok = h('button', { type: 'submit', class: 'principal' }, atual ? 'Salvar' : 'Lançar');
    const form = h('form', { novalidate: true },
      h('div', { class: 'grade' }, campo('Fonte', fonte, 'fonte'), campo('Situação', status, 'status', 'Prevista = pendente na rede; confirmada = a receber; recebida = já paga.'),
        campo('Data', data, 'competencia', 'Dia da venda ou do mês a que se refere.'), campo('Valor (R$)', valor, 'valor_centavos')),
      campo('Descrição', descricao, 'descricao'), campo('Referência', referencia, 'referencia', 'Com referência, o mesmo lançamento não entra duas vezes.'),
      resp, h('div', { class: 'acoes-dialogo' }, h('button', { type: 'button', onclick: () => fechar(undefined) }, 'Cancelar'), ok));
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault(); limpar(resp); marcarErros(form, {});
      const p = montarPedidoReceita({ fonte: fonte.value, status: status.value, competencia: data.value, valor: valor.value, descricao: descricao.value, referencia: referencia.value });
      if (p.erros) { marcarErros(form, p.erros); return; }
      ok.disabled = true;
      try {
        const r = atual ? await pedir('PATCH', `/v1/admin/receitas/${atual.id}`, p.corpo) : await pedir('POST', '/v1/admin/receitas', p.corpo);
        avisar(atual ? 'Lançamento atualizado.' : `Receita de ${centavosParaReais(r.valor_centavos)} lançada.`); fechar(r);
      } catch (e) { const { campos, geral } = errosDaApi(e.resposta); marcarErros(form, campos); resp.append(caixa('erro', geral)); }
      finally { ok.disabled = false; }
    });
    setTimeout(() => (atual ? valor : fonte).focus(), 0);
    return form;
  });
}

/** Importação de CSV: lê no navegador, mostra a prévia e os erros, e só manda quando estiver tudo certo. */
function dialogoImportar() {
  return dialogo('Importar receitas de um CSV', (fechar) => {
    const arquivo = h('input', { type: 'file', accept: '.csv,text/csv,text/plain', id: 'csv' });
    const fontePadrao = seletor(FONTES_RECEITA, { id: 'csv_fonte' }, 'afiliado_lomadee');
    const previa = h('div', { 'aria-live': 'polite' });
    const ok = h('button', { type: 'button', class: 'principal', disabled: true }, 'Importar');
    let lidos = { itens: [], erros: [] }, texto = '';
    const ler = () => {
      lidos = lerCsvReceitas(texto, fontePadrao.value);
      const soma = lidos.itens.reduce((s, i) => s + i.valor_centavos, 0);
      trocar(previa,
        lidos.erros.length ? caixa('erro', h('strong', {}, `${lidos.erros.length} linha(s) com problema — corrija o arquivo e escolha de novo:`), h('ul', {}, lidos.erros.slice(0, 8).map((e) => h('li', {}, `linha ${e.linha}: ${e.mensagem}`)))) : null,
        lidos.itens.length ? h('div', {}, h('p', {}, h('strong', {}, `${lidos.itens.length} lançamento(s)`), ` somando ${centavosParaReais(soma)}.`),
          h('div', { class: 'tabela-rolagem curta' }, h('table', { class: 'tabela' }, h('thead', {}, h('tr', {}, ['Data', 'Fonte', 'Situação', 'Valor', 'Referência'].map((t) => h('th', { scope: 'col' }, t)))),
            h('tbody', {}, lidos.itens.slice(0, 20).map((i) => h('tr', {}, h('td', {}, dataCurta(i.competencia)), h('td', {}, rotuloFonteReceita(i.fonte)), h('td', {}, rotuloStatusReceita(i.status)),
              h('td', { class: 'num' }, centavosParaReais(i.valor_centavos)), h('td', {}, i.referencia ?? '—'))))))) : null);
      ok.disabled = lidos.itens.length === 0 || lidos.erros.length > 0;
    };
    arquivo.addEventListener('change', async () => { const a = arquivo.files?.[0]; if (!a) return; if (a.size > 2_000_000) { trocar(previa, caixa('erro', 'Arquivo maior que 2 MB.')); return; } texto = await a.text(); ler(); });
    fontePadrao.addEventListener('change', () => { if (texto) ler(); });
    ok.addEventListener('click', async () => {
      ok.disabled = true;
      try {
        let criadas = 0, repetidas = 0;
        for (let i = 0; i < lidos.itens.length; i += 1000) {
          const r = await pedir('POST', '/v1/admin/receitas/importacao', { itens: lidos.itens.slice(i, i + 1000) });
          criadas += r.criadas; repetidas += r.repetidas;
        }
        avisar(`${criadas} lançamento(s) importado(s)${repetidas ? `, ${repetidas} já existiam` : ''}.`); fechar(true);
      } catch (e) {
        const { campos, geral } = errosDaApi(e.resposta);
        trocar(previa, caixa('erro', geral, h('ul', {}, Object.entries(campos).slice(0, 8).map(([k, v]) => h('li', {}, `${k.replace(/^itens\[(\d+)\]\./, (_, n) => `linha ${Number(n) + 2}: `)}${v}`)))));
        ok.disabled = false;
      }
    });
    return h('div', {},
      h('p', {}, 'Primeira linha com os nomes das colunas. Aceita ponto e vírgula ou vírgula.'),
      h('pre', { class: 'exemplo' }, 'data;fonte;valor;status;descricao;referencia\n31/10/2026;lomadee;158,90;aprovada;Comissões de outubro;LMD-2026-10'),
      h('ul', { class: 'dica lista-regras' }, h('li', {}, 'Obrigatórias: data e valor. Sem coluna de fonte, vale a escolhida abaixo; sem situação, "confirmada".'),
        h('li', {}, 'Situação aceita prevista/pendente, confirmada/aprovada, recebida/paga e cancelada.'), h('li', {}, 'Linha com a mesma fonte e referência de um lançamento existente é pulada.')),
      h('div', { class: 'grade' }, campo('Arquivo CSV', arquivo, 'csv'), campo('Fonte quando o arquivo não diz', fontePadrao, 'csv_fonte')),
      previa, h('div', { class: 'acoes-dialogo' }, h('button', { type: 'button', onclick: () => fechar(false) }, 'Cancelar'), ok));
  }, { largo: true });
}

export async function telaFinanceiro(raiz, ctx) {
  let meses = 12;
  const painel = h('div', { class: 'financeiro' });
  const lancamentos = h('div', {});
  ctx.acoesTopo.append(botao('Importar CSV', { class: 'discreto', onclick: async () => { if (await dialogoImportar()) await recarregar(); } }, 'importar'),
    botao('Lançar receita', { class: 'principal', onclick: async () => { if (await dialogoReceita()) await recarregar(); } }, 'mais'));

  async function desenharPainel() {
    painel.classList.add('recarregando');
    const r = await pedir('GET', `/v1/admin/financeiro?meses=${meses}`);
    painel.classList.remove('recarregando');
    const semReceita = r.totais.lancamentos === 0;
    const series = FONTES_RECEITA.map(([f, nome]) => ({ id: f, nome, classe: CLASSE_FONTE[f], valores: r.meses.map((m) => m.por_fonte[f]) }))
      .filter((x) => x.valores.some((v) => v > 0)); // fonte sem receita no período não ocupa legenda (a cor dela continua a mesma)
    const fontesNoPeriodo = FONTES_RECEITA.map(([f, nome]) => ({ nome, classe: CLASSE_FONTE[f], valor: r.totais.por_fonte[f] })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
    trocar(painel,
      h('div', { class: 'grade-tiles' },
        tile(`Receita em ${nomeMesLongo(r.mes_atual.mes)}`, centavosParaReais(r.mes_atual.total_centavos), { variacao: r.mes_atual.variacao, destaque: true, detalhe: 'sem as canceladas' }),
        tile('Recebido no mês', centavosParaReais(r.mes_atual.recebido_centavos)),
        tile('A receber no mês', centavosParaReais(r.mes_atual.a_receber_centavos), { detalhe: 'prevista + confirmada' }),
        tile(`Receita em ${meses} meses`, centavosParaReais(r.totais.total_centavos), { detalhe: `${numero(r.totais.lancamentos)} lançamento(s)` }),
        tile('Cliques em links de afiliado', numero(r.cliques.afiliado), { detalhe: `últimos 30 dias · ${numero(r.cliques.total)} cliques no total` }),
        tile('Receita por clique de afiliado', r.receita_afiliado_por_clique_centavos === null ? '—' : centavosParaReais(r.receita_afiliado_por_clique_centavos), { detalhe: r.receita_afiliado_por_clique_centavos === null ? 'precisa de receita de afiliado e cliques nos últimos 30 dias' : 'receita de afiliado ÷ cliques, 30 dias' }),
        tile('Assinaturas ativas', numero(r.assinaturas.ativas), { detalhe: `${numero(r.assinaturas.por_plano.premium_mensal ?? 0)} mensal · ${numero(r.assinaturas.por_plano.premium_anual ?? 0)} anual` })),
      semReceita
        ? h('div', { class: 'cartao' }, vazio('Nenhuma receita lançada no período', 'A comissão da Lomadee fica no painel da Lomadee e a assinatura nas lojas de apps: lance aqui (ou importe o relatório em CSV) para acompanhar mês a mês. O painel nunca estima receita.',
          botao('Lançar receita', { class: 'principal', onclick: async () => { if (await dialogoReceita()) await recarregar(); } }, 'mais'), botao('Importar CSV', { onclick: async () => { if (await dialogoImportar()) await recarregar(); } }, 'importar')))
        : h('div', { class: 'grade-graficos' },
          h('div', { class: 'cartao grafico-largo' }, colunasEmpilhadas({ titulo: 'Receita por mês e fonte', categorias: r.meses.map((m) => rotuloMes(m.mes)), rotulosLongos: r.meses.map((m) => nomeMesLongo(m.mes)), series, formatoEixo: reaisCompactos, formatoValor: centavosParaReais })),
          h('div', { class: 'cartao' }, barrasHorizontais({ titulo: `Participação por fonte (${meses} meses)`, itens: fontesNoPeriodo, formatoValor: centavosParaReais })),
          h('div', { class: 'cartao' }, h('div', { class: 'figura-titulo' }, 'Por situação'), h('ul', { class: 'lista-status' }, STATUS_RECEITA.map(([st, nome]) => h('li', {}, selo(nome, TIPO_STATUS[st]), h('strong', {}, centavosParaReais(r.totais.por_status[st]))))),
            h('p', { class: 'dica' }, 'Cancelada não soma na receita.'))),
      h('div', { class: 'cartao' }, r.cliques.total === 0
        ? h('div', {}, h('div', { class: 'figura-titulo' }, 'Cliques no botão da oferta, por dia'), vazio('Nenhum clique nos últimos 30 dias', 'Os cliques aparecem quando as pessoas tocam em "Ver oferta" no app.'))
        : linhas({ titulo: 'Cliques no botão da oferta, por dia (30 dias)', rotulos: r.cliques.dias.map((d) => d.dia.slice(8, 10) + '/' + d.dia.slice(5, 7)), rotulosLongos: r.cliques.dias.map((d) => dataCurta(d.dia)),
          series: [{ nome: 'Todos os cliques', classe: 'serie-neutra', valores: r.cliques.dias.map((d) => d.cliques) }, { nome: 'Em link de afiliado', classe: 'serie-1', valores: r.cliques.dias.map((d) => d.cliques_afiliado) }],
          formatoEixo: (v) => numero(v), formatoValor: (v) => numero(v) })));
  }

  // --- lançamentos
  let filtroStatus = 'todos', filtroFonte = '';
  async function desenharLancamentos() {
    trocar(lancamentos, carregando(3));
    const q = new URLSearchParams();
    if (filtroStatus !== 'todos') q.set('status', filtroStatus);
    if (filtroFonte) q.set('fonte', filtroFonte);
    const { itens, truncado } = await todas(`/v1/admin/receitas${q.size ? `?${q}` : ''}`, 300);
    if (itens.length === 0) { trocar(lancamentos, vazio('Nenhum lançamento com esse filtro')); return; }
    trocar(lancamentos, h('div', { class: 'cartao tabela-rolagem' }, h('table', { class: 'tabela' },
      h('thead', {}, h('tr', {}, ['Data', 'Fonte', 'Descrição', 'Situação', 'Valor', ''].map((t, i) => h('th', { scope: 'col', class: i === 4 ? 'num' : undefined }, t)))),
      h('tbody', {}, itens.map((i) => h('tr', { class: i.status === 'cancelada' ? 'apagada' : undefined },
        h('td', {}, dataCurta(i.competencia)), h('td', {}, h('span', { class: `chave ${CLASSE_FONTE[i.fonte]}`, 'aria-hidden': 'true' }), ' ', rotuloFonteReceita(i.fonte)),
        h('td', {}, i.descricao ?? '—', i.referencia ? h('div', { class: 'dica' }, `ref. ${i.referencia}`) : null, h('div', { class: 'dica' }, `por ${(i.atualizada_por ?? i.criada_por).nome}`)),
        h('td', {}, selo(rotuloStatusReceita(i.status), TIPO_STATUS[i.status])), h('td', { class: 'num' }, h('strong', {}, centavosParaReais(i.valor_centavos))),
        h('td', { class: 'num' }, h('div', { class: 'acoes-linha' },
          i.status === 'prevista' || i.status === 'confirmada' ? botao('Recebida', { class: 'discreto pequeno', title: 'Marcar como recebida', onclick: async () => { try { await pedir('PATCH', `/v1/admin/receitas/${i.id}`, { status: 'recebida' }); avisar('Marcada como recebida.'); await recarregar(); } catch (e) { avisar(e.message, 'erro'); } } }, 'ok') : null,
          botao('', { class: 'icone-botao', 'aria-label': `Editar lançamento de ${dataCurta(i.competencia)}`, title: 'Editar', onclick: async () => { if (await dialogoReceita(i)) await recarregar(); } }, 'editar'),
          i.status !== 'cancelada' ? botao('', { class: 'icone-botao', 'aria-label': `Cancelar lançamento de ${dataCurta(i.competencia)}`, title: 'Cancelar', onclick: async () => {
            if (!(await confirmar('Cancelar lançamento?', `${centavosParaReais(i.valor_centavos)} de ${rotuloFonteReceita(i.fonte)} deixa de contar na receita (fica no histórico).`, { sim: 'Cancelar lançamento', perigo: true }))) return;
            try { await pedir('PATCH', `/v1/admin/receitas/${i.id}`, { status: 'cancelada' }); avisar('Lançamento cancelado.'); await recarregar(); } catch (e) { avisar(e.message, 'erro'); }
          } }, 'lixo') : null))))))),
    truncado ? h('p', { class: 'dica' }, 'Mostrando os 300 mais recentes; use os filtros.') : null);
  }
  const recarregar = async () => { await Promise.all([desenharPainel(), desenharLancamentos()]); };

  anexar(raiz, 
    h('div', { class: 'barra-ferramentas' }, h('span', { class: 'dica' }, 'Período:'), abas([[3, '3 meses'], [6, '6 meses'], [12, '12 meses'], [24, '24 meses']], meses, (v) => { meses = v; desenharPainel().catch((e) => avisar(e.message, 'erro')); }, 'Período'),
      h('span', { class: 'dica nota-honesta' }, icone('info', 16), 'Receita entra só quando lançada ou importada.')),
    painel,
    h('h2', { class: 'secao-titulo' }, 'Lançamentos'),
    h('div', { class: 'barra-ferramentas' }, abas([['todos', 'Todos'], ...STATUS_RECEITA], filtroStatus, (v) => { filtroStatus = v; desenharLancamentos().catch((e) => avisar(e.message, 'erro')); }, 'Situação'),
      seletor([['', 'Todas as fontes'], ...FONTES_RECEITA], { 'aria-label': 'Fonte', class: 'seletor-compacto', onchange: (ev) => { filtroFonte = ev.target.value; desenharLancamentos().catch((e) => avisar(e.message, 'erro')); } })),
    lancamentos);
  await recarregar();
}

