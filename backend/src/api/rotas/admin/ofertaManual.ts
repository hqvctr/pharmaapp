// POST /v1/admin/ofertas-manuais (admin.yaml, tag ofertas_manuais): o operador cadastra à mão uma oferta (TIPO E).
// Passa pela mesma triagem de medicamento e de NBCAL de qualquer produto; entra no feed como `somente_feed` ("sem histórico
// verificado") e nunca notifica. Idempotente por `Idempotency-Key` (24 h), na mesma transação do cadastro.
import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { precoPorUnidade, precoEfetivoPorUnidade, rotuloCondicao } from '../../../curadoria/preco.js';
import type { Condicao, Embalagem } from '../../../curadoria/tipos.js';
import { comTransacao } from '../../../db/transacao.js';
import type { OfertaBruta } from '../../../fontes/contrato.js';
import { removerEmbalagem } from '../../../normalizador/embalagem.js';
import type { ListasMedicamentos } from '../../../normalizador/medicamentos.js';
import { normalizarTexto } from '../../../normalizador/medicamentos.js';
import { normalizarOferta } from '../../../normalizador/normalizar.js';
import { chaveDaMarca, registrarBloqueio, type Db } from '../../../pipeline/repositorio.js';
import { produtoResumo } from '../../alertas.js';
import { registrarAuditoria } from '../../auditoria.js';
import { corpoObjeto, falhaDeValidacao } from '../../corpo.js';
import { UUID } from '../../cursor.js';
import { ErroApi, type CampoInvalido } from '../../erros.js';
import { travasDeMarca } from '../../ofertas.js';
import { exigirOperador } from '../../sessaoOperador.js';
import type { DepsAdmin } from './lojasFontes.js';

const VALIDADE_CHAVE_MS = 24 * 3600_000;
const SLUG = /^[a-z0-9_]+$/;
const DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const MAX_CENTAVOS = 100_000_000; // R$ 1 milhão: acima disso é erro de digitação

export const NOME_FONTE_MANUAL = 'manual';

interface ProdutoDoPedido {
  existente: { id: string } | null;
  novo: { nome: string; marca: string | null; categoria: string; subcategoria: string | null; gtin: string | null; embalagem: Embalagem } | null;
}

interface PedidoValido {
  produto: ProdutoDoPedido;
  lojaId: string;
  precoCentavos: number;
  condicao: Condicao | null;
  frete: { status: 'conhecido'; centavos: number } | { status: 'a_confirmar' } | { status: 'nao_se_aplica' };
  validaDe: Date | null;
  validaAte: Date | null;
  link: string;
  linkAfiliado: boolean;
}

const inteiro = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

function lerCondicao(v: unknown, campos: CampoInvalido[]): Condicao | null {
  if (v === null) return null;
  const erro = (m: string): null => {
    campos.push({ campo: 'condicao', mensagem: m });
    return null;
  };
  if (v === undefined || typeof v !== 'object' || Array.isArray(v)) return erro('Informe a condição ou null.');
  const c = v as Record<string, unknown>;
  switch (c.tipo) {
    case 'leve_pague':
      if (!inteiro(c.leve) || !inteiro(c.pague) || c.pague < 1 || c.leve <= c.pague || c.leve > 100) return erro('Leve N pague M: N maior que M, e M de 1 em diante.');
      return { tipo: 'leve_pague', leve: c.leve, pague: c.pague };
    case 'quantidade_minima':
      if (!inteiro(c.quantidade) || c.quantidade < 2 || c.quantidade > 1000) return erro('Quantidade mínima de 2 a 1000.');
      return { tipo: 'quantidade_minima', quantidade: c.quantidade };
    case 'cartao_fidelidade':
      if (typeof c.programa !== 'string' || c.programa.trim() === '' || c.programa.length > 100) return erro('Informe o nome do programa (até 100 caracteres).');
      return { tipo: 'cartao_fidelidade', programa: c.programa.trim() };
    case 'app_da_rede':
      return { tipo: 'app_da_rede' };
    default:
      return erro('Tipo de condição desconhecido.');
  }
}

