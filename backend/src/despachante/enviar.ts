// Envio dos avisos pendentes como push (fase 4, DECISIONS 100). Cada aviso termina com um destino em `avisos.push`; o aviso fica
// na central de qualquer jeito. Ordem das regras, por pessoa (o que vem primeiro decide):
//  1. passou de `push.validadeHoras` desde que o aviso nasceu, ou a pessoa não vê mais oferta a esse preço → expirado;
//  2. produto com advertência legal (NBCAL) → advertencia_legal (o push não cumpre a forma do texto, D31);
//  3. sem consentimento de notificação → sem_consentimento;
//  4. loja ou marca silenciadas (push ou tudo) → silenciado;
//  5. dentro do horário de silêncio da pessoa → continua pendente e sai quando o silêncio acabar (se não expirar antes);
//  6. o mesmo produto já virou push para a pessoa em `push.antiRepeticaoHoras` → repetido;
//  7. já saíram `limite_diario` pushes hoje (dia do fuso do tenant) → limite_diario;
//  8. nenhum aparelho com sessão viva → sem_aparelho;
//  9. envia a todos os aparelhos da pessoa: algum recebeu → enviado; token recusado apaga o aparelho; falha passageira deixa
//     pendente para a próxima rodada; o FCM recusou a mensagem em todos → falhou.
// Dentro da pessoa, o que vem de produto seguido sai antes, e entre eles a ordem dos tipos abaixo; depois, do mais velho ao mais novo.
import type pg from 'pg';
import { ofertasAtuais } from '../api/ofertas.js';
import { preferenciasDaPessoa } from '../api/pessoa.js';
import type { EnviadorPush } from './fcm.js';
import type { Tenant } from './gerar.js';
import { montarMensagem } from './texto.js';

const HORA = 3_600_000;

export type DestinoPush = 'enviado' | 'sem_consentimento' | 'sem_aparelho' | 'silenciado' | 'limite_diario' | 'repetido' | 'advertencia_legal' | 'expirado' | 'falhou';

export interface ResumoEnvio {
  avaliados: number;
  aguardandoSilencio: number;
  destinos: Partial<Record<DestinoPush, number>>;
  aparelhosRemovidos: number;
  /** Falha de credencial do FCM: o envio parou nesta rodada. */
  erroConfig?: string;
}

const formatadoresHora = new Map<string, Intl.DateTimeFormat>();

