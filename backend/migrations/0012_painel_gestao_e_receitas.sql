-- Painel do operador, versão final (DECISIONS 98).
-- 1. Loja própria cadastrada e editada pela tela; 2. lançamentos de receita (painel financeiro). A auditoria ganha as ações e o alvo novos.
ALTER TABLE auditoria DROP CONSTRAINT auditoria_acao_check;
ALTER TABLE auditoria ADD CONSTRAINT auditoria_acao_check CHECK (acao IN (
  'operador_entrou', 'alerta_revisado', 'loja_status_definido', 'fonte_status_definido',
  'fonte_credencial_gravada', 'denuncia_resolvida', 'triagem_revisada', 'triagem_liberada',
  'oferta_manual_criada', 'oferta_manual_encerrada',
  'loja_criada', 'loja_editada', 'loja_areas_definidas',
  'receita_lancada', 'receita_editada', 'receitas_importadas'));
ALTER TABLE auditoria DROP CONSTRAINT auditoria_alvo_tipo_check;
ALTER TABLE auditoria ADD CONSTRAINT auditoria_alvo_tipo_check CHECK (alvo_tipo IN (
  'operador', 'alerta', 'loja', 'fonte', 'caso_denuncia', 'triagem', 'oferta', 'receita'));

-- Receita lançada pelo operador (ou importada de um relatório). O sistema não inventa receita: comissão de afiliado vem do
-- relatório da rede, assinatura das lojas de apps, anúncio da rede de anúncios. Cancelada fica para histórico e auditoria.
CREATE TABLE receitas (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id),
  fonte          text NOT NULL CHECK (fonte IN ('afiliado_lomadee', 'afiliado_outros', 'assinatura_google_play', 'assinatura_app_store', 'anuncios', 'outros')),
  -- Dia da venda ou do mês de competência; os gráficos agrupam por mês.
  competencia    date NOT NULL,
  valor_centavos bigint NOT NULL CHECK (valor_centavos > 0 AND valor_centavos <= 1000000000),
  status         text NOT NULL CHECK (status IN ('prevista', 'confirmada', 'recebida', 'cancelada')),
  descricao      text CHECK (descricao IS NULL OR length(descricao) <= 300),
  -- Identificador no relatório de origem (ex.: id da transação na rede). Reimportar o mesmo relatório não duplica.
  referencia     text CHECK (referencia IS NULL OR length(referencia) <= 120),
  criada_por     uuid NOT NULL,
  criada_em      timestamptz NOT NULL,
  atualizada_por uuid,
  atualizada_em  timestamptz,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, criada_por) REFERENCES operadores (tenant_id, id),
  FOREIGN KEY (tenant_id, atualizada_por) REFERENCES operadores (tenant_id, id)
);
CREATE UNIQUE INDEX receitas_referencia_uq ON receitas (tenant_id, fonte, referencia) WHERE referencia IS NOT NULL;
CREATE INDEX receitas_competencia_idx ON receitas (tenant_id, competencia DESC, id DESC);
-- Cliques por dia no painel financeiro.
CREATE INDEX alert_events_tipo_idx ON alert_events (tenant_id, tipo, ocorrido_em);
