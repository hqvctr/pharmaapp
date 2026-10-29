// Catálogo: ofertas manuais (cadastro com prévia e lista), produtos (busca no que o app monitora) e lojas (status, dados e área de entrega).
import { pedir, todas } from '/operador/api.js';
import {
  centavosParaReais, errosDaApi, FAIXAS_PRONTAS, filtrarPorTexto, formatarCep, montarAreas, montarPedidoLoja, montarPedidoOfertaManual, reaisParaCentavos, tempoRelativo,
} from '/operador/logica.js';
import {
  abas, anexar, avisar, botao, busca, caixa, campo, carregando, confirmar, dataHora, dialogo, entrada, foto, h, icone, limpar, marcarErros, seletor, selo, trocar, vazio,
} from '/operador/ui.js';

const STATUS = [['aprovada', 'Aprovada'], ['em_observacao', 'Em observação'], ['bloqueada', 'Bloqueada']];
const TIPO_STATUS = { aprovada: 'ok', em_observacao: 'alerta', bloqueada: 'ruim' };
const rotuloStatus = (st) => STATUS.find(([v]) => v === st)?.[1] ?? st;
const rotuloCategoria = (cfg, cat, sub) => {
  const c = cfg.categorias?.find((x) => x.slug === cat);
  const sc = c?.subcategorias?.find((x) => x.slug === sub);
  return [c?.rotulo ?? cat, sc?.rotulo].filter(Boolean).join(' › ');
};
const embalagem = (p) => `${String(p.embalagem.quantidade).replace('.', ',')} ${p.embalagem.unidade}`;

/** Produto escolhido na tela Produtos, para abrir o cadastro de oferta já com ele. */
let produtoParaOferta = null;

// ------------------------------------------------------------------------------------------------ ofertas manuais
export async function telaOfertas(raiz, ctx) {
  const novo = ctx.params.get('nova') === '1';
  ctx.acoesTopo.append(novo ? botao('Ver ofertas', { onclick: () => ctx.navegar('ofertas') }, 'oferta') : botao('Nova oferta', { class: 'principal', onclick: () => ctx.navegar('ofertas?nova=1') }, 'mais'));
  if (novo) return formularioOferta(raiz, ctx);

  let aba = 'ativas', itens = [], termo = '';
  const lista = h('div', { class: 'lista-cartoes' });
  const desenhar = () => {
    const vis = filtrarPorTexto(itens, termo, (o) => `${o.produto.nome} ${o.loja.nome} ${o.criada_por.nome}`);
    if (vis.length === 0) {
      trocar(lista, termo ? vazio('Nada encontrado') : vazio(aba === 'ativas' ? 'Nenhuma oferta manual ativa' : 'Nenhuma oferta encerrada', 'A oferta manual entra no feed como "sem histórico verificado" e nunca gera notificação.',
        botao('Cadastrar oferta', { class: 'principal', onclick: () => ctx.navegar('ofertas?nova=1') }, 'mais')));
      return;
    }
    trocar(lista, vis.map((o) => {
      const ativa = o.disponivel && (!o.valida_ate || new Date(o.valida_ate) > new Date());
      const c = h('article', { class: 'cartao item' }, foto(o.produto.imagem_url),
        h('div', { class: 'item-corpo' },
          h('h3', {}, o.produto.nome),
          h('div', { class: 'meta' }, h('span', {}, o.loja.nome), h('span', {}, `por ${o.criada_por.nome} ${tempoRelativo(o.criada_em)}`)),
          h('div', { class: 'linha precos' }, h('span', { class: 'preco' }, centavosParaReais(o.preco_centavos)), o.rotulo_condicao ? selo(o.rotulo_condicao) : null,
            selo(o.frete.status === 'conhecido' ? (o.frete.centavos === 0 ? 'frete grátis' : `frete ${centavosParaReais(o.frete.centavos)}`) : o.frete.status === 'nao_se_aplica' ? 'sem frete' : 'frete a confirmar')),
          h('div', { class: 'linha selos' }, ativa ? selo(`vale até ${dataHora(o.valida_ate)}`, 'ok') : selo(o.disponivel ? 'vencida' : 'encerrada', 'ruim'), o.validade_padrao_aplicada ? selo('prazo padrão') : null,
            o.link_afiliado ? selo('link de afiliado') : null),
          h('a', { href: o.link, target: '_blank', rel: 'noopener noreferrer', class: 'link-externo' }, icone('link', 16), 'Abrir o link da oferta')),
        ativa ? h('div', { class: 'item-acoes' }, botao('Encerrar', { class: 'perigo', onclick: async (ev) => {
          const b = ev.currentTarget; // depois do await o evento já não tem currentTarget
          if (!(await confirmar('Encerrar oferta?', `"${o.produto.nome}" em ${o.loja.nome} sai do feed agora.`, { sim: 'Encerrar', perigo: true }))) return;
          b.disabled = true;
          try { await pedir('DELETE', `/v1/admin/ofertas-manuais/${o.id}`); avisar('Oferta encerrada.'); itens = itens.filter((x) => x !== o); desenhar(); ctx.atualizarContadores(); }
          catch (e) { avisar(e.message, 'erro'); b.disabled = false; }
        } }, 'x')) : null);
      return c;
    }));
  };
  const carregar = async () => { trocar(lista, carregando(3)); itens = (await todas(`/v1/admin/ofertas-manuais?ativas=${aba === 'ativas'}`)).itens; if (aba === 'encerradas') itens = itens.filter((o) => !o.disponivel || (o.valida_ate && new Date(o.valida_ate) <= new Date())); desenhar(); };
  anexar(raiz, h('p', { class: 'intro' }, 'Ofertas cadastradas à mão (encarte, loja do bairro). Passam pela mesma triagem de medicamento e NBCAL, entram no feed como "sem histórico verificado" e nunca notificam.'),
    h('div', { class: 'barra-ferramentas' }, abas([['ativas', 'Ativas', ctx.resumo?.ofertas_manuais_ativas], ['encerradas', 'Encerradas e vencidas']], aba, (id) => { aba = id; carregar().catch((e) => avisar(e.message, 'erro')); }),
      busca('Buscar produto, loja ou quem cadastrou', (v) => { termo = v; desenhar(); })), lista);
  await carregar();
}