/** "HH:MM" do instante no fuso. */
export function horaLocal(instante: Date, fuso: string): string {
  let f = formatadoresHora.get(fuso);
  if (f === undefined) {
    f = new Intl.DateTimeFormat('en-GB', { timeZone: fuso, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    formatadoresHora.set(fuso, f);
  }
  return f.format(instante);
}

/** A janela pode cruzar a meia-noite (22:00 a 07:00). O fim não está dentro. */
export function emSilencio(hora: string, inicio: string, fim: string): boolean {
  return inicio < fim ? hora >= inicio && hora < fim : hora >= inicio || hora < fim;
}

export async function enviarPendentes(pool: pg.Pool, t: Tenant, agora: Date, enviador: EnviadorPush | null, log: (m: string) => void = () => {}): Promise<ResumoEnvio> {
  const cfg = t.config.app;
  const resumo: ResumoEnvio = { avaliados: 0, aguardandoSilencio: 0, destinos: {}, aparelhosRemovidos: 0 };
  const pendentes = (
    await pool.query(
      `SELECT av.id, av.user_id, av.tipo, av.origem, av.product_id, av.store_id, av.alert_id, av.preco_centavos, av.queda, av.valida_ate, av.criado_em,
              p.nome, p.marca_chave, p.advertencias, s.rede AS loja_nome
         FROM avisos av
         JOIN products p ON p.tenant_id = av.tenant_id AND p.id = av.product_id
         LEFT JOIN stores s ON s.tenant_id = av.tenant_id AND s.id = av.store_id
        WHERE av.tenant_id = $1 AND av.push = 'pendente'
        ORDER BY av.user_id, CASE av.origem WHEN 'seguido' THEN 0 ELSE 1 END,
                 array_position(ARRAY['promocao_excepcional', 'queda_percentual', 'menor_preco_180d', 'promocao_acabando', 'voltou_estoque'], av.tipo),
                 av.criado_em, av.id`,
      [t.tenantId],
    )
  ).rows;
  if (pendentes.length === 0) return resumo;

  const inicioDoDia = (await pool.query(`SELECT date_trunc('day', $1::timestamptz AT TIME ZONE $2) AT TIME ZONE $2 AS d`, [agora, t.config.fuso])).rows[0].d as Date;
  const hora = horaLocal(agora, t.config.fuso);
  const antiRepeticao = new Date(agora.getTime() - cfg.push.antiRepeticaoHoras * HORA);
  const validade = agora.getTime() - cfg.push.validadeHoras * HORA;

  const porPessoa = new Map<string, any[]>();
  for (const a of pendentes) {
    const lista = porPessoa.get(a.user_id) ?? [];
    lista.push(a);
    porPessoa.set(a.user_id, lista);
  }

  const marcar = async (id: string, destino: DestinoPush): Promise<void> => {
    await pool.query(`UPDATE avisos SET push = $3, push_em = $4 WHERE tenant_id = $1 AND id = $2 AND push = 'pendente'`, [t.tenantId, id, destino, agora]);
    resumo.destinos[destino] = (resumo.destinos[destino] ?? 0) + 1;
  };

  for (const [userId, avisos] of porPessoa) {
    const pessoa = (
      await pool.query(
        `SELECT u.notificacoes_consentidas_em, up.silencio_inicio::text AS silencio_inicio, up.silencio_fim::text AS silencio_fim, up.limite_diario
           FROM users u LEFT JOIN user_preferences up ON up.tenant_id = u.tenant_id AND up.user_id = u.id
          WHERE u.tenant_id = $1 AND u.id = $2`,
        [t.tenantId, userId],
      )
    ).rows[0];
    if (pessoa === undefined) continue; // conta excluída no meio da rodada (a cascata leva os avisos)
    const { ceps } = await preferenciasDaPessoa(pool, t.tenantId, userId, cfg, agora);
    const ofertas = await ofertasAtuais(pool, { tenantId: t.tenantId, userId, config: t.config, agora, ceps, produtoIds: [...new Set(avisos.map((a) => a.product_id as string))] });
    const menorAgora = new Map<string, number>();
    for (const o of ofertas) menorAgora.set(o.product_id, Math.min(menorAgora.get(o.product_id) ?? Infinity, o.preco_centavos));
    const silencios = (
      await pool.query(`SELECT tipo, loja_id, marca_chave FROM silenciamentos WHERE tenant_id = $1 AND user_id = $2`, [t.tenantId, userId])
    ).rows as Array<{ tipo: string; loja_id: string | null; marca_chave: string | null }>;
    const recentes = new Set(
      (
        await pool.query(`SELECT DISTINCT product_id FROM avisos WHERE tenant_id = $1 AND user_id = $2 AND push = 'enviado' AND push_em > $3`, [t.tenantId, userId, antiRepeticao])
      ).rows.map((r: { product_id: string }) => r.product_id),
    );
    let hoje = (
      await pool.query(`SELECT count(*)::int AS n FROM avisos WHERE tenant_id = $1 AND user_id = $2 AND push = 'enviado' AND push_em >= $3`, [t.tenantId, userId, inicioDoDia])
    ).rows[0].n as number;
    const limite = (pessoa.limite_diario as number | null) ?? cfg.limites.limiteDiarioPadrao;
    const silencioAgora = pessoa.silencio_inicio !== null && pessoa.silencio_fim !== null
      && emSilencio(hora, (pessoa.silencio_inicio as string).slice(0, 5), (pessoa.silencio_fim as string).slice(0, 5));

    for (const a of avisos) {
      resumo.avaliados++;
      const menor = menorAgora.get(a.product_id);
      if ((a.criado_em as Date).getTime() < validade || menor === undefined || (a.preco_centavos !== null && menor > a.preco_centavos)) {
        await marcar(a.id, 'expirado');
        continue;
      }
      if ((a.advertencias as string[]).length > 0 && !t.config.nbcal.notificarComAdvertencia) {
        await marcar(a.id, 'advertencia_legal');
        continue;
      }
      if (pessoa.notificacoes_consentidas_em === null) {
        await marcar(a.id, 'sem_consentimento');
        continue;
      }
      if (silencios.some((s) => (s.tipo === 'loja' && s.loja_id === a.store_id) || (s.tipo === 'marca' && a.marca_chave !== null && s.marca_chave === a.marca_chave))) {
        await marcar(a.id, 'silenciado');
        continue;
      }
      if (silencioAgora) {
        resumo.aguardandoSilencio++;
        continue;
      }
      if (recentes.has(a.product_id)) {
        await marcar(a.id, 'repetido');
        continue;
      }
      if (hoje >= limite) {
        await marcar(a.id, 'limite_diario');
        continue;
      }
      // Aparelho só de sessão viva: sair e sessão revogada já apagam o registro; a sessão vencida fica aqui de fora.
      const aparelhos = (
        await pool.query(
          `SELECT d.id, d.token FROM dispositivos d JOIN sessions s ON s.tenant_id = d.tenant_id AND s.id = d.session_id
            WHERE d.tenant_id = $1 AND d.user_id = $2 AND s.revogada_em IS NULL AND s.refresh_expira_em > $3
            ORDER BY d.registrado_em DESC, d.id`,
          [t.tenantId, userId, agora],
        )
      ).rows as Array<{ id: string; token: string }>;
      if (aparelhos.length === 0) {
        await marcar(a.id, 'sem_aparelho');
        continue;
      }
      if (enviador === null) continue; // push desligado: fica pendente até expirar
      const ttl = Math.max(60, Math.floor(((a.criado_em as Date).getTime() + cfg.push.validadeHoras * HORA - agora.getTime()) / 1000));
      const mensagem = montarMensagem({ ...a, preco_centavos: a.preco_centavos, queda: a.queda === null ? null : Number(a.queda) }, t.config.fuso, ttl);
      let recebido = false;
      let temporaria = false;
      let invalidos = 0;
      for (const ap of aparelhos) {
        const r = await enviador.enviar(ap.token, mensagem);
        if (r.tipo === 'ok') recebido = true;
        else if (r.tipo === 'token_invalido') {
          invalidos++;
          await pool.query(`DELETE FROM dispositivos WHERE tenant_id = $1 AND id = $2`, [t.tenantId, ap.id]);
          resumo.aparelhosRemovidos++;
        } else if (r.tipo === 'falha_config') {
          resumo.erroConfig = r.motivo;
          log(`Push parado nesta rodada: ${r.motivo}`);
          if (recebido) await marcar(a.id, 'enviado');
          return resumo;
        } else {
          if (r.tipo === 'falha_temporaria') temporaria = true;
          log(`Push do aviso ${a.id} não saiu para um aparelho: ${r.motivo}`);
        }
      }
      if (recebido) {
        await marcar(a.id, 'enviado');
        hoje++;
        recentes.add(a.product_id);
      } else if (invalidos === aparelhos.length) await marcar(a.id, 'sem_aparelho');
      else if (!temporaria) await marcar(a.id, 'falhou');
    }
  }
  return resumo;
}
