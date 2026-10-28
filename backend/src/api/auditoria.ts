// Registro de toda ação do operador que muda estado (admin.yaml, tag auditoria). Nunca recebe valor de credencial.
import type { Db } from '../pipeline/repositorio.js';

export type AcaoAuditoria =
  | 'operador_entrou' | 'alerta_revisado' | 'loja_status_definido' | 'fonte_status_definido' | 'fonte_credencial_gravada'
  | 'denuncia_resolvida' | 'triagem_revisada' | 'triagem_liberada' | 'oferta_manual_criada' | 'oferta_manual_encerrada';

export type AlvoAuditoria = 'operador' | 'alerta' | 'loja' | 'fonte' | 'caso_denuncia' | 'triagem' | 'oferta';

export async function registrarAuditoria(
  db: Db,
  r: { tenantId: string; operadorId: string; acao: AcaoAuditoria; alvoTipo: AlvoAuditoria; alvoId: string; detalhe?: Record<string, unknown>; em: Date },
): Promise<void> {
  await db.query(
    `INSERT INTO auditoria (tenant_id, operador_id, acao, alvo_tipo, alvo_id, detalhe, em) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
    [r.tenantId, r.operadorId, r.acao, r.alvoTipo, r.alvoId, JSON.stringify(r.detalhe ?? {}), r.em],
  );
}
