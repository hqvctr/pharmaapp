// Visão geral (tela inicial), fontes de preço, operadores (só leitura, D2) e auditoria.
import { pedir } from '/operador/api.js';
import { descreverDetalhe, ROTULO_ACAO, tempoRelativo } from '/operador/logica.js';
import { anexar, abas, avisar, botao, caixa, campo, carregando, confirmar, dataHora, entrada, h, icone, numero, seletor, selo, trocar, vazio } from '/operador/ui.js';

const STATUS = [['aprovada', 'Aprovada'], ['em_observacao', 'Em observação'], ['bloqueada', 'Bloqueada']];

// ------------------------------------------------------------------------------------------------ visão geral
export async function telaInicio(raiz, ctx) {
  const r = ctx.resumo ?? (await ctx.atualizarContadores());
  if (!r) throw new Error('Não foi possível carregar o resumo.');
  const pend = r.pendencias;
  const totalPend = pend.alertas + pend.triagem + pend.denuncias;
  const cartaoPend = (n, titulo, texto, rota, ic) => h('a', { href: `#/${rota}`, class: `cartao pendencia${n > 0 ? ' tem' : ''}` },
    h('span', { class: 'pendencia-icone' }, icone(ic, 22)), h('span', { class: 'pendencia-num' }, numero(n)), h('span', { class: 'pendencia-titulo' }, titulo), h('span', { class: 'dica' }, n > 0 ? texto : 'Nada pendente'));

  // Saúde da coleta
  const horas = r.coleta.ultima_coleta_em ? (Date.now() - new Date(r.coleta.ultima_coleta_em).getTime()) / 3_600_000 : null;
  const coletaOk = horas !== null && horas < 6 && !(r.coleta.ultimo_ciclo?.falhou);
  const progresso = Math.min(1, r.coleta.dias_historico / r.coleta.dias_para_alertas);
  const barra = h('span', { class: 'medidor-preenchido' }); barra.style.width = `${progresso * 100}%`;

  const atividade = h('ul', { class: 'atividade' }, h('li', {}, carregando(2)));
  anexar(raiz, 
    h('p', { class: 'intro' }, totalPend > 0 ? `Você tem ${totalPend} item(ns) esperando decisão.` : 'Nenhuma pendência de moderação. Tudo em dia.'),
    h('div', { class: 'grade-pendencias' },
      cartaoPend(pend.alertas, 'Alertas para aprovar', 'Confira o preço e aprove ou rejeite', 'alertas', 'alerta'),
      cartaoPend(pend.triagem, 'Itens na triagem', 'Medicamento e NBCAL barrados', 'triagem', 'triagem'),
      cartaoPend(pend.denuncias, 'Ofertas denunciadas', 'Restaure ou mantenha escondida', 'denuncias', 'denuncia')),
    h('div', { class: 'grade-inicio' },
      h('section', { class: 'cartao' }, h('h2', {}, icone('relogio', 18), 'Coleta de preços'),
        h('div', { class: 'linha selos' }, horas === null ? selo('nenhuma coleta ainda', 'alerta') : coletaOk ? selo('funcionando', 'ok') : selo('atenção', 'ruim')),
        h('dl', { class: 'dados' },
          h('dt', {}, 'Última coleta'), h('dd', {}, r.coleta.ultima_coleta_em ? `${tempoRelativo(r.coleta.ultima_coleta_em)} (${dataHora(r.coleta.ultima_coleta_em)})` : '—'),
          h('dt', {}, 'Último ciclo'), h('dd', {}, r.coleta.ultimo_ciclo ? `${r.coleta.ultimo_ciclo.falhou ? 'com problema' : 'ok'}, ${tempoRelativo(r.coleta.ultimo_ciclo.fim)}${r.coleta.ultimo_ciclo.erro ? ` — ${r.coleta.ultimo_ciclo.erro}` : ''}` : 'sem informação neste servidor'),
          h('dt', {}, 'Histórico'), h('dd', {}, `${r.coleta.dias_historico} de ${r.coleta.dias_para_alertas} dias`, h('div', { class: 'medidor', role: 'img', 'aria-label': `${r.coleta.dias_historico} de ${r.coleta.dias_para_alertas} dias de histórico` }, barra))),
        horas !== null && horas >= 6 ? caixa('aviso', 'A última coleta tem mais de 6 horas. Confira se o computador do coletor está ligado e o Docker aberto.') : null,
        r.coleta.dias_historico < r.coleta.dias_para_alertas ? h('p', { class: 'dica' }, `Os alertas de queda começam depois de ${r.coleta.dias_para_alertas} dias de histórico.`) : null),
      h('section', { class: 'cartao' }, h('h2', {}, icone('produto', 18), 'Catálogo'),
        h('div', { class: 'mini-tiles' },
          h('div', {}, h('strong', {}, numero(r.catalogo.produtos)), h('span', {}, 'produtos')),
          h('div', {}, h('strong', {}, numero(r.catalogo.ofertas_disponiveis)), h('span', {}, 'ofertas disponíveis')),
          h('a', { href: '#/ofertas' }, h('strong', {}, numero(r.ofertas_manuais_ativas)), h('span', {}, 'ofertas manuais ativas')),
          h('div', {}, h('strong', {}, `${r.fontes.ativas}/${r.fontes.total}`), h('span', {}, 'fontes ativas'))),
        h('div', { class: 'linha selos' }, selo(`${r.lojas.aprovada} loja(s) aprovada(s)`, 'ok'), selo(`${r.lojas.em_observacao} em observação`, 'alerta'), r.lojas.bloqueada ? selo(`${r.lojas.bloqueada} bloqueada(s)`, 'ruim') : null),
        r.lojas.sem_area_entrega ? caixa('aviso', `${r.lojas.sem_area_entrega} loja(s) sem área de entrega não aparecem no feed. `, h('a', { href: '#/lojas' }, 'Ver lojas')) : null),
      h('section', { class: 'cartao' }, h('h2', {}, icone('alerta', 18), 'Alertas nos últimos 7 dias'),
        h('div', { class: 'mini-tiles' },
          h('div', {}, h('strong', {}, numero(r.alertas_7_dias.criados)), h('span', {}, 'criados pelo motor')),
          h('div', {}, h('strong', {}, numero(r.alertas_7_dias.notificados)), h('span', {}, 'com notificação')),
          h('div', {}, h('strong', {}, numero(r.alertas_7_dias.aprovados)), h('span', {}, 'aprovados por vocês')),
          h('div', {}, h('strong', {}, numero(r.alertas_7_dias.rejeitados)), h('span', {}, 'rejeitados')))),
      h('section', { class: 'cartao' }, h('h2', {}, icone('mais', 18), 'Atalhos'),
        h('div', { class: 'atalhos-rapidos' },
          h('a', { href: '#/ofertas?nova=1', class: 'atalho' }, icone('oferta'), 'Nova oferta manual'),
          h('a', { href: '#/lojas', class: 'atalho' }, icone('loja'), 'Cadastrar ou editar loja'),
          h('a', { href: '#/financeiro', class: 'atalho' }, icone('financeiro'), 'Lançar receita'),
          h('a', { href: '#/produtos', class: 'atalho' }, icone('buscar'), 'Buscar produto'))),
      h('section', { class: 'cartao grade-larga' }, h('h2', {}, icone('auditoria', 18), 'Atividade recente'), atividade, h('a', { href: '#/auditoria', class: 'link-mais' }, 'Ver toda a auditoria', icone('seta', 16)))));
  try {
    const a = await pedir('GET', '/v1/admin/auditoria?limite=8');
    trocar(atividade, a.itens.length === 0 ? h('li', { class: 'dica' }, 'Nada registrado ainda.') : a.itens.map((x) => h('li', {},
      h('span', { class: 'avatar pequeno', 'aria-hidden': 'true' }, x.operador.nome.charAt(0).toUpperCase()),
      h('span', {}, h('strong', {}, x.operador.nome), ' ', (ROTULO_ACAO[x.acao] ?? x.acao).toLowerCase(), descreverDetalhe(x.detalhe)[0] ? h('span', { class: 'dica' }, ` · ${descreverDetalhe(x.detalhe)[0]}`) : null),
      h('time', { class: 'dica', datetime: x.em, title: dataHora(x.em) }, tempoRelativo(x.em)))));
  } catch (e) { trocar(atividade, h('li', { class: 'dica' }, e.message)); }
}

