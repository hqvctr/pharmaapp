-- Fase 3: autenticação, sessões e leitura do feed.

-- Código de login por e-mail. Guarda só o HMAC do código; e-mail já normalizado (minúsculas).
-- id sequencial: "o código mais recente" não pode depender de empate de relógio.
CREATE TABLE auth_codigos (
  id           bigint GENERATED ALWAYS AS IDENTITY,
  tenant_id    uuid NOT NULL REFERENCES tenants(id),
  email        text NOT NULL CHECK (email = lower(email)),
  codigo_hash  bytea NOT NULL,
  criado_em    timestamptz NOT NULL,
  expira_em    timestamptz NOT NULL,
  tentativas   smallint NOT NULL DEFAULT 0,
  usado_em     timestamptz,
  PRIMARY KEY (id)
);
CREATE INDEX auth_codigos_email_idx ON auth_codigos (tenant_id, email, id DESC);
CREATE INDEX auth_codigos_expira_idx ON auth_codigos (expira_em);

-- Sessão opaca: o app guarda o token; o banco guarda só o SHA-256 dele.
CREATE TABLE sessoes (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  user_id        uuid NOT NULL,
  token_hash     bytea NOT NULL UNIQUE,
  criada_em      timestamptz NOT NULL,
  expira_em      timestamptz NOT NULL,
  ultimo_uso_em  timestamptz NOT NULL,
  revogada_em    timestamptz,
  PRIMARY KEY (id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES users (tenant_id, id) ON DELETE CASCADE
);
CREATE INDEX sessoes_user_idx ON sessoes (tenant_id, user_id);

-- Feed e detalhe buscam o alerta mais recente de cada oferta.
CREATE INDEX alerts_oferta_idx ON alerts (tenant_id, offer_id, criado_em DESC, id DESC);
