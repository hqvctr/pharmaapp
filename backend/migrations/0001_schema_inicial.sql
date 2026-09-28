-- Esquema inicial. Toda tabela carrega tenant_id e toda referência entre tabelas é composta
-- (tenant_id, id), para que o banco recuse, por construção, uma linha apontando para outro tenant.

CREATE TABLE tenants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  nome       text NOT NULL,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id                          uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id                   uuid NOT NULL REFERENCES tenants(id),
  email                       text NOT NULL,
  google_sub                  text,
  -- Aceite de termos e consentimento de notificação são separados (LGPD).
  termos_versao               text,
  termos_aceitos_em           timestamptz,
  notificacoes_consentidas_em timestamptz,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, id)
);
CREATE UNIQUE INDEX users_tenant_email_uq ON users (tenant_id, lower(email));
CREATE UNIQUE INDEX users_tenant_google_uq ON users (tenant_id, google_sub) WHERE google_sub IS NOT NULL;

CREATE TABLE user_preferences (
  user_id         uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL,
  categorias      text[] NOT NULL DEFAULT '{}',
  -- Só o CEP, nunca endereço. Mais de um CEP é regra do premium, validada na aplicação; o teto físico é 3.
  ceps            char(8)[] NOT NULL DEFAULT '{}' CHECK (cardinality(ceps) <= 3),
  silencio_inicio time,
  silencio_fim    time,
  limite_diario   smallint CHECK (limite_diario IS NULL OR limite_diario > 0),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE
);

CREATE TABLE sources (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id),
  nome               text NOT NULL,
  tipo               char(1) NOT NULL CHECK (tipo IN ('A', 'B', 'C', 'D', 'E')),
  frequencia_minutos integer NOT NULL CHECK (frequencia_minutos > 0),
  regiao             text NOT NULL,
  status_confianca   text NOT NULL DEFAULT 'em_observacao'
                     CHECK (status_confianca IN ('aprovada', 'em_observacao', 'bloqueada')),
  confiabilidade     text NOT NULL CHECK (confiabilidade IN ('alta', 'media', 'baixa')),
  -- Base legal da coleta; o texto completo fica em SOURCES.md.
  base_legal         text NOT NULL,
  ativa              boolean NOT NULL DEFAULT false,
  criado_em          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, nome)
);

CREATE TABLE stores (
  id                     uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id              uuid NOT NULL REFERENCES tenants(id),
  rede                   text NOT NULL,
  nome                   text NOT NULL,
  cnpj                   char(14),
  -- online: só entrega por faixa de CEP. fisica: tem coordenada e pode ter raio de entrega.
  tipo                   text NOT NULL CHECK (tipo IN ('online', 'fisica')),
  latitude               numeric(9, 6),
  longitude              numeric(9, 6),
  raio_entrega_km        numeric(6, 2) CHECK (raio_entrega_km IS NULL OR raio_entrega_km >= 0),
  status                 text NOT NULL DEFAULT 'em_observacao'
                         CHECK (status IN ('aprovada', 'em_observacao', 'bloqueada')),
  reputacao              numeric(3, 2) NOT NULL DEFAULT 0 CHECK (reputacao BETWEEN 0 AND 1),
  autorizacao_sanitaria  text,
  criado_em              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, id),
  CHECK (tipo = 'online' OR (latitude IS NOT NULL AND longitude IS NOT NULL))
);

-- Faixas de CEP atendidas por entrega, com prazo por faixa.
CREATE TABLE store_service_areas (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  store_id    uuid NOT NULL,
  cep_inicio  char(8) NOT NULL CHECK (cep_inicio ~ '^[0-9]{8}$'),
  cep_fim     char(8) NOT NULL CHECK (cep_fim ~ '^[0-9]{8}$'),
  prazo_dias  smallint NOT NULL CHECK (prazo_dias >= 0),
  PRIMARY KEY (id),
  FOREIGN KEY (tenant_id, store_id) REFERENCES stores (tenant_id, id) ON DELETE CASCADE,
  CHECK (cep_inicio <= cep_fim)
);
CREATE INDEX store_service_areas_cep_idx ON store_service_areas (tenant_id, cep_inicio, cep_fim);

CREATE TABLE products (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id),
  gtin            text CHECK (gtin IS NULL OR gtin ~ '^[0-9]{8,14}$'),
  -- Sem GTIN: hash de marca + nome + embalagem.
  chave_hash      text NOT NULL,
  -- Mesma marca + nome, qualquer embalagem. Agrupa o histórico comparado por preço por unidade.
  familia_chave   text NOT NULL,
  marca           text NOT NULL,
  nome            text NOT NULL,
  categoria       text NOT NULL,
  quantidade      numeric(12, 4) NOT NULL CHECK (quantidade > 0),
  unidade         text NOT NULL CHECK (unidade IN ('kg', 'l', 'un')),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, chave_hash)
);
CREATE UNIQUE INDEX products_tenant_gtin_uq ON products (tenant_id, gtin) WHERE gtin IS NOT NULL;
CREATE INDEX products_familia_idx ON products (tenant_id, familia_chave);