// ------------------------------------------------------------------------------------------------ fontes
export async function telaFontes(raiz) {
  anexar(raiz, h('p', { class: 'intro' }, 'De onde vêm os preços. A fonte "manual" é a das ofertas cadastradas aqui e fica inativa de propósito (o coletor não a recolhe). A chave da Lomadee não se digita no painel: ela fica no servidor.'));
  const r = await pedir('GET', '/v1/admin/fontes');
  if (r.itens.length === 0) { anexar(raiz, vazio('Nenhuma fonte cadastrada')); return; }
  anexar(raiz, h('div', { class: 'grade-fontes' }, r.itens.map((f) => {
    let status = f.status_confianca;
    const ativa = h('input', { type: 'checkbox', role: 'switch', checked: f.ativa, 'aria-label': `${f.nome} ativa` });
    const obs = entrada({ maxlength: '1000', placeholder: 'Motivo (opcional)', 'aria-label': `Motivo da mudança em ${f.nome}` });
    const salvar = botao('Salvar', { class: 'principal', onclick: async () => {
      if (status === f.status_confianca && ativa.checked === f.ativa) return avisar('Sem mudança.');
      if (!(await confirmar(`Salvar "${f.nome}"?`, `${STATUS.find(([v]) => v === status)[1]}, ${ativa.checked ? 'ativa (o coletor recolhe)' : 'inativa (o coletor não recolhe)'}.`, { sim: 'Salvar' }))) return;
      salvar.disabled = true;
      try { const n = await pedir('PUT', `/v1/admin/fontes/${f.id}/status`, { status_confianca: status, ativa: ativa.checked, observacao: obs.value.trim() || null }); Object.assign(f, n); avisar('Fonte gravada.'); }
      catch (e) { avisar(e.message, 'erro'); } finally { salvar.disabled = false; }
    } }, 'ok');
    return h('article', { class: 'cartao fonte' },
      h('header', { class: 'linha entre' }, h('h3', {}, f.nome), h('label', { class: 'interruptor' }, ativa, h('span', { 'aria-hidden': 'true' }), 'Ativa')),
      h('dl', { class: 'dados' }, h('dt', {}, 'Tipo'), h('dd', {}, f.tipo), h('dt', {}, 'Confiabilidade'), h('dd', {}, f.confiabilidade), h('dt', {}, 'Região'), h('dd', {}, f.regiao),
        h('dt', {}, 'Coleta a cada'), h('dd', {}, f.frequencia_minutos >= 60 ? `${Math.round(f.frequencia_minutos / 60)} h` : `${f.frequencia_minutos} min`),
        h('dt', {}, 'Credencial'), h('dd', {}, f.credencial.definida ? `gravada ${tempoRelativo(f.credencial.atualizada_em)}${f.credencial.atualizada_por ? ` por ${f.credencial.atualizada_por.nome}` : ''}` : 'não gravada')),
      h('div', { class: 'campo' }, h('span', { class: 'rotulo' }, 'Confiança'), abas(STATUS, status, (v) => { status = v; }, `Confiança de ${f.nome}`)),
      h('div', { class: 'linha' }, obs, salvar));
  })));
}

