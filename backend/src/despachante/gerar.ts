// Geração dos avisos da central (fase 4, DECISIONS 100). Duas origens:
//  - alerta novo do motor (promoção excepcional) para cada pessoa que o veria no feed: categoria escolhida ou produto seguido com
//    o aviso ligado, oferta ativa, loja que entrega num CEP do plano. A visibilidade é a do detalhe do alerta (`consultarAlertas`).
//  - produtos seguidos: queda acima do percentual da pessoa, voltou ao estoque, menor preço em 180 dias e promoção acabando, com
//    as ofertas que a pessoa vê agora (`ofertasAtuais`, as mesmas regras da página do produto) e o selo dos cartões.
// Aqui só se cria o aviso, sempre com `push = 'pendente'`; se ele vira push é decidido no envio (enviar.ts).
import type pg from 'pg';
import { consultarAlertas, paraAlerta } from '../api/alertas.js';
import { consultarProdutos } from '../api/catalogo.js';
import { ofertasAtuais, type OfertaLinha } from '../api/ofertas.js';
import { preferenciasDaPessoa } from '../api/pessoa.js';
import { comTransacao } from '../db/transacao.js';
import type { Db } from '../pipeline/repositorio.js';
import type { ConfigTenant } from '../shared/tenantConfig.js';

const HORA = 3_600_000;

export interface Tenant {
  tenantId: string;
  config: ConfigTenant;
}

export type TipoAviso = 'promocao_excepcional' | 'queda_percentual' | 'voltou_estoque' | 'menor_preco_180d' | 'promocao_acabando';

interface NovoAviso {
  userId: string;
  tipo: TipoAviso;
  origem: 'categoria' | 'seguido';
  productId: string;
  storeId: string | null;
  alertId: string | null;
  precoCentavos: number | null;
  queda: number | null;
  validaAte: Date | null;
}

/** Grava o aviso; devolve false se ele já existia (o mesmo alerta para a mesma pessoa). */
async function inserirAviso(db: Db, tenantId: string, a: NovoAviso, agora: Date): Promise<boolean> {
  const r = await db.query(
    `INSERT INTO avisos (tenant_id, user_id, tipo, origem, product_id, store_id, alert_id, preco_centavos, queda, valida_ate, criado_em)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (tenant_id, user_id, alert_id) WHERE tipo = 'promocao_excepcional' AND alert_id IS NOT NULL DO NOTHING`,
    [tenantId, a.userId, a.tipo, a.origem, a.productId, a.storeId, a.alertId, a.precoCentavos, a.queda, a.validaAte, agora],
  );
  return r.rowCount === 1;
}

const arredondar4 = (n: number): number => Math.round(n * 10000) / 10000;

/**
 * Alertas que ainda não passaram pelo despachante. Alerta que nunca vira aviso (só feed, rejeitado, velho demais) é só marcado;
 * alerta aguardando o operador espera a revisão. Os outros geram um aviso por pessoa que o vê.
 */