async function formularioOferta(raiz, ctx) {
  const lojas = (await todas('/v1/admin/lojas')).itens.filter((l) => l.status !== 'bloqueada');
  const categorias = ctx.config.categorias ?? [];
  let chave = crypto.randomUUID();
  const f = { produtoModo: 'existente', produto: null };

  // --- 1. produto
  const resultados = h('div', { class: 'resultados', role: 'listbox', 'aria-label': 'Produtos encontrados' });
  const escolhido = h('div', { class: 'escolhido', hidden: true });
  const escolher = (p) => {
    f.produto = p;
    trocar(escolhido, foto(p.imagem_url, '', 'foto pequena'), h('div', {}, h('strong', {}, p.nome), h('div', { class: 'dica' }, `${p.marca?.nome ?? 'sem marca'} · ${embalagem(p)} · ${rotuloCategoria(ctx.config, p.categoria, p.subcategoria)}`)),
      botao('Trocar', { class: 'discreto', onclick: () => { f.produto = null; escolhido.hidden = true; caixaBusca.hidden = false; termoBusca.focus(); previa(); } }));
    escolhido.hidden = false; caixaBusca.hidden = true; limpar(resultados);
    marcarErros(form, {}); previa();
  };
  let ultimaBusca = 0;
  const termoBusca = h('input', { id: 'busca', type: 'search', placeholder: 'Nome, marca ou código de barras', autocomplete: 'off', 'aria-label': 'Buscar produto' });
  termoBusca.addEventListener('input', () => {
    const q = termoBusca.value.trim(), minha = ++ultimaBusca;
    if (q.length < 2) { limpar(resultados); return; }
    setTimeout(async () => {
      if (minha !== ultimaBusca) return;
      try {
        const r = await pedir('GET', `/v1/admin/produtos?q=${encodeURIComponent(q)}&limite=12`);
        if (minha !== ultimaBusca) return;
        trocar(resultados, r.itens.length === 0 ? h('p', { class: 'dica' }, 'Nada encontrado. Use "Produto novo".')
          : r.itens.map((p) => h('button', { type: 'button', class: 'resultado', role: 'option', onclick: () => escolher(p) }, foto(p.imagem_url, '', 'foto pequena'),
            h('span', {}, h('strong', {}, p.nome), h('small', {}, `${p.marca?.nome ?? 'sem marca'} · ${embalagem(p)}`)))));
      } catch (e) { avisar(e.message, 'erro'); }
    }, 220);
  });
  const caixaBusca = h('div', {}, h('label', { for: 'busca' }, 'Buscar no catálogo'), h('div', { class: 'busca' }, icone('buscar', 18), termoBusca), resultados);
  const blocoExistente = h('div', {}, caixaBusca, escolhido, h('div', { class: 'erro', 'data-erro': 'produto_id', role: 'alert' }));

  const nNome = entrada({ id: 'n_nome', maxlength: '300', placeholder: 'ex.: Fralda Pampers Confort Sec G 60 un' }), nMarca = entrada({ id: 'n_marca', maxlength: '100' });
  const nGtin = entrada({ id: 'n_gtin', inputmode: 'numeric', maxlength: '14' }), nQtd = entrada({ id: 'n_qtd', inputmode: 'decimal', placeholder: 'ex.: 60 ou 0,4' });
  const nImg = entrada({ id: 'n_img', type: 'url', placeholder: 'https://… (opcional)', maxlength: '2048' });
  const nCat = seletor([['', 'Escolha…'], ...categorias.map((c) => [c.slug, c.rotulo])], { id: 'n_cat' });
  const nSub = seletor([['', '(sem subcategoria)']], { id: 'n_sub' });
  const nUn = seletor([['un', 'unidades (un)'], ['kg', 'quilos (kg)'], ['l', 'litros (l)']], { id: 'n_un' });
  nCat.addEventListener('change', () => {
    const c = categorias.find((x) => x.slug === nCat.value);
    trocar(nSub, [['', '(sem subcategoria)'], ...(c?.subcategorias ?? []).map((x) => [x.slug, x.rotulo])].map(([v, t]) => h('option', { value: v }, t)));
  });
  const blocoNovo = h('div', { class: 'grade', hidden: true },
    h('div', { class: 'grade-larga' }, campo('Nome, com a embalagem', nNome, 'produto_novo.nome')), campo('Marca', nMarca, 'produto_novo.marca'),
    campo('Código de barras (opcional)', nGtin, 'produto_novo.gtin'), campo('Categoria', nCat, 'produto_novo.categoria'), campo('Subcategoria', nSub, 'produto_novo.subcategoria'),
    campo('Quantidade da embalagem', nQtd, 'produto_novo.embalagem'), campo('Unidade', nUn, 'produto_novo.embalagem_unidade'),
    h('div', { class: 'grade-larga' }, campo('Foto (endereço da imagem na loja)', nImg, 'produto_novo.imagem_url', 'Opcional. Copie o endereço da foto no site da loja (botão direito → copiar endereço da imagem).')));
  const modo = (valor, titulo, texto) => h('label', { class: 'opcao-cartao' }, h('input', { type: 'radio', name: 'modo', value: valor, checked: valor === 'existente', onchange: () => {
    f.produtoModo = valor; blocoExistente.hidden = valor !== 'existente'; blocoNovo.hidden = valor !== 'novo'; previa();
  } }), h('span', {}, h('strong', {}, titulo), h('small', {}, texto)));

  // --- 2. loja e preço
  const proprias = lojas.filter((l) => l.propria), outras = lojas.filter((l) => !l.propria);
  const lSel = h('select', { id: 'loja' }, h('option', { value: '' }, 'Escolha…'),
    proprias.length ? h('optgroup', { label: 'Suas lojas' }, proprias.map((l) => h('option', { value: l.id }, l.nome))) : null,
    outras.length ? h('optgroup', { label: 'Lojas da coleta (as de marca da Lomadee não aceitam)' }, outras.map((l) => h('option', { value: l.id }, `${l.nome} (${l.rede})`))) : null);
  const semLoja = proprias.length === 0 ? caixa('aviso', 'Você ainda não tem loja própria. ', h('button', { type: 'button', class: 'link', onclick: async () => {
    const nova = await dialogoNovaLoja();
    if (nova) { lSel.querySelector('option').after(h('option', { value: nova.id, selected: true }, nova.nome)); semLoja.remove(); previa(); }
  } }, 'Cadastrar uma loja agora')) : null;
  const pPreco = entrada({ id: 'preco', inputmode: 'decimal', placeholder: '49,90' });
  const cTipo = seletor([['', 'Sem condição'], ['leve_pague', 'Leve N, pague M'], ['quantidade_minima', 'Quantidade mínima'], ['cartao_fidelidade', 'Cartão de fidelidade'], ['app_da_rede', 'Só no app da rede']], { id: 'cond' });
  const cA = entrada({ id: 'cond_a', inputmode: 'numeric' }), cB = entrada({ id: 'cond_b', inputmode: 'numeric' }), cProg = entrada({ id: 'cond_prog', maxlength: '100' });
  const cExtra = h('div', { class: 'grade' });
  cTipo.addEventListener('change', () => {
    limpar(cExtra);
    if (cTipo.value === 'leve_pague') cExtra.append(campo('Leve', cA, 'condicao_a'), campo('Pague', cB, 'condicao_b'));
    if (cTipo.value === 'quantidade_minima') cExtra.append(campo('A partir de quantas embalagens', cA, 'condicao_a'));
    if (cTipo.value === 'cartao_fidelidade') cExtra.append(campo('Nome do programa', cProg, 'condicao_p'));
  });
  const fTipo = seletor([['a_confirmar', 'A confirmar'], ['nao_se_aplica', 'Sem frete (retirada, entrega grátis)'], ['conhecido', 'Valor conhecido']], { id: 'frete_tipo' });
  const fValor = entrada({ id: 'frete_valor', inputmode: 'decimal', placeholder: '12,90', disabled: true });
  fTipo.addEventListener('change', () => { fValor.disabled = fTipo.value !== 'conhecido'; });

  // --- 3. validade e link
  const vDe = entrada({ id: 'valida_de', type: 'datetime-local' }), vAte = entrada({ id: 'valida_ate', type: 'datetime-local' });
  const link = entrada({ id: 'link', type: 'url', placeholder: 'https://…', maxlength: '2048' });
  const afil = h('input', { id: 'afiliado', type: 'checkbox' });

  // --- prévia
  const $previa = h('div', { class: 'previa-app', 'aria-live': 'polite' });
  const lerForm = () => ({
    ...f, produtoId: f.produto?.id ?? '',
    novo: { nome: nNome.value, marca: nMarca.value, categoria: nCat.value, subcategoria: nSub.value, gtin: nGtin.value.trim(), quantidade: nQtd.value, unidade: nUn.value, imagem: nImg.value },
    lojaId: lSel.value, preco: pPreco.value,
    condicao: { tipo: cTipo.value, leve: cA.value, pague: cB.value, quantidade: cA.value, programa: cProg.value },
    frete: { status: fTipo.value, valor: fValor.value }, validaDe: vDe.value, validaAte: vAte.value, link: link.value, linkAfiliado: afil.checked,
  });
  function previa() {
    const v = lerForm();
    const nome = v.produtoModo === 'existente' ? f.produto?.nome : v.novo.nome.trim();
    const img = v.produtoModo === 'existente' ? f.produto?.imagem_url : v.novo.imagem.trim();
    const preco = reaisParaCentavos(v.preco);
    const loja = lojas.find((l) => l.id === v.lojaId)?.nome ?? lSel.selectedOptions[0]?.text;
    const cond = v.condicao.tipo === 'leve_pague' && v.condicao.leve && v.condicao.pague ? `Leve ${v.condicao.leve}, pague ${v.condicao.pague}`
      : v.condicao.tipo === 'quantidade_minima' && v.condicao.quantidade ? `A partir de ${v.condicao.quantidade} un.` : v.condicao.tipo === 'cartao_fidelidade' && v.condicao.programa ? `Com ${v.condicao.programa}` : v.condicao.tipo === 'app_da_rede' ? 'Só no app da rede' : null;
    trocar($previa, h('div', { class: 'previa-titulo' }, 'Como aparece no app'),
      h('div', { class: 'previa-cartao' }, foto(img, '', 'foto previa-foto'),
        h('div', { class: 'previa-corpo' }, h('div', { class: 'selo' }, 'sem histórico verificado'), h('strong', {}, nome || 'Nome do produto'),
          h('div', { class: 'dica' }, v.lojaId ? loja : 'Loja'), h('div', { class: 'preco' }, preco ? centavosParaReais(preco) : 'R$ —'), cond ? h('div', { class: 'selo' }, cond) : null,
          h('div', { class: 'dica' }, v.validaAte ? `Vale até ${dataHora(new Date(v.validaAte).toISOString())}` : 'Vale 7 dias (prazo padrão)'))),
      h('ul', { class: 'lista-regras' }, h('li', {}, 'Passa pela triagem de medicamento e NBCAL.'), h('li', {}, 'Nunca dispara notificação.'), h('li', {}, 'Sai do feed no fim da validade ou quando você encerrar.')));
  }

  const resposta = h('div', { 'aria-live': 'polite' });
  const enviar = h('button', { class: 'principal largo', type: 'submit' }, 'Cadastrar oferta');
  const secao = (n, titulo, ...conteudo) => h('section', { class: 'cartao secao-form' }, h('h2', {}, h('span', { class: 'passo' }, String(n)), titulo), conteudo);
  const form = h('form', { class: 'form-oferta', novalidate: true },
    h('div', { class: 'form-colunas' },
      h('div', { class: 'form-principal' },
        secao(1, 'Produto', h('div', { class: 'opcoes' }, modo('existente', 'Já está no catálogo', 'Busque pelo nome ou código'), modo('novo', 'Produto novo', 'Cadastre com categoria e embalagem')), blocoExistente, blocoNovo),
        secao(2, 'Loja e preço', semLoja, h('div', { class: 'grade' }, campo('Loja', lSel, 'loja_id', 'Para a oferta aparecer, a loja precisa entregar no CEP da pessoa.'), campo('Preço da embalagem (R$)', pPreco, 'preco_centavos'), campo('Condição', cTipo, 'condicao')),
          cExtra, h('div', { class: 'grade' }, campo('Frete', fTipo, 'frete'), campo('Valor do frete (R$)', fValor, 'frete_valor'))),
        secao(3, 'Validade e link', h('div', { class: 'grade' }, campo('Começa em (opcional)', vDe, 'valida_de'), campo('Termina em', vAte, 'valida_ate', 'Sem data de fim, vale 7 dias.')),
          campo('Link da oferta', link, 'link'), h('label', { class: 'marcar' }, afil, ' O link é de afiliado (rastreado)'), h('div', { class: 'erro', 'data-erro': 'link_afiliado', role: 'alert' }))),
      h('aside', { class: 'form-lateral' }, h('div', { class: 'cartao fixo' }, $previa, resposta, enviar))));
  form.addEventListener('input', previa);
  form.addEventListener('change', previa);
  anexar(raiz, form);
  if (produtoParaOferta) { escolher(produtoParaOferta); produtoParaOferta = null; }
  previa();

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault(); limpar(resposta); marcarErros(form, {});
    const pedido = montarPedidoOfertaManual(lerForm());
    if (pedido.erros) { marcarErros(form, pedido.erros); resposta.append(caixa('erro', 'Corrija os campos marcados.')); return; }
    enviar.disabled = true;
    try {
      const o = await pedir('POST', '/v1/admin/ofertas-manuais', pedido.corpo, { 'Idempotency-Key': chave });
      chave = crypto.randomUUID(); // próxima oferta = chave nova
      resposta.append(caixa('ok', h('strong', {}, 'Oferta cadastrada. '), `${o.produto.nome} em ${o.loja.nome} por ${centavosParaReais(o.preco_centavos)}, até ${dataHora(o.valida_ate)}.`,
        o.validade_padrao_aplicada ? h('div', {}, 'Sem data de fim: valeu o prazo padrão de 7 dias.') : null));
      avisar('Oferta cadastrada.');
      form.reset(); f.produto = null; escolhido.hidden = true; caixaBusca.hidden = f.produtoModo !== 'existente'; limpar(cExtra); fValor.disabled = true; previa();
      ctx.atualizarContadores();
    } catch (e) {
      const { campos, geral } = errosDaApi(e.resposta);
      marcarErros(form, Object.fromEntries(Object.entries(campos).map(([k, v]) => [k === 'produto' ? 'produto_id' : k, v])));
      if (e.resposta?.codigo === 'bloqueado_pela_triagem') resposta.append(caixa('erro', h('strong', {}, 'Barrado pela triagem. '), `${campos.produto ?? geral} O item foi para a fila de Triagem; se for falso positivo e puder ser liberado, libere lá e cadastre de novo.`));
      else resposta.append(caixa('erro', e.status === 503 ? `${geral} (tente de novo daqui a pouco)` : geral));
    } finally { enviar.disabled = false; }
  });
}

