// Filas de moderação: alertas aguardando aprovação, triagem (medicamento e NBCAL) e denúncias.
import { pedir, todas } from '/operador/api.js';
import { centavosParaReais, filtrarPorTexto, ROTULO_CODIGO, tempoRelativo } from '/operador/logica.js';
import { anexar, abas, avisar, botao, busca, carregando, confirmar, dataHora, foto, h, icone, porcento, selo, trocar, vazio } from '/operador/ui.js';

/**
 * Fila genérica: abas, busca local e lista de cartões. `carregar(aba)` → { itens, truncado }; `cartao(item, aba, sair)` monta o
 * cartão (`sair()` tira o cartão da lista com animação e atualiza os contadores).
 */
async function fila(raiz, ctx, { abas: listaAbas, abaInicial, carregar, texto, cartao, vazioTitulo, vazioTexto, explicacao, placeholder }) {
  let aba = abaInicial ?? listaAbas[0][0];
  let itens = [], termo = '';
  const lista = h('div', { class: 'lista-cartoes', 'aria-live': 'polite' });
  const rodape = h('div', { class: 'dica' });
  const desenhar = () => {
    const visiveis = filtrarPorTexto(itens, termo, texto);
    if (visiveis.length === 0) {
      trocar(lista, termo ? vazio('Nada encontrado', `Nenhum item com "${termo}".`) : vazio(vazioTitulo(aba), vazioTexto?.(aba)));
    } else {
      trocar(lista, visiveis.map((i) => {
        const c = cartao(i, aba, async () => {
          itens = itens.filter((x) => x !== i);
          c.classList.add('saindo');
          setTimeout(() => { c.remove(); if (lista.children.length === 0) desenhar(); }, 220);
          ctx.atualizarContadores();
        });
        return c;
      }));
    }
    rodape.textContent = visiveis.length > 0 ? `${visiveis.length} de ${itens.length} item(ns)` : '';
  };
  const recarregar = async () => {
    trocar(lista, carregando(3));
    const r = await carregar(aba);
    itens = r.itens;
    desenhar();
    if (r.truncado) rodape.textContent += ' · mostrando os 500 mais recentes';
  };
  anexar(raiz, 
    explicacao ? h('p', { class: 'intro' }, explicacao) : null,
    h('div', { class: 'barra-ferramentas' }, abas(listaAbas, aba, (id) => { aba = id; recarregar().catch((e) => avisar(e.message, 'erro')); }),
      busca(placeholder ?? 'Buscar produto, loja ou fonte', (v) => { termo = v; desenhar(); }),
      botao('Atualizar', { class: 'discreto', onclick: () => recarregar().catch((e) => avisar(e.message, 'erro')) }, 'atualizar')),
    lista, rodape);
  await recarregar();
}

const observacao = () => h('input', { type: 'text', class: 'observacao', 'aria-label': 'Observação (opcional; vai para a auditoria)', placeholder: 'Observação (opcional)', maxlength: '1000' });
/** Botão que fica ocupado enquanto a ação roda e mostra o erro sem perder o cartão. */
const acao = (texto, classe, nomeIcone, fazer) => {
  const b = botao(texto, { class: classe, onclick: async () => {
    b.disabled = true;
    try { await fazer(); } catch (e) { avisar(e.message, 'erro'); } finally { b.disabled = false; }
  } }, nomeIcone);
  return b;
};
const linkLoja = (href, texto = 'Abrir na loja') => h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: 'link-externo' }, icone('link', 16), texto);
const STATUS_LOJA = { aprovada: ['Loja aprovada', 'ok'], em_observacao: ['Loja em observação', 'alerta'], bloqueada: ['Loja bloqueada', 'ruim'] };
const SITUACAO = { ativa: ['Oferta ativa', 'ok'], encerrada: ['Oferta encerrada', 'ruim'], escondida_por_denuncia: ['Escondida por denúncia', 'ruim'] };