export async function gerarAvisosDeAlertas(pool: pg.Pool, t: Tenant, agora: Date): Promise<{ alertas: number; avisos: number }> {
  const maxIdade = new Date(agora.getTime() - t.config.app.push.alertaMaxIdadeHoras * HORA);
  await pool.query(
    `UPDATE alerts SET avisos_gerados_em = $2
      WHERE tenant_id = $1 AND avisos_gerados_em IS NULL
        AND (decisao NOT IN ('notificar', 'aguardar_aprovacao') OR revisao_situacao = 'rejeitado' OR criado_em < $3)`,
    [t.tenantId, agora, maxIdade],
  );
  const alertas = (
    await pool.query(
      `SELECT a.id, p.id AS product_id, p.categoria
         FROM alerts a
         JOIN offers o ON o.tenant_id = a.tenant_id AND o.id = a.offer_id
         JOIN products p ON p.tenant_id = o.tenant_id AND p.id = o.product_id
        WHERE a.tenant_id = $1 AND a.avisos_gerados_em IS NULL AND a.revisao_situacao IN ('nao_exigida', 'aprovado')
        ORDER BY a.criado_em, a.id
        LIMIT 200`,
      [t.tenantId],
    )
  ).rows as Array<{ id: string; product_id: string; categoria: string }>;

  let avisos = 0;
  for (const alerta of alertas) {
    avisos += await comTransacao(pool, async (c) => {
      // Trava o alerta: dois despachantes ao mesmo tempo não dividem o trabalho nem repetem avisos.
      const livre = await c.query(`SELECT 1 FROM alerts WHERE tenant_id = $1 AND id = $2 AND avisos_gerados_em IS NULL FOR UPDATE SKIP LOCKED`, [t.tenantId, alerta.id]);
      if (livre.rowCount !== 1) return 0;
      // Quem segue o produto decide pelo aviso dele (ligado ou desligado); quem não segue, pela categoria escolhida.
      const candidatos = (
        await c.query(
          `SELECT u.id, sg.id IS NOT NULL AND sg.promocao_excepcional AS seguido
             FROM users u
             JOIN user_preferences up ON up.tenant_id = u.tenant_id AND up.user_id = u.id
             LEFT JOIN seguidos sg ON sg.tenant_id = u.tenant_id AND sg.user_id = u.id AND sg.product_id = $2
            WHERE u.tenant_id = $1 AND u.termos_aceitos_em IS NOT NULL
              AND coalesce(sg.promocao_excepcional, $3 = ANY(up.categorias))
            ORDER BY u.id`,
          [t.tenantId, alerta.product_id, alerta.categoria],
        )
      ).rows as Array<{ id: string; seguido: boolean }>;
      let n = 0;
      for (const pessoa of candidatos) {
        const { ceps } = await preferenciasDaPessoa(c, t.tenantId, pessoa.id, t.config.app, agora);
        if (ceps.length === 0) continue;
        const [linha] = await consultarAlertas(c, { tenantId: t.tenantId, userId: pessoa.id, config: t.config, agora, ceps, alertaId: alerta.id });
        if (linha === undefined || linha.situacao !== 'ativa') continue;
        // Silenciado com "tudo" some de tudo, inclusive da central; o silêncio só de push é decidido no envio.
        const silenciado = await c.query(
          `SELECT 1 FROM silenciamentos WHERE tenant_id = $1 AND user_id = $2 AND alcance = 'tudo'
              AND ((tipo = 'loja' AND loja_id = $3) OR (tipo = 'marca' AND marca_chave = $4)) LIMIT 1`,
          [t.tenantId, pessoa.id, linha.store_id, linha.marca_chave],
        );
        if (silenciado.rowCount === 1) continue;
        const a = paraAlerta(linha);
        const criado = await inserirAviso(c, t.tenantId, {
          userId: pessoa.id,
          tipo: 'promocao_excepcional',
          origem: pessoa.seguido ? 'seguido' : 'categoria',
          productId: linha.product_id,
          storeId: linha.store_id,
          alertId: alerta.id,
          precoCentavos: linha.preco_centavos,
          queda: a.queda,
          validaAte: linha.valida_ate,
        }, agora);
        if (criado) n++;
      }
      await c.query(`UPDATE alerts SET avisos_gerados_em = $3 WHERE tenant_id = $1 AND id = $2`, [t.tenantId, alerta.id, agora]);
      return n;
    });
  }
  return { alertas: alertas.length, avisos };
}

interface SeguidoLinha {
  id: string;
  product_id: string;
  queda_percentual: number | null;
  voltou_estoque: boolean;
  menor_preco_180d: boolean;
  promocao_acabando: boolean;
  atualizado_em: Date;
  estado_em: Date | null;
  estoque_visto: boolean | null;
  menor_180d_visto: boolean | null;
  preco_base_centavos: number | null;
}

/**
 * Avalia os produtos seguidos de todas as pessoas. Só deve rodar logo depois de uma coleta que chegou a todas as fontes: com uma
 * fonte fora, as ofertas dela parecem "sem estoque" e, na volta, todo mundo receberia "voltou ao estoque".
 *
 * Regras (DECISIONS 100): a primeira avaliação só guarda o estado, sem aviso; "voltou ao estoque" e "menor preço em 180 dias" avisam
 * na virada de falso para verdadeiro; a queda conta do preço-base (o da primeira avaliação, de quando a pessoa mudou os avisos do
 * produto ou do último aviso de queda) e, depois de avisar, o base passa a ser o preço avisado; "promoção acabando" avisa uma vez
 * por validade, quando faltam até 24 h.
 */