// ------------------------------------------------------------------------------------------------ produtos
export async function telaProdutos(raiz, ctx) {
  const lista = h('div', { class: 'grade-produtos', 'aria-live': 'polite' });
  const inicial = () => trocar(lista, vazio('Busque no catálogo', `O app monitora ${(ctx.resumo?.catalogo.produtos ?? 0).toLocaleString('pt-BR')} produto(s). Digite ao menos 2 letras do nome, da marca ou o código de barras.`));
  let versao = 0;
  anexar(raiz, h('p', { class: 'intro' }, 'Só aparece o que o app já monitora (coletado ou cadastrado à mão). A partir daqui você cria uma oferta manual do produto.'),
    h('div', { class: 'barra-ferramentas' }, busca('Nome, marca ou código de barras', async (q) => {
      const minha = ++versao;
      if (q.trim().length < 2) { inicial(); return; }
      trocar(lista, carregando(2));
      try {
        const r = await pedir('GET', `/v1/admin/produtos?q=${encodeURIComponent(q.trim())}&limite=50`);
        if (minha !== versao) return;
        if (r.itens.length === 0) { trocar(lista, vazio('Nada encontrado', 'Tente outra palavra ou cadastre o produto numa oferta manual.')); return; }
        trocar(lista, r.itens.map((p) => h('article', { class: 'cartao produto' }, foto(p.imagem_url, p.nome, 'foto grande'),
          h('div', { class: 'produto-corpo' }, h('h3', {}, p.nome), h('div', { class: 'dica' }, `${p.marca?.nome ?? 'sem marca'} · ${embalagem(p)}`),
            h('div', { class: 'linha selos' }, selo(rotuloCategoria(ctx.config, p.categoria, p.subcategoria)), p.gtin ? selo(`EAN ${p.gtin}`) : null)),
          botao('Criar oferta manual', { class: 'discreto', onclick: () => { produtoParaOferta = p; ctx.navegar('ofertas?nova=1'); } }, 'oferta'))));
      } catch (e) { avisar(e.message, 'erro'); }
    }, 300)), lista);
  inicial();
}