// ------------------------------------------------------------------------------------------------ alertas
export async function telaAlertas(raiz, ctx) {
  await fila(raiz, ctx, {
    abas: [['pendente', 'Aguardando', ctx.resumo?.pendencias.alertas], ['aprovado', 'Aprovados'], ['rejeitado', 'Rejeitados']],
    explicacao: 'Alerta de fonte pouco confiável só aparece no app depois de aprovado. Confira o preço na página da loja antes de decidir.',
    carregar: (aba) => todas(`/v1/admin/alertas?revisao=${aba}`),
    texto: (a) => `${a.produto.nome} ${a.produto.marca?.nome ?? ''} ${a.loja.nome} ${a.fonte.nome}`,
    vazioTitulo: (aba) => (aba === 'pendente' ? 'Nenhum alerta aguardando' : aba === 'aprovado' ? 'Nenhum alerta aprovado' : 'Nenhum alerta rejeitado'),
    vazioTexto: (aba) => (aba === 'pendente' ? 'Tudo em dia por aqui.' : null),
    cartao: (a, aba, sair) => {
      const obs = observacao();
      const decidir = async (resultado) => {
        if (resultado === 'rejeitado') {
          const ok = await confirmar(aba === 'aprovado' ? 'Tirar alerta do feed?' : 'Rejeitar alerta?', `"${a.produto.nome}" em ${a.loja.nome} ${aba === 'aprovado' ? 'sai do feed. Push já enviado não volta.' : 'não vai aparecer no app.'}`, { sim: aba === 'aprovado' ? 'Tirar do feed' : 'Rejeitar', perigo: true });
          if (!ok) return;
        }
        await pedir('PUT', `/v1/admin/alertas/${a.id}/revisao`, { resultado, observacao: obs.value.trim() || null });
        avisar(resultado === 'aprovado' ? 'Alerta aprovado: já está no feed.' : 'Alerta rejeitado.');
        sair();
      };
      const [rotSit, tipoSit] = SITUACAO[a.situacao_oferta] ?? [a.situacao_oferta, ''];
      const [rotLoja, tipoLoja] = STATUS_LOJA[a.loja.status] ?? [a.loja.status, ''];
      return h('article', { class: 'cartao item' },
        foto(a.produto.imagem_url, ''),
        h('div', { class: 'item-corpo' },
          h('h3', {}, a.produto.nome),
          h('div', { class: 'meta' }, h('span', {}, a.loja.nome), h('span', {}, `fonte ${a.fonte.nome} (${a.fonte.confiabilidade})`), h('span', { title: dataHora(a.coletada_em) }, `coletado ${tempoRelativo(a.coletada_em)}`)),
          h('div', { class: 'linha precos' }, h('span', { class: 'preco' }, centavosParaReais(a.preco_centavos)),
            a.queda > 0 ? h('span', { class: 'antes' }, centavosParaReais(a.preco_referencia_centavos)) : null,
            a.queda > 0 ? selo(`-${porcento(a.queda)}`, 'destaque') : selo('sem histórico verificado')),
          h('div', { class: 'linha selos' }, selo(rotSit, tipoSit), selo(rotLoja, tipoLoja), a.rotulo_condicao ? selo(a.rotulo_condicao) : null, a.entrega_a_confirmar ? selo('entrega a confirmar', 'alerta') : null,
            a.valida_ate ? selo(`vale até ${dataHora(a.valida_ate)}`) : null),
          a.revisao_por ? h('p', { class: 'dica' }, `${aba === 'aprovado' ? 'Aprovado' : 'Rejeitado'} por ${a.revisao_por.operador.nome} ${tempoRelativo(a.revisao_por.em)}${a.revisao_por.observacao ? `: "${a.revisao_por.observacao}"` : ''}`) : null,
          h('div', { class: 'linha' }, linkLoja(a.link, 'Conferir preço na loja'))),
        aba === 'rejeitado' ? null : h('div', { class: 'item-acoes' }, obs,
          aba === 'pendente' ? acao('Aprovar', 'principal', 'ok', () => decidir('aprovado')) : null,
          acao(aba === 'aprovado' ? 'Tirar do feed' : 'Rejeitar', 'perigo', 'x', () => decidir('rejeitado'))));
    },
  });
}

// ------------------------------------------------------------------------------------------------ triagem
export async function telaTriagem(raiz, ctx) {
  await fila(raiz, ctx, {
    abas: [['pendentes', 'Para revisar', ctx.resumo?.pendencias.triagem], ['revisados', 'Revisados']],
    explicacao: 'O que a triagem de medicamento e da NBCAL não deixou entrar. "Liberar" só existe para falso positivo de texto e cautela; item vedado e medicamento da lista nunca se liberam.',
    placeholder: 'Buscar título, motivo ou fonte',
    carregar: async (aba) => {
      const r = await todas(`/v1/admin/triagem?revisado=${aba === 'revisados'}`);
      return { ...r, itens: aba === 'pendentes' ? r.itens.filter((b) => b.resultado === null) : r.itens };
    },
    texto: (b) => `${b.titulo} ${ROTULO_CODIGO[b.codigo] ?? b.codigo} ${b.fonte.nome} ${b.detalhe}`,
    vazioTitulo: (aba) => (aba === 'pendentes' ? 'Nada para revisar' : 'Nenhuma revisão ainda'),
    cartao: (b, aba, sair) => {
      const obs = observacao();
      const rev = async (resultado) => {
        if (resultado === 'liberado' && !(await confirmar('Liberar este item?', `"${b.titulo}" passa a entrar a partir da próxima coleta. Use só para falso positivo.`, { sim: 'Liberar' }))) return;
        await pedir('PUT', `/v1/admin/triagem/${b.id}/revisao`, { resultado, observacao: obs.value.trim() || null });
        avisar(resultado === 'liberado' ? 'Liberado: entra na próxima coleta.' : 'Revisão gravada.');
        sair();
      };
      const ROT = { bloqueio_correto: ['Bloqueio correto', 'ok'], falso_positivo: ['Falso positivo', 'alerta'], liberado: ['Liberado', 'ok'] };
      return h('article', { class: 'cartao item sem-foto-item' },
        h('div', { class: 'item-corpo' },
          h('h3', {}, b.titulo),
          h('div', { class: 'meta' }, h('span', {}, `fonte ${b.fonte.nome}`), h('span', {}, `visto pela 1ª vez ${tempoRelativo(b.primeira_vez_em)}`), h('span', {}, `última ${tempoRelativo(b.ultima_vez_em)}`)),
          h('div', { class: 'linha selos' }, selo(ROTULO_CODIGO[b.codigo] ?? b.codigo, 'ruim'), b.revisao_humana ? selo('pede revisão humana', 'alerta') : null, b.liberavel ? selo('pode ser liberado') : selo('não liberável'),
            b.resultado ? selo(...(ROT[b.resultado] ?? [b.resultado])) : null),
          h('p', { class: 'detalhe' }, b.detalhe),
          b.revisao_por ? h('p', { class: 'dica' }, `Revisado por ${b.revisao_por.operador.nome} ${tempoRelativo(b.revisao_por.em)}${b.revisao_por.observacao ? `: "${b.revisao_por.observacao}"` : ''}`) : null),
        aba === 'revisados' ? null : h('div', { class: 'item-acoes' }, obs,
          acao('Bloqueio correto', '', 'ok', () => rev('bloqueio_correto')),
          acao('Falso positivo', '', 'aviso', () => rev('falso_positivo')),
          b.liberavel ? acao('Liberar este item', 'principal', 'ok', () => rev('liberado')) : null));
    },
  });
}