// ------------------------------------------------------------------------------------------------ operadores
export async function telaOperadores(raiz) {
  const r = await pedir('GET', '/v1/admin/operadores');
  anexar(raiz, h('p', { class: 'intro' }, 'Todos os operadores têm as mesmas permissões, e tudo o que mudam fica na auditoria com o nome de quem fez.'),
    caixa('info', h('strong', {}, 'Para incluir ou desativar alguém: '), 'no computador do servidor, rode ', h('code', {}, 'scripts\\windows\\operador.bat'),
      ' (ou ', h('code', {}, 'node dist/api/operador.js --tenant padrao --email … --nome …'), '). Pela tela não se cadastra operador (decisão D2). Desativado perde a sessão na hora seguinte.'),
    h('div', { class: 'cartao tabela-rolagem' }, h('table', { class: 'tabela' },
      h('thead', {}, h('tr', {}, ['Operador', 'E-mail', 'Situação', 'Último acesso', 'Desde'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', {}, r.itens.map((o) => h('tr', { class: o.ativo ? undefined : 'apagada' },
        h('td', {}, h('span', { class: 'avatar pequeno', 'aria-hidden': 'true' }, o.nome.charAt(0).toUpperCase()), ' ', h('strong', {}, o.nome), o.voce ? selo('você') : null),
        h('td', {}, o.email), h('td', {}, o.ativo ? selo('ativo', 'ok') : selo('desativado', 'ruim')),
        h('td', { title: dataHora(o.ultimo_acesso_em) }, o.ultimo_acesso_em ? tempoRelativo(o.ultimo_acesso_em) : 'nunca entrou'), h('td', {}, dataHora(o.criado_em))))))));
}

