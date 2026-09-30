// Despacho de push: transforma alertas "notificar" em notificações para as mães elegíveis.
// Uma execução por vez por tenant (lock no Postgres). Roda depois de cada coleta.
//   node dist/push/despachar.js --tenant economae [--agora ISO]
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import pg from 'pg';
import { buscarOferta } from '../api/repositorio.js';
import { visaoOferta } from '../api/v1/ofertas.js';
import { buscarTenant } from '../pipeline/repositorio.js';
import { carregarConfigTenant, type ConfigTenant } from '../shared/tenantConfig.js';
import { EnviadorFcm, EnviadorPushLog, type EnviadorPush } from './fcm.js';
import { emSilencio, horaLocal, limiteDoDia, montarMensagem, type OfertaParaPush } from './regras.js';
import * as repo from './repositorio.js';

const HORA_MS = 3_600_000;

export interface ResumoDespacho {
  alertas: number;
  ofertasEncerradas: number;
  enviadas: number;
  emSilencio: number;
  noLimiteDoDia: number;
  falhas: number;
  aparelhosRemovidos: number;
}

export interface ContextoDespacho {
  pool: pg.Pool;
  tenantId: string;
  config: ConfigTenant;
  enviador: EnviadorPush;
  agora: Date;
  log: (m: string) => void;
}

export async function executarDespacho(ctx: ContextoDespacho): Promise<ResumoDespacho | null> {
  const { pool, tenantId, config, agora } = ctx;
  const app = config.app;
  const resumo: ResumoDespacho = { alertas: 0, ofertasEncerradas: 0, enviadas: 0, emSilencio: 0, noLimiteDoDia: 0, falhas: 0, aparelhosRemovidos: 0 };

  const lock = await pool.connect();
  try {
    const { rows } = await lock.query('SELECT pg_try_advisory_lock(hashtextextended($1, 2)) AS ok', [`despacho|${tenantId}`]);
    if (!rows[0].ok) return null;
    try {
      const alertas = await repo.alertasParaDespachar(pool, tenantId, new Date(agora.getTime() - app.push.idadeMaximaAlertaHoras * HORA_MS));
      resumo.alertas = alertas.length;
      const hora = horaLocal(agora, config.fuso);

      for (const { alertaId, ofertaId } of alertas) {
        const oferta = await buscarOferta(pool, tenantId, agora, app.feed.idadeMaximaColetaHoras, ofertaId);
        if (oferta === null || !oferta.ativa || oferta.alerta.id !== alertaId) {
          resumo.ofertasEncerradas++;
          continue;
        }
        const visao = visaoOferta(oferta, config) as unknown as OfertaParaPush;
        const pessoas = await repo.destinatarios(pool, {
          tenantId,
          alertaId,
          lojaId: oferta.loja.id,
          categoria: oferta.produto.categoria,
          tamanhoFralda: oferta.produto.tamanhoFralda,
          termosVersao: app.documentos.termos.versao,
          maxCepsGratuito: app.planos.gratuito.maxCeps,
          maxCepsPremium: app.planos.premium.maxCeps,
          fuso: config.fuso,
          agora,
        });
        for (const p of pessoas) {
          // Em silêncio: nada é gravado; o próximo despacho tenta de novo enquanto o alerta for recente.
          if (emSilencio(hora, p.silencioInicio, p.silencioFim)) {
            resumo.emSilencio++;
            continue;
          }
          // A contagem vem do banco a cada alerta, já com o que esta execução enviou.
          if (p.enviadasHoje >= limiteDoDia(p.limiteDiario, app.push.limiteDiarioPadrao, app.limiteDiarioMaximo)) {
            resumo.noLimiteDoDia++;
            continue;
          }
          const entregaId = await repo.reservarEntrega(pool, tenantId, alertaId, p.userId, agora);
          if (entregaId === null) continue;

          const mensagem = montarMensagem(visao, entregaId, {
            condicao: oferta.condicao,
            rotuloCategoria: app.rotulosCategorias[oferta.produto.categoria] ?? oferta.produto.categoria,
            privado: app.push.categoriasPrivadas.includes(oferta.produto.categoria),
          });
          const validade = Math.max(60, Math.floor((oferta.alerta.criadoEm.getTime() + app.push.idadeMaximaAlertaHoras * HORA_MS - agora.getTime()) / 1000));
          let algumOk = false;
          const erros: string[] = [];
          for (const aparelho of await repo.aparelhosAtivos(pool, tenantId, p.userId, agora)) {
            const r = await ctx.enviador.enviar(aparelho.token, mensagem, { canal: app.push.canalAndroid, tag: ofertaId, validadeSegundos: validade });
            if (r.tipo === 'ok') algumOk = true;
            else if (r.tipo === 'token_invalido') {
              await repo.removerAparelho(pool, tenantId, aparelho.id);
              resumo.aparelhosRemovidos++;
            } else erros.push(r.detalhe);
          }
          if (algumOk) {
            await repo.concluirEntrega(pool, tenantId, entregaId, { status: 'enviada', enviadoEm: agora, erro: null });
            resumo.enviadas++;
          } else {
            const erro = erros.join('; ') || 'nenhum aparelho válido';
            await repo.concluirEntrega(pool, tenantId, entregaId, { status: 'falhou', enviadoEm: null, erro });
            ctx.log(`entrega ${entregaId} falhou: ${erro}`);
            resumo.falhas++;
          }
        }
      }
      return resumo;
    } finally {
      await lock.query('SELECT pg_advisory_unlock(hashtextextended($1, 2))', [`despacho|${tenantId}`]);
    }
  } finally {
    lock.release();
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { tenant: { type: 'string' }, agora: { type: 'string' } } });
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('Missing required environment variable: DATABASE_URL');
  if (!values.tenant) throw new Error('Uso: --tenant <slug> [--agora ISO]');
  if (values.agora && process.env.NODE_ENV === 'production') throw new Error('--agora só em desenvolvimento');
  const agora = values.agora ? new Date(values.agora) : new Date();
  if (Number.isNaN(agora.getTime())) throw new Error(`--agora inválido: ${values.agora}`);

  const modo = process.env.FCM_MODO ?? 'log';
  let enviador: EnviadorPush;
  if (modo === 'fcm') {
    const arquivo = process.env.FCM_CONTA_SERVICO;
    if (!arquivo) throw new Error('FCM_MODO=fcm exige FCM_CONTA_SERVICO (caminho do JSON da conta de serviço)');
    enviador = new EnviadorFcm(JSON.parse(await readFile(arquivo, 'utf8')));
  } else if (modo === 'log') {
    if (process.env.NODE_ENV === 'production') throw new Error('FCM_MODO=log não envia push; em produção use FCM_MODO=fcm');
    enviador = new EnviadorPushLog((l) => console.error(l));
  } else {
    throw new Error(`FCM_MODO desconhecido: ${modo} (use log ou fcm)`);
  }

  const config = await carregarConfigTenant(values.tenant);
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 3 });
  try {
    const tenantId = await buscarTenant(pool, values.tenant);
    const resumo = await executarDespacho({ pool, tenantId, config, enviador, agora, log: (m) => console.error(m) });
    console.log(JSON.stringify(resumo === null ? { agora: agora.toISOString(), ocupado: 'outro despacho em andamento' } : { agora: agora.toISOString(), ...resumo }));
    if (resumo !== null && resumo.falhas > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