// ------------------------------------------------------------------------------------------------ denúncias
export async function telaDenuncias(raiz, ctx) {
  await fila(raiz, ctx, {
    abas: [['escondida', 'Escondidas', ctx.resumo?.pendencias.denuncias], ['restaurada', 'Restauradas'], ['mantida_escondida', 'Mantidas escondidas']],
    explicacao: 'Oferta que muita gente denunciou some do app até você decidir se ela volta.',
    carregar: (aba) => todas(`/v1/admin/denuncias?situacao=${aba}`),
    texto: (c) => `${c.oferta.produto.nome} ${c.oferta.loja.nome}`,
    vazioTitulo: (aba) => (aba === 'escondida' ? 'Nenhuma oferta escondida aguardando decisão' : 'Nada por aqui'),
    cartao: (c, aba, sair) => {
      const obs = observacao();
      const dec = async (resultado) => {
        await pedir('PUT', `/v1/admin/denuncias/${c.id}/resolucao`, { resultado, observacao: obs.value.trim() || null });
        avisar(resultado === 'restaurar' ? 'Oferta restaurada: voltou ao app.' : 'Mantida escondida.');
        sair();
      };
      const proporcao = c.pessoas_base > 0 ? c.denuncias / c.pessoas_base : 0;
      const medidor = h('span', { class: 'medidor-preenchido' });
      medidor.style.width = `${Math.min(100, proporcao * 100)}%`;
      return h('article', { class: 'cartao item' },
        foto(c.oferta.produto.imagem_url, ''),
        h('div', { class: 'item-corpo' },
          h('h3', {}, c.oferta.produto.nome),
          h('div', { class: 'meta' }, h('span', {}, c.oferta.loja.nome), h('span', { class: 'preco-pequeno' }, centavosParaReais(c.oferta.preco_centavos)), h('span', {}, `escondida ${tempoRelativo(c.aberto_em)}`)),
          h('div', { class: 'denuncia-numeros' },
            h('div', {}, h('strong', {}, String(c.denuncias)), h('span', {}, 'denúncias')),
            h('div', {}, h('strong', {}, String(c.motivos.preco_errado)), h('span', {}, 'preço errado')),
            h('div', {}, h('strong', {}, String(c.motivos.sem_estoque)), h('span', {}, 'sem estoque')),
            h('div', {}, h('strong', {}, String(c.limite)), h('span', {}, 'limite'))),
          h('div', { class: 'medidor', role: 'img', 'aria-label': `${c.denuncias} de ${c.pessoas_base} pessoas ativas em 7 dias denunciaram` }, medidor),
          h('p', { class: 'dica' }, `${c.denuncias} de ${c.pessoas_base} pessoa(s) que viram a oferta em 7 dias denunciaram.`),
          c.resolucao_por ? h('p', { class: 'dica' }, `Decidido por ${c.resolucao_por.operador.nome} ${tempoRelativo(c.resolucao_por.em)}${c.resolucao_por.observacao ? `: "${c.resolucao_por.observacao}"` : ''}`) : null,
          h('div', { class: 'linha' }, linkLoja(c.oferta.link, 'Conferir na loja'))),
        aba !== 'escondida' ? null : h('div', { class: 'item-acoes' }, obs,
          acao('Restaurar a oferta', 'principal', 'ok', () => dec('restaurar')),
          acao('Manter escondida', 'perigo', 'x', () => dec('manter_escondida'))));
    },
  });
}