// ------------------------------------------------------------------------------------------------ auditoria
const ALVO = { operador: 'operador', alerta: 'alerta', loja: 'loja', fonte: 'fonte', caso_denuncia: 'denúncia', triagem: 'triagem', oferta: 'oferta', receita: 'receita' };
export async function telaAuditoria(raiz) {
  const ops = (await pedir('GET', '/v1/admin/operadores')).itens;
  const fOp = seletor([['', 'Todos os operadores'], ...ops.map((o) => [o.id, o.nome])], { id: 'f_op' });
  const fAcao = seletor([['', 'Todas as ações'], ...Object.entries(ROTULO_ACAO)], { id: 'f_acao' });
  const fDe = entrada({ type: 'date', id: 'f_de' }), fAte = entrada({ type: 'date', id: 'f_ate' });
  const lista = h('ol', { class: 'linha-tempo' });
  const mais = botao('Carregar mais', { class: 'discreto' }, 'mais');
  let cursor = null;
  const consulta = () => {
    const q = new URLSearchParams({ limite: '50' });
    if (fOp.value) q.set('operador_id', fOp.value);
    if (fAcao.value) q.set('acao', fAcao.value);
    if (fDe.value) q.set('desde', new Date(`${fDe.value}T00:00:00`).toISOString());
    if (fAte.value) q.set('ate', new Date(`${fAte.value}T23:59:59.999`).toISOString());
    if (cursor) q.set('cursor', cursor);
    return `/v1/admin/auditoria?${q}`;
  };
  const carregar = async (doZero) => {
    if (doZero) { cursor = null; trocar(lista, h('li', {}, carregando(3))); }
    mais.disabled = true;
    const r = await pedir('GET', consulta());
    if (doZero) trocar(lista);
    if (doZero && r.itens.length === 0) lista.append(h('li', {}, vazio('Nada registrado com esse filtro')));
    for (const a of r.itens) {
      const detalhes = descreverDetalhe(a.detalhe);
      lista.append(h('li', { class: 'evento' },
        h('span', { class: 'avatar pequeno', 'aria-hidden': 'true' }, a.operador.nome.charAt(0).toUpperCase()),
        h('div', { class: 'evento-corpo' },
          h('div', {}, h('strong', {}, a.operador.nome), ' · ', ROTULO_ACAO[a.acao] ?? a.acao, ' ', selo(`${ALVO[a.alvo_tipo] ?? a.alvo_tipo} ${a.alvo_id.slice(0, 8)}`)),
          detalhes.length ? h('ul', { class: 'evento-detalhes' }, detalhes.map((d) => h('li', {}, d))) : null),
        h('time', { class: 'dica', datetime: a.em, title: dataHora(a.em) }, dataHora(a.em))));
    }
    cursor = r.proximo_cursor; mais.hidden = !cursor; mais.disabled = false;
  };
  mais.addEventListener('click', () => carregar(false).catch((e) => avisar(e.message, 'erro')));
  for (const f of [fOp, fAcao, fDe, fAte]) f.addEventListener('change', () => carregar(true).catch((e) => avisar(e.message, 'erro')));
  anexar(raiz, h('p', { class: 'intro' }, 'Tudo que mudou algo, com quem fez e quando. Valor de credencial nunca é registrado.'),
    h('div', { class: 'cartao filtros' }, campo('Operador', fOp, 'f_op'), campo('Ação', fAcao, 'f_acao'), campo('De', fDe, 'f_de'), campo('Até', fAte, 'f_ate')),
    h('div', { class: 'cartao' }, lista, mais));
  await carregar(true);
}