// ------------------------------------------------------------------------------------------------ lojas
/** Editor de faixas de CEP (usado na loja nova e no detalhe). Devolve { el, linhas() }. */
function editorAreas(iniciais = []) {
  const corpo = h('div', { class: 'areas' });
  const linhas = [];
  const adicionar = (a = { inicio: '', fim: '', prazo: '2' }) => {
    const ini = entrada({ inputmode: 'numeric', placeholder: '00000-000', maxlength: '9', 'aria-label': 'CEP inicial', value: a.inicio });
    const fim = entrada({ inputmode: 'numeric', placeholder: '99999-999', maxlength: '9', 'aria-label': 'CEP final', value: a.fim });
    const prazo = entrada({ inputmode: 'numeric', maxlength: '2', 'aria-label': 'Prazo em dias', value: a.prazo, class: 'curto' });
    const erros = [h('div', { class: 'erro' }), h('div', { class: 'erro' }), h('div', { class: 'erro' })];
    const reg = { ini, fim, prazo, erros };
    const linha = h('div', { class: 'area-linha' },
      h('div', { class: 'campo' }, ini, erros[0]), h('span', { class: 'ate', 'aria-hidden': 'true' }, 'até'),
      h('div', { class: 'campo' }, fim, erros[1]),
      h('div', { class: 'campo' }, h('div', { class: 'com-sufixo' }, prazo, h('span', {}, 'dias')), erros[2]),
      h('button', { type: 'button', class: 'icone-botao', 'aria-label': 'Remover faixa', onclick: () => { linhas.splice(linhas.indexOf(reg), 1); linha.remove(); numerar(); } }, icone('lixo', 18)));
    for (const c of [ini, fim]) c.addEventListener('blur', () => { const so = c.value.replace(/\D/g, ''); if (so.length === 8) c.value = formatarCep(so); });
    linhas.push(reg); corpo.append(linha); numerar();
  };
  // O erro de cada campo segue a posição da linha (a API e montarAreas contam a partir de 0).
  const numerar = () => linhas.forEach((l, i) => ['cep_inicio', 'cep_fim', 'prazo_dias'].forEach((c, j) => { l.erros[j].dataset.erro = `areas_entrega[${i}].${c}`; }));
  for (const a of iniciais) adicionar({ inicio: formatarCep(a.cep_inicio), fim: formatarCep(a.cep_fim), prazo: String(a.prazo_dias) });
  const el = h('div', {}, h('div', { class: 'areas-cabecalho dica' }, h('span', {}, 'CEP inicial'), h('span', {}), h('span', {}, 'CEP final'), h('span', {}, 'Prazo')), corpo,
    h('div', { class: 'linha' }, botao('Adicionar faixa', { class: 'discreto', onclick: () => adicionar() }, 'mais'),
      h('span', { class: 'dica' }, 'Atalhos:'), FAIXAS_PRONTAS.map((p) => h('button', { type: 'button', class: 'chip', onclick: () => adicionar({ inicio: formatarCep(p.cep_inicio), fim: formatarCep(p.cep_fim), prazo: '3' }) }, p.rotulo))),
    h('div', { class: 'erro', 'data-erro': 'areas_entrega', role: 'alert' }));
  return { el, linhas: () => linhas.map((l) => ({ inicio: l.ini.value, fim: l.fim.value, prazo: l.prazo.value })) };
}