CREATE TABLE offers (
  id                          uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id                   uuid NOT NULL,
  product_id                  uuid NOT NULL,
  store_id                    uuid NOT NULL,
  source_id                   uuid NOT NULL,
  preco_centavos              integer NOT NULL CHECK (preco_centavos > 0),
  preco_por_unidade_centavos  numeric(14, 4) NOT NULL CHECK (preco_por_unidade_centavos > 0),
  -- Condição estruturada: {"tipo": "leve_pague", "leve": 3, "pague": 2} etc. NULL = incondicional.
  condicao                    jsonb CHECK (condicao IS NULL OR condicao ? 'tipo'),
  frete_centavos              integer CHECK (frete_centavos IS NULL OR frete_centavos >= 0),
  frete_status                text NOT NULL CHECK (frete_status IN ('conhecido', 'a_confirmar', 'nao_se_aplica')),
  disponivel                  boolean NOT NULL,
  valida_de                   timestamptz,
  valida_ate                  timestamptz,
  link                        text NOT NULL,
  link_afiliado               boolean NOT NULL DEFAULT false,
  coletada_em                 timestamptz NOT NULL,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id),
  FOREIGN KEY (tenant_id, store_id) REFERENCES stores (tenant_id, id),
  FOREIGN KEY (tenant_id, source_id) REFERENCES sources (tenant_id, id),
  CHECK (frete_status <> 'conhecido' OR frete_centavos IS NOT NULL),
  CHECK (valida_de IS NULL OR valida_ate IS NULL OR valida_de <= valida_ate)
);
CREATE INDEX offers_ativas_idx ON offers (tenant_id, valida_ate, coletada_em DESC);

-- Retenção mínima de 180 dias. Nenhuma rotina apaga linhas mais novas que isso.
CREATE TABLE price_history (
  id                          bigint GENERATED ALWAYS AS IDENTITY,
  tenant_id                   uuid NOT NULL,
  product_id                  uuid NOT NULL,
  store_id                    uuid NOT NULL,
  preco_centavos              integer NOT NULL CHECK (preco_centavos > 0),
  preco_por_unidade_centavos  numeric(14, 4) NOT NULL CHECK (preco_por_unidade_centavos > 0),
  observado_em                timestamptz NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id),
  FOREIGN KEY (tenant_id, store_id) REFERENCES stores (tenant_id, id)
);
CREATE INDEX price_history_lookup_idx ON price_history (tenant_id, store_id, product_id, observado_em DESC);

CREATE TABLE alerts (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL,
  offer_id      uuid NOT NULL,
  score         smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  decisao       text NOT NULL CHECK (decisao IN ('notificar', 'aguardar_aprovacao', 'somente_feed')),
  -- Texto legível; é o que a auditoria lê.
  motivo        text NOT NULL,
  aprovado_por  text,
  aprovado_em   timestamptz,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, offer_id) REFERENCES offers (tenant_id, id)
);

CREATE TABLE deliveries (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  alert_id    uuid NOT NULL,
  user_id     uuid NOT NULL,
  canal       text NOT NULL CHECK (canal IN ('push')),
  enviado_em  timestamptz,
  aberto_em   timestamptz,
  clicado_em  timestamptz,
  PRIMARY KEY (id),
  UNIQUE (tenant_id, alert_id, user_id, canal),
  FOREIGN KEY (tenant_id, alert_id) REFERENCES alerts (tenant_id, id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX deliveries_user_dia_idx ON deliveries (tenant_id, user_id, enviado_em DESC);

CREATE TABLE subscriptions (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  user_id     uuid NOT NULL,
  plano       text NOT NULL CHECK (plano IN ('premium_mensal', 'premium_anual')),
  status      text NOT NULL CHECK (status IN ('ativa', 'cancelada', 'expirada', 'pendente')),
  origem      text NOT NULL CHECK (origem IN ('google_play')),
  iniciada_em timestamptz NOT NULL,
  expira_em   timestamptz,
  PRIMARY KEY (id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX subscriptions_user_idx ON subscriptions (tenant_id, user_id);

-- Tenant inicial para desenvolvimento.
INSERT INTO tenants (slug, nome) VALUES ('padrao', 'Tenant padrão');
