-- Fase 2: pipeline coleta → normalização → avaliação → alerta.

-- Produto vindo de fonte sem marca estruturada (ex.: Lomadee): a marca fica dentro do nome.
ALTER TABLE products ALTER COLUMN marca DROP NOT NULL;

-- Oferta passa a ser uma linha por (fonte, id externo), atualizada a cada coleta.
-- O histórico de preço fica em price_history; o alerta guarda uma cópia do preço para auditoria.
ALTER TABLE offers
  ADD COLUMN id_externo     text NOT NULL,
  ADD COLUMN ultima_decisao text CHECK (ultima_decisao IN ('notificar', 'aguardar_aprovacao', 'somente_feed', 'descartar')),
  ADD COLUMN ultimo_motivo  text,
  ADD COLUMN avaliada_em    timestamptz;
CREATE UNIQUE INDEX offers_fonte_externo_uq ON offers (tenant_id, source_id, id_externo);

-- Loja entra por lista de aprovação: só existe vínculo fonte → loja cadastrado pelo operador.
CREATE TABLE store_source_refs (
  tenant_id   uuid NOT NULL,
  source_id   uuid NOT NULL,
  id_externo  text NOT NULL,
  store_id    uuid NOT NULL,
  PRIMARY KEY (tenant_id, source_id, id_externo),
  FOREIGN KEY (tenant_id, source_id) REFERENCES sources (tenant_id, id),
  FOREIGN KEY (tenant_id, store_id) REFERENCES stores (tenant_id, id)
);

ALTER TABLE alerts
  ADD COLUMN store_id                      uuid NOT NULL,
  ADD COLUMN familia_chave                 text NOT NULL,
  ADD COLUMN preco_centavos                integer NOT NULL,
  ADD COLUMN preco_efetivo_por_unidade     numeric(14, 4) NOT NULL,
  ADD COLUMN preco_referencia_por_unidade  numeric(14, 4) NOT NULL,
  ADD COLUMN valida_ate                    timestamptz,
  ADD COLUMN rotulo_condicao               text,
  ADD COLUMN entrega_a_confirmar           boolean NOT NULL,
  ADD FOREIGN KEY (tenant_id, store_id) REFERENCES stores (tenant_id, id);
-- Chave da deduplicação (P5).
CREATE INDEX alerts_dedup_idx ON alerts (tenant_id, familia_chave, store_id, criado_em DESC);

-- Itens barrados pela triagem de medicamento, para auditoria e revisão humana.
CREATE TABLE triagem_bloqueios (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  source_id        uuid NOT NULL,
  id_externo       text NOT NULL,
  titulo           text NOT NULL,
  codigo           text NOT NULL,
  detalhe          text NOT NULL,
  revisao_humana   boolean NOT NULL,
  primeira_vez_em  timestamptz NOT NULL,
  ultima_vez_em    timestamptz NOT NULL,
  revisado_em      timestamptz,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, source_id, id_externo, codigo),
  FOREIGN KEY (tenant_id, source_id) REFERENCES sources (tenant_id, id)
);