/** Diálogo de loja nova. Resolve com a loja criada (ou undefined). */
export function dialogoNovaLoja() {
  return dialogo('Nova loja própria', (fechar) => {
    const nome = entrada({ maxlength: '120', placeholder: 'ex.: Mercado do Bairro' }), rede = entrada({ maxlength: '120', placeholder: 'igual ao nome se vazio' });
    const cnpj = entrada({ inputmode: 'numeric', maxlength: '18', placeholder: '00.000.000/0000-00' }), autorizacao = entrada({ maxlength: '120' });
    const status = seletor([['em_observacao', 'Em observação (aparece no feed, nunca notifica)'], ['aprovada', 'Aprovada']], {});
    const rep = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: '0.5', 'aria-label': 'Reputação' });
    const repValor = h('output', {}, '0,50');
    rep.addEventListener('input', () => { repValor.textContent = Number(rep.value).toFixed(2).replace('.', ','); });
    const areas = editorAreas([]);
    const resp = h('div', { 'aria-live': 'polite' });
    const ok = h('button', { type: 'submit', class: 'principal' }, 'Cadastrar loja');
    const form = h('form', { novalidate: true, class: 'form-loja' },
      h('div', { class: 'grade' }, campo('Nome da loja', nome, 'nome'), campo('Rede', rede, 'rede'), campo('CNPJ (opcional)', cnpj, 'cnpj'), campo('Autorização sanitária (opcional)', autorizacao, 'autorizacao_sanitaria'),
        campo('Status inicial', status, 'status'), h('div', { class: 'campo' }, h('label', {}, 'Reputação ', repValor), rep, h('div', { class: 'dica' }, 'Entra no cálculo do score. 0,5 é neutro.'), h('div', { class: 'erro', 'data-erro': 'reputacao' })),
      ),
      h('h3', {}, 'Onde a loja entrega'), h('p', { class: 'dica' }, 'Faixas de CEP com o prazo de entrega. Sem faixa, a loja não aparece no feed de ninguém.'), areas.el,
      resp, h('div', { class: 'acoes-dialogo' }, h('button', { type: 'button', onclick: () => fechar(undefined) }, 'Cancelar'), ok));
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault(); limpar(resp); marcarErros(form, {});
      const p = montarPedidoLoja({ nome: nome.value, rede: rede.value, cnpj: cnpj.value, autorizacao: autorizacao.value, status: status.value, reputacao: rep.value, areas: areas.linhas() });
      if (p.erros) { marcarErros(form, p.erros); return; }
      ok.disabled = true;
      try { const l = await pedir('POST', '/v1/admin/lojas', p.corpo); avisar(`Loja "${l.nome}" cadastrada.`); fechar(l); }
      catch (e) { const { campos, geral } = errosDaApi(e.resposta); marcarErros(form, campos); resp.append(caixa('erro', geral)); }
      finally { ok.disabled = false; }
    });
    setTimeout(() => nome.focus(), 0);
    return form;
  }, { largo: true });
}