export async function avaliarSeguidos(pool: pg.Pool, t: Tenant, agora: Date): Promise<{ pessoas: number; avisos: number }> {
  const slugs = t.config.app.categorias.map((c) => c.slug);
  const pessoas = (
    await pool.query(
      `SELECT DISTINCT sg.user_id FROM seguidos sg JOIN users u ON u.tenant_id = sg.tenant_id AND u.id = sg.user_id
        WHERE sg.tenant_id = $1 AND u.termos_aceitos_em IS NOT NULL ORDER BY sg.user_id`,
      [t.tenantId],
    )
  ).rows.map((r: { user_id: string }) => r.user_id);

  let avisos = 0;
  let avaliadas = 0;
  for (const userId of pessoas) {
    const { ceps } = await preferenciasDaPessoa(pool, t.tenantId, userId, t.config.app, agora);
    // Sem CEP nada está "em estoque"; avaliar agora faria todo produto "voltar ao estoque" quando a pessoa pusesse um CEP.
    if (ceps.length === 0) continue;
    avaliadas++;
    avisos += await comTransacao(pool, async (c) => {
      // Produto que o app pode mostrar: categoria do app, sem advertência legal e de marca não silenciada com "tudo".
      const seguidos = (
        await c.query(
          `SELECT sg.id, sg.product_id, sg.queda_percentual, sg.voltou_estoque, sg.menor_preco_180d, sg.promocao_acabando, sg.atualizado_em,
                  sg.estado_em, sg.estoque_visto, sg.menor_180d_visto, sg.preco_base_centavos
             FROM seguidos sg
             JOIN products p ON p.tenant_id = sg.tenant_id AND p.id = sg.product_id
            WHERE sg.tenant_id = $1 AND sg.user_id = $2 AND p.categoria = ANY($3::text[]) AND cardinality(p.advertencias) = 0
              AND (p.marca_chave IS NULL OR NOT EXISTS (SELECT 1 FROM silenciamentos sm WHERE sm.tenant_id = sg.tenant_id AND sm.user_id = sg.user_id
                                                         AND sm.alcance = 'tudo' AND sm.tipo = 'marca' AND sm.marca_chave = p.marca_chave))
            ORDER BY sg.criado_em, sg.id
              FOR UPDATE OF sg`,
          [t.tenantId, userId, slugs],
        )
      ).rows as SeguidoLinha[];
      if (seguidos.length === 0) return 0;
      const ids = seguidos.map((s) => s.product_id);
      const ofertas = await ofertasAtuais(c, { tenantId: t.tenantId, userId, config: t.config, agora, ceps, produtoIds: ids });
      // `ofertasAtuais` vem do menor preço para o maior: a primeira de cada produto é a mais barata.
      const melhor = new Map<string, OfertaLinha>();
      const acabando = new Map<string, OfertaLinha>();
      const limiteAcabando = agora.getTime() + 24 * HORA;
      for (const o of ofertas) {
        if (!melhor.has(o.product_id)) melhor.set(o.product_id, o);
        if (!acabando.has(o.product_id) && o.valida_ate !== null && o.valida_ate.getTime() <= limiteAcabando) acabando.set(o.product_id, o);
      }
      const cartoes = await consultarProdutos(c, { tenantId: t.tenantId, userId, config: t.config, agora, ceps, ids, ordem: 'relevancia', offset: 0, limite: ids.length });
      const menor180d = new Set(cartoes.itens.filter((x) => x.menor_preco_180d === true).map((x) => x.id as string));

      let n = 0;
      for (const s of seguidos) {
        const oferta = melhor.get(s.product_id);
        const disponivel = oferta !== undefined;
        const noMenor = menor180d.has(s.product_id);
        const base = (o: OfertaLinha) => ({ userId, origem: 'seguido' as const, productId: s.product_id, storeId: o.store_id, alertId: o.alerta_id, precoCentavos: o.preco_centavos });
        let precoBase = s.preco_base_centavos;
        if (s.estado_em !== null) {
          if (s.voltou_estoque && s.estoque_visto === false && oferta !== undefined) {
            if (await inserirAviso(c, t.tenantId, { ...base(oferta), tipo: 'voltou_estoque', queda: null, validaAte: oferta.valida_ate }, agora)) n++;
          }
          if (s.menor_preco_180d && s.menor_180d_visto === false && noMenor && oferta !== undefined) {
            if (await inserirAviso(c, t.tenantId, { ...base(oferta), tipo: 'menor_preco_180d', queda: null, validaAte: oferta.valida_ate }, agora)) n++;
          }
          // Mudou os avisos do produto depois da última avaliação: a queda passa a contar de agora.
          if (s.atualizado_em > s.estado_em) precoBase = null;
          else if (s.queda_percentual !== null && oferta !== undefined && precoBase !== null
            && oferta.preco_centavos <= precoBase * (1 - s.queda_percentual / 100)) {
            const queda = arredondar4(1 - oferta.preco_centavos / precoBase);
            if (await inserirAviso(c, t.tenantId, { ...base(oferta), tipo: 'queda_percentual', queda, validaAte: oferta.valida_ate }, agora)) n++;
            precoBase = oferta.preco_centavos;
          }
        }
        const fim = acabando.get(s.product_id);
        if (s.promocao_acabando && fim !== undefined) {
          const ja = await c.query(
            `SELECT 1 FROM avisos WHERE tenant_id = $1 AND user_id = $2 AND product_id = $3 AND tipo = 'promocao_acabando' AND valida_ate = $4 LIMIT 1`,
            [t.tenantId, userId, s.product_id, fim.valida_ate],
          );
          if (ja.rowCount === 0 && (await inserirAviso(c, t.tenantId, { ...base(fim), tipo: 'promocao_acabando', queda: null, validaAte: fim.valida_ate }, agora))) n++;
        }
        if (precoBase === null && oferta !== undefined) precoBase = oferta.preco_centavos;
        await c.query(
          `UPDATE seguidos SET estado_em = $2, estoque_visto = $3, menor_180d_visto = $4, preco_base_centavos = $5 WHERE id = $1`,
          [s.id, agora, disponivel, noMenor, precoBase],
        );
      }
      return n;
    });
  }
  return { pessoas: avaliadas, avisos };
}