function lerFrete(v: unknown, campos: CampoInvalido[]): PedidoValido['frete'] {
  const f = (v ?? null) as Record<string, unknown> | null;
  if (f !== null && typeof f === 'object' && !Array.isArray(f)) {
    if (f.status === 'conhecido' && inteiro(f.centavos) && f.centavos >= 0 && f.centavos <= MAX_CENTAVOS) return { status: 'conhecido', centavos: f.centavos };
    if ((f.status === 'a_confirmar' || f.status === 'nao_se_aplica') && (f.centavos === null || f.centavos === undefined)) return { status: f.status };
  }
  campos.push({ campo: 'frete', mensagem: 'Use conhecido (com centavos), a_confirmar ou nao_se_aplica (centavos null).' });
  return { status: 'a_confirmar' };
}

function lerData(b: Record<string, unknown>, campo: string, obrigatorioNoCorpo: boolean, campos: CampoInvalido[]): Date | null {
  const v = b[campo];
  if (v === undefined) {
    if (obrigatorioNoCorpo) campos.push({ campo, mensagem: 'Envie a data ou null.' });
    return null;
  }
  if (v === null) return null;
  if (typeof v !== 'string' || !DATA_HORA.test(v) || Number.isNaN(Date.parse(v))) {
    campos.push({ campo, mensagem: 'Use data e hora, como 2026-10-27T15:00:00Z.' });
    return null;
  }
  return new Date(v);
}

/** Valida o corpo do pedido (sem consultar o banco). Lança 422 com todos os campos errados de uma vez. */
export function lerPedido(b: Record<string, unknown>, categorias: ReadonlyMap<string, ReadonlySet<string>>, agora: Date): PedidoValido {
  const campos: CampoInvalido[] = [];
  const produto: ProdutoDoPedido = { existente: null, novo: null };
  const temId = b.produto_id !== undefined;
  const temNovo = b.produto_novo !== undefined;
  if (temId === temNovo) campos.push({ campo: 'produto_id', mensagem: 'Envie produto_id (produto que já existe) ou produto_novo, só um dos dois.' });
  else if (temId) {
    if (typeof b.produto_id !== 'string' || !UUID.test(b.produto_id)) campos.push({ campo: 'produto_id', mensagem: 'Informe o id do produto.' });
    else produto.existente = { id: b.produto_id };
  } else {
    const n = b.produto_novo as Record<string, unknown> | null;
    if (n === null || typeof n !== 'object' || Array.isArray(n)) campos.push({ campo: 'produto_novo', mensagem: 'Informe os dados do produto novo.' });
    else {
      const nome = typeof n.nome === 'string' ? n.nome.trim() : '';
      if (nome === '' || nome.length > 300) campos.push({ campo: 'produto_novo.nome', mensagem: 'Informe o nome (até 300 caracteres).' });
      const marca = n.marca === undefined || n.marca === null ? null : typeof n.marca === 'string' && n.marca.trim() !== '' && n.marca.length <= 100 ? n.marca.trim() : undefined;
      if (marca === undefined) campos.push({ campo: 'produto_novo.marca', mensagem: 'Use a marca (até 100 caracteres) ou null.' });
      const categoria = typeof n.categoria === 'string' ? n.categoria : '';
      const subs = categorias.get(categoria);
      if (!SLUG.test(categoria) || subs === undefined) campos.push({ campo: 'produto_novo.categoria', mensagem: 'Use uma categoria do app (medicamento não vale).' });
      const sub = n.subcategoria === undefined || n.subcategoria === null ? null : typeof n.subcategoria === 'string' && subs?.has(n.subcategoria) ? n.subcategoria : undefined;
      // Categoria errada já foi apontada acima; a subcategoria só é cobrada quando a categoria vale.
      if (sub === undefined && subs !== undefined) campos.push({ campo: 'produto_novo.subcategoria', mensagem: 'Use uma subcategoria da categoria ou null.' });
      const gtin = n.gtin === undefined || n.gtin === null ? null : typeof n.gtin === 'string' && /^[0-9]{8,14}$/.test(n.gtin) ? n.gtin : undefined;
      if (gtin === undefined) campos.push({ campo: 'produto_novo.gtin', mensagem: 'Use de 8 a 14 dígitos ou null.' });
      const e = n.embalagem as Record<string, unknown> | undefined;
      const q = e?.quantidade;
      const embalagemOk = e !== undefined && e !== null && typeof q === 'number' && Number.isFinite(q) && q > 0 && q <= 1_000_000 && (e.unidade === 'kg' || e.unidade === 'l' || e.unidade === 'un');
      if (!embalagemOk) campos.push({ campo: 'produto_novo.embalagem', mensagem: 'Informe a quantidade (maior que zero) e a unidade (kg, l ou un).' });
      if (campos.length === 0 || !campos.some((c) => c.campo.startsWith('produto_novo'))) {
        produto.novo = { nome, marca: marca ?? null, categoria, subcategoria: sub ?? null, gtin: gtin ?? null, embalagem: { quantidade: q as number, unidade: (e as { unidade: Embalagem['unidade'] }).unidade } };
      }
    }
  }
  if (typeof b.loja_id !== 'string' || !UUID.test(b.loja_id)) campos.push({ campo: 'loja_id', mensagem: 'Informe a loja.' });
  const preco = b.preco_centavos;
  if (!inteiro(preco) || preco < 1 || preco > MAX_CENTAVOS) campos.push({ campo: 'preco_centavos', mensagem: 'Informe o preço em centavos (inteiro, maior que zero).' });
  const condicao = b.condicao === undefined ? (campos.push({ campo: 'condicao', mensagem: 'Envie a condição ou null.' }), null) : lerCondicao(b.condicao, campos);
  const frete = lerFrete(b.frete, campos);
  const validaDe = lerData(b, 'valida_de', true, campos);
  const validaAte = lerData(b, 'valida_ate', false, campos);
  if (validaAte !== null && validaAte.getTime() <= agora.getTime()) campos.push({ campo: 'valida_ate', mensagem: 'A oferta já venceu: informe uma data no futuro.' });
  if (validaDe !== null && validaAte !== null && validaDe.getTime() > validaAte.getTime()) campos.push({ campo: 'valida_ate', mensagem: 'O fim não pode ser antes do começo.' });
  const link = b.link;
  if (typeof link !== 'string' || link.length > 2048 || !/^https:\/\/[^\s]+$/.test(link)) campos.push({ campo: 'link', mensagem: 'Informe o link da oferta (https, até 2048 caracteres).' });
  if (typeof b.link_afiliado !== 'boolean') campos.push({ campo: 'link_afiliado', mensagem: 'Use verdadeiro ou falso.' });
  if (campos.length > 0) throw falhaDeValidacao(campos);
  return {
    produto, lojaId: b.loja_id as string, precoCentavos: preco as number, condicao, frete, validaDe, validaAte, link: link as string, linkAfiliado: b.link_afiliado as boolean,
  };
}