/** Detalhe da loja num painel lateral: status, dados e área de entrega. Resolve true se algo mudou. */
async function detalheLoja(id) {
  const l = await pedir('GET', `/v1/admin/lojas/${id}`);
  let mudou = false;
  await dialogo(l.nome, () => {
    const corpo = h('div', { class: 'detalhe-loja' });
    // status
    let novoStatus = l.status;
    const obsStatus = entrada({ maxlength: '1000', placeholder: 'Motivo (opcional; vai para a auditoria)', 'aria-label': 'Motivo da mudança de status' });
    const statusEl = abas(STATUS.map(([v, t]) => [v, t]), l.status, (v) => { novoStatus = v; }, 'Status da loja');
    const salvarStatus = botao('Salvar status', { class: 'principal', onclick: async () => {
      if (novoStatus === l.status) return avisar('Sem mudança.');
      if (novoStatus === 'bloqueada' && !(await confirmar('Bloquear loja?', 'Ofertas novas dela são descartadas e os alertas ativos saem do feed.', { sim: 'Bloquear', perigo: true }))) return;
      salvarStatus.disabled = true;
      try { const r = await pedir('PUT', `/v1/admin/lojas/${l.id}/status`, { status: novoStatus, observacao: obsStatus.value.trim() || null }); l.status = r.status; mudou = true; avisar('Status gravado.'); }
      catch (e) { avisar(e.message, 'erro'); } finally { salvarStatus.disabled = false; }
    } }, 'ok');
    // dados
    const dNome = entrada({ value: l.nome, maxlength: '120' }), dRede = entrada({ value: l.rede, maxlength: '120' }), dCnpj = entrada({ value: l.cnpj ?? '', maxlength: '18', inputmode: 'numeric' });
    const dAut = entrada({ value: l.autorizacao_sanitaria ?? '', maxlength: '120' });
    const dRep = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(l.reputacao), 'aria-label': 'Reputação' });
    const dRepV = h('output', {}, l.reputacao.toFixed(2).replace('.', ','));
    dRep.addEventListener('input', () => { dRepV.textContent = Number(dRep.value).toFixed(2).replace('.', ','); });
    const formDados = h('form', { novalidate: true }, h('div', { class: 'grade' }, campo('Nome', dNome, 'nome'), campo('Rede', dRede, 'rede'), campo('CNPJ', dCnpj, 'cnpj'), campo('Autorização sanitária', dAut, 'autorizacao_sanitaria'),
      h('div', { class: 'campo' }, h('label', {}, 'Reputação ', dRepV), dRep, h('div', { class: 'erro', 'data-erro': 'reputacao' }))),
    h('div', { class: 'linha' }, h('button', { type: 'submit', class: 'principal' }, 'Salvar dados')));
    formDados.addEventListener('submit', async (ev) => {
      ev.preventDefault(); marcarErros(formDados, {});
      const corpoPedido = {};
      if (dNome.value.trim() !== l.nome) corpoPedido.nome = dNome.value.trim();
      if (dRede.value.trim() !== l.rede) corpoPedido.rede = dRede.value.trim();
      if (dCnpj.value.replace(/\D/g, '') !== (l.cnpj ?? '')) corpoPedido.cnpj = dCnpj.value.trim() || null;
      if (dAut.value.trim() !== (l.autorizacao_sanitaria ?? '')) corpoPedido.autorizacao_sanitaria = dAut.value.trim() || null;
      if (Number(dRep.value) !== l.reputacao) corpoPedido.reputacao = Number(dRep.value);
      if (Object.keys(corpoPedido).length === 0) return avisar('Sem mudança.');
      try { Object.assign(l, await pedir('PATCH', `/v1/admin/lojas/${l.id}`, corpoPedido)); mudou = true; avisar('Dados gravados.'); }
      catch (e) { marcarErros(formDados, errosDaApi(e.resposta).campos); avisar(e.message, 'erro'); }
    });
    // áreas
    const areas = editorAreas(l.areas_entrega);
    const formAreas = h('form', { novalidate: true }, areas.el, h('div', { class: 'linha' }, h('button', { type: 'submit', class: 'principal' }, 'Salvar área de entrega')));
    formAreas.addEventListener('submit', async (ev) => {
      ev.preventDefault(); marcarErros(formAreas, {});
      const a = montarAreas(areas.linhas());
      if (a.erros) { marcarErros(formAreas, a.erros); return; }
      if (a.areas.length === 0 && !(await confirmar('Tirar toda a área de entrega?', 'Sem nenhuma faixa de CEP a loja some do feed de todo mundo.', { sim: 'Tirar', perigo: true }))) return;
      try { Object.assign(l, await pedir('PUT', `/v1/admin/lojas/${l.id}/areas`, { areas_entrega: a.areas })); mudou = true; avisar('Área de entrega gravada.'); }
      catch (e) { marcarErros(formAreas, errosDaApi(e.resposta).campos); avisar(e.message, 'erro'); }
    });
    corpo.append(
      h('div', { class: 'linha selos' }, selo(l.propria ? 'Sua loja' : 'Da coleta'), l.fontes.map((f) => selo(`fonte ${f}`)), selo(`${l.ofertas_disponiveis} oferta(s) disponível(is)`),
        l.aceita_oferta_manual ? selo('aceita oferta manual', 'ok') : selo('não aceita oferta manual (marca da Lomadee)')),
      h('section', {}, h('h3', {}, 'Status'), h('p', { class: 'dica' }, 'Em observação aparece no feed e nunca notifica. Bloqueada some de tudo.'), statusEl, h('div', { class: 'linha' }, obsStatus, salvarStatus)),
      h('section', {}, h('h3', {}, 'Dados'), formDados),
      h('section', {}, h('h3', {}, 'Área de entrega'), h('p', { class: 'dica' }, 'O feed só mostra a oferta para quem tem um CEP numa dessas faixas.'), formAreas),
      h('p', { class: 'dica' }, `Cadastrada em ${dataHora(l.criado_em)}.`));
    return corpo;
  }, { lateral: true });
  return mudou;
}