const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

export function rotaAdminOfertaManual(app: FastifyInstance, d: DepsAdmin): void {
  app.post('/v1/admin/ofertas-manuais', async (req, reply) => {
    const agora = d.agora();
    const ctx = await exigirOperador(req, d.db, d.tenants, agora);
    const chave = req.headers['idempotency-key'];
    if (typeof chave !== 'string' || !UUID.test(chave)) throw falhaDeValidacao([{ campo: 'Idempotency-Key', mensagem: 'Envie um UUID neste cabeçalho.' }]);
    const b = corpoObjeto(req);
    const cfg = ctx.tenant.config;
    const categorias = new Map(cfg.app.categorias.map((c) => [c.slug, new Set(c.subcategorias.map((s) => s.slug))] as const));
    const pedido = lerPedido(b, categorias, agora);
    const validadePadraoDias = cfg.app.ofertaManual.validadePadraoDias;

    // Sem a lista de medicamentos a triagem não pode rodar, e sem triagem nada entra (falha fechada).
    let listas: ListasMedicamentos;
    try {
      if (d.listasMedicamentos === undefined) throw new Error('sem provedor');
      listas = await d.listasMedicamentos();
    } catch {
      throw new ErroApi('servico_indisponivel', 'A lista de medicamentos ainda não está disponível neste servidor (ela vem da primeira coleta). Tente depois da primeira coleta.', undefined, 60);
    }

    const corpoHash = createHash('sha256').update(JSON.stringify(b)).digest();
    const rota = 'ofertas-manuais';
    type Saida = { tipo: 'criada'; corpo: unknown } | { tipo: 'bloqueada'; detalhe: string } | { tipo: 'erro'; erro: ErroApi };
    const saida: Saida = await comTransacao(d.db, async (c): Promise<Saida> => {
      // Reserva a chave (ou descobre que já existe). Duas chamadas iguais ao mesmo tempo: a segunda espera a primeira terminar.
      const reservou = (
        await c.query(
          `INSERT INTO idempotencia_chaves (tenant_id, escopo, rota, chave, corpo_hash, resposta_status, resposta, criada_em)
           VALUES ($1, $2, $3, $4, $5, 0, '{}'::jsonb, $6) ON CONFLICT (tenant_id, escopo, rota, chave) DO NOTHING RETURNING 1`,
          [ctx.tenantId, ctx.operador.id, rota, chave, corpoHash, agora],
        )
      ).rowCount === 1;
      if (!reservou) {
        const antigo = (await c.query(`SELECT corpo_hash, resposta_status, resposta, criada_em FROM idempotencia_chaves WHERE tenant_id = $1 AND escopo = $2 AND rota = $3 AND chave = $4 FOR UPDATE`, [ctx.tenantId, ctx.operador.id, rota, chave])).rows[0];
        if (antigo.resposta_status !== 0 && agora.getTime() - antigo.criada_em.getTime() < VALIDADE_CHAVE_MS) {
          if (!antigo.corpo_hash.equals(corpoHash)) return { tipo: 'erro', erro: new ErroApi('idempotencia_conflito') };
          return { tipo: 'criada', corpo: antigo.resposta };
        }
        // Chave vencida, ou reserva sem resposta (a tentativa anterior foi barrada pela triagem): vale como nova.
        await c.query(`UPDATE idempotencia_chaves SET corpo_hash = $5, resposta_status = 0, resposta = '{}'::jsonb, criada_em = $6 WHERE tenant_id = $1 AND escopo = $2 AND rota = $3 AND chave = $4`, [ctx.tenantId, ctx.operador.id, rota, chave, corpoHash, agora]);
      }

      const loja = (await c.query(`SELECT id, nome, rede, tipo, status FROM stores WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, pedido.lojaId])).rows[0];
      if (loja === undefined) throw new ErroApi('nao_encontrado', 'Loja não encontrada.');
      if (loja.status === 'bloqueada') throw falhaDeValidacao([{ campo: 'loja_id', mensagem: 'Esta loja está bloqueada.' }]);
      // Marca da Lomadee só com o link rastreado da plataforma (DECISIONS 67): oferta manual com link cru não entra.
      const { fontes: fontesComTrava } = travasDeMarca(cfg);
      const daLomadee = (await c.query(`SELECT 1 FROM store_source_refs r JOIN sources s ON s.tenant_id = r.tenant_id AND s.id = r.source_id WHERE r.tenant_id = $1 AND r.store_id = $2 AND s.nome = ANY($3::text[]) LIMIT 1`, [ctx.tenantId, pedido.lojaId, fontesComTrava])).rowCount === 1;
      if (daLomadee) throw falhaDeValidacao([{ campo: 'loja_id', mensagem: 'Loja de marca da Lomadee: o link tem de ser o rastreado pela plataforma, então o preço vem da coleta, não de cadastro manual.' }]);

      // Produto: o que existe, ou o novo.
      let produtoId: string | null = null;
      let base: { nome: string; marca: string | null; gtin: string | null; categoria: string; embalagem: Embalagem };
      if (pedido.produto.existente !== null) {
        const p = (await c.query(`SELECT id, nome, marca, gtin, categoria, quantidade, unidade FROM products WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, pedido.produto.existente.id])).rows[0];
        if (p === undefined) throw new ErroApi('nao_encontrado', 'Produto não encontrado.');
        produtoId = p.id;
        base = { nome: p.nome, marca: p.marca, gtin: p.gtin, categoria: p.categoria, embalagem: { quantidade: Number(p.quantidade), unidade: p.unidade } };
      } else {
        const n = pedido.produto.novo as NonNullable<ProdutoDoPedido['novo']>;
        base = { nome: n.nome, marca: n.marca, gtin: n.gtin, categoria: n.categoria, embalagem: n.embalagem };
      }

      const fonteId = (
        await c.query(
          `INSERT INTO sources (tenant_id, nome, tipo, frequencia_minutos, regiao, status_confianca, confiabilidade, base_legal, ativa)
           VALUES ($1, $2, 'E', 1440, 'manual', 'aprovada', 'alta', 'Cadastro manual por operador', false)
           ON CONFLICT (tenant_id, nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id`,
          [ctx.tenantId, NOME_FONTE_MANUAL],
        )
      ).rows[0].id as string;

      // Mesma triagem do pipeline. A categoria é a que o operador escolheu (ou a do produto), então o mapa da "fonte" a devolve.
      const idExterno = `manual:${randomUUID()}`;
      const bruta: OfertaBruta = {
        idExterno, titulo: base.nome, descricao: null, gtin: base.gtin, marca: base.marca, precoCentavos: pedido.precoCentavos, condicao: pedido.condicao,
        categoriaFonte: 'manual', lojaIdExterno: 'manual', link: pedido.link, linkAfiliado: pedido.linkAfiliado, disponivel: true,
        validaDe: pedido.validaDe, validaAte: pedido.validaAte, frete: pedido.frete,
      };
      const triagem = normalizarOferta(bruta, listas, {
        mapaCategorias: { [normalizarTexto('manual')]: base.categoria },
        categoriaMedicamentos: cfg.medicamentos.categoria,
        modoMedicamentos: cfg.medicamentos.modo,
        triagemPorNome: cfg.medicamentos.triagemPorNome,
        nbcal: cfg.nbcal,
      });
      if (triagem.tipo === 'bloqueado') {
        await registrarBloqueio(c as unknown as Db, ctx.tenantId, fonteId, bruta, { codigo: triagem.codigo, detalhe: triagem.detalhe, revisaoHumana: triagem.revisaoHumana }, agora);
        // A reserva fica com resposta_status 0: vale como "nada foi criado", e o operador pode corrigir o produto e reenviar com a mesma chave.
        return { tipo: 'bloqueada', detalhe: triagem.detalhe };
      }
      if (triagem.tipo !== 'ok') throw falhaDeValidacao([{ campo: 'produto', mensagem: 'Categoria não reconhecida.' }]);

      if (produtoId === null) {
        const n = pedido.produto.novo as NonNullable<ProdutoDoPedido['novo']>;
        const marcaNorm = n.marca === null ? null : normalizarTexto(n.marca);
        const familia = [marcaNorm ?? '', removerEmbalagem(n.nome)].join('|');
        const chaveProduto = n.gtin !== null ? `gtin:${n.gtin}` : `${familia}|${n.embalagem.quantidade}${n.embalagem.unidade}`;
        produtoId = (
          await c.query(
            `INSERT INTO products (tenant_id, gtin, chave_hash, familia_chave, marca, marca_chave, nome, categoria, subcategoria, quantidade, unidade, advertencias)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::text[])
             ON CONFLICT (tenant_id, chave_hash) DO UPDATE SET advertencias = EXCLUDED.advertencias
             RETURNING id`,
            [ctx.tenantId, n.gtin, sha256(chaveProduto), sha256(familia), n.marca, chaveDaMarca(n.marca), n.nome, n.categoria, n.subcategoria, n.embalagem.quantidade, n.embalagem.unidade, triagem.produto.advertencias],
          )
        ).rows[0].id as string;
      }
      const familiaChave = (await c.query(`SELECT familia_chave FROM products WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, produtoId])).rows[0].familia_chave as string;

      // D21: sem `valida_ate`, vale o prazo padrão do tenant e a resposta avisa.
      const padrao = pedido.validaAte === null;
      const validaAte = pedido.validaAte ?? new Date(agora.getTime() + validadePadraoDias * 86_400_000);
      const validaDe = pedido.validaDe;
      if (validaDe !== null && validaDe.getTime() > validaAte.getTime()) throw falhaDeValidacao([{ campo: 'valida_de', mensagem: 'O começo cai depois do prazo padrão de validade: informe também o fim.' }]);
      const ofertaId = (
        await c.query(
          `INSERT INTO offers (tenant_id, product_id, store_id, source_id, id_externo, preco_centavos, preco_por_unidade_centavos, condicao, frete_centavos, frete_status,
                               disponivel, valida_de, valida_ate, link, link_afiliado, coletada_em, criada_por, criado_em, validade_padrao_aplicada)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$12,$13,$14,$15,$16,$15,$17) RETURNING id`,
          [ctx.tenantId, produtoId, pedido.lojaId, fonteId, idExterno, pedido.precoCentavos, precoPorUnidade(pedido.precoCentavos, base.embalagem),
            pedido.condicao === null ? null : JSON.stringify(pedido.condicao), pedido.frete.status === 'conhecido' ? pedido.frete.centavos : null, pedido.frete.status,
            validaDe, validaAte, pedido.link, pedido.linkAfiliado, agora, ctx.operador.id, padrao],
        )
      ).rows[0].id as string;

      // Sem histórico verificado: a referência é o próprio preço (queda 0). O app marca a oferta como "sem histórico verificado".
      const efetivo = precoEfetivoPorUnidade(pedido.precoCentavos, base.embalagem, pedido.condicao);
      const alertaId = (
        await c.query(
          `INSERT INTO alerts (tenant_id, offer_id, store_id, familia_chave, score, decisao, motivo, preco_centavos, preco_efetivo_por_unidade, preco_referencia_por_unidade,
                               valida_ate, rotulo_condicao, entrega_a_confirmar, criado_em)
           VALUES ($1,$2,$3,$4,0,'somente_feed',$5,$6,$7,$7,$8,$9,false,$10) RETURNING id`,
          [ctx.tenantId, ofertaId, pedido.lojaId, familiaChave, `Oferta manual cadastrada por ${ctx.operador.nome}`, pedido.precoCentavos, efetivo, validaAte, rotuloCondicao(pedido.condicao), agora],
        )
      ).rows[0].id as string;
      await registrarAuditoria(c as unknown as Db, {
        tenantId: ctx.tenantId, operadorId: ctx.operador.id, acao: 'oferta_manual_criada', alvoTipo: 'oferta', alvoId: ofertaId, em: agora,
        detalhe: { produto_id: produtoId, produto_novo: pedido.produto.novo !== null, loja_id: pedido.lojaId, preco_centavos: pedido.precoCentavos, validade_padrao_aplicada: padrao },
      });

      const p = (await c.query(`SELECT id AS product_id, nome, marca, marca_chave, categoria, gtin, quantidade, unidade, imagem_url, subcategoria FROM products WHERE tenant_id = $1 AND id = $2`, [ctx.tenantId, produtoId])).rows[0];
      const corpo = {
        id: ofertaId,
        produto: produtoResumo(p),
        loja: { id: loja.id, nome: loja.nome, rede: loja.rede, tipo: loja.tipo },
        preco_centavos: pedido.precoCentavos,
        condicao: pedido.condicao,
        rotulo_condicao: rotuloCondicao(pedido.condicao),
        frete: { status: pedido.frete.status, centavos: pedido.frete.status === 'conhecido' ? pedido.frete.centavos : null },
        valida_de: validaDe === null ? null : validaDe.toISOString(),
        valida_ate: validaAte.toISOString(),
        validade_padrao_aplicada: padrao,
        link: pedido.link,
        link_afiliado: pedido.linkAfiliado,
        disponivel: true,
        alerta_id: alertaId,
        criada_por: { id: ctx.operador.id, nome: ctx.operador.nome },
        criada_em: agora.toISOString(),
      };
      await c.query(`UPDATE idempotencia_chaves SET resposta_status = 201, resposta = $5::jsonb WHERE tenant_id = $1 AND escopo = $2 AND rota = $3 AND chave = $4`, [ctx.tenantId, ctx.operador.id, rota, chave, JSON.stringify(corpo)]);
      return { tipo: 'criada', corpo };
    });

    if (saida.tipo === 'erro') throw saida.erro;
    if (saida.tipo === 'bloqueada') throw new ErroApi('bloqueado_pela_triagem', undefined, [{ campo: 'produto', mensagem: saida.detalhe }]);
    return reply.code(201).send(saida.corpo);
  });
}