export async function telaLojas(raiz, ctx) {
  let itens = [], filtro = 'todas', termo = '';
  const corpoTabela = h('tbody', {});
  const tabela = h('div', { class: 'cartao tabela-rolagem' }, h('table', { class: 'tabela' },
    h('thead', {}, h('tr', {}, ['Loja', 'Origem', 'Entrega', 'Reputação', 'Status', ''].map((t) => h('th', { scope: 'col' }, t)))), corpoTabela));
  const vazioEl = h('div', {});
  const contagens = () => ({ todas: itens.length, aprovada: itens.filter((l) => l.status === 'aprovada').length, em_observacao: itens.filter((l) => l.status === 'em_observacao').length, bloqueada: itens.filter((l) => l.status === 'bloqueada').length, proprias: itens.filter((l) => l.propria).length });
  const abasEl = h('div', {});
  const desenharAbas = () => { const c = contagens(); trocar(abasEl, abas([['todas', 'Todas', c.todas], ['aprovada', 'Aprovadas', c.aprovada], ['em_observacao', 'Em observação', c.em_observacao], ['bloqueada', 'Bloqueadas', c.bloqueada], ['proprias', 'Suas lojas', c.proprias]], filtro, (id) => { filtro = id; desenhar(); })); };
  const desenhar = () => {
    let vis = filtro === 'todas' ? itens : filtro === 'proprias' ? itens.filter((l) => l.propria) : itens.filter((l) => l.status === filtro);
    vis = filtrarPorTexto(vis, termo, (l) => `${l.nome} ${l.rede}`);
    tabela.hidden = vis.length === 0;
    trocar(vazioEl, vis.length === 0 ? vazio('Nenhuma loja aqui', filtro === 'proprias' ? 'Cadastre uma loja própria para usar nas ofertas manuais.' : null, filtro === 'proprias' ? botao('Nova loja', { class: 'principal', onclick: nova }, 'mais') : null) : null);
    trocar(corpoTabela, vis.map((l) => {
      const rep = h('span', { class: 'medidor-preenchido' }); rep.style.width = `${l.reputacao * 100}%`;
      const abrir = async () => { if (await detalheLoja(l.id).catch((e) => { avisar(e.message, 'erro'); return false; })) await carregar(); };
      return h('tr', { class: 'clicavel', onclick: (ev) => { if (!ev.target.closest('button')) abrir(); } },
        h('td', {}, h('strong', {}, l.nome), l.rede !== l.nome ? h('div', { class: 'dica' }, l.rede) : null),
        h('td', {}, selo(l.propria ? 'Sua loja' : 'Coleta')),
        h('td', {}, l.areas_entrega_total > 0 ? `${l.areas_entrega_total} faixa(s) de CEP` : selo('sem área de entrega', 'ruim')),
        h('td', {}, h('div', { class: 'medidor pequeno', role: 'img', 'aria-label': `Reputação ${l.reputacao.toFixed(2)}` }, rep), h('small', { class: 'dica' }, l.reputacao.toFixed(2).replace('.', ','))),
        h('td', {}, selo(rotuloStatus(l.status), TIPO_STATUS[l.status])),
        h('td', { class: 'num' }, botao('Abrir', { class: 'discreto pequeno', 'aria-label': `Abrir ${l.nome}`, onclick: abrir }, 'seta')));
    }));
  };
  const carregar = async () => { itens = (await todas('/v1/admin/lojas')).itens; desenharAbas(); desenhar(); };
  const nova = async () => { const l = await dialogoNovaLoja(); if (l) { await carregar(); ctx.atualizarContadores(); } };
  ctx.acoesTopo.append(botao('Nova loja', { class: 'principal', onclick: nova }, 'mais'));
  anexar(raiz, h('p', { class: 'intro' }, 'Toque numa loja para mudar o status, corrigir os dados ou a área de entrega. Lojas próprias são as cadastradas aqui, para as ofertas manuais.'),
    ctx.resumo?.lojas.sem_area_entrega ? caixa('aviso', `${ctx.resumo.lojas.sem_area_entrega} loja(s) sem área de entrega: elas não aparecem no feed de ninguém.`) : null,
    h('div', { class: 'barra-ferramentas' }, abasEl, busca('Buscar loja ou rede', (v) => { termo = v; desenhar(); })), tabela, vazioEl);
  await carregar();
}
